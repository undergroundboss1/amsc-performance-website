import Link from 'next/link';

const athletes = [
  { name: 'James Gachago', desc: 'Midfielder · Kenya National Team · Viimsi JK', image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=500&fit=crop' },
  { name: 'Albert Odero', desc: 'Guard · Kenya National Team · Nairobi City Thunder', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=500&fit=crop' },
  { name: 'Njoroge Kibugu', desc: 'Pro Golfer · Sunshine Development Tour', image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=500&fit=crop' },
  { name: 'Mohammed Bajaber', desc: 'Forward · Kenya National Team · Simba SC', image: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&h=500&fit=crop' },
  { name: 'Angela Wachira', desc: 'Midfielder · Mulligan Division 1 NCAA Soccer', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=500&fit=crop' },
  { name: 'Robi Maximilla', desc: 'Midfielder · Kenya U20 National Team · KPL', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=500&fit=crop' },
  { name: 'Austin Omondi', desc: 'NJCAA Division I · McLennan Men\'s Basketball', image: 'https://images.unsplash.com/photo-1559718062-361155fad299?w=400&h=500&fit=crop' },
  { name: 'Mutahi Kibugu', desc: 'Pro Golfer · Sunshine Development Tour', image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=400&h=500&fit=crop' },
];

const systemCards = [
  {
    title: 'ASSESSMENT',
    subtitle: 'Diagnose before we prescribe.',
    desc: 'Movement. Force. Asymmetries. Clarity before load.',
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=500&h=350&fit=crop',
  },
  {
    title: 'STRUCTURED PROGRESSION',
    subtitle: 'Every phase has purpose.',
    desc: 'From foundation to force to performance expression.',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&h=350&fit=crop',
  },
  {
    title: 'MEASURABLE PERFORMANCE',
    subtitle: 'Data guides decisions.',
    desc: 'Speed metrics. Workload control. Objective benchmarks.',
    image: 'https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=500&h=350&fit=crop',
  },
];

const programs = [
  {
    label: 'DIRECT.',
    name: 'One-on-One Coaching',
    desc: 'High-touch coaching for athletes requiring individualized oversight and precision progression.',
    features: [
      'Fully customized training programs.',
      'Direct coach access and accountability.',
      'Weekly performance reviews and adjustments.',
      'Priority scheduling and session flexibility.',
    ],
    price: 'Ksh 30,000',
    slug: 'one-on-one',
  },
  {
    label: 'STRUCTURED.',
    name: 'Performance Group Training',
    desc: 'Structured in-person training within a high-performance environment.',
    features: [
      'Periodized training cycles built for long-term development.',
      'Movement efficiency and force production progression.',
      'Structured performance benchmarks.',
      'Professional training environment with coaching oversight.',
    ],
    price: 'Ksh 15,000',
    slug: 'group',
  },
  {
    label: 'FLEXIBLE.',
    name: 'Online Performance Training',
    desc: 'Structured performance programming for athletes and driven individuals training remotely.',
    features: [
      'Monthly structured training plans.',
      'Video-guided exercise standards.',
      'Progressive overload and capacity tracking.',
      'Built for independent execution with system accountability.',
    ],
    price: 'Ksh 12,000',
    slug: 'online',
  },
  {
    label: 'DEVELOPMENTAL.',
    name: 'Youth Athletic Development',
    desc: 'Building athletic foundations for young athletes aged 10–17.',
    features: [
      'Age-appropriate strength and movement training.',
      'Speed and coordination development.',
      'Injury prevention through proper movement mechanics.',
      'Long-term athletic development pathway.',
    ],
    price: 'Ksh 10,000',
    slug: 'youth',
  },
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="mb-8">
          <h1 className="font-heading font-black text-7xl md:text-9xl tracking-tight text-text">
            AMSC
          </h1>
          <div className="text-lg md:text-2xl tracking-[0.4em] text-secondary mt-2 font-body">
            PERFORMANCE
          </div>
        </div>
        <p className="text-secondary text-lg md:text-xl tracking-[0.2em] uppercase mt-8">
          Engineered Athlete Development
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          <Link
            href="/apply"
            className="bg-accent text-white px-10 py-4 rounded-lg text-base font-semibold hover:bg-red-800 transition-colors"
          >
            Apply to Train with AMSC
          </Link>
          <Link
            href="/programs"
            className="border border-gray-400 text-secondary px-10 py-4 rounded-lg text-base font-semibold hover:border-text hover:text-text transition-colors"
          >
            Explore Programs
          </Link>
        </div>
      </section>

      {/* Trusted By Elite Athletes - Featured Athlete */}
      <section className="bg-black text-white py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="font-heading font-black text-4xl md:text-5xl tracking-wide mb-4">
            TRUSTED BY ELITE ATHLETES
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Athletes trained at AMSC compete at the highest levels across multiple sports.
          </p>
          <div className="mt-12 max-w-xl mx-auto">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=800&fit=crop"
                alt="Derrick Ogechi - Nairobi City Thunder"
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-heading font-bold text-2xl mt-6">Derrick Ogechi</h3>
            <p className="text-gray-400 mt-1">Nairobi City Thunder · Basketball Africa League</p>
          </div>
        </div>
      </section>

      {/* Athletes Trained by AMSC */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading font-black text-4xl md:text-5xl text-center mb-4 tracking-wide">
            ATHLETES TRAINED BY AMSC
          </h2>
          <p className="text-secondary text-center text-lg max-w-3xl mx-auto mb-16">
            Every athlete we train follows a structured, individualized process built around trust, communication, and long-term growth.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {athletes.map((athlete) => (
              <div key={athlete.name} className="text-center">
                <div className="aspect-[3/4] rounded-lg overflow-hidden mb-4">
                  <img
                    src={athlete.image}
                    alt={athlete.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-heading font-bold text-base">{athlete.name}</h3>
                <p className="text-secondary text-sm mt-1">{athlete.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 border-t border-gray-200 pt-6">
            <p className="text-secondary text-sm text-center">
              Images shown represent athletes trained by AMSC. Individual results vary. No endorsement implied.
            </p>
          </div>
        </div>
      </section>

      {/* THE SYSTEM */}
      <section className="py-20 px-6 bg-surface">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="font-heading font-black text-4xl md:text-5xl tracking-wide mb-4">
            THE SYSTEM
          </h2>
          <p className="text-secondary text-lg mb-16">
            A performance system built around the individual athlete.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {systemCards.map((card) => (
              <div key={card.title} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-8 text-center">
                  <h3 className="font-heading font-black text-xl tracking-wide mb-2">
                    {card.title}
                  </h3>
                  <p className="text-accent font-medium text-sm mb-4">{card.subtitle}</p>
                  <p className="text-secondary text-sm">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Philosophy Banner */}
      <section
        className="relative py-32 px-6 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&h=600&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-3xl mx-auto text-center text-white">
          <h2 className="font-heading font-black text-4xl md:text-5xl tracking-wide mb-6">
            TRAINING PHILOSOPHY
          </h2>
          <p className="text-gray-200 text-lg leading-relaxed mb-8">
            At AMSC, we believe performance is built through patience, precision, and purpose. Every session, every rep, every phase of training is designed to move you closer to your potential — not just for the next competition, but for the long term.
          </p>
          <Link
            href="/philosophy"
            className="inline-block bg-accent text-white px-10 py-4 rounded-full text-base font-semibold hover:bg-red-800 transition-colors"
          >
            Our Training Philosophy
          </Link>
        </div>
      </section>

      {/* Choose Your Training Pathway */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading font-black text-4xl md:text-5xl text-center tracking-wide mb-4">
            CHOOSE YOUR TRAINING PATHWAY
          </h2>
          <p className="text-secondary text-center text-lg max-w-3xl mx-auto mb-16">
            Every pathway operates within the AMSC Performance System. The difference is the level of coaching access, oversight, and progression control.
          </p>

          {/* One-on-One - Full Width */}
          <div className="bg-surface border-2 border-accent rounded-xl p-8 md:p-10 mb-8 max-w-2xl mx-auto">
            <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase">
              {programs[0].label}
            </span>
            <h3 className="font-heading font-bold text-2xl mt-2 mb-4">{programs[0].name}</h3>
            <p className="text-secondary mb-6">{programs[0].desc}</p>
            <ul className="space-y-3 mb-8">
              {programs[0].features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-secondary text-sm">
                  <span className="text-accent mt-1">•</span> {f}
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-300 pt-6">
              <p className="text-3xl font-bold text-text">
                {programs[0].price}<span className="text-sm font-normal text-secondary"> / month</span>
              </p>
              <Link
                href={`/apply?program=${programs[0].slug}`}
                className="mt-4 block bg-accent text-white text-center py-4 rounded-lg font-semibold hover:bg-red-800 transition-colors"
              >
                Start Your Application
              </Link>
            </div>
          </div>

          {/* Group and Online - Two Column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {programs.slice(1, 3).map((program) => (
              <div key={program.slug} className="bg-surface border border-gray-200 rounded-xl p-8 md:p-10">
                <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase">
                  {program.label}
                </span>
                <h3 className="font-heading font-bold text-2xl mt-2 mb-4">{program.name}</h3>
                <p className="text-secondary mb-6">{program.desc}</p>
                <ul className="space-y-3 mb-8">
                  {program.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-secondary text-sm">
                      <span className="text-accent mt-1">•</span> {f}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-gray-300 pt-6">
                  <p className="text-3xl font-bold text-text">
                    {program.price}<span className="text-sm font-normal text-secondary"> / month</span>
                  </p>
                  <Link
                    href={`/apply?program=${program.slug}`}
                    className="mt-4 block bg-accent text-white text-center py-4 rounded-lg font-semibold hover:bg-red-800 transition-colors"
                  >
                    Start Your Application
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Youth - Single */}
          <div className="bg-surface border border-gray-200 rounded-xl p-8 md:p-10 mb-8 max-w-2xl mx-auto">
            <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase">
              {programs[3].label}
            </span>
            <h3 className="font-heading font-bold text-2xl mt-2 mb-4">{programs[3].name}</h3>
            <p className="text-secondary mb-6">{programs[3].desc}</p>
            <ul className="space-y-3 mb-8">
              {programs[3].features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-secondary text-sm">
                  <span className="text-accent mt-1">•</span> {f}
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-300 pt-6">
              <p className="text-3xl font-bold text-text">
                {programs[3].price}<span className="text-sm font-normal text-secondary"> / month</span>
              </p>
              <Link
                href={`/apply?program=${programs[3].slug}`}
                className="mt-4 block bg-accent text-white text-center py-4 rounded-lg font-semibold hover:bg-red-800 transition-colors"
              >
                Start Your Application
              </Link>
            </div>
          </div>

          {/* Team Consulting */}
          <div className="bg-surface border border-gray-200 rounded-xl p-8 md:p-10 max-w-xl mx-auto text-center">
            <h3 className="font-heading font-bold text-2xl mb-4">Team & School Performance Consulting</h3>
            <p className="text-secondary mb-6">
              Performance system implementation for teams and institutions.
            </p>
            <Link
              href="/apply?program=consulting"
              className="block bg-accent text-white text-center py-4 rounded-lg font-semibold hover:bg-red-800 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Ready to Elevate CTA */}
      <section
        className="relative py-32 px-6 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&h=600&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-3xl mx-auto text-center text-white">
          <h2 className="font-heading font-black text-4xl md:text-5xl tracking-wide mb-6">
            READY TO ELEVATE YOUR PERFORMANCE?
          </h2>
          <p className="text-gray-200 text-lg leading-relaxed mb-8">
            Whether you are preparing for competition, rebuilding after injury, or laying the foundation for long-term success — AMSC provides the structure, clarity, and support required to move forward with purpose.
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
