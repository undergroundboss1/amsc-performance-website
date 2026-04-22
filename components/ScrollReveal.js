'use client';
import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * ScrollReveal — GSAP ScrollTrigger.batch() wrapper for staggered grid reveals.
 * Wrap any list of cards/items.  Each direct child with class "sr-item" will
 * be revealed in a batched stagger as they enter the viewport.
 *
 * Props:
 *   children   ReactNode
 *   className  string   — classes on the wrapper div
 *   stagger    number   — stagger between items (default 0.12)
 *   y          number   — translateY distance to animate from (default 40)
 *   start      string   — ScrollTrigger start value (default 'top 85%')
 *   once       boolean  — animate once only (default true)
 */
export default function ScrollReveal({
  children,
  className = '',
  stagger = 0.12,
  y = 40,
  start = 'top 85%',
  once = true,
}) {
  const wrapperRef = useRef(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray('.sr-item', wrapperRef.current);
      if (!items.length) return;

      // Set initial state
      gsap.set(items, { opacity: 0, y });

      ScrollTrigger.batch(items, {
        start,
        once,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            stagger,
            overwrite: true,
          }),
        onLeaveBack: once
          ? undefined
          : (batch) =>
              gsap.set(batch, { opacity: 0, y, overwrite: true }),
      });
    },
    { scope: wrapperRef }
  );

  return (
    <div ref={wrapperRef} className={className}>
      {children}
    </div>
  );
}
