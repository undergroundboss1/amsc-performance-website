import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { getPlanById } from '../../../lib/plans';

/**
 * GET /api/billing-info?reference=xxx
 *
 * Public endpoint — no auth required (reference is unguessable).
 * Looks up a client by their Paystack payment reference and returns
 * their billing cycle details: anchor date, next due date, plan.
 *
 * Used by the payment success page to show the client their billing schedule.
 *
 * Returns:
 *   { clientName, planName, billingAnchor, nextDueDate, cycleDay,
 *     isAutoRenew, currency, displayPrice }
 *
 * cycleDay: day-of-month the client is billed (e.g. 1 if anchor is May 1)
 * nextDueDate: ISO string of the next billing date (30 days from anchor)
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
      .select('id, full_name, selected_plan, plan_price, training_start_date, last_paid_at, payment_provider, custom_monthly_rate, discount_percent')
      .eq('payment_reference', reference)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    // Billing anchor: training_start_date if set, else last_paid_at
    const anchor = client.training_start_date || client.last_paid_at;
    if (!anchor) {
      return NextResponse.json({ error: 'No billing anchor available yet.' }, { status: 404 });
    }

    const anchorDate = new Date(anchor);

    // Compute next billing date: advance in 30-day cycles from anchor until future
    const now = new Date();
    const MS_PER_CYCLE = 30 * 24 * 60 * 60 * 1000;
    const msElapsed = now - anchorDate;
    const cyclesCompleted = Math.max(0, Math.floor(msElapsed / MS_PER_CYCLE));
    const nextDue = new Date(anchorDate.getTime() + (cyclesCompleted + 1) * MS_PER_CYCLE);

    // Effective price
    let displayPrice = client.plan_price;
    if (client.custom_monthly_rate) displayPrice = client.custom_monthly_rate;
    else if (Number(client.discount_percent) > 0)
      displayPrice = Math.round(client.plan_price * (1 - Number(client.discount_percent) / 100));

    const plan = getPlanById(client.selected_plan);
    const isAutoRenew = client.payment_provider === 'paystack';

    return NextResponse.json({
      clientName: client.full_name,
      planName: plan?.name || client.selected_plan,
      billingAnchor: anchorDate.toISOString(),
      nextDueDate: nextDue.toISOString(),
      isAutoRenew,
      currency: 'KES',
      displayPrice: Number(displayPrice),
    });
  } catch (err) {
    console.error('billing-info error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
