import Link from 'next/link';

export const metadata = {
  title: 'Training Philosophy | AMSC Performance',
  description: 'Training Is Not Random. It\'s Engineered.',
};

const pillars = [
  {
    number: '01',
    title: 'ASSESS',
    desc: 'Every athlete begins with a clear understanding of their current capacity.',
    items: ['Movement screening', 'Strength profiling', 'Speed & power testing'],
    quote: "You can't improve what you don't measure.",
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&h=400&fit=crop',
  },
  {
    number: '02',
    title: 'DEVELOP',
    desc: 'We build the physical qualities that underpin performance.',
    items: ['Strength', 'Mobility', 'Control', 'Power'],
    quote: 'Strength is the foundation of all athletic expression.',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&h=400&fit=crop',
  },
  {
    number: '03',
    title: 'TRANSFER',
    desc: 'We convert physical development into sport performance.',
    items: ['Speed', 'Acceleration', 'Change of direction', 'Reactivity'],
    quote: "If it doesn't transfer, it doesn't matter.",
    image: 'https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=500&h=400&fit=crop',
  },
];

export default function PhilosophyPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center bg-black text-white px-6 text-center">
        <h1 className="font-heading font-bold text-4xl md:text-6xl leading-tight mb-6">
          Training Is Not Random.<br />It&apos;s Engineered.
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          At AMSC PERFORMANCE, every athlete follows a structured system designed to develop strength, improve movement, and transfer performance to sport.
        </p>
      </section>

      {/* Philosophy Statements */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-3xl mx-auto text-center space-y-10">
          <div>
            <p className="font-heading text-2xl md:text-3xl font-bold">
              We don&apos;t chase intensity.
            </p>
            <p className="font-heading text-2xl md:text-3xl font-bold">
              We build capacity.
            </p>
          </div>
          <div>
            <p className="font-heading text-2xl md:text-3xl font-bold">
              We don&apos;t guess.
            </p>
            <p className="font-heading text-2xl md:text-3xl font-bold">
              We assess, develop, and transfer.
            </p>
          </div>
          <p className="text-secondary text-lg">
            Because long-term performance isn&apos;t built in moments — it&apos;s built through systems.
          </p>
        </div>
      </section>

      {/* The AMSC Development System */}
      <section className="py-20 px-6 bg-surface">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading font-black text-4xl md:text-5xl text-center tracking-wide mb-4">
            THE AMSC DEVELOPMENT SYSTEM
          </h2>
          <p className="text-secondary text-center text-lg max-w-3xl mx-auto mb-16">
            Every athlete progresses through a structured system designed to build and transfer performance.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map((pillar) => (
              <div key={pillar.number} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="aspect-[5/4] overflow-hidden">
                  <img
                    src={pillar.image}
                    alt={pillar.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-8">
                  <span className="text-accent text-xs font-bold tracking-[0.2em]">{pillar.number}</span>
                  <h3 className="font-heading font-black text-2xl tracking-wide mt-1 mb-3">
                    {pillar.title}
                  </h3>
                  <p className="text-secondary mb-4">{pillar.desc}</p>
                  <ul className="space-y-2 mb-6">
                    {pillar.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-secondary text-sm">
                        <span className="text-accent">–</span> {item}
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-text font-semibold text-sm italic">{pillar.quote}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineered Performance Outcomes */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="font-heading font-black text-4xl md:text-5xl tracking-wide mb-4">
            ENGINEERED PERFORMANCE OUTCOMES
          </h2>
          <p className="text-secondary text-lg mb-16">
            Our system is built on measurable progress — not assumptions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Metrics Dashboard', desc: 'Data visualization coming soon' },
              { title: 'Performance Tracking', desc: 'Data visualization coming soon' },
              { title: 'Progress Analysis', desc: 'Data visualization coming soon' },
            ].map((card) => (
              <div key={card.title} className="bg-surface rounded-xl p-10 border border-gray-200">
                <h3 className="font-heading font-bold text-lg mb-2">{card.title}</h3>
                <p className="text-secondary text-sm">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="relative py-32 px-6 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&h=600&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-3xl mx-auto text-center text-white">
          <h2 className="font-heading font-black text-4xl md:text-5xl tracking-wide mb-6">
            EXPERIENCE THE SYSTEM
          </h2>
          <p className="text-gray-200 text-lg leading-relaxed mb-8">
            Join athletes who train with purpose, progress with intention, and perform with confidence.
          </p>
          <Link
            href="/apply"
            className="inline-block bg-accent text-white px-10 py-4 rounded-full text-base font-semibold hover:bg-red-800 transition-colors"
          >
            Apply to Train with AMSC
          </Link>
        </div>
      </section>
    </>
  );
}
