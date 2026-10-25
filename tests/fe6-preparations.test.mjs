import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const root={};root.globalThis=root;
vm.runInNewContext(fs.readFileSync('site/runtime-modules.js','utf8'),root);
const file=text=>Buffer.from(text).toString('base64');
for(const id of ['fe6-english','fe6-project-ember','fe6-project-ember-rr']) {
  test(id+': native Preparations follows benched units, stat view and upper-menu exits without map fallback',async()=>{
    const modules=root.COMPANION_RUNTIME_MODULES[id],profile=modules['game.profile.lua'];
    const address=key=>Number(profile.match(new RegExp(key+' = (0x[0-9A-Fa-f]+)'))[1]);
    const bytes=Buffer.alloc(0x40000),base=0x02000000,proc=address('processPool');
    const units=[0x0202AB78,0x0202ABC0];
    const write=(a,value,size=4)=>bytes.writeUIntLE(value,a-base,size);
    units.forEach((u,n)=>{
      write(u,0x08001000+n*48);write(u+4,0x08002000);write(u+11,n+1,1);
      write(u+12,8,2);write(u+14,0xFE,1);write(u+15,0xFF,1);write(u+17,20,1);
      // +19 stays zero: HP must be read through the FE6 adapter at native +17.
    });
    const menu=address('prepMenuProcess'),stats=address('statScreenProcess'),list=address('prepUnitList');
    write(proc,menu);write(proc+4,menu+8);write(proc+0x29,1,1);write(proc+0x2D,2,1);
    write(list,units[0]);write(list+4,units[1]);
    // The bytes after the native count are deliberately nonzero. FE6 must not
    // interpret gPrepUnitList+0x100 as the FE7/FE8 u32 count layout.
    write(list+0x100,0xABCDFF02);
    const project={manifest:{script:'main.lua'},files:{
      'main.lua':file(`local D={slots={[1]=${units[0]},[2]=${units[1]}},validSlots={[${units[0]}]=1,[${units[1]}]=2},
chars={[0x08001000]={},[0x08001030]={}},classes={[0x08002000]={}}}
local p=pack.require('game.profile')
local memory=pack.require('game.memory')(D)
local read=pack.require('game.preparations')(D.slots,D,p,memory)
function update() local unit,active=read();return {unit=unit or 0,active=active} end`),
      'game.profile.lua':file(profile),'game.memory.lua':file(modules['game.memory.lua']),
      'game.preparations.lua':file(modules['game.preparations.lua'])
    }};
    const patch=(address,value,size=4)=>{const b=Buffer.alloc(size);b.writeUIntLE(value,0,size);return {address,bytes:[...b]};};
    const result=await executeProject(project,{ranges:[{address:base,bytes}],steps:[
      {expect:{unit:units[0],active:true}},
      {patches:[patch(proc+0x30,1,1)],expect:{unit:units[1]}},
      {patches:[patch(proc+0x30,2,1)],expect:{unit:0}},
      {patches:[patch(proc+0x30,0,1),patch(units[0]+12,4,2)],expect:{unit:0}},
      {patches:[patch(units[0]+12,8,2),patch(proc+108,stats),patch(proc+112,stats+8),patch(address('statScreenUnit'),units[1])],expect:{unit:units[1]}},
      {patches:[patch(address('statScreenUnit'),0)],expect:{unit:0,active:true}},
      {patches:[patch(proc+108,0),patch(proc+0x30,1,1),patch(list+4,0x03000000)],expect:{unit:0}},
      {patches:[patch(list+4,units[1]),patch(units[1]+11,1,1)],expect:{unit:0}},
      {patches:[patch(units[1]+11,2,1),patch(units[1],0)],expect:{unit:0}},
      {patches:[patch(units[1],0x08001030),patch(units[1]+17,0,1)],expect:{unit:0}},
      {patches:[patch(units[1]+17,20,1),patch(proc+0x29,0,1)],expect:{unit:0,active:true}},
      {patches:[patch(proc+0x29,1,1),patch(proc+0x2D,65,1)],expect:{unit:0}},
      {patches:[patch(proc+0x2D,2,1),patch(proc+4,0)],expect:{unit:0,active:false}},
      {patches:[patch(address('prepFlagAddress'),0x10,1)],expect:{unit:0,active:true}},
      {patches:[patch(address('prepFlagAddress'),0,1),patch(proc,0)],expect:{unit:0,active:false}},
      {patches:[patch(proc,menu),patch(proc+4,menu+8),patch(proc+0x29,0,1)],expect:{unit:0,active:true}}
    ]});
    assert(result.readOnly);assert.equal(result.values.length,16);
  });
}
