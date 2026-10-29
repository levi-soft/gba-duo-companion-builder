import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=s=>Buffer.from(s).toString('base64');
function fixture(){
 const bytes=Buffer.alloc(0x40000),base=0x02000000,u8=(a,v)=>{bytes[a-base]=v;},u32=(a,v)=>bytes.writeUInt32LE(v,a-base);
 const slots={1:base+0x3000,2:base+0x3100,65:base+0x3200,129:base+0x3300};
 for(const [id,unit]of Object.entries(slots)){u32(unit,0x08001000);u32(unit+4,0x08002000);u8(unit+11,+id);u8(unit+19,20);}
 const project={manifest:{script:'main.lua'},files:{
  'main.lua':encode(`local D={chars={[0x08001000]={}},classes={[0x08002000]={}}}
   local slots={[1]=${slots[1]},[2]=${slots[2]},[65]=${slots[65]},[129]=${slots[129]}}
   local cfg={processPool=0x02001000,statScreenProcess=0x08000100,statScreenUnit=0x02000020,
    prepFlagAddress=0x02000030,prepFlagMask=1,prepUnitList=0x02002000}
   local read=pack.require('game.native-selection')(slots,D,cfg)
   function update()local unit,active=read();return{selected=unit or 0,menuActive=active}end`),
  'game.native-selection.lua':encode(fs.readFileSync('runtime/shared/game.native-selection.lua','utf8')),
  'game.preparations.lua':encode(fs.readFileSync('runtime/shared/game.preparations.lua','utf8'))
 }};
 return{bytes,project,slots,u8,u32};
}
test('native stat-screen selection follows every faction independently of the map cursor',async()=>{
 const f=fixture();f.u32(0x02001000,0x08000100);f.u32(0x02001004,0x08000110);
 const run=await executeProject(f.project,{ranges:[{address:0x02000000,bytes:f.bytes}],steps:Object.values(f.slots).map(unit=>({patches:[{address:0x02000020,bytes:Buffer.from(Uint32Array.of(unit).buffer)}],expect:{selected:unit,menuActive:true}}))});
 assert(run.readOnly);assert.equal(run.calls.length,0);
});
test('native menus clear invalid pointers and dead units; ended processes cannot retain selection',async()=>{
 const f=fixture();f.u32(0x02001000,0x08000100);f.u32(0x02001004,0x08000110);f.u32(0x02000020,f.slots[2]);
 const word=n=>Buffer.from(Uint32Array.of(n).buffer);
 const run=await executeProject(f.project,{ranges:[{address:0x02000000,bytes:f.bytes}],steps:[
  {expect:{selected:f.slots[2],menuActive:true}},
  {patches:[{address:f.slots[2]+19,bytes:[0]}],expect:{selected:0,menuActive:true}},
  {patches:[{address:0x02000020,bytes:word(0x01000000)}],expect:{selected:0,menuActive:true}},
  {patches:[{address:0x02000020,bytes:word(f.slots[1])},{address:0x02001004,bytes:word(0)}],expect:{selected:0,menuActive:false}},
  {patches:[{address:0x02001004,bytes:word(0x08000700)}],expect:{selected:0,menuActive:false}}
 ]});assert(run.readOnly);
});
test('Preparations keeps its player-only selection and never falls back to an enemy stat pointer',async()=>{
 const f=fixture();f.u32(0x02001000,0x08000100);f.u32(0x02001004,0x08000110);f.u8(0x02000030,1);f.u32(0x02000020,f.slots[129]);
 const run=await executeProject(f.project,{ranges:[{address:0x02000000,bytes:f.bytes}],steps:[
  {expect:{selected:0,menuActive:true}},
  {patches:[{address:0x02000020,bytes:Buffer.from(Uint32Array.of(f.slots[2]).buffer)}],expect:{selected:f.slots[2],menuActive:true}}
 ]});assert(run.readOnly);
});
