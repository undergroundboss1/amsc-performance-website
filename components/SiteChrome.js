'use client';

import { usePathname } from 'next/navigation';
import { BARE_ROUTES } from '../lib/waitlists';

/**
 * Renders its children (site navbar, footer, scroll bar, cookie banner)
 * everywhere except BARE_ROUTES — single-purpose waitlist landing pages that
 * carry their own minimal header. Every other route renders exactly as before.
 */
export default function SiteChrome({ children }) {
  const pathname = usePathname();
  if (BARE_ROUTES.includes(pathname)) return null;
  return children;
}
