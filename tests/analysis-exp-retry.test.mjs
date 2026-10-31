import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=text=>Buffer.from(text).toString('base64');
const analysis=fs.readFileSync('runtime/fe8-vietnamese/features.analysis.lua','utf8');
const snapshot=fs.readFileSync('runtime/shared/game.snapshot.lua','utf8');

async function scenario({stage=1,reason='script exceeded its per-tick time limit',failures=2,retries=2,constructorFailure=false,level=false,steps}={}){
  const ew=Buffer.alloc(0x40000);ew[0x1000]=42;ew[0x3A4EC+8]=1;
  const files={
    'main.lua':encode(`
      mem.busContext=function()return{version=1,platform='gba',biosPrefetch=0xE3A02004}end
      local base={cpuStepsPerTick=512,analysisBudgetRetries=${retries},marker={}}
      local updateAnalysis=pack.require('features.analysis')({execution=base})
      local v={forecastActive=true,unitName='Fixture',exp=0,level=1}
      function update()
        currentTick=(currentTick or 0)+1;v=updateAnalysis(v)
        assert(base.cpuStepsPerTick==512 and base.busContext==nil,'Shared execution metadata must stay unchanged')
        v.damageAttempts=#launches[1];v.killAttempts=#launches[2];v.damageSlices={};v.killSlices={};v.launchTicks={}
        for stage,attempts in ipairs(launches)do
          local previous=0
          for _,attempt in ipairs(attempts)do
            assert(attempt.tick>previous,'EXP retry must start in a later update');previous=attempt.tick
            table.insert(stage==1 and v.damageSlices or v.killSlices,attempt.slice)
            v.launchTicks[#v.launchTicks+1]=attempt.tick
          end
        end
        v.snapshots=snapshots;v.ramIdentities=0;for _ in pairs(ramIdentities)do v.ramIdentities=v.ramIdentities+1 end
        v.levelAttempts=levelAttempts or 0;v.levelSlices=levelSlices or {};return v
      end
    `),
    'features.analysis.lua':encode(analysis),
    'game.profile.lua':encode('return {activeUnit=0x03004E50}'),
    'game.snapshot.lua':encode(`local actual=(function()${snapshot}\nend)();snapshots=0
      return function()snapshots=snapshots+1;return actual()end`),
    'features.exp.lua':encode(`
      launches={{},{}};ramIdentities={}
      return function(kill,ram,execution)
        local stage=kill and 2 or 1;ramIdentities[ram]=true
        assert(execution.busContext.biosPrefetch==0xE3A02004 and type(execution.marker)=='table')
        local amount=ram(0x02001000)
        local attempt=#launches[stage]+1
        launches[stage][attempt]={slice=execution.cpuStepsPerTick,tick=currentTick}
        local fail=(${stage}==0 or stage==${stage})and attempt<=${failures}
        if fail and ${constructorFailure} then error(${JSON.stringify(reason)})end
        local calls=0
        return function()
          calls=calls+1;assert(calls==1,'An interrupted EXP closure must never resume')
          if fail then error(${JSON.stringify(reason)})end
          return true,{gain=kill and 55 or amount,leveled=${level}}
        end
      end
    `),
    'features.level_prediction.lua':encode(`return function(ram,execution)
      assert(ramIdentities[ram]);levelAttempts=(levelAttempts or 0)+1;levelSlices=levelSlices or {}
      levelSlices[#levelSlices+1]=execution.cpuStepsPerTick;local attempt=levelAttempts;local called=false
      return function()
        assert(not called);called=true
        if attempt<=2 then error('script exceeded its per-tick instruction budget')end
        return true,{1,0,1,0,0,1,0,0},100
      end
    end`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:steps||[{ticks:18,ui:{predictionPopup:true}}]});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);return run;
}

for(const reason of ['script exceeded its per-tick time limit','script exceeded its per-tick instruction budget']){
  for(const stage of [1,2])test(`EXP stage${stage} retries ${reason} with fresh jobs and reduced slices`,async()=>{
    const run=await scenario({stage,reason});const v=run.values.at(-1);
    assert.equal(v.analysisReady,true);assert.equal(v.analysisFailed,false);assert.equal(v.analysisPredictionError,undefined);
    assert.equal(v.analysisDamageExp,42);assert.equal(v.analysisKillExp,55);assert.equal(v.snapshots,1);assert.equal(v.ramIdentities,1);
    assert.deepEqual(stage===1?v.damageSlices:v.killSlices,[512,256,128]);
    assert.deepEqual(stage===1?v.killSlices:v.damageSlices,[512]);
    assert.ok(run.values.slice(0,stage===1?3:3).every(value=>value.predictionBusy&&!value.analysisFailed));
  });
}

for(const stage of [1,2])test(`EXP stage${stage} exhausts only its bounded retry allowance`,async()=>{
  const run=await scenario({stage,failures:99});const v=run.values.at(-1);
  assert.equal(v.analysisFailed,true);assert.equal(v.predictionBusy,false);assert.match(v.analysisPredictionError,/per-tick time limit/);
  assert.deepEqual(stage===1?v.damageSlices:v.killSlices,[512,256,128]);assert.equal(v.snapshots,1);
});

for(const retries of [0,2])test(`EXP ${retries===0?'legacy zero retry':'nonbudget error'} remains fail-closed`,async()=>{
  const reason=retries===0?'script exceeded its per-tick time limit':'Unsupported EXP instruction';
  const v=(await scenario({stage:2,retries,reason})).values.at(-1);
  assert.equal(v.analysisFailed,true);assert.equal(v.predictionBusy,false);assert.ok(v.analysisPredictionError.includes(reason));
  assert.deepEqual(v.damageSlices,[512]);assert.deepEqual(v.killSlices,[512]);
});

test('EXP constructor interruptions retry next update on the same snapshot without mutating execution',async()=>{
  const v=(await scenario({stage:2,constructorFailure:true})).values.at(-1);
  assert.equal(v.analysisReady,true);assert.deepEqual(v.killSlices,[512,256,128]);assert.equal(v.damageAttempts,1);
  assert.equal(v.snapshots,1);assert.equal(v.ramIdentities,1);
});

test('damage, kill and level prediction have independent bounded retry slices',async()=>{
  const v=(await scenario({stage:0,level:true})).values.at(-1);
  assert.equal(v.analysisReady,true);assert.equal(v.predictionAvailable,true);assert.equal(v.analysisPredictionError,undefined);
  assert.deepEqual(v.damageSlices,[512,256,128]);assert.deepEqual(v.killSlices,[512,256,128]);assert.deepEqual(v.levelSlices,[512,256,128]);
  assert.equal(v.snapshots,1);assert.equal(v.ramIdentities,1);
});

test('an observed dependency changing during EXP retry replaces the snapshot before publication',async()=>{
  const run=await scenario({stage:2,failures:1,steps:[
    {ticks:2,ui:{predictionPopup:true}},
    {patches:[{address:0x02001000,bytes:[43]}],ticks:6,ui:{predictionPopup:true}}
  ]});
  const v=run.values.at(-1);assert.equal(v.analysisReady,true);assert.equal(v.analysisDamageExp,43);
  assert.equal(v.analysisKillExp,55);assert.equal(v.snapshots,2);assert.equal(v.ramIdentities,2);
});
