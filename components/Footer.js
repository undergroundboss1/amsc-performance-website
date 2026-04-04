'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Logo & Tagline */}
          <div>
            <Image
              src="/images/amsc-icon.png"
              alt="AMSC Performance"
              width={48}
              height={48}
              className="h-12 w-auto mb-4"
            />
            <p className="text-secondary text-sm mt-6 leading-relaxed font-body">
              Train Smarter. Move Better. Perform Longer.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-[0.2em] mb-5 text-white">Quick Links</h4>
            <div className="space-y-3">
              <Link href="/" className="block text-secondary text-sm hover:text-accent transition-colors font-body">Home</Link>
              <Link href="/programs" className="block text-secondary text-sm hover:text-accent transition-colors font-body">Programs</Link>
              <Link href="/philosophy" className="block text-secondary text-sm hover:text-accent transition-colors font-body">Philosophy</Link>
              <Link href="/member-portal" className="block text-secondary text-sm hover:text-accent transition-colors font-body">Member Portal</Link>
              <Link href="/apply" className="block text-secondary text-sm hover:text-accent transition-colors font-body">Apply</Link>
            </div>
          </div>

          {/* Programs */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-[0.2em] mb-5 text-white">Programs</h4>
            <div className="space-y-3">
              <Link href="/programs/one-on-one" className="block text-secondary text-sm hover:text-accent transition-colors font-body">1-on-1 Coaching</Link>
              <Link href="/programs/online" className="block text-secondary text-sm hover:text-accent transition-colors font-body">Online Training</Link>
              <Link href="/programs/consulting" className="block text-secondary text-sm hover:text-accent transition-colors font-body">Team Consulting</Link>
              <Link href="/programs/group" className="block text-secondary text-sm hover:text-accent transition-colors font-body">Group Training</Link>
              <Link href="/programs/youth" className="block text-secondary text-sm hover:text-accent transition-colors font-body">Youth Development</Link>
            </div>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-[0.2em] mb-5 text-white">Connect</h4>
            <a
              href="https://instagram.com/amscperformance"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/10 text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/5 py-6 text-center">
        <p className="text-white/20 text-xs font-body">
          &copy; 2026 AMSC Performance. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
