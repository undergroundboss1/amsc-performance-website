import { NextResponse } from 'next/server';
import { getCampSupabase } from '../../../../../lib/supabase';
import { getAdminActor } from '../../../../../lib/admin-auth';
import { logAdminAction } from '../../../../../lib/admin-audit';
import { sendCampOutcomeEmail } from '../../../../../lib/camp-notifications';

/**
 * POST /api/admin/camp/mark-paid
 *
 * Manually records a camp payment (cash, bank transfer) against a
 * 'pending' registration — the explicit "manual override to mark a
 * registration paid/confirmed" requirement. Goes through the SAME
 * camp.confirm_registration() RPC the Paystack webhook uses, so slot
 * assignment stays atomic and consistent regardless of payment channel —
 * if the camp is already full, this correctly waitlists rather than
 * silently overflowing capacity.
 *
 * Only meant for 'pending' registrations. Promoting an existing waitlisted
 * registration is a distinct action — see /api/admin/camp/promote — kept
 * separate so each button in the UI does exactly one job.
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
      .select('id, status, camp_id')
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    if (registration.status !== 'pending') {
      return NextResponse.json(
        { error: `This registration is already '${registration.status}' — nothing to mark paid.` },
        { status: 400 }
      );
    }

    const { data: camp, error: campError } = await campSupabase
      .from('camps')
      .select('price_kes')
      .eq('id', registration.camp_id)
      .single();

    if (campError || !camp) {
      return NextResponse.json({ error: 'Camp not found.' }, { status: 404 });
    }

    const { data: rpcResult, error: rpcError } = await campSupabase.rpc('confirm_registration', {
      p_registration_id: registrationId,
      p_payment_reference: `MANUAL-${actor}-${Date.now()}`,
      p_payment_method: 'manual',
      p_amount_paid: camp.price_kes,
    });

    if (rpcError) {
      console.error('admin/camp/mark-paid: RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to record payment.' }, { status: 500 });
    }

    await logAdminAction({
      actor, action: 'camp.mark_paid', domain: 'camp', resourceId: registrationId,
      detail: { result: rpcResult, amount: camp.price_kes },
    });

    // Non-fatal — the state change already succeeded regardless of email outcome.
    try {
      await sendCampOutcomeEmail(registrationId, rpcResult, { amountPaid: camp.price_kes });
    } catch (emailErr) {
      console.error('admin/camp/mark-paid: email error (non-fatal):', emailErr);
    }

    return NextResponse.json({ message: 'Payment recorded.', status: rpcResult });
  } catch (err) {
    console.error('admin/camp/mark-paid error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
