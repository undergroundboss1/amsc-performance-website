/**
 * Week release logic for the Kocha Mwenzangu hub.
 *
 * Pure functions (no I/O) so the rules can be unit-tested with node --test
 * (tests/kocha/release.test.mjs) and shared by every page that needs them.
 *
 * A week is in one of three states for a scholar:
 *   'open'   — published, release_at has passed, and not behind a closed gate.
 *              Past weeks stay open for good.
 *   'locked' — not open yet. Shown calmly ("Opens on Sat 7 Nov"), never hidden,
 *              so the 12-week map is always complete.
 *   'tbc'    — behind a gate that is switched off (Sessions 7 and 8, nutrition,
 *              until the scope is agreed). Shown as "To be confirmed" with no
 *              title or content, so nutrition is never described as part of
 *              the programme by default.
 *
 * Admin override is the data itself: publish/unpublish a week or move its
 * release_at in the admin portal.
 */

export const NAIROBI_TZ = 'Africa/Nairobi';

export function isGateOpen(gate, { nutritionEnabled }) {
  if (!gate) return true;
  if (gate === 'nutrition') return Boolean(nutritionEnabled);
  return false; // an unknown gate stays closed
}

export function weekState(week, { now, nutritionEnabled }) {
  if (!isGateOpen(week.gate, { nutritionEnabled })) return 'tbc';
  if (!week.published) return 'locked';
  if (new Date(week.release_at) > now) return 'locked';
  return 'open';
}

/**
 * When a locked week opens, or null when there is no date to promise
 * (unpublished, or behind a gate).
 */
export function opensAt(week, { now, nutritionEnabled }) {
  if (weekState(week, { now, nutritionEnabled }) !== 'locked') return null;
  if (!week.published) return null;
  return week.release_at;
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
export function currentWeekN(weeks, { now, nutritionEnabled }) {
  const today = nairobiDate(now);
  const open = weeks
    .filter((w) => weekState(w, { now, nutritionEnabled }) === 'open')
    .sort((a, b) => a.n - b.n);
  if (open.length === 0) return 1;
  const upcoming = open.find((w) => w.class_on >= today);
  return (upcoming || open[open.length - 1]).n;
}

/** Set of week numbers that are open right now. */
export function openWeekNumbers(weeks, { now, nutritionEnabled }) {
  return new Set(
    weeks.filter((w) => weekState(w, { now, nutritionEnabled }) === 'open').map((w) => w.n)
  );
}
