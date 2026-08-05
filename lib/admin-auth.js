/**
 * Shared admin authentication — three keys, identical full privileges.
 *
 * Arnold, Khivali, and Jenny each hold their own secret key
 * (ADMIN_SECRET_KEY, ADMIN_KEY_KHIVALI, ADMIN_KEY_JENNY). Any valid key
 * unlocks every admin route — there is no restricted role between them.
 * Separate keys exist so access is individually revocable (delete one env
 * var, that person's access stops, the other two are unaffected) and so
 * admin actions can be attributed in the audit trail (lib/admin-audit.js)
 * — not to gate what any one of them can do.
 *
 * Matches the existing per-route comparison style (`!==` on the bearer
 * token) rather than introducing a different security posture — none of
 * the 15 admin routes this replaces used a timing-safe comparison either.
 */

function getAdminKeys() {
  return {
    arnold: process.env.ADMIN_SECRET_KEY,
    khivali: process.env.ADMIN_KEY_KHIVALI,
    jenny: process.env.ADMIN_KEY_JENNY,
  };
}

/**
 * Resolve the Authorization header on an admin request to the actor whose
 * key matches.
 *
 * @param {Request} request
 * @returns {'arnold'|'khivali'|'jenny'|null} null if no configured key matches
 */
export function getAdminActor(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const presented = authHeader.slice('Bearer '.length);
  const keys = getAdminKeys();

  for (const actor of Object.keys(keys)) {
    if (keys[actor] && presented === keys[actor]) return actor;
  }
  return null;
}

/**
 * Convenience boolean — for routes that only need to know "is this request
 * authorized at all", not which of the three keys was used.
 */
export function isValidAdminKey(request) {
  return getAdminActor(request) !== null;
}
