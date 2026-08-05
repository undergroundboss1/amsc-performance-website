'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * /camps/[slug]/success?reference=xxx
 *
 * Paystack's callback_url lands here immediately after checkout — before
 * the webhook (which does the actual paid-vs-waitlist decision via
 * confirm_registration()) is guaranteed to have run. So this page polls
 * /api/camp/registration-status for a short window rather than assuming
 * a fixed outcome, and only falls back to a generic "we're confirming"
 * message if the webhook genuinely hasn't landed by the time we give up.
 *
 * Deliberately does not link directly to the materials page — that
 * requires access_token, which this page's backing API intentionally
 * never returns (see app/api/camp/registration-status/route.js). The
 * confirmation/waitlist email is the real delivery channel for that link.
 */
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 20000;

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');

  const [result, setResult] = useState(null); // { status, athleteFirstName, campName, campSlug }
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!reference) return;

    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      try {
        const res = await fetch(`/api/camp/registration-status?reference=${encodeURIComponent(reference)}`);
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (data.status && data.status !== 'pending') {
            setResult(data);
            return; // settled — stop polling
          }
        }
      } catch {
        // transient network error — just keep polling until the timeout
      }

      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        if (!cancelled) setTimedOut(true);
        return;
      }
      if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => { cancelled = true; };
  }, [reference]);

  const isWaitlist = result?.status === 'waitlist';
  const isPaid = result?.status === 'paid';
  const stillProcessing = !result && !timedOut;

  return (
    <section className="py-12 px-6 bg-background min-h-[80vh] pt-24 pb-20">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          {stillProcessing ? (
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border-2 border-white/10 mb-6">
              <span className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </span>
          ) : isWaitlist ? (
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-600/20 border-2 border-yellow-500/40 mb-6">
              <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          ) : (
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500/40 mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}

          <h1 className="font-display font-black text-4xl md:text-5xl tracking-widest mb-4">
            {stillProcessing ? 'CONFIRMING PAYMENT…' : isWaitlist ? "YOU'RE ON THE WAITLIST" : "YOU'RE IN."}
          </h1>

          <p className="text-secondary font-body text-base max-w-md mx-auto">
            {stillProcessing && !timedOut && (
              'Payment received — confirming your registration. This usually takes a few seconds.'
            )}
            {timedOut && !result && (
              "Your payment went through, but we're still confirming your registration. Check your email shortly — we'll send full details there."
            )}
            {isPaid && (
              <>
                {result.athleteFirstName ? `${result.athleteFirstName} is` : 'The athlete is'} confirmed for{' '}
                {result.campName || 'the camp'}. A confirmation email with everything you need is on its way.
              </>
            )}
            {isWaitlist && (
              <>
                Your payment was received, but {result.athleteFirstName || 'the athlete'} landed on the waitlist for{' '}
                {result.campName || 'the camp'} — the camp filled up right around when you registered.
                We&apos;ve emailed you the details, and we&apos;ll reach out the moment a spot opens up.
              </>
            )}
          </p>

          {reference && (
            <p className="text-white/30 font-body text-xs mt-3">Reference: {reference}</p>
          )}
        </div>

        {isWaitlist && (
          <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-6 mb-8 text-left">
            <p className="text-yellow-400 font-body text-sm leading-relaxed">
              <strong>Your card/M-Pesa was charged.</strong> If you&apos;d rather not wait for a spot to open, message
              us on Instagram and we&apos;ll sort out a refund.
            </p>
          </div>
        )}

        <div className="bg-surface-light border border-white/5 rounded-xl p-6 mb-8">
          <p className="text-secondary text-sm font-body">
            Questions? Reach out to us on{' '}
            <a
              href="https://instagram.com/amscperformance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Instagram @amscperformance
            </a>
          </p>
        </div>

        <Link
          href="/"
          className="inline-block font-display text-sm font-semibold tracking-wider text-secondary hover:text-white transition-colors"
        >
          {'←'} Back to Home
        </Link>
      </div>
    </section>
  );
}

export default function CampSuccessPage() {
  return (
    <Suspense
      fallback={
        <section className="py-12 px-6 bg-background min-h-[80vh] flex items-center justify-center pt-24">
          <p className="text-secondary font-body text-sm">Loading...</p>
        </section>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
