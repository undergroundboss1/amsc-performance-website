'use client';
import Link from 'next/link';
import Image from 'next/image';
import AnimatedSection from '../../components/AnimatedSection';

const pillars = [
  {
    number: '01',
    title: 'ASSESS',
    desc: 'Every athlete begins with a clear understanding of their current capacity.',
    items: ['Movement screening', 'Strength profiling', 'Speed & power testing'],
    quote: "You can't improve what you don't measure.",
    image: '/images/system-assess.jpg',
  },
  {
    number: '02',
    title: 'DEVELOP',
    desc: 'We build the physical qualities that underpin performance.',
    items: ['Strength', 'Mobility', 'Control', 'Power'],
    quote: 'Strength is the foundation of all athletic expression.',
    image: '/images/system-develop.jpg',
  },
  {
    number: '03',
    title: 'TRANSFER',
    desc: 'We convert physical development into sport performance.',
    items: ['Speed', 'Acceleration', 'Change of direction', 'Reactivity'],
    quote: "If it doesn't transfer, it doesn't matter.",
    image: '/images/system-transfer.jpg',
  },
];

export default function PhilosophyPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-white px-6 text-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-philosophy.jpg')" }}
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/70" />

        <AnimatedSection className="relative z-10">
          <h1 className="font-display font-black text-4xl md:text-6xl leading-tight mb-6 tracking-widest drop-shadow-lg">
            TRAINING IS NOT RANDOM.{' '}<span className="block md:inline">IT&apos;S ENGINEERED.</span>
          </h1>
          <p className="text-white/60 text-base max-w-2xl mx-auto leading-relaxed font-body drop-shadow">
            At AMSC PERFORMANCE, every athlete follows a structured system designed to develop strength, improve movement, and transfer performance to sport.
          </p>
        </AnimatedSection>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface to-transparent" />
      </section>

      {/* Philosophy Statements */}
      <section className="py-32 px-6 bg-surface">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-center space-y-10">
            <div>
              <p className="font-display text-2xl md:text-3xl font-bold tracking-widest">
                WE DON&apos;T CHASE INTENSITY.
              </p>
              <p className="font-display text-2xl md:text-3xl font-bold tracking-widest">
                WE BUILD CAPACITY.
              </p>
            </div>
            <div>
              <p className="font-display text-2xl md:text-3xl font-bold tracking-widest">
                WE DON&apos;T GUESS.
              </p>
              <p className="font-display text-2xl md:text-3xl font-bold tracking-widest">
                WE ASSESS, DEVELOP, AND TRANSFER.
              </p>
            </div>
            <p className="text-secondary text-base leading-relaxed font-body">
              Because long-term performance isn&apos;t built in moments — it&apos;s built through systems.
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* The AMSC Development System */}
      <section className="py-32 px-6 bg-background">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center mb-20">
            <h2 className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-4">
              THE AMSC DEVELOPMENT SYSTEM
            </h2>
            <p className="text-secondary text-base max-w-3xl mx-auto font-body">
              Every athlete progresses through a structured system designed to build and transfer performance.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => (
            <AnimatedSection key={pillar.number} delay={i * 0.15}>
              <div className="card bg-surface-light border border-white/5 rounded-lg h-full overflow-hidden">
                <div className="aspect-[5/4] overflow-hidden relative">
                  <Image
                    src={pillar.image}
                    alt={pillar.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-accent text-white font-display text-xs font-bold tracking-widest px-3 py-1 rounded">
                      {pillar.number}
                    </span>
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="font-display font-black text-2xl tracking-widest mb-3">
                    {pillar.title}
                  </h3>
                  <p className="text-secondary text-sm leading-relaxed mb-4 font-body">{pillar.desc}</p>
                  <ul className="space-y-2 mb-6">
                    {pillar.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-secondary text-sm font-body">
                        <span className="text-accent font-bold">—</span> {item}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-white/80 font-semibold text-sm italic font-body">{pillar.quote}</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Engineered Performance Outcomes */}
      <section className="py-32 px-6 bg-surface">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-4">
              ENGINEERED PERFORMANCE OUTCOMES
            </h2>
            <p className="text-secondary text-base mb-16 font-body">
              Our system is built on measurable progress — not assumptions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'METRICS DASHBOARD', desc: 'Data visualization coming soon' },
                { title: 'PERFORMANCE TRACKING', desc: 'Data visualization coming soon' },
                { title: 'PROGRESS ANALYSIS', desc: 'Data visualization coming soon' },
              ].map((card) => (
                <div key={card.title} className="card bg-surface-light p-10 border border-white/5 rounded-lg">
                  <h3 className="font-display font-bold text-sm tracking-widest mb-2">{card.title}</h3>
                  <p className="text-secondary text-sm font-body">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* CTA */}
      <section className="relative py-40 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/philosophy-banner.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/70" />
        <AnimatedSection>
          <div className="relative max-w-3xl mx-auto text-center text-white">
            <h2 className="font-display font-black text-3xl md:text-5xl tracking-widest mb-8">
              EXPERIENCE THE SYSTEM
            </h2>
            <p className="text-white/60 text-base leading-relaxed mb-12 font-body">
              Join athletes who train with purpose, progress with intention, and perform with confidence.
            </p>
            <Link
              href="/join"
              className="inline-block bg-accent text-white px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/30"
            >
              Join AMSC
            </Link>
          </div>
        </AnimatedSection>
      </section>
    </>
  );
}
