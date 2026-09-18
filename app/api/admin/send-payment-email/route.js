import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById, getEffectiveMonthlyRate } from '../../../../lib/plans';
import { getPaymentTiming } from '../../../../lib/billing';
import { sendEmail, buildApprovalEmail, buildPaymentReminderEmail } from '../../../../lib/email';
import { getAdminActor } from '../../../../lib/admin-auth';
import { logAdminAction } from '../../../../lib/admin-audit';

/**
 * POST /api/admin/send-payment-email
 *
 * Manually send a client either their payment request (the approval email
 * carrying the /join/pay link) or a payment reminder — on demand, from the
 * admin portal, rather than waiting for the daily cron.
 *
 * Expects: { clientId: string, type: 'request' | 'reminder' }
 *
 * Both emails already existed; what was missing was a way to fire them by
 * hand. The payment request was only reachable as a side effect of the
 * approve route, and the reminder only from /api/cron/payment-reminders.
 *
 * DELIBERATELY DOES NOT TOUCH `reminders_sent`.
 * That column is the cron's per-cycle idempotency record. Writing to it here
 * would mean a manual nudge silently cancels that stage's scheduled reminder
 * — switching off part of the automated chase as a side effect of helping it
 * along. A manual send is an extra on top of the schedule, not a replacement
 * for it. The audit trail is where manual sends are recorded.
 */

const TYPES = ['request', 'reminder'];

export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { clientId, type } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required.' }, { status: 400 });
    }
    if (!TYPES.includes(type)) {
      return NextResponse.json(
        { error: "type must be 'request' or 'reminder'." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    // ── Contactability ────────────────────────────────────────────────
    // Historical imports carry synthetic addresses; sending to those bounces
    // and pollutes the sending domain's reputation.
    if (!client.email) {
      return NextResponse.json(
        { error: `${client.full_name} has no email address on file.` },
        { status: 400 }
      );
    }
    if (client.email.endsWith('.placeholder')) {
      return NextResponse.json(
        { error: `${client.full_name} has a placeholder email, not a real one. Add a real address first.` },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';
    const plan = getPlanById(client.selected_plan);
    const planName = plan?.name || client.selected_plan;
    const planPrice = `KES ${getEffectiveMonthlyRate(client).toLocaleString()}`;

    // ── Payment request ───────────────────────────────────────────────
    if (type === 'request') {
      // The email is worthless without a link, so mint a token if this client
      // somehow has none (imported, or approved before tokens were issued).
      // Same shape the approve route uses — 32 random bytes, hex.
      let token = client.approval_token;
      if (!token) {
        token = crypto.randomBytes(32).toString('hex');
        const { error: tokenError } = await supabase
          .from('clients')
          .update({ approval_token: token })
          .eq('id', clientId);

        if (tokenError) {
          console.error('send-payment-email: token write failed:', tokenError);
          return NextResponse.json(
            { error: 'Could not generate a payment link for this client.' },
            { status: 500 }
          );
        }
      }

      const paymentUrl = `${siteUrl}/join/pay?token=${token}`;

      const { ok, error: emailError } = await sendEmail({
        to: client.email,
        subject: 'Your AMSC payment link',
        html: buildApprovalEmail({ fullName: client.full_name, planName, planPrice, paymentUrl }),
      });

      if (!ok) {
        console.error('send-payment-email: request send failed:', emailError);
        return NextResponse.json(
          { error: 'The email failed to send. Please try again.' },
          { status: 502 }
        );
      }

      await logAdminAction({
        actor,
        action: 'client.send_payment_request',
        domain: 'client',
        resourceId: clientId,
        detail: { to: client.email, mintedToken: !client.approval_token },
      });

      return NextResponse.json({
        message: `Payment request sent to ${client.email}.`,
        sentTo: client.email,
        paymentUrl,
      });
    }

    // ── Payment reminder ──────────────────────────────────────────────
    // Stage is derived from the client's real billing position rather than
    // chosen by the sender, so the wording can never contradict the dates
    // the dashboard is showing.
    const timing = getPaymentTiming(client);

    if (!timing) {
      return NextResponse.json(
        { error: `${client.full_name} has no billing cycle yet — no payment date to remind them about.` },
        { status: 400 }
      );
    }
    if (timing.paused) {
      return NextResponse.json(
        { error: `${client.full_name} is on a training pause, so their billing is suspended.` },
        { status: 400 }
      );
    }

    let stage;
    if (timing.daysOverdue > 0) stage = 'overdue';
    else if (timing.daysUntilDue <= 0) stage = '0d';
    else if (timing.daysUntilDue === 1) stage = '1d';
    else stage = '5d';

    // Cash clients have no token and therefore no link — the email falls back
    // to "pay at the next session", which is correct for them.
    const paymentUrl = client.approval_token
      ? `${siteUrl}/join/pay?token=${client.approval_token}`
      : null;

    const subjects = {
      '5d': `Payment due in 5 days — ${planPrice}`,
      '1d': `Payment due tomorrow — ${planPrice}`,
      '0d': `Payment due today — ${planPrice}`,
      overdue: `Payment past due — ${planPrice}`,
    };

    const { ok, error: emailError } = await sendEmail({
      to: client.email,
      subject: subjects[stage],
      html: buildPaymentReminderEmail({
        fullName: client.full_name,
        planName,
        planPrice,
        paymentUrl,
        stage,
        daysOverdue: timing.daysOverdue,
      }),
    });

    if (!ok) {
      console.error('send-payment-email: reminder send failed:', emailError);
      return NextResponse.json(
        { error: 'The email failed to send. Please try again.' },
        { status: 502 }
      );
    }

    await logAdminAction({
      actor,
      action: 'client.send_payment_reminder',
      domain: 'client',
      resourceId: clientId,
      detail: {
        to: client.email,
        stage,
        daysOverdue: timing.daysOverdue,
        hadPaymentLink: Boolean(paymentUrl),
      },
    });

    const stageLabels = {
      '5d': 'due in 5 days',
      '1d': 'due tomorrow',
      '0d': 'due today',
      overdue: `${timing.daysOverdue} day${timing.daysOverdue === 1 ? '' : 's'} overdue`,
    };

    return NextResponse.json({
      message: `Reminder sent to ${client.email} (${stageLabels[stage]}).`,
      sentTo: client.email,
      stage,
      daysOverdue: timing.daysOverdue,
    });
  } catch (err) {
    console.error('admin/send-payment-email error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
