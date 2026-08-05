import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCampSupabase } from '../../../../lib/supabase';
import { getCampContentBySlug } from '../../../../lib/camps';
import { sanitize, validateCampRegistration } from '../../../../lib/validators';

/**
 * POST /api/camp/register
 *
 * Creates a camp registration in 'pending' status. Called from the camp
 * registration form BEFORE payment — the client then calls /api/camp/pay
 * with the returned registrationId to actually charge.
 *
 * No slot is consumed here. Slot assignment (paid vs waitlist) happens
 * atomically in camp.confirm_registration(), called from the Paystack
 * webhook once payment is confirmed — see app/api/webhooks/paystack/route.js.
 *
 * This route only performs a SOFT capacity check, matching the brief's
 * "registration closes automatically at 20" requirement by refusing new
 * sign-ups once the camp is already full. It is not the race-safety
 * mechanism — that lives in confirm_registration()'s row-locked count.
 *
 * SECURITY:
 * - All input validated and sanitized server-side (never trust the client)
 * - Camp price/capacity/age-band are read server-side from camp.camps —
 *   never trusted from the request body
 * - Consent text is resolved server-side from lib/camps.js, not client-sent,
 *   so the stored consent_text_version always reflects what was actually
 *   shown to the guardian, not a value the client could tamper with
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { campSlug } = body;

    if (!campSlug || typeof campSlug !== 'string') {
      return NextResponse.json({ error: 'campSlug is required.' }, { status: 400 });
    }

    const campSupabase = getCampSupabase();

    const { data: camp, error: campError } = await campSupabase
      .from('camps')
      .select('id, slug, name, registration_open, capacity, age_min, age_max, starts_on')
      .eq('slug', campSlug)
      .single();

    if (campError || !camp) {
      return NextResponse.json({ error: 'Camp not found.' }, { status: 404 });
    }

    if (!camp.registration_open) {
      return NextResponse.json({ error: 'Registration is closed for this camp.' }, { status: 400 });
    }

    // Soft capacity check — refuses new registrations once the camp shows
    // full. The frontend should already be hiding the form at this point;
    // this is the server-side backstop for a stale page or a direct API call.
    const { count: paidCount, error: countError } = await campSupabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('camp_id', camp.id)
      .eq('status', 'paid');

    if (countError) {
      console.error('camp/register: capacity count error:', countError);
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    if ((paidCount || 0) >= camp.capacity) {
      return NextResponse.json({ error: 'This camp is full.' }, { status: 400 });
    }

    // Validate all fields server-side, including age against THIS camp's
    // published band and start date.
    const { valid, errors } = validateCampRegistration(body, camp);
    if (!valid) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    // Resolve consent wording server-side — the version stored is always
    // what this server actually presented, not whatever the client sent.
    const campContent = getCampContentBySlug(campSlug);
    const consentTextVersion = campContent?.consent?.version || 'unknown';

    const registrationData = {
      camp_id: camp.id,
      athlete_name: sanitize(body.athleteName),
      athlete_dob: body.athleteDob,
      athlete_gender: body.athleteGender,
      school: body.school ? sanitize(body.school) : null,
      guardian_name: sanitize(body.guardianName),
      guardian_phone: sanitize(body.guardianPhone),
      guardian_email: sanitize(body.guardianEmail).toLowerCase(),
      emergency_name: sanitize(body.emergencyName),
      emergency_phone: sanitize(body.emergencyPhone),
      medical_notes: body.medicalNotes ? sanitize(body.medicalNotes) : null,
      consent_agreed: body.consentAgreed === true,
      consent_text_version: consentTextVersion,
      status: 'pending',
      access_token: crypto.randomBytes(32).toString('hex'),
    };

    const { data: registration, error: insertError } = await campSupabase
      .from('registrations')
      .insert(registrationData)
      .select('id')
      .single();

    if (insertError) {
      console.error('camp/register: insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save your registration. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ registrationId: registration.id }, { status: 201 });
  } catch (err) {
    console.error('camp/register error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
