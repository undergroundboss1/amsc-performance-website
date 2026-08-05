import { NextResponse } from 'next/server';
import { getCampSupabase } from '../../../../lib/supabase';

/**
 * GET /api/camp/materials-status?token=xxx
 *
 * Public endpoint — no auth required. The access_token IS the credential
 * (same magic-link model as clients.approval_token / /join/pay?token=),
 * unguessable and durable — this link keeps working after the camp ends,
 * unlike the short-lived success-page reference.
 *
 * Only 'paid' registrations get materials — they're literally part of
 * what campers pay for. Returns enough for the materials page to explain
 * itself for every other status (waitlist/pending/cancelled) rather than
 * just failing.
 *
 * athleteResultId (if the admin has attached one) is returned directly —
 * this is no more sensitive than the token itself, and the actual PDF
 * bytes are still gated by the existing /api/reports/download route the
 * same way every other combine report already is (resultId in hand is
 * sufficient — matches the existing /reports lookup-by-code precedent,
 * not a new, weaker model introduced here).
 *
 * Returns: { status, athleteFirstName, campSlug, athleteResultId }
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'token is required.' }, { status: 400 });
  }

  try {
    const campSupabase = getCampSupabase();

    const { data: registration, error } = await campSupabase
      .from('registrations')
      .select('athlete_name, status, camp_id, athlete_result_id')
      .eq('access_token', token)
      .single();

    if (error || !registration) {
      return NextResponse.json({ error: 'This link is invalid.' }, { status: 404 });
    }

    const { data: camp } = await campSupabase
      .from('camps')
      .select('slug')
      .eq('id', registration.camp_id)
      .single();

    return NextResponse.json({
      status: registration.status,
      athleteFirstName: registration.athlete_name.split(' ')[0],
      campSlug: camp?.slug || null,
      athleteResultId: registration.athlete_result_id || null,
    });
  } catch (err) {
    console.error('camp/materials-status error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
