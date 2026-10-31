import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';
import {resolveCursorProfiles} from '../scripts/cursor-profiles.mjs';

// Exercise the real authoring generator without changing the coordinated
// product registry or runtime templates. All31 writes are captured in a child.
const generated=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`
  import fs from'node:fs';import path from'node:path';import vm from'node:vm';
  const writes=[];let source;
  fs.writeFileSync=(file,content)=>{
    const name=path.relative(process.cwd(),file).replaceAll('\\\\','/');
    if(name==='site/runtime-modules.js')source=content;
    else if(!(name.startsWith('site/profiles/')&&name.endsWith('/runtime-template.lua')&&name.split('/').length===4))throw Error('Unexpected output '+name);
    writes.push(name);
  };
  console.log=()=>{};await import('./scripts/build-runtime-modules.mjs');
  const context={};vm.runInNewContext(source,context);
  const modules=Object.fromEntries(Object.entries(context.COMPANION_RUNTIME_MODULES).map(([id,files])=>[id,
    Object.fromEntries(['main.lua','game.cursor-focus.lua','game.cursor-profile.lua','presentation.map-picks.lua'].map(name=>[name,files[name]]))]));
  process.stdout.write(JSON.stringify({writes,modules,cursors:context.COMPANION_CURSOR_PROFILES}));
`],{encoding:'utf8',maxBuffer:8*1024*1024}));
const profiles=resolveCursorProfiles(JSON.parse(fs.readFileSync('runtime/cursor/profiles.json')));

test('all30 generated native D-pad contracts use current source and keep game writes out of the navigation helper',async()=>{
  assert.equal(Object.keys(profiles).length,30);assert.equal(generated.writes.length,31);
  for(const[id,expected]of Object.entries(profiles)){
    for(const name of ['game.cursor-focus','presentation.map-picks'])assert.equal(generated.modules[id][name+'.lua'],fs.readFileSync('runtime/shared/'+name+'.lua','utf8').replace(/\r\n/g,'\n'),id+'/'+name);
    assert.doesNotMatch(generated.modules[id]['game.cursor-focus.lua'],/mem\.write|mem\.read|string\.pack/);
    assert.match(generated.modules[id]['game.cursor-focus.lua'],/input\.focusUnit\(id\)/);
    const e=await luaFactory().createEngine();
    try{
      const p=await e.doString(generated.modules[id]['game.cursor-profile.lua']);
      for(const key of ['cursor','size','chapter','turn','bm','procs','playerScript','idlePc','blue','green','red'])assert.equal(p[key],Number(expected[key]),id+'/'+key);
      assert.equal(p.unitStateBytes,expected.unitStateBytes,id);assert.equal(p.unitPosition,expected.unitPosition,id);
      assert.equal(p.hover,undefined,id+' native D-pad movement must not need Lua hover writes');
    }finally{e.global.close();}
  }
});

test('generated Pokemblem keeps all three live FreeMU guards in Lua and sends only the original17 fields to Plus code17',async()=>{
  const e=await luaFactory().createEngine();
  try{
    const p=await e.doString(generated.modules.pokemblem['game.cursor-profile.lua']);
    assert.deepEqual(p.modeGuard.processScripts,[0x0969B044,0x0969B004,0x0969B024]);
    assert.equal(p.modeGuard.address,0x030017A7);assert.equal(p.modeGuard.mask,1);assert.equal(p.modeGuard.expected,0);
  }finally{e.global.close();}
  const context={TextEncoder,Buffer,COMPANION_RUNTIME_MODULES:generated.modules,COMPANION_CURSOR_PROFILES:generated.cursors};
  vm.runInNewContext(fs.readFileSync('site/runtime-packager.js','utf8'),context);
  const project={manifest:{id:'pokemblem',match:{gameCode:['BE8E'],crc32:['EE1FE57E']}},files:{}};
  context.CompanionRuntime.install(project,'pokemblem','{}');
  assert.equal(project.manifest.formatVersion,2);assert.equal(project.manifest.permissions,undefined);assert.equal(project.manifest.requires,undefined);
  assert.equal(Object.keys(project.manifest.cursorNavigation).length,17);
  assert.equal(project.manifest.cursorNavigation.modeGuard,undefined);assert.equal(project.manifest.cursorNavigation.hover,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(project.manifest.cursorNavigation)),Object.fromEntries(Object.entries(profiles.pokemblem).filter(([key])=>key!=='modeGuard')));
});
