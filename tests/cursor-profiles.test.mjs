import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {resolveCursorProfiles} from '../scripts/cursor-profiles.mjs';

const source=JSON.parse(fs.readFileSync('runtime/cursor/profiles.json','utf8'));
test('all30 navigation-enabled companions restore Plus code17 format2 D-pad metadata without write permissions',()=>{
  const context={TextEncoder,Buffer};
  for(const file of ['site/profiles.js','site/runtime-modules.js','site/runtime-packager.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  const profiles=resolveCursorProfiles(source),enabled=context.COMPANION_PROFILES.filter(p=>p.cursorNavigationVerified!==false);
  assert.deepEqual(Object.keys(profiles).sort(),Array.from(enabled,p=>p.id).sort());
  for(const [id,profile] of Object.entries(profiles)){
    const manifest={id,version:id.includes('vietnamese')||id==='fe6-remastered'?'1.0.0':'0.1.0',match:{gameCode:['TEST'],crc32:['12345678']}};
    const before=structuredClone(manifest),project={manifest,files:{}};
    context.CompanionRuntime.install(project,id,'{}');
    const {modeGuard,...nativeProfile}=profile;
    assert.deepEqual(JSON.parse(JSON.stringify(project.manifest.cursorNavigation)),nativeProfile,id);
    const {cursorNavigation,script,formatVersion,requires,permissions,...unchanged}=project.manifest;assert.deepEqual(unchanged,before);
    assert.equal(permissions,undefined,'D-pad navigation must not request Packs can change games');
    const hostFeatures=context.COMPANION_HOST_REQUIREMENTS[id];
    if(hostFeatures){assert.equal(formatVersion,4);assert.deepEqual(JSON.parse(JSON.stringify(requires)),{features:Array.from(hostFeatures)});}
    else{assert.equal(formatVersion,2);assert.equal(requires,undefined);}
    assert.equal(profile.extends,undefined);assert.equal(profile.version,1);
  }
  assert.deepEqual(profiles['fe6-remastered'],profiles['fe8-vietnamese']);
  assert.deepEqual(profiles['fe8-english'],profiles['fe8-vietnamese']);
  assert.equal(profiles['fe6-english'].unitStateBytes,2);
  assert.equal(profiles['fe6-project-ember'].playerScript,'0x087FF4B0');
  assert.deepEqual(profiles['fe6-project-ember'],profiles['fe6-project-ember-rr']);
  const excluded=context.COMPANION_PROFILES.filter(p=>p.cursorNavigationVerified===false);
  assert.deepEqual(Array.from(excluded,p=>p.id),[]);
  assert.deepEqual(profiles.pokemblem.modeGuard,{address:'0x030017A7',mask:'0x01',expected:'0x00'});
  const {modeGuard,...tactical}=profiles.pokemblem;
  assert.deepEqual(tactical,profiles['fe8-english']);
  for(const profile of excluded){
    const manifest={id:profile.id,version:'0.1.0',match:{gameCode:[profile.code],crc32:[profile.crc32]}},before=structuredClone(manifest),project={manifest,files:{}};
    context.CompanionRuntime.install(project,profile.id,'{}');
    assert.equal(project.manifest.cursorNavigation,undefined);
    const {script,...unchanged}=project.manifest;assert.deepEqual(unchanged,before);
  }
});
test('navigation inheritance rejects unknown and cyclic presets',()=>{
  assert.throws(()=>resolveCursorProfiles({presets:{a:{extends:'a'}},profiles:{x:'a'}}),/Cyclic/);
  assert.throws(()=>resolveCursorProfiles({presets:{},profiles:{x:'missing'}}),/Unknown/);
});
test('navigation packaging refuses a wildcard match before modifying pack files',()=>{
  const context={TextEncoder,Buffer};
  for(const file of ['site/runtime-modules.js','site/runtime-packager.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  const project={manifest:{id:'test',script:'old.lua',match:{gameCode:['TEST']}},files:{'old.lua':'original'}};
  assert.throws(()=>context.CompanionRuntime.install(project,'fe7-english','{}'),/exact ROM/);
  assert.deepEqual(project.files,{'old.lua':'original'});
});

test('native D-pad packaging replaces old metadata and removes withdrawn write permission and private requirements',()=>{
  const context={TextEncoder,Buffer};
  for(const file of ['site/runtime-modules.js','site/runtime-packager.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  const project={manifest:{id:'test',formatVersion:4,script:'old.lua',match:{gameCode:['AE7E'],crc32:['C99A6D26']},permissions:['memory-write'],cursorNavigation:{modeGuard:{}},requires:{features:['fe-map-mode-guard-v1']}},files:{'old.lua':'old'}};
  context.CompanionRuntime.install(project,'dark-lord-maiden-of-light','{}');
  assert.equal(project.manifest.formatVersion,2);assert.equal(project.manifest.requires,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(project.manifest.cursorNavigation)),resolveCursorProfiles(source)['dark-lord-maiden-of-light']);
  assert.equal(project.manifest.permissions,undefined);
});
