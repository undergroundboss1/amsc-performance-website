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
 * Payment reminder email — sent monthly to M-Pesa clients.
 */
export function buildPaymentReminderEmail({ fullName, planName, planPrice, paymentUrl }) {
  const firstName = fullName.split(' ')[0];

  return layout(`
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
          <p style="margin:0 0 4px;color:#555555;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Your Plan</p>
          <p style="margin:0 0 16px;color:#f5f5f8;font-size:16px;font-weight:700;">${planName}</p>
          <p style="margin:0 0 4px;color:#555555;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Amount Due</p>
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
            Pay Now via M-Pesa &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;color:#555555;font-size:13px;line-height:1.6;">
      If you have any questions, reply to this email or reach out on Instagram
      <a href="https://instagram.com/amscperformance" style="color:#a60a08;text-decoration:none;">@amscperformance</a>.
    </p>
  `);
}
