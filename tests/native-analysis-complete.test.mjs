import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const ids=['andaron-saga','justice-and-pride','the-dark-amulet','the-four-kings','shadow-of-dawn','dream-of-five','iron-emblem','the-lonely-mirror','eligors-spear'];
const encode=text=>Buffer.from(text).toString('base64');
for(const id of ids)test(id+' completes conditional EXP and near-level jobs instead of returning a permanent gate',async()=>{
 const modules={
  'features.analysis.lua':fs.readFileSync(fs.existsSync('runtime/'+id+'/features.analysis.lua')?'runtime/'+id+'/features.analysis.lua':'runtime/fe8-vietnamese/features.analysis.lua','utf8'),
  'features.fe8-analysis.lua':fs.existsSync('runtime/shared/features.fe8-analysis.lua')?fs.readFileSync('runtime/shared/features.fe8-analysis.lua','utf8'):fs.readFileSync('runtime/fe8-vietnamese/features.analysis.lua','utf8'),
  'game.snapshot.lua':`return function()return function(address)return mem.u8(address)end end`,
  'game.profile.lua':`return{activeUnit=0x03004E50}`,
  'game.execution.lua':fs.readFileSync('runtime/'+id+'/game.execution.lua','utf8'),
  'game.official-bios.lua':fs.readFileSync('runtime/shared/game.official-bios.lua','utf8'),
  'features.exp.lua':`return function(kill)expStarts=expStarts+1;local ticks=0;return function()ticks=ticks+1;if ticks<2 then return false end;return true,{gain=kill and 100 or 27,leveled=true}end end`,
  'features.level_prediction.lua':`return function(ram,entries)assert(entries.signedGains==true,'New profile must opt into signed native gains');levelStarts=levelStarts+1;local ticks=0;return function()ticks=ticks+1;if ticks<2 then return false,nil,50 end;return true,{1,0,1,0,1,0,0,1},100 end end`,
  'main.lua':`expStarts,levelStarts=0,0;local apply=pack.require('features.analysis')({execution=pack.require('game.execution')})
   function update()local v=apply({forecastActive=ui.forecast~=false,unitPresent=true,deployment=1,unitName='Fixture',level=1,exp=99});v.expStarts=expStarts;v.levelStarts=levelStarts;return v end`
 };
 const project={manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(modules).map(([name,source])=>[name,encode(source)]))};
 const run=await executeProject(project,{ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000)},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
  {ticks:16,ui:{predictionPopup:true},expect:{analysisReady:true,predictionAvailable:true,predictionComplete:true,rngExpHit:27,rngExpKill:100,expStarts:2,levelStarts:1}},
  {ticks:4,expect:{expStarts:2,levelStarts:1}},
  {ticks:16,patches:[{address:0x03000000,bytes:[1]}],expect:{analysisReady:true,predictionAvailable:true,expStarts:4,levelStarts:2}},
  {ticks:1,ui:{forecast:false},expect:{analysisReady:false,predictionAvailable:false}},
  {ticks:16,expect:{analysisReady:true,predictionAvailable:true,expStarts:6,levelStarts:3}}
 ]});assert.equal(run.readOnly,true);
});

