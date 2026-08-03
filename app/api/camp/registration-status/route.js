import { NextResponse } from 'next/server';
import { getCampSupabase } from '../../../../lib/supabase';

/**
 * GET /api/camp/registration-status?reference=xxx
 *
 * Public endpoint — no auth required (reference is unguessable, same trust
 * model as /api/billing-info). Used by the post-payment success page to show
 * whether the athlete got a confirmed slot or landed on the waitlist —
 * these need materially different messaging, since a waitlisted guardian's
 * card WAS charged and that has to be crystal clear, not implied.
 *
 * Deliberately does NOT return access_token. Unlike a billing-schedule
 * lookup, the materials-page token is a durable, reusable credential — it
 * stays valid long after the camp ends. Handing it out over a GET keyed
 * only on the payment reference would mean anyone who ever sees that
 * reference (browser history, a forwarded link, a shared screenshot) gets
 * standing access to the materials page. The confirmation/waitlist emails
 * already deliver the real materials link straight to the guardian's inbox —
 * this endpoint only needs to answer "did it work", not hand out the key.
 *
 * Returns: { status: 'pending'|'paid'|'waitlist', athleteFirstName, campName, campSlug }
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'reference is required.' }, { status: 400 });
  }

  try {
    const campSupabase = getCampSupabase();

    const { data: registration, error } = await campSupabase
      .from('registrations')
      .select('athlete_name, status, camp_id')
      .eq('payment_reference', reference)
      .single();

    if (error || !registration) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    const { data: camp } = await campSupabase
      .from('camps')
      .select('name, slug')
      .eq('id', registration.camp_id)
      .single();

    return NextResponse.json({
      status: registration.status, // 'pending' | 'paid' | 'waitlist'
      athleteFirstName: registration.athlete_name.split(' ')[0],
      campName: camp?.name || null,
      campSlug: camp?.slug || null,
    });
  } catch (err) {
    console.error('camp/registration-status error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
