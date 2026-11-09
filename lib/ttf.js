/**
 * The monthly rent statement AMSC sends to its landlord, TTF.
 *
 * The arrangement: each client commissions on what they paid, capped at
 * COMMISSIONABLE_CAP. Of that commissionable amount TSG takes 25% and TTF
 * takes 15%, and AMSC keeps the remaining 60%. TTF is sent the TSG and TTF
 * portions together — 40% of the commissionable base.
 *
 * The same 40% appears on the payments table as the generated rent_split
 * column (scripts/supabase-migration-v4.sql), and the statement splits it
 * into the two halves the landlord is owed.
 *
 * The two are not always equal, and deliberately so. rent_split caps each
 * PAYMENT at 10,000; the statement has one line per person, so it caps each
 * CLIENT-MONTH. Someone who pays 10,000 twice in one month commissions on
 * 20,000 by the payments table and 10,000 here. The statement's reading is
 * the one the landlord agreed to, so it wins on the sheet — but it means the
 * Revenue tab's facility-split figure can read higher than what is actually
 * owed, and the line is editable precisely because cases like this need a
 * human to settle them.
 *
 * Online clients use no facility and owe no rent, which is why the payments
 * table zeroes their rent split — they are left out of the statement too.
 */

export const DEFAULTS = {
  commissionableCap: 10000,
  tsgPercent: 0.25,
  ttfPercent: 0.15,
};

/** AMSC's share is whatever the two commissions leave behind. */
export function amscPercent(tsgPercent, ttfPercent) {
  return 1 - tsgPercent - ttfPercent;
}

/**
 * The three split figures for one line, derived from its commissionable
 * amount alone — never from the total paid.
 */
export function splitRow(row, tsgPercent = DEFAULTS.tsgPercent, ttfPercent = DEFAULTS.ttfPercent) {
  const base = Number(row.commissionable) || 0;
  const tsg = base * tsgPercent;
  const ttf = base * ttfPercent;
  return { base, tsg, ttf, amsc: base - tsg - ttf };
}

/**
 * Statement-level totals. `owedToTtf` is what actually gets transferred:
 * TSG's share and TTF's share together.
 */
export function statementTotals(rows, tsgPercent = DEFAULTS.tsgPercent, ttfPercent = DEFAULTS.ttfPercent) {
  const t = rows.reduce(
    (acc, row) => {
      const s = splitRow(row, tsgPercent, ttfPercent);
      return {
        totalPaid: acc.totalPaid + (Number(row.totalPaid) || 0),
        commissionable: acc.commissionable + s.base,
        tsg: acc.tsg + s.tsg,
        ttf: acc.ttf + s.ttf,
        amsc: acc.amsc + s.amsc,
      };
    },
    { totalPaid: 0, commissionable: 0, tsg: 0, ttf: 0, amsc: 0 }
  );
  return { ...t, owedToTtf: t.tsg + t.ttf };
}

/**
 * Turn a month of payments into draft statement lines — one per client,
 * however many times they paid.
 *
 * The cap is applied to each client's month as a whole, not to each payment,
 * because the statement has one line per person. A client who paid twice in
 * one month still commissions on at most the cap.
 */
export function buildRowsFromPayments(payments, cap = DEFAULTS.commissionableCap) {
  const byClient = new Map();

  for (const p of payments) {
    if (p.plan_id === 'online') continue; // no facility use, no rent
    const key = p.client_id || p.clients?.full_name || p.id;
    const existing = byClient.get(key);
    const amount = Number(p.amount) || 0;
    const months = Number(p.months_covered) || 1;

    if (existing) {
      existing.totalPaid += amount;
      existing.monthsPaid += months;
    } else {
      byClient.set(key, {
        name: p.clients?.full_name || 'Unknown client',
        monthsPaid: months,
        totalPaid: amount,
      });
    }
  }

  return [...byClient.values()]
    .map(r => ({ ...r, commissionable: Math.min(r.totalPaid, cap) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** "2026-06-01" → "June 26", the tab name TTF's copies already use. */
export function sheetName(monthISO) {
  const d = new Date(`${String(monthISO).slice(0, 7)}-01T00:00:00Z`);
  const month = d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
  return `${month} ${String(d.getUTCFullYear()).slice(2)}`;
}

/** "2026-06-01" → "JUNE_2026", for the downloaded file's name. */
export function fileMonth(monthISO) {
  const d = new Date(`${String(monthISO).slice(0, 7)}-01T00:00:00Z`);
  return `${d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' }).toUpperCase()}_${d.getUTCFullYear()}`;
}

/**
 * Normalise anything month-ish to the first day of that month, "YYYY-MM-01",
 * or null if it is not a real month. The month part is range-checked: without
 * it "2026-13" parses far enough to reach the database and fail there.
 */
export function monthStart(value) {
  const s = String(value || '').slice(0, 7);
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${s}-01`;
}

/**
 * Kenya keeps a fixed +03:00 offset all year, so a month runs from
 * 00:00 EAT on the 1st to 00:00 EAT on the 1st of the next month. Bracketing
 * on UTC instead would file a payment taken at 01:00 EAT on the 1st under the
 * previous month's rent.
 */
export function monthRangeUTC(monthISO) {
  const [year, month] = monthISO.split('-').map(Number);
  // Both ends are built from the calendar, never by adding a month to the
  // start: the start of a 31-day month plus one month overflows into the one
  // after next, which would sweep an extra day of payments into the sheet.
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const pad = n => String(n).padStart(2, '0');
  return {
    start: new Date(`${year}-${pad(month)}-01T00:00:00+03:00`).toISOString(),
    end: new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00+03:00`).toISOString(),
  };
}
