'use client';
import Link from 'next/link';
import { useConsent } from './ConsentContext';

export default function CookieConsent() {
  const { consent, accept, decline } = useConsent();

  if (consent !== null) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-white/10 px-6 py-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-secondary text-sm font-body leading-relaxed">
          This site uses third-party services (Tally.so, Behold.so) that may use cookies.
          See our{' '}
          <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> for details.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-5 py-2.5 min-h-[44px] text-sm text-secondary border border-white/10 rounded hover:border-white/30 transition-colors font-body cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-5 py-2.5 min-h-[44px] text-sm bg-accent text-white rounded hover:bg-red-700 transition-colors font-body cursor-pointer"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
