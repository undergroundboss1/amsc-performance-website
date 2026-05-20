import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';

/**
 * GET /api/admin/arrears
 *
 * Returns all clients with outstanding balances (months_owed > 0),
 * sourced from the client_payment_summary view.
 * Sorted by amount_owed DESC.
 *
 * Returns: { clients: Array<ClientArrears>, totals: { count, totalOwed } }
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('client_payment_summary')
      .select(
        'id, full_name, selected_plan, plan_price, effective_price, ' +
        'discount_percent, custom_monthly_rate, partnership_note, ' +
        'months_enrolled, months_paid, months_owed, amount_owed, ' +
        'last_paid_at, payment_status, email, phone'
      )
      .gt('months_owed', 0)
      .order('amount_owed', { ascending: false });

    if (error) {
      console.error('arrears query error:', error);
      return NextResponse.json({ error: 'Failed to fetch arrears.' }, { status: 500 });
    }

    const clients = data || [];
    const totalOwed = clients.reduce((sum, c) => sum + Number(c.amount_owed || 0), 0);

    return NextResponse.json({
      clients,
      totals: { count: clients.length, totalOwed },
    });
  } catch (err) {
    console.error('arrears error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
