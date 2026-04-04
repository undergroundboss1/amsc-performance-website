'use client';
import { motion, useReducedMotion } from 'framer-motion';

export default function AnimatedSection({ children, className = '', delay = 0 }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut', delay }}
      viewport={{ once: true }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
