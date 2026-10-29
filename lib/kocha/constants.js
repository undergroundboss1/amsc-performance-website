/**
 * Kocha Mwenzangu Coach Resource Hub — fixed labels and copy.
 *
 * Course content (weeks, files, videos, homework) lives in the kocha.*
 * tables so Arnold can edit it without a deploy. What lives here is the
 * small, stable vocabulary the pages need to label that content, in the
 * same spirit as lib/client-comms.js. Plain data, no imports, so it can be
 * shared by server components, client components and node --test.
 */

export const KOCHA_BASE = '/member-portal/kocha';

// The cohort the hub currently serves. One cohort today (Cluster A); the
// schema already allows more.
export const KOCHA_COHORT_SLUG = 'cluster-a';

export const METRICS_URL = 'https://amscmetrics.com';

export const COMPETENCIES = {
  C1: 'Lead a RAMP warm-up',
  C2: 'Run a readiness check',
  C3: 'Screen movement and coach landing',
  C4: 'Coach foundational strength patterns',
  C5: 'Plan simple load and conditioning',
  C6: 'Give practical fueling, hydration and recovery guidance',
  C7: 'Use tests and results against the athlete’s own baseline',
  C8: 'Prepare a team for competition',
};

export const FILE_KIND_LABELS = {
  library: 'Resource pack',
  study_card: 'Study card',
  slides: 'Slides',
  quick_card: 'Quick card',
  data_sheet: 'Data sheet',
  homework_sheet: 'Homework sheet',
  script: 'Script',
  glossary: 'Glossary',
};

// Say plainly where each file lives, so nobody has to search WhatsApp.
export const FILE_SOURCE_LABELS = {
  hosted: 'Download from this page',
  whatsapp: 'Posted in the AMSC WhatsApp group',
  external: 'Opens an outside link',
};

export const LANGUAGE_LABELS = { en: 'English', sw: 'Kiswahili' };

export const MOVEMENT_PATTERNS = [
  ['squat', 'Squat'],
  ['hinge', 'Hinge'],
  ['lunge', 'Lunge'],
  ['single-leg', 'Single-leg'],
  ['push', 'Push'],
  ['pull', 'Pull'],
  ['core', 'Core'],
  ['carry', 'Carry'],
  ['jumping-landing', 'Jumping and landing'],
  ['stopping-cod', 'Stopping and change of direction'],
  ['mobility', 'Mobility'],
  ['warm-up', 'Warm-up'],
  ['testing', 'Testing'],
  ['energy-systems', 'Energy systems'],
  ['nutrition', 'Nutrition'],
  ['hydration', 'Hydration'],
  ['sleep', 'Sleep'],
  ['return-to-play', 'Return to play'],
];

export const PATTERN_LABELS = Object.fromEntries(MOVEMENT_PATTERNS);

// The three steps of the weekly checklist, in order.
export const WEEK_STEPS = [
  { key: 'download', label: 'Download', hint: 'Get this week’s files.' },
  { key: 'watch', label: 'Watch', hint: 'Watch at least one video.' },
  { key: 'submit', label: 'Submit homework', hint: 'Send this week’s homework.' },
];

export const PROGRESS_STEPS = ['download', 'watch', 'submit', 'class_live', 'class_recording'];

export const VIDEO_DISCLAIMER =
  'Videos are made by outside creators and are for learning only. Some show adult lifters, or foods and ' +
  'equipment from other countries. If a video disagrees with AMSC’s advice for your athletes, follow AMSC ' +
  'and ask in class.';

export const CONSENT_REMINDER =
  'Use athlete codes, or first names only if guardian consent is confirmed. Only send photos or video of ' +
  'athletes if you have their guardian’s consent.';

export const LOW_DATA_TIP = 'Files show their size before you download. Download on Wi-Fi when you can.';
