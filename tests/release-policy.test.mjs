import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { builderArtifact, validateBuilderRelease, validateProfileTemplates } from '../scripts/release-policy.mjs';
import { fingerprintWebAssets } from '../scripts/fingerprint-web-assets.mjs';

const profiles = [{ id: 'first' }];
const release = { builderVersionPolicy: 'new-profiles-only', releases: [{ version: '1.0.0', profileIds: ['first'] }] };

test('companion patches keep the builder version and receive distinct immutable artifacts', () => {
  validateBuilderRelease('1.0.0', profiles, release);
  const before = builderArtifact('1.0.0', Buffer.from('old companion'));
  const after = builderArtifact('1.0.0', Buffer.from('fixed companion'));
  assert.notEqual(before.url, after.url);
  assert.notEqual(before.sha256, after.sha256);
  assert.equal(builderArtifact('1.0.0', Buffer.from('fixed companion')).url, after.url);
  assert.throws(() => validateBuilderRelease('1.0.1', profiles, release), /recorded profile-set/);
  assert.throws(() => validateBuilderRelease('1.0.1', profiles, {
    ...release, releases: [...release.releases, { version: '1.0.1', profileIds: ['first'] }]
  }), /only when adding profiles/);
});

test('adding profiles needs a new recorded builder version without dropping existing profiles', () => {
  const expanded = [...profiles, { id: 'second' }];
  assert.throws(() => validateBuilderRelease('1.0.0', expanded, release), /Adding profiles requires/);
  const next = { ...release, releases: [...release.releases, { version: '1.1.0', profileIds: ['first', 'second'] }] };
  validateBuilderRelease('1.1.0', expanded, next);
  assert.throws(() => validateBuilderRelease('1.1.0', [{ id: 'second' }], next), /requires/);
});

test('catalogue and downloadable companion versions must match the pack manifest', () => {
  const profile = { id: 'first', name: 'First game', code: 'ABCD', crc32: '1234ABCD', template: 'FIRST', output: 'Companion-1.0.1' };
  assert.throws(() => validateProfileTemplates([profile], { FIRST: { manifest: { version: '1.0.0' } } }), /versions differ/);
  validateProfileTemplates([profile], { FIRST: { manifest: { version: '1.0.1' } } });
});

test('web cache keys change with companion assets while navigation and language links stay intact', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-assets-'));
  try {
    const html = '<link rel="stylesheet" href="app.css?v=1.0.0"><a href="supported-games.html?lang=vi">Games</a><script src="profiles.js?v=1.0.0"></script>';
    for (const file of ['index.html', 'supported-games.html', 'plus-runner.html']) fs.writeFileSync(path.join(directory, file), html);
    fs.writeFileSync(path.join(directory, 'app.css'), 'body{}');
    fs.writeFileSync(path.join(directory, 'profiles.js'), 'old profiles');
    fingerprintWebAssets(directory);
    const before = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
    const runner = fs.readFileSync(path.join(directory, 'plus-runner.html'), 'utf8');
    assert(runner.includes('src="profiles.js"'));
    assert(runner.includes('href="app.css"'));
    assert(runner.includes('supported-games.html?lang=vi'));
    assert(before.includes('supported-games.html?lang=vi'));
    fingerprintWebAssets(directory);
    assert.equal(fs.readFileSync(path.join(directory, 'index.html'), 'utf8'), before);
    fs.writeFileSync(path.join(directory, 'profiles.js'), 'fixed companion');
    fingerprintWebAssets(directory);
    const after = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
    assert.equal(fs.readFileSync(path.join(directory, 'plus-runner.html'), 'utf8'), runner);
    assert.notEqual(after, before);
    assert.equal(after.match(/app.css\?v=[a-f0-9]+/)[0], before.match(/app.css\?v=[a-f0-9]+/)[0]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
