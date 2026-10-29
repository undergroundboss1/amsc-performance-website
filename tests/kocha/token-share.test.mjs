import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashToken, isWellFormedToken, newAccessToken } from '../../lib/kocha/token.js';
import { fillTemplate, waShareUrl, withText } from '../../lib/kocha/share.js';
import { formatBytes, formatDay, formatMomentTime } from '../../lib/kocha/format.js';

test('access tokens are 256-bit, URL-safe and unique', () => {
  const a = newAccessToken();
  const b = newAccessToken();
  assert.equal(isWellFormedToken(a), true);
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
});

test('only the SHA-256 hex hash is stored, and it is stable', () => {
  const t = newAccessToken();
  assert.match(hashToken(t), /^[0-9a-f]{64}$/);
  assert.equal(hashToken(t), hashToken(t));
  assert.notEqual(hashToken(t), t);
});

test('malformed tokens are rejected before any database lookup', () => {
  for (const bad of [undefined, null, '', 'short', 'x'.repeat(44), `${'a'.repeat(42)}!`, "a' OR 1=1 --"]) {
    assert.equal(isWellFormedToken(bad), false, String(bad));
  }
});

test('templates fill known placeholders and leave missing ones visible', () => {
  const out = fillTemplate('Week {week}: {title}. Join: {meet_url}', { week: 2, title: 'Reading your baseline', meet_url: '' });
  assert.equal(out, 'Week 2: Reading your baseline. Join: {meet_url}');
});

test('WhatsApp links encode the message', () => {
  assert.equal(waShareUrl('Week 2 & more\nhttps://x.y/?a=1'), 'https://wa.me/?text=Week%202%20%26%20more%0Ahttps%3A%2F%2Fx.y%2F%3Fa%3D1');
  assert.equal(withText('https://wa.me/254751048777', 'Hi'), 'https://wa.me/254751048777?text=Hi');
  assert.equal(withText(null, 'Hi'), null);
});

test('formatting shows sizes and Nairobi dates', () => {
  assert.equal(formatBytes(196312), '192 KB');
  assert.equal(formatBytes(2400000), '2.3 MB');
  assert.equal(formatBytes(null), null);
  assert.equal(formatDay('2026-10-31'), 'Sat 31 Oct');
  assert.equal(formatMomentTime('2026-11-06T17:00:00Z'), 'Fri 6 Nov, 20:00');
});
