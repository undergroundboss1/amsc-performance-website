import Link from 'next/link';

export default function ProgramDetail({ program }) {
  return (
    <>
      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex flex-col items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url('${program.image}')` }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative text-center text-white px-6">
          <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase bg-white/10 px-4 py-2 rounded-full">
            {program.label}
          </span>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-wide mt-6 mb-4">
            {program.name}
          </h1>
          <p className="text-gray-200 text-xl max-w-2xl mx-auto">
            {program.heroDesc}
          </p>
        </div>
      </section>

      {/* Overview */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading font-bold text-3xl mb-6">Overview</h2>
          <p className="text-secondary text-lg leading-relaxed">
            {program.overview}
          </p>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 px-6 bg-surface">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading font-bold text-3xl mb-8">What&apos;s Included</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {program.features.map((feature) => (
              <div
                key={feature}
                className="bg-white rounded-lg p-6 border border-gray-200"
              >
                <div className="flex items-start gap-3">
                  <span className="text-accent text-xl mt-0.5">✓</span>
                  <p className="text-text">{feature}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading font-bold text-3xl mb-6">Who It&apos;s For</h2>
          <p className="text-secondary text-lg leading-relaxed">
            {program.whoItsFor}
          </p>
        </div>
      </section>

      {/* Pricing & CTA */}
      <section className="py-20 px-6 bg-surface">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-heading font-bold text-3xl mb-4">Investment</h2>
          <p className="text-5xl font-bold text-text mb-2">
            {program.price}
            {program.price !== 'Contact' && (
              <span className="text-lg font-normal text-secondary"> / month</span>
            )}
          </p>
          <Link
            href={`/apply?program=${program.slug || ''}`}
            className="mt-8 inline-block bg-accent text-white px-12 py-4 rounded-lg text-lg font-semibold hover:bg-red-800 transition-colors"
          >
            {program.price === 'Contact' ? 'Contact Us' : 'Start Your Application'}
          </Link>
          <p className="text-secondary text-sm mt-6">
            All programs begin with an initial assessment and consultation.
          </p>
        </div>
      </section>

      {/* Back to Programs */}
      <section className="py-12 px-6 bg-white text-center">
        <Link
          href="/programs"
          className="text-accent font-semibold hover:underline"
        >
          ← Back to All Programs
        </Link>
      </section>
    </>
  );
}
