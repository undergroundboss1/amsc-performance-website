import { NextResponse } from 'next/server';
import { getCampSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';

/**
 * GET /api/admin/camp/camps
 *
 * Lists all camps with live paid-count/spots-remaining, for the camp
 * selector at the top of the admin Camp tab. Read-only — no audit log
 * entry, matching the other read-only admin routes.
 */
export async function GET(request) {
  if (!getAdminActor(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const campSupabase = getCampSupabase();

    const { data: camps, error } = await campSupabase
      .from('camps')
      .select('id, slug, name, co_host_name, capacity, registration_open, starts_on, ends_on, price_kes')
      .order('starts_on', { ascending: false });

    if (error) {
      console.error('admin/camp/camps: fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch camps.' }, { status: 500 });
    }

    // Paid count per camp — one query, grouped client-side (small dataset,
    // at most a handful of camps).
    const { data: paidRows, error: countError } = await campSupabase
      .from('registrations')
      .select('camp_id')
      .eq('status', 'paid');

    if (countError) {
      console.error('admin/camp/camps: paid count error:', countError);
      return NextResponse.json({ error: 'Failed to fetch registration counts.' }, { status: 500 });
    }

    const paidCounts = {};
    for (const row of paidRows || []) {
      paidCounts[row.camp_id] = (paidCounts[row.camp_id] || 0) + 1;
    }

    const result = (camps || []).map((c) => ({
      ...c,
      paidCount: paidCounts[c.id] || 0,
      spotsRemaining: Math.max(0, c.capacity - (paidCounts[c.id] || 0)),
    }));

    return NextResponse.json({ camps: result });
  } catch (err) {
    console.error('admin/camp/camps error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
