import { NextResponse } from 'next/server';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { getSupabase } from '../../../../lib/supabase';

/**
 * POST /api/webhooks/paystack
 *
 * Handles Paystack webhook notifications for payment confirmation.
 *
 * SECURITY:
 * - Verifies HMAC-SHA512 signature using Paystack secret key
 * - Only processes 'charge.success' events
 * - Idempotent — safe to receive duplicate webhooks
 * - Never trusts client-side payment confirmation
 *
 * Paystack sends webhooks to this URL after a payment completes.
 * Configure this URL in: Paystack Dashboard → Settings → API Keys & Webhooks
 * Webhook URL: https://your-domain.com/api/webhooks/paystack
 */
export async function POST(request) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // Verify webhook signature
    if (!signature || !process.env.PAYSTACK_SECRET_KEY) {
      console.warn('Paystack webhook: Missing signature or secret key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('Paystack webhook: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the verified payload
    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    // Only handle successful charges
    if (event !== 'charge.success') {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    const reference = data.reference;
    if (!reference) {
      console.warn('Paystack webhook: No reference in payload');
      return NextResponse.json({ message: 'No reference' }, { status: 200 });
    }

    // Update client payment status
    const supabase = getSupabase();
    const { error } = await supabase
      .from('clients')
      .update({
        payment_status: 'paid',
        notes: `Paystack charge confirmed. Amount: ${data.amount / 100} ${data.currency}. Channel: ${data.channel}. Paid at: ${data.paid_at}`,
      })
      .eq('payment_reference', reference)
      .eq('payment_status', 'pending'); // Idempotent — only update if still pending

    if (error) {
      console.error('Paystack webhook: DB update error:', error);
      // Still return 200 so Paystack doesn't retry endlessly
    }

    console.log(`Paystack payment confirmed: ${reference}`);
    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
  } catch (err) {
    console.error('Paystack webhook error:', err);
    Sentry.captureException(err, { tags: { webhook: 'paystack' } });
    // Return 200 to prevent Paystack from retrying on our bugs
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 200 });
  }
}
