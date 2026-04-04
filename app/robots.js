export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: 'https://amsc-performance.vercel.app/sitemap.xml',
  };
}
