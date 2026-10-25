import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Cache keys follow actual asset content, independently of the builder version.
// Only script/style dependencies are rewritten; navigation/language links stay intact.
export function fingerprintWebAssets(site) {
  for (const file of ['index.html', 'supported-games.html', 'plus-runner.html']) {
    const fullPath = path.join(site, file);
    const html = fs.readFileSync(fullPath, 'utf8');
    const updated = html.replace(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"?#]+\.(?:js|css))(?:\?[^"#]*)?"[^>]*>/g,
      (tag, name) => {
        if (/^(?:[a-z]+:|\/|\\)/i.test(name) || name.split('/').includes('..')) {
          throw Error('Web asset must use a local path: ' + name);
        }
        const bytes = fs.readFileSync(path.join(site, name));
        const revision = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
        return tag.replace(/((?:src|href)=")[^"]+"/, `$1${name}?v=${revision}"`);
      });
    if (updated !== html) fs.writeFileSync(fullPath, updated);
  }
}
