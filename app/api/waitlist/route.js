import { NextResponse } from 'next/server';
import { getWaitlistSupabase } from '../../../lib/supabase';
import { getWaitlistProgram } from '../../../lib/waitlists';
import { sanitize, validateWaitlistSignup } from '../../../lib/validators';
import { classifySource, detectInAppBrowser } from '../../../lib/waitlist-source';

/**
 * POST /api/waitlist
 *
 * Adds one person to one program's waitlist (lib/waitlists.js).
 *
 * SPAM & DUPLICATES — layered, cheapest first:
 * - middleware.js rate-limits this route per IP.
 * - Cross-site posts are refused (Origin must match this host).
 * - A hidden honeypot field and a minimum fill time catch simple bots. Both
 *   get a fake success response, so a bot learns nothing from the reply.
 * - UNIQUE (program_slug, email) in the database. A repeat signup returns the
 *   same success response as a first one and leaves the original row alone:
 *   nobody can overwrite someone else's entry, and the reply never reveals
 *   whether an email is already on the list.
 *
 * PRIVACY: stores no IP address and no full user agent — see
 * lib/waitlist-source.js for what attribution data is kept.
 */

// A human can't read the page and fill the form in less than this.
const MIN_FILL_MS = 2500;

const OK = () => NextResponse.json({ ok: true }, { status: 201 });

function clip(value, max) {
  if (typeof value !== 'string') return null;
  const v = sanitize(value).slice(0, max);
  return v || null;
}

function hostOf(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase().slice(0, 120);
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const host = (request.headers.get('host') || '').toLowerCase();
    const origin = request.headers.get('origin');
    if (origin && hostOf(origin) !== host.split(':')[0]) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const program = getWaitlistProgram(body.program);
    if (!program) {
      return NextResponse.json({ error: 'Unknown program.' }, { status: 404 });
    }
    if (!program.open) {
      return NextResponse.json({ error: 'This waitlist is closed.' }, { status: 400 });
    }

    // Bot traps: honeypot filled, or submitted faster than a person could.
    const elapsed = Number(body.elapsedMs);
    if (body.website || !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
      return OK();
    }

    const { valid, errors, isMinor } = validateWaitlistSignup(body, program);
    if (!valid) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const attribution = body.attribution && typeof body.attribution === 'object' ? body.attribution : {};
    const userAgent = request.headers.get('user-agent') || '';
    const utmSource = clip(attribution.utmSource, 60);
    const srcParam = clip(attribution.src, 60);
    const referrerHost = hostOf(attribution.referrer);
    const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();

    const row = {
      program_slug: program.slug,
      first_name: sanitize(body.firstName).slice(0, 60),
      email: sanitize(body.email).toLowerCase(),
      instagram_handle:
        program.form.askInstagram && body.instagram
          ? sanitize(body.instagram).replace(/^@/, '').toLowerCase()
          : null,
      position: body.position,
      level: body.level,
      age_band: body.ageBand,
      early_access_opt_in: program.form.askEarlyAccess ? body.earlyAccess === true : false,
      consent_text_version: program.consent.version,
      guardian_consent: isMinor ? true : null,
      source: classifySource({
        param: utmSource || srcParam,
        referrerHost,
        userAgent,
        siteHost: host.split(':')[0].replace(/^www\./, ''),
      }),
      utm_source: utmSource || srcParam,
      utm_medium: clip(attribution.utmMedium, 60),
      utm_campaign: clip(attribution.utmCampaign, 100),
      utm_content: clip(attribution.utmContent, 100),
      referrer_host: referrerHost,
      in_app_browser: detectInAppBrowser(userAgent),
      country: /^[A-Z]{2}$/.test(country) ? country : null,
    };

    const { error } = await getWaitlistSupabase().from('signups').insert(row);

    // 23505 = unique_violation: already on this list. Same reply as success.
    if (error && error.code !== '23505') {
      console.error('waitlist: insert error:', error);
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }

    return OK();
  } catch (err) {
    console.error('waitlist error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
