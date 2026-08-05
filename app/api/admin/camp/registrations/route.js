import { NextResponse } from 'next/server';
import { getCampSupabase, getAuditSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';

/**
 * GET /api/admin/camp/registrations?campId=xxx
 *
 * Full registrant list for one camp — every field, including medical
 * notes (all three admins now have full, identical privileges — see
 * lib/admin-auth.js — so there's no restricted view to build here).
 *
 * Each registration is annotated with `lastAudit: { actor, action,
 * createdAt } | null`, sourced from audit.admin_actions, so the admin UI
 * can show "Last updated by <actor> · <time>" directly on the card without
 * a second screen. Read-only overall — no audit log entry for viewing.
 */
export async function GET(request) {
  if (!getAdminActor(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const campId = searchParams.get('campId');

    if (!campId) {
      return NextResponse.json({ error: 'campId is required.' }, { status: 400 });
    }

    const campSupabase = getCampSupabase();

    const { data: registrations, error } = await campSupabase
      .from('registrations')
      .select('*')
      .eq('camp_id', campId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('admin/camp/registrations: fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch registrations.' }, { status: 500 });
    }

    const rows = registrations || [];
    const ids = rows.map((r) => r.id);

    // Merge in "last updated by" — newest-first, keep only the first
    // (= most recent) row per resource_id.
    let lastAuditByRegistration = {};
    if (ids.length > 0) {
      const auditSupabase = getAuditSupabase();
      const { data: auditRows, error: auditError } = await auditSupabase
        .from('admin_actions')
        .select('resource_id, actor, action, created_at')
        .eq('domain', 'camp')
        .in('resource_id', ids)
        .order('created_at', { ascending: false });

      if (auditError) {
        // Non-fatal — the registrant list is still useful without the
        // "last updated by" annotation.
        console.error('admin/camp/registrations: audit fetch error (non-fatal):', auditError);
      } else {
        for (const row of auditRows || []) {
          if (!lastAuditByRegistration[row.resource_id]) {
            lastAuditByRegistration[row.resource_id] = {
              actor: row.actor,
              action: row.action,
              createdAt: row.created_at,
            };
          }
        }
      }
    }

    const annotated = rows.map((r) => ({
      ...r,
      lastAudit: lastAuditByRegistration[r.id] || null,
    }));

    return NextResponse.json({ registrations: annotated });
  } catch (err) {
    console.error('admin/camp/registrations error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
