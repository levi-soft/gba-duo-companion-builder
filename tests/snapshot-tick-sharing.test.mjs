import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=source=>Buffer.from(source).toString('base64');

function fixture(main){return {manifest:{script:'main.lua'},files:{
  'main.lua':encode(main),
  'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8'))
}};}

test('Growth, movement and Analysis share one immutable RAM copy within an update', async()=>{
  const project=fixture(`local capture=pack.require('game.snapshot');local original=mem.read;local reads=0
    mem.read=function(...)reads=reads+1;return original(...)end
    function update()
      capture.begin()
      local move=select(1,capture());local growth=select(1,capture());local analysis=select(1,capture())
      capture.finish()
      return {same=move==growth and growth==analysis,reads=reads,value=analysis(0x02000000)}
    end`);
  const result=await executeProject(project,{host:'official',ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000,7)},{address:0x03000000,bytes:Buffer.alloc(0x8000)}]});
  assert.deepEqual(result.values[0],{same:true,reads:5,value:7});
});

test('the next update captures fresh RAM while unfinished jobs retain their original snapshot',async()=>{
  const project=fixture(`local capture=pack.require('game.snapshot');local old
    function update()
      capture.begin();local ram=capture();old=old or ram;capture.finish()
      return {old=old(0x02000000),current=ram(0x02000000)}
    end`);
  const result=await executeProject(project,{host:'official',ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000,7)},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[{}, {patches:[{address:0x02000000,bytes:[9]}]}]});
  assert.deepEqual(result.values,[{old:7,current:7},{old:7,current:9}]);
});

test('an interrupted update cannot carry its shared RAM copy into the next update',async()=>{
  const project=fixture(`local capture=pack.require('game.snapshot')
    function update()
      capture.begin();local first=capture()
      -- A caller can be interrupted before finish; begin discards that frame.
      capture.begin();local second=capture();capture.finish()
      return {fresh=first~=second}
    end`);
  const result=await executeProject(project,{host:'official',ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000)},{address:0x03000000,bytes:Buffer.alloc(0x8000)}]});
  assert.equal(result.values[0].fresh,true);
});

test('standalone capture keeps its fresh-per-call API and shared bus snapshots are detached',async()=>{
  const project=fixture(`local capture=pack.require('game.snapshot')
    function update()
      local first=capture();local second=capture()
      capture.begin();local _,a=capture();a.biosPrefetch=0;local _,b=capture();capture.finish()
      return {distinct=first~=second,bios=b.biosPrefetch}
    end`);
  const result=await executeProject(project,{busContext:{version:1,platform:'gba',biosPrefetch:0xE3A02004},ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000)},{address:0x03000000,bytes:Buffer.alloc(0x8000)}]});
  assert.deepEqual(result.values[0],{distinct:true,bios:0xE3A02004});
});
