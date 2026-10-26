import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

test('Hag matches one ROM and composes the English eight-stat UI with FE8 contracts',async()=>{
  const c={structuredClone,TextEncoder,TextDecoder,Uint8Array,Buffer};
  for(const file of ['runtime-modules.js','theme.js','radar.js','latin-text.js',
    'profiles/fe6-remastered/template.js','profiles/fe8-vietnamese/prepare.js',
    'profiles/hag-in-white/template.js','profiles/hag-in-white/prepare.js']) {
    vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),c,{filename:file});
  }
  const p=c.HAG_IN_WHITE_TEMPLATE,layout=JSON.stringify(p.layout);
  assert.equal(p.manifest.version,'1.0.0');
  assert.equal(p.manifest.match.crc32[0],'7479D7E2');
  assert.equal(p.uiLanguage,'en');
  for(const label of ['Growth rates','Battle analysis','growthMagCurrent','rngMagResult','skill6Icon'])assert(layout.includes(label),label);
  assert(!layout.includes('Phân tích'));
  const ids=[];
  function visit(n){if(!n||typeof n!=='object')return;if(n.id)ids.push(n.id);for(const v of Object.values(n))if(v&&typeof v==='object')Array.isArray(v)?v.forEach(visit):visit(v);}
  visit(p.layout);assert.equal(new Set(ids).size,ids.length);
  assert.equal(Object.keys(p.files).length,0);
  const wrong=new Uint8Array(256);wrong.set(new TextEncoder().encode('BE8E'),0xac);
  await assert.rejects(c.HagInWhitePrep.prepare(wrong,p,null),/CRC32 7479D7E2/);
  let contract;c.FE8PublicPrep.prepare=(a,b,d,e,f)=>{contract=f;};c.HagInWhitePrep.prepare(wrong,p,null);
  assert.equal(contract.portraits,0x1A6FCCC);assert.equal(contract.sprites,0x1307218);
  assert.equal(contract.text,0x181EBFC);assert.equal(contract.decodeText,c.CompanionLatinText);
  assert.equal(c.CompanionLatinText([0x4c,0xf3,0x70,0x65,0x7a]),'López');
  const modules=c.COMPANION_RUNTIME_MODULES['hag-in-white'];
  for(const file of ['game.profile.lua','game.preparations.lua','features.analysis.lua'])assert.equal(modules[file],c.COMPANION_RUNTIME_MODULES['fe8-english'][file]);
  for(const file of ['features.native-skills.lua','features.base-growth.lua','features.split-growth.lua'])assert(modules[file]);
  // Two zero-growth records share a filename with an intermediate seven-stat
  // diagram. Preparing the second record must not delete the first new image.
  const name='assets/images/growth/0-0-0-0-0-0-0-0.png';
  const record=()=>({growth:Array(7).fill(0),radars:['asset:'+name.slice(7)]});
  const data={chars:{100:{id:1},200:{id:2}},growthCharacters:{100:record(),200:record()},
    growthClasses:{},lookup12:{},fe8Chapters:Array.from({length:79},()=>({name:'Chapter'}))};
  const project={files:{[name]:'old'}},reader={u8:()=>0,u16:()=>0,u32:()=>0,text:()=>''};
  let renders=0;
  await contract.prepareExtra({reader,bytes:new Uint8Array(),data,project,
    options:{renderRadar:async rates=>{assert.equal(rates.length,8);renders++;return new Uint8Array([1]);}},
    image:async()=>{throw Error('No skill images in this fixture');}});
  assert.equal(renders,1);assert.equal(project.files[name],'AQ==');
});

test('native skill evaluation reads its shadow output and rejects incomplete/foreign buffers',async()=>{
  const engine=await luaFactory().createEngine();
  try {
    engine.global.set('source',fs.readFileSync('runtime/shared/features.native-skills.lua','utf8'));
    engine.global.set('cpuSource',fs.readFileSync('runtime/shared/features.thumb.lua','utf8'));
    assert.equal(await engine.doString(`
      -- Synthetic Thumb program: build the skill list {7,0} in private RAM.
      local rom={[0x08000000]=0x4802,[0x08000002]=0x2107,[0x08000004]=0x7001,
        [0x08000006]=0x2100,[0x08000008]=0x7041,[0x0800000a]=0x4770,
        [0x0800000c]=0x1000,[0x0800000e]=0x0200}
      mem={u8=function()return 99 end,u16=function(a)return rom[a]or 0 end,
        u32=function(a)return (rom[a]or 0)|((rom[a+2]or 0)<<16)end}
      local cpu=assert(load(cpuSource))()
      pack={require=function(name)assert(name=='features.thumb');return cpu end}
      local make=assert(load(source))()
      local cfg={entry=0x08000000,buffer=0x02001000,cache=0x02002000,limit=6}
      local read=make(cfg);local ids=read(0x02003000)
      assert(#ids==1 and ids[1]==7 and mem.u8(cfg.buffer)==99)
      assert(#read(nil)==0)
      cfg.buffer=0x02001100;assert(not pcall(read,0x02003000),'foreign output buffer')
      cfg.buffer=0x02001000;rom[0x08000000]=0xe7fe
      assert(not pcall(read,0x02003000),'nonterminating getter')
      return true
    `),true);
  } finally {engine.global.close();}
});
