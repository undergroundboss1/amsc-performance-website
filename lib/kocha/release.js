/**
 * Week release logic for the Kocha Mwenzangu hub.
 *
 * Pure functions (no I/O) so the rules can be unit-tested with node --test
 * (tests/kocha/release.test.mjs) and shared by every page that needs them.
 *
 * A lesson (week) is in one of four states for a scholar:
 *   'open'   — published, ready, not behind a closed gate and, in
 *              'by_week' mode, past its unlock date (release_at). Past
 *              lessons stay open for good.
 *   'locked' — 'by_week' mode only: published and ready, but its unlock
 *              date is still ahead. Shows the title and the date only.
 *   'soon'   — not published yet, or its PDF is not written yet
 *              (content_ready = false): "Coming soon", title only.
 *   'tbc'    — behind a gate that is switched off (Lessons 7 and 8,
 *              nutrition, until the scope is agreed). "To be confirmed",
 *              with no title or content, so nutrition is never described
 *              as part of the programme by default.
 *
 * accessMode is the cohort's lesson_access_mode: 'open' lets coaches open
 * any published lesson early; 'by_week' also waits for the unlock date.
 * When it is not given, 'by_week' is assumed (the stricter rule).
 *
 * Admin override is the data itself: publish/unpublish a lesson, move its
 * unlock date, or switch the access mode in the admin portal.
 */

export const NAIROBI_TZ = 'Africa/Nairobi';

export function isGateOpen(gate, { nutritionEnabled }) {
  if (!gate) return true;
  if (gate === 'nutrition') return Boolean(nutritionEnabled);
  return false; // an unknown gate stays closed
}

export function weekState(week, { now, nutritionEnabled, accessMode = 'by_week' }) {
  if (!isGateOpen(week.gate, { nutritionEnabled })) return 'tbc';
  if (!week.published || week.content_ready === false) return 'soon';
  if (accessMode !== 'open' && new Date(week.release_at) > now) return 'locked';
  return 'open';
}

/**
 * When a locked lesson opens, or null when there is no date to promise
 * (open, coming soon, or behind a gate).
 */
export function opensAt(week, ctx) {
  return weekState(week, ctx) === 'locked' ? week.release_at : null;
}

/** Today's calendar date in Nairobi, as YYYY-MM-DD. */
export function nairobiDate(now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: NAIROBI_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/**
 * The week "This week" points at: the next open week whose class is today or
 * later. After the last open class has passed it stays on that week; before
 * anything is open it points at Week 1.
 */
export function currentWeekN(weeks, ctx) {
  const { now } = ctx;
  const today = nairobiDate(now);
  const open = weeks
    .filter((w) => weekState(w, ctx) === 'open')
    .sort((a, b) => a.n - b.n);
  if (open.length === 0) return 1;
  const upcoming = open.find((w) => w.class_on >= today);
  return (upcoming || open[open.length - 1]).n;
}

/** Set of week numbers that are open right now. */
export function openWeekNumbers(weeks, ctx) {
  return new Set(weeks.filter((w) => weekState(w, ctx) === 'open').map((w) => w.n));
}
