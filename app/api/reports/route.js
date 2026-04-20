import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { sanitize, isValidEmail } from '../../../lib/validators';

/**
 * POST /api/reports
 *
 * Looks up an athlete's performance results by email or access code.
 * Returns the athlete data (used by the /reports page to show results
 * and trigger PDF download).
 *
 * SECURITY:
 * - All input is validated and sanitized server-side
 * - RLS on athlete_results blocks direct browser access
 * - Only service_role key can query the table
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, accessCode } = body;

    if (!email && !accessCode) {
      return NextResponse.json(
        { error: 'Please provide an email address or access code.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    let query = supabase.from('athlete_results').select('*');

    if (accessCode) {
      const code = sanitize(accessCode).toUpperCase();
      if (!code || code.length < 3) {
        return NextResponse.json(
          { error: 'Please enter a valid access code.' },
          { status: 400 }
        );
      }
      query = query.eq('access_code', code);
    } else {
      const cleanEmail = sanitize(email).toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return NextResponse.json(
          { error: 'Please enter a valid email address.' },
          { status: 400 }
        );
      }
      query = query.eq('athlete_email', cleanEmail);
    }

    const { data, error } = await query.order('event_date', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No results found. Please check your details and try again.' },
        { status: 404 }
      );
    }

    // Strip internal fields before sending to client
    const results = data.map((row) => ({
      id: row.id,
      athlete_name: row.athlete_name,
      sport: row.sport,
      gender: row.gender,
      event_date: row.event_date,
      acceleration_category: row.acceleration_category,
      max_velocity_category: row.max_velocity_category,
      speed_maintenance_category: row.speed_maintenance_category,
      power_category: row.power_category,
      primary_imbalance_flag: row.primary_imbalance_flag,
    }));

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    console.error('Report lookup error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
