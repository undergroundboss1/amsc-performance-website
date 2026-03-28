import Link from 'next/link';

export const metadata = {
  title: 'Member Portal | AMSC Performance',
  description: 'Access your training programs, performance data, and more.',
};

export default function MemberPortalPage() {
  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center bg-white">
      <div className="max-w-xl">
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="font-heading font-black text-4xl md:text-5xl tracking-wide mb-4">
          MEMBER PORTAL
        </h1>
        <p className="text-secondary text-lg mb-2">Coming Soon</p>
        <p className="text-secondary mb-8">
          The AMSC Member Portal is currently under development. Soon you&apos;ll be able to access your training programs, track performance metrics, and communicate with your coaching team.
        </p>
        <Link
          href="/"
          className="inline-block bg-accent text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </section>
  );
}
