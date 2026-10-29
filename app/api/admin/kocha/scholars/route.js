import { NextResponse } from 'next/server';
import { getKochaSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';
import { sanitize } from '../../../../../lib/validators';
import { normalizeWhatsapp } from '../../../../../lib/waitlist-phone';
import { logKochaAction } from '../../../../../lib/kocha/audit';
import { hashToken, newAccessToken } from '../../../../../lib/kocha/token';
import { KOCHA_BASE, KOCHA_COHORT_SLUG } from '../../../../../lib/kocha/constants';

/**
 * GET  /api/admin/kocha/scholars → { scholars: [...] }
 * POST /api/admin/kocha/scholars → one of:
 *   { action: 'create',  displayName, phone?, zone? } → { scholar, link }
 *   { action: 'reissue', id }                          → { link }
 *   { action: 'revoke',  id }
 *   { action: 'update',  id, displayName, phone?, zone? }
 *
 * Admin-only (lib/admin-auth.js). A personal link is returned exactly once,
 * when it is created or reissued — only its hash is stored, so it can never
 * be shown again. Reissuing replaces the hash, which signs the old link out
 * of every phone. Links and tokens are never written to logs or the audit
 * trail.
 */

const COLUMNS = 'id, display_name, phone, zone, token_issued_at, last_seen_at, revoked_at, created_at';

async function cohortId(db) {
  const { data, error } = await db.from('cohorts').select('id').eq('slug', KOCHA_COHORT_SLUG).single();
  if (error) throw error;
  return data.id;
}

function linkFor(request, token) {
  return `${new URL(request.url).origin}${KOCHA_BASE}/access?t=${token}`;
}

function parseFields(body) {
  const displayName = sanitize(body.displayName || '').slice(0, 80);
  if (!displayName) return { error: 'Enter the coach’s name.' };

  let phone = null;
  if (body.phone && String(body.phone).trim()) {
    phone = normalizeWhatsapp(String(body.phone), '254');
    if (!phone) return { error: 'Enter a valid WhatsApp number, or leave it empty.' };
  }

  let zone = null;
  if (body.zone !== undefined && body.zone !== null && body.zone !== '') {
    zone = Number(body.zone);
    if (![1, 2, 3].includes(zone)) return { error: 'Zone must be 1, 2 or 3.' };
  }
  return { fields: { display_name: displayName, phone, zone } };
}

export async function GET(request) {
  if (!getAdminActor(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getKochaSupabase();
    const { data, error } = await db
      .from('scholars')
      .select(COLUMNS)
      .eq('cohort_id', await cohortId(db))
      .order('display_name');
    if (error) throw error;
    return NextResponse.json({ scholars: data || [] });
  } catch (err) {
    console.error('admin/kocha/scholars GET error:', err);
    return NextResponse.json({ error: 'Failed to load coaches.' }, { status: 500 });
  }
}

export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const db = getKochaSupabase();

    if (body.action === 'create') {
      const { fields, error: invalid } = parseFields(body);
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      const token = newAccessToken();
      const { data, error } = await db
        .from('scholars')
        .insert({
          ...fields,
          cohort_id: await cohortId(db),
          token_hash: hashToken(token),
          token_issued_at: new Date().toISOString(),
        })
        .select(COLUMNS)
        .single();
      if (error) throw error;
      await logKochaAction({ actor, action: 'kocha.scholar_create', resourceId: data.id, detail: { zone: data.zone } });
      return NextResponse.json({ scholar: data, link: linkFor(request, token) });
    }

    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Missing coach id.' }, { status: 400 });
    }

    if (body.action === 'reissue') {
      const token = newAccessToken();
      const { error } = await db
        .from('scholars')
        .update({ token_hash: hashToken(token), token_issued_at: new Date().toISOString(), revoked_at: null })
        .eq('id', body.id);
      if (error) throw error;
      await logKochaAction({ actor, action: 'kocha.scholar_reissue_link', resourceId: body.id });
      return NextResponse.json({ link: linkFor(request, token) });
    }

    if (body.action === 'revoke') {
      const { error } = await db.from('scholars').update({ revoked_at: new Date().toISOString() }).eq('id', body.id);
      if (error) throw error;
      await logKochaAction({ actor, action: 'kocha.scholar_revoke_link', resourceId: body.id });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'update') {
      const { fields, error: invalid } = parseFields(body);
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      const { error } = await db.from('scholars').update(fields).eq('id', body.id);
      if (error) throw error;
      await logKochaAction({ actor, action: 'kocha.scholar_update', resourceId: body.id, detail: { zone: fields.zone } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    console.error('admin/kocha/scholars POST error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
