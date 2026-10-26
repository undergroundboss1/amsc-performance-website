/**
 * A quick-reference card (session RPE, readiness check, RAMP, landing cues,
 * stop rules…) rendered from kocha.quick_cards.body:
 *   { columns?: [...], rows?: [[...]], items?: [...], note? }
 * Tables collapse to stacked rows on phones so nothing scrolls sideways.
 */
export default function QuickCard({ card, emphasis = false }) {
  const { columns, rows, items, note } = card.body || {};
  return (
    <section
      aria-labelledby={`qc-${card.slug}`}
      className={`bg-surface rounded-lg p-5 border ${emphasis ? 'border-accent' : 'border-white/10'}`}
    >
      <h3 id={`qc-${card.slug}`} className="font-display text-lg tracking-wider text-white mb-3">{card.title}</h3>

      {rows && (
        <div role="table" aria-label={card.title} className="font-body text-sm">
          <div role="row" className="hidden sm:grid gap-4 pb-2 border-b border-white/10" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {columns.map((c) => (
              <span role="columnheader" key={c} className="font-display text-xs font-bold tracking-widest uppercase text-secondary">{c}</span>
            ))}
          </div>
          {rows.map((r) => (
            <div role="row" key={r.join('|')} className="py-3 border-b border-white/10 last:border-0 sm:grid sm:gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
              {r.map((cell, i) => (
                <span role="cell" key={columns[i]} className={`block ${i === 0 ? 'text-white font-semibold' : 'text-secondary'}`}>
                  <span className="sm:hidden text-xs text-muted">{i > 0 ? `${columns[i]}: ` : ''}</span>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {items && (
        <ul className="space-y-2 font-body text-sm text-white leading-relaxed list-disc pl-5 marker:text-accent">
          {items.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}

      {note && <p className="font-body text-sm text-secondary mt-3">{note}</p>}
    </section>
  );
}
