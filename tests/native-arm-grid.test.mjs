import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=source=>Buffer.from(source).toString('base64');
const branch=(from,to,{link=false,condition=14}={})=>((condition<<28)|(link?0x0B000000:0x0A000000)|(((to-from-8)>>2)&0xFFFFFF))>>>0;

export function authoredArmRom(words){
 const rom=Buffer.alloc(0x800);
 // Thumb caller preserves all four argument registers and switches via BX ip.
 [0xB408,0x4B02,0x469C,0xBC08,0x4760,0x46C0].forEach((word,n)=>rom.writeUInt16LE(word,n*2));
 rom.writeUInt32LE(0x08000100,12);words.forEach((word,n)=>rom.writeUInt32LE(word>>>0,0x100+n*4));return rom;
}
export async function runAuthoredArm(words,args=[],{allowArm=true,slice=1000,ticks=1,ewram=Buffer.alloc(0x40000),iwram=Buffer.alloc(0x8000),maxSteps=100000,context}={}){
 const files={
  'features.thumb.lua':fs.readFileSync('runtime/shared/features.thumb.lua','utf8'),
  'main.lua':`local job=pack.require('features.thumb').start(0x08000000,{${args.join(',')}},nil,{allowArm=${allowArm},strictStack=true,maxSteps=${maxSteps},busContext=mem.busContext and mem.busContext()})
   local result
   function update()if result then return result end;local done,value,s,steps,bus=job(${slice});if not done then return{done=false,steps=steps}end
    local function bytes(a,count)local t={};for n=0,count-1 do t[#t+1]=string.format('%02x',s[a+n] or mem.u8(a+n))end;return table.concat(t)end
    result={done=true,value=value,steps=steps,destination=bytes(0x02001000,64),bus=bus};return result end`
 };
 const run=await executeProject({manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(files).map(([name,source])=>[name,encode(source)]))},{rom:authoredArmRom(words),busContext:context,ranges:[{address:0x02000000,bytes:ewram},{address:0x03000000,bytes:iwram}],steps:[{ticks}]});
 assert.equal(run.readOnly,true);return run;
}

test('ARM opt-in executes actual BX, PC+8, BL and stack return; legacy stays closed',async()=>{
 const words=[0xE92D4000,0xE1A0000F,branch(0x108,0x118,{link:true}),0xE8BD4000,0xE12FFF1E,0xE1A00000,0xE2800004,0xE12FFF1E];
 const run=await runAuthoredArm(words,[],{slice:4,ticks:8});
 assert.equal(run.values[0].done,false);assert.equal(run.values.at(-1).done,true);assert.equal(run.values.at(-1).value,0x08000110);
 await assert.rejects(runAuthoredArm(words,[],{allowArm:false}),/ARM branch is not supported/);
});

test('ARM conditions, arithmetic flags and register shifter carry survive non-S instructions',async()=>{
 const carry=await runAuthoredArm([0xE2900001,0xE2A11000,0x01A00001,0xE12FFF1E],[0xFFFFFFFF,5]);
 assert.equal(carry.values.at(-1).value,6);
 for(const [amount,value]of [[0,0x80000001],[1,2],[31,0x80000000],[32,0],[33,0]]){
  const run=await runAuthoredArm([0xE1B00110,0xE12FFF1E],[0x80000001,amount]);assert.equal(run.values.at(-1).value,value);
 }
});

test('ARM word/halfword/signed loads reproduce GBA rotations without host writes',async()=>{
 const ew=Buffer.alloc(0x40000);Buffer.from([0x81,0x23,0xC5,0xF7,0x98,0x76,0x54,0x32]).copy(ew,0x1000);
 for(const [opcode,address,expected]of [
  [0xE5900000,0x02001001,0x81F7C523],[0xE1D000B0,0x02001001,0x81000023],
  [0xE1D000D0,0x02001000,0xFFFFFF81],[0xE1D000F0,0x02001003,0xFFFFFFF7],
  [0xE1D000F0,0x02001002,0xFFFFF7C5]
 ]){const run=await runAuthoredArm([opcode,0xE12FFF1E],[address],{ewram:ew});assert.equal(run.values.at(-1).value,expected);}
});

test('ARM native block transfers use architectural register order and retain low address bits on writeback',async()=>{
 // DB stack save/IA restore plus postindexed and preindexed stores.
 const words=[0xE92D4006,0xE4801004,0xE5E02001,0xE8BD4006,0xE12FFF1E];
 const run=await runAuthoredArm(words,[0x02001001,0x11223344,0xAABBCCDD]);
 assert.equal(run.values.at(-1).value,0x02001006);assert.equal(run.values.at(-1).destination.slice(0,16),'443322110000dd00');
 // LDM without writeback, with base itself in list, must load both words.
 const ew=Buffer.alloc(0x40000);ew.writeUInt32LE(0x11223344,0x1000);ew.writeUInt32LE(0xAABBCCDD,0x1004);
 const ldm=await runAuthoredArm([0xE8900003,0xE12FFF1E],[0x02001001],{ewram:ew});assert.equal(ldm.values.at(-1).value,0x11223344);
});

test('ARM opt-in retains protected-bus context, rejects I/O, and remains cooperatively bounded',async()=>{
 const context={version:1,platform:'gba',biosPrefetch:0x55667788};
 const read=await runAuthoredArm([0xE5900000,0xE12FFF1E],[0x20D],{context});assert.equal(read.values.at(-1).value,0x88556677);assert.deepEqual(read.values.at(-1).bus,context);
 await assert.rejects(runAuthoredArm([0xE5900000,0xE12FFF1E],[0x04000000]),/outside supported memory/);
 await assert.rejects(runAuthoredArm([0xE320F000,0xE12FFF1E]),/Unsupported ARM instruction/);
 await assert.rejects(runAuthoredArm([0xE0000090,0xE12FFF1E]),/Unsupported ARM instruction/);
 await assert.rejects(runAuthoredArm([0xE1B00040,0xE12FFF1E]),/Unsupported ARM ASR immediate zero/);
 await assert.rejects(runAuthoredArm([0xE12FFF1E],[],{allowArm:1}),/Invalid ARM execution option/);
 await assert.rejects(runAuthoredArm([0xE8FD0001,0xE12FFF1E]),/Unsupported ARM/);
 await assert.rejects(runAuthoredArm([0xEAFFFFFE],[],{slice:8,ticks:4,maxSteps:20}),/evaluation limit reached/);
});
