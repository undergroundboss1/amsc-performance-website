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

    // The roster for the "add a client" picker: people actually training at
    // the facility right now. Same definition of active the Applications tab
    // uses — approved, has paid at least once, not on a training pause — plus
    // online clients excluded, since they use no facility and owe no rent.
    //
    // A declined applicant or a paused client appearing here would only be a
    // chance to bill the landlord for someone who was never on the floor.
    // Anyone genuinely missing is still one click away on "+ Blank line".
    const { data: clientRows } = await supabase
      .from('clients')
      .select('full_name')
      .eq('application_status', 'approved')
      .neq('selected_plan', 'online')
      .not('last_paid_at', 'is', null)
      // training_status predates some rows and is null for them; null means
      // active, and a bare neq would drop those rows instead of keeping them.
      .or('training_status.is.null,training_status.neq.inactive')
      .order('full_name', { ascending: true });

    const clientNames = [
      ...new Set((clientRows || []).filter(c => c.full_name).map(c => c.full_name.trim())),
    ];

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
