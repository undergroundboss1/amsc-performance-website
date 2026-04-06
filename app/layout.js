import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CookieConsent from "../components/CookieConsent";
import { ConsentProvider } from "../components/ConsentContext";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://amsc-performance.vercel.app'),
  title: {
    default: 'AMSC Performance | Engineered Athlete Development',
    template: '%s | AMSC Performance',
  },
  description: 'Train Smarter. Move Better. Perform Longer. AMSC Performance provides structured athletic development systems for elite and aspiring athletes in Kenya.',
  keywords: ['athletic training', 'sports performance', 'strength and conditioning', 'Kenya', 'athlete development', 'AMSC Performance'],
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    siteName: 'AMSC Performance',
    title: 'AMSC Performance | Engineered Athlete Development',
    description: 'Structured athletic development systems for elite and aspiring athletes.',
    images: [{ url: '/images/amsc-logo-hero.png', width: 500, height: 200, alt: 'AMSC Performance' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AMSC Performance | Engineered Athlete Development',
    description: 'Structured athletic development systems for elite and aspiring athletes.',
    images: ['/images/amsc-logo-hero.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SportsActivityLocation',
              name: 'AMSC Performance',
              description: 'Engineered athlete development — structured training systems for elite and aspiring athletes in Kenya.',
              url: process.env.NEXT_PUBLIC_SITE_URL,
              logo: `${process.env.NEXT_PUBLIC_SITE_URL}/images/amsc-logo-hero.png`,
              image: `${process.env.NEXT_PUBLIC_SITE_URL}/images/amsc-logo-hero.png`,
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'KE',
              },
              sameAs: [
                'https://instagram.com/amscperformance',
              ],
              hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: 'Training Programs',
                itemListElement: [
                  {
                    '@type': 'Offer',
                    itemOffered: { '@type': 'Service', name: 'One-on-One Coaching' },
                    price: '30000',
                    priceCurrency: 'KES',
                  },
                  {
                    '@type': 'Offer',
                    itemOffered: { '@type': 'Service', name: 'Performance Group Training' },
                    price: '15000',
                    priceCurrency: 'KES',
                  },
                  {
                    '@type': 'Offer',
                    itemOffered: { '@type': 'Service', name: 'Online Performance Training' },
                    price: '12000',
                    priceCurrency: 'KES',
                  },
                  {
                    '@type': 'Offer',
                    itemOffered: { '@type': 'Service', name: 'Youth Athletic Development' },
                    price: '10000',
                    priceCurrency: 'KES',
                  },
                ],
              },
            }),
          }}
        />
      </head>
      <body className="font-body antialiased bg-background text-text">
        <ConsentProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:rounded"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main-content">
            {children}
          </main>
          <Footer />
          <CookieConsent />
        </ConsentProvider>
      </body>
    </html>
  );
}
