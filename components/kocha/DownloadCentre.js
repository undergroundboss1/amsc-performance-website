'use client';

import { useMemo, useState } from 'react';
import { FILE_KIND_LABELS } from '../../lib/kocha/constants';

/**
 * Search and filter controls for the download centre. The file cards are
 * rendered on the server (FileList) and passed in keyed by id; this only
 * decides which ones to show, so filtering costs no extra requests.
 *
 * files: [{ id, title, description, kind, weeks }]
 */
export default function DownloadCentre({ files, cards }) {
  const [query, setQuery] = useState('');
  const [week, setWeek] = useState('');
  const [kind, setKind] = useState('');

  const weeks = useMemo(() => [...new Set(files.flatMap((f) => f.weeks || []))].sort((a, b) => a - b), [files]);
  const kinds = useMemo(() => [...new Set(files.map((f) => f.kind))], [files]);

  const q = query.trim().toLowerCase();
  const shown = files.filter((f) =>
    (!q || `${f.title} ${f.description || ''}`.toLowerCase().includes(q)) &&
    (!week || (f.weeks || []).includes(Number(week))) &&
    (!kind || f.kind === kind)
  );

  const field = 'w-full min-h-[44px] bg-surface border border-white/10 rounded-lg px-3 text-white font-body text-sm focus:outline-none focus:border-accent';

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <div className="sm:col-span-3">
          <label htmlFor="dl-search" className="block text-sm font-body text-secondary mb-1">Search</label>
          <input id="dl-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={field} placeholder="e.g. baseline" />
        </div>
        <div>
          <label htmlFor="dl-week" className="block text-sm font-body text-secondary mb-1">Week</label>
          <select id="dl-week" value={week} onChange={(e) => setWeek(e.target.value)} className={field}>
            <option value="">All weeks</option>
            {weeks.map((n) => <option key={n} value={n}>Week {n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="dl-kind" className="block text-sm font-body text-secondary mb-1">Type</label>
          <select id="dl-kind" value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
            <option value="">All types</option>
            {kinds.map((k) => <option key={k} value={k}>{FILE_KIND_LABELS[k] || k}</option>)}
          </select>
        </div>
      </div>

      <p role="status" className="text-secondary text-sm font-body mb-3">
        {shown.length === 1 ? '1 file' : `${shown.length} files`}
      </p>
      {shown.length === 0 ? (
        <p className="text-secondary text-sm font-body">No files match. Try another search or clear the filters.</p>
      ) : (
        <ul className="space-y-3">{shown.map((f) => <li key={f.id}>{cards[f.id]}</li>)}</ul>
      )}
    </div>
  );
}
