import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

function context(){
  const c={structuredClone,TextEncoder,TextDecoder,Uint8Array};
  for(const file of ['runtime-modules.js','theme.js','radar.js','profiles/fe6-remastered/template.js',
    'profiles/fe8-vietnamese/template.js','profiles/fe8-vietnamese/prepare.js',
    'profiles/fe8-english/template.js','profiles/sacred-echoes/template.js','profiles/sacred-echoes/prepare.js'])
    vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),c,{filename:file});
  return c;
}

test('Sacred Echoes keeps shared English UI and its own exact ROM identity',async()=>{
  const c=context(),p=c.SACRED_ECHOES_TEMPLATE;
  assert.equal(p.manifest.version,'1.0.0');assert.equal(p.uiLanguage,'en');
  assert.equal(p.manifest.match.crc32[0],'13F15F23');
  assert.equal(Object.keys(p.files).length,0);
  assert(JSON.stringify(p.layout).includes('Battle analysis'));
  const nodes=[];
  function collect(node){if(!node || typeof node!=='object')return;nodes.push(node);
    for(const value of Object.values(node))if(value && typeof value==='object')
      Array.isArray(value)?value.forEach(collect):collect(value);}
  collect(p.layout);
  assert(nodes.some(node=>node.id==='remaster-talk-badge' && node.visibleIf==='$talkAvailable'));
  assert(nodes.some(node=>node.name==='talk' && JSON.stringify(node).includes('{talkPrompt}')));
  assert(nodes.some(node=>node.onClick?.set?.inventoryDetail==='talk'));
  const ranks=nodes.find(node=>node.class==='weapon-ranks');
  assert.equal(ranks.children.length,8);
  assert(!JSON.stringify(ranks).includes('rankStaff'));
  assert(JSON.stringify(ranks).includes('{rankDragonstone}'));
  assert(JSON.stringify(ranks).includes('weapon-ranks/dragonstone.png'));
  const wrong=new Uint8Array(256);wrong.set(new TextEncoder().encode('BE8E'),0xac);
  await assert.rejects(c.SacredEchoesPrep.prepare(wrong,p,null),/CRC32 13F15F23/);
  let profile;c.FE8PublicPrep.prepare=(a,b,d,e,f)=>{profile=f;};c.SacredEchoesPrep.prepare(null);
  assert.equal(profile.portraits,0x1094E64);assert.equal(profile.textEncoding,'latin1');
  assert.equal(profile.iconPalettes,0xFCA21C);assert.equal(profile.uiIconPaletteBank,1);
  assert.equal(c.COMPANION_RUNTIME_MODULES['sacred-echoes']['game.preparations.lua'],
    c.COMPANION_RUNTIME_MODULES['fe8-english']['game.preparations.lua']);
  assert.equal(c.COMPANION_CURSOR_PROFILES['sacred-echoes'].cursor,'0x0202BCC4');
});

test('native query jobs share a strict slice across phases without coroutine support',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    engine.global.set('source',fs.readFileSync('runtime/shared/features.native-query.lua','utf8'));
    const result=await engine.doString(`
      coroutine=nil
      local work,completed=0,{}
      pack={require=function()return {start=function(entry,args,shadow)
        local spent=0
        return function(budget)
          local n=math.min(budget,entry-spent);spent=spent+n;work=work+n
          shadow.count=(shadow.count or 0)+n
          return spent==entry,args[1],shadow,spent
        end
      end}end}
      local job=assert(load(source))()({})
      job.add(700,{11},function(value,shadow)
        completed[#completed+1]=value
        job.add(300,{22},function(value)completed[#completed+1]=value end)
      end)
      local ticks=0
      repeat
        local before=work;local done=job.step(128);ticks=ticks+1
        assert(work-before<=128,'slice was exceeded')
        if done then break end
      until ticks>20
      assert(work==1000 and ticks==8)
      assert(completed[1]==11 and completed[2]==22)
      return true
    `);
    assert.equal(result,true);
  }finally{engine.global.close();}
});

test('Sacred Echoes HP forecast pays spell costs per strike and respects Pact',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    engine.global.set('source',fs.readFileSync('runtime/sacred-echoes/game.battle.lua','utf8'));
    assert.equal(await engine.doString(`
      local actor,target=0x0203A4EC,0x0203A56C
      local hp,pact=2,false
      local D={chars={[1]={attributes=0}},classes={[2]={attributes=0}},spellCosts={[0x38]=1},drainItems={}}
      mem={u16=function(a)return a==actor+0x4A and 0xFF38 or 0 end,
        u32=function(a)if a==actor or a==target then return 1 end
          if a==actor+4 or a==target+4 then return 2 end
          return 8 end,
        u8=function(a)if a==actor+0x72 then return hp end
          if a==target+0x72 or a==target+18 then return 20 end
          if a==actor+18 then return 10 end
          return a==actor+0x52 and 1 or 0 end,
        s16=function(a)return a==actor+0x5E and 10 or 0 end}
      pack={require=function()return function()return function(v)
        v.forecastActive=true;v.forecastactorHp=hp;v.forecasttargetHp=20
        v.forecastactorMt=3;v.forecasttargetMt=0;return v
      end end end}
      local read=assert(load(source))()(D)
      local v=read({});assert(v.forecastactorAfterHp==1)
      hp=3;v=read({});assert(v.forecastactorAfterHp==1)
      D.chars[1].attributes=0x10000
      hp=2;v=read({});assert(v.forecastactorAfterHp==2)
      return true
    `),true);
  }finally{engine.global.close();}
});
