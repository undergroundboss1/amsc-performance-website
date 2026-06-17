import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById } from '../../../../lib/plans';
import { sendEmail, buildPaymentTransitionEmail } from '../../../../lib/email';

/**
 * POST /api/admin/transition-online
 *
 * Moves an existing (historical / cash) client onto the website payment system
 * WITHOUT creating a new profile. Generates their secure pay link and emails it
 * with a "your price doesn't change, only the payment method does" message.
 *
 * Requirements:
 *   - The client must have a real email on file (not an import placeholder).
 *     The admin sets this first via the Contact editor.
 *
 * Effects:
 *   - Generates approval_token if missing (reuses existing one otherwise).
 *   - Ensures application_status = 'approved'.
 *   - Stamps online_transition_sent_at.
 *   - Does NOT touch last_paid_at / payment history — billing continues from
 *     where it is; the existing renewal flow takes over at their next due date.
 *
 * Body: { clientId }
 * Returns: { message, paymentUrl, emailSent }
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, full_name, email, selected_plan, plan_price, approval_token, application_status')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    // Must have a real email before we can send them a pay link.
    if (!client.email || client.email.endsWith('.placeholder')) {
      return NextResponse.json(
        { error: 'Add a real email address to this client (Contact → Edit) before switching them to online payments.' },
        { status: 400 }
      );
    }

    // Reuse an existing token if present, otherwise mint a new one.
    const approvalToken = client.approval_token || crypto.randomBytes(32).toString('hex');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amscperformance.com';
    const paymentUrl = `${siteUrl}/join/pay?token=${approvalToken}`;

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        application_status: 'approved',
        approval_token: approvalToken,
        online_transition_sent_at: new Date().toISOString(),
      })
      .eq('id', clientId);

    if (updateError) {
      console.error('transition-online update error:', updateError);
      return NextResponse.json({ error: 'Failed to update client.' }, { status: 500 });
    }

    const plan = getPlanById(client.selected_plan);
    const planName = plan?.name || client.selected_plan;
    const planPrice = `KES ${(client.plan_price || plan?.price || 0).toLocaleString()}`;

    const { ok, error: emailError } = await sendEmail({
      to: client.email,
      subject: 'AMSC is moving to online payments — your price stays the same',
      html: buildPaymentTransitionEmail({ fullName: client.full_name, planName, planPrice, paymentUrl }),
    });

    if (!ok) {
      console.error('Transition email failed:', emailError);
      return NextResponse.json(
        { error: 'Client updated but the email failed to send. Try again.', paymentUrl, emailSent: false },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: `Transition email sent to ${client.email}.`,
      paymentUrl,
      emailSent: true,
    });
  } catch (err) {
    console.error('transition-online error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
