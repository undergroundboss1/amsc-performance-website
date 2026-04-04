'use client';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import AnimatedSection from '../components/AnimatedSection';
import CountUp from '../components/CountUp';
import InstagramFeed from '../components/InstagramFeed';

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
  { value: 100, suffix: '+', label: 'Athletes Trained' },
  { value: 6, suffix: '', label: 'Sports' },
  { value: 6, suffix: '+', label: 'Years' },
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
      {/* Hero Section — Centered Logo */}
      <section className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
        {/* Subtle radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.06)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(17,17,17,1)_0%,_transparent_50%)]" />

        <motion.div
          className="relative z-10 text-center px-6"
          variants={heroStagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={heroChild}>
            <Image
              src="/images/amsc-logo-hero.png"
              alt="AMSC Performance"
              width={500}
              height={200}
              className="mx-auto w-[280px] md:w-[420px] lg:w-[500px] h-auto mb-8"
              priority
            />
          </motion.div>

          <motion.p
            className="font-display text-white/40 text-sm md:text-base tracking-[0.3em] uppercase mb-12"
            variants={heroChild}
          >
            Engineered Athlete Development
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={heroChild}
          >
            <Link
              href="/apply"
              className="bg-accent text-white px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/30 text-center"
            >
              Apply to Train with AMSC
            </Link>
            <Link
              href="/programs"
              className="border border-white/15 text-white/80 px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-white/5 hover:border-white/25 hover:text-white transition-all duration-200 text-center"
            >
              Explore Programs
            </Link>
          </motion.div>
        </motion.div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Stats Bar */}
      <section className="bg-surface py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {stats.map((stat, i) => (
            <AnimatedSection key={stat.label} delay={i * 0.1}>
              <div>
                <p className="font-display text-white font-black text-5xl md:text-6xl tracking-tight glow-red">
                  <CountUp end={stat.value} suffix={stat.suffix} duration={2} />
                </p>
                <p className="font-display text-secondary text-xs tracking-[0.25em] uppercase mt-3 font-medium">
                  {stat.label}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Trusted By Elite Athletes */}
      <section className="bg-background text-white py-32 px-6">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-4">
              TRUSTED BY ELITE ATHLETES
            </h2>
            <p className="text-secondary text-base max-w-2xl mx-auto mb-20 font-body">
              Athletes trained at AMSC compete at the highest levels across multiple sports.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            {athletes.map((athlete, i) => (
              <AnimatedSection key={athlete.name} delay={i * 0.08}>
                <div className="card group bg-surface-light relative">
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <Image
                      src={athlete.image}
                      alt={athlete.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-bold text-sm tracking-wider">{athlete.name}</h3>
                    <p className="text-secondary text-xs mt-1 leading-relaxed font-body">{athlete.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* THE SYSTEM */}
      <section className="py-32 px-6 bg-surface">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center mb-20">
            <h2 className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-4">
              THE SYSTEM
            </h2>
            <p className="text-secondary text-base max-w-2xl mx-auto font-body">
              A performance system built around the individual athlete.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {systemCards.map((card, i) => (
            <AnimatedSection key={card.title} delay={i * 0.15}>
              <div className="card bg-surface-light border border-white/5 rounded-lg overflow-hidden group">
                <div className="aspect-[4/3] overflow-hidden relative">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all duration-500" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-accent text-white font-display text-xs font-bold tracking-widest px-3 py-1 rounded">
                      {card.step}
                    </span>
                  </div>
                </div>
                <div className="p-8 text-center">
                  <h3 className="font-display font-black text-2xl tracking-widest mb-2">
                    {card.title}
                  </h3>
                  <p className="text-accent font-display font-semibold text-sm mb-3 tracking-wide">{card.subtitle}</p>
                  <p className="text-secondary text-sm leading-relaxed font-body">{card.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Training Philosophy Banner */}
      <section className="relative py-40 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/philosophy-banner.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/70" />
        <AnimatedSection>
          <div className="relative max-w-3xl mx-auto text-center text-white">
            <h2 className="font-display font-black text-3xl md:text-5xl tracking-widest mb-8">
              TRAINING PHILOSOPHY
            </h2>
            <p className="text-white/60 text-base leading-relaxed mb-12 max-w-2xl mx-auto font-body">
              At AMSC, we believe performance is built through patience, precision, and purpose. Every session, every rep, every phase of training is designed to move you closer to your potential — not just for the next competition, but for the long term.
            </p>
            <Link
              href="/philosophy"
              className="inline-block bg-accent text-white px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/30"
            >
              Our Training Philosophy
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Instagram Feed */}
      <InstagramFeed />

      {/* Choose Your Training Pathway */}
      <section className="py-32 px-6 bg-background">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center mb-20">
            <h2 className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-4">
              CHOOSE YOUR TRAINING PATHWAY
            </h2>
            <p className="text-secondary text-base max-w-3xl mx-auto font-body">
              Every pathway operates within the AMSC Performance System. The difference is the level of coaching access, oversight, and progression control.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-7xl mx-auto">
          {/* One-on-One - Featured */}
          <AnimatedSection delay={0.1}>
            <div className="card bg-surface-light border border-white/5 rounded-lg p-8 md:p-10 mb-8 max-w-2xl mx-auto relative overflow-visible">
              <div className="absolute -top-3 left-8">
                <span className="bg-gold text-black font-display text-xs font-bold tracking-widest px-4 py-1.5 rounded-full uppercase">
                  Recommended
                </span>
              </div>
              <span className="text-accent font-display text-xs font-bold tracking-[0.25em]">
                {programs[0].label}
              </span>
              <h3 className="font-display font-bold text-2xl tracking-widest mt-2 mb-4">{programs[0].name}</h3>
              <p className="text-secondary mb-6 text-sm leading-relaxed font-body">{programs[0].desc}</p>
              <ul className="space-y-3 mb-8">
                {programs[0].features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-secondary text-sm font-body">
                    <span className="text-accent mt-0.5 font-bold">—</span> {f}
                  </li>
                ))}
              </ul>
              <div className="border-t border-white/10 pt-6">
                <p className="font-display text-3xl font-bold text-white">
                  {programs[0].price}<span className="text-sm font-normal text-secondary"> / month</span>
                </p>
                <Link
                  href={`/apply?program=${programs[0].slug}`}
                  className="mt-4 block bg-accent text-white text-center py-4 rounded-full font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark transition-all duration-200"
                >
                  Start Your Application
                </Link>
              </div>
            </div>
          </AnimatedSection>

          {/* Group and Online */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {programs.slice(1, 3).map((program, i) => (
              <AnimatedSection key={program.slug} delay={0.2 + i * 0.1}>
                <div className="card bg-surface-light border border-white/5 rounded-lg p-8 md:p-10 h-full">
                  <span className="text-accent font-display text-xs font-bold tracking-[0.25em]">
                    {program.label}
                  </span>
                  <h3 className="font-display font-bold text-2xl tracking-widest mt-2 mb-4">{program.name}</h3>
                  <p className="text-secondary mb-6 text-sm leading-relaxed font-body">{program.desc}</p>
                  <ul className="space-y-3 mb-8">
                    {program.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-secondary text-sm font-body">
                        <span className="text-accent mt-0.5 font-bold">—</span> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-white/10 pt-6 mt-auto">
                    <p className="font-display text-3xl font-bold text-white">
                      {program.price}<span className="text-sm font-normal text-secondary"> / month</span>
                    </p>
                    <Link
                      href={`/apply?program=${program.slug}`}
                      className="mt-4 block bg-accent text-white text-center py-4 rounded-full font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark transition-all duration-200"
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
            <div className="card bg-surface-light border border-white/5 rounded-lg p-8 md:p-10 mb-8 max-w-2xl mx-auto">
              <span className="text-accent font-display text-xs font-bold tracking-[0.25em]">
                {programs[3].label}
              </span>
              <h3 className="font-display font-bold text-2xl tracking-widest mt-2 mb-4">{programs[3].name}</h3>
              <p className="text-secondary mb-6 text-sm leading-relaxed font-body">{programs[3].desc}</p>
              <ul className="space-y-3 mb-8">
                {programs[3].features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-secondary text-sm font-body">
                    <span className="text-accent mt-0.5 font-bold">—</span> {f}
                  </li>
                ))}
              </ul>
              <div className="border-t border-white/10 pt-6">
                <p className="font-display text-3xl font-bold text-white">
                  {programs[3].price}<span className="text-sm font-normal text-secondary"> / month</span>
                </p>
                <Link
                  href={`/apply?program=${programs[3].slug}`}
                  className="mt-4 block bg-accent text-white text-center py-4 rounded-full font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark transition-all duration-200"
                >
                  Start Your Application
                </Link>
              </div>
            </div>
          </AnimatedSection>

          {/* Team Consulting */}
          <AnimatedSection delay={0.4}>
            <div className="card bg-surface-light border border-white/5 rounded-lg p-8 md:p-10 max-w-xl mx-auto text-center">
              <h3 className="font-display font-bold text-2xl tracking-widest mb-4">Team & School Performance Consulting</h3>
              <p className="text-secondary mb-6 text-sm leading-relaxed font-body">
                Performance system implementation for teams and institutions.
              </p>
              <Link
                href="/apply?program=consulting"
                className="block bg-white/10 text-white text-center py-4 rounded-full font-display font-bold text-sm tracking-wider uppercase hover:bg-white/15 border border-white/10 transition-all duration-200"
              >
                Contact Us
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Ready to Elevate CTA */}
      <section className="relative py-40 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/philosophy-banner.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/70" />
        <AnimatedSection>
          <div className="relative max-w-3xl mx-auto text-center text-white">
            <h2 className="font-display font-black text-3xl md:text-5xl tracking-widest mb-8">
              READY TO ELEVATE YOUR PERFORMANCE?
            </h2>
            <p className="text-white/60 text-base leading-relaxed mb-12 max-w-2xl mx-auto font-body">
              Whether you are preparing for competition, rebuilding after injury, or laying the foundation for long-term success — AMSC provides the structure, clarity, and support required to move forward with purpose.
            </p>
            <Link
              href="/apply"
              className="inline-block bg-accent text-white px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/30"
            >
              Apply to Train with AMSC
            </Link>
          </div>
        </AnimatedSection>
      </section>
    </>
  );
}
