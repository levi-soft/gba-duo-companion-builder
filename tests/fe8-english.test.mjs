import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import test from 'node:test';

test('FE8 English uses the original US ROM identity with the inherited English ability UI',async()=>{
  const c={structuredClone,TextEncoder,TextDecoder,Uint8Array};c.globalThis=c;
  for(const file of ['runtime-modules.js','theme.js','radar.js','profiles/fe8-vietnamese/template.js','profiles/fe8-vietnamese/prepare.js','profiles/fe8-english/template.js','profiles/fe8-english/prepare.js'])vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),c);
  const p=c.FE8_ENGLISH_TEMPLATE;
  assert.equal(p.manifest.version,'1.0.0');assert.equal(p.manifest.match.gameCode[0],'BE8E');assert.equal(p.manifest.match.crc32[0],'A47246AE');
  assert.equal(p.uiLanguage,'en');assert.equal(JSON.stringify(p.layout),JSON.stringify(c.localizeCompanionUi(c.FE8_TEMPLATE.layout,'en')));
  assert(JSON.stringify(p.layout).includes('Battle analysis'));
  const wrong=new Uint8Array(256);wrong.set(new TextEncoder().encode('BE8P'),0xac);
  await assert.rejects(c.FE8EnglishPrep.prepare(wrong,p,null),/requires BE8E/);
  wrong.set(new TextEncoder().encode('BE8E'),0xac);
  await assert.rejects(c.FE8EnglishPrep.prepare(wrong,p,null),/CRC32 A47246AE/);
  const modules=c.COMPANION_RUNTIME_MODULES['fe8-english'];
  assert.equal(modules['main.lua'],c.COMPANION_RUNTIME_MODULES['fe8-europe']['main.lua']);
  assert.equal(modules['game.profile.lua'],c.COMPANION_RUNTIME_MODULES['fe8-vietnamese']['game.profile.lua'].replace('-- Exact ROM memory contract used by unit, map and forecast readers.','-- FE8 USA/Australia BE8E / A47246AE: verified native US memory contract.'));
  assert(modules['game.execution.lua'].includes('0x0802B92C'));
  assert.equal(modules['presentation.forecast.lua'],c.COMPANION_RUNTIME_MODULES['fe8-europe']['presentation.forecast.lua']);
});
