'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const programNames = {
  'one-on-one': 'One-on-One Coaching',
  'group': 'Performance Group Training',
  'online': 'Online Performance Training',
  'youth': 'Youth Athletic Development',
  'consulting': 'Team & School Consulting',
};

function ApplyContent() {
  const searchParams = useSearchParams();
  const program = searchParams.get('program');
  const programName = program ? programNames[program] : null;

  return (
    <section className="py-12 px-6 bg-white min-h-[80vh]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-heading font-black text-4xl md:text-5xl tracking-wide mb-4">
            APPLY TO TRAIN WITH AMSC
          </h1>
          {programName && (
            <p className="text-accent font-semibold text-lg">
              Program: {programName}
            </p>
          )}
          <p className="text-secondary mt-2">
            Complete the form below to begin your application process.
          </p>
        </div>

        {/* Tally.so Embed */}
        <div className="bg-surface rounded-xl p-2">
          <iframe
            data-tally-src={`https://tally.so/embed/nPBdJk?alignLeft=1&hideTitle=1&transparentBackground=1${program ? `&program=${encodeURIComponent(programName || program)}` : ''}`}
            loading="lazy"
            width="100%"
            height="800"
            frameBorder="0"
            marginHeight="0"
            marginWidth="0"
            title="AMSC Application Form"
            className="rounded-lg"
          />
        </div>

        {/* Tally Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var d=document,w="https://tally.so/widgets/embed.js",v=function(){"undefined"!=typeof Tally?Tally.loadEmbeds():d.querySelectorAll("iframe[data-tally-src]:not([src])").forEach(function(e){e.src=e.dataset.tallySrc})};if("undefined"!=typeof Tally)v();else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w;s.onload=v;s.onerror=v;d.body.appendChild(s)}
            `,
          }}
        />
      </div>
    </section>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <section className="py-12 px-6 bg-white min-h-[80vh] flex items-center justify-center">
        <p className="text-secondary">Loading application form...</p>
      </section>
    }>
      <ApplyContent />
    </Suspense>
  );
}
