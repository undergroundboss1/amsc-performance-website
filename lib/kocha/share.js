/**
 * WhatsApp helpers for the Kocha hub. WhatsApp stays the main channel; the
 * hub only builds links (wa.me), it never sends messages itself.
 */

/** A share link: opens WhatsApp with the text ready to send to anyone. */
export function waShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Add pre-filled text to a chat link for one number. Takes the result of
 * whatsappLink() (lib/client-comms.js), which already normalises the
 * number, and returns null when that did.
 */
export function withText(chatUrl, text) {
  if (!chatUrl) return null;
  return `${chatUrl}?text=${encodeURIComponent(text)}`;
}

/**
 * Fill {placeholders} in a message template. Unknown or empty placeholders
 * are left visible as {name} so a missing value is obvious before sending,
 * rather than silently producing a broken sentence.
 */
export function fillTemplate(body, values) {
  return String(body).replace(/\{([a-z_]+)\}/g, (match, key) => {
    const v = values[key];
    return v === undefined || v === null || v === '' ? match : String(v);
  });
}
