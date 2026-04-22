'use client';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * AnimatedSection — Framer Motion scroll-reveal wrapper.
 * Used for single blocks (paragraphs, CTAs, layout sections).
 * For grids/lists of cards, use ScrollReveal + .sr-item class instead.
 */
export default function AnimatedSection({
  children,
  className = '',
  delay = 0,
  distance = 28,
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: distance }
      }
      whileInView={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1], // expo-out — snappy start, glassy settle
              delay,
            }
      }
      viewport={{ once: true, margin: '-60px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
