import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileDownloadable, fileVisibleToScholar, videoVisibleToScholar } from '../../lib/kocha/access.js';

const ctx = { openWeekNs: new Set([1, 2]), nutritionEnabled: false };

const file = (over = {}) => ({
  published: true, audience: 'scholar', gate: null, show_on_home: false, weeks: [1],
  source: 'hosted', storage_path: 'files/x/v1-x.pdf', external_url: null, ...over,
});

test('a published scholar file on an open week is downloadable', () => {
  assert.equal(fileDownloadable(file(), ctx), true);
});

test('facilitator-only (admin) files are never visible to scholars, even if published on an open week', () => {
  const facilitator = file({ audience: 'admin', show_on_home: true, weeks: [1, 2] });
  assert.equal(fileVisibleToScholar(facilitator, ctx), false);
  assert.equal(fileDownloadable(facilitator, ctx), false);
});

test('unpublished files are hidden', () => {
  assert.equal(fileVisibleToScholar(file({ published: false }), ctx), false);
});

test('files on locked weeks are hidden; course-home files show from day one', () => {
  assert.equal(fileVisibleToScholar(file({ weeks: [5] }), ctx), false);
  assert.equal(fileVisibleToScholar(file({ weeks: [], show_on_home: true }), ctx), true);
});

test('nutrition-gated files stay hidden while the gate is off, even on the course home', () => {
  const nutrition = file({ gate: 'nutrition', show_on_home: true });
  assert.equal(fileVisibleToScholar(nutrition, ctx), false);
  assert.equal(fileVisibleToScholar(nutrition, { ...ctx, nutritionEnabled: true }), true);
});

test('a hosted file with nothing uploaded, and WhatsApp-only files, have nothing to download', () => {
  assert.equal(fileDownloadable(file({ storage_path: null }), ctx), false);
  assert.equal(fileDownloadable(file({ source: 'whatsapp', storage_path: null }), ctx), false);
  assert.equal(fileVisibleToScholar(file({ source: 'whatsapp', storage_path: null }), ctx), true);
});

test('external files need a link', () => {
  assert.equal(fileDownloadable(file({ source: 'external', external_url: null }), ctx), false);
  assert.equal(fileDownloadable(file({ source: 'external', external_url: 'https://example.org/x.pdf' }), ctx), true);
});

test('missing rows are never visible', () => {
  assert.equal(fileVisibleToScholar(null, ctx), false);
  assert.equal(videoVisibleToScholar(undefined, ctx), false);
});

const video = (over = {}) => ({ status: 'approved', gate: null, weeks: [1], ...over });

test('only approved videos render', () => {
  assert.equal(videoVisibleToScholar(video(), ctx), true);
  assert.equal(videoVisibleToScholar(video({ status: 'pending' }), ctx), false);
  assert.equal(videoVisibleToScholar(video({ status: 'rejected' }), ctx), false);
});

test('videos on locked weeks or behind a closed gate are hidden; course-wide videos show', () => {
  assert.equal(videoVisibleToScholar(video({ weeks: [6] }), ctx), false);
  assert.equal(videoVisibleToScholar(video({ gate: 'nutrition' }), ctx), false);
  assert.equal(videoVisibleToScholar(video({ weeks: [] }), ctx), true);
});
