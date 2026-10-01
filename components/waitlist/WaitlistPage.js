'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import AnimatedSection from '../AnimatedSection';
import ScrollReveal from '../ScrollReveal';
import TextReveal from '../TextReveal';
import CountUp from '../CountUp';
import InstagramFeed from '../InstagramFeed';
import WaitlistForm from './WaitlistForm';
import { business } from '../../lib/business';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Shared waitlist landing page — every program in lib/waitlists.js renders
 * through this one component, so a future program is a data entry, not a
 * new page design.
 *
 * Built from the same pieces and patterns as the homepage (app/page.js):
 * parallax photo hero with a staggered Framer Motion entrance, CountUp stats
 * bar, TextReveal section titles, ScrollReveal card grids, the Instagram feed
 * section and a photo CTA banner.
 */

const EASE = [0.16, 1, 0.3, 1];

const heroStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16, delayChildren: 0.2 } },
};

const heroChild = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

function scrollToJoin(e) {
  const el = document.getElementById('join');
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const primaryBtn =
  'inline-block bg-accent text-white px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase ' +
  'hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/30 hover:-translate-y-0.5 ' +
  'active:translate-y-0 active:scale-[0.98] text-center';

const outlineBtn =
  'inline-block border border-white/25 text-white/90 px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase ' +
  'hover:bg-white/10 hover:border-white/40 hover:text-white transition-all duration-200 hover:-translate-y-0.5 ' +
  'active:translate-y-0 active:scale-[0.98] text-center backdrop-blur-sm';

function PhaseTimeline({ items }) {
  const reduce = useReducedMotion();
  const total = items.reduce((n, p) => n + p.length, 0);

  return (
    <div>
      {/* One bar, sixteen weeks, split by phase length */}
      <div className="flex gap-1 h-3 mb-10" role="img" aria-label={items.map((p) => `${p.name}: ${p.weeks}`).join(', ')}>
        {items.map((p, i) => (
          <div key={p.name} className="h-full bg-white/5 rounded-full overflow-hidden" style={{ flexGrow: p.length, flexBasis: 0 }}>
            <motion.div
              className="h-full bg-accent rounded-full origin-left"
              style={{ opacity: 0.55 + (0.45 * (i + 1)) / items.length }}
              initial={{ scaleX: reduce ? 1 : 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.2 + i * 0.35, ease: EASE }}
            />
          </div>
        ))}
      </div>

      <ScrollReveal className="grid grid-cols-2 md:grid-cols-4 gap-4" stagger={0.1}>
        {items.map((p, i) => (
          <div key={p.name} className="sr-item card bg-surface-light border border-white/5 rounded-lg p-6 group">
            <span className="text-accent font-display text-xs font-bold tracking-[0.25em] uppercase">{p.weeks}</span>
            <h3 className="font-display font-black text-xl md:text-2xl tracking-widest mt-3 mb-2 group-hover:text-white transition-colors">
              {p.name.toUpperCase()}
            </h3>
            <p className="text-secondary text-xs font-body">
              Phase {i + 1} · {p.length} of {total} weeks
            </p>
          </div>
        ))}
      </ScrollReveal>
    </div>
  );
}

export default function WaitlistPage({ program }) {
  const heroRef = useRef(null);
  const heroBgRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const { hero, stats, intro, briefs, phases, join, follow, closing } = program;

  // Parallax: hero background drifts on scroll (same as the homepage hero)
  useGSAP(
    () => {
      if (shouldReduceMotion) return;
      gsap.to(heroBgRef.current, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 1 },
      });
    },
    { scope: heroRef }
  );

  return (
    <>
      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        <div
          ref={heroBgRef}
          className="absolute inset-x-0 -top-[8%] -bottom-[8%] bg-cover bg-center bg-no-repeat will-change-transform"
          style={{ backgroundImage: `url('${hero.image}')` }}
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(196,30,58,0.08)_0%,_transparent_70%)]" />

        <motion.div
          className="relative z-10 text-center px-6 pt-20 max-w-4xl"
          variants={heroStagger}
          initial="hidden"
          animate="visible"
        >
          {hero.label && (
            <motion.div variants={heroChild} className="mb-8">
              <span className="inline-block text-accent font-display text-xs font-bold tracking-[0.25em] bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                {hero.label}
              </span>
            </motion.div>
          )}

          {hero.logo ? (
            <motion.h1 variants={heroChild} className="mb-6">
              <Image
                src={hero.logo.src}
                alt={hero.headline}
                width={hero.logo.width}
                height={hero.logo.height}
                priority
                unoptimized
                className="mx-auto w-[300px] sm:w-[420px] md:w-[560px] h-auto drop-shadow-lg"
              />
            </motion.h1>
          ) : (
            <motion.h1
              variants={heroChild}
              className="font-display font-black text-5xl sm:text-6xl md:text-8xl tracking-widest text-white mb-6 drop-shadow-lg"
            >
              {hero.headline}
            </motion.h1>
          )}

          {hero.lede && (
            <motion.p variants={heroChild} className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto font-body mb-4">
              {hero.lede}
            </motion.p>
          )}

          <motion.p variants={heroChild} className="font-body text-white/40 text-xs md:text-sm tracking-widest uppercase mb-10">
            {hero.tagline}
          </motion.p>

          <motion.div variants={heroChild} className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#join" onClick={scrollToJoin} className={primaryBtn}>
              {join.cta}
            </a>
            <a href={business.instagram} target="_blank" rel="noopener noreferrer" className={outlineBtn}>
              Follow the Journey
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          aria-hidden="true"
        >
          <motion.div
            className="w-[1px] h-10 bg-gradient-to-b from-white/40 to-transparent"
            animate={{ scaleY: [0, 1, 0], originY: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-surface py-16 md:py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 md:gap-10 text-center">
          {stats.map((stat, i) => (
            <AnimatedSection key={stat.label} delay={i * 0.1}>
              <p className="font-display text-white font-black text-4xl sm:text-5xl md:text-6xl tracking-tight glow-red">
                <CountUp end={stat.value} prefix={stat.prefix || ''} suffix={stat.suffix || ''} duration={stat.value > 1 ? 1.6 : 0.6} />
              </p>
              <p className="font-display text-secondary text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] uppercase mt-3 font-medium">
                {stat.label}
              </p>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── Intro ── */}
      <section className="bg-background py-24 md:py-32 px-6">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-center">
            <TextReveal
              text={intro.title}
              className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-6"
            />
            <p className="text-secondary text-base md:text-lg leading-relaxed font-body">{intro.body}</p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── Briefs ── */}
      <section className="py-24 md:py-32 px-6 bg-surface">
        <AnimatedSection>
          <div className="max-w-7xl mx-auto text-center mb-16">
            <TextReveal
              text={briefs.title}
              className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-4"
            />
          </div>
        </AnimatedSection>

        <ScrollReveal className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6" stagger={0.15}>
          {briefs.items.map((b) => (
            <div key={b.title} className="sr-item card bg-surface-light border border-white/5 rounded-lg p-8 text-center group">
              <span className="inline-block bg-accent text-white font-display text-xs font-bold tracking-widest px-3 py-1 rounded mb-6 transition-transform duration-300 group-hover:scale-110">
                {b.step}
              </span>
              <h3 className="font-display font-black text-2xl tracking-widest mb-2">{b.title}</h3>
              <p className="text-accent font-display font-semibold text-sm mb-3 tracking-wide">{b.subtitle}</p>
              <p className="text-secondary text-sm leading-relaxed font-body">{b.desc}</p>
            </div>
          ))}
        </ScrollReveal>
      </section>

      {/* ── Phases ── */}
      <section className="py-24 md:py-32 px-6 bg-background">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto text-center mb-16">
            <TextReveal
              text={phases.title}
              className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-4"
            />
            <p className="text-secondary text-base max-w-2xl mx-auto font-body">{phases.subtitle}</p>
          </div>
        </AnimatedSection>
        <div className="max-w-5xl mx-auto">
          <PhaseTimeline items={phases.items} />
        </div>
      </section>

      {/* ── Join ── */}
      <section id="join" className="py-24 md:py-32 px-6 bg-surface scroll-mt-16">
        <div className="max-w-xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-10">
              <TextReveal
                text={join.title}
                className="section-title font-display font-black text-3xl md:text-5xl tracking-widest mb-4"
              />
              <p className="text-secondary font-body text-base">{join.subtitle}</p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <WaitlistForm program={program} />
          </AnimatedSection>
        </div>
      </section>

      {/* ── Follow the Journey (same section as the homepage) ── */}
      <InstagramFeed subtitle={follow.subtitle} />

      {/* ── Closing CTA ── */}
      <section className="relative py-32 md:py-40 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${closing.image}')` }} />
        <div className="absolute inset-0 bg-black/70" />
        <AnimatedSection>
          <div className="relative max-w-3xl mx-auto text-center text-white">
            <TextReveal text={closing.title} className="font-display font-black text-3xl md:text-5xl tracking-widest mb-8" />
            <p className="text-white/60 text-base leading-relaxed mb-12 max-w-2xl mx-auto font-body">{closing.body}</p>
            <a href="#join" onClick={scrollToJoin} className={primaryBtn}>
              {join.cta}
            </a>
          </div>
        </AnimatedSection>
      </section>
    </>
  );
}
