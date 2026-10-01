/**
 * Waitlist programs — copy, form options and consent wording, keyed by slug.
 *
 * Mirrors lib/programs.js and lib/camps.js: content lives here as plain data,
 * while signups live in waitlist.signups (scripts/supabase-waitlist-schema-v*.sql),
 * written only through /api/waitlist with the service-role key.
 *
 * ADDING A FUTURE PROGRAM (e.g. AMSC Off Court):
 *   1. Add an entry below with a new slug and its own copy/options.
 *   2. Add a page file at app/<path>/page.js that renders
 *      <WaitlistPage program={getWaitlistProgram('<slug>')} /> — copy
 *      app/offpitch/page.js.
 * No schema change is needed: every signup row carries its program_slug, and
 * the admin Waitlist tab lists every program defined here.
 *
 * CONSENT: `consent.version` is stored on every signup row. Bump it whenever
 * any consent wording changes, so each signup keeps a record of exactly
 * what they agreed to.
 */

// Shared across football-style programs; a future program can pass its own.
const FOOTBALL_POSITIONS = [
  { value: 'goalkeeper', label: 'Goalkeeper' },
  { value: 'defender', label: 'Defender' },
  { value: 'midfielder', label: 'Midfielder' },
  { value: 'forward', label: 'Forward' },
];

const PLAYING_LEVELS = [
  { value: 'professional', label: 'Professional' },
  { value: 'semi_pro', label: 'Semi-pro' },
  { value: 'academy', label: 'Academy' },
  { value: 'school_university', label: 'School / Uni' },
  { value: 'amateur', label: 'Amateur' },
];

// `minor: true` bands trigger the parent/guardian confirmation (Kenya DPA
// 2019, s.33 — processing a child's data needs a parent/guardian's consent).
const AGE_BANDS = [
  { value: 'u16', label: 'Under 16', minor: true },
  { value: '16_17', label: '16–17', minor: true },
  { value: '18_22', label: '18–22', minor: false },
  { value: '23_plus', label: '23+', minor: false },
];

export const waitlistPrograms = {
  'off-pitch': {
    slug: 'off-pitch',
    path: '/offpitch',
    name: 'AMSC Off Pitch',
    sport: 'Football',
    // Flip to false to stop taking signups without taking the page down.
    open: true,

    meta: {
      title: 'AMSC Off Pitch — Join the Waitlist',
      description:
        'A 16-week football off-season program from AMSC Performance. A brief for every week and every session. Join the waitlist.',
    },

    hero: {
      label: '16-WEEK OFF-SEASON PROGRAM',
      // Rendered as "AMSC OFF" + " PITCH" in the site's accent red.
      headline: 'AMSC OFF',
      headlineAccent: 'PITCH',
      tagline: 'Now in build',
      image: '/images/athlete-james.jpg',
    },

    stats: [
      { value: 16, suffix: '', label: 'Weeks' },
      { value: 4, suffix: '', label: 'Phases' },
      { value: 1, prefix: 'Day ', label: 'Every Number Tracked' },
    ],

    intro: {
      title: 'DIRECTION, NOT GUESSWORK',
      body:
        'AMSC Off Pitch is a 16-week off-season program built for competitive footballers. You always know what you are doing and why, and AMSC Metrics tracks every number from Day 1, so progress is measured rather than felt.',
    },

    briefs: {
      title: 'EVERY WEEK HAS A DIRECTION',
      items: [
        { step: '01', title: 'WEEKLY BRIEF', subtitle: 'Opens every week.', desc: 'What the week is building, and why it matters for your season.' },
        { step: '02', title: 'DAILY BRIEF', subtitle: 'Opens every session.', desc: 'The job for today, so every session has a purpose before you start.' },
        { step: '03', title: 'WEEKLY DEBRIEF', subtitle: 'Closes every week.', desc: 'What changed, what the numbers say, and what comes next.' },
      ],
    },

    phases: {
      title: 'FOUR PHASES',
      subtitle: 'Sixteen weeks, built in order.',
      items: [
        { weeks: 'Weeks 1–2', length: 2, name: 'Foundations' },
        { weeks: 'Weeks 3–7', length: 5, name: 'Reload' },
        { weeks: 'Weeks 8–12', length: 5, name: 'Reintegrate' },
        { weeks: 'Weeks 13–16', length: 4, name: 'Perform' },
      ],
    },

    join: {
      title: 'JOIN THE WAITLIST',
      subtitle: 'Be first to hear when AMSC Off Pitch opens.',
      cta: 'Join the Waitlist',
    },

    follow: {
      subtitle: 'AMSC Off Pitch is being built in public. Follow the journey on Instagram.',
    },

    closing: {
      title: "DON'T SPEND IT GUESSING.",
      body: 'Your next off-season is sixteen weeks long. Make every one of them count.',
      image: '/images/system-develop.jpg',
    },

    form: {
      positions: FOOTBALL_POSITIONS,
      levels: PLAYING_LEVELS,
      ageBands: AGE_BANDS,
      askInstagram: true,
      askEarlyAccess: true,
      earlyAccessLabel: 'Consider me for early access testing.',
    },

    // Explicit, unticked, separate consents (Kenya DPA 2019, ss.30, 32, 37).
    // `marketing` is required to join: the waitlist IS an email list.
    // `otherMarketing` is optional and covers other AMSC programs.
    consent: {
      version: 'off-pitch-v2',
      marketing:
        'I agree to receive emails from AMSC Performance about AMSC Off Pitch, including build updates, early access and launch news. I can unsubscribe at any time.',
      otherMarketing: 'Also email me about other AMSC Performance programs and services.',
      guardian: 'I am under 18 and a parent or guardian has agreed to me joining.',
    },

    confirmation: {
      title: "YOU'RE ON THE LIST",
      earlyAccessNote: 'You asked to be considered for early access testing. If you are selected, we will email you.',
    },

    email: {
      subject: "You're on the AMSC Off Pitch waitlist",
      intro:
        'Sixteen weeks is the entire off-season window a footballer gets. AMSC Off Pitch is built so you never spend it guessing: every week opens with a Weekly Brief, every session with a Daily Brief, and every week closes with a Weekly Debrief.',
    },
  },
};

export function getWaitlistProgram(slug) {
  return waitlistPrograms[slug] || null;
}

export function listWaitlistPrograms() {
  return Object.values(waitlistPrograms).map(({ slug, name, path, open }) => ({ slug, name, path, open }));
}
