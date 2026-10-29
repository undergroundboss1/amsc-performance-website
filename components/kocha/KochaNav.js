'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KOCHA_BASE } from '../../lib/kocha/constants';

/**
 * The hub's own sub-navigation, under the site Navbar (which already links
 * to the Member Portal). Scrolls sideways on narrow phones instead of
 * wrapping.
 */
const LINKS = [
  { href: KOCHA_BASE, label: 'Dashboard', exact: true },
  { href: `${KOCHA_BASE}/downloads`, label: 'Downloads' },
  { href: `${KOCHA_BASE}/quick-cards`, label: 'Quick cards' },
  { href: `${KOCHA_BASE}/glossary`, label: 'Glossary' },
];

export default function KochaNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Kocha Mwenzangu" className="-mx-4 sm:mx-0 mb-8 border-b border-white/10 overflow-x-auto">
      <ul className="flex gap-1 px-4 sm:px-0 min-w-max">
        {LINKS.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center min-h-[44px] px-3 font-display text-sm font-bold tracking-wider uppercase border-b-2 -mb-px transition-colors ${
                  active ? 'text-white border-accent' : 'text-secondary border-transparent hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
