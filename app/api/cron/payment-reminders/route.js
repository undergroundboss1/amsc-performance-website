import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById } from '../../../../lib/plans';
import { sendEmail, buildPaymentReminderEmail } from '../../../../lib/email';

/**
 * GET /api/cron/payment-reminders
 *
 * Called daily by Vercel Cron. Finds M-Pesa clients whose payment is
 * due again (30+ days since last_paid_at) and sends them a renewal reminder.
 *
 * A reminder is only sent once per billing cycle — it won't re-fire until
 * the client pays and resets last_paid_at.
 *
 * Required env vars:
 *   CRON_SECRET       — shared secret Vercel sends in Authorization header
 *   RESEND_API_KEY    — Resend API key for sending emails
 *   NEXT_PUBLIC_SITE_URL — used to build the payment link
 */
export async function GET(request) {
  // Verify this is a legitimate Vercel Cron call
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Find M-Pesa clients who are paid but 30+ days have elapsed since last payment
  // and haven't been reminded yet this cycle
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, full_name, email, phone, selected_plan, approval_token, last_paid_at, payment_reminder_sent_at')
    .eq('payment_provider', 'paystack_mpesa')
    .eq('payment_status', 'paid')
    .lt('last_paid_at', thirtyDaysAgo)
    .or(`payment_reminder_sent_at.is.null,payment_reminder_sent_at.lt.last_paid_at`);

  if (error) {
    console.error('Payment reminders: DB query error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ message: 'No reminders due', sent: 0 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';
  const results = { sent: 0, failed: 0, clients: [] };

  for (const client of clients) {
    const plan = getPlanById(client.selected_plan);
    const paymentUrl = `${siteUrl}/join/pay?token=${client.approval_token}`;
    const planName = plan?.name || client.selected_plan;
    const planPrice = plan?.displayPrice || 'KES —';

    try {
      const result = await sendEmail({
        to: client.email,
        subject: `Your AMSC subscription payment is due — ${planPrice}`,
        html: buildPaymentReminderEmail({
          fullName: client.full_name,
          planName,
          planPrice,
          paymentUrl,
        }),
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      // Mark reminder sent
      await supabase
        .from('clients')
        .update({ payment_reminder_sent_at: new Date().toISOString() })
        .eq('id', client.id);

      results.sent++;
      results.clients.push({ name: client.full_name, email: client.email, status: 'sent' });
    } catch (err) {
      console.error(`Payment reminder failed for ${client.email}:`, err);
      results.failed++;
      results.clients.push({ name: client.full_name, email: client.email, status: 'failed', error: err.message });
    }
  }

  console.log(`Payment reminders: ${results.sent} sent, ${results.failed} failed`);
  return NextResponse.json(results);
}
