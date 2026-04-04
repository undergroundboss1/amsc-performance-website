'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

export default function CountUp({ end, duration = 2, suffix = '', prefix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const shouldReduceMotion = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;

    if (shouldReduceMotion) {
      setCount(end);
      return;
    }

    const startTime = performance.now();
    const step = (now) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, end, duration, shouldReduceMotion]);

  return (
    <motion.span
      ref={ref}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
    >
      {prefix}{count}{suffix}
    </motion.span>
  );
}
