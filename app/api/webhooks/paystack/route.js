import { NextResponse } from 'next/server';
import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById } from '../../../../lib/plans';
import { sendEmail, buildOnboardingEmail, buildReceiptEmail, buildRenewalFailedEmail } from '../../../../lib/email';
import { getEffectiveMonthlyRate } from '../../../../lib/plans';

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

      const paidAt = data.paid_at || new Date().toISOString();
      const amountKes = data.amount / 100;

      const updateFields = {
        payment_status: 'paid',
        last_paid_at: paidAt,
        reminders_sent: {}, // reset so next billing cycle gets fresh reminders
        overdue_ack_note: null, // clear any "continue while overdue" note
        overdue_ack_at: null,
        notes: `Paystack charge confirmed. Amount: ${amountKes} ${data.currency}. Channel: ${data.channel}. Paid at: ${paidAt}`,
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

      // ── Insert payment record into payments table ─────────────────────
      try {
        // Fetch client to get their ID and plan info
        const { data: clientForPayment } = await supabase
          .from('clients')
          .select('id, full_name, email, selected_plan, plan_price, training_start_date')
          .eq('payment_reference', reference)
          .single();

        if (clientForPayment) {
          // Determine payment method from Paystack channel
          const paymentMethod =
            data.channel === 'mobile_money' ? 'paystack_mpesa' : 'paystack_card';

          // Auto-anchor billing cycle on first payment if training_start_date not set.
          // Admin can override later via update-client if the actual training start differs.
          if (!clientForPayment.training_start_date) {
            await supabase
              .from('clients')
              .update({ training_start_date: paidAt })
              .eq('id', clientForPayment.id);
            console.log(`Billing anchor set to first payment date for client ${clientForPayment.id}`);
          }

          const { data: insertedPayment, error: paymentInsertError } = await supabase
            .from('payments')
            .insert({
              client_id: clientForPayment.id,
              amount: amountKes,
              currency: data.currency || 'KES',
              payment_date: paidAt,
              payment_method: paymentMethod,
              payment_reference: reference,
              plan_id: clientForPayment.selected_plan || null,
              plan_price: clientForPayment.plan_price || null,
              months_covered: 1,
              notes: `Paystack ${data.channel} — ref: ${reference}`,
              source: 'webhook',
            })
            .select('id')
            .single();

          if (paymentInsertError) {
            // Non-fatal — log but don't break the webhook response
            console.error('Paystack webhook: payments insert error:', paymentInsertError);
          } else {
            console.log(`Payment record inserted: ${amountKes} KES for client ${clientForPayment.id}`);

            // ── Send receipt for this charge (first payment AND renewals) ──
            if (clientForPayment.email && !clientForPayment.email.endsWith('.placeholder')) {
              try {
                const rplan = getPlanById(clientForPayment.selected_plan);
                const rplanName = rplan?.name || clientForPayment.selected_plan || 'Training';
                const { ok: receiptOk } = await sendEmail({
                  to: clientForPayment.email,
                  subject: `AMSC Performance | Payment Confirmed - ${rplanName}`,
                  html: buildReceiptEmail({
                    fullName: clientForPayment.full_name,
                    planName: rplanName,
                    amount: `KES ${Number(amountKes).toLocaleString()}`,
                    dateStr: new Date(paidAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
                    methodLabel: paymentMethod === 'paystack_mpesa' ? 'M-Pesa' : 'Card',
                    reference,
                  }),
                });
                if (receiptOk && insertedPayment?.id) {
                  await supabase.from('payments').update({ receipt_sent: true }).eq('id', insertedPayment.id);
                }
              } catch (receiptErr) {
                console.error('Paystack webhook: receipt email error (non-fatal):', receiptErr);
              }
            }
          }
        }
      } catch (paymentErr) {
        console.error('Paystack webhook: payments insert error (non-fatal):', paymentErr);
      }

      // Send onboarding email on first payment only
      try {
        const { data: client } = await supabase
          .from('clients')
          .select('full_name, email, selected_plan, plan_price, custom_monthly_rate, discount_percent, payment_provider, onboarding_email_sent_at')
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
              planPrice: `KES ${getEffectiveMonthlyRate(client).toLocaleString()}`,
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
      let failedClient = null;
      if (subscriptionCode) {
        const { data } = await supabase
          .from('clients')
          .update(updateFields)
          .eq('paystack_subscription_code', subscriptionCode)
          .select('id, full_name, email, selected_plan, plan_price, custom_monthly_rate, discount_percent, approval_token')
          .maybeSingle();
        failedClient = data;
      } else if (customerEmail) {
        const { data } = await supabase
          .from('clients')
          .update(updateFields)
          .eq('email', customerEmail)
          .eq('payment_provider', 'paystack')
          .select('id, full_name, email, selected_plan, plan_price, custom_monthly_rate, discount_percent, approval_token')
          .maybeSingle();
        failedClient = data;
      }

      // Notify the client (with a retry link) and alert admin — non-fatal.
      if (failedClient && failedClient.email && !failedClient.email.endsWith('.placeholder')) {
        try {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';
          const fplan = getPlanById(failedClient.selected_plan);
          const fplanName = fplan?.name || failedClient.selected_plan || 'Training';
          const fplanPrice = `KES ${getEffectiveMonthlyRate(failedClient).toLocaleString()}`;
          const fpayUrl = failedClient.approval_token
            ? `${siteUrl}/join/pay?token=${failedClient.approval_token}`
            : null;

          await sendEmail({
            to: failedClient.email,
            subject: `AMSC Performance | Payment didn't go through — ${fplanName}`,
            html: buildRenewalFailedEmail({ fullName: failedClient.full_name, planName: fplanName, planPrice: fplanPrice, paymentUrl: fpayUrl }),
          });

          await sendEmail({
            to: 'admin@amscperformance.com',
            subject: `Renewal failed — ${failedClient.full_name} (${fplanPrice})`,
            html: `<p style="font-family:sans-serif;font-size:14px;color:#111;">A card renewal failed and the client has been notified.</p>
                   <ul style="font-family:sans-serif;font-size:14px;color:#111;">
                     <li><strong>Client:</strong> ${failedClient.full_name}</li>
                     <li><strong>Plan:</strong> ${fplanName} — ${fplanPrice}</li>
                     <li><strong>Email:</strong> ${failedClient.email}</li>
                     <li><strong>Status:</strong> marked overdue</li>
                   </ul>
                   <p style="font-family:sans-serif;font-size:14px;color:#111;">They have a retry link. Follow up if it stays unpaid.</p>`,
          });
        } catch (failEmailErr) {
          console.error('Paystack webhook: renewal-failed email error (non-fatal):', failEmailErr);
        }
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
