/**
 * AMSC Email Utility
 *
 * Central module for all transactional emails sent via Resend.
 * Import sendEmail() and the template builders you need.
 *
 * Required env var: RESEND_API_KEY
 */

const FROM_ADDRESS = 'AMSC Performance <billing@amscperformance.com>';
const RESEND_API = 'https://api.resend.com/emails';

/**
 * Send an email via Resend.
 * @param {{ to: string, subject: string, html: string }} opts
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendEmail({ to, subject, html }) {
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: JSON.stringify(err) };
  }

  return { ok: true };
}

// ── Shared layout wrapper ─────────────────────────────────────────────────────

function layout(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #222222;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header bar -->
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
              ${bodyContent}
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

// ── Templates ─────────────────────────────────────────────────────────────────

/**
 * Onboarding email — sent once when first payment is confirmed.
 */
export function buildOnboardingEmail({ fullName, planName, planPrice, paymentMethod }) {
  const firstName = fullName.split(' ')[0];
  const methodNote = paymentMethod === 'mpesa'
    ? 'Your monthly M-Pesa payment has been confirmed.'
    : 'Your card has been charged and your subscription is active.';

  return layout(`
    <h1 style="margin:0 0 8px;color:#f5f5f8;font-size:24px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
      Welcome to AMSC.
    </h1>
    <p style="margin:0 0 28px;color:#a60a08;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
      You&rsquo;re officially in.
    </p>

    <p style="margin:0 0 20px;color:#d3d3d3;font-size:15px;line-height:1.7;">
      Hi ${firstName},
    </p>
    <p style="margin:0 0 28px;color:#d3d3d3;font-size:15px;line-height:1.7;">
      ${methodNote} Your <strong style="color:#f5f5f8;">${planName}</strong> membership is now active.
    </p>

    <!-- Plan card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #222222;border-radius:8px;margin-bottom:32px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;color:#555555;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Active Plan</p>
          <p style="margin:0 0 16px;color:#f5f5f8;font-size:17px;font-weight:700;">${planName}</p>
          <p style="margin:0 0 4px;color:#555555;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Monthly Investment</p>
          <p style="margin:0;color:#a60a08;font-size:20px;font-weight:800;">${planPrice} <span style="color:#555555;font-size:13px;font-weight:400;">/ month</span></p>
        </td>
      </tr>
    </table>

    <!-- What happens next -->
    <p style="margin:0 0 16px;color:#888888;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">
      What Happens Next
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="padding:0 0 14px 0;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:28px;vertical-align:top;padding-top:1px;">
                <span style="display:inline-block;width:20px;height:20px;background:#a60a08;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#ffffff;">1</span>
              </td>
              <td style="padding-left:12px;">
                <p style="margin:0;color:#d3d3d3;font-size:14px;line-height:1.6;">
                  <strong style="color:#f5f5f8;">Trainerize invitation</strong> — you&rsquo;ll receive an invitation to the AMSC training app within 24 hours. Accept it to access your program.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 14px 0;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:28px;vertical-align:top;padding-top:1px;">
                <span style="display:inline-block;width:20px;height:20px;background:#a60a08;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#ffffff;">2</span>
              </td>
              <td style="padding-left:12px;">
                <p style="margin:0;color:#d3d3d3;font-size:14px;line-height:1.6;">
                  <strong style="color:#f5f5f8;">First session</strong> — your coach will be in touch to schedule your onboarding session and movement screen.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:28px;vertical-align:top;padding-top:1px;">
                <span style="display:inline-block;width:20px;height:20px;background:#a60a08;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#ffffff;">3</span>
              </td>
              <td style="padding-left:12px;">
                <p style="margin:0;color:#d3d3d3;font-size:14px;line-height:1.6;">
                  <strong style="color:#f5f5f8;">Questions?</strong> — reach us on Instagram
                  <a href="https://instagram.com/amscperformance" style="color:#a60a08;text-decoration:none;">@amscperformance</a>
                  or reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#555555;font-size:13px;line-height:1.6;">
      Train hard. Stay consistent. We&rsquo;ll handle the rest.
    </p>
    <p style="margin:12px 0 0;color:#d3d3d3;font-size:14px;font-weight:600;">
      — The AMSC Team
    </p>
  `);
}

