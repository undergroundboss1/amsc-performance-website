'use client';
import Link from 'next/link';
import Image from 'next/image';
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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/images/amsc-icon.png"
            alt="AMSC Performance"
            width={40}
            height={40}
            className="h-10 w-auto transition-all duration-300"
          />
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-10">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-display text-sm font-semibold tracking-widest uppercase relative group transition-colors duration-200 ${
                pathname === link.href
                  ? 'text-accent'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {link.label}
              <span
                className={`absolute -bottom-1 left-0 h-[2px] bg-accent transition-all duration-300 ${
                  pathname === link.href ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
          ))}
        </div>

        {/* Apply Button */}
        <div className="hidden md:block">
          <Link
            href="/apply"
            className="bg-accent text-white px-7 py-2.5 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/30"
          >
            Apply
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white/80 hover:text-white cursor-pointer p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
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
        <div className="md:hidden bg-[#0a0a0a]/98 backdrop-blur-xl border-t border-white/5 px-6 py-6 space-y-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block font-display text-sm font-semibold tracking-widest uppercase py-2 ${
                pathname === link.href ? 'text-accent' : 'text-white/70'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/apply"
            className="block bg-accent text-white px-6 py-3 rounded-full font-display text-sm font-bold tracking-wider uppercase text-center mt-4"
            onClick={() => setMobileOpen(false)}
          >
            Apply
          </Link>
        </div>
      )}
    </nav>
  );
}
