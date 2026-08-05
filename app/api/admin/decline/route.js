import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getAdminActor } from '../../../../lib/admin-auth';
import { logAdminAction } from '../../../../lib/admin-audit';

/**
 * POST /api/admin/decline
 *
 * Declines a client application.
 * Expects: { clientId: string }
 * Protected by admin secret key.
 */
export async function POST(request) {
  try {
    const actor = getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('clients')
      .update({ application_status: 'declined' })
      .eq('id', clientId);

    if (error) {
      console.error('Decline error:', error);
      return NextResponse.json({ error: 'Failed to decline application.' }, { status: 500 });
    }

    await logAdminAction({ actor, action: 'client.decline', domain: 'client', resourceId: clientId });

    return NextResponse.json({ message: 'Application declined.' });
  } catch (err) {
    console.error('Admin decline error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
