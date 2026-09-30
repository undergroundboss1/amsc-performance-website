import { Oswald, Antonio } from 'next/font/google';

/**
 * AMSC brand display + data faces, loaded only by pages that import this
 * module (the waitlist pages) — the rest of the site keeps its current
 * Barlow / Barlow Condensed pairing untouched. Barlow itself is already
 * loaded site-wide in app/layout.js as --font-barlow.
 */
export const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
});

export const antonio = Antonio({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-antonio',
  display: 'swap',
});
