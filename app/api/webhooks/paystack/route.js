import { NextResponse } from 'next/server';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById } from '../../../../lib/plans';
import { sendEmail, buildOnboardingEmail } from '../../../../lib/email';

/**
 * POST /api/webhooks/paystack
 *
 * Handles Paystack webhook notifications.
 *
 * Events handled:
 *   charge.success        — First charge / monthly renewal confirmed → mark paid
 *   invoice.payment_failed — Monthly renewal failed → mark overdue
 *   subscription.disable  — Subscription cancelled → mark cancelled
 *
 * SECURITY:
 * - Verifies HMAC-SHA512 signature using Paystack secret key
 * - Idempotent — safe to receive duplicate webhooks
 * - Never trusts client-side payment confirmation
 *
 * Configure in: Paystack Dashboard → Settings → API Keys & Webhooks
 * Webhook URL: https://amscperformance.com/api/webhooks/paystack
 * Events: Collections (charge.success)
 */
export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

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

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;
    const supabase = getSupabase();

    // ── Successful charge (first payment or monthly renewal) ──────────────
    if (event === 'charge.success') {
      const reference = data.reference;
      if (!reference) {
        console.warn('Paystack webhook: No reference in charge.success payload');
        return NextResponse.json({ message: 'No reference' }, { status: 200 });
      }

      const updateFields = {
        payment_status: 'paid',
        last_paid_at: data.paid_at || new Date().toISOString(),
        notes: `Paystack charge confirmed. Amount: ${data.amount / 100} ${data.currency}. Channel: ${data.channel}. Paid at: ${data.paid_at}`,
      };

      // Store subscription code on first charge so we can cancel later
      if (data.subscription_code) {
        updateFields.paystack_subscription_code = data.subscription_code;
      }
      if (data.customer?.customer_code) {
        updateFields.paystack_customer_code = data.customer.customer_code;
      }

      // For card subscriptions, match by reference (set at checkout).
      // For M-Pesa renewals, the reference changes each month — match by reference only,
      // no status guard needed since last_paid_at reset resets the reminder clock.
      const { error } = await supabase
        .from('clients')
        .update(updateFields)
        .eq('payment_reference', reference);

      if (error) {
        console.error('Paystack webhook: DB update error (charge.success):', error);
      }

      // Send onboarding email on first payment only
      try {
        const { data: client } = await supabase
          .from('clients')
          .select('full_name, email, selected_plan, payment_provider, onboarding_email_sent_at')
          .eq('payment_reference', reference)
          .single();

        if (client && !client.onboarding_email_sent_at) {
          const plan = getPlanById(client.selected_plan);
          const ismpesa = client.payment_provider === 'paystack_mpesa';

          const result = await sendEmail({
            to: client.email,
            subject: `Welcome to AMSC — you're officially in`,
            html: buildOnboardingEmail({
              fullName: client.full_name,
              planName: plan?.name || client.selected_plan,
              planPrice: plan?.displayPrice || 'KES —',
              paymentMethod: ismpesa ? 'mpesa' : 'card',
            }),
          });

          if (result.ok) {
            await supabase
              .from('clients')
              .update({ onboarding_email_sent_at: new Date().toISOString() })
              .eq('payment_reference', reference);
            console.log(`Onboarding email sent to ${client.email}`);
          } else {
            console.error('Onboarding email failed:', result.error);
          }
        }
      } catch (emailErr) {
        // Never let email failure break webhook response
        console.error('Onboarding email error:', emailErr);
      }

      console.log(`Paystack charge confirmed: ${reference}`);

    // ── Monthly renewal failed ────────────────────────────────────────────
    } else if (event === 'invoice.payment_failed') {
      const subscriptionCode = data.subscription?.subscription_code;
      const customerEmail = data.customer?.email;

      const updateFields = {
        payment_status: 'overdue',
        notes: `Paystack renewal failed. Subscription: ${subscriptionCode || 'N/A'}. Failed at: ${new Date().toISOString()}`,
      };

      // Match by subscription code if we have it, otherwise by email
      if (subscriptionCode) {
        await supabase
          .from('clients')
          .update(updateFields)
          .eq('paystack_subscription_code', subscriptionCode);
      } else if (customerEmail) {
        await supabase
          .from('clients')
          .update(updateFields)
          .eq('email', customerEmail)
          .eq('payment_provider', 'paystack');
      }

      console.log(`Paystack renewal failed: subscription=${subscriptionCode}, email=${customerEmail}`);

    // ── Subscription cancelled / disabled ────────────────────────────────
    } else if (event === 'subscription.disable') {
      const subscriptionCode = data.subscription_code;
      const customerEmail = data.customer?.email;

      const updateFields = {
        payment_status: 'cancelled',
        notes: `Paystack subscription cancelled. Code: ${subscriptionCode || 'N/A'}. At: ${new Date().toISOString()}`,
      };

      if (subscriptionCode) {
        await supabase
          .from('clients')
          .update(updateFields)
          .eq('paystack_subscription_code', subscriptionCode);
      } else if (customerEmail) {
        await supabase
          .from('clients')
          .update(updateFields)
          .eq('email', customerEmail)
          .eq('payment_provider', 'paystack');
      }

      console.log(`Paystack subscription cancelled: ${subscriptionCode}`);

    } else {
      // All other events — log and ignore
      console.log(`Paystack webhook: Ignored event ${event}`);
    }

    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
  } catch (err) {
    console.error('Paystack webhook error:', err);
    Sentry.captureException(err, { tags: { webhook: 'paystack' } });
    // Return 200 to prevent Paystack from retrying on our bugs
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 200 });
  }
}
