import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CookieConsent from "../components/CookieConsent";
import { ConsentProvider } from "../components/ConsentContext";
import ScrollProgressBar from "../components/ScrollProgressBar";
import GoogleAnalytics from "../components/GoogleAnalytics";
import JsonLd from "../components/JsonLd";
import SiteChrome from "../components/SiteChrome";
import { SITE_URL } from "../lib/business";
import { organizationSchema, websiteSchema } from "../lib/structured-data";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AMSC Performance | Elite Sports Performance Training in Nairobi, Kenya',
    template: '%s | AMSC Performance',
  },
  description: 'East and Central Africa\'s premier sports performance institution. Strength & conditioning, athlete monitoring, and combine testing for elite athletes in Nairobi, Kenya.',
  keywords: [
    'sports performance Nairobi',
    'strength and conditioning Kenya',
    'athlete training Nairobi',
    'AMSC Performance',
    'sports science Kenya',
    'elite athlete development Nairobi',
    'strength coach Nairobi',
    'ACE certified trainer Kenya',
    'basketball training Nairobi',
    'football conditioning Kenya',
    'sprint training Nairobi',
    'sports performance East Africa',
    'athlete testing Kenya',
    'AMSC Combine',
    'personal trainer Nairobi',
  ],
  // No site-wide canonical: a canonical set here is inherited by every page
  // that doesn't override it, which tells crawlers all pages duplicate the
  // homepage. Pages set their own canonical instead.
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: SITE_URL,
    siteName: 'AMSC Performance',
    title: 'AMSC Performance | Elite Sports Performance Training in Nairobi, Kenya',
    description: 'East and Central Africa\'s premier sports performance institution — strength & conditioning, athlete monitoring, and combine testing for elite athletes.',
    images: [{ url: '/images/amsc-logo-hero.png', width: 800, height: 600, alt: 'AMSC Performance — Elite Sports Training in Nairobi' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AMSC Performance | Elite Sports Performance Training in Nairobi, Kenya',
    description: 'East and Central Africa\'s premier sports performance institution — strength & conditioning for elite athletes.',
    images: ['/images/amsc-logo-hero.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
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
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
      </head>
      <body className="font-body antialiased bg-background text-text">
        <ConsentProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:rounded"
          >
            Skip to content
          </a>
          <SiteChrome>
            <ScrollProgressBar />
            <Navbar />
          </SiteChrome>
          <main id="main-content">
            {children}
          </main>
          <SiteChrome>
            <Footer />
            <CookieConsent />
          </SiteChrome>
          <GoogleAnalytics />
        </ConsentProvider>
      </body>
    </html>
  );
}
