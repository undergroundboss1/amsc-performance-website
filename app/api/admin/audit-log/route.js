import { NextResponse } from 'next/server';
import { getAuditSupabase } from '../../../../lib/supabase';
import { getAdminActor } from '../../../../lib/admin-auth';

/**
 * GET /api/admin/audit-log?actor=&domain=&limit=
 *
 * Lists admin actions, newest first — backs the dedicated AuditLogView
 * (reachable from both the Camp tab and the main admin nav) and is the
 * same data source the "Last updated by…" line on individual records
 * pulls from (see /api/admin/camp/registrations). Read-only — no entry
 * for viewing the log itself.
 *
 * Query params:
 *   actor   {'arnold'|'khivali'|'jenny'}  — optional filter
 *   domain  {'camp'|'client'}             — optional filter
 *   limit   {number}                      — optional, default 100, max 500
 */
export async function GET(request) {
  if (!getAdminActor(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const actor = searchParams.get('actor');
    const domain = searchParams.get('domain');
    const limitParam = parseInt(searchParams.get('limit') || '100', 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 100 : limitParam, 1), 500);

    const auditSupabase = getAuditSupabase();
    let query = auditSupabase
      .from('admin_actions')
      .select('id, actor, action, domain, resource_id, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (actor) query = query.eq('actor', actor);
    if (domain) query = query.eq('domain', domain);

    const { data, error } = await query;

    if (error) {
      console.error('admin/audit-log: fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch audit log.' }, { status: 500 });
    }

    return NextResponse.json({ actions: data || [] });
  } catch (err) {
    console.error('admin/audit-log error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
