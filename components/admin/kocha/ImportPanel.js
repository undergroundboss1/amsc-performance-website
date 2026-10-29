'use client';

import { useState } from 'react';
import { GREEN, INK, INK_2, INK_3, btnPrimary, card, h3, td, th, uploadLessonPdf } from './styles';

/**
 * Admin Kocha → Import lessons. Pick lessons_manifest.json and the lesson
 * PDFs together (multi-select works on iPad from the Files app). Safe to
 * run any number of times: it only adds what is missing, never overwrites
 * your publish switches, approvals or edits, and skips PDFs that are
 * already uploaded. Shows a row-count report after every run.
 */
const REPORT_LABELS = {
  lessons: 'Lessons',
  lessons_imported: 'Lessons imported from manifest',
  lessons_published: 'Lessons published',
  lesson_pdfs: 'Lesson PDF slots',
  lesson_pdfs_uploaded: 'Lesson PDFs uploaded',
  videos: 'Videos',
  videos_in_lessons: 'Videos placed in lessons',
  videos_approved: 'Videos approved',
  homework: 'Homework',
  gaps_open: 'Open video gaps',
};

export default function ImportPanel({ api }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState(null);

  async function run(e) {
    const picked = [...(e.target.files || [])];
    e.target.value = '';
    setError(''); setOutcome(null);
    const manifestFile = picked.find((f) => f.name.toLowerCase().endsWith('.json'));
    if (!manifestFile) { setError('Include lessons_manifest.json in your selection.'); return; }
    try {
      setBusy('Reading the manifest…');
      let manifest;
      try { manifest = JSON.parse(await manifestFile.text()); } catch { throw new Error('That JSON file could not be read.'); }
      setBusy('Updating lessons, homework and videos…');
      const { before, result } = await api('/api/admin/kocha/import', { action: 'run', manifest });

      const pdfs = Object.fromEntries(picked.filter((f) => f.name.toLowerCase().endsWith('.pdf')).map((f) => [f.name, f]));
      const files = [];
      for (const u of result.uploads) {
        const file = pdfs[u.filename];
        if (!file) { files.push({ ...u, outcome: u.stored ? 'Already uploaded (not selected)' : 'MISSING: not in your selection' }); continue; }
        setBusy(`Uploading ${u.filename}…`);
        const r = await uploadLessonPdf(api, u.fileId, file);
        files.push({ ...u, outcome: r === 'unchanged' ? 'Unchanged (same file already uploaded)' : `Uploaded as version ${r.version}` });
      }
      const { report: after } = await api('/api/admin/kocha/import', { action: 'report' });
      setOutcome({ before, after, result, files });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div style={card}>
      <h3 style={h3}>Import lessons</h3>
      <p style={{ color: INK_2, fontSize: '13px', margin: '0 0 12px' }}>
        Select <strong>lessons_manifest.json</strong> and the lesson PDFs together. You can run this again at any time:
        nothing is duplicated, and your publish switches, approvals and edits are never overwritten.
      </p>
      <label style={{ ...btnPrimary, display: 'inline-block' }}>
        {busy || 'Choose manifest and PDFs'}
        <input type="file" multiple accept=".json,application/json,.pdf,application/pdf" style={{ display: 'none' }} disabled={Boolean(busy)} onChange={run} />
      </label>
      {error && <p role="alert" style={{ color: '#f87171', fontSize: '13px' }}>{error}</p>}

      {outcome && (
        <div style={{ marginTop: '16px' }}>
          <p role="status" style={{ color: GREEN, fontSize: '13px' }}>
            Done. Lessons set from the manifest: {outcome.result.lessons_set.join(', ') || 'none (already imported)'}.
            {' '}Videos: {outcome.result.videos_added} added, {outcome.result.videos_placed} placed in lessons, {outcome.result.videos_kept} left as they were.
            {' '}Gaps added: {outcome.result.gaps_added}.
          </p>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px', color: INK, marginTop: '8px' }}>
            <thead><tr>{['Count', 'Before', 'After'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {Object.keys(outcome.after).map((k) => (
                <tr key={k}><td style={td}>{REPORT_LABELS[k] || k}</td><td style={td}>{outcome.before[k]}</td><td style={td}>{outcome.after[k]}</td></tr>
              ))}
            </tbody>
          </table>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px', color: INK, marginTop: '12px' }}>
            <thead><tr>{['Lesson', 'PDF', 'Result'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {outcome.files.map((f) => (
                <tr key={f.slug}><td style={td}>{f.week}</td><td style={td}>{f.filename}</td>
                  <td style={{ ...td, color: f.outcome.startsWith('MISSING') ? '#f87171' : INK_3 }}>{f.outcome}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
