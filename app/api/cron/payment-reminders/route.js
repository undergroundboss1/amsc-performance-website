import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { trainingPlans } from '../../../../lib/plans';
import { sendEmail, buildPaymentReminderEmail, buildAdminPaymentAlertEmail } from '../../../../lib/email';

/**
 * GET /api/cron/payment-reminders
 *
 * Called daily by Vercel Cron (08:00 UTC = 11:00 Nairobi).
 * Sends payment reminders at three stages of the billing cycle:
 *   5d  — 5 days before due
 *   1d  — 1 day before due
 *   0d  — on the due date
 *
 * Due date = last_paid_at + 30 days.
 *
 * Active clients = last_paid_at set + training_status = 'active'.
 * Applies to all members (Paystack and in-person cash clients alike).
 * Cash clients get no payment link — email tells them to pay in person.
 *
 * Idempotency: reminders_sent JSONB column tracks which stages have
 * been sent for the current billing cycle:
 *   { "5d": "2026-06-03", "1d": "2026-06-07", "0d": "2026-06-08" }
 * Cleared automatically when a new payment is recorded (see add-payment
 * and paystack webhook routes).
 *
 * Placeholder emails (@amscperformance.placeholder) are skipped.
 */

const STAGES = ['5d', '1d', '0d'];

// Days before due date each stage fires
const STAGE_DAYS = { '5d': 5, '1d': 1, '0d': 0 };

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  // Fetch all active members (have paid at least once, not paused, real email)
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, full_name, email, selected_plan, plan_price, approval_token, last_paid_at, reminders_sent, training_status')
    .eq('application_status', 'approved')
    .eq('training_status', 'active')
    .not('last_paid_at', 'is', null);

  if (error) {
    console.error('Payment reminders: DB error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ message: 'No active clients found', sent: 0 });
  }

  const results = { sent: 0, skipped: 0, failed: 0, detail: [] };

  for (const client of clients) {
    // Skip placeholder emails (historical imports without real contact)
    if (client.email?.endsWith('.placeholder')) {
      results.skipped++;
      continue;
    }

    // Calculate due date and days remaining
    const lastPaid = new Date(client.last_paid_at);
    const dueDate = new Date(lastPaid);
    dueDate.setDate(dueDate.getDate() + 30);
    dueDate.setHours(0, 0, 0, 0);

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / msPerDay);

    // Determine which stage fires today
    const stage = STAGES.find(s => STAGE_DAYS[s] === daysUntilDue);
    if (!stage) {
      // Not a reminder day for this client
      continue;
    }

    // Check if this stage was already sent for the current billing cycle
    const sent = client.reminders_sent || {};
    if (sent[stage]) {
      results.skipped++;
      results.detail.push({ name: client.full_name, stage, status: 'already_sent' });
      continue;
    }

    // Build email
    const plan = trainingPlans.find(p => p.id === client.selected_plan);
    const planName = plan?.name || client.selected_plan;
    const planPrice = `KES ${(client.plan_price || plan?.price || 0).toLocaleString()}`;

    // Only Paystack clients have an approval_token payment link
    const paymentUrl = client.approval_token
      ? `${siteUrl}/join/pay?token=${client.approval_token}`
      : null;

    const subjects = {
      '5d': `Payment due in 5 days — ${planPrice}`,
      '1d': `Payment due tomorrow — ${planPrice}`,
      '0d': `Payment due today — ${planPrice}`,
    };

    try {
      const { ok, error: emailError } = await sendEmail({
        to: client.email,
        subject: subjects[stage],
        html: buildPaymentReminderEmail({ fullName: client.full_name, planName, planPrice, paymentUrl, stage }),
      });

      if (!ok) throw new Error(emailError);

      // Mark this stage sent in reminders_sent
      await supabase
        .from('clients')
        .update({ reminders_sent: { ...sent, [stage]: todayStr } })
        .eq('id', client.id);

      results.sent++;
      results.detail.push({ name: client.full_name, stage, status: 'sent', daysUntilDue });
    } catch (err) {
      console.error(`Reminder failed for ${client.email} (${stage}):`, err.message);
      results.failed++;
      results.detail.push({ name: client.full_name, stage, status: 'failed', error: err.message });
    }
  }

  // ── Admin alert: send a digest when any clients hit 0d (due today) ──────────
  const dueToday = results.detail.filter(d => d.stage === '0d' && d.status === 'sent');
  if (dueToday.length > 0) {
    const dueClients = dueToday.map(d => {
      const client = clients.find(c => c.full_name === d.name);
      const plan = trainingPlans.find(p => p.id === client?.selected_plan);
      return {
        name: d.name,
        plan: plan?.name || client?.selected_plan || '—',
        amount: `KES ${(client?.plan_price || 0).toLocaleString()}`,
      };
    });
    const dateStr = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    await sendEmail({
      to: 'admin@amscperformance.com',
      subject: `${dueToday.length} payment${dueToday.length !== 1 ? 's' : ''} due today — ${dateStr}`,
      html: buildAdminPaymentAlertEmail({ dueClients, dateStr }),
    });
  }

  console.log(`Payment reminders: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`);
  return NextResponse.json({ ...results, detail: results.detail });
}
