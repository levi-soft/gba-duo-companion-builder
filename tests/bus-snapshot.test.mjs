import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const file=s=>Buffer.from(s).toString('base64');
const context={version:1,platform:'gba',biosPrefetch:0xE3A02004};
test('bus context is an explicit read-only snapshot, not a raw BIOS-memory read',async()=>{
  const p={manifest:{script:'main.lua'},files:{'main.lua':file(`function update()
    local a=mem.busContext();local before=a.biosPrefetch;a.biosPrefetch=0
    local b=mem.busContext();return{version=b.version,platform=b.platform,before=before,after=b.biosPrefetch}
  end`)}};
  const result=await executeProject(p,{busContext:context});
  assert.deepEqual(result.values[0],{version:1,platform:'gba',before:0xE3A02004,after:0xE3A02004});
  assert.equal(context.biosPrefetch,0xE3A02004);
  await assert.rejects(executeProject(p,{busContext:{...context,biosPrefetch:0x100000000}}),/bus context/);
});
test('RAM snapshot retains its original bus context when the next frame changes',async()=>{
  const p={manifest:{script:'main.lua'},files:{
    'main.lua':file(`local capture=pack.require('game.snapshot');local ram,context
      function update()if not ram then ram,context=capture()end
      return{ram=ram(0x02000000),bios=context.biosPrefetch,current=mem.busContext().biosPrefetch}end`),
    'game.snapshot.lua':file(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8'))
  }};
  const result=await executeProject(p,{busContext:context,ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000,7)},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[{ticks:1},{ticks:1,busContext:{...context,biosPrefetch:0xE129F000},patches:[{address:0x02000000,bytes:[9]}]}]});
  assert.deepEqual(result.values,[{ram:7,bios:0xE3A02004,current:0xE3A02004},{ram:7,bios:0xE3A02004,current:0xE129F000}]);
});
test('Analysis freezes bus context into EXP and level jobs and invalidates on a changed latch',async()=>{
  const p={manifest:{script:'main.lua'},files:{
    'main.lua':file(`local D={execution={marker=17}};local analyze=pack.require('features.analysis')(D)
      function update()return analyze({forecastActive=true,unitName='Fixture',exp=99})end`),
    'features.analysis.lua':file(fs.readFileSync('runtime/fe8-vietnamese/features.analysis.lua','utf8')),
    'game.snapshot.lua':file(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'game.profile.lua':file('return{activeUnit=0x03000010}'),
    'features.exp.lua':file(`return function(kill,ram,entries)
      assert(entries.marker==17 and entries.busContext.version==1)
      local gain=entries.busContext.biosPrefetch&255
      return function()return true,{gain=gain,leveled=true}end
    end`),
    'features.level_prediction.lua':file(`return function(ram,entries)
      assert(entries.marker==17 and entries.busContext.platform=='gba')
      local gain=entries.busContext.biosPrefetch&255
      return function()return true,{gain,0,0,0,0,0,0,0},100 end
    end`)
  }};
  const ew=Buffer.alloc(0x40000);ew[0x3A4EC+9]=99;
  const result=await executeProject(p,{busContext:context,ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[{ticks:8,ui:{predictionPopup:true}},{ticks:8,ui:{predictionPopup:true},busContext:{...context,biosPrefetch:0xE3A02005}}]});
  assert.equal(result.values[7].analysisReady,true);assert.equal(result.values[7].analysisDamageExp,4);assert.equal(result.values[7].rngHpGain,4);
  assert.equal(result.values[15].analysisReady,true);assert.equal(result.values[15].analysisDamageExp,5);assert.equal(result.values[15].rngHpGain,5);
});
