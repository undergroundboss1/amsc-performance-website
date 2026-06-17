import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { resyncLastPaidAt } from '../../../../lib/payments-server';

/**
 * POST /api/admin/delete-payment
 *
 * Deletes a payment record. After deletion, the client's last_paid_at is
 * re-synced to the most recent remaining payment (or null if none remain).
 *
 * Body:
 *   paymentId  {string}  — required
 *
 * Returns: { message, lastPaidAt }
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch the payment first so we know which client to re-sync.
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, client_id')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      console.error('delete-payment error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete payment.' }, { status: 500 });
    }

    const { lastPaidAt } = await resyncLastPaidAt(supabase, payment.client_id);

    return NextResponse.json({ message: 'Payment deleted.', lastPaidAt });
  } catch (err) {
    console.error('delete-payment error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
