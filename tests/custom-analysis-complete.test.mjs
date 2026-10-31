import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const ids=['bells-of-byelen','cerulean-crescent','morrows-golden-country','pokemblem','sun-gods-wrath'];
const encode=source=>Buffer.from(source).toString('base64');

// Authored functional contract fixtures. Exact-ROM execution is a separate
// integration gate; these jobs deliberately supply known conditional results.
for(const id of ids)test(id+' Analysis publishes conditional EXP and level gains through native jobs',async()=>{
  const ram=Buffer.alloc(0x40000),actor=0x3A4EC;
  ram[0]=1;ram[actor+8]=1;ram[actor+9]=97;ram[actor+11]=1;
  const project={manifest:{script:'main.lua'},files:{
    'main.lua':encode(`local analyze=pack.require('features.analysis')({execution={cpuStepsPerTick=512}})
      function update()return analyze({forecastActive=mem.u8(0x02000000)==1,exp=97,level=1,deployment=1,unitName='Fixture',portrait='',powerLabel='Str'})end`),
    'features.analysis.lua':encode(fs.readFileSync('runtime/'+id+'/features.analysis.lua','utf8')),
    'features.fe8-analysis.lua':encode(fs.readFileSync('runtime/fe8-vietnamese/features.analysis.lua','utf8')),
    'features.rng-indicator.lua':encode('return function()return function(v)return v end end'),
    'game.profile.lua':encode('return {activeUnit=0x03004E50}'),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.exp.lua':encode(`return function(kill,ram,entries)
      assert(type(ram)=='function' and ram(0x0203A4EC+9)==97)
      assert(entries.cpuStepsPerTick==512)
      return function()return true,{gain=kill and 36 or 10,leveled=true}end
    end`),
    'features.level_prediction.lua':encode(`return function(ram,entries)
      assert(type(ram)=='function' and ram(0x0203A4EC+9)==97)
      assert(entries.cpuStepsPerTick==512)
      return function()return true,{1,1,0,1,1,0,0,1},100 end
    end`)
  }};
  const run=await executeProject(project,{ranges:[{address:0x02000000,bytes:ram},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[{ticks:12,ui:{predictionPopup:true}},{ticks:1,patches:[{address:0x02000000,bytes:[0]}]}]});
  const v=run.values[11];
  assert.equal(v.analysisReady,true,'An active forecast must run conditional EXP jobs');
  assert.equal(v.analysisFailed,false);assert.equal(v.rngExpHit,10);assert.equal(v.rngExpKill,36);
  assert.equal(v.predictionDamageEligible,true);assert.equal(v.predictionKillEligible,true);
  assert.equal(v.predictionComplete,true);assert.equal(v.predictionAvailable,true);
  for(const [key,value]of Object.entries({Hp:1,Power:1,Mag:0,Skill:1,Spd:1,Luck:0,Def:0,Res:1}))assert.equal(v['rng'+key+'Gain'],value,key);
  assert.equal(run.values[12].analysisPresent,false);assert.equal(run.values[12].predictionAvailable,false);
  assert.equal(run.readOnly,true);
});

test('Bells initializes only the dead upper halfword in its accessory argument spill',async()=>{
  const rom=Buffer.alloc(0x1100);
  // Authored Thumb ABI fixture: the compiler spills u16, reloads u32, and the
  // next callee only consumes its low byte. All other unknown stack stays strict.
  [0x9801,0x0600,0x0E00,0x4770].forEach((op,n)=>rom.writeUInt16LE(op,0x1000+n*2));
  const project={manifest:{script:'main.lua'},files:{
    'main.lua':encode(`local start=pack.require('features.thumb').start
      local recipe=pack.require('game.execution')
      function update()
        assert(recipe.beforeEntry and recipe.beforeEntry[0x0981D924],'Missing exact padding hook')
        local initial={[0x03007E04]=0x34,[0x03007E05]=0x12}
        local ok,err=pcall(function()start(0x08001000,{},initial,{strictStack=true})(8)end)
        assert(not ok and tostring(err):find('Unknown caller stack byte',1,true))
        local done,value,shadow=start(0x08001000,{},initial,{strictStack=true,beforeEntry={[0x08001000]=recipe.beforeEntry[0x0981D924]}})(8)
        assert(done and value==0x34 and shadow[0x03007E06]==0 and shadow[0x03007E07]==0)
        assert(shadow[0x03007E04]==0x34 and shadow[0x03007E05]==0x12)
        initial[0x03007E04]=nil
        ok,err=pcall(function()start(0x08001000,{},initial,{strictStack=true,beforeEntry={[0x08001000]=recipe.beforeEntry[0x0981D924]}})(8)end)
        assert(not ok and tostring(err):find('Unknown caller stack byte',1,true))
        return {verified=true}
      end`),
    'game.execution.lua':encode(fs.readFileSync('runtime/bells-of-byelen/game.execution.lua','utf8')),
    'features.thumb.lua':encode(fs.readFileSync('runtime/shared/features.thumb.lua','utf8'))
  }};
  const run=await executeProject(project,{rom,ranges:[{address:0x03000000,bytes:Buffer.alloc(0x8000)}]});
  assert.equal(run.values[0].verified,true);assert.equal(run.readOnly,true);
});

for(const id of ids)test(id+' Growth atomically publishes native rates and never carries them to another identity',async()=>{
  const ew=Buffer.alloc(0x40000);ew[0]=1;ew[0x11E]=10;ew[0x21E]=30;
  const helper='runtime/shared/features.native-growth.lua';
  const project={manifest:{script:'main.lua'},files:{
    'main.lua':encode(`local D={customProfile={supports=true,split=false,growthNote='Base fixture'},levelCaps={[2]=30},slots={[1]=0x02000100,[2]=0x02000200},growthCharacters={},growthClasses={},chars={}}
      for n=1,2 do local cp=0x08000100+n*0x100;D.chars[cp]={attributes=0};D.growthCharacters[cp]={growth={50,50,50,50,50,50,50},radars={'asset:base.png'}} end
      D.growthClasses[0x08000800]={id=1,attributes=0}
      D.execution={cpuStepsPerTick=512,nativeGrowth={refreshTicks=100,getters={{key='Hp',label='HP',entry=0x08001000,currentField='maxHp'},{key='Power',label='Str',entry=0x08002000,currentField='str'}}}}
      local growth=pack.require('features.growth')(D)
      function update()local id=mem.u8(0x02000000);return growth({unitPresent=true,characterPointer=0x08000100+id*0x100,classPointer=0x08000800,deployment=id,level=1,exp=0,maxHp=20,str=8})end`),
    'features.growth.lua':encode(fs.readFileSync('runtime/'+id+'/features.growth.lua','utf8')),
    ...(fs.existsSync(helper)?{'features.native-growth.lua':encode(fs.readFileSync(helper,'utf8'))}:{}),
    'features.base-growth.lua':encode('return function()return function(v)return v end end'),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.thumb.lua':encode(`return {start=function(entry,args,initial,options)
      assert(options.strictStack and options.busContext.biosPrefetch==0x12345678)
      local value=options.ramByte(args[1]+30)+(entry==0x08002000 and 5 or 0);local steps=0
      return function(slice)steps=steps+slice;if steps<1024 then return false,nil,nil,steps end;return true,value,{},steps,options.busContext end
    end}`)
  }};
  const result=await executeProject(project,{busContext:{version:1,platform:'gba',biosPrefetch:0x12345678},ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
    {ticks:4,ui:{growthPopup:true}},
    {ticks:1,ui:{growthPopup:true},patches:[{address:0x0200011E,bytes:[20]}]},
    {ticks:3,ui:{growthPopup:true}},
    {ticks:1,ui:{growthPopup:true},patches:[{address:0x02000000,bytes:[2]}]},
    {ticks:3,ui:{growthPopup:true}}
  ]});
  assert.equal(result.values[0].nativeGrowthReady,false);assert.equal(result.values[0].growthHp,'---');
  const first=result.values[3];assert.equal(first.nativeGrowthReady,true);assert.equal(first.growthHp,10);assert.equal(first.growthPower,15);assert.deepEqual(first.growthRadarRates,[10,15]);
  assert.deepEqual(first.growthRadarAxes,['HP','Str']);assert.deepEqual(first.growthRadarCurrent,[20,8]);
  const pending=result.values[4];assert.equal(pending.nativeGrowthPending,true);assert.equal(pending.growthRatesStale,true);assert.equal(pending.growthHp,10);
  assert.equal(result.values[7].growthHp,20);assert.equal(result.values[7].growthRatesStale,false);
  const changed=result.values[8];assert.equal(changed.nativeGrowthReady,false);assert.equal(changed.growthHp,'---');assert.equal(Object.keys(changed.growthRadarRates).length,0);
  assert.equal(result.values[11].growthHp,30);assert.equal(result.values[11].growthPower,35);assert.equal(result.readOnly,true);
});

for(const [id,api,magChar,magClass]of [
  ['bells-of-byelen','BellsOfByelenPrep',0x11176D0,0x11178D0],
  ['cerulean-crescent','CeruleanCrescentPrep',0xB2C124,0xB2C324],
  ['sun-gods-wrath','SunGodsWrathPrep',0x1ED2DC8,0x1ED2FC8],
])test(id+' prepares separate combat Magic growth and cap',async()=>{
  let profile;const context={Uint8Array,TextDecoder,CompanionLatinText:()=>'',CompanionRom:{b64:s=>Buffer.from(s).toString('base64')},FE8PublicPrep:{prepare(...args){profile=args[4];}}};
  vm.runInNewContext(fs.readFileSync('site/profiles/'+id+'/prepare.js','utf8'),context);
  context[api].prepare();
  const cp=0x08004000,kp=0x08008000,support=0x1000;
  const reader={u32:at=>at===0x28534?0x08000000+support:0,u16:()=>0,text:()=>'',u8:at=>at===magChar+3?77:at===magClass+10?66:at>=support&&at<support+56?(at-support)%8===0?Math.floor((at-support)/8)+1:0:3};
  const D={chars:{[cp]:{id:1}},classes:{[kp]:{id:2}},mapMeta:{chars:{}},growthCharacters:{[cp]:{growth:[10,20,30,40,50,60,70],radars:['asset:old.png']}},growthClasses:{[kp]:{id:2}},lookup12:{},fe8Chapters:[]},project={files:{'assets/old.png':'old'}};
  await profile.prepareExtra({reader,bytes:new Uint8Array(0x2000),data:D,project,options:{renderRadar:async()=>new Uint8Array([137])},image:()=>{throw Error('Unexpected portrait');}});
  assert.equal(D.customProfile.split,true,'The native magic attack must have its own displayed stat');
  assert.equal(D.equipmentConfig.magicOffset,0x3A);
  assert.deepEqual(Array.from(D.growthCharacters[cp].rates),[10,20,77,30,40,70,50,60]);
  assert.equal(D.growthClasses[kp].caps[2],66);
  assert.equal(D.lookup12[kp],'Str');
});

test('Sun predicts the persisted Magic result at its native class cap',async()=>{
  const rom=Buffer.alloc(0x1ED3000),ew=Buffer.alloc(0x40000);
  rom.writeUInt32LE(0x02000100,0x59A5D4);rom[0x1004]=1;rom[0x1ED2FC8+6]=24;
  ew.writeUInt32LE(0x08001000,0x104);ew[0x3A4EC+11]=1;ew[0x13A]=23;
  const project={manifest:{script:'main.lua'},files:{
    'main.lua':encode(`local recipe=pack.require('game.execution')
      function update()
        assert(type(recipe.transformGains)=='function','Missing native Sun writeback contract')
        local gains={1,0,1,0,0,0,0,0};recipe.transformGains(gains,function(a)return mem.u8(a)end,{})
        return {hpGain=gains[1],magGain=gains[3]}
      end`),
    'game.execution.lua':encode(fs.readFileSync('runtime/sun-gods-wrath/game.execution.lua','utf8'))
  }};
  const run=await executeProject(project,{rom,ranges:[{address:0x02000000,bytes:ew}],steps:[{expect:{magGain:1,hpGain:1}},{patches:[{address:0x0200013A,bytes:[24]}],expect:{magGain:0,hpGain:1}}]});
  assert.equal(run.readOnly,true);
});

test('native Growth publishes live cap-probe output atomically with its rates',async()=>{
  const ew=Buffer.alloc(0x40000);ew[0x112]=20;
  const project={manifest:{script:'main.lua'},files:{
    'main.lua':encode(`local D={slots={[1]=0x02000100},execution={cpuStepsPerTick=512,nativeGrowth={getters={{key='Hp',label='HP',entry=0x08001000,currentField='maxHp'}},capProbe={entry=0x08003000,fields={{key='Hp',offset=18,gainOffset=0x73}}}}}}
      local apply=pack.require('features.native-growth')(D)
      function update()return apply({unitPresent=true,characterPointer=0x08000100,classPointer=0x08000200,deployment=1,maxHp=20})end`),
    'features.native-growth.lua':encode(fs.readFileSync('runtime/shared/features.native-growth.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.thumb.lua':encode(`return {start=function(entry,args,initial,options)
      local ticks=0
      if entry==0x08003000 then assert(args[1]==0x02000100 and args[2]==0x0203FE00);assert(initial[0x0203FE00+0x73]==127)end
      return function()ticks=ticks+1;if ticks==1 then return false end
        if entry==0x08003000 then initial[0x0203FE00+0x73]=40;return true,0,initial,1024,options.busContext end
        return true,75,{},1024,options.busContext
      end
    end}`)
  }};
  const result=await executeProject(project,{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[{ticks:4,ui:{growthPopup:true}}]});
  assert.equal(result.values[1].nativeGrowthReady,false,'Rates await the same-snapshot native cap result');
  assert.equal(result.values[3].growthHp,75);assert.equal(result.values[3].growthHpCap,60);assert.equal(result.values[3].nativeGrowthReady,true);assert.equal(result.readOnly,true);
});

for(const id of ids.filter(id=>id!=='pokemblem'))test(id+' composes verified native movement without borrowing another unit total',async()=>{
  const ram=Buffer.alloc(0x40000);ram[0]=1;ram[1]=255;
  const project={manifest:{script:'main.lua'},files:{
    'main.lua':encode(`local D={nativeMovementVerified=true,slots={[1]=0x02000100,[2]=0x02000200},mapMoveForUnit=function()local n=mem.u8(0x02000001);return n~=255 and n or nil end}
      local read=pack.require('game.units')(D,{},{},{})
      function update()return read()end`),
    'game.units.lua':encode(fs.readFileSync('runtime/'+id+'/game.units.lua','utf8')),
    'presentation.native-movement.lua':encode(fs.readFileSync('runtime/shared/presentation.native-movement.lua','utf8')),
    'game.profile.lua':encode('return{}'),
    'game.fe8-units-stat.lua':encode(`return function(D,map,values,abilities,options)
      assert(options.inspectionPc==0x0859ACA8)
      local bind=pack.require('presentation.native-movement')(D)
      return function()local id=mem.u8(0x02000000);return bind({unitPresent=true,deployment=id,characterPointer=0x08000000+id*100,classPointer=0x08000800,move=99})end
    end`)
  }};
  const result=await executeProject(project,{ranges:[{address:0x02000000,bytes:ram}],steps:[
    {expect:{move:'---',nativeMovePending:true,nativeMoveStale:false}},
    {patches:[{address:0x02000001,bytes:[6]}],expect:{move:6,nativeMovePending:false}},
    {patches:[{address:0x02000001,bytes:[255]}],expect:{move:6,nativeMovePending:true,nativeMoveStale:true}},
    {patches:[{address:0x02000000,bytes:[2]}],expect:{move:'---',nativeMovePending:true,nativeMoveStale:false}}
  ]});assert.equal(result.readOnly,true);
});

test('native Growth ignores unrelated clocks and rejects a newly read changed dependency',async()=>{
  const iw=Buffer.alloc(0x8000);iw[0x5270]=10;
  const project={manifest:{script:'main.lua'},files:{
    'main.lua':encode(`local D={slots={[1]=0x02000100},execution={cpuStepsPerTick=512,nativeGrowth={refreshTicks=100,getters={{key='Hp',label='HP',entry=0x08001000,currentField='maxHp'}}}}}
      local apply=pack.require('features.native-growth')(D)
      function update()local v=apply({unitPresent=true,characterPointer=0x08000100,classPointer=0x08000200,deployment=1,maxHp=20});v.started=started or 0;return v end`),
    'features.native-growth.lua':encode(fs.readFileSync('runtime/shared/features.native-growth.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.thumb.lua':encode(`return {start=function(entry,args,initial,options)
      started=(started or 0)+1;local ticks=0
      return function()ticks=ticks+1;if ticks==1 then return false end
        return true,options.ramByte(0x03005270),{},1024,options.busContext
      end
    end}`)
  }};
  const run=await executeProject(project,{ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000)},{address:0x03000000,bytes:iw}],steps:[
    {ui:{growthPopup:true}},
    {ui:{growthPopup:true},patches:[{address:0x0203E900,bytes:[1]},{address:0x03005270,bytes:[11]}]},
    {ui:{growthPopup:true},patches:[{address:0x0203E900,bytes:[2]}]},
    {ui:{growthPopup:true},patches:[{address:0x0203E900,bytes:[3]}]},
    {ui:{growthPopup:false},patches:[{address:0x03005270,bytes:[12]}]},
    {ui:{growthPopup:true}},
    {ui:{growthPopup:true}}
  ]});
  assert.equal(run.values[1].nativeGrowthReady,false,'A changed late-read dependency cannot publish the old frozen value');
  assert.equal(run.values[3].growthHp,11,'Unrelated clock updates do not starve the retry');
  assert.equal(run.values[4].growthHp,11);assert.equal(run.values[4].growthRatesStale,true);assert.equal(run.values[4].started,2,'Closed Growth queues refresh without starting a CPU job');
  assert.equal(run.values[6].growthHp,12);assert.equal(run.readOnly,true);
});
