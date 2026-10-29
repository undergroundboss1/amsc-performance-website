import { FILE_KIND_LABELS, FILE_SOURCE_LABELS, KOCHA_BASE, LANGUAGE_LABELS } from '../../lib/kocha/constants';
import { formatBytes } from '../../lib/kocha/format';
import { waShareUrl } from '../../lib/kocha/share';
import { SITE_URL } from '../../lib/business';
import { DownloadLink, ShareLink } from './ui';

/**
 * Downloadable files as cards: name, what it is, type, format, size and
 * language before anyone taps, where the file lives, a Download button and
 * a Share on WhatsApp button. Cards rather than a wide table, so nothing
 * scrolls sideways on a 360 px phone.
 *
 * weekN (optional) is passed to the download route so downloading from a
 * week page ticks that week's "Download" step.
 */
export default function FileList({ files, weekN }) {
  if (!files.length) {
    return <p className="text-secondary text-sm font-body">No files for this week yet. AMSC will add them here.</p>;
  }

  return (
    <ul className="space-y-3">
      {files.map((f) => (
        <li key={f.id}>
          <FileCard file={f} weekN={weekN} />
        </li>
      ))}
    </ul>
  );
}

export function FileCard({ file: f, weekN }) {
  const size = formatBytes(f.size_bytes);
  const meta = [FILE_KIND_LABELS[f.kind], f.format, size, LANGUAGE_LABELS[f.language] || f.language]
    .filter(Boolean)
    .join(' · ');
  const href = `/api/kocha/files/${f.id}${weekN ? `?week=${weekN}` : ''}`;
  const pageUrl = `${SITE_URL}${weekN ? `${KOCHA_BASE}/lesson/${weekN}` : `${KOCHA_BASE}/downloads`}`;
  return (
    <div className="bg-surface border border-white/10 rounded-lg p-4">
      <h3 className="font-body font-semibold text-white normal-case tracking-normal text-base">{f.title}</h3>
      {f.description && <p className="text-secondary text-sm font-body mt-1">{f.description}</p>}
      <p className="text-muted text-sm font-body mt-2">{meta}</p>
      <p className="text-secondary text-xs font-body mt-1">{FILE_SOURCE_LABELS[f.source]}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {f.source !== 'whatsapp' && (
          <DownloadLink href={href} label={`Download ${f.title}${size ? `, ${size}` : ''}`}>
            {f.source === 'external' ? 'Open' : 'Download'}
          </DownloadLink>
        )}
        <ShareLink href={waShareUrl(`Kocha Mwenzangu: ${f.title}\n${pageUrl}`)} />
      </div>
    </div>
  );
}
