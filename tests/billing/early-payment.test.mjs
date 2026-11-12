import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDueNow, resolvePaidThrough, getPaymentTiming } from '../../lib/billing.js';

const day = (s) => new Date(`${s}T08:00:00Z`);
// Anchored on the 14th, paid 14 Oct by M-Pesa → next due 14 Nov.
const mpesa = {
  last_paid_at: '2026-10-14T08:08:15Z',
  training_start_date: '2026-10-14T08:08:15Z',
  training_status: 'active',
  pause_credit_days: 0,
  payment_provider: 'paystack_mpesa',
};

test('pay link opens 5 days before the due date, not earlier', () => {
  assert.equal(isDueNow(mpesa, day('2026-11-12')), true);
  assert.equal(isDueNow(mpesa, day('2026-11-09')), true);
  assert.equal(isDueNow(mpesa, day('2026-11-05')), false);
});

test('card subscribers still open only at the due date', () => {
  const card = { ...mpesa, payment_provider: 'paystack' };
  assert.equal(isDueNow(card, day('2026-11-12')), false);
  assert.equal(isDueNow(card, day('2026-11-14')), true);
});

test('early payment covers the coming cycle and closes the link', () => {
  const stored = resolvePaidThrough(mpesa, day('2026-11-12'));
  const after = { ...mpesa, last_paid_at: stored };
  const t = getPaymentTiming(after, day('2026-11-12'));
  assert.equal(t.nextDue.toISOString().slice(0, 10), '2026-12-14');
  assert.equal(isDueNow(after, day('2026-11-12')), false);
  // replayed webhook doesn't undo the credit
  assert.equal(resolvePaidThrough(after, day('2026-11-12')), stored);
});

test('late payment is credited at the payment date', () => {
  const stored = resolvePaidThrough(mpesa, day('2026-11-20'));
  assert.equal(stored, day('2026-11-20').toISOString());
});

test('early payment without a start date does not lose days', () => {
  const noAnchor = { ...mpesa, training_start_date: null };
  const stored = resolvePaidThrough(noAnchor, day('2026-11-11'));
  const t = getPaymentTiming({ ...noAnchor, last_paid_at: stored }, day('2026-11-11'));
  assert.equal(t.nextDue.toISOString().slice(0, 10), '2026-12-13');
});

test('paying on the due day, before the boundary hour, still covers the new cycle', () => {
  const stored = resolvePaidThrough(mpesa, new Date('2026-11-14T06:00:00Z'));
  const t = getPaymentTiming({ ...mpesa, last_paid_at: stored }, day('2026-11-14'));
  assert.equal(t.nextDue.toISOString().slice(0, 10), '2026-12-14');
});
