import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const idPattern = /^[a-z0-9-]{1,64}$/;

function versionParts(version) {
  assert(typeof version === 'string' && version.length <= 40 && versionPattern.test(version),
    'Expected a three-part release version');
  const parts = version.split('.').map(Number);
  assert(parts.every(Number.isSafeInteger), 'Release version component exceeds the safe integer range');
  return parts;
}

function newerVersion(next, previous) {
  const a = versionParts(next);
  const b = versionParts(previous);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return false;
}

function profileSet(ids) {
  assert(Array.isArray(ids) && ids.length > 0 && ids.length <= 256, 'A release needs 1–256 supported profiles');
  assert(ids.every(id => typeof id === 'string' && idPattern.test(id)), 'Invalid profile ID');
  assert(new Set(ids).size === ids.length, 'Duplicate profile ID');
  return new Set(ids);
}

export function validateBuilderRelease(version, profiles, policy) {
  assert.equal(policy.builderVersionPolicy, 'new-profiles-only', 'Unknown builder version policy');
  assert(Array.isArray(policy.releases) && policy.releases.length > 0, 'Missing builder release history');
  let previous;
  for (const release of policy.releases) {
    versionParts(release.version);
    const ids = profileSet(release.profileIds);
    if (previous) {
      assert(newerVersion(release.version, previous.version), 'Builder release versions must increase');
      assert(ids.size > previous.ids.size && [...previous.ids].every(id => ids.has(id)),
        'Advance the builder version only when adding profiles');
    }
    previous = { version: release.version, ids };
  }
  assert.equal(version, previous.version, 'Builder version must match the recorded profile-set release');
  const current = profileSet(profiles.map(profile => profile.id));
  // A recorded release is a published baseline, not the current catalogue.
  // Profiles may be added or patched without forcing a builder version bump.
  assert([...previous.ids].every(id => current.has(id)),
    'The current catalogue must retain every profile from the recorded builder release');
}

export function companionVersion(profile) {
  const version = profile.output?.match(/-(\d+\.\d+\.\d+)$/)?.[1];
  assert(version, 'Missing companion output version: ' + profile.id);
  versionParts(version);
  return version;
}

export function validateProfileTemplates(profiles, templates) {
  profileSet(profiles.map(profile => profile.id));
  const identities = new Set();
  for (const profile of profiles) {
    assert(typeof profile.name === 'string' && profile.name.trim() && profile.name.length <= 160,
      'Invalid profile name: ' + profile.id);
    assert(/^[A-Z0-9]{4}$/.test(profile.code) && /^[0-9A-F]{8}$/.test(profile.crc32),
      'Invalid exact ROM identity: ' + profile.id);
    const identity = profile.code + ':' + profile.crc32;
    assert(!identities.has(identity), 'Duplicate exact ROM identity');
    identities.add(identity);
    assert.equal(templates[profile.template]?.manifest?.version, companionVersion(profile),
      'Companion output and manifest versions differ: ' + profile.id);
  }
}

export function builderArtifact(version, bytes) {
  versionParts(version);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  return { sha256, url: `releases/builder-${version}-${sha256}.zip` };
}
