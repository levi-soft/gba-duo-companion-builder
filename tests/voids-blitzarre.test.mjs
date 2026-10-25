import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

test('Void exact-ROM profile inherits English FE8, adds six skill details, and rejects foreign ROMs',async()=>{
  const c={structuredClone,TextEncoder,TextDecoder,Uint8Array};c.globalThis=c;
  for(const file of ['runtime-modules.js','theme.js','radar.js','profiles/fe6-remastered/template.js','profiles/fe8-vietnamese/template.js','profiles/fe8-vietnamese/prepare.js','profiles/fe8-english/template.js','profiles/fe8-english/prepare.js','profiles/voids-blitzarre/template.js','profiles/voids-blitzarre/prepare.js'])vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),c);
  const p=c.VOIDS_BLITZARRE_TEMPLATE,layout=JSON.stringify(p.layout);
  assert.equal(p.manifest.version,'1.0.0');assert.equal(p.manifest.match.crc32[0],'9D22107C');assert.equal(p.uiLanguage,'en');
  assert(layout.includes('Growth rates')&&layout.includes('Battle analysis'));
  for(let n=1;n<=6;n++){assert(layout.includes('nativeSkill'+n));assert(layout.includes('void-skill-icon-'+n));}
  assert(layout.includes('Range-changing skills are not included'));
  assert(!JSON.stringify(c.FE8_ENGLISH_TEMPLATE.layout).includes('void-skill-icon'));
  const nodes=[];function walk(n){if(!n||typeof n!=='object')return;if(n.id)nodes.push(n.id);for(const v of Object.values(n))if(v&&typeof v==='object')Array.isArray(v)?v.forEach(walk):walk(v);}walk(p.layout);
  assert.equal(new Set(nodes).size,nodes.length,'layout node IDs must remain unique');
  const wrong=new Uint8Array(256);wrong.set(new TextEncoder().encode('BE8E'),0xac);
  await assert.rejects(c.VoidsBlitzarrePrep.prepare(wrong,p,null),/CRC32 9D22107C/);
  const modules=c.COMPANION_RUNTIME_MODULES['voids-blitzarre'];
  for(const name of ['main.lua','game.map.lua','game.units.lua','presentation.forecast.lua'])assert.equal(modules[name],c.COMPANION_RUNTIME_MODULES['fe8-english'][name]);
  // The builder must append extra ROM tables before serializing the Lua export.
  let contract;c.FE8PublicPrep.prepare=(a,b,d,e,f)=>{contract=f;};c.VoidsBlitzarrePrep.prepare(wrong,p,null);
  const data={fe8Chapters:[{name:'Prologue: IT BEGINS'},{name:'11: Factory Gold'},{name:'Final: End of All'},{name:'Unbroken Heart'}]},images=[];let textId=0;
  c.CompanionRom.tiles=()=>new Uint8Array(16*16*4);
  await contract.prepareExtra({reader:{u8:()=>0,u32:()=>0,u16:()=>++textId,text:id=>'Skill '+id+': Description'},bytes:new Uint8Array(),data,image:async(path)=>{images.push(path);return 'asset:'+path;}});
  assert.equal(Object.keys(data.skillData).length,138);assert.equal(images.length,138);assert.equal(data.skillConfig.learnedLimit,0x46);
  assert.deepEqual(data.fe8Chapters,[{label:'Prologue',name:'IT BEGINS'},{label:'Ch. 11',name:'Factory Gold'},{label:'Final',name:'End of All'},{name:'Unbroken Heart'}]);
});

