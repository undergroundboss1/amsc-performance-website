import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const supabase = getSupabase();
    let query = supabase
      .from('payments')
      .select('*, clients(full_name, email)')
      .order('payment_date', { ascending: false });
    if (clientId) query = query.eq('client_id', clientId);
    const { data, error } = await query;
    if (error) {
      console.error('admin/payments fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch payments.' }, { status: 500 });
    }
    return NextResponse.json({ payments: data || [] });
  } catch (err) {
    console.error('admin/payments error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
