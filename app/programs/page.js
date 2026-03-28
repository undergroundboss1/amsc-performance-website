import Link from 'next/link';

const programs = [
  {
    slug: 'one-on-one',
    label: 'DIRECT.',
    name: 'One-on-One Coaching',
    desc: 'High-touch coaching for athletes requiring individualized oversight and precision progression.',
    price: 'Ksh 30,000',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop',
  },
  {
    slug: 'group',
    label: 'STRUCTURED.',
    name: 'Performance Group Training',
    desc: 'Structured in-person training within a high-performance environment.',
    price: 'Ksh 15,000',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop',
  },
  {
    slug: 'online',
    label: 'FLEXIBLE.',
    name: 'Online Performance Training',
    desc: 'Structured performance programming for athletes and driven individuals training remotely.',
    price: 'Ksh 12,000',
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop',
  },
  {
    slug: 'youth',
    label: 'DEVELOPMENTAL.',
    name: 'Youth Athletic Development',
    desc: 'Building athletic foundations for young athletes aged 10–17.',
    price: 'Ksh 10,000',
    image: 'https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=600&h=400&fit=crop',
  },
  {
    slug: 'consulting',
    label: 'INSTITUTIONAL.',
    name: 'Team & School Consulting',
    desc: 'Performance system implementation for teams and institutions.',
    price: 'Contact',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop',
  },
];

export const metadata = {
  title: 'Training Pathways | AMSC Performance',
  description: 'Choose the training system designed for your level of performance.',
};

export default function ProgramsPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative min-h-[70vh] flex flex-col items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=1400&h=800&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative text-center text-white px-6">
          <h1 className="font-heading font-black text-5xl md:text-7xl tracking-wide mb-6">
            TRAINING PATHWAYS
          </h1>
          <p className="text-gray-200 text-xl max-w-2xl mx-auto mb-8">
            Choose the training system designed for your level of performance.
          </p>
          <a
            href="#programs"
            className="inline-block border border-white text-white px-10 py-4 rounded-full text-base font-semibold hover:bg-white hover:text-text transition-colors"
          >
            Explore Programs
          </a>
        </div>
      </section>

      {/* Why AMSC Works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="aspect-[4/5] rounded-lg overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=750&fit=crop"
              alt="Training at AMSC"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase">WHY AMSC WORKS</span>
            <h2 className="font-heading font-bold text-4xl mt-3 mb-6">A System Built for Results</h2>
            <p className="text-secondary text-lg leading-relaxed mb-6">
              Every program at AMSC operates within the same performance system. We assess before we prescribe, progress with intention, and measure what matters.
            </p>
            <p className="text-secondary text-lg leading-relaxed">
              The difference between pathways is the level of coaching access, oversight, and progression control—not the quality of the system.
            </p>
          </div>
        </div>
      </section>

      {/* Measure Before You Train */}
      <section className="py-20 px-6 bg-surface">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase">OUR APPROACH</span>
            <h2 className="font-heading font-bold text-4xl mt-3 mb-6">Measure Before You Train</h2>
            <p className="text-secondary text-lg leading-relaxed mb-6">
              Every AMSC program begins with objective assessment. We use precision timing systems and structured movement screening to establish baseline performance data before any training prescription.
            </p>
            <p className="text-secondary text-lg leading-relaxed">
              This data-driven approach ensures that every program is built on measurable standards — not assumptions. Progress is tracked, verified, and adjusted based on real output.
            </p>
          </div>
          <div className="aspect-[4/5] rounded-lg overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=750&fit=crop"
              alt="Assessment equipment"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Programs List */}
      <section id="programs" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading font-black text-4xl md:text-5xl text-center tracking-wide mb-4">
            OUR PROGRAMS
          </h2>
          <p className="text-secondary text-center text-lg max-w-3xl mx-auto mb-16">
            Every pathway operates within the AMSC Performance System.
          </p>
          <div className="space-y-8">
            {programs.map((program) => (
              <div
                key={program.slug}
                className="bg-surface rounded-xl overflow-hidden border border-gray-200 grid grid-cols-1 md:grid-cols-3"
              >
                <div className="aspect-video md:aspect-auto overflow-hidden">
                  <img
                    src={program.image}
                    alt={program.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-8 md:col-span-2 flex flex-col justify-center">
                  <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase">
                    {program.label}
                  </span>
                  <h3 className="font-heading font-bold text-2xl mt-2 mb-3">{program.name}</h3>
                  <p className="text-secondary mb-4">{program.desc}</p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200">
                    <p className="text-2xl font-bold text-text">
                      {program.price}
                      {program.price !== 'Contact' && (
                        <span className="text-sm font-normal text-secondary"> / month</span>
                      )}
                    </p>
                    <Link
                      href={`/programs/${program.slug}`}
                      className="bg-accent text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-red-800 transition-colors"
                    >
                      Learn More
                    </Link>
                  </div>
                </div>
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
            READY TO START?
          </h2>
          <p className="text-gray-200 text-lg leading-relaxed mb-8">
            Apply now and take the first step toward structured, measurable athletic development.
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
