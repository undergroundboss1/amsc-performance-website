import { cache } from 'react';
import { cookies } from 'next/headers';
import { getKochaSupabase } from '../supabase';
import { SESSION_COOKIE, hashToken, isWellFormedToken } from './token';

/**
 * Resolve the signed-in Coach Scholar — server components and route
 * handlers only (reads the httpOnly session cookie, uses the service role).
 *
 * The cookie holds the coach's access token; we hash it and look up the
 * scholar. A revoked or reissued link fails the lookup, so revoking in the
 * admin portal signs that link out of every phone immediately — there is no
 * separate session table to clean up.
 */

const SCHOLAR_COLUMNS =
  'id, display_name, zone, ' +
  'cohort:cohorts(id, slug, name, starts_on, class_time, meet_url, fallback_note, whatsapp_group_url, nutrition_enabled)';

export async function findScholarByToken(token) {
  if (!isWellFormedToken(token)) return null;
  const { data, error } = await getKochaSupabase()
    .from('scholars')
    .select(SCHOLAR_COLUMNS)
    .eq('token_hash', hashToken(token))
    .is('revoked_at', null)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/** Cached per request, so the layout and the page share one lookup. */
export const getCurrentScholar = cache(async () => {
  return findScholarByToken(cookies().get(SESSION_COOKIE)?.value);
});
