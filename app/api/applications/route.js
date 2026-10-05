import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { getPlanById } from '../../../lib/plans';
import { validateRegistration, sanitize } from '../../../lib/validators';

/**
 * POST /api/applications
 *
 * Creates a new client application (pending_review).
 * Called from the /join page after Step 2 (application form).
 *
 * SECURITY:
 * - All input is validated and sanitized server-side
 * - Plan must exist in our plans list
 * - No payment happens here — just application submission
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    const { valid, errors } = validateRegistration(body);
    if (!valid) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    // Verify plan exists
    const plan = getPlanById(body.planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected.', errors: ['Please select a valid training plan.'] },
        { status: 400 }
      );
    }

    // Sanitize all inputs
    const clientData = {
      full_name: sanitize(body.fullName),
      email: sanitize(body.email).toLowerCase(),
      phone: sanitize(body.phone),
      // Already validated above as a real, in-range date. Stored as the raw
      // YYYY-MM-DD the date input produces — not run through sanitize(), which
      // is for free text; a DATE column rejects anything malformed outright.
      date_of_birth: body.dateOfBirth,
      sport: sanitize(body.sport || ''),
      training_goals: sanitize(body.goals || ''),
      availability: sanitize(body.availability || ''),
      health_info: sanitize(body.healthInfo || ''),
      selected_plan: plan.id,
      plan_price: plan.price,
      application_status: 'pending_review',
      payment_status: 'pending',
      notes: [
        body.experience ? `Experience: ${sanitize(body.experience)}` : '',
        body.referralSource ? `Referral: ${sanitize(body.referralSource)}` : '',
      ].filter(Boolean).join(' | ') || null,
    };

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to submit your application. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Application submitted successfully.', clientId: data.id },
      { status: 201 }
    );
  } catch (err) {
    console.error('Application submission error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
