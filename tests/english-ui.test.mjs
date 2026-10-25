import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

function context() {
  const root = {structuredClone}; root.globalThis = root;
  for (const file of ['runtime-modules.js','theme.js','radar.js',
    'profiles/fe7-vietnamese/template.js','profiles/fe7-english/template.js']) {
    vm.runInNewContext(fs.readFileSync('site/' + file, 'utf8'), root);
  }
  return root;
}
function strings(value) {
  if (typeof value === 'string') return [value];
  return value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
}

test('FE7 English 0.1.0 inherits the common widget tree without Vietnamese labels', () => {
  const root = context(), en = root.FE7_ENGLISH_TEMPLATE;
  assert.equal(en.manifest.version, '0.1.0');
  assert.equal(en.manifest.match.crc32[0], '2A524221');
  assert.equal(en.uiLanguage, 'en');
  assert.throws(() => root.makeFe7EnglishPrototype({gameCode:'AE7E',crc32:'32CD990D'}), /verified exact/);
  const labels = strings(en.layout);
  for (const text of Object.keys(root.COMPANION_THEME.locales.en.layout)) assert(!labels.includes(text), text);
  assert(labels.includes('Analysis')); assert(labels.includes('Growth rates'));
  assert(labels.includes('Battle analysis')); assert(labels.includes('If foe is defeated (total)'));
  function structure(node) {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(structure);
    return Object.fromEntries(Object.entries(node).map(([key,value]) => [key, key === 'text' ? '' : structure(value)]));
  }
  assert.deepEqual(structure(en.layout), structure(root.FE7_TEMPLATE.layout));
  assert.equal(root.FE7_TEMPLATE.data.predictionConfidence, 'Chờ dữ liệu giao chiến');
  assert.equal(en.data.predictionConfidence, 'Waiting for battle data');
  assert.equal(JSON.stringify(root.makeCompanionLayout()), JSON.stringify(root.COMPANION_THEME.layout));
});

test('English radar changes captions while preserving rates, geometry and Vietnamese defaults', () => {
  const root = context(), rates = [80,45,50,55,30,25,20];
  const vi = root.CompanionRadar.geometry(rates,5), en = root.CompanionRadar.geometry(rates,5,'en');
  assert.equal(en.footer, 'Shared scale: 0–100%');
  assert.equal(en.note, 'Bold ring: 100% · Each ring: 20%');
  assert.equal(vi.note, 'Vòng đậm: 100% · Mỗi vòng: 20%');
  assert.deepEqual({...en,footer:'',note:''}, {...vi,footer:'',note:''});
  assert(root.CompanionRadar.svg(rates,5,'en').includes('Bold ring: 100%'));
});

test('English Lua presentation translates statuses and dynamic numbers without changing ROM text or statistics', async () => {
  const engine = await luaFactory().createEngine();
  const locale = JSON.parse(fs.readFileSync('ui/locales/en.json','utf8'));
  try {
    const literal = '{' + Object.entries(locale.runtime).map(([key,value]) =>
      '[' + JSON.stringify(key) + ']=' + JSON.stringify(value)).join(',') + '}';
    engine.global.set('stringsSource', literal);
    engine.global.set('localeSource', fs.readFileSync('runtime/shared/presentation.locale.lua','utf8'));
    engine.global.set('englishSource', fs.readFileSync('runtime/fe7-english/presentation.english.lua','utf8'));
    const result = await engine.doString(`
      pack={require=function(name) assert(name=='presentation.locale');return assert(load(localeSource))() end}
      local strings=assert(load('return '..stringsSource))()
      local apply=assert(load(englishSource))()(strings)
      local values={unitName='Lyn',item1Description='Restores HP to an adjacent ally.',growthHpCurrent=17,
        rngExpHit=10,rngAvailable=false,rngStateText='Mở dự báo giao chiến để ghi nhận RNG',
        predictionProgressText='Ước tính: 42%',growthExpMatch='Batta: gây sát thương 10 / hạ địch 35 EXP nếu sống sót.'}
      apply(values);return values
    `);
    assert.equal(result.rngStateText,'Open a battle forecast to record RNG');
    assert.equal(result.predictionProgressText,'Estimated: 42%');
    assert.equal(result.growthExpMatch,'Batta: damage 10 / defeat 35 EXP if the unit survives.');
    assert.equal(result.unitName,'Lyn'); assert.equal(result.item1Description,'Restores HP to an adjacent ally.');
    assert.equal(result.growthHpCurrent,17); assert.equal(result.rngExpHit,10); assert.equal(result.rngAvailable,false);
  } finally { engine.global.close(); }
});
