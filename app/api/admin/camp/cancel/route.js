import { NextResponse } from 'next/server';
import { getCampSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';
import { logAdminAction } from '../../../../../lib/admin-audit';

/**
 * POST /api/admin/camp/cancel
 *
 * Cancels a registration (any status). Does NOT automatically promote the
 * next waitlisted athlete — matches this codebase's general philosophy of
 * admin discretion over automatic cascading actions (e.g. overdue clients
 * require a manual admin decision, not an automatic one). The freed slot
 * shows up immediately in spotsRemaining (computed live from
 * COUNT(status='paid')), and the admin promotes the next person explicitly
 * via /api/admin/camp/promote if they choose to.
 *
 * The DB trigger clear_slot_on_cancel (scripts/supabase-camp-schema-v2.sql)
 * clears slot_number automatically on this transition — nothing to do here
 * beyond the status update itself.
 *
 * Body: { registrationId, reason? }
 */
export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { registrationId, reason } = await request.json();
    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required.' }, { status: 400 });
    }

    const campSupabase = getCampSupabase();

    const { data: registration, error: fetchError } = await campSupabase
      .from('registrations')
      .select('id, status')
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    if (registration.status === 'cancelled') {
      return NextResponse.json({ error: 'This registration is already cancelled.' }, { status: 400 });
    }

    const previousStatus = registration.status;

    const { error: updateError } = await campSupabase
      .from('registrations')
      .update({ status: 'cancelled' })
      .eq('id', registrationId);

    if (updateError) {
      console.error('admin/camp/cancel: update error:', updateError);
      return NextResponse.json({ error: 'Failed to cancel registration.' }, { status: 500 });
    }

    await logAdminAction({
      actor, action: 'camp.cancel_registration', domain: 'camp', resourceId: registrationId,
      detail: { fromStatus: previousStatus, reason: reason || null },
    });

    return NextResponse.json({ message: 'Registration cancelled.' });
  } catch (err) {
    console.error('admin/camp/cancel error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
