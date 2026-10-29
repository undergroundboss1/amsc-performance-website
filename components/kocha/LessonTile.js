import Link from 'next/link';
import { KOCHA_BASE } from '../../lib/kocha/constants';
import { formatDay, formatMoment } from '../../lib/kocha/format';

/**
 * One of the 12 lesson tiles on the dashboard: number, title, the coach's
 * own progress (study card opened, video watched, homework sent) and the
 * lesson's state. Locked and coming-soon lessons show title and date
 * only; gated ones show "To be confirmed".
 */
function Dot({ done, label }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full ${done ? 'bg-green-400' : 'border border-white/40'}`} />
      <span className={done ? 'text-white' : 'text-secondary'}>{label}</span>
      <span className="sr-only">{done ? ' done' : ' not yet'}</span>
    </li>
  );
}

export default function LessonTile({ week, progress, isCurrent, visit }) {
  const open = week.state === 'open';
  const title = week.state === 'tbc' ? 'To be confirmed' : week.title;
  const stateLine = {
    open: null,
    locked: week.opens_at ? `Opens ${formatMoment(week.opens_at)}` : 'Not open yet',
    soon: 'Coming soon',
    tbc: 'To be confirmed',
  }[week.state];

  return (
    <li>
      <Link
        href={`${KOCHA_BASE}/lesson/${week.n}`}
        className={`flex flex-col h-full min-h-[132px] rounded-lg border p-4 transition-colors ${
          open ? (isCurrent ? 'bg-surface border-accent' : 'bg-surface border-white/15 hover:border-white/40') : 'bg-background border-white/10 hover:border-white/25'
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="font-display text-xs font-bold tracking-widest uppercase text-secondary">
            Lesson {week.n} · {formatDay(week.class_on)}
          </span>
          {isCurrent && open && <span className="font-display text-[11px] font-bold tracking-wider uppercase text-white bg-accent px-2 py-0.5 rounded-full">This week</span>}
        </span>
        <span className={`font-display text-lg tracking-wider mt-2 leading-tight ${open ? 'text-white' : 'text-secondary'}`}>{title}</span>
        {open ? (
          <ul className="mt-auto pt-3 flex flex-wrap gap-x-3 gap-y-1 font-body text-xs" aria-label="Your progress">
            <Dot done={progress.opened} label="Card" />
            <Dot done={progress.watched} label="Video" />
            <Dot done={progress.sent} label="Homework" />
          </ul>
        ) : (
          <span className="mt-auto pt-3 flex items-center gap-1.5 font-body text-xs text-secondary">
            {week.state === 'locked' && (
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            {stateLine}
          </span>
        )}
        {visit && <span className="mt-2 font-body text-xs text-secondary">Onsite visit {formatDay(visit.visit_on)}</span>}
      </Link>
    </li>
  );
}
