import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';

/**
 * POST /api/admin/update-client
 *
 * Updates admin-settable fields on a client record.
 * Currently supports:
 *   trainingStartDate — ISO date string (or null to clear)
 *
 * trainingStartDate:
 *   When a client begins training before their first payment, set this to
 *   the date training actually started. The billing cycle is then anchored
 *   to this date rather than last_paid_at, so pre-payment training days are
 *   factored into the next-due calculation.
 *
 *   Example: client starts training May 1, pays May 10.
 *   Without trainingStartDate → next due June 10.
 *   With trainingStartDate = May 1 → next due June 1 (correct).
 */
export async function POST(request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, trainingStartDate } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required.' }, { status: 400 });
    }

    // Build the update payload — only include fields that were provided
    const updates = {};

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
