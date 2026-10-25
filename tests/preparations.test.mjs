import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

for(const id of ['fe7-vietnamese','fe6-remastered','fe8-vietnamese']){
  test(id+': Preparations follows roster, items and stat selection without stale units',async()=>{
    const profile=fs.readFileSync(`runtime/${id}/game.profile.lua`,'utf8');
    const address=key=>Number(profile.match(new RegExp(key+' = (0x[0-9A-Fa-f]+)'))[1]);
    const ram=Buffer.alloc(0x40000),base=0x02000000,proc=address('processPool');
    const units=[0x0202BD50,0x0202BD98];
    const write=(a,value,width=4)=>ram.writeUIntLE(value,a-base,width);
    units.forEach((unit,index)=>{write(unit,0x08001000+index*0x34);write(unit+4,0x08002000);write(unit+11,index+1,1);write(unit+19,20,1);write(unit+12,8);});
    write(proc,address('prepUnitProcess'));write(proc+4,address('prepUnitProcess')+8);
    write(address('prepUnitList'),units[0]);write(address('prepUnitList')+4,units[1]);write(address('prepUnitList')+0x100,2);
    const file=text=>Buffer.from(text).toString('base64');
    const project={manifest:{script:'main.lua'},files:{
      'main.lua':file(`local D={slots={[1]=${units[0]},[2]=${units[1]}},chars={[0x08001000]={},[0x08001034]={}},classes={[0x08002000]={}}}
local read=pack.require('game.preparations')(D.slots,D,pack.require('game.profile'))
function update()local unit,active=read();return {unit=unit or 0,active=active}end`),
      'game.profile.lua':file(profile),
      'game.preparations.lua':file(fs.readFileSync('runtime/shared/game.preparations.lua'))
    }};
    const patch=(address,value,width=4)=>{const bytes=Buffer.alloc(width);bytes.writeUIntLE(value,0,width);return {address,bytes:[...bytes]};};
    const result=await executeProject(project,{ranges:[{address:base,bytes:ram}],steps:[
      {expect:{unit:units[0],active:true}},
      {patches:[patch(proc+0x2E,1,2)],expect:{unit:units[1],active:true}},
      {patches:[patch(proc+0x2E,2,2)],expect:{unit:0,active:true}},
      {patches:[patch(proc+0x2E,0,2),patch(units[0]+12,4)],expect:{unit:0}},
      {patches:[patch(units[0]+12,8),patch(proc,address('prepItemProcess')),patch(proc+4,address('prepItemProcess')+8),patch(proc+0x2A,1,1)],expect:{unit:units[1]}},
      {patches:[patch(proc+108,address('statScreenProcess')),patch(proc+112,address('statScreenProcess')+8),patch(address('statScreenUnit'),units[0])],expect:{unit:units[0]}},
      {patches:[patch(address('statScreenUnit'),0)],expect:{unit:0,active:true}},
      {patches:[patch(proc+108,0),patch(address('prepUnitList')+0x100,65)],expect:{unit:0}},
      {patches:[patch(address('prepUnitList')+0x100,2),patch(address('prepUnitList')+4,0x03000000)],expect:{unit:0}},
      {patches:[patch(proc+4,0)],expect:{unit:0,active:false}},
      {patches:[patch(proc,address('prepMainProcess')),patch(proc+4,address('prepMainProcess')+8)],expect:{unit:0,active:true}},
      {patches:[patch(proc,0)],expect:{unit:0,active:false}}
    ]});
    assert.equal(result.readOnly,true);
    assert.equal(result.values.length,12);
  });
}
