import { unstable_noStore as noStore } from 'next/cache';
import { getWaitlistSupabase } from '../../../lib/supabase';
import { getWaitlistProgram } from '../../../lib/waitlists';
import UnsubscribePanel from '../../../components/waitlist/UnsubscribePanel';

export const metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
};

// Always read the current state — never serve a cached "subscribed" page.
// force-dynamic alone is not enough: Next 14 still caches the Supabase
// client's fetch() calls, so a page viewed before unsubscribing kept showing
// the old state. fetchCache + noStore() opt the lookup out of the data cache.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const TOKEN_RE = /^[a-f0-9]{64}$/;

// k•••@gmail.com — enough for the person to recognise their address without
// the page revealing it in full to anyone the link was forwarded to.
function maskEmail(email) {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(user.length - 1, 5)))}@${domain}`;
}

async function lookup(token) {
  noStore();
  if (!token || !TOKEN_RE.test(token)) return { state: 'invalid' };
  try {
    const { data, error } = await getWaitlistSupabase()
      .from('signups')
      .select('email, program_slug, unsubscribed_at')
      .eq('unsubscribe_token', token)
      .maybeSingle();
    if (error) {
      console.error('unsubscribe page: lookup error:', error);
      return { state: 'error' };
    }
    if (!data) return { state: 'invalid' };
    const program = getWaitlistProgram(data.program_slug);
    return {
      state: data.unsubscribed_at ? 'already' : 'ready',
      email: maskEmail(data.email),
      programName: program?.name || 'AMSC',
      programPath: program?.path || '/',
    };
  } catch (err) {
    console.error('unsubscribe page error:', err);
    return { state: 'error' };
  }
}

export default async function UnsubscribePage({ searchParams }) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token : '';
  const info = await lookup(token);

  return (
    <section className="min-h-[80vh] flex items-center justify-center bg-background px-6 pt-32 pb-24">
      <UnsubscribePanel token={token} {...info} />
    </section>
  );
}
