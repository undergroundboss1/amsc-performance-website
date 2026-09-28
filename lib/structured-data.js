/**
 * schema.org JSON-LD builders. Search engines and AI assistants read these to
 * understand what AMSC offers, where, for whom, and at what price — so they
 * are generated from lib/programs.js, lib/plans.js and lib/business.js rather
 * than hand-kept.
 */
import { programsData } from './programs';
import { business, SITE_URL } from './business';
import { getPlanById, minPlanPrice, maxPlanPrice } from './plans';

const ORG_ID = `${SITE_URL}/#organization`;

const areaServed = [
  { '@type': 'City', name: 'Nairobi' },
  { '@type': 'Country', name: 'Kenya' },
  { '@type': 'Place', name: 'East Africa' },
];

function offerFor(slug) {
  // Consulting has no plan — it's priced on request.
  const price = getPlanById(slug)?.price ?? null;
  const url = `${SITE_URL}/programs/${slug}`;
  if (price === null) {
    return { '@type': 'Offer', url, availability: 'https://schema.org/InStock', description: 'Priced on request.' };
  }
  return {
    '@type': 'Offer',
    url,
    price: String(price),
    priceCurrency: business.currency,
    availability: 'https://schema.org/InStock',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: String(price),
      priceCurrency: business.currency,
      unitText: 'MONTH',
      billingDuration: 'P1M',
    },
  };
}

export function programServiceSchema(slug) {
  const program = programsData[slug];
  const isOnline = slug === 'online';
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/programs/${slug}#service`,
    name: program.name,
    serviceType: 'Sports performance / strength and conditioning training',
    description: `${program.overview} Who it's for: ${program.whoItsFor}`,
    url: `${SITE_URL}/programs/${slug}`,
    image: `${SITE_URL}${program.image}`,
    provider: { '@id': ORG_ID },
    areaServed: isOnline ? [...areaServed, { '@type': 'Place', name: 'Worldwide (online)' }] : areaServed,
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: slug === 'consulting' ? `${SITE_URL}/apply?program=consulting` : `${SITE_URL}/join?plan=${slug}`,
    },
    offers: offerFor(slug),
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['SportsActivityLocation', 'LocalBusiness'],
    '@id': ORG_ID,
    name: business.name,
    alternateName: business.alternateName,
    slogan: business.tagline,
    description: business.summary,
    url: SITE_URL,
    logo: `${SITE_URL}/images/amsc-logo-hero.png`,
    image: `${SITE_URL}/images/amsc-logo-hero.png`,
    telephone: business.telephone,
    email: business.email,
    priceRange: `KES ${minPlanPrice.toLocaleString('en-KE')}–${maxPlanPrice.toLocaleString('en-KE')} per month`,
    currenciesAccepted: business.currency,
    paymentAccepted: business.paymentMethods.join(', '),
    address: { '@type': 'PostalAddress', ...business.address },
    geo: { '@type': 'GeoCoordinates', latitude: '-1.2921', longitude: '36.8219' },
    areaServed,
    sameAs: [business.instagram],
    founder: {
      '@type': 'Person',
      name: business.founder.name,
      jobTitle: business.founder.jobTitle,
      hasCredential: { '@type': 'EducationalOccupationalCredential', name: business.founder.credential },
    },
    knowsAbout: [
      'Sports performance training',
      'Strength and conditioning',
      'Speed and agility training',
      'Athletic performance testing',
      'Athlete monitoring',
      'Youth athletic development',
      'Injury prevention and return to play',
      ...business.sports,
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: business.telephone,
      email: business.email,
      areaServed: 'KE',
      availableLanguage: ['English'],
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Sports Performance Training Programs',
      itemListElement: Object.entries(programsData).map(([slug, program]) => ({
        ...offerFor(slug),
        itemOffered: {
          '@type': 'Service',
          '@id': `${SITE_URL}/programs/${slug}#service`,
          name: program.name,
          description: program.heroDesc,
          url: `${SITE_URL}/programs/${slug}`,
        },
      })),
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: business.name,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-KE',
  };
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${SITE_URL}${path}`,
    })),
  };
}

export function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
