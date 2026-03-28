'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/programs', label: 'Programs' },
    { href: '/philosophy', label: 'Philosophy' },
    { href: '/member-portal', label: 'Member Portal' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <div className="font-heading font-bold text-2xl tracking-tight text-text">
            <span className="font-black text-3xl">AMSC</span>
            <div className="text-[10px] tracking-[0.3em] font-body font-normal -mt-1">PERFORMANCE</div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-10">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-accent'
                  : 'text-text hover:text-accent'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Apply Button */}
        <div className="hidden md:block">
          <Link
            href="/apply"
            className="bg-accent text-white px-8 py-3 rounded-full text-sm font-semibold hover:bg-red-800 transition-colors"
          >
            Apply
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-text"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block text-sm font-medium ${
                pathname === link.href ? 'text-accent' : 'text-text'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/apply"
            className="block bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold text-center"
            onClick={() => setMobileOpen(false)}
          >
            Apply
          </Link>
        </div>
      )}
    </nav>
  );
}
