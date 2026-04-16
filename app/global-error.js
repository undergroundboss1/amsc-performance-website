'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          background: '#0a0a0a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>
          We ran into an unexpected error. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            background: '#DC2626',
            color: '#fff',
            border: 'none',
            padding: '0.75rem 2rem',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
