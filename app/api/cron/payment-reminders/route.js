import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById } from '../../../../lib/plans';

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
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'AMSC Performance <billing@amscperformance.com>',
          to: [client.email],
          subject: `Your AMSC subscription payment is due — ${planPrice}`,
          html: buildReminderEmail({ client, planName, planPrice, paymentUrl }),
        }),
      });

      if (!emailRes.ok) {
        const err = await emailRes.json();
        throw new Error(JSON.stringify(err));
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

function buildReminderEmail({ client, planName, planPrice, paymentUrl }) {
  const firstName = client.full_name.split(' ')[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AMSC Payment Reminder</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #222222;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#a60a08;padding:28px 36px;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;">
                AMSC PERFORMANCE
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <h1 style="margin:0 0 16px;color:#f5f5f8;font-size:22px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
                Monthly Payment Due
              </h1>
              <p style="margin:0 0 24px;color:#d3d3d3;font-size:15px;line-height:1.6;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 24px;color:#d3d3d3;font-size:15px;line-height:1.6;">
                Your monthly AMSC subscription payment is due. Complete your payment below to keep your training uninterrupted.
              </p>

              <!-- Plan summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #222222;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#888888;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Your Plan</p>
                    <p style="margin:0 0 16px;color:#f5f5f8;font-size:16px;font-weight:700;">${planName}</p>
                    <p style="margin:0 0 4px;color:#888888;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Amount Due</p>
                    <p style="margin:0;color:#a60a08;font-size:22px;font-weight:800;">${planPrice}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}"
                       style="display:inline-block;background:#a60a08;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:16px 36px;border-radius:8px;">
                      Pay Now via M-Pesa →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#555555;font-size:13px;line-height:1.6;">
                If you have any questions, reply to this email or reach out to us on Instagram.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #222222;">
              <p style="margin:0;color:#444444;font-size:11px;text-align:center;">
                AMSC Performance · Nairobi, Kenya · amscperformance.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
