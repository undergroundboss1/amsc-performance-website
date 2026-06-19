/**
 * lib/billing.js — canonical billing-cycle math.
 *
 * Single source of truth for "when is this client next due". Used by the admin
 * dashboard, the payment-reminder cron, the payment link verification, and the
 * payment-init routes so they all agree on the same due date.
 *
 * Pure functions — no DB calls — so they run in both client and server contexts.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compute the billing timing for a client.
 *
 * The due date is anchored to how far the client's payments actually cover them,
 * NOT to the current date — so a member who stops paying correctly shows as
 * overdue (the cycle does not silently roll forward past today).
 *
 * Anchoring:
 *   - If training_start_date is set, the cycle is anchored to it and advances by
 *     CALENDAR MONTHS, so the due date always lands on the same day-of-month as
 *     the start (e.g. start Oct 1, last paid Jun 15 → next due Jul 1). This also
 *     factors in days trained before the first payment.
 *   - Otherwise it falls back to last_paid_at + 30 days (a single cycle).
 *
 * nextDue = the first cycle boundary strictly AFTER the period the client has
 * paid through (their credit-adjusted last_paid_at, or the start date if they
 * have a start date but have never paid).
 *
 * Carry-over credit: pause_credit_days shifts last_paid_at forward, extending the
 * current billing window by that many unused days.
 *
 * @returns {null
 *   | { paused: true, inactiveSince: string|null }
 *   | { lastPaid, nextDue, daysUntilDue, daysOverdue, isAutoRenew, cycleAnchor, usingStartDate }}
 *   Returns null when there's nothing to bill (no payment and no start date).
 */
export function getPaymentTiming(client, now = new Date()) {
  // Paused clients: suppress the billing clock entirely
  if (client.training_status === 'inactive') {
    return { paused: true, inactiveSince: client.inactive_since };
  }

  if (!client.last_paid_at && !client.training_start_date) return null;

  // Factor in carry-over credit days: shift last_paid_at forward so the billing
  // window is extended by the number of unused days credited from a previous pause.
  const rawLastPaid = client.last_paid_at ? new Date(client.last_paid_at) : null;
  const creditMs = (client.pause_credit_days || 0) * MS_PER_DAY;
  const lastPaid = rawLastPaid ? new Date(rawLastPaid.getTime() + creditMs) : null;
  const isAutoRenew = client.payment_provider === 'paystack'; // card — Paystack handles renewals

  const usingStartDate = !!client.training_start_date;
  const cycleAnchor = usingStartDate ? new Date(client.training_start_date) : lastPaid;

  // The point their payments cover them through. If they have a start date but
  // have never paid, they owe from the start date itself.
  const coveredThrough = lastPaid || cycleAnchor;

  let nextDue;
  if (usingStartDate) {
    // First monthly anchor boundary strictly after coveredThrough.
    let m =
      (coveredThrough.getFullYear() - cycleAnchor.getFullYear()) * 12 +
      (coveredThrough.getMonth() - cycleAnchor.getMonth());
    nextDue = new Date(cycleAnchor);
    nextDue.setMonth(nextDue.getMonth() + m);
    if (nextDue <= coveredThrough) {
      nextDue = new Date(cycleAnchor);
      nextDue.setMonth(nextDue.getMonth() + m + 1);
    }
  } else {
    // Fallback: one 30-day cycle from the last payment.
    nextDue = new Date(coveredThrough.getTime() + 30 * MS_PER_DAY);
  }

  const daysUntilDue = Math.ceil((nextDue - now) / MS_PER_DAY);
  const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;

  return { lastPaid, nextDue, daysUntilDue, daysOverdue, isAutoRenew, cycleAnchor, usingStartDate };
}

/**
 * Is this client currently due to pay?
 *
 * True when they have never paid, or when their current billing cycle has elapsed
 * (daysUntilDue <= 0). Paused clients are never "due". Used to gate the online
 * pay link so a client can renew once their cycle is up, but can't double-pay
 * within a cycle they've already covered.
 */
export function isDueNow(client, now = new Date()) {
  if (!client.last_paid_at) return true; // never paid → must pay
  const timing = getPaymentTiming(client, now);
  if (!timing || timing.paused) return false;
  return timing.daysUntilDue <= 0;
}

// Number of days overdue at which a client becomes a "priority case" requiring
// an admin decision (pause / mark inactive / continue with a reason).
export const PRIORITY_OVERDUE_DAYS = 14;

/**
 * Overdue priority status for an active client.
 *
 * `priority` is true when an active client is at least PRIORITY_OVERDUE_DAYS
 * overdue. `acknowledged` is true when the admin has recorded a "continue with
 * reason" note (overdue_ack_at) — which is cleared automatically on the next
 * payment. Use both to drive the card banner and the list badge.
 */
export function getOverdueStatus(client, now = new Date()) {
  const timing = getPaymentTiming(client, now);
  if (!timing || timing.paused) {
    return { priority: false, acknowledged: false, daysOverdue: 0, note: null, ackAt: null };
  }
  const daysOverdue = timing.daysOverdue || 0;
  const isActive = (client.training_status || 'active') !== 'inactive';
  return {
    priority: isActive && daysOverdue >= PRIORITY_OVERDUE_DAYS,
    acknowledged: !!client.overdue_ack_at,
    daysOverdue,
    note: client.overdue_ack_note || null,
    ackAt: client.overdue_ack_at || null,
  };
}
