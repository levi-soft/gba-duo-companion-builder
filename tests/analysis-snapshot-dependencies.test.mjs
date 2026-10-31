import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject}from '../scripts/runtime-validation-engine.mjs';
const encode=s=>Buffer.from(s).toString('base64');
test('Analysis discards late stale native reads and invalidates completed results on their actual dependencies',async()=>{
 const modules={
  'main.lua':`local apply=pack.require('features.analysis')({});function update()return apply({forecastActive=true,exp=1})end`,
  'features.analysis.lua':fs.readFileSync('runtime/fe8-vietnamese/features.analysis.lua','utf8'),
  'game.snapshot.lua':fs.readFileSync('runtime/shared/game.snapshot.lua','utf8'),
  'game.profile.lua':`return{activeUnit=0x03000010}`,
  'features.exp.lua':`return function(kill,ram)local ticks=0;return function()ticks=ticks+1;if ticks<2 then return false end;return true,{gain=ram(0x0203F800),leveled=false}end end`,
  'features.level_prediction.lua':`return function()error('No level job is eligible')end`
 };
 const ew=Buffer.alloc(0x40000);ew[0x3F800]=1;
 const p={manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(modules).map(([k,v])=>[k,encode(v)]))};
 const run=await executeProject(p,{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
  {ticks:1},
  {ticks:1,patches:[{address:0x0203F800,bytes:[2]}],expect:{analysisReady:false,rngExpHit:undefined,rngExpKill:undefined,predictionBusy:true}},
  {ticks:6,expect:{analysisReady:true,rngExpHit:2,rngExpKill:2}},
  {ticks:1,patches:[{address:0x0203F800,bytes:[3]}],expect:{analysisReady:false,rngExpHit:undefined}},
  {ticks:6,expect:{analysisReady:true,rngExpHit:3,rngExpKill:3}}
 ]});
 assert(run.values.every(v=>v.rngExpHit!==1));assert.equal(run.readOnly,true);
});
