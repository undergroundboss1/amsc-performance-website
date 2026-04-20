import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
import { sanitize } from '../../../../lib/validators';

/**
 * POST /api/reports/download
 *
 * Fetches the full athlete result row from Supabase, calls the Python
 * serverless function to generate a PDF on-demand, and streams it back
 * to the browser as a base64-encoded JSON response.
 *
 * The client (reports/page.js) decodes the base64 and triggers a download.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { resultId } = body;

    if (!resultId) {
      return NextResponse.json({ error: 'Missing result ID.' }, { status: 400 });
    }

    const cleanId = sanitize(resultId);
    const supabase = getSupabase();

    // Fetch the full row — raw splits + segments + classifications
    const { data: result, error: lookupError } = await supabase
      .from('athlete_results')
      .select('*')
      .eq('id', cleanId)
      .single();

    if (lookupError || !result) {
      return NextResponse.json({ error: 'Result not found.' }, { status: 404 });
    }

    // Call the Python serverless function to generate the PDF
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const pyRes = await fetch(`${baseUrl}/api/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });

    if (!pyRes.ok) {
      const err = await pyRes.json().catch(() => ({}));
      console.error('PDF generation error:', err);
      return NextResponse.json(
        { error: 'Report generation failed. Please try again.' },
        { status: 500 }
      );
    }

    const { pdf, filename } = await pyRes.json();

    return NextResponse.json({ pdf, filename }, { status: 200 });
  } catch (err) {
    console.error('Report download error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
