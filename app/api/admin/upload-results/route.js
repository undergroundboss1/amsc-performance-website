import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';

/**
 * POST /api/admin/upload-results
 *
 * Receives an Excel file (base64) + event date from the admin upload UI.
 * Calls the Python batch processor, generates access codes, inserts into athlete_results.
 *
 * Auth: Bearer token matching ADMIN_SECRET_KEY env var.
 */
export async function POST(request) {
  // Auth check
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || token !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { file, filename, eventDate } = await request.json();

    if (!file || !eventDate) {
      return NextResponse.json(
        { error: 'Missing file or event date.' },
        { status: 400 }
      );
    }

    // Call Python batch processor
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const pyRes = await fetch(`${baseUrl}/api/process-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, filename, eventDate }),
    });

    if (!pyRes.ok) {
      const err = await pyRes.json().catch(() => ({}));
      console.error('Batch processing error:', err);
      return NextResponse.json(
        { error: 'Failed to process Excel file. Check format and try again.', detail: err.detail },
        { status: 500 }
      );
    }

    const { results, warnings, errors } = await pyRes.json();

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: 'No athlete data found in the uploaded file.', warnings, errors },
        { status: 422 }
      );
    }

    // Generate access codes — get current max, then increment
    const supabase = getSupabase();
    const year = new Date(eventDate).getFullYear();

    const { data: existing } = await supabase
      .from('athlete_results')
      .select('access_code')
      .like('access_code', `AMSC-${year}-%`)
      .order('access_code', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (existing && existing.length > 0) {
      const lastCode = existing[0].access_code;
      const lastNum = parseInt(lastCode.split('-')[2], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    // Build insert rows
    const rows = results.map((r, i) => ({
      athlete_name:   r.name,
      gender:         r.gender,
      sport:          r.sport,
      event_date:     eventDate,
      access_code:    `AMSC-${year}-${String(nextNum + i).padStart(4, '0')}`,

      split_0_20:  r['0_20']  ?? null,
      split_0_40:  r['0_40']  ?? null,
      split_0_60:  r['0_60']  ?? null,
      split_0_80:  r['0_80']  ?? null,
      split_0_100: r['0_100'] ?? null,
      fly10:       r.fly10    ?? null,
      cmj_cm:      r.cmj_cm   ?? null,
      broad_cm:    r.broad_cm ?? null,

      seg_20_40:             r['20_40']               ?? null,
      seg_40_60:             r['40_60']               ?? null,
      seg_60_80:             r['60_80']               ?? null,
      seg_80_100:            r['80_100']              ?? null,
      peak_velocity_segment: r.peak_velocity_segment  ?? null,
      peak_velocity_zone:    r.peak_velocity_zone     ?? null,

      acceleration_category:      r.acceleration_category      ?? null,
      max_velocity_category:      r.max_velocity_category      ?? null,
      speed_maintenance_category: r.speed_maintenance_category ?? null,
      power_category:             r.power_category             ?? null,
      power_level:                r.power_level                ?? null,
      primary_imbalance_flag:     r.primary_imbalance_flag     ?? null,
      missing_fields:             r.missing_fields             ?? null,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('athlete_results')
      .insert(rows)
      .select('id, athlete_name, access_code, acceleration_category, max_velocity_category, power_category');

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save results to database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      inserted: inserted.length,
      results: inserted,
      warnings,
      errors,
    });

  } catch (err) {
    console.error('Upload results error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
