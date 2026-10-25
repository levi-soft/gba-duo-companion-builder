import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {resolveCursorProfiles} from '../scripts/cursor-profiles.mjs';

const source=JSON.parse(fs.readFileSync('runtime/cursor/profiles.json','utf8'));
test('all declared companions package resolved navigation without changing their identity or version',()=>{
  const context={TextEncoder,Buffer};
  for(const file of ['site/runtime-modules.js','site/runtime-packager.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  const profiles=resolveCursorProfiles(source);assert.equal(Object.keys(profiles).length,Object.keys(context.COMPANION_RUNTIME_MODULES).length);
  for(const [id,profile] of Object.entries(profiles)){
    const manifest={id,version:id.includes('vietnamese')||id==='fe6-remastered'?'1.0.0':'0.1.0',match:{gameCode:['TEST'],crc32:['12345678']}};
    const before=structuredClone(manifest),project={manifest,files:{}};
    context.CompanionRuntime.install(project,id,'{}');
    assert.deepEqual(JSON.parse(JSON.stringify(project.manifest.cursorNavigation)),profile);
    const {cursorNavigation,script,...unchanged}=project.manifest;assert.deepEqual(unchanged,before);
    assert.equal(cursorNavigation.extends,undefined);assert.equal(cursorNavigation.version,1);
  }
  assert.deepEqual(profiles['fe6-remastered'],profiles['fe8-vietnamese']);
  assert.deepEqual(profiles['fe8-english'],profiles['fe8-vietnamese']);
  assert.equal(profiles['fe6-english'].unitStateBytes,2);
  assert.equal(profiles['fe6-project-ember'].playerScript,'0x087FF4B0');
  assert.deepEqual(profiles['fe6-project-ember'],profiles['fe6-project-ember-rr']);
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
