'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';

const programNames = {
  'one-on-one': 'One-on-One Coaching',
  'group': 'Performance Group Training',
  'online': 'Online Performance Training',
  'youth': 'Youth Athletic Development',
  'consulting': 'Team & School Consulting',
};

function ApplyContent() {
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);
  const program = searchParams.get('program');
  const programName = program ? programNames[program] : null;

  const tallySrc = `https://tally.so/embed/Pd1g9V?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1${program ? `&program=${encodeURIComponent(programName || program)}` : ''}`;

  useEffect(() => {
    // Directly set iframe src to ensure it loads
    if (iframeRef.current) {
      iframeRef.current.src = tallySrc;
    }

    // Also load the Tally widget script for auto-resize
    const existingScript = document.querySelector('script[src="https://tally.so/widgets/embed.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://tally.so/widgets/embed.js';
      script.onload = () => {
        if (typeof window.Tally !== 'undefined') {
          window.Tally.loadEmbeds();
        }
      };
      document.body.appendChild(script);
    } else if (typeof window.Tally !== 'undefined') {
      window.Tally.loadEmbeds();
    }
  }, [tallySrc]);

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

        {/* Tally.so Embed */}
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
