import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById } from '../../../../lib/plans';

/**
 * POST /api/admin/change-plan
 *
 * Changes a client's training plan. Behaviour varies by payment provider:
 *
 *   pending / no provider  → Update selected_plan + plan_price only. No Paystack action.
 *   paystack_mpesa         → Update selected_plan + plan_price only.
 *                            New amount takes effect on their next manual payment cycle.
 *   paystack (card)        → Disable existing Paystack subscription, update DB,
 *                            generate a new payment link for the new plan, return paymentUrl.
 *                            Admin must send the new link to the client.
 *
 * SECURITY:
 * - Protected by ADMIN_SECRET_KEY (same pattern as all admin routes)
 * - Plan price always fetched server-side from plans.js — never trusted from client
 */
export async function POST(request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, newPlanId } = body;

    if (!clientId || !newPlanId) {
      return NextResponse.json(
        { error: 'clientId and newPlanId are required.' },
        { status: 400 }
      );
    }

    // ── Validate new plan ──────────────────────────────────────────────────
    const newPlan = getPlanById(newPlanId);
    if (!newPlan) {
      return NextResponse.json({ error: 'Invalid plan ID.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // ── Fetch client ───────────────────────────────────────────────────────
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    if (client.selected_plan === newPlanId) {
      return NextResponse.json(
        { error: 'Client is already on this plan.' },
        { status: 400 }
      );
    }

    // ── Branch by payment provider ─────────────────────────────────────────

    // Case A: Pending / no provider yet — just update the plan
    if (!client.payment_provider || client.payment_status === 'pending') {
      const { error: updateError } = await supabase
        .from('clients')
        .update({ selected_plan: newPlan.id, plan_price: newPlan.price })
        .eq('id', clientId);

      if (updateError) throw updateError;

      return NextResponse.json({
        message: 'Plan updated.',
        newPlan: { id: newPlan.id, name: newPlan.name, displayPrice: newPlan.displayPrice },
      });
    }

    // Case B: M-Pesa — update plan in DB, new amount takes effect next cycle
    if (client.payment_provider === 'paystack_mpesa') {
      const { error: updateError } = await supabase
        .from('clients')
        .update({ selected_plan: newPlan.id, plan_price: newPlan.price })
        .eq('id', clientId);

      if (updateError) throw updateError;

      return NextResponse.json({
        message: 'Plan updated. New amount takes effect on their next M-Pesa payment.',
        newPlan: { id: newPlan.id, name: newPlan.name, displayPrice: newPlan.displayPrice },
      });
    }

    // Case C: Card (Paystack subscription) — disable old sub, generate new payment link
    if (client.payment_provider === 'paystack') {
      if (!process.env.PAYSTACK_SECRET_KEY) {
        return NextResponse.json({ error: 'Paystack not configured.' }, { status: 500 });
      }

      // Disable existing Paystack subscription if one exists.
      // Paystack requires the subscription's email_token to disable it,
      // so we fetch the subscription first to get that token.
      let subscriptionCancelled = false;
      if (client.paystack_subscription_code) {
        try {
          // Step 1: Fetch subscription to get email_token
          const getSubRes = await fetch(
            `https://api.paystack.co/subscription/${client.paystack_subscription_code}`,
            { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
          );
          const subData = await getSubRes.json();
          const emailToken = subData.data?.email_token;

          // Step 2: Disable using code + email_token
          const disableRes = await fetch('https://api.paystack.co/subscription/disable', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: client.paystack_subscription_code,
              token: emailToken,
            }),
          });

          if (disableRes.ok) {
            subscriptionCancelled = true;
            console.log(`Paystack subscription ${client.paystack_subscription_code} disabled`);
          } else {
            const err = await disableRes.json();
            console.error('Paystack subscription disable failed (non-fatal):', err);
          }
        } catch (psErr) {
          console.error('Paystack disable error (non-fatal):', psErr);
        }
      }

      // Generate new Paystack transaction with the new plan code
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';
      const reference = `AMSC-PLANCHANGE-${Date.now()}-${clientId.slice(0, 8)}`;

      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
        body: JSON.stringify({
          email: client.email,
          amount: newPlan.price * 100, // kobo
          currency: 'KES',
          reference,
          plan: newPlan.paystackPlanCode,
          channels: ['card'],
          callback_url: `${siteUrl}/join/success?reference=${reference}`,
          metadata: {
            client_id: clientId,
            plan_id: newPlan.id,
            plan_name: newPlan.name,
            plan_change: true,
            custom_fields: [
              { display_name: 'Client Name', variable_name: 'client_name', value: client.full_name },
              { display_name: 'Plan', variable_name: 'plan', value: newPlan.name },
              { display_name: 'Type', variable_name: 'type', value: 'Plan Change' },
            ],
          },
        }),
      });

      const paystackData = await paystackRes.json();

      if (!paystackRes.ok || !paystackData.data?.authorization_url) {
        console.error('Paystack transaction init failed:', paystackData);
        // Still update the plan in DB even if new payment link fails
        await supabase
          .from('clients')
          .update({
            selected_plan: newPlan.id,
            plan_price: newPlan.price,
            payment_status: 'pending',
            paystack_subscription_code: null,
          })
          .eq('id', clientId);

        return NextResponse.json({
          message: 'Plan updated, but failed to generate payment link. Generate manually.',
          newPlan: { id: newPlan.id, name: newPlan.name, displayPrice: newPlan.displayPrice },
          paymentUrl: null,
        });
      }

      // Update DB: new plan, reset payment status, clear old subscription code
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          selected_plan: newPlan.id,
          plan_price: newPlan.price,
          payment_status: 'pending',
          payment_reference: reference,
          paystack_subscription_code: null,
          paystack_customer_code: client.paystack_customer_code, // keep customer code
        })
        .eq('id', clientId);

      if (updateError) throw updateError;

      return NextResponse.json({
        message: 'Plan updated. Send the new payment link to the client.',
        newPlan: { id: newPlan.id, name: newPlan.name, displayPrice: newPlan.displayPrice },
        paymentUrl: paystackData.data.authorization_url,
        subscriptionCancelled,
      });
    }

    // Fallback — unknown provider
    return NextResponse.json({ error: 'Unknown payment provider.' }, { status: 400 });

  } catch (err) {
    console.error('Change plan error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
