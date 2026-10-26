import Link from 'next/link';
import { KOCHA_BASE } from '../../lib/kocha/constants';
import { formatDay } from '../../lib/kocha/format';

/**
 * The 12-week progress strip. Every week is always shown — locked weeks
 * calmly, gated ones as "To be confirmed" — so coaches can see the whole
 * course at a glance. Two rows of six on phones, one row of twelve wider.
 */
export default function WeekMap({ weeks, currentN, progress, activeN }) {
  return (
    <nav aria-label="12-week map">
      <ol className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
        {weeks.map((w) => {
          const steps = progress[w.n] || [];
          const done = ['download', 'watch', 'submit'].every((s) => steps.includes(s));
          const isCurrent = w.n === currentN;
          const isActive = w.n === activeN;
          const status =
            w.state === 'tbc' ? 'to be confirmed'
              : w.state === 'locked' ? 'not open yet'
                : done ? 'done' : isCurrent ? 'this week' : 'open';
          const tone =
            w.state !== 'open' ? 'bg-surface text-secondary border-white/5'
              : done ? 'bg-surface-light text-white border-green-500/40'
                : isCurrent ? 'bg-accent text-white border-accent'
                  : 'bg-surface-light text-white border-white/15';
          return (
            <li key={w.n}>
              <Link
                href={`${KOCHA_BASE}/week/${w.n}`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Week ${w.n}, ${formatDay(w.class_on)}, ${status}`}
                className={`flex flex-col items-center justify-center min-h-[52px] rounded-lg border ${tone} ${
                  isActive ? 'ring-2 ring-white/70' : ''
                } hover:border-white/40 transition-colors`}
              >
                <span className="font-display font-bold text-lg leading-none">{w.n}</span>
                <span aria-hidden="true" className="text-[11px] font-body mt-1 leading-none h-3">
                  {w.state === 'open' ? (done ? '✓' : isCurrent ? 'Now' : '') : w.state === 'tbc' ? 'TBC' : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