/**
 * Approval email — sent automatically when admin approves an application.
 * Contains the unique payment link to complete onboarding.
 */
export function buildApprovalEmail({ fullName, planName, planPrice, paymentUrl }) {
  const firstName = fullName.split(' ')[0];

  return layout(`
    <h1 style="margin:0 0 8px;color:#f5f5f8;font-size:24px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
      You&rsquo;re approved.
    </h1>
    <p style="margin:0 0 28px;color:#a60a08;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
      Complete your payment to start training.
    </p>

    <p style="margin:0 0 20px;color:#d3d3d3;font-size:15px;line-height:1.7;">
      Hi ${firstName},
    </p>
    <p style="margin:0 0 28px;color:#d3d3d3;font-size:15px;line-height:1.7;">
      Your application has been reviewed and approved. One step left — complete your first payment to activate your membership and lock in your spot.
    </p>

    <!-- Plan card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #222222;border-radius:8px;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;color:#555555;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Your Plan</p>
          <p style="margin:0 0 16px;color:#f5f5f8;font-size:17px;font-weight:700;">${planName}</p>
          <p style="margin:0 0 4px;color:#555555;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Monthly Investment</p>
          <p style="margin:0;color:#a60a08;font-size:20px;font-weight:800;">${planPrice} <span style="color:#555555;font-size:13px;font-weight:400;">/ month</span></p>
        </td>
      </tr>
    </table>

    <!-- Billing note -->
    <p style="margin:0 0 24px;color:#555555;font-size:12px;text-align:center;letter-spacing:0.05em;">
      Monthly billing &middot; 30-day cycle from your first training session &middot; Cancel anytime
    </p>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
      <tr>
        <td align="center">
          <a href="${paymentUrl}"
             style="display:inline-block;background:#a60a08;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:18px 40px;border-radius:8px;">
            Complete Payment &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 12px;color:#555555;font-size:13px;line-height:1.6;">
      This link is unique to you — do not share it. It will remain active until your first payment is processed.
    </p>
    <p style="margin:0;color:#555555;font-size:13px;line-height:1.6;">
      Questions? Reply to this email or find us on Instagram
      <a href="https://instagram.com/amscperformance" style="color:#a60a08;text-decoration:none;">@amscperformance</a>.
    </p>
  `);
}

/**
 * Payment transition email — sent to existing members when AMSC moves them from
 * cash/in-person payments onto the online payment system.
 *
 * Reassures them that their training and price are unchanged — only the payment
 * METHOD is changing — and gives them their secure link to set up card (auto-renew)
 * or M-Pesa for future payments.
 *
 * @param {object} opts
 * @param {string} opts.fullName
 * @param {string} opts.planName
 * @param {string} opts.planPrice   — e.g. "KES 15,000"
 * @param {string} opts.paymentUrl
 */
export function buildPaymentTransitionEmail({ fullName, planName, planPrice, paymentUrl }) {
  const firstName = fullName.split(' ')[0];

  return layout(`
    <h1 style="margin:0 0 8px;color:#f5f5f8;font-size:24px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
      A simpler way to pay.
    </h1>
    <p style="margin:0 0 28px;color:#a60a08;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
      Same training. Same price. New payment method.
    </p>

    <p style="margin:0 0 20px;color:#d3d3d3;font-size:15px;line-height:1.7;">
      Hi ${firstName},
    </p>
    <p style="margin:0 0 20px;color:#d3d3d3;font-size:15px;line-height:1.7;">
      We&rsquo;re moving AMSC payments online to make things easier for you — no more remembering cash for sessions. From now on you can pay securely by card or M-Pesa, and card payments renew automatically each month.
    </p>
    <p style="margin:0 0 28px;color:#d3d3d3;font-size:15px;line-height:1.7;">
      <strong style="color:#f5f5f8;">Nothing about your training or pricing changes.</strong> Your <strong style="color:#f5f5f8;">${planName}</strong> membership stays exactly as it is — the only difference is how you pay.
    </p>

    <!-- Plan card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #222222;border-radius:8px;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;color:#555555;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Your Plan</p>
          <p style="margin:0 0 16px;color:#f5f5f8;font-size:17px;font-weight:700;">${planName}</p>
          <p style="margin:0 0 4px;color:#555555;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Monthly Investment</p>
          <p style="margin:0;color:#a60a08;font-size:20px;font-weight:800;">${planPrice} <span style="color:#555555;font-size:13px;font-weight:400;">/ month — unchanged</span></p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
      <tr>
        <td align="center">
          <a href="${paymentUrl}"
             style="display:inline-block;background:#a60a08;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:18px 40px;border-radius:8px;">
            Set Up Online Payment &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 12px;color:#555555;font-size:13px;line-height:1.6;">
      This link is unique to you — please don&rsquo;t share it. You can set up your payment whenever your next month is due.
    </p>
    <p style="margin:0;color:#555555;font-size:13px;line-height:1.6;">
      Questions? Reply to this email or find us on Instagram
      <a href="https://instagram.com/amscperformance" style="color:#a60a08;text-decoration:none;">@amscperformance</a>.
    </p>
  `);
}

