'use client';
import Link from 'next/link';
import AnimatedSection from '../../components/AnimatedSection';

export default function MemberPortalPage() {
  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center bg-background pt-20">
      <AnimatedSection>
        <div className="max-w-xl">
          <div className="w-20 h-20 bg-surface-light rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
            <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl tracking-widest mb-4">
            MEMBER PORTAL
          </h1>
          <p className="text-secondary font-display text-lg mb-2 tracking-wider">Coming Soon</p>
          <p className="text-secondary text-sm leading-relaxed mb-8 font-body">
            The AMSC Member Portal is currently under development. Here&apos;s what&apos;s coming:
          </p>
          <ul className="text-left text-secondary text-sm space-y-3 mb-10 font-body max-w-sm mx-auto">
            <li className="flex items-start gap-3"><span className="text-accent font-bold mt-0.5">&mdash;</span> Access your personalised training programs</li>
            <li className="flex items-start gap-3"><span className="text-accent font-bold mt-0.5">&mdash;</span> Track performance metrics and progress</li>
            <li className="flex items-start gap-3"><span className="text-accent font-bold mt-0.5">&mdash;</span> Communicate with your coaching team</li>
            <li className="flex items-start gap-3"><span className="text-accent font-bold mt-0.5">&mdash;</span> View assessment results and benchmarks</li>
          </ul>
          <div className="bg-surface border border-white/10 rounded-lg p-5 mb-10 text-left">
            <p className="font-display text-xs font-bold tracking-widest uppercase text-accent mb-2">Kocha Mwenzangu</p>
            <p className="text-white text-sm font-body mb-4">
              Coach Scholars: your weekly files, videos and homework are in the Coach Resource Hub.
            </p>
            <Link
              href="/member-portal/kocha"
              className="inline-flex items-center min-h-[44px] font-display font-bold text-sm tracking-wider uppercase text-white underline underline-offset-4 hover:text-accent transition-colors"
            >
              Open the Coach Resource Hub
            </Link>
          </div>
          <Link
            href="/"
            className="inline-block bg-accent text-white px-8 py-3 rounded-full font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark transition-all duration-200"
          >
            Return Home
          </Link>
        </div>
      </AnimatedSection>
    </section>
  );
}
