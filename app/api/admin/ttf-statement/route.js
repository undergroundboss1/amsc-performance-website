import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getAdminActor } from '../../../../lib/admin-auth';
import { logAdminAction } from '../../../../lib/admin-audit';
import { DEFAULTS, buildRowsFromPayments, monthStart, monthRangeUTC } from '../../../../lib/ttf';

/**
 * GET /api/admin/ttf-statement?month=YYYY-MM
 *
 * The rent statement for a month. If one has been saved it comes back as
 * saved — deliberately not recomputed, so a payment corrected in October
 * cannot quietly rewrite the June sheet TTF was already paid against. If
 * none has been saved, a draft is built from that month's payments and
 * returned unsaved, with `saved: false`.
 *
 * Also returns `clientNames`: every client on the books, so a line added by
 * hand can be picked from the roster rather than typed. The same person
 * spelled two ways across two months is two people to the landlord.
 *
 * POST /api/admin/ttf-statement
 *
 * Saves the statement for a month (upsert on month). Body:
 *   month              'YYYY-MM' or 'YYYY-MM-DD'   required
 *   rows               [{ name, monthsPaid, totalPaid, commissionable }]
 *   commissionableCap  number
 *   tsgPercent         number 0–1
 *   ttfPercent         number 0–1
 *   paymentReference   string | null
 *   paidAt             ISO datetime | null
 *   notes              string | null
 */

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
}

/**
 * Who was training at the facility during a given month — not who is training
 * today.
 *
 * A rent sheet is a historical document. December's statement should offer
 * December's athletes, and if four of them have since paused, that has no
 * bearing on what was owed in December. So the roster is rebuilt per month
 * from what actually happened: a payment that month, or a session attended
 * that month. Attendance matters on its own because someone can train in a
 * month they did not pay in.
 *
 * The month still in progress is the exception. Early in it nobody may have
 * paid or trained yet, and an empty picker would be useless, so currently
 * active clients are included while the month is live.
 */
