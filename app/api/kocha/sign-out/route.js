import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '../../../../lib/kocha/token';
import { KOCHA_BASE } from '../../../../lib/kocha/constants';

/**
 * POST /api/kocha/sign-out
 *
 * Signs this phone out of the Coach Resource Hub (for a shared or borrowed
 * phone). The coach's personal link keeps working — tapping it again signs
 * back in. To stop a link working everywhere, revoke it in the admin portal.
 */
export async function POST(request) {
  const url = new URL(KOCHA_BASE, request.url);
  url.search = 'signed_out=1';
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
