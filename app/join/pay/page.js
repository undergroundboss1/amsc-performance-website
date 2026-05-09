'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

/**
 * /join/pay?token=xxx
 *
 * This page is ONLY accessible with a valid approval token.
 * The token is generated when you (admin) approve an application.
 * You send this link to the client after the discovery call.
 *
 * Flow: Client clicks link → sees their plan + amount → chooses M-Pesa or Card → pays
 */

function PaymentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(null);

  // Check for payment failure redirect
  const paymentStatus = searchParams.get('payment');
  const [paymentError, setPaymentError] = useState(
    paymentStatus === 'failed' || paymentStatus === 'cancelled'
      ? 'Your payment was not completed. Please try again.'
      : ''
  );

  // Fetch client data using the approval token
  useEffect(() => {
    if (!token) {
      setError('Invalid payment link. Please contact AMSC for a valid link.');
      setLoading(false);
      return;
    }

    async function fetchClient() {
      try {
        const res = await fetch(`/api/payments/verify-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'This payment link is invalid or expired.');
          return;
        }

        setClientData(data);
      } catch {
        setError('Failed to load payment details. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchClient();
  }, [token]);

  async function handlePay(provider) {
    setPaying(provider);
    setPaymentError('');

    try {
      const res = await fetch(`/api/payments/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientData.clientId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment initialization failed.');
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setPaying(null);
      setPaymentError(err.message || 'Something went wrong. Please try again.');
    }
  }

  // Loading state
  if (loading) {
    return (
      <section className="py-12 px-6 bg-background min-h-[80vh] flex items-center justify-center pt-24">
        <div className="text-center">
          <span className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-secondary font-body text-sm">Loading payment details...</p>
        </div>
      </section>
    );
  }

  // Error state (invalid/expired token)
  if (error) {
    return (
      <section className="py-12 px-6 bg-background min-h-[80vh] pt-24 pb-20">
        <div className="max-w-md mx-auto text-center">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500/40 mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
          <h1 className="font-display font-black text-2xl tracking-widest mb-4">
            INVALID LINK
          </h1>
          <p className="text-secondary font-body text-sm mb-8">{error}</p>
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

  // Already paid
  if (clientData.paymentStatus === 'paid') {
    return (
      <section className="py-12 px-6 bg-background min-h-[80vh] pt-24 pb-20">
        <div className="max-w-md mx-auto text-center">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 border-2 border-green-500/40 mb-6">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <h1 className="font-display font-black text-2xl tracking-widest mb-4">
            ALREADY PAID
          </h1>
          <p className="text-secondary font-body text-sm mb-8">
            This subscription has already been paid. If you need help, reach out to us on Instagram.
          </p>
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

  // Payment page
  return (
    <section className="py-12 px-6 bg-background min-h-[80vh] pt-24 pb-20">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link
            href="/"
            className="inline-block font-display text-xs font-semibold tracking-[0.25em] uppercase text-secondary hover:text-white transition-colors mb-6"
          >
            AMSC Performance
          </Link>
          <h1 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-3">
            COMPLETE PAYMENT
          </h1>
          <p className="text-secondary font-body text-sm">
            Welcome, <span className="text-white">{clientData.name}</span>. You&apos;ve been approved to join AMSC.
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-surface border border-white/5 rounded-xl p-6 mb-8">
          <h3 className="font-display font-bold text-sm tracking-widest uppercase text-white/60 mb-4">
            Order Summary
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-body">{clientData.planName}</span>
            <span className="font-display font-bold text-white">{clientData.displayPrice}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary font-body">Billing cycle</span>
            <span className="text-secondary font-body">Monthly</span>
          </div>
          <div className="border-t border-white/5 mt-4 pt-4 flex items-center justify-between">
            <span className="font-display font-bold text-white">Total Due Today</span>
            <span className="font-display font-bold text-xl text-accent">{clientData.displayPrice}</span>
          </div>
        </div>

        {paymentError && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm font-body">{paymentError}</p>
          </div>
        )}

        {/* Payment options */}
        <div className="space-y-3">
          {/* Card payment \u2014 recurring subscription */}
          <button
            type="button"
            onClick={() => handlePay('paystack')}
            disabled={paying !== null}
            className="w-full bg-accent hover:bg-accent/90 text-white font-display font-bold text-base tracking-widest uppercase rounded-xl p-5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {paying === 'paystack' ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pay with Card
              </>
            )}
          </button>
          <p className="text-center text-white/30 text-xs font-body">
            Auto-renews monthly \u00b7 Cancel anytime
          </p>

          {/* Divider */}
          <div className="flex items-center gap-4 py-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs font-body">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* M-Pesa \u2014 one-time, manual renewal */}
          <button
            type="button"
            onClick={() => handlePay('mpesa')}
            disabled={paying !== null}
            className="w-full bg-surface hover:bg-white/5 text-white border border-white/10 hover:border-white/20 font-display font-bold text-base tracking-widest uppercase rounded-xl p-5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {paying === 'mpesa' ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {/* M-Pesa green phone icon */}
                <svg className="w-5 h-5 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Pay with M-Pesa
              </>
            )}
          </button>
          <p className="text-center text-white/30 text-xs font-body">
            One-time payment \u00b7 You&apos;ll receive a renewal reminder each month
          </p>
        </div>

        {/* Security note */}
        <p className="text-center text-secondary text-xs font-body mt-8">
          Your payment is processed securely by Paystack. AMSC never stores your card or M-Pesa PIN.
        </p>
      </div>
    </section>
  );
}

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <section className="py-12 px-6 bg-background min-h-[80vh] flex items-center justify-center pt-24">
          <div className="text-center">
            <span className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-secondary font-body text-sm">Loading...</p>
          </div>
        </section>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
