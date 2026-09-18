import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getAdminActor } from '../../../../lib/admin-auth';
import { logAdminAction } from '../../../../lib/admin-audit';
import { COMMS_STATUSES, ESCALATION_REASONS, sortFollowUps } from '../../../../lib/client-comms';

/**
 * GET /api/admin/client-comms?status=
 *
 * The follow-up queue: every client whose conversation someone is currently
 * working. Escalations first, then whichever has gone longest untouched
 * (see sortFollowUps). Clients with no comms_status are not in the queue and
 * never appear here.
 *
 * Query params:
 *   status  {COMMS_STATUSES[number]}  — optional, narrows to one status
 *
 * POST /api/admin/client-comms
 *
 * Sets where a conversation stands. Body:
 *   clientId          {uuid}    required
 *   commsStatus       {string}  one of COMMS_STATUSES, or null to drop the
 *                               client out of the queue entirely
 *   commsNote         {string}  optional — next action, or why it was escalated
 *   escalationReason  {string}  optional — only kept while status is 'escalated'
 *
 * Who made the change is taken from the admin key on the request, not from
 * the body — the three keys exist precisely so this is attributable.
 */

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET(request) {
  if (!getAdminActor(request)) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    if (status && !COMMS_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Unknown status filter.' }, { status: 400 });
    }

    const supabase = getSupabase();
    let query = supabase.from('clients').select('*').not('comms_status', 'is', null);
    if (status) query = query.eq('comms_status', status);

    const { data, error } = await query;

    if (error) {
      console.error('client-comms: fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch follow-ups.' }, { status: 500 });
    }

    const clients = sortFollowUps(data || []);

    return NextResponse.json({
      clients,
      counts: clients.reduce((acc, c) => {
        acc[c.comms_status] = (acc[c.comms_status] || 0) + 1;
        return acc;
      }, {}),
    });
  } catch (err) {
    console.error('client-comms GET error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(request) {
  const actor = getAdminActor(request);
  if (!actor) return unauthorized();

  try {
    const body = await request.json();
    const { clientId, commsStatus, commsNote, escalationReason } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required.' }, { status: 400 });
    }

    if (!('commsStatus' in body)) {
      return NextResponse.json({ error: 'commsStatus is required.' }, { status: 400 });
    }

    const clearing = commsStatus === null || commsStatus === '';
    if (!clearing && !COMMS_STATUSES.includes(commsStatus)) {
      return NextResponse.json(
        { error: `commsStatus must be one of: ${COMMS_STATUSES.join(', ')} — or null to clear.` },
        { status: 400 }
      );
    }

    if (
      escalationReason !== undefined &&
      escalationReason !== null &&
      escalationReason !== '' &&
      !ESCALATION_REASONS.includes(escalationReason)
    ) {
      return NextResponse.json(
        { error: `escalationReason must be one of: ${ESCALATION_REASONS.join(', ')}.` },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: current, error: readError } = await supabase
      .from('clients')
      .select('comms_status')
      .eq('id', clientId)
      .single();

    if (readError || !current) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    // Dropping out of the queue clears the working notes with it — a note
    // explaining a follow-up that is no longer open would only mislead the
    // next person to open the record.
    const updates = clearing
      ? {
          comms_status: null,
          comms_note: null,
          escalation_reason: null,
          comms_updated_at: new Date().toISOString(),
          comms_updated_by: actor,
        }
      : {
          comms_status: commsStatus,
          // The reason belongs to the escalation, so it goes when the
          // escalation does — otherwise a resolved conversation keeps
          // showing "payment dispute" long after it was settled.
          escalation_reason:
            commsStatus === 'escalated' ? (escalationReason || 'other') : null,
          comms_updated_at: new Date().toISOString(),
          comms_updated_by: actor,
        };

    if ('commsNote' in body && !clearing) {
      const note = (commsNote || '').trim();
      updates.comms_note = note || null;
    }

    const { error } = await supabase.from('clients').update(updates).eq('id', clientId);

    if (error) {
      console.error('client-comms: update error:', error);
      return NextResponse.json({ error: 'Failed to update conversation.' }, { status: 500 });
    }

    await logAdminAction({
      actor,
      action: 'client.update_comms',
      domain: 'client',
      resourceId: clientId,
      detail: {
        from_status: current.comms_status,
        to_status: updates.comms_status,
        escalation_reason: updates.escalation_reason,
      },
    });

    return NextResponse.json({ message: 'Conversation updated.', updates });
  } catch (err) {
    console.error('client-comms POST error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
