/**
 * WhatsApp number normalisation for waitlist signups — shared by the form
 * (components/waitlist/WaitlistForm.js) and the API (lib/validators.js), so
 * both accept exactly the same input.
 *
 * Numbers are stored in E.164 (+2547XXXXXXXX): the format WhatsApp links
 * (wa.me), contact imports and WhatsApp Business tools all expect.
 *
 * Most of the audience types Kenyan numbers the local way, so a number with
 * no country code is read as local to `defaultCountryCode`:
 *   0712 345 678      -> +254712345678
 *   712345678         -> +254712345678
 *   254712345678      -> +254712345678
 *   +44 7700 900123   -> +447700900123   (any country, with a +)
 *   00447700900123    -> +447700900123
 */

const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * @param {string} raw
 * @param {string} defaultCountryCode digits only, e.g. '254'
 * @returns {string|null} E.164 number, or null if it can't be a valid number
 */
export function normalizeWhatsapp(raw, defaultCountryCode = '254') {
  if (typeof raw !== 'string') return null;
  let s = raw.trim().replace(/[\s\-().]/g, '');
  if (!s) return null;

  if (s.startsWith('00')) s = `+${s.slice(2)}`;

  if (!s.startsWith('+')) {
    if (!/^\d+$/.test(s)) return null;
    if (s.startsWith(defaultCountryCode)) s = `+${s}`;
    else s = `+${defaultCountryCode}${s.replace(/^0/, '')}`;
  }

  return E164.test(s) ? s : null;
}
