import Link from 'next/link';
import Image from 'next/image';
import { getCampSupabase } from '../../lib/supabase';
import { getCampContentBySlug } from '../../lib/camps';

// Registration status changes in real time — never statically cache this list.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Camps',
  description: 'AMSC Performance camps — multi-day athletic development and testing programs.',
};

function StatusPill({ label, tone }) {
  const tones = {
    open:   'bg-green-600/20 text-green-400 border-green-500/30',
    full:   'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
    closed: 'bg-white/5 text-white/40 border-white/10',
  };
  return (
    <span className={`inline-block text-xs font-display font-bold tracking-wider uppercase px-3 py-1 rounded-full border ${tones[tone]}`}>
      {label}
    </span>
  );
}

export default async function CampsIndexPage() {
  const campSupabase = getCampSupabase();

  const { data: camps, error } = await campSupabase
    .from('camps')
    .select('id, slug, name, capacity, registration_open, starts_on, ends_on')
    .order('starts_on', { ascending: false });

  const { data: paidRows } = await campSupabase
    .from('registrations')
    .select('camp_id')
    .eq('status', 'paid');

  const paidCounts = {};
  for (const row of paidRows || []) {
    paidCounts[row.camp_id] = (paidCounts[row.camp_id] || 0) + 1;
  }

  return (
    <section className="py-12 px-6 bg-background min-h-[80vh] pt-24 pb-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display font-black text-4xl md:text-5xl tracking-widest mb-3">CAMPS</h1>
          <p className="text-secondary font-body text-sm max-w-lg mx-auto">
            Multi-day athletic development and testing programs from AMSC Performance.
          </p>
        </div>

        {error || !camps || camps.length === 0 ? (
          <div className="text-center py-16 border border-white/5 rounded-lg bg-surface-light">
            <p className="text-secondary text-sm font-body">No camps are currently listed. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {camps.map((camp) => {
              const content = getCampContentBySlug(camp.slug);
              const paidCount = paidCounts[camp.id] || 0;
              const spotsRemaining = Math.max(0, camp.capacity - paidCount);
              const isFull = spotsRemaining <= 0;
              const isClosed = !camp.registration_open;

              let tone = 'open';
              let label = `${spotsRemaining} Spots Left`;
              if (isClosed) { tone = 'closed'; label = 'Registration Closed'; }
              else if (isFull) { tone = 'full'; label = 'Full'; }

              return (
                <Link
                  key={camp.id}
                  href={`/camps/${camp.slug}`}
                  className="flex items-center gap-4 bg-surface border border-white/5 rounded-xl p-5 hover:border-white/20 transition-colors group"
                >
                  {content?.heroImage && (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface-light">
                      <Image src={content.heroImage} alt={camp.name} fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="font-display font-bold text-lg text-white tracking-wide">{camp.name}</h2>
                      <StatusPill label={label} tone={tone} />
                    </div>
                    {content?.tagline && (
                      <p className="text-secondary text-sm font-body mb-1">{content.tagline}</p>
                    )}
                    <p className="text-white/40 text-xs font-body">{content?.datesDisplay}</p>
                  </div>
                  <svg className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
