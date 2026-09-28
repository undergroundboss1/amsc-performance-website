import Link from 'next/link';
import JsonLd from '../../components/JsonLd';
import { faqs } from '../../lib/faq';
import { faqSchema, breadcrumbSchema } from '../../lib/structured-data';

export const metadata = {
  title: 'FAQ — Sports Performance & Strength and Conditioning in Nairobi',
  description:
    'Answers about AMSC Performance: strength & conditioning and sports performance training in Nairobi, Kenya — programs, prices, sports, youth training, online coaching, team consulting and how to sign up.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ | AMSC Performance',
    description: 'Programs, pricing, sports and sign-up — everything to know about training with AMSC Performance.',
    url: '/faq',
  },
};

export default function FaqPage() {
  return (
    <section className="min-h-screen bg-background py-24 px-6">
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd data={breadcrumbSchema([['Home', '/'], ['FAQ', '/faq']])} />
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h1>
        <p className="text-secondary text-base mb-12 font-body">
          Sports performance and strength &amp; conditioning training at AMSC Performance, Nairobi, Kenya.
        </p>

        <div className="space-y-10 text-secondary text-sm leading-relaxed font-body">
          {faqs.map(({ q, a }) => (
            <div key={q}>
              <h2 className="font-display text-lg font-bold text-white mb-3">{q}</h2>
              <p>{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col sm:flex-row gap-4">
          <Link
            href="/programs"
            className="bg-accent text-white px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-accent-dark transition-all duration-200 text-center"
          >
            View Programs
          </Link>
          <Link
            href="/apply"
            className="border border-white/25 text-white/90 px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-white/10 transition-all duration-200 text-center"
          >
            Apply to Train
          </Link>
        </div>
      </div>
    </section>
  );
}
