import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://tally.so https://w.behold.so https://js.paystack.co`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "frame-src https://tally.so https://checkout.paystack.com",
              "connect-src 'self' https://tally.so https://w.behold.so https://*.instagram.com https://*.cdninstagram.com https://*.supabase.co https://api.paystack.co",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://tally.so",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload wider set of client source files for readable stack traces
  widenClientFileUpload: true,

  // Proxy Sentry requests through our own domain to bypass ad-blockers
  tunnelRoute: '/monitoring',

  // Suppress build output outside of CI
  silent: !process.env.CI,

  // Hide source map files from the deployed bundle
  hideSourceMaps: true,
});
