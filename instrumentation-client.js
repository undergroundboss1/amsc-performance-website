import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Replay 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media by default for privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  beforeSend(event, hint) {
    const error = hint?.originalException;

    // Ignore known third-party widget errors (Behold Instagram feed)
    // Behold's widget.js fails to parse JSON on Mobile Safari — not our bug
    if (
      error?.message?.includes('JSON Parse error') &&
      event?.exception?.values?.[0]?.stacktrace?.frames?.some(
        (f) => f?.filename?.includes('widget.js') || f?.filename?.includes('behold')
      )
    ) {
      return null;
    }

    return event;
  },
});

// Captures client-side navigation transitions as Sentry spans
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