async function thumbProbe(opcodes,args,options={}){
 const rom=Buffer.alloc(64);opcodes.forEach((word,n)=>rom.writeUInt16LE(word,n*2));
 const p={manifest:{script:'main.lua'},files:{
  'features.thumb.lua':encode(fs.readFileSync('runtime/shared/features.thumb.lua','utf8')),
  'main.lua':encode(`local context=mem.busContext and mem.busContext();local run=pack.require('features.thumb').start(0x08000000,{${args.join(',')}},nil,{strictStack=true,maxSteps=100000,busContext=context,registers={[4]=0x02003000}})
   ${options.mutateContext?'context.biosPrefetch=0xDEADBEEF':''}
   function update()local done,value,s,steps,bus=run(${options.slice||128});s=s or {};local function byte(a)return s[a] or mem.u8(a)end
    local destination={};for n=0,79 do destination[#destination+1]=string.format('%02x',byte(0x02002000+n))end
    local registers={};for n=0,3 do local value=0;for k=0,3 do value=value|(byte(0x02003000+n*4+k)<<(k*8))end;registers[#registers+1]=value end
    return{done=done,value=value,steps=steps,bus=bus,destination=table.concat(destination),registers=registers}end`)
 }};
 const ew=Buffer.alloc(0x40000);ew.fill(0xCC,0x2000,0x2050);for(let n=0;n<128;n++)ew[0x1000+n]=n+1;
 return executeProject(p,{rom,busContext:options.context,ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[{ticks:options.ticks||1}]});
}
test('protected BIOS reads use captured context at each native width/alignment and ignore ROM stores',async()=>{
 const context={version:1,platform:'gba',biosPrefetch:0xE3A02004},expected={1:[4,32,160,227],2:[0x2004,0x04000020,0xE3A0,0xA00000E3],4:[0xE3A02004,0x04E3A020,0x2004E3A0,0xA02004E3]};
 for(const width of [1,2,4])for(let offset=0;offset<4;offset++)for(const store of [false,...(offset===0?[true]:[])]){
  const opcodes=[...(store?[{1:0x7001,2:0x8001,4:0x6001}[width]]:[]),{1:0x7800,2:0x8800,4:0x6800}[width],0x4770];
  const run=await thumbProbe(opcodes,[0x20C+offset,0xDEADBEEF],{context});assert.equal(run.values[0].value,expected[width][offset]);assert.equal(run.readOnly,true);
 }
 await assert.rejects(thumbProbe([0x7800,0x4770],[0x20C]),/captured GBA bus context/);
 for(const biosPrefetch of [0,0x11223344]){
  const run=await thumbProbe([0x6800,0x4770],[0x20C],{context:{version:1,platform:'gba',biosPrefetch},mutateContext:true});
  assert.equal(run.values[0].value,biosPrefetch);assert.equal(run.values[0].bus.biosPrefetch,biosPrefetch);
 }
});

