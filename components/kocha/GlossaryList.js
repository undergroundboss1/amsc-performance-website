'use client';

import { useState } from 'react';

/** Searchable glossary. terms: [{ term, meaning }] sorted A to Z. */
export default function GlossaryList({ terms }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? terms.filter((t) => `${t.term} ${t.meaning}`.toLowerCase().includes(q)) : terms;

  return (
    <div>
      <label htmlFor="glossary-search" className="block text-sm font-body text-secondary mb-1">Search the glossary</label>
      <input
        id="glossary-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full min-h-[44px] bg-surface border border-white/10 rounded-lg px-3 text-white font-body text-sm focus:outline-none focus:border-accent mb-6"
        placeholder="e.g. RPE"
      />
      {shown.length === 0 ? (
        <p role="status" className="text-secondary text-sm font-body">No words match &ldquo;{query}&rdquo;.</p>
      ) : (
        <dl className="divide-y divide-white/10 border-y border-white/10">
          {shown.map((t) => (
            <div key={t.term} id={`term-${t.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 scroll-mt-24">
              <dt className="font-body font-semibold text-white">{t.term}</dt>
              <dd className="font-body text-sm text-secondary sm:col-span-2 mt-1 sm:mt-0">{t.meaning}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
