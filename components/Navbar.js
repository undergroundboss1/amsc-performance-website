'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const links = [
  { href: '/', label: 'Home' },
  { href: '/programs', label: 'Programs' },
  { href: '/philosophy', label: 'Philosophy' },
  { href: '/reports', label: 'Reports' },
  { href: '/member-portal', label: 'Member Portal' },
];

const menuVariants = {
  closed: {
    opacity: 0,
    clipPath: 'inset(0% 0% 100% 0%)',
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  open: {
    opacity: 1,
    clipPath: 'inset(0% 0% 0% 0%)',
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

const linkContainerVariants = {
  closed: {},
  open: {
    transition: { staggerChildren: 0.055, delayChildren: 0.1 },
  },
};

const linkVariants = {
  closed: { opacity: 0, x: -16 },
  open: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 group">
          <Image
            src="/images/amsc-icon.png"
            alt="AMSC Performance"
            width={40}
            height={40}
            className="h-10 w-auto transition-all duration-300 group-hover:opacity-80"
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

        {/* CTA + Hamburger */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <Link
              href="/join"
              className="bg-accent text-white px-7 py-2.5 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-accent-dark transition-all duration-200 hover:shadow-lg hover:shadow-red-900/30"
            >
              Join
            </Link>
          </div>

          {/* Animated hamburger */}
          <button
            className="md:hidden text-white/80 hover:text-white cursor-pointer p-2 -mr-2 min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-[5px]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <motion.span
              className="block h-[1.5px] w-6 bg-current rounded-full origin-center"
              animate={mobileOpen ? { rotate: 45, y: 6.5 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            />
            <motion.span
              className="block h-[1.5px] w-6 bg-current rounded-full"
              animate={mobileOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.2 }}
            />
            <motion.span
              className="block h-[1.5px] w-6 bg-current rounded-full origin-center"
              animate={mobileOpen ? { rotate: -45, y: -6.5 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            />
          </button>
        </div>
      </div>

      {/* Animated Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="md:hidden bg-[#0a0a0a]/98 backdrop-blur-2xl border-t border-white/5 overflow-hidden"
          >
            <motion.div
              variants={linkContainerVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="px-6 py-8 space-y-1"
            >
              {links.map((link) => (
                <motion.div key={link.href} variants={linkVariants}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-3 font-display text-base font-semibold tracking-widest uppercase py-3 border-b border-white/5 transition-colors duration-200 ${
                      pathname === link.href
                        ? 'text-accent'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {pathname === link.href && (
                      <span className="w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                    )}
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div variants={linkVariants} className="pt-4">
                <Link
                  href="/join"
                  className="block bg-accent text-white px-6 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase text-center hover:bg-accent-dark transition-all duration-200"
                >
                  Join AMSC
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
