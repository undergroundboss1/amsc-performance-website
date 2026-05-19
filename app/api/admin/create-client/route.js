import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById } from '../../../../lib/plans';

/**
 * POST /api/admin/create-client
 *
 * Creates a client record directly, bypassing the public application form.
 * Use for: partnership clients, walk-ins, cash/bank clients, legacy imports.
 *
 * The client is set to application_status='approved' immediately — no
 * pending_review step. Payments are recorded separately via add-payment.
 *
 * Body:
 *   fullName          {string}  — required
 *   phone             {string}  — required if no email
 *   email             {string}  — required if no phone
 *   selectedPlan      {string}  — required: 'one-on-one' | 'group' | 'online' | 'youth'
 *   sport             {string}  — optional
 *   trainingStartDate {string}  — optional ISO date, anchors billing cycle
 *   discountPercent   {number}  — optional 0–99.99
 *   customMonthlyRate {number}  — optional positive KES, overrides discountPercent
 *   partnershipNote   {string}  — optional, e.g. "NPH athlete — pilot"
 *   notes             {string}  — optional admin notes
 *
 * Returns: { message, client }
 */
export async function POST(request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      selectedPlan,
      sport,
      trainingStartDate,
      discountPercent,
      customMonthlyRate,
      partnershipNote,
      notes,
    } = body;

    // ── Required field validation ───────────────────────────────────────────
    if (!fullName || !String(fullName).trim()) {
      return NextResponse.json({ error: 'fullName is required.' }, { status: 400 });
    }

    const trimmedEmail = email ? String(email).trim().toLowerCase() : null;
    const trimmedPhone = phone ? String(phone).trim() : null;

    if (!trimmedEmail && !trimmedPhone) {
      return NextResponse.json(
        { error: 'At least one of email or phone is required.' },
        { status: 400 }
      );
    }

    if (!selectedPlan) {
      return NextResponse.json({ error: 'selectedPlan is required.' }, { status: 400 });
    }

    // ── Validate plan ───────────────────────────────────────────────────────
    const plan = getPlanById(selectedPlan);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid selectedPlan.' }, { status: 400 });
    }

    // ── Optional field validation ───────────────────────────────────────────
    let parsedStartDate = null;
    if (trainingStartDate) {
      const d = new Date(trainingStartDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: 'Invalid trainingStartDate. Expected ISO date string.' },
          { status: 400 }
        );
      }
      parsedStartDate = d.toISOString();
    }

    let parsedDiscount = 0;
    if (discountPercent != null && discountPercent !== '') {
      parsedDiscount = Number(discountPercent);
      if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount >= 100) {
        return NextResponse.json(
          { error: 'discountPercent must be between 0 and 99.99.' },
          { status: 400 }
        );
      }
    }

    let parsedCustomRate = null;
    if (customMonthlyRate != null && customMonthlyRate !== '') {
      parsedCustomRate = Number(customMonthlyRate);
      if (isNaN(parsedCustomRate) || parsedCustomRate <= 0) {
        return NextResponse.json(
          { error: 'customMonthlyRate must be a positive number.' },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabase();

    // ── Duplicate email check ───────────────────────────────────────────────
    if (trimmedEmail) {
      const { data: existing } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('email', trimmedEmail)
        .single();

      if (existing) {
        return NextResponse.json(
          {
            error: `A client with this email already exists: ${existing.full_name}`,
          },
          { status: 409 }
        );
      }
    }

    // ── Insert client ───────────────────────────────────────────────────────
    const { data: client, error: insertError } = await supabase
      .from('clients')
      .insert({
        full_name: String(fullName).trim(),
        email: trimmedEmail,
        phone: trimmedPhone,
        sport: sport ? String(sport).trim() : null,
        selected_plan: plan.id,
        plan_price: plan.price,
        application_status: 'approved',   // pre-approved — bypass review
        payment_status: 'pending',
        training_start_date: parsedStartDate,
        discount_percent: parsedDiscount,
        custom_monthly_rate: parsedCustomRate,
        partnership_note: partnershipNote ? String(partnershipNote).trim() : null,
        notes: notes ? String(notes).trim() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('create-client insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create client.' }, { status: 500 });
    }

    console.log(`Manual client created: ${client.full_name} (${client.id})`);

    return NextResponse.json({
      message: 'Client created.',
      client,
    });
  } catch (err) {
    console.error('create-client error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
