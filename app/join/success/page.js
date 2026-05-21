'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function BillingScheduleCard({ reference }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reference) { setLoading(false); return; }
    fetch(`/api/billing-info?reference=${encodeURIComponent(reference)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setInfo(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [reference]);

  if (loading || !info) return null;

  return (
    <div className="bg-surface border border-white/5 rounded-xl p-8 text-left mb-8">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
        <h2 className="font-display font-bold text-sm tracking-widest uppercase text-white/60">
          Your Billing Schedule
        </h2>
      </div>

      {/* Key dates */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white/5 rounded-lg p-4">
          <p className="text-white/40 font-body text-xs mb-1">Billing cycle anchored to</p>
          <p className="text-white font-display font-bold text-sm tracking-wide">
            {formatDate(info.billingAnchor)}
          </p>
        </div>
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
          <p className="text-accent/70 font-body text-xs mb-1">Next payment due</p>
          <p className="text-white font-display font-bold text-sm tracking-wide">
            {formatDate(info.nextDueDate)}
          </p>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-white/50 font-body text-sm leading-relaxed mb-4">
        Your billing runs on a <strong className="text-white/80">30-day cycle from your training start date</strong>.
        {' '}This means your next charge is 30 days after you started — not 30 days after you paid.
        {' '}If you paid late, your next due date will be sooner than you might expect.
      </p>

      {info.isAutoRenew ? (
        <div className="flex items-start gap-2 bg-green-900/20 border border-green-500/20 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-400 font-body text-sm">
            You&apos;re on <strong>auto-renewal</strong> — your card will be charged automatically on {formatDate(info.nextDueDate)}. No action needed.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-500/20 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-yellow-400 font-body text-sm">
            <strong>Save this date:</strong> {formatDate(info.nextDueDate)}. You&apos;ll receive a reminder before your next payment is due.
          </p>
        </div>
      )}
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  // Clear saved session state
  useEffect(() => {
    sessionStorage.removeItem('amsc_plan');
    sessionStorage.removeItem('amsc_client_id');
  }, []);

  return (
    <section className="py-12 px-6 bg-background min-h-[80vh] pt-24 pb-20">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500/40 mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <h1 className="font-display font-black text-4xl md:text-5xl tracking-widest mb-4">
            YOU&apos;RE IN.
          </h1>
          <p className="text-secondary font-body text-base max-w-md mx-auto">
            Your payment has been received. Welcome to AMSC Performance — your training journey starts now.
          </p>
          {reference && (
            <p className="text-white/30 font-body text-xs mt-3">
              Reference: {reference}
            </p>
          )}
        </div>

        {/* Billing Schedule */}
        <BillingScheduleCard reference={reference} />

        {/* What Happens Next */}
        <div className="bg-surface border border-white/5 rounded-xl p-8 text-left mb-8">
          <h2 className="font-display font-bold text-sm tracking-widest uppercase text-white/60 mb-6">
            What Happens Next
          </h2>
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-display font-bold text-sm">
                1
              </span>
              <div>
                <h3 className="font-display font-bold text-white tracking-wide text-sm">Download Trainerize</h3>
                <p className="text-secondary text-sm font-body mt-1">
                  Download the Trainerize app — this is where your training programs, progress tracking, and coach communication will live.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <a
                    href="https://apps.apple.com/app/trainerize/id634561456"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-surface-light border border-white/10 rounded-lg px-4 py-2.5 text-white text-xs font-display font-semibold tracking-wider hover:border-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    App Store
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.trainerize.hub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-surface-light border border-white/10 rounded-lg px-4 py-2.5 text-white text-xs font-display font-semibold tracking-wider hover:border-white/30 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35m13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27m3.35-1.96a1.12 1.12 0 010 1.68l-2.54 1.47-2.5-2.5 2.5-2.5 2.54 1.47zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z"/>
                    </svg>
                    Google Play
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-display font-bold text-sm">
                2
              </span>
              <div>
                <h3 className="font-display font-bold text-white tracking-wide text-sm">Check Your Email</h3>
                <p className="text-secondary text-sm font-body mt-1">
                  Your coach will send you a Trainerize invitation within 24 hours. Accept the invite to access your personalized training program.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-display font-bold text-sm">
                3
              </span>
              <div>
                <h3 className="font-display font-bold text-white tracking-wide text-sm">Start Training</h3>
                <p className="text-secondary text-sm font-body mt-1">
                  Once you&apos;re set up on Trainerize, your first session details and schedule will be shared with you. Welcome to the system.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
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
            </a>{' '}
            and we&apos;ll get you sorted.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block font-display text-sm font-semibold tracking-wider text-secondary hover:text-white transition-colors"
        >
          {'\u2190'} Back to Home
        </Link>
      </div>
    </section>
  );
}

export default function SuccessPage() {
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
