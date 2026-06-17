import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { resyncLastPaidAt } from '../../../../lib/payments-server';

/**
 * POST /api/admin/update-payment
 *
 * Edits an existing payment record. Only the fields provided in the body are
 * changed (partial update). After updating, the client's last_paid_at is
 * re-synced to the most recent remaining payment.
 *
 * Body:
 *   paymentId      {string}  — required
 *   amount         {number}  — optional, positive KES amount
 *   paymentDate    {string}  — optional, ISO date string
 *   paymentMethod  {string}  — optional, 'manual_cash' | 'manual_bank_transfer' | 'other'
 *   monthsCovered  {number}  — optional, positive integer
 *   notes          {string}  — optional (null/'' clears)
 *
 * Returns: { message, payment, lastPaidAt }
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { paymentId, amount, paymentDate, paymentMethod, monthsCovered, notes } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required.' }, { status: 400 });
    }

    const updates = {};

    if ('amount' in body) {
      if (isNaN(Number(amount)) || Number(amount) <= 0) {
        return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
      }
      updates.amount = Number(amount);
    }

    if ('paymentDate' in body) {
      const parsed = new Date(paymentDate);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid paymentDate. Expected ISO date string.' }, { status: 400 });
      }
      updates.payment_date = parsed.toISOString();
    }

    if ('paymentMethod' in body) {
      const validMethods = ['manual_cash', 'manual_bank_transfer', 'other'];
      if (!validMethods.includes(paymentMethod)) {
        return NextResponse.json(
          { error: `paymentMethod must be one of: ${validMethods.join(', ')}` },
          { status: 400 }
        );
      }
      updates.payment_method = paymentMethod;
    }

    if ('monthsCovered' in body) {
      const covered = parseInt(monthsCovered, 10);
      if (isNaN(covered) || covered < 1) {
        return NextResponse.json({ error: 'monthsCovered must be a positive integer.' }, { status: 400 });
      }
      updates.months_covered = covered;
    }

    if ('notes' in body) {
      updates.notes = notes ? String(notes).trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: payment, error: updateError } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError || !payment) {
      console.error('update-payment error:', updateError);
      return NextResponse.json({ error: 'Failed to update payment.' }, { status: 500 });
    }

    const { lastPaidAt } = await resyncLastPaidAt(supabase, payment.client_id);

    return NextResponse.json({ message: 'Payment updated.', payment, lastPaidAt });
  } catch (err) {
    console.error('update-payment error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
