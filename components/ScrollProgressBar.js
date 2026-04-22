'use client';
import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * ScrollProgressBar — a fixed 2px accent-red bar at the top of the viewport
 * that fills as the user scrolls through the page.
 */
export default function ScrollProgressBar() {
  const barRef = useRef(null);

  useGSAP(() => {
    gsap.to(barRef.current, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.1,
      },
    });
  });

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
      style={{
        background: 'linear-gradient(90deg, #DC2626, #ef4444)',
        scaleX: 0,
        transform: 'scaleX(0)',
      }}
      aria-hidden="true"
    />
  );
}
