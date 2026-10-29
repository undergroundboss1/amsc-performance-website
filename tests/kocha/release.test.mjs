import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentWeekN, nairobiDate, opensAt, openWeekNumbers, weekState } from '../../lib/kocha/release.js';

// The seeded 12-week map: classes every Saturday from 24 Oct 2026, each week
// opening 7 days before its class at 00:00 Nairobi time (21:00 UTC).
function seededWeeks() {
  const weeks = [];
  for (let n = 1; n <= 12; n++) {
    const classOn = new Date(Date.UTC(2026, 9, 24 + 7 * (n - 1)));
    const release = new Date(classOn.getTime() - 7 * 86400000 - 3 * 3600000);
    const gated = n === 7 || n === 8;
    weeks.push({
      n,
      class_on: classOn.toISOString().slice(0, 10),
      release_at: release.toISOString(),
      published: !gated,
      gate: gated ? 'nutrition' : null,
    });
  }
  return weeks;
}

const off = { nutritionEnabled: false };
const at = (iso) => ({ ...off, now: new Date(iso) });

test('Week 1 is open from launch; Week 3 is locked until 7 days before its class', () => {
  const weeks = seededWeeks();
  const ctx = at('2026-10-26T09:00:00+03:00'); // Mon 26 Oct
  assert.equal(weekState(weeks[0], ctx), 'open');
  assert.equal(weekState(weeks[1], ctx), 'open'); // Week 2 opened Sat 24 Oct
  assert.equal(weekState(weeks[2], ctx), 'locked');
  assert.equal(opensAt(weeks[2], ctx), weeks[2].release_at);
});

test('a week opens at exactly 00:00 Nairobi time, not UTC midnight', () => {
  const week3 = seededWeeks()[2]; // opens Sat 31 Oct 00:00 EAT = Fri 30 Oct 21:00 UTC
  assert.equal(weekState(week3, at('2026-10-30T20:59:59Z')), 'locked');
  assert.equal(weekState(week3, at('2026-10-30T21:00:00Z')), 'open');
});

test('past weeks stay open for good', () => {
  const weeks = seededWeeks();
  const ctx = at('2027-03-01T12:00:00+03:00');
  assert.deepEqual([...openWeekNumbers(weeks, ctx)].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 9, 10, 11, 12]);
});

test('nutrition weeks are "to be confirmed" while the gate is off, with no date promised', () => {
  const week7 = seededWeeks()[6];
  const ctx = at('2027-01-01T12:00:00+03:00');
  assert.equal(weekState(week7, ctx), 'tbc');
  assert.equal(opensAt(week7, ctx), null);
});

test('switching the gate on alone does not open an unpublished nutrition lesson', () => {
  const week7 = seededWeeks()[6];
  const ctx = { now: new Date('2027-01-01T12:00:00+03:00'), nutritionEnabled: true };
  assert.equal(weekState(week7, ctx), 'soon');
  assert.equal(weekState({ ...week7, published: true }, ctx), 'open');
});

test('an unpublished lesson is "coming soon" with no date, whatever its unlock date', () => {
  const week = { ...seededWeeks()[0], published: false };
  const ctx = at('2026-10-26T09:00:00+03:00');
  assert.equal(weekState(week, ctx), 'soon');
  assert.equal(opensAt(week, ctx), null);
  assert.equal(weekState(week, { ...ctx, accessMode: 'open' }), 'soon');
});

test('a lesson with no PDF yet (content_ready = false) is "coming soon" even when published', () => {
  const week = { ...seededWeeks()[9], content_ready: false };
  assert.equal(weekState(week, { ...at('2027-03-01T12:00:00+03:00'), accessMode: 'open' }), 'soon');
});

test('"open" access mode opens any published lesson before its unlock date; "by_week" waits', () => {
  const week6 = seededWeeks()[5]; // unlocks Sat 21 Nov
  const early = at('2026-10-26T09:00:00+03:00');
  assert.equal(weekState(week6, { ...early, accessMode: 'by_week' }), 'locked');
  assert.equal(opensAt(week6, { ...early, accessMode: 'by_week' }), week6.release_at);
  assert.equal(weekState(week6, { ...early, accessMode: 'open' }), 'open');
  assert.equal(opensAt(week6, { ...early, accessMode: 'open' }), null);
});

test('"open" mode never opens held nutrition lessons', () => {
  const week7 = { ...seededWeeks()[6], published: true };
  assert.equal(weekState(week7, { ...at('2026-10-26T09:00:00+03:00'), accessMode: 'open' }), 'tbc');
});

test('unknown gates stay closed', () => {
  const week = { ...seededWeeks()[0], gate: 'something-new' };
  assert.equal(weekState(week, at('2026-10-26T09:00:00+03:00')), 'tbc');
});

test('"This week" is the next open class on or after today (Nairobi)', () => {
  const weeks = seededWeeks();
  assert.equal(currentWeekN(weeks, at('2026-10-20T09:00:00+03:00')), 1);
  assert.equal(currentWeekN(weeks, at('2026-10-24T18:00:00+03:00')), 1); // class day itself
  assert.equal(currentWeekN(weeks, at('2026-10-25T00:30:00+03:00')), 2); // Sunday after class
  assert.equal(currentWeekN(weeks, at('2026-10-26T09:00:00+03:00')), 2);
});

test('"This week" stays on the last open week across the gated gap and after the course', () => {
  const weeks = seededWeeks();
  // Week 6 class (28 Nov) has passed; 7 and 8 are gated; 9 opens 12 Dec.
  assert.equal(currentWeekN(weeks, at('2026-12-01T09:00:00+03:00')), 6);
  assert.equal(currentWeekN(weeks, at('2026-12-12T09:00:00+03:00')), 9);
  assert.equal(currentWeekN(weeks, at('2027-02-01T09:00:00+03:00')), 12);
});

test('nairobiDate uses Nairobi, not the server timezone', () => {
  assert.equal(nairobiDate(new Date('2026-10-30T21:30:00Z')), '2026-10-31');
});
