/**
 * Display formatting for the Kocha hub. Dates are always shown in Nairobi
 * time, whatever timezone the phone or the server is in.
 */

const TZ = 'Africa/Nairobi';

/** 196312 -> "192 KB"; 2400000 -> "2.3 MB". */
export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** A calendar date (YYYY-MM-DD) -> "Sat 31 Oct". */
export function formatDay(isoDate, { year = false } = {}) {
  if (!isoDate) return null;
  // Noon UTC keeps the date the same in every timezone.
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: TZ,
  });
}

/** A timestamp -> "Sat 7 Nov" in Nairobi. */
export function formatMoment(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ,
  });
}

/** A timestamp -> "Fri 6 Nov, 20:00" in Nairobi. */
export function formatMomentTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const day = formatMoment(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  return `${day}, ${time}`;
}

export function firstName(displayName) {
  return String(displayName || '').trim().split(/\s+/)[0] || '';
}
