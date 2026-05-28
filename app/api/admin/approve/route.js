import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabase } from '../../../../lib/supabase';
import { getPlanById } from '../../../../lib/plans';
import { sendEmail, buildApprovalEmail } from '../../../../lib/email';

/**
 * POST /api/admin/approve
 *
 * Approves a client application and generates a unique payment link.
 * Expects: { clientId: string }
 * Returns: { paymentUrl: string }
 *
 * SECURITY:
 * - Protected by admin secret key in Authorization header
 * - Generates a cryptographically random approval token
 * - Token is single-use (tied to one client)
 *
 * HOW TO USE:
 * After reviewing the application and doing the discovery call, run:
 *
 *   curl -X POST https://your-domain.com/api/admin/approve \
 *     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"clientId": "uuid-from-supabase"}'
 *
 * Or use the Supabase dashboard to get the client ID, then call this endpoint.
 * It returns a payment URL you send to the client.
 */
export async function POST(request) {
  try {
    // Verify admin authorization
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET_KEY;

    if (!adminSecret) {
      return NextResponse.json(
        { error: 'Admin secret key not configured. Add ADMIN_SECRET_KEY to .env.local' },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch client
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }

    if (client.application_status === 'approved' && client.approval_token) {
      // Already approved — resend the email with the existing payment link
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amsc-performance.vercel.app';
      const plan = getPlanById(client.selected_plan);
      const planName = plan?.name || client.selected_plan;
      const planPrice = plan?.displayPrice || `KES ${client.plan_price?.toLocaleString()}`;
      const paymentUrl = `${siteUrl}/join/pay?token=${client.approval_token}`;

      let emailSent = false;
      if (client.email) {
        const { ok } = await sendEmail({
          to: client.email,
          subject: "Your AMSC payment link",
          html: buildApprovalEmail({ fullName: client.full_name, planName, planPrice, paymentUrl }),
        });
        emailSent = ok;
      }

      return NextResponse.json({
        message: 'Client was already approved. Payment link resent.',
        paymentUrl,
        emailSent,
        client: {
          name: client.full_name,
          email: client.email,
          plan: planName,
        },
      });
    }

    // Generate cryptographically secure token
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amsc-performance.vercel.app';

    // Update client record
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        application_status: 'approved',
        approval_token: approvalToken,
      })
      .eq('id', clientId);

    if (updateError) {
      console.error('Approve update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve client.' },
        { status: 500 }
      );
    }

    const paymentUrl = `${siteUrl}/join/pay?token=${approvalToken}`;
    const plan = getPlanById(client.selected_plan);
    const planName = plan?.name || client.selected_plan;
    const planPrice = plan?.displayPrice || `KES ${client.plan_price?.toLocaleString()}`;

    // Send approval email automatically via Resend
    let emailSent = false;
    if (client.email) {
      const { ok, error: emailError } = await sendEmail({
        to: client.email,
        subject: "You're approved — complete your AMSC payment",
        html: buildApprovalEmail({
          fullName: client.full_name,
          planName,
          planPrice,
          paymentUrl,
        }),
      });
      emailSent = ok;
      if (!ok) {
        console.error('Approval email failed:', emailError);
      }
    }

    return NextResponse.json({
      message: 'Client approved successfully.',
      paymentUrl,
      emailSent,
      client: {
        name: client.full_name,
        email: client.email,
        phone: client.phone,
        plan: planName,
        price: planPrice,
      },
    });
  } catch (err) {
    console.error('Admin approve error:', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
