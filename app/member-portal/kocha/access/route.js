import { NextResponse } from 'next/server';
import { getKochaSupabase } from '../../../../lib/supabase';
import { findScholarByToken } from '../../../../lib/kocha/session';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '../../../../lib/kocha/token';
import { KOCHA_BASE } from '../../../../lib/kocha/constants';

/**
 * GET /member-portal/kocha/access?t=<token>
 *
 * The personal link each Coach Scholar gets on WhatsApp. A valid token is
 * moved into an httpOnly session cookie and the coach is redirected to the
 * course home, so the token leaves the address bar (and browser history,
 * screenshots and shared screens) on the first tap.
 *
 * An invalid, revoked or replaced link lands on the course home with
 * ?link=invalid, which explains what to do — it never says whether the
 * token ever existed.
 */
export const dynamic = 'force-dynamic';

function redirectTo(request, search) {
  const url = new URL(KOCHA_BASE, request.url);
  if (search) url.search = search;
  const res = NextResponse.redirect(url, 303);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('t');

  try {
    const scholar = await findScholarByToken(token);
    if (!scholar) return redirectTo(request, 'link=invalid');

    const { error } = await getKochaSupabase()
      .from('scholars')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', scholar.id);
    if (error) console.error('kocha access: last_seen_at update failed (non-fatal):', error);

    const res = redirectTo(request);
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    console.error('kocha access error:', err);
    return redirectTo(request, 'link=error');
  }
}
