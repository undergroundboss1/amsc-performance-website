import { programsData } from '../lib/programs';

export default function sitemap() {
  const baseUrl = 'https://amscperformance.com';
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/programs`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    ...Object.keys(programsData).map((slug) => ({
      url: `${baseUrl}/programs/${slug}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: slug === 'consulting' ? 0.7 : 0.8,
    })),
    { url: `${baseUrl}/faq`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/philosophy`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/camps`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/offpitch`, lastModified, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/apply`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/join`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/reports`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/payment-policy`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
  ];
}
