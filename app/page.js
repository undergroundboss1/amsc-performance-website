'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedSection from '../components/AnimatedSection';
import CountUp from '../components/CountUp';

const athletes = [
  { name: 'Angela Wachira', desc: 'Midfielder · Mulligan Division 1 NCAA Soccer', image: '/images/athlete-angela.jpg' },
  { name: 'Njoroge Kibugu', desc: 'Pro Golfer · Sunshine Development Tour', image: '/images/athlete-njoroge.jpg' },
  { name: 'Mutahi Kibugu', desc: 'Pro Golfer · Sunshine Development Tour', image: '/images/athlete-mutahi.jpg' },
  { name: 'Derrick Ogechi', desc: 'Nairobi City Thunder · Basketball Africa League', image: '/images/athlete-derrick.jpg' },
  { name: 'James Gachago', desc: 'Midfielder · Kenya National Team · Viimsi JK', image: '/images/athlete-james.jpg' },
  { name: 'Albert Odero', desc: 'Guard · Kenya National Team · Nairobi City Thunder', image: '/images/athlete-albert.jpg' },
  { name: 'Mohammed Bajaber', desc: 'Forward · Kenya National Team · Simba SC', image: '/images/athlete-mohammed.jpg' },
  { name: 'Austin Omondi', desc: 'NJCAA Division I · McLennan', image: '/images/athlete-austin.jpg' },
];

const systemCards = [
  {
    step: '01',
    title: 'ASSESS',
    subtitle: 'Diagnose before we prescribe.',
    desc: 'Movement screening. Force profiling. Asymmetry mapping. We establish your baseline with data — not assumptions.',
    image: '/images/system-assess.jpg',
  },
  {
    step: '02',
    title: 'DEVELOP',
    subtitle: 'Every phase has purpose.',
    desc: 'From foundation to force to performance expression. Structured progression through periodized training blocks.',
    image: '/images/system-develop.jpg',
  },
  {
    step: '03',
    title: 'TRANSFER',
    subtitle: 'Data guides decisions.',
    desc: 'Speed metrics. Workload control. Objective benchmarks. If it doesn\'t transfer to sport, it doesn\'t matter.',
    image: '/images/system-transfer.jpg',
  },
];

const stats = [
  { value: 50, suffix: '+', label: 'Athletes Trained' },
  { value: 6, suffix: '', label: 'Sports' },
  { value: 4, suffix: '+', label: 'Years' },
  { value: 100, suffix: '%', label: 'Data-Driven' },
];

const programs = [
  {
    label: 'DIRECT.',
    name: 'One-on-One Coaching',
    desc: 'High-touch coaching for athletes requiring individualized oversight and precision progression.',
    features: [
      'Fully customized training programs.',
      'Direct coach access and accountability.',
      'Weekly performance reviews and adjustments.',
      'Priority scheduling and session flexibility.',
    ],
    price: 'Ksh 30,000',
    slug: 'one-on-one',
    featured: true,
  },
  {
    label: 'STRUCTURED.',
    name: 'Performance Group Training',
    desc: 'Structured in-person training within a high-performance environment.',
    features: [
      'Periodized training cycles built for long-term development.',
      'Movement efficiency and force production progression.',
      'Structured performance benchmarks.',
      'Professional training environment with coaching oversight.',
    ],
    price: 'Ksh 15,000',
    slug: 'group',
  },
  {
    label: 'FLEXIBLE.',
    name: 'Online Performance Training',
    desc: 'Structured performance programming for athletes and driven individuals training remotely.',
    features: [
      'Monthly structured training plans.',
      'Video-guided exercise standards.',
      'Progressive overload and capacity tracking.',
      'Built for independent execution with system accountability.',
    ],
    price: 'Ksh 12,000',
    slug: 'online',
  },
  {
    label: 'DEVELOPMENTAL.',
    name: 'Youth Athletic Development',
    desc: 'Building athletic foundations for young athletes aged 10–17.',
    features: [
      'Age-appropriate strength and movement training.',
      'Speed and coordination development.',
      'Injury prevention through proper movement mechanics.',
      'Long-term athletic development pathway.',
    ],
    price: 'Ksh 10,000',
    slug: 'youth',
  },
];

const heroStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const heroChild = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen grid grid-cols-1 md:grid-cols-2">
        {/* Left — Branding */}
        <div className="bg-[#1a1a1a] flex flex-col justify-center px-8 md:px-16 py-24 md:py-0 order-2 md:order-1">
          <motion.div
            className="max-w-lg"
            variants={heroStagger}
            initial="hidden"
            animate="visible"
          >
            <motion.img
              src="/images/amsc-logo-hero.png"
              alt="AMSC Performance"
              className="w-[260px] md:w-[380px] mb-6"
              variants={heroChild}
            />
            <motion.p
              className="text-white/50 text-sm md:text-base tracking-[0.2em] uppercase mb-10"
              variants={heroChild}
            >
              Engineered Athlete Development
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              variants={heroChild}
            >
              <Link
                href="/apply"
                className="bg-accent text-white px-10 py-4 rounded-full text-sm font-semibold hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/30 tracking-wide text-center"
              >
                Apply to Train with AMSC
              </Link>
              <Link
                href="/programs"
                className="border border-white/20 text-white px-10 py-4 rounded-full text-sm font-semibold hover:bg-white hover:text-text transition-all duration-200 tracking-wide text-center"
              >
                Explore Programs
              </Link>
            </motion.div>
          </motion.div>
        </div>
        {/* Right — Image */}
        <div
          className="relative min-h-[50vh] md:min-h-screen order-1 md:order-2"
          style={{
            backgroundImage: "url('/images/hero-athlete.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundColor: '#0a0a0a',
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#111] py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <AnimatedSection key={stat.label} delay={i * 0.1}>
              <div>
                <p className="text-white font-black text-4xl md:text-5xl tracking-tight">
                  <CountUp end={stat.value} suffix={stat.suffix} duration={2} />
                </p>
                <p className="text-gray-500 text-xs tracking-[3px] uppercase mt-2">{stat.label}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Trusted By Elite Athletes */}
      <section className="bg-[#0a0a0a] text-white py-28 px-6">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="section-title font-black text-3xl md:text-5xl tracking-[4px] mb-4">
              TRUSTED BY ELITE ATHLETES
            </h2>
            <p className="text-gray-500 text-base max-w-2xl mx-auto mb-16">
              Athletes trained at AMSC compete at the highest levels across multiple sports.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px]">
            {athletes.map((athlete, i) => (
              <AnimatedSection key={athlete.name} delay={i * 0.08}>
                <div className="card group bg-[#0a0a0a] cursor-pointer">
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={athlete.image}
                      alt={athlete.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center"><span class="text-gray-600 text-4xl font-black">${athlete.name.split(' ').map(n => n[0]).join('')}</span></div>`;
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm tracking-wide">{athlete.name}</h3>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">{athlete.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* THE SYSTEM */}
      <section className="py-28 px-6 bg-[#fafafa]">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="section-title font-black text-3xl md:text-5xl tracking-[4px] mb-4">
              THE SYSTEM
            </h2>
            <p className="text-secondary text-base max-w-2xl mx-auto">
              A performance system built around the individual athlete.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {systemCards.map((card, i) => (
            <AnimatedSection key={card.title} delay={i * 0.15}>
              <div className="card bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><span class="text-gray-400 text-6xl font-black">${card.step}</span></div>`;
                    }}
                  />
                </div>
                <div className="p-8 text-center">
                  <span className="text-accent text-xs font-bold tracking-[3px]">{card.step}</span>
                  <h3 className="font-black text-xl tracking-[3px] mt-2 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-accent font-medium text-sm mb-3">{card.subtitle}</p>
                  <p className="text-secondary text-sm leading-relaxed">{card.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Training Philosophy Banner */}
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
              TRAINING PHILOSOPHY
            </h2>
            <p className="text-gray-300 text-base leading-relaxed mb-10 max-w-2xl mx-auto">
              At AMSC, we believe performance is built through patience, precision, and purpose. Every session, every rep, every phase of training is designed to move you closer to your potential — not just for the next competition, but for the long term.
            </p>
            <Link
              href="/philosophy"
              className="inline-block bg-accent text-white px-10 py-4 rounded-full text-sm font-semibold hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/30 tracking-wide"
            >
              Our Training Philosophy
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Choose Your Training Pathway */}
      <section className="py-28 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="section-title font-black text-3xl md:text-5xl tracking-[4px] mb-4">
              CHOOSE YOUR TRAINING PATHWAY
            </h2>
            <p className="text-secondary text-base max-w-3xl mx-auto">
              Every pathway operates within the AMSC Performance System. The difference is the level of coaching access, oversight, and progression control.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-7xl mx-auto">
          {/* One-on-One - Featured */}
          <AnimatedSection delay={0.1}>
            <div className="card bg-[#fafafa] border-t-[3px] border-t-accent border border-gray-200 p-8 md:p-10 mb-8 max-w-2xl mx-auto">
              <span className="text-accent text-xs font-bold tracking-[3px]">
                {programs[0].label}
              </span>
              <h3 className="font-bold text-2xl tracking-[2px] mt-2 mb-4">{programs[0].name}</h3>
              <p className="text-secondary mb-6 text-sm leading-relaxed">{programs[0].desc}</p>
              <ul className="space-y-3 mb-8">
                {programs[0].features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-secondary text-sm">
                    <span className="text-accent mt-0.5 font-bold">—</span> {f}
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-200 pt-6">
                <p className="text-3xl font-bold text-text">
                  {programs[0].price}<span className="text-sm font-normal text-secondary"> / month</span>
                </p>
                <Link
                  href={`/apply?program=${programs[0].slug}`}
                  className="mt-4 block bg-accent text-white text-center py-4 rounded-full font-semibold text-sm hover:bg-accent-dark transition-all duration-200 tracking-wide"
                >
                  Start Your Application
                </Link>
              </div>
            </div>
          </AnimatedSection>

          {/* Group and Online */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {programs.slice(1, 3).map((program, i) => (
              <AnimatedSection key={program.slug} delay={0.2 + i * 0.1}>
                <div className="card bg-[#fafafa] border border-gray-200 p-8 md:p-10 h-full">
                  <span className="text-accent text-xs font-bold tracking-[3px]">
                    {program.label}
                  </span>
                  <h3 className="font-bold text-2xl tracking-[2px] mt-2 mb-4">{program.name}</h3>
                  <p className="text-secondary mb-6 text-sm leading-relaxed">{program.desc}</p>
                  <ul className="space-y-3 mb-8">
                    {program.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-secondary text-sm">
                        <span className="text-accent mt-0.5 font-bold">—</span> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-gray-200 pt-6 mt-auto">
                    <p className="text-3xl font-bold text-text">
                      {program.price}<span className="text-sm font-normal text-secondary"> / month</span>
                    </p>
                    <Link
                      href={`/apply?program=${program.slug}`}
                      className="mt-4 block bg-accent text-white text-center py-4 rounded-full font-semibold text-sm hover:bg-accent-dark transition-all duration-200 tracking-wide"
                    >
                      Start Your Application
                    </Link>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Youth */}
          <AnimatedSection delay={0.3}>
            <div className="card bg-[#fafafa] border border-gray-200 p-8 md:p-10 mb-8 max-w-2xl mx-auto">
              <span className="text-accent text-xs font-bold tracking-[3px]">
                {programs[3].label}
              </span>
              <h3 className="font-bold text-2xl tracking-[2px] mt-2 mb-4">{programs[3].name}</h3>
              <p className="text-secondary mb-6 text-sm leading-relaxed">{programs[3].desc}</p>
              <ul className="space-y-3 mb-8">
                {programs[3].features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-secondary text-sm">
                    <span className="text-accent mt-0.5 font-bold">—</span> {f}
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-200 pt-6">
                <p className="text-3xl font-bold text-text">
                  {programs[3].price}<span className="text-sm font-normal text-secondary"> / month</span>
                </p>
                <Link
                  href={`/apply?program=${programs[3].slug}`}
                  className="mt-4 block bg-accent text-white text-center py-4 rounded-full font-semibold text-sm hover:bg-accent-dark transition-all duration-200 tracking-wide"
                >
                  Start Your Application
                </Link>
              </div>
            </div>
          </AnimatedSection>

          {/* Team Consulting */}
          <AnimatedSection delay={0.4}>
            <div className="card bg-[#fafafa] border border-gray-200 p-8 md:p-10 max-w-xl mx-auto text-center">
              <h3 className="font-bold text-2xl tracking-[2px] mb-4">Team & School Performance Consulting</h3>
              <p className="text-secondary mb-6 text-sm leading-relaxed">
                Performance system implementation for teams and institutions.
              </p>
              <Link
                href="/apply?program=consulting"
                className="block bg-accent text-white text-center py-4 rounded-full font-semibold text-sm hover:bg-accent-dark transition-all duration-200 tracking-wide"
              >
                Contact Us
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Ready to Elevate CTA */}
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
              READY TO ELEVATE YOUR PERFORMANCE?
            </h2>
            <p className="text-gray-300 text-base leading-relaxed mb-10 max-w-2xl mx-auto">
              Whether you are preparing for competition, rebuilding after injury, or laying the foundation for long-term success — AMSC provides the structure, clarity, and support required to move forward with purpose.
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