async function activeInMonth(supabase, month) {
  const { start, end } = monthRangeUTC(month);

  // attendance.session_date is a plain calendar date, so it needs calendar
  // bounds. Slicing the instants above would give 31 May to 30 June for a
  // June query — dropping anyone who only trained on the 30th, and offering
  // anyone who trained on 31 May and never came back.
  const [y, m] = month.split('-').map(Number);
  const firstOfMonth = `${y}-${String(m).padStart(2, '0')}-01`;
  const firstOfNext = m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, '0')}-01`;

  const [{ data: paid }, { data: attended }] = await Promise.all([
    supabase
      .from('payments')
      .select('client_id')
      .gte('payment_date', start)
      .lt('payment_date', end),
    supabase
      .from('attendance')
      .select('client_id')
      .eq('attended', true)
      .gte('session_date', firstOfMonth)
      .lt('session_date', firstOfNext),
  ]);

  const ids = new Set(
    [...(paid || []), ...(attended || [])].map(r => r.client_id).filter(Boolean)
  );

  const names = new Set();
  const add = rows => (rows || []).forEach(c => c.full_name && names.add(c.full_name.trim()));

  if (ids.size > 0) {
    const { data } = await supabase
      .from('clients')
      .select('full_name')
      .neq('selected_plan', 'online')
      .in('id', [...ids]);
    add(data);
  }

  const now = new Date();
  const thisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  if (month.slice(0, 7) === thisMonth) {
    const { data } = await supabase
      .from('clients')
      .select('full_name')
      .neq('selected_plan', 'online')
      .eq('application_status', 'approved')
      .not('last_paid_at', 'is', null)
      // training_status is null on rows that predate it, and null means
      // active — a bare inequality would drop those people.
      .or('training_status.is.null,training_status.neq.inactive');
    add(data);
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

function serialize(record, extra = {}) {
  return {
    month: record.month,
    rows: record.rows || [],
    commissionableCap: Number(record.commissionable_cap),
    tsgPercent: Number(record.tsg_percent),
    ttfPercent: Number(record.ttf_percent),
    paymentReference: record.payment_reference || '',
    paidAt: record.paid_at || null,
    notes: record.notes || '',
    updatedAt: record.updated_at || null,
    updatedBy: record.updated_by || null,
    ...extra,
  };
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET(request) {
  if (!getAdminActor(request)) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const month = monthStart(searchParams.get('month'));
    if (!month) {
      return NextResponse.json({ error: 'month is required as YYYY-MM.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const clientNames = await activeInMonth(supabase, month);

    const { data: existing, error: readError } = await supabase
      .from('ttf_statements')
      .select('*')
      .eq('month', month)
      .maybeSingle();

    if (readError) {
      console.error('ttf-statement read error:', readError);
      return NextResponse.json({ error: 'Failed to load the statement.' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ statement: serialize(existing, { saved: true }), clientNames });
    }

    // Nothing saved yet — draft one from the month's payments, bracketed on
    // Nairobi time so an early-hours payment on the 1st is not billed to the
    // month before.
    const { start, end } = monthRangeUTC(month);

    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('id, client_id, amount, months_covered, plan_id, payment_date, clients(full_name)')
      .gte('payment_date', start)
      .lt('payment_date', end);

    if (payError) {
      console.error('ttf-statement payments error:', payError);
      return NextResponse.json({ error: 'Failed to load payments for that month.' }, { status: 500 });
    }

    return NextResponse.json({
      statement: {
        month,
        rows: buildRowsFromPayments(payments || [], DEFAULTS.commissionableCap),
        commissionableCap: DEFAULTS.commissionableCap,
        tsgPercent: DEFAULTS.tsgPercent,
        ttfPercent: DEFAULTS.ttfPercent,
        paymentReference: '',
        paidAt: null,
        notes: '',
        updatedAt: null,
        updatedBy: null,
        saved: false,
      },
      clientNames,
    });
  } catch (err) {
    console.error('ttf-statement GET error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) return unauthorized();

  try {
    const body = await request.json();
    const month = monthStart(body.month);
    if (!month) {
      return NextResponse.json({ error: 'month is required as YYYY-MM.' }, { status: 400 });
    }

    if (!Array.isArray(body.rows)) {
      return NextResponse.json({ error: 'rows must be an array.' }, { status: 400 });
    }

    // Keep only the four fields a line actually has, and coerce the numbers —
    // the splits are derived, so anything else in the payload is noise.
    const rows = body.rows.map(r => ({
      name: String(r.name ?? '').trim(),
      monthsPaid: Number(r.monthsPaid) || 0,
      totalPaid: Number(r.totalPaid) || 0,
      commissionable: Number(r.commissionable) || 0,
    }));

    if (rows.some(r => !r.name)) {
      return NextResponse.json({ error: 'Every line needs a name.' }, { status: 400 });
    }
    if (rows.some(r => r.totalPaid < 0 || r.commissionable < 0)) {
      return NextResponse.json({ error: 'Amounts cannot be negative.' }, { status: 400 });
    }

    const pct = (value, fallback) => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 && n < 1 ? n : fallback;
    };
    const tsgPercent = pct(body.tsgPercent, DEFAULTS.tsgPercent);
    const ttfPercent = pct(body.ttfPercent, DEFAULTS.ttfPercent);

    if (tsgPercent + ttfPercent >= 1) {
      return NextResponse.json(
        { error: 'The TSG and TTF shares cannot add up to the whole amount.' },
        { status: 400 }
      );
    }

    // A cap of 0 is a real (if drastic) choice and is stored as given. Only a
    // missing or nonsensical value falls back to the default — silently
    // turning a deliberate 0 into 10,000 would misstate what is owed.
    const capRaw = Number(body.commissionableCap);
    if (body.commissionableCap != null && (!Number.isFinite(capRaw) || capRaw < 0)) {
      return NextResponse.json(
        { error: 'The commissionable cap must be zero or more.' },
        { status: 400 }
      );
    }
    const commissionableCap = Number.isFinite(capRaw) ? capRaw : DEFAULTS.commissionableCap;

    let paidAt = null;
    if (body.paidAt) {
      const parsed = new Date(body.paidAt);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'paidAt is not a valid date.' }, { status: 400 });
      }
      paidAt = parsed.toISOString();
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ttf_statements')
      .upsert(
        {
          month,
          rows,
          commissionable_cap: commissionableCap,
          tsg_percent: tsgPercent,
          ttf_percent: ttfPercent,
          payment_reference: body.paymentReference?.trim() || null,
          paid_at: paidAt,
          notes: body.notes?.trim() || null,
          updated_by: actor,
        },
        { onConflict: 'month' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('ttf-statement save error:', error);
      return NextResponse.json({ error: 'Failed to save the statement.' }, { status: 500 });
    }

    await logAdminAction({
      actor,
      action: 'client.save_ttf_statement',
      domain: 'client',
      detail: { month, lines: rows.length, paid: Boolean(paidAt) },
    });

    return NextResponse.json({ statement: serialize(data, { saved: true }) });
  } catch (err) {
    console.error('ttf-statement POST error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
