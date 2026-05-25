import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';

/**
 * GET /api/admin/attendance?month=YYYY-MM
 *
 * Returns all attendance records for the given month, grouped by client.
 * Also returns the list of active clients so the grid can show clients
 * with no records yet.
 *
 * Response shape:
 * {
 *   month: 'YYYY-MM',
 *   clients: [{ id, full_name, selected_plan, training_status }],
 *   records: [{ id, client_id, session_date, attended, notes }],
 * }
 *
 * POST /api/admin/attendance
 *
 * Upserts a single attendance record (mark present or absent).
 * Body: { clientId, sessionDate: 'YYYY-MM-DD', attended: boolean, notes?: string }
 *
 * DELETE /api/admin/attendance
 *
 * Removes an attendance record entirely (clears the cell).
 * Body: { clientId, sessionDate: 'YYYY-MM-DD' }
 */

// ── Auth helper ────────────────────────────────────────────────────────────────
function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
}
function checkAuth(request) {
  const h = request.headers.get('authorization');
  return h && h === `Bearer ${process.env.ADMIN_SECRET_KEY}`;
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET(request) {
  if (!checkAuth(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // e.g. '2026-04'

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: 'month parameter required in YYYY-MM format.' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();

    // Active (and recently inactive) clients — include all so admin can see history
    const { data: clients, error: clientErr } = await supabase
      .from('clients')
      .select('id, full_name, selected_plan, training_status')
      .eq('application_status', 'approved')
      .order('full_name', { ascending: true });

    if (clientErr) throw clientErr;

    // Attendance records for the calendar month
    const startDate = `${month}-01`;
    const [year, mon] = month.split('-').map(Number);
    const endDate = new Date(year, mon, 0).toISOString().split('T')[0]; // last day of month

    const { data: records, error: recErr } = await supabase
      .from('attendance')
      .select('id, client_id, session_date, attended, notes')
      .gte('session_date', startDate)
      .lte('session_date', endDate)
      .order('session_date', { ascending: true });

    if (recErr) throw recErr;

    return NextResponse.json({ month, clients: clients || [], records: records || [] });
  } catch (err) {
    console.error('attendance GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch attendance.' }, { status: 500 });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(request) {
  if (!checkAuth(request)) return unauthorized();

  try {
    const { clientId, sessionDate, attended, notes } = await request.json();

    if (!clientId || !sessionDate) {
      return NextResponse.json(
        { error: 'clientId and sessionDate are required.' },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      return NextResponse.json(
        { error: 'sessionDate must be YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        {
          client_id:    clientId,
          session_date: sessionDate,
          attended:     attended !== false, // default true
          notes:        notes || null,
        },
        { onConflict: 'client_id,session_date' }
      )
      .select('id, client_id, session_date, attended, notes')
      .single();

    if (error) throw error;

    return NextResponse.json({ record: data });
  } catch (err) {
    console.error('attendance POST error:', err);
    return NextResponse.json({ error: 'Failed to save attendance.' }, { status: 500 });
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function DELETE(request) {
  if (!checkAuth(request)) return unauthorized();

  try {
    const { clientId, sessionDate } = await request.json();

    if (!clientId || !sessionDate) {
      return NextResponse.json(
        { error: 'clientId and sessionDate are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('client_id', clientId)
      .eq('session_date', sessionDate);

    if (error) throw error;

    return NextResponse.json({ message: 'Record deleted.' });
  } catch (err) {
    console.error('attendance DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete attendance.' }, { status: 500 });
  }
}
