/**
 * Personal access links for Coach Scholars.
 *
 * Each coach gets one link, sent on WhatsApp: /member-portal/kocha/access?t=…
 * The token is 32 random bytes (256 bits), so it cannot be guessed. Only its
 * SHA-256 hash is stored (kocha.scholars.token_hash): someone who could read
 * the table still could not rebuild a working link. Issuing a new link
 * replaces the hash, which signs the old link out of every phone at once.
 *
 * Same magic-link model as clients.approval_token and camp access tokens,
 * hardened by hashing, a session cookie, and one-tap revoke.
 */

import { createHash, randomBytes } from 'crypto';

export const SESSION_COOKIE = 'amsc_kocha';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

export function newAccessToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/** 32 bytes in base64url is always 43 characters from this alphabet. */
export function isWellFormedToken(token) {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}
