import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';

/**
 * POST /api/admin/update-client
 *
 * Updates admin-settable fields on a client record.
 * Supported fields:
 *
 *   trainingStartDate  — ISO date string (or null to clear)
 *     Anchors the billing cycle to the date training actually started, so
 *     pre-payment training days are factored into the next-due calculation.
 *     Example: client starts May 1, pays May 10.
 *     Without → next due June 10.  With → next due June 1 (correct).
 *
 *   discountPercent    — number 0–99.99 (or null to clear)
 *     Percentage discount off the standard plan price.
 *     e.g. 30 means the client pays 70% of plan_price each month.
 *     Ignored if customMonthlyRate is also set (custom rate takes precedence).
 *
 *   customMonthlyRate  — positive number in KES (or null to clear)
 *     Fully overrides plan_price for billing calculations. Use for partnership
 *     clients whose agreed rate doesn't map cleanly to a plan % discount.
 *
 *   partnershipNote    — string (or null to clear)
 *     Free-text context for the pricing override, e.g. "NPH athlete partnership".
 */
export async function POST(request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, trainingStartDate, discountPercent, customMonthlyRate, partnershipNote } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required.' }, { status: 400 });
    }

    // Build the update payload — only include fields that were provided
    const updates = {};

    // ── trainingStartDate ─────────────────────────────────────────────────
    if ('trainingStartDate' in body) {
      if (trainingStartDate === null || trainingStartDate === '') {
        updates.training_start_date = null;
      } else {
        const parsed = new Date(trainingStartDate);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: 'Invalid trainingStartDate. Expected ISO date string or null.' },
            { status: 400 }
          );
        }
        // Store as start of that day in UTC to avoid timezone drift
        updates.training_start_date = parsed.toISOString();
      }
    }

    // ── discountPercent ───────────────────────────────────────────────────
    if ('discountPercent' in body) {
      if (discountPercent === null || discountPercent === '') {
        updates.discount_percent = 0;
      } else {
        const pct = Number(discountPercent);
        if (isNaN(pct) || pct < 0 || pct >= 100) {
          return NextResponse.json(
            { error: 'discountPercent must be a number between 0 and 99.99, or null.' },
            { status: 400 }
          );
        }
        updates.discount_percent = pct;
      }
    }

    // ── customMonthlyRate ─────────────────────────────────────────────────
    if ('customMonthlyRate' in body) {
      if (customMonthlyRate === null || customMonthlyRate === '') {
        updates.custom_monthly_rate = null;
      } else {
        const rate = Number(customMonthlyRate);
        if (isNaN(rate) || rate <= 0) {
          return NextResponse.json(
            { error: 'customMonthlyRate must be a positive number, or null.' },
            { status: 400 }
          );
        }
        updates.custom_monthly_rate = rate;
      }
    }

    // ── partnershipNote ───────────────────────────────────────────────────
    if ('partnershipNote' in body) {
      updates.partnership_note =
        partnershipNote === null || partnershipNote === '' ? null : String(partnershipNote).trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId);

    if (error) {
      console.error('update-client error:', error);
      return NextResponse.json({ error: 'Failed to update client.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Client updated.' });
  } catch (err) {
    console.error('update-client error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
