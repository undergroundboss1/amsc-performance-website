/**
 * Bucketing payments into reporting periods for the revenue export.
 *
 * Gross is what clients paid. Rent split is the facility's share (see
 * scripts/supabase-migration-v4.sql). Net is what AMSC actually keeps. All
 * three are summed straight off the payments table rather than recomputed,
 * so an export can never disagree with the Revenue tab about a figure.
 *
 * Everything here works in Nairobi time. A payment taken at 01:00 EAT on the
 * 1st belongs to that day and that month, not to the one before, which is
 * where it would land if the buckets were cut on UTC.
 */

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

export const GRANULARITIES = ['daily', 'monthly', 'quarterly', 'yearly'];

export const GRANULARITY_LABELS = {
  daily: 'Daily',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

/** The civil date in Nairobi for an instant, as its Y/M/D parts. */
function nairobiParts(iso) {
  const d = new Date(new Date(iso).getTime() + EAT_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
}

/** "YYYY-MM-DD" — the Nairobi calendar date an instant falls on. */
export function nairobiDate(value) {
  const { year, month, day } = nairobiParts(value);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * A calendar date in Nairobi as the instant it begins.
 *
 * Export ranges are sent as calendar dates and resolved here, so the range
 * and the buckets inside it are cut on the same clock. Resolving the range
 * in the browser instead would let an October export on a non-Nairobi
 * machine pick up payments from the small hours of 1 November and grow a
 * stray November row.
 */
export function nairobiDayStart(ymd) {
  return new Date(`${ymd}T00:00:00+03:00`);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Which bucket a payment falls in, as a sortable key plus a human label. */
export function bucketFor(iso, granularity) {
  const { year, month, day } = nairobiParts(iso);
  if (granularity === 'daily') {
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      label: `${day} ${MONTHS[month]} ${year}`,
    };
  }
  if (granularity === 'monthly') {
    return { key: `${year}-${String(month + 1).padStart(2, '0')}`, label: `${MONTHS[month]} ${year}` };
  }
  if (granularity === 'quarterly') {
    const q = Math.floor(month / 3) + 1;
    return { key: `${year}-Q${q}`, label: `Q${q} ${year}` };
  }
  return { key: String(year), label: String(year) };
}

/**
 * Group payments into buckets, newest period last.
 *
 * Only periods that actually contain payments get a row. A quiet week in a
 * yearly export is not information worth a line, and a daily export across
 * several years would otherwise be mostly empty rows.
 */
export function bucketPayments(payments, granularity) {
  const buckets = new Map();

  for (const p of payments) {
    const { key, label } = bucketFor(p.payment_date, granularity);
    const b = buckets.get(key) || { key, label, count: 0, gross: 0, rent: 0, net: 0 };
    b.count += 1;
    b.gross += Number(p.amount) || 0;
    b.rent += Number(p.rent_split) || 0;
    b.net += Number(p.net_revenue) || 0;
    buckets.set(key, b);
  }

  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function sumBuckets(buckets) {
  return buckets.reduce(
    (a, b) => ({
      count: a.count + b.count,
      gross: a.gross + b.gross,
      rent: a.rent + b.rent,
      net: a.net + b.net,
    }),
    { count: 0, gross: 0, rent: 0, net: 0 }
  );
}
