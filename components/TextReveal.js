'use client';
import { useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * TextReveal — word-by-word scroll reveal for headings.
 * Each word slides up from a clipped container for a cinematic feel.
 *
 * Props:
 *   text       string   — the heading text
 *   as         string   — tag: 'h1' | 'h2' | 'h3' | 'p' (default 'h2')
 *   className  string   — classes forwarded to the wrapper element
 *   delay      number   — stagger delay offset in seconds (default 0)
 *   once       boolean  — only animate once (default true)
 */
export default function TextReveal({
  text = '',
  as: Tag = 'h2',
  className = '',
  delay = 0,
  once = true,
}) {
  const containerRef = useRef(null);

  const words = useMemo(() => text.split(' ').filter(Boolean), [text]);

  useGSAP(
    () => {
      const wordEls = gsap.utils.toArray('.tr-word', containerRef.current);
      if (!wordEls.length) return;

      gsap.fromTo(
        wordEls,
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.75,
          ease: 'power3.out',
          stagger: 0.07,
          delay,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 88%',
            once,
          },
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <Tag ref={containerRef} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-bottom"
          aria-hidden="true"
        >
          <span className="tr-word inline-block">
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </span>
        </span>
      ))}
    </Tag>
  );
}
