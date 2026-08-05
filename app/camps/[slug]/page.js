import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getCampSupabase } from '../../../lib/supabase';
import { getCampContentBySlug } from '../../../lib/camps';
import CampRegistrationForm from '../../../components/camps/CampRegistrationForm';

// Capacity/spots-remaining changes in real time as people pay — this page
// must never be statically cached, or a full camp could keep showing an
// open registration form.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const content = getCampContentBySlug(params.slug);
  if (!content) return {};

  const title = content.coHost ? `${content.name} — ${content.coHost.name} × AMSC Performance` : content.name;

  return {
    title,
    description: content.overview,
    openGraph: {
      title,
      description: content.tagline,
      images: content.heroImage ? [{ url: content.heroImage }] : undefined,
    },
  };
}

function FactPill({ label, value }) {
  return (
    <div className="bg-surface border border-white/5 rounded-lg px-4 py-3 text-center">
      <p className="text-white/40 font-body text-[11px] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white font-display font-bold text-sm tracking-wide">{value}</p>
    </div>
  );
}

function CoBrandStrip({ coHost, dark = false }) {
  if (!coHost) return null;
  return (
    <div className="flex items-center justify-center gap-6 sm:gap-10">
      <Image
        src="/images/amsc-logo-hero.png"
        alt="AMSC Performance"
        width={140}
        height={70}
        priority
        className="h-10 sm:h-12 w-auto object-contain"
      />
      <span className="text-white/20 font-display text-xl font-light">×</span>
      <Image
        src={dark ? coHost.logoDark : coHost.logoLight}
        alt={coHost.name}
        width={140}
        height={70}
        priority
        className="h-10 sm:h-12 w-auto object-contain"
      />
    </div>
  );
}

function CampFullCard() {
  return (
    <div className="bg-surface border border-white/5 rounded-xl p-8 text-center">
      <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border-2 border-white/10 mb-6">
        <svg className="w-8 h-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 2a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </span>
      <h2 className="font-display font-black text-2xl tracking-widest mb-3">REGISTRATION IS FULL</h2>
      <p className="text-secondary font-body text-sm max-w-sm mx-auto mb-6">
        All spots for this camp have been claimed. Message us and we&apos;ll let you know if a spot opens up.
      </p>
      {/* Always AMSC-branded, not co-host accented — this links to AMSC's own
          Instagram inbox, so styling it in the partner's color would misattribute
          who actually answers the message. */}
      <a
        href="https://instagram.com/amscperformance"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-accent text-white font-display font-bold text-sm tracking-wider uppercase px-8 py-3.5 rounded-full hover:bg-accent-dark transition-all duration-200"
      >
        Message Us on Instagram
      </a>
    </div>
  );
}

export default async function CampPage({ params }) {
  const { slug } = params;
  const content = getCampContentBySlug(slug);
  if (!content) notFound();

  const campSupabase = getCampSupabase();

  const { data: camp, error } = await campSupabase
    .from('camps')
    .select('id, slug, name, registration_open, capacity, age_min, age_max, starts_on, ends_on, price_kes')
    .eq('slug', slug)
    .single();

  if (error || !camp) notFound();

  const { count: paidCount, error: countError } = await campSupabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('camp_id', camp.id)
    .eq('status', 'paid');

  if (countError) {
    // Fail closed on the form rather than risk over-registering on a broken count.
    console.error('camp page: capacity count error:', countError);
  }

  const spotsRemaining = Math.max(0, camp.capacity - (paidCount || 0));
  const isFull = countError || spotsRemaining <= 0 || !camp.registration_open;
  const priceDisplay = `KES ${Number(camp.price_kes).toLocaleString()}`;
  const coHostAccent = content.coHost?.accent;

  return (
    <>
      {/* Hero */}
      <section
        className="relative min-h-[70vh] flex flex-col items-center justify-center bg-cover bg-center overflow-hidden px-6 pt-16"
        style={{ backgroundImage: `url('${content.heroImage}')`, backgroundColor: '#0a0a0a' }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative text-center max-w-3xl mx-auto py-16">
          <div className="mb-8">
            <CoBrandStrip coHost={content.coHost} />
          </div>
          <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl tracking-widest text-white mb-4">
            {content.name.toUpperCase()}
          </h1>
          <p className="text-white/70 text-lg sm:text-xl font-body mb-2">{content.tagline}</p>
          {content.coHost && (
            <p className="text-white/40 text-xs font-display uppercase tracking-[0.2em] mb-8">
              Co-hosted by {content.coHost.name} & AMSC Performance
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mt-8">
            <FactPill label="Dates" value={content.datesDisplay} />
            <FactPill label="Ages" value={content.ageRangeDisplay.split(' · ')[0]} />
            <FactPill label="Price" value={priceDisplay} />
            <FactPill
              label="Spots"
              value={isFull ? 'Full' : `${spotsRemaining} of ${camp.capacity} left`}
            />
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-16 px-6 bg-surface">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-bold text-2xl tracking-widest mb-5">OVERVIEW</h2>
          <p className="text-secondary text-base leading-relaxed font-body mb-6">{content.overview}</p>
          <p className="text-white/40 text-sm font-body">{content.venue}</p>
        </div>
      </section>

      {/* Registration */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display font-black text-3xl tracking-widest mb-3">
              {isFull ? 'REGISTRATION' : 'REGISTER NOW'}
            </h2>
            {/* Co-host section rule — the specific, restrained co-branding use
                the brand brief calls out (divider/ruled separator), rather than
                recoloring the payment CTA itself. Falls back to AMSC red when
                there's no co-host, so this works unmodified for future
                AMSC-only camps. */}
            <span
              className="block w-16 h-[3px] mx-auto mb-6"
              style={{ backgroundColor: coHostAccent || '#DC2626' }}
            />
            {!isFull && (
              <p className="text-secondary font-body text-sm">
                {content.ageRangeDisplay} — {spotsRemaining} of {camp.capacity} spots remaining.
              </p>
            )}
          </div>

          {isFull ? (
            <CampFullCard />
          ) : (
            <CampRegistrationForm campSlug={slug} content={content} priceDisplay={priceDisplay} />
          )}
        </div>
      </section>

      {/* Co-brand footer strip */}
      {content.coHost && (
        <section className="py-12 px-6 bg-surface border-t border-white/5">
          <CoBrandStrip coHost={content.coHost} dark />
        </section>
      )}

      <div className="text-center pb-12 px-6 bg-background">
        <Link
          href="/"
          className="inline-block font-display text-sm font-semibold tracking-wider text-secondary hover:text-white transition-colors"
        >
          {'←'} Back to Home
        </Link>
      </div>
    </>
  );
}