test('Void skill getter follows personal/class/BWL and generic level-list order, then clears stale details',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    engine.global.set('source',fs.readFileSync('runtime/voids-blitzarre/game.abilities.lua','utf8'));
    assert.equal(await engine.doString(`
      local bytes={};local function put(a,v,n)for i=0,n-1 do bytes[a+i]=(v>>(i*8))&255 end end
      mem={u8=function(a)return bytes[a] or 0 end,u32=function(a)local v=0;for i=0,3 do v=v|((bytes[a+i]or 0)<<(i*8))end;return v end}
      pack={require=function(name)assert(name=='game.talk');return function()return function()end end end}
      local u,c,k=0x02001000,0x08000100,0x08000200
      local cfg={personal=0x08000300,classes=0x08000400,level=0x08000500,bwl=0x02002000,learnedLimit=70}
      local D={skillConfig=cfg,skillData={},chars={[c]={}},classes={[k]={}}}
      for i=1,20 do D.skillData[i]={name='Skill '..i,description='Description '..i,icon='icon'..i}end
      put(u,c,4);put(u+4,k,4);put(c+4,70,1);put(k+4,2,1);put(u+8,5,1)
      put(cfg.personal+70,1,1);put(cfg.classes+2,2,1)
      for i=1,4 do put(cfg.bwl+70*16+i,i+2,1)end
      local apply=assert(load(source))()(D).apply;local v={};apply(v,u)
      assert(v.nativeSkillCount==6);for i=1,6 do assert(v['nativeSkill'..i..'Id']==i)end
      -- Generic IDs above the learned threshold use class level lists, not BWL.
      put(c+4,71,1);put(cfg.personal+71,7,1);put(cfg.level+8,0x08000600,4)
      for i,x in ipairs({1,8,6,9,255,10,0,0})do put(0x08000600+i-1,x,1)end
      apply(v,u);assert(v.nativeSkillCount==4 and v.nativeSkill1Id==7 and v.nativeSkill2Id==2 and v.nativeSkill3Id==8 and v.nativeSkill4Id==10)
      assert(not v.nativeSkill5Present and v.nativeSkill5Name=='' and v.nativeSkill6Icon=='')
      put(cfg.personal+71,200,1);apply(v,u);assert(v.nativeSkill1Name=='Skill 200' and v.nativeSkill1Present)
      apply(v,nil);assert(v.nativeSkillCount==0);for i=1,6 do assert(v['nativeSkill'..i..'Id']==0 and v['nativeSkill'..i..'Description']=='')end
      return true
    `),true);
  }finally{engine.global.close();}
});

test('Void protected-store workaround requires the exact signature and leaves valid RAM paths intact',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    engine.global.set('source',fs.readFileSync('runtime/voids-blitzarre/game.execution.lua','utf8'));
    engine.global.set('cpuSource',fs.readFileSync('runtime/shared/features.thumb.lua','utf8'));
    assert.equal(await engine.doString(`
      local hook=assert(load(source))().beforeEntry[0x08B5A7EE]
      local op={[0x08B5A7EE]=0x569A,[0x08B5A7F0]=0x1852,[0x08B5A7F2]=0x715A,[0x08B5A7F4]=0x6860,[0x08B5A7F8]=0x2866,[0x0802B7EA]=0x4A11}
      local read=function(a,n)assert(n==2);return op[a]end
      assert(hook({[3]=0x02000000},function()error('must not inspect valid RAM path')end)==nil)
      assert(hook({[3]=4},read)==0x08B5A7F4)
      op[0x08B5A7F2]=0;assert(not pcall(hook,{[3]=4},read))
      -- Test redirect execution and address guards with a tiny independent Thumb program.
      mem={u8=function()return 0 end,u16=function(a)return a==0x08000002 and 0x2007 or 0x4770 end}
      local cpu=assert(load(cpuSource))()
      local done,result=cpu.start(0x08000000,{},nil,{beforeEntry={[0x08000000]=function()return 0x08000002 end}})(10)
      assert(done and result==7)
      for _,bad in ipairs({9,0x02000000,0x08000001,0x0A000000})do
        local run=cpu.start(0x08000000,{},nil,{beforeEntry={[0x08000000]=function()return bad end}})
        assert(not pcall(run,10),'unsafe redirect accepted')
      end
      return true
    `),true);
  }finally{engine.global.close();}
});
