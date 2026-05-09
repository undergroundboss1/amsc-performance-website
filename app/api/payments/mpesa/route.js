import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById } from '../../../../lib/plans';

/**
 * POST /api/payments/mpesa
 *
 * Initializes a one-time Paystack transaction restricted to M-Pesa (mobile_money).
 * Does NOT pass a plan code — M-Pesa doesn't support Paystack recurring subscriptions.
 * Recurring billing for M-Pesa clients is handled manually (monthly reminder sent to client).
 *
 * Expects: { clientId: string }
 * Returns: { checkoutUrl: string }
 */
export async function POST(request) {
  try {
    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    if (client.application_status !== 'approved') {
      return NextResponse.json({ error: 'Application not yet approved.' }, { status: 403 });
    }

    if (client.payment_status === 'paid') {
      return NextResponse.json({ error: 'This subscription is already paid.' }, { status: 400 });
    }

    const plan = getPlanById(client.selected_plan);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    }

    const reference = `AMSC-MPESA-${Date.now()}-${clientId.slice(0, 8)}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';
    const amountInKobo = plan.price * 100;

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
        // No plan code — M-Pesa does not support Paystack subscriptions
        channels: ['mobile_money'],
        callback_url: `${siteUrl}/join/success?reference=${reference}`,
        metadata: {
          client_id: clientId,
          plan_id: plan.id,
          plan_name: plan.name,
          payment_method: 'mpesa',
          custom_fields: [
            { display_name: 'Client Name', variable_name: 'client_name', value: client.full_name },
            { display_name: 'Plan', variable_name: 'plan', value: plan.name },
            { display_name: 'Payment Method', variable_name: 'payment_method', value: 'M-Pesa' },
          ],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status || !data.data?.authorization_url) {
      console.error('Paystack M-Pesa init error:', data);
      return NextResponse.json(
        { error: 'Failed to initialize M-Pesa payment. Please try again.' },
        { status: 502 }
      );
    }

    await supabase
      .from('clients')
      .update({
        payment_provider: 'paystack_mpesa',
        payment_reference: reference,
      })
      .eq('id', clientId);

    return NextResponse.json({ checkoutUrl: data.data.authorization_url });
  } catch (err) {
    console.error('M-Pesa payment error:', err);
    return NextResponse.json(
      { error: 'Payment initialization failed. Please try again.' },
      { status: 500 }
    );
  }
}
