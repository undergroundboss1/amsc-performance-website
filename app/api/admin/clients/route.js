import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getAdminActor } from '../../../../lib/admin-auth';

/**
 * GET /api/admin/clients?status=pending_review
 *
 * Returns all clients filtered by application status.
 * Protected by admin secret key.
 */
export async function GET(request) {
  try {
    if (!getAdminActor(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending_review';

    const supabase = getSupabase();

    let query = supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('application_status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Admin fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch clients.' }, { status: 500 });
    }

    return NextResponse.json({ clients: data || [] });
  } catch (err) {
    console.error('Admin clients error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