test('unmapped data reads reproduce the native ROM Thumb prefetch bus and keep unsupported I/O closed',async()=>{
 const expected={1:[0x34,0x23,0x34,0x23],2:[0x2334,0x34000023,0x2334,0x34000023],4:[0x23342334,0x34233423,0x23342334,0x34233423]};
 for(const width of [1,2,4])for(let offset=0;offset<4;offset++){
  const run=await thumbProbe([{1:0x7800,2:0x8800,4:0x6800}[width],0x2212,0x2334,0x4770],[0x7A22D000+offset]);
  assert.equal(run.values[0].value,expected[width][offset]);assert.equal(run.readOnly,true);
 }
 const ignored=await thumbProbe([0x6001,0x6800,0x2212,0x2334,0x4770],[0x08000020,0xDEADBEEF]);
 assert.equal(ignored.values[0].value,0);assert.equal(ignored.readOnly,true);
 await assert.rejects(thumbProbe([0x6800,0x4770],[0x04000000]),/outside supported memory/);
 await assert.rejects(thumbProbe([0x4700],[0x7A22D001]),/execution outside supported memory/);
});
test('CpuSet and CpuFastSet preserve native copy/fill/register quirks and yield between work slices',async()=>{
 const context={version:1,platform:'gba',biosPrefetch:0xE3A02004};
 const cases=[
  {swi:11,args:[0x02001000,0x02002000,5,0x11223344],prefix:'0102030405060708090a',registers:[0x02001000,0x02002000,5,0x170]},
  {swi:11,args:[0x02001000,0x02002000,0x04000005,0x11223344],prefix:'0102030405060708090a0b0c0d0e0f1011121314',registers:[0x02001014,0x02002014,0x04000005,0x170]},
  {swi:11,args:[0x02001000,0x02002000,0x04100005,0x11223344],prefix:'0102030405060708090a0b0c0d0e0f1011121314',registers:[0x02001014,0x02002014,0x04100005,0x170]},
  {swi:11,args:[0x02001001,0x02002001,3,0x11223344],prefix:'020004000600',registers:[0x02001001,0x02002001,3,0x170]},
  {swi:11,args:[0x02001001,0x02002001,0x01000003,0x11223344],prefix:'010201020102',registers:[0x02001001,0x02002001,0x01000003,0x170]},
  {swi:11,args:[0x02001003,0x02002001,0x05000003,0x11223344],prefix:'010203040102030401020304',registers:[0x02001007,0x0200200D,0x05000003,0x170]},
  {swi:12,args:[0x02001000,0x02002000,9,0x11223344],prefix:Array.from({length:64},(_,n)=>(n+1).toString(16).padStart(2,'0')).join(''),registers:[0x02001040,0x02002040,9,0x24232221]},
  {swi:12,args:[0x02001003,0x02002001,0x01000003,0x11223344],prefix:'04010203'.repeat(8),registers:[0x02001003,0x02002021,0x01000003,0x03020104]}
 ];
 for(const entry of cases){
  const run=await thumbProbe([0xDF00|entry.swi,0x6020,0x6061,0x60A2,0x60E3,0x4770],entry.args,{context,ticks:3,slice:8}),last=run.values.at(-1);
  assert.equal(last.done,true);assert.equal(last.destination,entry.prefix+'cc'.repeat(80-entry.prefix.length/2));assert.deepEqual(last.registers,entry.registers);assert.equal(last.bus.biosPrefetch,0xE3A02004);assert.equal(run.readOnly,true);
 }
 const large=await thumbProbe([0xDF0B,0x4770],[0x02001000,0x02002000,0x04000100],{context,ticks:4,slice:128});
 assert.equal(large.values[0].done,false);assert.equal(large.values.at(-1).done,true);
 await assert.rejects(thumbProbe([0xDF0B,0x4770],[0x7A22D000,0x02002000,0x04000001],{context}),/Unsupported BIOS copy source/);
});

test('EXP and level jobs retain the SWI-return bus latch between phases and extract optional packed gains',async()=>{
 const rom=Buffer.alloc(0x100),write=(offset,words)=>words.forEach((word,n)=>rom.writeUInt16LE(word,offset+n*2));
 write(0,[0x2006,0x2103,0xDF06,0x4770]);
 // Read protected BIOS only after phase one has changed its latch. Store
 // into a real battle-unit result byte through the caller's R5 actor ABI.
 write(0x20,[0x2000,0x7800,0x4629,0x316E,0x7008,0x4770]);
 write(0x40,[0x2000,0x7800,0x4629,0x3173,0x7008,0x4770]);
 write(0x60,[0x4770]);
 const files={
  'features.thumb.lua':fs.readFileSync('runtime/shared/features.thumb.lua','utf8'),
  'features.exp.lua':fs.readFileSync('runtime/fe8-vietnamese/features.exp.lua','utf8'),
  'features.level_prediction.lua':fs.readFileSync('runtime/fe8-vietnamese/features.level_prediction.lua','utf8'),
  'game.snapshot.lua':`return function()return function(a)return mem.u8(a)end end`,
  'main.lua':`local ram=function(a)return mem.u8(a)end;local context=mem.busContext();local hookCount=0
   local exp=pack.require('features.exp')(false,ram,{expClear=0x08000000,restoreWeapon=0x08000020,expApply=0x08000060,busContext=context,
    beforeEntry={[0x08000000]=function()hookCount=hookCount+1 end}})
   local level=pack.require('features.level_prediction')(ram,{prepareBattle=0x08000000,normalBattle=0x08000040,finishBattle=0x08000060,expClear=0x08000060,restoreWeapon=0x08000060,expApply=0x08000060,unitLookup=0x02001000,busContext=context,
    extraGains={{key='mov',offset=0x59,mask=15},{key='con',offset=0x59,shift=4,mask=15},{key='other',offset=0x7F}}})
   local ed,er,ld,lr
   function update()if not ed then ed,er=exp()end;if not ld then ld,lr=level()end;return{expDone=ed,expGain=er and er.gain,levelDone=ld,hp=lr and lr[1],extra=lr and lr.extraGains,hookCount=hookCount}end`
 };
 const ew=Buffer.alloc(0x40000);ew.writeUInt16LE(1,0x3A4D4);ew[0x3A4EC+0x59]=0x73;ew[0x3A4EC+0x7F]=9;
 const run=await executeProject({manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(files).map(([key,value])=>[key,encode(value)]))},{rom,busContext:{version:1,platform:'gba',biosPrefetch:0x11223344},ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[{ticks:8}]});
 assert.deepEqual(run.values.at(-1),{expDone:true,expGain:4,levelDone:true,hp:4,extra:{mov:3,con:7,other:9},hookCount:1});assert.equal(run.readOnly,true);
});

