/**
 * Waitlist programs — copy, form options and consent wording, keyed by slug.
 *
 * Mirrors lib/programs.js and lib/camps.js: content lives here as plain data,
 * while signups live in waitlist.signups (scripts/supabase-waitlist-schema-v1.sql),
 * written only through /api/waitlist with the service-role key.
 *
 * ADDING A FUTURE PROGRAM (e.g. AMSC Off Court):
 *   1. Add an entry below with a new slug and its own copy/options.
 *   2. Add a page file at app/<path>/page.js that renders
 *      <WaitlistPage program={getWaitlistProgram('<slug>')} /> — 5 lines,
 *      copy app/offpitch/page.js.
 * That's all. BARE_ROUTES below is derived from `path`, and no schema change
 * is needed: every signup row carries its program_slug, and
 * the admin Waitlist tab lists every program defined here.
 *
 * CONSENT: `consent.version` is stored on every signup row. Bump it whenever
 * the wording changes, so past signups keep a record of what they agreed to.
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
        'A 16-week football off-season program with a brief for every week and every session. In build now. Join the waitlist.',
    },

    hero: {
      eyebrow: 'AMSC Off Pitch · In build',
      number: '16',
      headline: 'Weeks. Zero guessing.',
      lede: [
        "Sixteen weeks is the whole off-season window. Most players spend it guessing.",
        'AMSC Off Pitch tells you what every week is building, and why. It is being built now. Join the list and follow the build.',
      ],
    },

    cta: 'Join the waitlist',

    briefs: {
      eyebrow: 'Every week has a direction',
      items: [
        { label: 'Weekly Brief', body: 'Opens each week. What the week is building and why.' },
        { label: 'Daily Brief', body: 'Opens every training day. The job for today.' },
        { label: 'Weekly Debrief', body: 'Closes each week. What changed and what comes next.' },
      ],
    },

    phases: {
      eyebrow: 'Four phases',
      items: [
        { weeks: '01–02', name: 'Foundations' },
        { weeks: '03–07', name: 'Reload' },
        { weeks: '08–12', name: 'Reintegrate' },
        { weeks: '13–16', name: 'Perform' },
      ],
    },

    metrics: {
      number: 'Day 1',
      body: 'AMSC Metrics tracks every number from the first session. You see progress in numbers, not feelings.',
    },

    // Public build progress. Update `weeksBuilt` as sessions are written,
    // or set `build` to null to hide the section.
    build: {
      eyebrow: 'The build',
      weeksBuilt: 5,
      weeksTotal: 16,
      label: 'Weeks of sessions written',
      note: 'Exercise and promo video filmed. The rest is being built in public on Instagram.',
    },

    form: {
      positions: FOOTBALL_POSITIONS,
      levels: PLAYING_LEVELS,
      ageBands: AGE_BANDS,
      askInstagram: true,
      askEarlyAccess: true,
      earlyAccessLabel: 'Consider me for early access testing',
    },

    consent: {
      version: 'off-pitch-v1',
      text: 'By joining, you agree to AMSC emailing you about AMSC Off Pitch. You can leave the list at any time.',
      guardianText: 'A parent or guardian knows I am joining and agrees.',
    },

    confirmation: {
      eyebrow: 'AMSC Off Pitch · Waitlist',
      headline: "You're on the list.",
      body: 'You will hear about AMSC Off Pitch before anyone else. Until then, the build runs on Instagram.',
      earlyAccessNote: 'You asked to be considered for early access. If you are selected, we will email you.',
      followLabel: 'Follow the build',
    },
  },
};

export const INSTAGRAM_HANDLE = 'amscperformance';
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;

export function getWaitlistProgram(slug) {
  return waitlistPrograms[slug] || null;
}

export function listWaitlistPrograms() {
  return Object.values(waitlistPrograms).map(({ slug, name, path, open }) => ({ slug, name, path, open }));
}

/**
 * Routes rendered without the site navbar, footer, scroll bar and cookie
 * banner — a single-purpose landing page from an Instagram bio link should
 * have one exit: the form. See components/SiteChrome.js.
 */
export const BARE_ROUTES = Object.values(waitlistPrograms).map((p) => p.path);
