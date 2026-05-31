import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById } from '../../../../lib/plans';

/**
 * GET /api/payments/verify-token?token=xxx
 *
 * Verifies an approval token and returns the client's payment details.
 * Called by the /join/pay page to load the payment UI.
 *
 * SECURITY:
 * - Only returns non-sensitive info (name, plan, price)
 * - Does NOT return email, phone, health info, etc.
 * - Token must match an approved client
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: client, error } = await supabase
      .from('clients')
      .select('id, full_name, selected_plan, plan_price, payment_status, application_status')
      .eq('approval_token', token)
      .single();

    if (error || !client) {
      return NextResponse.json(
        { error: 'This payment link is invalid or has expired.' },
        { status: 404 }
      );
    }

    if (client.application_status !== 'approved') {
      return NextResponse.json(
        { error: 'This application has not been approved yet.' },
        { status: 403 }
      );
    }

    const plan = getPlanById(client.selected_plan);

    // Always use client.plan_price as the source of truth — it reflects any
    // custom or discounted rate the admin has set, rather than the standard plan price.
    return NextResponse.json({
      clientId: client.id,
      name: client.full_name.split(' ')[0], // Only first name for privacy
      planName: plan?.name || client.selected_plan,
      displayPrice: `KES ${client.plan_price.toLocaleString()}`,
      paymentStatus: client.payment_status,
    });
  } catch (err) {
    console.error('Token verification error:', err);
    return NextResponse.json(
      { error: 'Failed to verify payment link.' },
      { status: 500 }
    );
  }
}
