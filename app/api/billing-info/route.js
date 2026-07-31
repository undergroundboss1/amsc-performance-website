import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { getPlanById, getEffectiveMonthlyRate } from '../../../lib/plans';
import { getPaymentTiming } from '../../../lib/billing';

/**
 * GET /api/billing-info?reference=xxx
 *
 * Public endpoint — no auth required (reference is unguessable).
 * Looks up a client by their Paystack payment reference and returns
 * their billing cycle details: anchor date, next due date, plan.
 *
 * Used by the payment success page to show the client their billing schedule.
 *
 * The due date comes from getPaymentTiming() in lib/billing.js — the same
 * function the admin dashboard, the reminder cron and the pay-link gate use —
 * so the date shown here is always the date the rest of the system will act on.
 *
 * Returns:
 *   { clientName, planName, billingAnchor, nextDueDate,
 *     isAutoRenew, currency, displayPrice }
 *
 * nextDueDate is null for clients on a training pause (their billing clock is
 * suppressed); the success page hides the schedule card in that case.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'reference is required.' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const { data: client, error } = await supabase
      .from('clients')
      .select('id, full_name, selected_plan, plan_price, training_start_date, last_paid_at, payment_provider, custom_monthly_rate, discount_percent, training_status, pause_credit_days')
      .eq('payment_reference', reference)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    const timing = getPaymentTiming(client);

    // Nothing to bill yet — no payment on record and no training start date.
    if (!timing) {
      return NextResponse.json({ error: 'No billing anchor available yet.' }, { status: 404 });
    }

    const plan = getPlanById(client.selected_plan);

    return NextResponse.json({
      clientName: client.full_name,
      planName: plan?.name || client.selected_plan,
      billingAnchor: timing.paused ? null : timing.cycleAnchor.toISOString(),
      nextDueDate: timing.paused ? null : timing.nextDue.toISOString(),
      isAutoRenew: client.payment_provider === 'paystack',
      currency: 'KES',
      displayPrice: getEffectiveMonthlyRate(client),
    });
  } catch (err) {
    console.error('billing-info error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
