import { NextResponse } from 'next/server';
import { getCampSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';
import { logAdminAction } from '../../../../../lib/admin-audit';
import { sendCampOutcomeEmail } from '../../../../../lib/camp-notifications';

/**
 * POST /api/admin/camp/promote
 *
 * Moves a 'waitlist' registration to 'paid' if a slot has actually opened
 * up (e.g. a cancellation). Uses camp.promote_registration() — separate
 * from confirm_registration(), since this is an admin decision made on a
 * row that's already resolved once, not a payment-just-happened event.
 *
 * If no slot is actually free, the RPC returns 'waitlist' unchanged
 * rather than erroring — this route surfaces that as a clear message
 * instead of a generic failure, and deliberately does NOT send the
 * guardian a "you're on the waitlist" email in that case, since nothing
 * changed for them.
 *
 * Body: { registrationId }
 */
export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { registrationId } = await request.json();
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

    if (registration.status !== 'waitlist') {
      return NextResponse.json(
        { error: `This registration is '${registration.status}', not on the waitlist.` },
        { status: 400 }
      );
    }

    const { data: rpcResult, error: rpcError } = await campSupabase.rpc('promote_registration', {
      p_registration_id: registrationId,
    });

    if (rpcError) {
      console.error('admin/camp/promote: RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to promote registration.' }, { status: 500 });
    }

    await logAdminAction({
      actor, action: 'camp.promote_waitlist', domain: 'camp', resourceId: registrationId,
      detail: { result: rpcResult },
    });

    if (rpcResult === 'waitlist') {
      // No slot actually available — nothing changed, nothing to email.
      return NextResponse.json({
        message: 'No spot is currently available — still on the waitlist.',
        status: 'waitlist',
      });
    }

    try {
      await sendCampOutcomeEmail(registrationId, 'paid');
    } catch (emailErr) {
      console.error('admin/camp/promote: email error (non-fatal):', emailErr);
    }

    return NextResponse.json({ message: 'Promoted to a confirmed spot.', status: 'paid' });
  } catch (err) {
    console.error('admin/camp/promote error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