/**
 * Payment receipt email — sent automatically the moment a payment is confirmed
 * (Paystack webhook charge.success, or admin add-payment). Brief, warm, branded.
 *
 * @param {object} opts
 * @param {string} opts.fullName
 * @param {string} opts.planName
 * @param {string} opts.amount        — formatted, e.g. "KES 15,000"
 * @param {string} opts.dateStr       — formatted, e.g. "17 Jun 2026"
 * @param {string} opts.methodLabel   — e.g. "M-Pesa", "Card", "Cash"
 * @param {string} [opts.reference]   — payment reference, if any
 */
export function buildReceiptEmail({ fullName, planName, amount, dateStr, methodLabel, reference }) {
  const firstName = fullName.split(' ')[0];

  return layout(`
    <h1 style="margin:0 0 8px;color:#f5f5f8;font-size:24px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
      Payment received.
    </h1>
    <p style="margin:0 0 28px;color:#a60a08;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
      Thank you, ${firstName}.
    </p>

    <p style="margin:0 0 28px;color:#d3d3d3;font-size:15px;line-height:1.7;">
      This confirms we&rsquo;ve received your payment for <strong style="color:#f5f5f8;">${planName}</strong>. Keep this email as your receipt.
    </p>

    <!-- Receipt card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #222222;border-radius:8px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;color:#555555;font-size:12px;">Plan</td>
            <td style="padding:6px 0;color:#f5f5f8;font-size:13px;font-weight:600;text-align:right;">${planName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555555;font-size:12px;">Amount</td>
            <td style="padding:6px 0;color:#a60a08;font-size:15px;font-weight:800;text-align:right;">${amount}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555555;font-size:12px;">Date</td>
            <td style="padding:6px 0;color:#f5f5f8;font-size:13px;text-align:right;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555555;font-size:12px;">Method</td>
            <td style="padding:6px 0;color:#f5f5f8;font-size:13px;text-align:right;">${methodLabel}</td>
          </tr>
          ${reference ? `<tr>
            <td style="padding:6px 0;color:#555555;font-size:12px;">Reference</td>
            <td style="padding:6px 0;color:#d3d3d3;font-size:12px;text-align:right;">${reference}</td>
          </tr>` : ''}
        </table>
      </td></tr>
    </table>

    <p style="margin:0;color:#555555;font-size:13px;line-height:1.6;">
      Questions about your payment? Reply to this email or find us on Instagram
      <a href="https://instagram.com/amscperformance" style="color:#a60a08;text-decoration:none;">@amscperformance</a>.
    </p>
  `);
}

/**
 * Payment reminder email — sent monthly to M-Pesa clients.
 */
/**
 * Payment reminder email — sent at 3 stages of the billing cycle.
 *
 * @param {object} opts
 * @param {string} opts.fullName
 * @param {string} opts.planName
 * @param {string} opts.planPrice   — e.g. "KES 15,000"
 * @param {string|null} opts.paymentUrl  — null for cash/in-person clients
 * @param {'5d'|'1d'|'0d'} opts.stage
 */
