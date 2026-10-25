import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function renderUiTheme(layout, css, factory, locales = {}) {
  return '// Generated from ui/theme.layout.json, ui/theme.css and ui/theme-factory.js.\n'
    + '// Edit the authored UI files, then run scripts/build-ui-theme.mjs.\n'
    + 'globalThis.COMPANION_THEME=' + JSON.stringify({layout, css: css.replace(/\r\n/g, '\n'), locales}) + ';\n'
    + factory.replace(/\r\n/g, '\n').trimEnd() + '\n';
}

const layout = JSON.parse(fs.readFileSync(path.join(root, 'ui/theme.layout.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'ui/theme.css'), 'utf8');
const factory = fs.readFileSync(path.join(root, 'ui/theme-factory.js'), 'utf8');
const locales = {en: JSON.parse(fs.readFileSync(path.join(root, 'ui/locales/en.json'), 'utf8'))};
fs.writeFileSync(path.join(root, 'site/theme.js'), renderUiTheme(layout, css, factory, locales));
fs.writeFileSync(path.join(root, 'site/radar.js'), '// Generated from ui/radar.js.\n'
  + fs.readFileSync(path.join(root, 'ui/radar.js'), 'utf8').replace(/\r\n/g, '\n'));
console.log('Shared companion UI generated from readable layout, CSS and factory sources.');
