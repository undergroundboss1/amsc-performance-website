'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

function Icon({ tone, children }) {
  const tones = {
    success: 'bg-green-600/20 border-green-500/40 text-green-400',
    neutral: 'bg-white/5 border-white/10 text-white/60',
  };
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 mb-8 ${tones[tone]}`}
    >
      {children}
    </motion.span>
  );
}

const CHECK = (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <motion.path
      strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
    />
  </svg>
);

const MAIL = (
  <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

/**
 * UnsubscribePanel — the interactive half of /waitlist/unsubscribe.
 * The page looks the token up server-side and passes the state in; this
 * component only POSTs when the person presses the button (never on load,
 * so link scanners can't unsubscribe anyone).
 */
export default function UnsubscribePanel({ token, state: initialState, email, programName, programPath }) {
  const [state, setState] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const reduce = useReducedMotion();

  async function unsubscribe() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/waitlist/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setState('done');
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Something went wrong. Please try again.');
    } catch {
      setError('No connection. Check your signal and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const fade = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -16 },
    transition: { duration: 0.6, ease: EASE },
  };

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <AnimatePresence mode="wait">
        {state === 'ready' && (
          <motion.div key="ready" {...fade}>
            <Icon tone="neutral">{MAIL}</Icon>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-4">UNSUBSCRIBE</h1>
            <p className="text-secondary font-body text-base mb-2">
              Stop all emails and WhatsApp messages about <strong className="text-white">{programName}</strong> and other AMSC programs for
            </p>
            <p className="font-display text-white text-lg tracking-wider mb-10">{email}</p>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
                transition={{ duration: 0.4 }}
                className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400 text-sm font-body"
                role="alert"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="button"
              onClick={unsubscribe}
              disabled={submitting}
              whileHover={submitting ? undefined : { y: -2 }}
              whileTap={submitting ? undefined : { scale: 0.97 }}
              className="w-full sm:w-auto bg-accent text-white font-display font-bold text-sm tracking-wider uppercase px-12 py-4 rounded-full hover:bg-accent-dark transition-colors duration-200 cursor-pointer hover:shadow-lg hover:shadow-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-3"
            >
              {submitting && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? 'Unsubscribing…' : 'Unsubscribe'}
            </motion.button>
            <p className="mt-8">
              <Link href={programPath} className="text-secondary hover:text-white font-display text-sm font-semibold tracking-wider transition-colors">
                Keep me on the list
              </Link>
            </p>
          </motion.div>
        )}

        {(state === 'done' || state === 'already') && (
          <motion.div key="done" {...fade}>
            <Icon tone="success">{CHECK}</Icon>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-4">
              {state === 'done' ? "YOU'RE UNSUBSCRIBED" : 'ALREADY UNSUBSCRIBED'}
            </h1>
            <p className="text-secondary font-body text-base max-w-md mx-auto mb-10">
              {email} will not receive any more {programName} emails or WhatsApp messages from AMSC Performance.
              If you&apos;re in the WhatsApp community, we&apos;ll remove you, or you can leave at any time.
            </p>
            <p className="text-secondary font-body text-sm">
              Changed your mind?{' '}
              <Link href={`${programPath}#join`} className="text-accent hover:underline">
                Join the waitlist again
              </Link>
              .
            </p>
          </motion.div>
        )}

        {(state === 'invalid' || state === 'error') && (
          <motion.div key="invalid" {...fade}>
            <Icon tone="neutral">{MAIL}</Icon>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-4">
              {state === 'invalid' ? 'LINK NOT RECOGNISED' : 'SOMETHING WENT WRONG'}
            </h1>
            <p className="text-secondary font-body text-base max-w-md mx-auto mb-10">
              {state === 'invalid'
                ? 'This unsubscribe link is incomplete. Use the Unsubscribe link at the bottom of any AMSC email, or reply to one and we will remove you.'
                : 'We could not load your details just now. Please try the link again in a moment.'}
            </p>
            <a
              href="https://instagram.com/amscperformance"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-white/15 text-white/80 px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-white/5 hover:border-white/25 hover:text-white transition-all duration-200"
            >
              Message Us on Instagram
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
