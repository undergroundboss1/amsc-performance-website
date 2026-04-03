'use client';
import Link from 'next/link';
import AnimatedSection from '../../components/AnimatedSection';

const programs = [
  {
    slug: 'one-on-one',
    label: 'DIRECT.',
    name: 'One-on-One Coaching',
    desc: 'High-touch coaching for athletes requiring individualized oversight and precision progression.',
    price: 'Ksh 30,000',
    image: '/images/program-one-on-one.jpg',
  },
  {
    slug: 'group',
    label: 'STRUCTURED.',
    name: 'Performance Group Training',
    desc: 'Structured in-person training within a high-performance environment.',
    price: 'Ksh 15,000',
    image: '/images/program-group.jpg',
  },
  {
    slug: 'online',
    label: 'FLEXIBLE.',
    name: 'Online Performance Training',
    desc: 'Structured performance programming for athletes and driven individuals training remotely.',
    price: 'Ksh 12,000',
    image: '/images/program-online.jpg',
  },
  {
    slug: 'youth',
    label: 'DEVELOPMENTAL.',
    name: 'Youth Athletic Development',
    desc: 'Building athletic foundations for young athletes aged 10–17.',
    price: 'Ksh 10,000',
    image: '/images/program-youth.jpg',
  },
  {
    slug: 'consulting',
    label: 'INSTITUTIONAL.',
    name: 'Team & School Consulting',
    desc: 'Performance system implementation for teams and institutions.',
    price: 'Contact',
    image: '/images/program-consulting.jpg',
  },
];

export default function ProgramsPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative min-h-[70vh] flex flex-col items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/programs-hero.jpg')",
          backgroundColor: '#0a0a0a',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative text-center text-white px-6">
          <h1 className="font-black text-5xl md:text-7xl tracking-[6px] mb-6">
            TRAINING PATHWAYS
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
            Choose the training system designed for your level of performance.
          </p>
          <a
            href="#programs"
            className="inline-block border border-white/40 text-white px-10 py-4 rounded-full text-sm font-semibold hover:bg-white hover:text-text transition-all duration-200 tracking-wide"
          >
            Explore Programs
          </a>
        </div>
      </section>

      {/* Why AMSC Works */}
      <section className="py-28 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="aspect-[4/5] overflow-hidden">
              <img
                src="/images/system-results.jpg"
                alt="Training at AMSC"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><span class="text-gray-400 text-lg">AMSC Training</span></div>';
                }}
              />
            </div>
            <div>
              <span className="text-accent text-xs font-bold tracking-[3px]">WHY AMSC WORKS</span>
              <h2 className="font-bold text-3xl md:text-4xl tracking-[3px] mt-3 mb-6">A SYSTEM BUILT FOR RESULTS</h2>
              <p className="text-secondary text-base leading-relaxed mb-6">
                Every program at AMSC operates within the same performance system. We assess before we prescribe, progress with intention, and measure what matters.
              </p>
              <p className="text-secondary text-base leading-relaxed">
                The difference between pathways is the level of coaching access, oversight, and progression control — not the quality of the system.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Measure Before You Train */}
      <section className="py-28 px-6 bg-[#fafafa]">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-accent text-xs font-bold tracking-[3px]">OUR APPROACH</span>
              <h2 className="font-bold text-3xl md:text-4xl tracking-[3px] mt-3 mb-6">MEASURE BEFORE YOU TRAIN</h2>
              <p className="text-secondary text-base leading-relaxed mb-6">
                Every AMSC program begins with objective assessment. We use precision timing systems and structured movement screening to establish baseline performance data before any training prescription.
              </p>
              <p className="text-secondary text-base leading-relaxed">
                This data-driven approach ensures that every program is built on measurable standards — not assumptions. Progress is tracked, verified, and adjusted based on real output.
              </p>
            </div>
            <div className="aspect-[4/5] overflow-hidden">
              <img
                src="/images/system-measure.jpg"
                alt="Assessment equipment"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><span class="text-gray-400 text-lg">Assessment</span></div>';
                }}
              />
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Programs List */}
      <section id="programs" className="py-28 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="section-title font-black text-3xl md:text-5xl tracking-[4px] mb-4">
              OUR PROGRAMS
            </h2>
            <p className="text-secondary text-base max-w-3xl mx-auto">
              Every pathway operates within the AMSC Performance System.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-7xl mx-auto space-y-8">
          {programs.map((program, i) => (
            <AnimatedSection key={program.slug} delay={i * 0.1}>
              <div className="card bg-[#fafafa] overflow-hidden border border-gray-200 grid grid-cols-1 md:grid-cols-3">
                <div className="aspect-video md:aspect-auto overflow-hidden">
                  <img
                    src={program.image}
                    alt={program.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center min-h-[200px]"><span class="text-gray-500 text-sm font-bold tracking-widest">${program.label}</span></div>`;
                    }}
                  />
                </div>
                <div className="p-8 md:col-span-2 flex flex-col justify-center">
                  <span className="text-accent text-xs font-bold tracking-[3px]">
                    {program.label}
                  </span>
                  <h3 className="font-bold text-2xl tracking-[2px] mt-2 mb-3">{program.name}</h3>
                  <p className="text-secondary text-sm leading-relaxed mb-4">{program.desc}</p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200">
                    <p className="text-2xl font-bold text-text">
                      {program.price}
                      {program.price !== 'Contact' && (
                        <span className="text-sm font-normal text-secondary"> / month</span>
                      )}
                    </p>
                    <Link
                      href={`/programs/${program.slug}`}
                      className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark transition-all duration-200 tracking-wide"
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
      <section
        className="relative py-36 px-6 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/philosophy-banner.jpg')",
          backgroundColor: '#0a0a0a',
        }}
      >
        <div className="absolute inset-0 bg-black/65" />
        <AnimatedSection>
          <div className="relative max-w-3xl mx-auto text-center text-white">
            <h2 className="font-black text-3xl md:text-5xl tracking-[4px] mb-6">
              READY TO START?
            </h2>
            <p className="text-gray-300 text-base leading-relaxed mb-10">
              Apply now and take the first step toward structured, measurable athletic development.
            </p>
            <Link
              href="/apply"
              className="inline-block bg-accent text-white px-10 py-4 rounded-full text-sm font-semibold hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/30 tracking-wide"
            >
              Apply to Train with AMSC
            </Link>
          </div>
        </AnimatedSection>
      </section>
    </>
  );
}
