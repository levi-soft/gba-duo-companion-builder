import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';import assert from 'node:assert/strict';import {luaFactory}from '../scripts/runtime-validation-engine.mjs';

test('The Last Promise inherits the English FE7 UI and Talk without foreign skill panels',async()=>{
  const c={structuredClone,TextEncoder,TextDecoder,Uint8Array,Buffer};
  for(const file of ['runtime-modules.js','theme.js','radar.js','profiles/fe7-vietnamese/template.js',
    'profiles/fe7-vietnamese/prepare.js','profiles/fe6-remastered/template.js','profiles/fe7-english/template.js',
    'profiles/the-last-promise/template.js','profiles/the-last-promise/prepare.js'])
    vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),c,{filename:file});
  const p=c.THE_LAST_PROMISE_TEMPLATE;
  assert.equal(p.manifest.version,'1.0.0');assert.equal(p.uiLanguage,'en');
  assert.deepEqual(JSON.parse(JSON.stringify(p.manifest.match)),{gameCode:['AE7E'],crc32:['D1C6E5D5']});
  const layout=JSON.stringify(p.layout);
  for(const binding of ['talkAvailable','Growth rates','Battle analysis'])assert(layout.includes(binding),binding);
  assert(!layout.includes('nativeSkill6Icon'));assert(!layout.includes('growthMagCurrent'));
  function validChildren(node) {
    if(!node||typeof node!=='object')return;
    if(node.children)assert(node.children.every(child=>child && typeof child==='object'),'Null widget in layout');
    for(const value of Object.values(node))if(value&&typeof value==='object')Array.isArray(value)?value.forEach(validChildren):validChildren(value);
  }
  validChildren(p.layout);
  assert.equal(Object.keys(p.files).length,0);
  const wrong=new Uint8Array(256);wrong.set(new TextEncoder().encode('AE7E'),0xac);
  await assert.rejects(c.TheLastPromisePrep.prepare(wrong,p,null),/CRC32 D1C6E5D5/);
});

test('class-specific level caps preserve level-20 eligibility for a level-30 class',async()=>{
 const e=await luaFactory().createEngine();
 try {
  e.global.set('source',fs.readFileSync('runtime/the-last-promise/presentation.growth.lua','utf8'));
  assert.equal(await e.doString(`
    local apply=assert(load(source))()
    for _,case in ipairs({{20,20,false},{20,30,true},{29,30,true},{30,30,false}})do
      local v={growthLevelCap=case[2],level=case[1],exp=99,deployment=1,forecastActive=true,rngExpHit=1,rngExpKill=10}
      apply(v)
      assert(v.predictionDamageEligible==case[3] and v.predictionKillEligible==case[3])
      assert(v.growthLevelCap==case[2])
    end
    return true
  `),true);
 } finally {e.global.close();}
});

test('Aid follows mounted/gender attributes even when personal constitution is nonzero',async()=>{
 const e=await luaFactory().createEngine();
 try {
  e.global.set('source',fs.readFileSync('runtime/the-last-promise/presentation.unit-stats.lua','utf8'));
  assert.equal(await e.doString(`
   local c,k={attributes=0},{attributes=1}
   local apply=assert(load(source))()({mapMeta={chars={[1]=c},classes={[2]=k}}})
   local v={unitPresent=true,characterPointer=1,classPointer=2,con=12}
   apply(v);assert(v.aid==13)
   c.attributes=0x4000;apply(v);assert(v.aid==8)
   k.attributes=0;apply(v);assert(v.aid==11)
   v.unitPresent=false;v.aid='---';apply(v);assert(v.aid=='---')
   return true
  `),true);
 }finally{e.global.close();}
});
