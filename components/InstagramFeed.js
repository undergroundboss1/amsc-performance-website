'use client';
import Script from 'next/script';
import Link from 'next/link';
import { useConsent } from './ConsentContext';

export default function InstagramFeed() {
  const { consent } = useConsent();
  const allowed = consent === 'accepted';

  return (
    <section className="py-32 px-6 bg-surface">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-4">
          FOLLOW THE JOURNEY
        </h2>
        <p className="text-secondary text-base max-w-2xl mx-auto font-body">
          Stay updated with the latest from AMSC Performance.
        </p>
      </div>
      <div className="max-w-7xl mx-auto">
        {allowed ? (
          <behold-widget feed-id="az3ln0lhjRin0SMMW0f4"></behold-widget>
        ) : (
          <div className="text-center py-16 border border-white/5 rounded-lg bg-surface-light">
            <p className="text-secondary text-sm font-body mb-4">
              Accept cookies to view our live Instagram feed.
            </p>
            <a
              href="https://instagram.com/amscperformance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline text-sm font-body"
            >
              View on Instagram instead
            </a>
          </div>
        )}
      </div>
      <div className="text-center mt-10">
        <a
          href="https://instagram.com/amscperformance"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block border border-white/15 text-white/80 px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-white/5 hover:border-white/25 hover:text-white transition-all duration-200"
        >
          Follow @amscperformance
        </a>
      </div>
      {allowed && (
        <Script
          src="https://w.behold.so/widget.js"
          type="module"
          strategy="lazyOnload"
        />
      )}
    </section>
  );
}