export function buildPaymentReminderEmail({ fullName, planName, planPrice, paymentUrl, stage = '5d' }) {
  const firstName = fullName.split(' ')[0];

  const headlines = {
    '5d': 'Payment due in 5 days',
    '1d': 'Payment due tomorrow',
    '0d': 'Payment due today',
  };
  const sublines = {
    '5d': 'Your next AMSC monthly payment is coming up. Sort it early and keep your training uninterrupted.',
    '1d': 'Your monthly AMSC payment is due tomorrow. Take a minute to renew now.',
    '0d': 'Your monthly AMSC payment is due today. Complete your payment to keep your spot active.',
  };
  const ctaLabels = {
    '5d': 'Pay Early &rarr;',
    '1d': 'Pay Now &rarr;',
    '0d': 'Pay Now &rarr;',
  };

  const headline = headlines[stage] || headlines['5d'];
  const subline  = sublines[stage]  || sublines['5d'];
  const ctaLabel = ctaLabels[stage] || ctaLabels['5d'];

  const ctaBlock = paymentUrl ? `
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr>
        <td align="center">
          <a href="${paymentUrl}"
             style="display:inline-block;background:#a60a08;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:16px 36px;border-radius:8px;">
            ${ctaLabel}
          </a>
        </td>
      </tr>
    </table>
  ` : `
    <p style="margin:0 0 28px;color:#d3d3d3;font-size:14px;line-height:1.6;">
      Bring your payment to the next session or contact us directly to arrange transfer.
    </p>
  `;

  return layout(`
    <h1 style="margin:0 0 8px;color:#f5f5f8;font-size:22px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
      ${headline}
    </h1>
    <p style="margin:0 0 28px;color:#a60a08;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
      Monthly Renewal
    </p>

    <p style="margin:0 0 8px;color:#d3d3d3;font-size:15px;line-height:1.6;">Hi ${firstName},</p>
    <p style="margin:0 0 28px;color:#d3d3d3;font-size:15px;line-height:1.6;">
      ${subline}
    </p>

    <!-- Plan summary -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #222222;border-radius:8px;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;color:#555555;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Plan</p>
          <p style="margin:0 0 16px;color:#f5f5f8;font-size:15px;font-weight:700;">${planName}</p>
          <p style="margin:0 0 4px;color:#555555;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Amount Due</p>
          <p style="margin:0;color:#a60a08;font-size:22px;font-weight:800;">${planPrice}</p>
        </td>
      </tr>
    </table>

    ${ctaBlock}

    <p style="margin:0;color:#555555;font-size:12px;line-height:1.6;">
      Questions? Reply to this email or find us on Instagram
      <a href="https://instagram.com/amscperformance" style="color:#a60a08;text-decoration:none;">@amscperformance</a>.
    </p>
  `);
}

/**
 * Admin payment due alert — sent to admin@amscperformance.com when
 * one or more members hit their due date that day.
 *
 * @param {{ name: string, plan: string, amount: string }[]} dueClients
 * @param {string} dateStr — e.g. "9 Jun 2026"
 */
export function buildAdminPaymentAlertEmail({ dueClients, dateStr }) {
  const rows = dueClients.map(c => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #222;color:#f5f5f8;font-size:14px;">${c.name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #222;color:#d3d3d3;font-size:13px;">${c.plan}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #222;color:#a60a08;font-size:14px;font-weight:700;text-align:right;">${c.amount}</td>
    </tr>
  `).join('');

  const total = dueClients.reduce((sum, c) => {
    const num = parseInt(String(c.amount).replace(/[^0-9]/g, ''), 10) || 0;
    return sum + num;
  }, 0);

  return layout(`
    <h1 style="margin:0 0 8px;color:#f5f5f8;font-size:22px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
      ${dueClients.length} Payment${dueClients.length !== 1 ? 's' : ''} Due Today
    </h1>
    <p style="margin:0 0 28px;color:#555555;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
      ${dateStr}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #222222;border-radius:8px;margin-bottom:24px;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:1px solid #333;">
          <th style="padding:10px 16px;text-align:left;color:#555;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Member</th>
          <th style="padding:10px 16px;text-align:left;color:#555;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Plan</th>
          <th style="padding:10px 16px;text-align:right;color:#555;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <p style="margin:0 0 28px;color:#d3d3d3;font-size:14px;">
      Expected today: <strong style="color:#f5f5f8;">KES ${total.toLocaleString()}</strong>
    </p>

    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="https://amscperformance.com/admin"
             style="display:inline-block;background:#a60a08;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:8px;">
            Open Admin Portal &rarr;
          </a>
        </td>
      </tr>
    </table>
  `);
}
