import { NextResponse } from 'next/server';
import { getCampSupabase } from '../../../../lib/supabase';

/**
 * POST /api/camp/pay
 *
 * Initializes a one-time Paystack transaction (card + M-Pesa in a single
 * checkout, unlike the client flow's split routes) for a pending camp
 * registration. Camps are a flat one-time fee, not a subscription, so no
 * Paystack plan code is ever attached here.
 *
 * Expects: { registrationId: string }
 * Returns: { checkoutUrl: string }
 *
 * SECURITY:
 * - Amount is read server-side from camp.camps.price_kes — never trusted
 *   from the request body
 * - registration_id and camp_id are embedded in Paystack metadata so the
 *   webhook can call camp.confirm_registration() without a lookup
 */
export async function POST(request) {
  try {
    const { registrationId } = await request.json();

    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required.' }, { status: 400 });
    }

    const campSupabase = getCampSupabase();

    const { data: registration, error: fetchError } = await campSupabase
      .from('registrations')
      .select('id, camp_id, athlete_name, guardian_email, status')
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    if (registration.status !== 'pending') {
      return NextResponse.json(
        { error: 'This registration has already been processed.' },
        { status: 400 }
      );
    }

    const { data: camp, error: campError } = await campSupabase
      .from('camps')
      .select('id, slug, name, price_kes, capacity, registration_open')
      .eq('id', registration.camp_id)
      .single();

    if (campError || !camp) {
      return NextResponse.json({ error: 'Camp not found.' }, { status: 404 });
    }

    if (!camp.registration_open) {
      return NextResponse.json({ error: 'Registration is closed for this camp.' }, { status: 400 });
    }

    // Soft re-check — the camp may have filled between form submission and
    // checkout (a slow parent, a paused browser tab). Friendlier than
    // silently letting them pay into a near-certain waitlist. The true
    // race-safe check still happens in confirm_registration() at webhook time.
    const { count: paidCount } = await campSupabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('camp_id', camp.id)
      .eq('status', 'paid');

    if ((paidCount || 0) >= camp.capacity) {
      return NextResponse.json(
        { error: 'This camp has filled up since you started registering. Contact us to be added to a waitlist.' },
        { status: 400 }
      );
    }

    const reference = `CAMP-${camp.slug}-${Date.now()}-${registrationId.slice(0, 8)}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';
    const amountInKobo = camp.price_kes * 100;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify({
        email: registration.guardian_email,
        amount: amountInKobo,
        currency: 'KES',
        reference,
        // No plan code — camps are a one-time flat fee, never a subscription.
        channels: ['card', 'mobile_money'],
        callback_url: `${siteUrl}/camps/${camp.slug}/success?reference=${reference}`,
        metadata: {
          type: 'camp_registration',
          registration_id: registrationId,
          camp_id: camp.id,
          camp_slug: camp.slug,
          custom_fields: [
            { display_name: 'Athlete', variable_name: 'athlete_name', value: registration.athlete_name },
            { display_name: 'Camp', variable_name: 'camp', value: camp.name },
          ],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status || !data.data?.authorization_url) {
      console.error('camp/pay: Paystack init error:', data);
      return NextResponse.json(
        { error: 'Failed to initialize payment. Please try again.' },
        { status: 502 }
      );
    }

    await campSupabase
      .from('registrations')
      .update({ payment_reference: reference })
      .eq('id', registrationId);

    return NextResponse.json({ checkoutUrl: data.data.authorization_url });
  } catch (err) {
    console.error('camp/pay error:', err);
    return NextResponse.json(
      { error: 'Payment initialization failed. Please try again.' },
      { status: 500 }
    );
  }
}
