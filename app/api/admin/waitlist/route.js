import { NextResponse } from 'next/server';
import { getWaitlistSupabase } from '../../../../lib/supabase';
import { getAdminActor } from '../../../../lib/admin-auth';
import { getWaitlistProgram, listWaitlistPrograms } from '../../../../lib/waitlists';
import { SOURCE_LABELS } from '../../../../lib/waitlist-source';

/**
 * GET /api/admin/waitlist?program=off-pitch            → JSON: summary + signups
 * GET /api/admin/waitlist?program=off-pitch&format=csv → CSV export (all rows)
 *
 * Admin-only (any of the three admin keys — lib/admin-auth.js). Read-only,
 * so nothing is written to the audit log, matching the camp registrations
 * route.
 */

const COLUMNS = [
  'id', 'created_at', 'first_name', 'email', 'instagram_handle',
  'position', 'level', 'age_band', 'early_access_opt_in', 'guardian_consent',
  'marketing_consent', 'other_marketing_opt_in', 'consent_text_version', 'consented_at',
  'unsubscribed_at', 'confirmation_sent_at', 'source', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_content', 'referrer_host', 'in_app_browser', 'country',
];

const PAGE = 1000; // PostgREST's default row cap — page past it for true totals

async function fetchAll(programSlug) {
  const db = getWaitlistSupabase();
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('signups')
      .select(COLUMNS.join(','))
      .eq('program_slug', programSlug)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}

function countBy(rows, key, options) {
  const counts = {};
  for (const r of rows) {
    const k = r[key] ?? 'unknown';
    counts[k] = (counts[k] || 0) + 1;
  }
  // Keep the program's own option order (e.g. GK → FWD), then anything else.
  const ordered = (options || []).map((o) => ({ key: o.value, label: o.label, count: counts[o.value] || 0 }));
  const known = new Set(ordered.map((o) => o.key));
  const rest = Object.entries(counts)
    .filter(([k]) => !known.has(k))
    .map(([k, count]) => ({ key: k, label: k, count }))
    .sort((a, b) => b.count - a.count);
  return [...ordered, ...rest];
}

// Nairobi calendar days — "today" should mean Arnold's today, not UTC's.
function dayKey(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
}

function summarize(rows, program) {
  const now = Date.now();
  const since = (ms) => rows.filter((r) => now - new Date(r.created_at).getTime() < ms).length;

  const sourceCounts = countBy(rows, 'source').map((s) => ({ ...s, label: SOURCE_LABELS[s.key] || s.key }));
  const instagram = sourceCounts.find((s) => s.key === 'instagram')?.count || 0;

  const perDay = {};
  for (const r of rows) perDay[dayKey(r.created_at)] = (perDay[dayKey(r.created_at)] || 0) + 1;
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(new Date(now - i * 86_400_000).toISOString());
    days.push({ day: key, count: perDay[key] || 0 });
  }

  const active = rows.filter((r) => r.marketing_consent && !r.unsubscribed_at);

  return {
    total: rows.length,
    // Who can be emailed today: ticked the consent box and hasn't unsubscribed.
    active: active.length,
    unsubscribed: rows.filter((r) => r.unsubscribed_at).length,
    otherMarketing: active.filter((r) => r.other_marketing_opt_in).length,
    emailsSent: rows.filter((r) => r.confirmation_sent_at).length,
    last24h: since(86_400_000),
    last7d: since(7 * 86_400_000),
    instagram,
    earlyAccess: rows.filter((r) => r.early_access_opt_in).length,
    bySource: sourceCounts,
    byPosition: countBy(rows, 'position', program.form.positions),
    byLevel: countBy(rows, 'level', program.form.levels),
    byAge: countBy(rows, 'age_band', program.form.ageBands),
    byCampaign: countBy(rows.filter((r) => r.utm_campaign), 'utm_campaign'),
    days,
  };
}

// Prefix cells that a spreadsheet would run as a formula (CSV injection).
function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request) {
  if (!getAdminActor(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('program') || 'off-pitch';
    const program = getWaitlistProgram(slug);
    if (!program) {
      return NextResponse.json({ error: 'Unknown program.' }, { status: 404 });
    }

    const rows = await fetchAll(slug);

    if (searchParams.get('format') === 'csv') {
      const csv = [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(','))].join('\r\n');
      const date = new Date().toISOString().slice(0, 10);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="amsc-waitlist-${slug}-${date}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({
      programs: listWaitlistPrograms(),
      program: { slug: program.slug, name: program.name, path: program.path, open: program.open },
      summary: summarize(rows, program),
      signups: rows,
    });
  } catch (err) {
    console.error('admin/waitlist error:', err);
    return NextResponse.json({ error: 'Failed to load the waitlist.' }, { status: 500 });
  }
}
