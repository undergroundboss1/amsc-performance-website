import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById, getEffectiveMonthlyRate } from '../../../../lib/plans';
import { sendEmail, buildApprovalEmail } from '../../../../lib/email';

/**
 * GET /api/cron/stale-applicants
 *
 * Daily follow-up for people who were approved through the public application
 * form but never completed their first payment.
 *
 *   >= 3 days since approval, not yet nudged       → resend the payment link (one nudge)
 *   >= 11 days since that nudge, still unpaid       → mark application_status = 'expired'
 *                                                     (reversible — admin can re-approve)
 *
 * Expiry is gated on a prior nudge, NOT on approval age — so nobody is ever
 * expired without first being reminded, even applicants approved long ago.
 *
 * Targets ONLY genuine public-form applicants:
 *   application_status = 'approved'
 *   last_paid_at IS NULL                 (never paid)
 *   approval_token IS NOT NULL           (came through the approve flow)
 *   online_transition_sent_at IS NULL    (not an existing member moved online)
 *   email is real (not a .placeholder)
 *
 * Manual/partnership clients (create-client) have no approval_token and are
 * excluded; transitioned cash clients are excluded by online_transition_sent_at.
 *
 * Sends Arnold a summary if anything happened.
 */

const NUDGE_AFTER_DAYS = 3;        // days after approval before the first nudge
const EXPIRE_AFTER_NUDGE_DAYS = 11; // grace days after the nudge before expiring

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  const { data: applicants, error } = await supabase
    .from('clients')
    .select('id, full_name, email, selected_plan, plan_price, custom_monthly_rate, discount_percent, approval_token, approved_at, applicant_nudge_sent_at')
    .eq('application_status', 'approved')
    .is('last_paid_at', null)
    .is('online_transition_sent_at', null)
    .not('approval_token', 'is', null);

  if (error) {
    console.error('stale-applicants: DB error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const results = { nudged: 0, expired: 0, skipped: 0, detail: [] };

  for (const c of applicants || []) {
    if (!c.email || c.email.endsWith('.placeholder')) { results.skipped++; continue; }

    // Days since approval (fall back to "no baseline" → skip if approved_at missing)
    if (!c.approved_at) { results.skipped++; continue; }
    const daysSinceApproved = Math.floor((now - new Date(c.approved_at).getTime()) / msPerDay);
    const daysSinceNudge = c.applicant_nudge_sent_at
      ? Math.floor((now - new Date(c.applicant_nudge_sent_at).getTime()) / msPerDay)
      : null;

    const plan = getPlanById(c.selected_plan);
    const planName = plan?.name || c.selected_plan || 'Training';
    const planPrice = `KES ${getEffectiveMonthlyRate(c).toLocaleString()}`;
    const paymentUrl = `${siteUrl}/join/pay?token=${c.approval_token}`;

    try {
      // Expire only AFTER a nudge has been sent and the grace period elapsed —
      // never on approval age alone, so everyone gets a reminder first.
      if (daysSinceNudge !== null && daysSinceNudge >= EXPIRE_AFTER_NUDGE_DAYS) {
        await supabase
          .from('clients')
          .update({
            application_status: 'expired',
            notes: `Application expired by stale-applicant cron — nudged ${daysSinceNudge}d ago, still unpaid. Re-approve to revive.`,
          })
          .eq('id', c.id);
        results.expired++;
        results.detail.push({ name: c.full_name, action: 'expired', days: daysSinceApproved });
      } else if (daysSinceApproved >= NUDGE_AFTER_DAYS && !c.applicant_nudge_sent_at) {
        const { ok, error: emailErr } = await sendEmail({
          to: c.email,
          subject: `A reminder to complete your AMSC payment — ${planName}`,
          html: buildApprovalEmail({ fullName: c.full_name, planName, planPrice, paymentUrl }),
        });
        if (!ok) throw new Error(emailErr);
        await supabase
          .from('clients')
          .update({ applicant_nudge_sent_at: new Date().toISOString() })
          .eq('id', c.id);
        results.nudged++;
        results.detail.push({ name: c.full_name, action: 'nudged', days: daysSinceApproved });
      } else {
        results.skipped++;
      }
    } catch (err) {
      console.error(`stale-applicants: failed for ${c.email}:`, err.message);
      results.detail.push({ name: c.full_name, action: 'failed', error: err.message });
    }
  }

  // ── Admin summary — only if something happened ──────────────────────────────
  if (results.nudged > 0 || results.expired > 0) {
    const rows = results.detail
      .filter(d => d.action === 'nudged' || d.action === 'expired')
      .map(d => `<li><strong>${d.name}</strong> — ${d.action} (${d.days}d since approval)</li>`)
      .join('');
    const dateStr = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    await sendEmail({
      to: 'admin@amscperformance.com',
      subject: `Applicant follow-ups — ${results.nudged} nudged, ${results.expired} expired (${dateStr})`,
      html: `<p style="font-family:sans-serif;font-size:14px;color:#111;">Approved applicants who hadn't paid:</p>
             <ul style="font-family:sans-serif;font-size:14px;color:#111;">${rows}</ul>
             <p style="font-family:sans-serif;font-size:13px;color:#555;">Expired applications can be revived by re-approving the client in the admin portal.</p>`,
    });
  }

  console.log(`stale-applicants: ${results.nudged} nudged, ${results.expired} expired, ${results.skipped} skipped`);
  return NextResponse.json(results);
}
