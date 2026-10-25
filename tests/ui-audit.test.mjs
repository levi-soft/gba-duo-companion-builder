import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {renderUiTheme} from '../scripts/build-ui-theme.mjs';

function loadThemes() {
  const context = {structuredClone};
  context.globalThis = context;
  for (const file of ['runtime-modules.js', 'theme.js', 'profiles/fe7-vietnamese/template.js',
    'profiles/fe6-remastered/template.js', 'profiles/fe8-vietnamese/template.js']) {
    vm.runInNewContext(fs.readFileSync('site/' + file, 'utf8'), context, {filename: file});
  }
  return context;
}

function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (value && typeof value === 'object') visit(value, callback);
  }
}

test('published UI is generated deterministically from readable authored sources', () => {
  const layout = JSON.parse(fs.readFileSync('ui/theme.layout.json', 'utf8'));
  const css = fs.readFileSync('ui/theme.css', 'utf8');
  const factory = fs.readFileSync('ui/theme-factory.js', 'utf8');
  const locales = {en: JSON.parse(fs.readFileSync('ui/locales/en.json', 'utf8'))};
  const output = renderUiTheme(layout, css, factory, locales);
  assert.equal(fs.readFileSync('site/theme.js', 'utf8'), output);
  assert.equal(renderUiTheme(layout, css.replace(/\n/g, '\r\n'), factory.replace(/\n/g, '\r\n'), locales), output);
});

test('all expanded profiles have unique node IDs and one shared Growth/Analysis modal', () => {
  const context = loadThemes();
  const original = JSON.stringify(context.COMPANION_THEME.layout);
  for (const key of ['FE7_TEMPLATE', 'FE6_TEMPLATE', 'FE8_TEMPLATE']) {
    const seen = new Set();
    let growth = 0, analysis = 0, descriptions = 0, metadata = 0;
    visit(context[key].layout, node => {
      if (node.id) {
        assert(!seen.has(node.id), key + ': duplicate node ID ' + node.id);
        seen.add(node.id);
      }
      if (node.visibleIf === '$ui.growthPopup') growth++;
      if (node.visibleIf === '$ui.predictionPopup') analysis++;
      if (node.class === 'item-description') descriptions++;
      if (node.class === 'item-description-meta') metadata++;
    });
    assert.equal(growth, 1, key + ': Growth modal');
    assert.equal(analysis, 1, key + ': Analysis modal');
    assert.equal(descriptions, 5, key + ': common inventory descriptions');
    assert.equal(metadata, 5, key + ': common inventory type/rank labels');
    assert(!/flex:\s*\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+0\s*;/.test(context[key].css),
      key + ': unitless zero flex basis is rejected by the native CSS parser');
  }
  assert.equal(JSON.stringify(context.COMPANION_THEME.layout), original, 'Profile extension mutated the shared layout');
});

test('FE6 separate Mag rows extend shared Growth/Analysis without duplicating controls', () => {
  const context = loadThemes();
  for (const key of ['FE7_TEMPLATE', 'FE6_TEMPLATE', 'FE8_TEMPLATE']) {
    let growthMag = 0, predictionMag = 0;
    visit(context[key].layout, node => {
      if (node.class === 'growth-table') visit(node, child => {
        if (child.text === '{growthMagCurrent}') growthMag++;
      });
      if (node.class === 'prediction-results') visit(node, child => {
        if (child.text === '{rngMagResult}') predictionMag++;
      });
    });
    assert.equal(growthMag, key === 'FE6_TEMPLATE' ? 1 : 0, key + ': Growth Mag');
    assert.equal(predictionMag, key === 'FE6_TEMPLATE' ? 1 : 0, key + ': Analysis Mag');
  }
});
