'use client';

import { useState } from 'react';

/**
 * "Do this week": the three-step checklist. Ticks save to the coach's own
 * progress (POST /api/kocha/progress) and show straight away; if saving
 * fails the tick is undone and the coach is told.
 *
 * steps: [{ key, label, detail, href }]
 */
export default function StepChecklist({ weekN, steps, initialDone }) {
  const [done, setDone] = useState(() => new Set(initialDone));
  const [error, setError] = useState('');

  async function toggle(key) {
    const next = !done.has(key);
    const update = (on) =>
      setDone((prev) => {
        const s = new Set(prev);
        if (on) s.add(key); else s.delete(key);
        return s;
      });
    update(next);
    setError('');
    try {
      const res = await fetch('/api/kocha/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekN, step: key, done: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
    } catch (err) {
      update(!next);
      setError(err.message || 'Could not save your tick. Check your connection and try again.');
    }
  }

  return (
    <div>
      <ol className="space-y-3">
        {steps.map((s, i) => {
          const checked = done.has(s.key);
          const id = `step-${weekN}-${s.key}`;
          return (
            <li key={s.key} className="bg-surface border border-white/10 rounded-lg p-4 flex items-start gap-4">
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={() => toggle(s.key)}
                className="mt-0.5 w-6 h-6 flex-shrink-0 accent-[#DC2626] cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <label htmlFor={id} className="block font-display font-bold tracking-wider uppercase text-white cursor-pointer">
                  Step {i + 1}: {s.label}
                </label>
                <p className="text-secondary text-sm font-body mt-1">{s.detail}</p>
                {s.href && (
                  <a href={s.href} className="inline-flex items-center min-h-[44px] text-sm font-body text-white underline underline-offset-4">
                    {s.linkLabel}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {error && <p role="alert" className="text-red-400 text-sm font-body mt-3">{error}</p>}
    </div>
  );
}
