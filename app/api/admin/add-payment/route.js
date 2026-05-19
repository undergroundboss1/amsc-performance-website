import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';

/**
 * POST /api/admin/add-payment
 *
 * Manually records a payment (cash, bank transfer, etc.) against a client.
 * Webhook-originated payments are inserted automatically by the Paystack webhook.
 *
 * Body:
 *   clientId        {string}  — required
 *   amount          {number}  — required, KES amount (e.g. 15000)
 *   paymentDate     {string}  — required, ISO date string
 *   paymentMethod   {string}  — 'manual_cash' | 'manual_bank_transfer' | 'other'
 *   monthsCovered   {number}  — optional, default 1
 *   notes           {string}  — optional
 *
 * Returns:
 *   { message, payment }
 */
export async function POST(request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, amount, paymentDate, paymentMethod, monthsCovered, notes } = body;

    // ── Validate required fields ────────────────────────────────────────────
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required.' }, { status: 400 });
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
    }
    if (!paymentDate) {
      return NextResponse.json({ error: 'paymentDate is required.' }, { status: 400 });
    }
    const parsedDate = new Date(paymentDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid paymentDate. Expected ISO date string.' },
        { status: 400 }
      );
    }

    const validMethods = ['manual_cash', 'manual_bank_transfer', 'other'];
    const method = paymentMethod || 'manual_cash';
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: `paymentMethod must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      );
    }

    const covered = monthsCovered ? parseInt(monthsCovered, 10) : 1;
    if (isNaN(covered) || covered < 1) {
      return NextResponse.json(
        { error: 'monthsCovered must be a positive integer.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // ── Fetch client for plan info ──────────────────────────────────────────
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, full_name, selected_plan, plan_price, payment_status, last_paid_at')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    // ── Insert payment record ───────────────────────────────────────────────
    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert({
        client_id: clientId,
        amount: Number(amount),
        currency: 'KES',
        payment_date: parsedDate.toISOString(),
        payment_method: method,
        payment_reference: null,
        plan_id: client.selected_plan || null,
        plan_price: client.plan_price || null,
        months_covered: covered,
        notes: notes || null,
        source: 'manual',
      })
      .select()
      .single();

    if (insertError) {
      console.error('add-payment insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record payment.' }, { status: 500 });
    }

    // ── Update client.last_paid_at if this payment is more recent ──────────
    const shouldUpdateLastPaid =
      !client.last_paid_at || parsedDate > new Date(client.last_paid_at);

    if (shouldUpdateLastPaid) {
      const clientUpdate = {
        last_paid_at: parsedDate.toISOString(),
        payment_status: 'paid',
      };
      await supabase.from('clients').update(clientUpdate).eq('id', clientId);
    }

    console.log(
      `Manual payment recorded: ${client.full_name} — KES ${amount} on ${paymentDate}`
    );

    return NextResponse.json({
      message: 'Payment recorded successfully.',
      payment,
    });
  } catch (err) {
    console.error('add-payment error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
