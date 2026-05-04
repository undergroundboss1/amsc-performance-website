import { NextResponse } from 'next/server';

/**
 * Edge Middleware — Rate Limiting
 *
 * In-memory sliding window rate limiter keyed by IP + route.
 * Per-instance on Vercel Edge (not globally shared across instances),
 * but provides strong protection against single-origin abuse at launch.
 * Upgrade to @upstash/ratelimit + Vercel KV for global accuracy later.
 */

// Module-scope store: Map<key, number[]> — timestamps of recent requests
const requestLog = new Map();

const LIMITS = {
  '/api/applications':       { max: 5,  windowMs: 60_000 },
  '/api/clients':            { max: 5,  windowMs: 60_000 },
  '/api/reports':            { max: 10, windowMs: 60_000 },
  '/api/payments/paystack':  { max: 5,  windowMs: 60_000 },
};

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function middleware(request) {
  // Only rate-limit POST requests
  if (request.method !== 'POST') {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const limit = LIMITS[pathname];
  if (!limit) return NextResponse.next();

  const ip = getClientIp(request);
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  // Retrieve and prune timestamps outside the window
  const timestamps = (requestLog.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= limit.max) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(limit.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((windowStart + limit.windowMs) / 1000)),
        },
      }
    );
  }

  // Record this request
  timestamps.push(now);
  requestLog.set(key, timestamps);

  // Periodically clean up stale keys to prevent memory growth
  if (requestLog.size > 10_000) {
    for (const [k, ts] of requestLog.entries()) {
      if (ts.every((t) => t <= windowStart)) {
        requestLog.delete(k);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Rate-limited public endpoints
    '/api/applications',
    '/api/clients',
    '/api/reports',
    '/api/payments/paystack',
    // Note: /monitoring is intentionally excluded — it's the Sentry tunnel route
  ],
};
