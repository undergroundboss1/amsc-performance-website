'use client';

import { useState } from 'react';

/**
 * One self-reported tick on the coach's own progress (e.g. "I watched a
 * Start here video"). Saves to POST /api/kocha/progress; undone with a
 * message if saving fails.
 */
export default function ProgressTick({ weekN, step, label, initial }) {
  const [checked, setChecked] = useState(initial);
  const [error, setError] = useState('');
  const id = `tick-${weekN}-${step}`;

  async function toggle() {
    const next = !checked;
    setChecked(next);
    setError('');
    try {
      const res = await fetch('/api/kocha/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekN, step, done: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
    } catch (err) {
      setChecked(!next);
      setError(err.message || 'Could not save. Check your connection and try again.');
    }
  }

  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-3 min-h-[44px] cursor-pointer font-body text-white">
        <input id={id} type="checkbox" checked={checked} onChange={toggle} className="w-6 h-6 flex-shrink-0 accent-[#DC2626] cursor-pointer" />
        {label}
      </label>
      {error && <p role="alert" className="text-red-400 text-sm font-body">{error}</p>}
    </div>
  );
}