test('only exact-profile opt-in accepts a native forecast configuration outside retail 1/2',async()=>{
 const rom=Buffer.from([0x70,0x47]),build=allowed=>({manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries({
  'features.thumb.lua':fs.readFileSync('runtime/shared/features.thumb.lua','utf8'),
  'features.level_prediction.lua':fs.readFileSync('runtime/fe8-vietnamese/features.level_prediction.lua','utf8'),
  'game.snapshot.lua':`return function()return function(a)return mem.u8(a)end end`,
  'main.lua':`local job=pack.require('features.level_prediction')(function(a)return mem.u8(a)end,{${allowed?'allowedBattleConfigs={[0]=true,[1]=true,[2]=true},':''}prepareBattle=0x08000000,normalBattle=0x08000000,finishBattle=0x08000000,expClear=0x08000000,restoreWeapon=0x08000000,expApply=0x08000000,unitLookup=0x02000000});function update()local done,gains=job();return{done=done,hp=gains and gains[1]}end`
 }).map(([key,value])=>[key,encode(value)]))});
 const options={rom,ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000)},{address:0x03000000,bytes:Buffer.alloc(0x8000)}]};
 await assert.rejects(executeProject(build(false),options),/Unverified battle configuration: 0000/);
 const run=await executeProject(build(true),options);assert.deepEqual(run.values.at(-1),{done:true,hp:0});assert.equal(run.readOnly,true);
});

async function levelResultFixture(entries='',{implicit=false,biosRead=false}={}){
 const rom=Buffer.alloc(0x200),write=(at,words)=>words.forEach((word,n)=>rom.writeUInt16LE(word,at+n*2));
 for(const at of [0,0x20,0x40,0x60,0x80,0x100])write(at,[0x4770]);
 if(biosRead)write(0x20,[0x2000,0x7800,0x4629,0x3173,0x7008,0x4770]);
 else{
  const words=[],store=(offset,value)=>words.push(0x4629,0x3100|offset,0x2000|value,0x7008);
  [0x73,0x74,0x7A,0x75,0x76,0x79,0x77,0x78].forEach((offset,n)=>store(offset,[216,255,127,128,1,2,3,4][n]));store(0x59,0xED);store(0x7F,0xFC);
  words.push(0x2103,0x0609,0x205A,0x7008,0x4770);write(0x100,words);
 }
 const files={
  'features.thumb.lua':fs.readFileSync('runtime/shared/features.thumb.lua','utf8'),
  'features.level_prediction.lua':fs.readFileSync('runtime/fe8-vietnamese/features.level_prediction.lua','utf8'),
  'game.snapshot.lua':fs.readFileSync('runtime/shared/game.snapshot.lua','utf8'),
  'main.lua':`local transformCalls=0;local job=pack.require('features.level_prediction')(${implicit?'nil':'function(a)return mem.u8(a)end'},{prepareBattle=0x08000000,normalBattle=0x08000020,finishBattle=0x08000040,expClear=0x08000060,restoreWeapon=0x08000080,expApply=0x08000100,levelUp=0x080001F0,unitLookup=0x02001000,${entries}})
   local result;function update()if result then return result end;local done,value=job();if not done then return{done=false}end;local gains={};for n=1,8 do gains[n]=value[n]end;result={done=true,gains=gains,extra=value.extraGains,transformCalls=transformCalls};return result end`
 };
 const ew=Buffer.alloc(0x40000),iw=Buffer.alloc(0x8000);ew.writeUInt16LE(1,0x3A4D4);iw[0]=0x11;
 return executeProject({manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(files).map(([name,source])=>[name,encode(source)]))},{rom,busContext:{version:1,platform:'gba',biosPrefetch:0x11223344},ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:iw}],steps:[{ticks:4}]});
}

