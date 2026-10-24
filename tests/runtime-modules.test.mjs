import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory,executeProject,compareProjects} from '../scripts/runtime-validation-engine.mjs';

const factory=luaFactory();
const file=value=>Buffer.from(value).toString('base64');
test('Lua module loader keeps module state isolated and preserves outputs',async()=>{
 const before={manifest:{script:'old.lua'},files:{'old.lua':file('local tick=0;function update()tick=tick+1;return {hp=mem.u8(0x02000000),tick=tick,tab=ui.tab}end')}};
 const after={manifest:{script:'main.lua'},files:{
  'main.lua':file('local read=pack.require("game.units")();function update()return read()end'),
  'game.units.lua':file('return function()local tick=0;return function()tick=tick+1;return {hp=mem.u8(0x02000000),tick=tick,tab=ui.tab}end end'),
 }};
 const options={factory,ranges:[{address:0x02000000,bytes:Buffer.from([10])}],steps:[{ticks:3,ui:{tab:'Units'}},{ticks:2,ui:{tab:'Map'},patches:[{address:0x02000000,bytes:[7]}]}]};
 assert.deepEqual(await compareProjects(before,after,options),{ticks:5,readOnly:true,fieldsCompared:15});
 const first=await executeProject(after,options),second=await executeProject(after,options);
 assert.deepEqual(first.values,second.values,'Module cache must not leak across Lua states');
 assert.equal(first.values[3].hp,7);
 const longTrace=await executeProject(after,{...options,steps:[{ticks:100,ui:{tab:'Units'}}]});
 assert.equal(longTrace.values.at(-1).tick,100,'Long traces must not exhaust the host Lua stack');
});
test('offline Lua host preserves binary memory bytes and rejects module path escapes',async()=>{
 const project={manifest:{script:'main.lua'},files:{'main.lua':file('function update()local s=mem.read(0x02000000,4);return {n=#s,a=s:byte(1),b=s:byte(2),c=s:byte(3),d=s:byte(4)}end')}};
 const result=await executeProject(project,{factory,ranges:[{address:0x02000000,bytes:Buffer.from([0,127,128,255])}]});
 assert.deepEqual(result.values[0],{n:4,a:0,b:127,c:128,d:255});
 project.files['main.lua']=file('pack.require("../private");function update()return{}end');
 await assert.rejects(executeProject(project,{factory}),/Unsafe module name/);
 project.files['main.lua']=file('pack.require("empty");pack.require("empty");function update()return {loads=loads}end');
 project.files['empty.lua']=file('loads=(loads or 0)+1;return nil');
 assert.equal((await executeProject(project,{factory})).values[0].loads,2,'Nil modules are not cached by native pack.require');
});
