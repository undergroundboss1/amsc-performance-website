/**
 * What a Coach Scholar is allowed to see — pure checks shared by the pages
 * and the download route, and unit-tested in tests/kocha/access.test.mjs.
 *
 * Every scholar-facing query also filters on these fields in SQL; these
 * functions are the single place the full rule is written down, and the
 * download route re-checks with them before it signs a URL, so a file can
 * never be reached just by knowing its id.
 */

import { isGateOpen } from './release.js';

/**
 * @param {object} file - a kocha.files row
 * @param {{ openWeekNs: Set<number>, nutritionEnabled: boolean }} ctx
 */
export function fileVisibleToScholar(file, { openWeekNs, nutritionEnabled }) {
  if (!file || !file.published) return false;
  // Facilitator guides, scripts and anything else marked admin are never
  // shown to scholars, whatever else is set on the row.
  if (file.audience !== 'scholar') return false;
  if (!isGateOpen(file.gate, { nutritionEnabled })) return false;
  if (file.show_on_home) return true;
  return (file.weeks || []).some((n) => openWeekNs.has(n));
}

/** True when the file is visible AND there is something to hand out. */
export function fileDownloadable(file, ctx) {
  if (!fileVisibleToScholar(file, ctx)) return false;
  if (file.source === 'hosted') return Boolean(file.storage_path);
  if (file.source === 'external') return Boolean(file.external_url);
  return false; // 'whatsapp' files are posted in the group, not downloaded here
}

/** Only approved videos ever render for scholars. */
export function videoVisibleToScholar(video, { openWeekNs, nutritionEnabled }) {
  if (!video || video.status !== 'approved') return false;
  if (!isGateOpen(video.gate, { nutritionEnabled })) return false;
  if (!video.weeks || video.weeks.length === 0) return true; // course-wide video
  return video.weeks.some((n) => openWeekNs.has(n));
}
