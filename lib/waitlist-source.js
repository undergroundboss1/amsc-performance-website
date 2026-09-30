/**
 * Traffic-source attribution for waitlist signups.
 *
 * Works without cookies or analytics consent: everything here is read from
 * the signup request itself (URL params captured on the landing page, the
 * landing referrer's host, and the submitting browser's user agent). Only the
 * derived category and the referrer HOST are stored — never the full user
 * agent, full referrer URL or IP address.
 *
 * Precedence, most explicit first:
 *   1. utm_source / ?src= on the link    (e.g. /offpitch?src=ig)
 *   2. In-app browser user agent         (Instagram's in-app browser says so)
 *   3. Referrer host                     (l.instagram.com, google.com, …)
 *   4. 'direct'
 *
 * (2) is what makes a plain /offpitch bio link attribute correctly: taps from
 * the Instagram app open in its in-app browser, which identifies itself in
 * the user agent even when it sends no referrer.
 */

export const SOURCE_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  x: 'X / Twitter',
  youtube: 'YouTube',
  search: 'Search',
  email: 'Email',
  website: 'AMSC website',
  direct: 'Direct / unknown',
  other: 'Other',
};

const PARAM_ALIASES = {
  ig: 'instagram', instagram: 'instagram', insta: 'instagram',
  fb: 'facebook', facebook: 'facebook', meta: 'facebook',
  tt: 'tiktok', tiktok: 'tiktok',
  wa: 'whatsapp', whatsapp: 'whatsapp',
  x: 'x', twitter: 'x',
  yt: 'youtube', youtube: 'youtube',
  email: 'email', newsletter: 'email',
  google: 'search',
};

export function detectInAppBrowser(userAgent) {
  const ua = userAgent || '';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'facebook';
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return 'tiktok';
  return null;
}

function sourceFromReferrerHost(host, siteHost) {
  if (!host) return null;
  const h = host.toLowerCase();
  if (siteHost && (h === siteHost || h.endsWith(`.${siteHost}`))) return 'website';
  if (/(^|\.)instagram\.com$/.test(h)) return 'instagram';
  if (/(^|\.)(facebook\.com|fb\.me|messenger\.com)$/.test(h)) return 'facebook';
  if (/(^|\.)tiktok\.com$/.test(h)) return 'tiktok';
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(h)) return 'whatsapp';
  if (/(^|\.)(t\.co|twitter\.com|x\.com)$/.test(h)) return 'x';
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(h)) return 'youtube';
  if (/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(h)) return 'search';
  return 'other';
}

/**
 * @param {object} opts
 * @param {string|null} opts.param        - utm_source or src, as captured on landing
 * @param {string|null} opts.referrerHost - host of document.referrer on landing
 * @param {string|null} opts.userAgent    - the submitting request's user agent
 * @param {string|null} opts.siteHost     - this site's host, to spot internal links
 * @returns {string} one of the SOURCE_LABELS keys
 */
export function classifySource({ param, referrerHost, userAgent, siteHost }) {
  const p = (param || '').trim().toLowerCase();
  if (p) return PARAM_ALIASES[p] || 'other';

  const inApp = detectInAppBrowser(userAgent);
  if (inApp) return inApp;

  return sourceFromReferrerHost(referrerHost, siteHost) || 'direct';
}
