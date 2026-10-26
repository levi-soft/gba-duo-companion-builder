import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { builderArtifact, companionVersion, validateBuilderRelease, validateProfileTemplates } from './release-policy.mjs';
import { fingerprintWebAssets } from './fingerprint-web-assets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
const policy = JSON.parse(fs.readFileSync(path.join(root, 'release-policy.json')));

await import('./build-authored-sources.mjs');
await import('./build-site-content.mjs');
await import('../site/jszip.min.js');

const context = { structuredClone };
context.globalThis = context;
function loadScript(name) {
  vm.runInNewContext(fs.readFileSync(path.join(site, name), 'utf8'), context, { filename: name });
}
for (const name of ['runtime-modules.js', 'theme.js', 'profiles.js']) loadScript(name);
const profiles = context.COMPANION_PROFILES;
validateBuilderRelease(version, profiles, policy);
for (const profile of profiles) loadScript(`profiles/${profile.id}/template.js`);
validateProfileTemplates(profiles, context);
const landing = path.join(site, 'index.html');
fs.writeFileSync(landing, fs.readFileSync(landing, 'utf8')
  .replace(/LOCAL ROM PREPARATION · \d+\.\d+\.\d+/, 'LOCAL ROM PREPARATION · ' + version));
fingerprintWebAssets(site);

const zip = new globalThis.JSZip();
const entries = [];
function addDirectory(directory, prefix = '') {
  const children = fs.readdirSync(directory, { withFileTypes: true });
  children.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  for (const entry of children) {
    const name = prefix + entry.name;
    // Published catalogues and past artifacts never enter the next bundle.
    if (name === 'catalog.json' || name === 'releases' || name.startsWith('releases/')) continue;
    if (entry.isSymbolicLink()) throw Error('Distribution must not contain symlinks');
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      addDirectory(fullPath, name + '/');
      continue;
    }
    if (/\.(?:gba|gbc|gb|gbastudio\.json|sav|ss)$|Local\.zip$|capture.*\.json$/i.test(name)) {
      throw Error('Private/generated game file: ' + name);
    }
    const bytes = fs.readFileSync(fullPath);
    entries.push({ name, bytes: bytes.length });
    zip.file(name, bytes, {
      date: new Date('2000-01-01T00:00:00Z'),
      unixPermissions: 0o100644,
      createFolders: false
    });
  }
}
addDirectory(site);
for (const required of ['index.html', 'plus-runner.html', 'plus-runner.js', 'builder-core.js', 'LICENSE']) {
  if (!entries.some(entry => entry.name === required)) throw Error('Missing distribution entry: ' + required);
}

const bytes = await zip.generateAsync({
  type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 9 }, platform: 'UNIX'
});
const artifact = builderArtifact(version, bytes);
fs.mkdirSync(path.join(site, 'releases'), { recursive: true });
const destination = path.join(site, artifact.url);
if (fs.existsSync(destination) && !fs.readFileSync(destination).equals(Buffer.from(bytes))) {
  throw Error('Refusing to replace an immutable builder artifact');
}
fs.writeFileSync(destination, bytes);
const catalog = {
  schemaVersion: 1,
  runnerProtocol: 1,
  builderVersion: version,
  builder: {
    ...artifact,
    bytes: bytes.length,
    unpackedBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    entrypoint: 'plus-runner.html'
  },
  profiles: profiles.map(profile => ({
    id: profile.id, name: profile.name, version: companionVersion(profile),
    gameCode: profile.code, crc32: profile.crc32
  }))
};
fs.writeFileSync(path.join(site, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/distribution.json'), JSON.stringify({ version, catalog, files: entries }, null, 2) + '\n');
console.log(JSON.stringify({ version, files: entries.length, ...catalog.builder }, null, 2));
