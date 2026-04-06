'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import Script from 'next/script';
import Link from 'next/link';

import { programsData } from '../../lib/programs';
import { useConsent } from '../../components/ConsentContext';

function ApplyContent() {
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);
  const { consent } = useConsent();
  const allowed = consent === 'accepted';
  const program = searchParams.get('program');
  const programName = program && programsData[program] ? programsData[program].name : null;

  const tallySrc = `https://tally.so/embed/Pd1g9V?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1${program ? `&program=${encodeURIComponent(programName || program)}` : ''}`;

  useEffect(() => {
    if (iframeRef.current && allowed) {
      iframeRef.current.src = tallySrc;
    }
  }, [tallySrc, allowed]);

  function handleTallyLoad() {
    if (typeof window.Tally !== 'undefined') {
      window.Tally.loadEmbeds();
    }
  }

  return (
    <section className="py-12 px-6 bg-background min-h-[80vh] pt-24">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-display font-black text-4xl md:text-5xl tracking-widest mb-4">
            APPLY TO TRAIN WITH AMSC
          </h1>
          {programName && (
            <p className="text-accent font-display font-semibold text-base tracking-wider">
              Program: {programName}
            </p>
          )}
          <p className="text-secondary mt-2 text-sm font-body">
            Complete the form below to begin your application process.
          </p>
        </div>

        {allowed ? (
          <div className="bg-surface border border-white/5 rounded-lg p-4">
            <iframe
              ref={iframeRef}
              data-tally-src={tallySrc}
              width="100%"
              height="800"
              frameBorder="0"
              marginHeight="0"
              marginWidth="0"
              title="AMSC Application Form"
              style={{ background: 'transparent' }}
            />
          </div>
        ) : (
          <div className="bg-surface border border-white/5 rounded-lg p-8 text-center">
            <p className="text-secondary text-sm font-body mb-4">
              Please accept cookies to load the application form, or apply directly on Tally.
            </p>
            <a
              href="https://tally.so/r/Pd1g9V"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-accent text-white px-8 py-3 rounded-full font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark transition-all duration-200"
            >
              Apply on Tally.so
            </a>
          </div>
        )}
        {allowed && (
          <Script
            src="https://tally.so/widgets/embed.js"
            strategy="lazyOnload"
            onLoad={handleTallyLoad}
          />
        )}
      </div>
    </section>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <section className="py-12 px-6 bg-background min-h-[80vh] flex items-center justify-center">
        <p className="text-secondary font-body">Loading application form...</p>
      </section>
    }>
      <ApplyContent />
    </Suspense>
  );
}
