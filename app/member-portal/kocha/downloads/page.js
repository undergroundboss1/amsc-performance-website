import { getCurrentScholar } from '../../../../lib/kocha/session';
import { loadCourse } from '../../../../lib/kocha/data';
import { gateReason } from '../../../../lib/kocha/gate-reason';
import { LOW_DATA_TIP } from '../../../../lib/kocha/constants';
import AccessGate from '../../../../components/kocha/AccessGate';
import KochaShell from '../../../../components/kocha/KochaShell';
import DownloadCentre from '../../../../components/kocha/DownloadCentre';
import { FileCard } from '../../../../components/kocha/FileList';

/**
 * /member-portal/kocha/downloads — every file the coach can get, in one
 * searchable list (by week and type). Only files on open weeks, or on the
 * course home, are listed.
 */
export const dynamic = 'force-dynamic';

export default async function KochaDownloadsPage({ searchParams }) {
  const scholar = await getCurrentScholar();
  if (!scholar) return <AccessGate reason={gateReason(searchParams)} />;

  const course = await loadCourse(scholar);
  const files = course.files;
  const cards = Object.fromEntries(files.map((f) => [f.id, <FileCard key={f.id} file={f} />]));

  return (
    <KochaShell scholar={scholar}>
      <h1 className="font-display font-black text-3xl tracking-widest mb-2">Downloads</h1>
      <p className="font-body text-secondary text-sm mb-8">
        Every file for the weeks that are open. {LOW_DATA_TIP}
      </p>
      {files.length === 0 ? (
        <p className="font-body text-secondary">No files yet. AMSC will add them here.</p>
      ) : (
        <DownloadCentre
          files={files.map(({ id, title, description, kind, weeks }) => ({ id, title, description, kind, weeks }))}
          cards={cards}
        />
      )}
    </KochaShell>
  );
}
