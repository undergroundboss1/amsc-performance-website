import { getCampSupabase } from './supabase';
import { getCampContentBySlug } from './camps';
import { sendEmail, buildCampConfirmationEmail, buildCampWaitlistEmail } from './email';

/**
 * Sends the guardian confirmation or waitlist email for a camp registration
 * that has just resolved to 'paid' or 'waitlist' — and, on waitlist, an
 * admin alert (the same pattern already used elsewhere in this codebase
 * for anything needing a human decision).
 *
 * Shared between the Paystack webhook's camp branch and the admin
 * mark-paid / promote-from-waitlist routes, so there is exactly one place
 * that decides what the guardian is told, regardless of which path
 * produced the outcome. Originally this lived inline in the webhook only;
 * extracted here specifically because copying it into the new admin
 * routes would have been the same "two places doing the same important
 * thing" mistake already caught twice elsewhere this session.
 *
 * Non-fatal by design — callers should not let an email failure here
 * block the actual state change the guardian is waiting on.
 *
 * @param {string} registrationId
 * @param {'paid'|'waitlist'} result
 * @param {object} [opts]
 * @param {number} [opts.amountPaid] - shown in the waitlist admin alert;
 *   defaults to the camp's flat price if not provided (e.g. a manual
 *   admin action rather than a real Paystack charge amount).
 */
export async function sendCampOutcomeEmail(registrationId, result, opts = {}) {
  if (result !== 'paid' && result !== 'waitlist') return;

  const campSupabase = getCampSupabase();

  const { data: registration } = await campSupabase
    .from('registrations')
    .select('id, athlete_name, guardian_name, guardian_email, access_token, camp_id')
    .eq('id', registrationId)
    .single();

  if (!registration || !registration.guardian_email || registration.guardian_email.endsWith('.placeholder')) {
    return;
  }

  const { data: campRow } = await campSupabase
    .from('camps')
    .select('slug, name, starts_on, ends_on, venue, price_kes')
    .eq('id', registration.camp_id)
    .single();

  if (!campRow) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';
  const campContent = getCampContentBySlug(campRow.slug);
  const amountPaid = opts.amountPaid ?? campRow.price_kes;

  if (result === 'paid') {
    const materialsUrl = `${siteUrl}/camps/${campRow.slug}/materials?token=${registration.access_token}`;
    await sendEmail({
      to: registration.guardian_email,
      subject: `You're in — ${campRow.name}`,
      html: buildCampConfirmationEmail({
        athleteName: registration.athlete_name,
        guardianName: registration.guardian_name,
        campName: campRow.name,
        campDatesDisplay: campContent?.datesDisplay || `${campRow.starts_on} – ${campRow.ends_on}`,
        venue: campRow.venue,
        priceDisplay: `KES ${Number(campRow.price_kes).toLocaleString()}`,
        materialsUrl,
      }),
    });
  } else {
    await sendEmail({
      to: registration.guardian_email,
      subject: `You're on the waitlist — ${campRow.name}`,
      html: buildCampWaitlistEmail({
        athleteName: registration.athlete_name,
        guardianName: registration.guardian_name,
        campName: campRow.name,
      }),
    });

    // A payment captured (or manually recorded) that had to be waitlisted
    // needs a human decision — same admin-alert pattern used elsewhere in
    // this codebase for anything requiring admin follow-up.
    await sendEmail({
      to: 'admin@amscperformance.com',
      subject: `Camp waitlist — ${registration.athlete_name} (${campRow.name})`,
      html: `<p style="font-family:sans-serif;font-size:14px;color:#111;">A camp payment was captured but the camp was already at capacity.</p>
             <ul style="font-family:sans-serif;font-size:14px;color:#111;">
               <li><strong>Athlete:</strong> ${registration.athlete_name}</li>
               <li><strong>Camp:</strong> ${campRow.name}</li>
               <li><strong>Guardian email:</strong> ${registration.guardian_email}</li>
               <li><strong>Amount:</strong> KES ${Number(amountPaid).toLocaleString()}</li>
             </ul>
             <p style="font-family:sans-serif;font-size:14px;color:#111;">Refund or promote from the admin Camp tab.</p>`,
    });
  }
}
