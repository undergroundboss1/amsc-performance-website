import { NextResponse } from 'next/server';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { getSupabase } from '../../../../lib/supabase';

/**
 * POST /api/webhooks/intasend
 *
 * Handles IntaSend webhook notifications for M-Pesa payment confirmation.
 *
 * SECURITY:
 * - Verifies HMAC-SHA256 signature using IntaSend webhook secret
 * - Only processes 'COMPLETE' status
 * - Idempotent — safe to receive duplicate webhooks
 * - Never trusts client-side payment confirmation
 *
 * Configure this URL in: IntaSend Dashboard → Settings → Webhooks
 * Webhook URL: https://your-domain.com/api/webhooks/intasend
 */
export async function POST(request) {
  try {
    // Verify webhook secret is configured — fail hard if missing
    const webhookSecret = process.env.INTASEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('IntaSend webhook: INTASEND_WEBHOOK_SECRET is not configured — rejecting all webhook requests');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 401 });
    }

    // Verify signature header is present
    const signature = request.headers.get('x-intasend-signature');
    if (!signature) {
      console.warn('IntaSend webhook: Missing x-intasend-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const rawBody = await request.text();

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('IntaSend webhook: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the verified payload
    const payload = JSON.parse(rawBody);

    // IntaSend sends different event structures — handle the checkout completion
    const invoiceId = payload.invoice_id || payload.api_ref;
    const state = (payload.state || payload.status || '').toUpperCase();

    if (!invoiceId) {
      console.warn('IntaSend webhook: No reference in payload');
      return NextResponse.json({ message: 'No reference' }, { status: 200 });
    }

    const supabase = getSupabase();

    if (state === 'COMPLETE' || state === 'PROCESSING') {
      // For COMPLETE status, mark as paid
      if (state === 'COMPLETE') {
        const { error } = await supabase
          .from('clients')
          .update({
            payment_status: 'paid',
            notes: `IntaSend payment confirmed. Invoice: ${payload.invoice_id || 'N/A'}. Method: ${payload.channel || 'M-Pesa'}. Completed at: ${new Date().toISOString()}`,
          })
          .eq('payment_reference', invoiceId)
          .eq('payment_status', 'pending');

        if (error) {
          console.error('IntaSend webhook: DB update error:', error);
        }

        console.log(`IntaSend payment confirmed: ${invoiceId}`);
      }

      // Also try matching by api_ref (IntaSend uses this field)
      if (payload.api_ref && payload.api_ref !== invoiceId) {
        await supabase
          .from('clients')
          .update({
            payment_status: state === 'COMPLETE' ? 'paid' : 'pending',
            notes: `IntaSend payment ${state.toLowerCase()}. Ref: ${payload.api_ref}`,
          })
          .eq('payment_reference', payload.api_ref)
          .eq('payment_status', 'pending');
      }
    } else if (state === 'FAILED') {
      await supabase
        .from('clients')
        .update({ payment_status: 'failed' })
        .eq('payment_reference', invoiceId)
        .eq('payment_status', 'pending');

      console.log(`IntaSend payment failed: ${invoiceId}`);
    }

    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
  } catch (err) {
    console.error('IntaSend webhook error:', err);
    Sentry.captureException(err, { tags: { webhook: 'intasend' } });
    // Return 200 to prevent IntaSend from retrying on our bugs
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 200 });
  }
}
