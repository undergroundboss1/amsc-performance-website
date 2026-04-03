'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/programs', label: 'Programs' },
    { href: '/philosophy', label: 'Philosophy' },
    { href: '/member-portal', label: 'Member Portal' },
  ];

  const isHome = pathname === '/';

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm'
          : isHome
          ? 'bg-transparent'
          : 'bg-white/95 backdrop-blur-xl border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <img
            src="/images/amsc-icon.png"
            alt="AMSC Performance"
            className="h-9 w-auto transition-all duration-300"
          />
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-10">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium relative group ${
                pathname === link.href
                  ? 'text-accent'
                  : scrolled || !isHome
                  ? 'text-text hover:text-accent'
                  : 'text-white hover:text-white/80'
              }`}
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-accent transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* Apply Button */}
        <div className="hidden md:block">
          <Link
            href="/apply"
            className="bg-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/20"
          >
            Apply
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className={`md:hidden ${scrolled || !isHome ? 'text-text' : 'text-white'}`}
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
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-4 shadow-lg">
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
