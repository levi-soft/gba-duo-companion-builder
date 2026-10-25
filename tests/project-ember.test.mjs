import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadProfiles() {
  const root={structuredClone,TextEncoder,TextDecoder,Uint8Array,DataView};root.globalThis=root;
  for(const file of ['runtime-modules.js','theme.js','radar.js','profiles/fe7-vietnamese/template.js',
    'profiles/fe8-vietnamese/prepare.js','fe6-rom.js','profiles/fe6-english/encoding.js','profiles/fe6-english/chapter-titles.js',
    'profiles/fe6-english/template.js','profiles/fe6-english/prepare.js',
    'profiles/fe6-project-ember/template.js','profiles/fe6-project-ember/prepare.js',
    'profiles/fe6-project-ember-rr/template.js','profiles/fe6-project-ember-rr/prepare.js'])
    vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),root);
  return root;
}

test('Project Ember variants inherit the accepted English FE6 UI with independent exact-ROM identities', () => {
  const root=loadProfiles();
  const a=root.FE6_PROJECT_EMBER_TEMPLATE,b=root.FE6_PROJECT_EMBER_RR_TEMPLATE;
  assert.equal(a.manifest.version,'1.0.0');assert.equal(b.manifest.version,'1.0.0');
  assert.equal(a.manifest.match.crc32[0],'636F7B05');assert.equal(b.manifest.match.crc32[0],'29BC2257');
  assert.notEqual(a.manifest.id,b.manifest.id);
  assert.equal(JSON.stringify(a.layout),JSON.stringify(root.FE6_ENGLISH_TEMPLATE.layout));
  assert.equal(JSON.stringify(b.layout),JSON.stringify(a.layout));
  assert.equal(root.FE6_ENGLISH_TEMPLATE.manifest.match.crc32[0],'197DE10B');
  for(const id of ['fe6-project-ember','fe6-project-ember-rr']) {
    const modules=root.COMPANION_RUNTIME_MODULES[id];
    for(const name of ['game.memory.lua','game.items.lua','game.battle.lua','features.thumb.lua','presentation.forecast.lua'])
      assert(modules[name],id+' missing inherited module '+name);
    assert(modules['game.profile.lua'].includes('0x087FF4B0'));
  }
});

test('Project Ember variants reject a different CRC before extracting tables even with the expected file length', async () => {
  const root=loadProfiles();
  root.CompanionRom.reader=()=>{throw Error('Asset extraction must not start');};
  for(const [api,size,expected,foreign] of [
    [root.FE6ProjectEmberPrep,25355392,'636F7B05',0x29BC2257],
    [root.FE6ProjectEmberRRPrep,24475812,'29BC2257',0x636F7B05]]) {
    const bytes=new Uint8Array(size);bytes.set(new TextEncoder().encode('AFEJ'),0xac);
    root.CompanionRom.crc32=()=>foreign;
    await assert.rejects(api.prepare(bytes,{},null),new RegExp('CRC32 '+expected));
  }
});

test('all three native FE6 producers pass the shared verified chapter names to the builder',()=>{
  const root=loadProfiles(),contracts=[];
  root.FE6RomPrep.prepare=(input,template,runtime,options,profile)=>{contracts.push(profile);return {};};
  for(const api of [root.FE6EnglishPrep,root.FE6ProjectEmberPrep,root.FE6ProjectEmberRRPrep])api.prepare(new Uint8Array(),{});
  assert.equal(contracts.length,3);
  for(const profile of contracts){
    assert.equal(profile.chapterTitles,root.FE6_ENGLISH_CHAPTER_TITLES);
    assert.equal(profile.chapterTitles[0],'Dawn of Destiny');
    assert.equal(profile.chapterTitles[31],'The Tempest Bow');
  }
});

test('FE6 text decoding skips native dialogue parameters without treating them as glyphs', () => {
  const root=loadProfiles();
  const decode=bytes=>root.FE6_ENGLISH_ENCODING(bytes).replace(/\s+/g,' ').trim();
  assert.equal(decode([0x82,0xA0,1,0x80,4,0x82,0xA2]),'A B');
  assert.equal(decode([0x82,0xA0,0x10,0xFF,0xFF,0x80,1,0xFE,0x82,0xA2]),'AB');
  assert.equal(decode([0x82,0xA0,0x80,9,0x82,0xA2]),'A');
  assert.equal(decode([0x82,0xA0,0x81,0x80,0x82,0xA2]),'A B');
});
