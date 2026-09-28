/**
 * Core business facts — the single source of truth for how AMSC describes
 * itself to search engines and AI assistants (JSON-LD, llms.txt, FAQ).
 * Program names, prices and descriptions live in lib/programs.js.
 */
export const SITE_URL = 'https://amscperformance.com';

export const business = {
  name: 'AMSC Performance',
  alternateName: 'AMSC',
  tagline: 'Train Smarter. Move Better. Perform Longer.',
  summary:
    "East and Central Africa's premier sports performance institution — sport-specific strength & " +
    'conditioning, athlete assessment, and performance testing for athletes in Nairobi, Kenya, ' +
    'with online coaching for athletes anywhere.',
  telephone: '+254751048777',
  email: 'admin@amscperformance.com',
  instagram: 'https://instagram.com/amscperformance',
  address: {
    streetAddress: 'The Courtyard, Vanga Road',
    addressLocality: 'Nairobi',
    addressRegion: 'Nairobi County',
    addressCountry: 'KE',
  },
  founder: {
    name: 'Arnold Mugabo',
    jobTitle: 'Founder',
    credential: 'ACE Certified Sports Performance Specialist',
  },
  sports: ['Football (soccer)', 'Basketball', 'Rugby', 'Tennis', 'Padel', 'Golf', 'Sprinting / track & field'],
  paymentMethods: ['M-Pesa', 'Card'],
  currency: 'KES',
  method: [
    'Assess — movement screening, force profiling and asymmetry mapping to set a data baseline.',
    'Develop — periodized training blocks progressing from foundation to force to performance expression.',
    'Transfer — speed metrics, workload control and objective benchmarks so gains carry into sport.',
  ],
  notableAthletes: [
    'Derrick Ogechi — Nairobi City Thunder, Basketball Africa League',
    'Albert Odero — Kenya National Team, Nairobi City Thunder (basketball)',
    'Mohammed Bajaber — Kenya National Team, Simba SC (football)',
    'James Gachago — Kenya National Team, Viimsi JK (football)',
    'Njoroge Kibugu & Mutahi Kibugu — pro golfers, Sunshine Development Tour',
    'Angela Wachira — NCAA Division 1 soccer',
    'Austin Omondi — NJCAA Division I, McLennan',
  ],
};

// Monthly price in KES parsed from the display string in lib/programs.js
// ("Ksh 30,000" → 30000). Returns null for "Contact" pricing.
export function monthlyPriceKes(program) {
  const digits = program.price.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : null;
}
