import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById, getEffectiveMonthlyRate } from '../../../../lib/plans';
import { isDueNow } from '../../../../lib/billing';

/**
 * POST /api/payments/paystack
 *
 * Initializes a Paystack subscription transaction for card payments.
 * Passing the `plan` code causes Paystack to auto-enroll the customer
 * in a recurring subscription after the first charge.
 *
 * Expects: { clientId: string }
 *
 * SECURITY:
 * - Fetches client data from DB (never trusts client-sent amounts)
 * - Uses server-side secret key (never exposed to browser)
 * - Amount sent to Paystack in kobo (smallest unit) to prevent rounding issues
 */
export async function POST(request) {
  try {
    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required.' }, { status: 400 });
    }

    // Fetch client from database
    const supabase = getSupabase();
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    // Must be approved before paying
    if (client.application_status !== 'approved') {
      return NextResponse.json({ error: 'Application not yet approved.' }, { status: 403 });
    }

    // Don't allow double-payment within a cycle the client has already covered.
    // Once their cycle elapses (isDueNow), renewal through this link is allowed.
    if (client.payment_status === 'cancelled') {
      return NextResponse.json({ error: 'This subscription has been cancelled.' }, { status: 400 });
    }
    if (!isDueNow(client)) {
      return NextResponse.json({ error: 'You\'re already paid up for this cycle.' }, { status: 400 });
    }

    const plan = getPlanById(client.selected_plan);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    }

    // Generate unique reference
    const reference = `AMSC-${Date.now()}-${clientId.slice(0, 8)}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';

    // Charge the client's effective rate (honours custom_monthly_rate / discount).
    const amountInKobo = getEffectiveMonthlyRate(client) * 100;

    // Paystack subscription plans bill a fixed amount (the standard plan price),
    // so we can only attach the plan code — which enables auto-renew — for clients
    // on the standard rate. Custom/discounted clients are charged the correct
    // amount as a one-time card payment; their renewal is handled by the monthly
    // reminder system (same as M-Pesa clients).
    const isStandardRate = !client.custom_monthly_rate && !(Number(client.discount_percent) > 0);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify({
        email: client.email,
        amount: amountInKobo,
        currency: 'KES',
        reference,
        ...(isStandardRate ? { plan: plan.paystackPlanCode } : {}),
        channels: ['card', 'mobile_money'],
        callback_url: `${siteUrl}/join/success?reference=${reference}`,
        metadata: {
          client_id: clientId,
          plan_id: plan.id,
          plan_name: plan.name,
          custom_fields: [
            { display_name: 'Client Name', variable_name: 'client_name', value: client.full_name },
            { display_name: 'Plan', variable_name: 'plan', value: plan.name },
          ],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status || !data.data?.authorization_url) {
      console.error('Paystack init error:', data);
      return NextResponse.json(
        { error: 'Failed to initialize payment. Please try again.' },
        { status: 502 }
      );
    }

    // Save payment reference to client record
    await supabase
      .from('clients')
      .update({
        payment_provider: 'paystack',
        payment_reference: reference,
      })
      .eq('id', clientId);

    return NextResponse.json({ checkoutUrl: data.data.authorization_url });
  } catch (err) {
    console.error('Paystack payment error:', err);
    return NextResponse.json(
      { error: 'Payment initialization failed. Please try again.' },
      { status: 500 }
    );
  }
}
