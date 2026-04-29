'use client';
import Link from 'next/link';
import Image from 'next/image';
import AnimatedSection from '../../components/AnimatedSection';

const programs = [
  {
    slug: 'one-on-one',
    label: 'DIRECT.',
    name: 'One-on-One Coaching',
    desc: 'High-touch coaching for athletes requiring individualized oversight and precision progression.',
    price: 'Ksh 30,000',
    image: '/images/program-one-on-one.jpg',
    imagePosition: 'object-center',
  },
  {
    slug: 'group',
    label: 'STRUCTURED.',
    name: 'Performance Group Training',
    desc: 'Structured in-person training within a high-performance environment.',
    price: 'Ksh 15,000',
    image: '/images/program-group.jpg',
    imagePosition: 'object-center',
  },
  {
    slug: 'online',
    label: 'FLEXIBLE.',
    name: 'Online Performance Training',
    desc: 'Structured performance programming for athletes and driven individuals training remotely.',
    price: 'Ksh 12,000',
    image: '/images/program-online.jpg',
    imagePosition: 'object-[center_25%]',
  },
  {
    slug: 'youth',
    label: 'DEVELOPMENTAL.',
    name: 'Youth Athletic Development',
    desc: 'Building athletic foundations for young athletes aged 10–17.',
    price: 'Ksh 10,000',
    image: '/images/youth-athlete-lunge.jpg',
    imagePosition: 'object-center',
  },
  {
    slug: 'consulting',
    label: 'INSTITUTIONAL.',
    name: 'Team & School Consulting',
    desc: 'Performance system implementation for teams and institutions.',
    price: 'Contact',
    image: '/images/program-consulting.jpg',
    imagePosition: 'object-center',
  },
];

export default function ProgramsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/programs-hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative text-center text-white px-6">
          <h1 className="font-display font-black text-5xl md:text-7xl tracking-widest mb-6">
            TRAINING PATHWAYS
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8 font-body">
            Choose the training system designed for your level of performance.
          </p>
          <a
            href="#programs"
            className="inline-block border border-white/20 text-white px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-white/5 hover:border-white/30 transition-all duration-200"
          >
            Explore Programs
          </a>
        </div>
      </section>

      {/* Why AMSC Works */}
      <section className="py-32 px-6 bg-surface">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="aspect-[4/5] overflow-hidden rounded-lg relative">
              <Image
                src="/images/system-results.jpg"
                alt="Training at AMSC"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div>
              <span className="text-accent font-display text-xs font-bold tracking-[0.25em]">WHY AMSC WORKS</span>
              <h2 className="font-display font-bold text-3xl md:text-4xl tracking-widest mt-3 mb-6">A SYSTEM BUILT FOR RESULTS</h2>
              <p className="text-secondary text-base leading-relaxed mb-6 font-body">
                Every program at AMSC operates within the same performance system. We assess before we prescribe, progress with intention, and measure what matters.
              </p>
              <p className="text-secondary text-base leading-relaxed font-body">
                The difference between pathways is the level of coaching access, oversight, and progression control — not the quality of the system.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Measure Before You Train */}
      <section className="py-32 px-6 bg-background">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-accent font-display text-xs font-bold tracking-[0.25em]">OUR APPROACH</span>
              <h2 className="font-display font-bold text-3xl md:text-4xl tracking-widest mt-3 mb-6">MEASURE BEFORE YOU TRAIN</h2>
              <p className="text-secondary text-base leading-relaxed mb-6 font-body">
                Every AMSC program begins with objective assessment. We use precision timing systems and structured movement screening to establish baseline performance data before any training prescription.
              </p>
              <p className="text-secondary text-base leading-relaxed font-body">
                This data-driven approach ensures that every program is built on measurable standards — not assumptions. Progress is tracked, verified, and adjusted based on real output.
              </p>
            </div>
            <div className="aspect-[4/5] overflow-hidden rounded-lg relative">
              <Image
                src="/images/system-measure.jpg"
                alt="Assessment equipment"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-bottom"
              />
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Programs List */}
      <section id="programs" className="py-32 px-6 bg-surface">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center mb-20">
            <h2 className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-4">
              OUR PROGRAMS
            </h2>
            <p className="text-secondary text-base max-w-3xl mx-auto font-body">
              Every pathway operates within the AMSC Performance System.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-7xl mx-auto space-y-6">
          {programs.map((program, i) => (
            <AnimatedSection key={program.slug} delay={i * 0.1}>
              <div className="card bg-surface-light border border-white/5 rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-3">
                <div className="aspect-video md:aspect-auto overflow-hidden relative min-h-[200px]">
                  <Image
                    src={program.image}
                    alt={program.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className={`object-cover ${program.imagePosition}`}
                  />
                </div>
                <div className="p-8 md:col-span-2 flex flex-col justify-center">
                  <span className="text-accent font-display text-xs font-bold tracking-[0.25em]">
                    {program.label}
                  </span>
                  <h3 className="font-display font-bold text-2xl tracking-widest mt-2 mb-3">{program.name}</h3>
                  <p className="text-secondary text-sm leading-relaxed mb-4 font-body">{program.desc}</p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                    <p className="font-display text-2xl font-bold text-white">
                      {program.price}
                      {program.price !== 'Contact' && (
                        <span className="text-sm font-normal text-secondary"> / month</span>
                      )}
                    </p>
                    <Link
                      href={`/programs/${program.slug}`}
                      className="bg-accent text-white px-6 py-3 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-accent-dark transition-all duration-200"
                    >
                      Learn More
                    </Link>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
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
              READY TO START?
            </h2>
            <p className="text-white/60 text-base leading-relaxed mb-12 font-body">
              Apply now and take the first step toward structured, measurable athletic development.
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
