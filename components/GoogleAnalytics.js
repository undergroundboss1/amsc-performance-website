'use client';
import { useEffect } from 'react';
import { useConsent } from './ConsentContext';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * GoogleAnalytics
 * Loads GA4 only after the user accepts cookies.
 * If consent is declined or the GA_ID env var is missing, nothing loads.
 */
export default function GoogleAnalytics() {
  const { consent } = useConsent();

  useEffect(() => {
    if (!GA_ID || consent !== 'accepted') return;

    // Inject the gtag script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, {
      anonymize_ip: true,         // GDPR best practice
      cookie_flags: 'SameSite=None;Secure',
    });

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [consent]);

  return null;
}