test('implicit level snapshot retains its captured BIOS context and explicit context takes precedence',async()=>{
 const captured=await levelResultFixture('',{implicit:true,biosRead:true});assert.equal(captured.values.at(-1).gains[0],0x44);assert.equal(captured.readOnly,true);
 const explicit=await levelResultFixture("busContext={version=1,platform='gba',biosPrefetch=0x55667788},",{implicit:true,biosRead:true});assert.equal(explicit.values.at(-1).gains[0],0x88);assert.equal(explicit.readOnly,true);
});

test('signed gain opt-in decodes native negative bytes and independently signed packed extras',async()=>{
 const recipes="extraGains={{key='mov',offset=0x59,mask=15,signBits=4},{key='con',offset=0x59,shift=4,mask=15,signBits=4},{key='byte',offset=0x7F,signBits=8}},";
 const legacy=await levelResultFixture(recipes),signed=await levelResultFixture('signedGains=true,'+recipes);
 assert.deepEqual(legacy.values.at(-1).gains,[216,255,127,128,1,2,3,4]);assert.deepEqual(legacy.values.at(-1).extra,{mov:-3,con:-2,byte:-4});
 assert.deepEqual(signed.values.at(-1).gains,[-40,-1,127,-128,1,2,3,4]);assert.deepEqual(signed.values.at(-1).extra,{mov:-3,con:-2,byte:-4});assert.equal(signed.readOnly,true);
 await assert.rejects(levelResultFixture('signedGains=1,'),/Invalid signed gain option/);
 for(const signBits of [0,9])await assert.rejects(levelResultFixture(`extraGains={{key='invalid',offset=0x59,signBits=${signBits}}},`),/Invalid extra level-up gain recipe/);
});

test('gain transform runs after every native phase on signed results and rejects invalid publication',async()=>{
 const run=await levelResultFixture(`signedGains=true,transformGains=function(result,frozenRam,shadow)
  transformCalls=transformCalls+1;assert(result[1]==-40 and result[2]==-1);assert(frozenRam(0x03000000)==0x11 and shadow[0x03000000]==0x5A)
  result[3]=0 end,`);
 assert.deepEqual(run.values.at(-1).gains,[-40,-1,0,-128,1,2,3,4]);assert.equal(run.values.at(-1).transformCalls,1);assert.equal(run.readOnly,true);
 await assert.rejects(levelResultFixture('transformGains=1,'),/Invalid gain transform/);
 await assert.rejects(levelResultFixture("transformGains=function()error('verified transform failed')end,"),/verified transform failed/);
 for(const mutation of ["result[1]='bad'",'result[1]=0.5','result[1]=256','result[1]=-256','result[9]=1'])await assert.rejects(levelResultFixture(`transformGains=function(result)${mutation} end,`),/Invalid transformed level-up gains/);
 for(const mutation of ["result.extraGains.mov='bad'",'result.extraGains.mov=nil','result.extraGains.undeclared=1'])await assert.rejects(levelResultFixture(`extraGains={{key='mov',offset=0x59,mask=15}},transformGains=function(result)${mutation} end,`),/Invalid transformed level-up gains/);
});
