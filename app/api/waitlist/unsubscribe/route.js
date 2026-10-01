import { NextResponse } from 'next/server';
import { getWaitlistSupabase } from '../../../../lib/supabase';

/**
 * POST /api/waitlist/unsubscribe?token=<unsubscribe_token>
 *
 * Self-serve unsubscribe. Two callers:
 * - The /waitlist/unsubscribe page, when the person presses "Unsubscribe"
 *   (JSON body { token }).
 * - Mail providers' one-click unsubscribe (RFC 8058): Gmail/Yahoo POST to the
 *   List-Unsubscribe URL with the token in the query string and a
 *   "List-Unsubscribe=One-Click" form body.
 *
 * Deliberately POST-only: link scanners and mail previews follow GET links,
 * and must never unsubscribe anyone by accident.
 *
 * The token is the only credential (it is only ever sent to the signup's own
 * inbox). Unsubscribing keeps the row and stamps unsubscribed_at, so there is
 * a record of the opt-out and nobody is emailed again unless they re-join.
 * Idempotent: unsubscribing twice is a no-op success.
 */

const TOKEN_RE = /^[a-f0-9]{64}$/;

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    let token = searchParams.get('token');

    if (!token && (request.headers.get('content-type') || '').includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      token = body?.token;
    }

    if (typeof token !== 'string' || !TOKEN_RE.test(token)) {
      return NextResponse.json({ error: 'This unsubscribe link is not valid.' }, { status: 400 });
    }

    const db = getWaitlistSupabase();
    const { data, error } = await db
      .from('signups')
      .select('id, unsubscribed_at')
      .eq('unsubscribe_token', token)
      .maybeSingle();

    if (error) {
      console.error('waitlist/unsubscribe: lookup error:', error);
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'This unsubscribe link is not valid.' }, { status: 404 });
    }

    if (!data.unsubscribed_at) {
      const { error: updateError } = await db
        .from('signups')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('id', data.id);
      if (updateError) {
        console.error('waitlist/unsubscribe: update error:', updateError);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('waitlist/unsubscribe error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
