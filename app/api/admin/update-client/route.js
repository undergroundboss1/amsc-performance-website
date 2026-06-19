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
 *
 *   trainingStatus     — 'active' | 'inactive'
 *     Marks the client as actively training or temporarily paused. Setting to
 *     'inactive' auto-stamps inactive_since (if not already set) and suppresses
 *     the overdue billing indicator. Setting back to 'active' clears the pause
 *     fields (but preserves pause_credit_days so the billing credit stays live).
 *
 *   inactiveReason     — string (or null to clear)
 *     Why the client is paused, e.g. "Injury", "Travel". Free text or preset.
 *
 *   expectedReturnDate — ISO date string (or null to clear)
 *     Estimated date the client plans to resume training.
 *
 *   pauseCreditApproved — boolean
 *     Admin marks that carry-over credit is approved for this pause. Use for
 *     genuine emergencies only — not uncommitment or laziness.
 *
 *   pauseCreditDays    — integer 0–31
 *     Number of unused days to carry forward into the next billing cycle. The
 *     billing window is extended by this many days on the client's return.
 *     Persists after reactivation until the admin manually clears it.
 */
export async function POST(request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      clientId,
      trainingStartDate, discountPercent, customMonthlyRate, partnershipNote, amscMetricsAthleteId,
      trainingStatus, inactiveReason, expectedReturnDate, pauseCreditApproved, pauseCreditDays,
      email, phone, fullName, overdueAckNote,
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Build the update payload — only include fields that were provided
    const updates = {};

    // ── Contact info ──────────────────────────────────────────────────────
    if ('email' in body) {
      const e = (email || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
        return NextResponse.json(
          { error: 'A valid email address is required.' },
          { status: 400 }
        );
      }
      updates.email = e;
    }

    if ('phone' in body) {
      const p = (phone || '').trim();
      if (!p) {
        return NextResponse.json({ error: 'Phone cannot be blank.' }, { status: 400 });
      }
      updates.phone = p;
    }

    if ('fullName' in body) {
      const n = (fullName || '').trim();
      if (!n) {
        return NextResponse.json({ error: 'Full name cannot be blank.' }, { status: 400 });
      }
      updates.full_name = n;
    }

    // ── Overdue acknowledgement ("continue with reason") ──────────────────
    // A non-empty note records that the admin has decided to keep this overdue
    // client active for a stated reason — this dismisses the priority prompt
    // until their next payment (which clears it). Empty/null re-opens the prompt.
    if ('overdueAckNote' in body) {
      const note = (overdueAckNote || '').trim();
      if (note) {
        updates.overdue_ack_note = note;
        updates.overdue_ack_at = new Date().toISOString();
      } else {
        updates.overdue_ack_note = null;
        updates.overdue_ack_at = null;
      }
    }

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

    // ── amscMetricsAthleteId ──────────────────────────────────────────────
    if ('amscMetricsAthleteId' in body) {
      updates.amsc_metrics_athlete_id =
        amscMetricsAthleteId === null || amscMetricsAthleteId === '' ? null : String(amscMetricsAthleteId).trim();
    }

    // ── trainingStatus ────────────────────────────────────────────────────
    if ('trainingStatus' in body) {
      if (!['active', 'inactive'].includes(trainingStatus)) {
        return NextResponse.json(
          { error: "trainingStatus must be 'active' or 'inactive'." },
          { status: 400 }
        );
      }
      updates.training_status = trainingStatus;

      if (trainingStatus === 'inactive') {
        // Fetch current record to check if inactive_since is already set
        const { data: current } = await supabase
          .from('clients')
          .select('inactive_since')
          .eq('id', clientId)
          .single();
        if (!current?.inactive_since) {
          updates.inactive_since = new Date().toISOString();
        }
      } else if (trainingStatus === 'active') {
        // Clear pause fields on reactivation — but preserve pause_credit_days
        updates.inactive_since = null;
        updates.inactive_reason = null;
        updates.expected_return_date = null;
        updates.pause_credit_approved = false;
      }
    }

    // ── inactiveReason ────────────────────────────────────────────────────
    if ('inactiveReason' in body) {
      updates.inactive_reason =
        inactiveReason === null || inactiveReason === '' ? null : String(inactiveReason).trim();
    }

    // ── expectedReturnDate ────────────────────────────────────────────────
    if ('expectedReturnDate' in body) {
      if (expectedReturnDate === null || expectedReturnDate === '') {
        updates.expected_return_date = null;
      } else {
        const parsed = new Date(expectedReturnDate);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: 'Invalid expectedReturnDate. Expected ISO date string or null.' },
            { status: 400 }
          );
        }
        updates.expected_return_date = parsed.toISOString().split('T')[0];
      }
    }

    // ── pauseCreditApproved ───────────────────────────────────────────────
    if ('pauseCreditApproved' in body) {
      updates.pause_credit_approved = Boolean(pauseCreditApproved);
    }

    // ── pauseCreditDays ───────────────────────────────────────────────────
    if ('pauseCreditDays' in body) {
      const days = parseInt(pauseCreditDays, 10);
      if (isNaN(days) || days < 0 || days > 31) {
        return NextResponse.json(
          { error: 'pauseCreditDays must be an integer between 0 and 31.' },
          { status: 400 }
        );
      }
      updates.pause_credit_days = days;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

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
