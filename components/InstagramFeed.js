'use client';
import { useEffect } from 'react';

export default function InstagramFeed() {
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://w.behold.so/widget.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://w.behold.so/widget.js';
      document.head.appendChild(script);
    }
  }, []);

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
        <behold-widget feed-id="az3ln0lhjRin0SMMW0f4"></behold-widget>
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
    </section>
  );
}
