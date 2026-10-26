import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

test('smaller FE8 work slices preserve CPU execution and level results across all phases',async()=>{
  const engine=await luaFactory().createEngine();
  try {
    engine.global.set('cpuSource',fs.readFileSync('runtime/shared/features.thumb.lua','utf8'));
    engine.global.set('predictionSource',fs.readFileSync('runtime/fe8-vietnamese/features.level_prediction.lua','utf8'));
    assert.equal(await engine.doString(`
      local bytes={}
      local function put(a,v,n)for i=0,n-1 do bytes[a+i]=(v>>(i*8))&255 end end
      local function read(a,n)local v=0;for i=0,n-1 do v=v|((bytes[a+i]or 0)<<(i*8))end;return v end
      mem={u8=function(a)return read(a,1)end,u16=function(a)return read(a,2)end,u32=function(a)return read(a,4)end}
      local actor,target=0x0203A4EC,0x0203A56C
      put(0x0203A4D4,1,2);put(actor+11,1,1);put(target+11,129,1)
      put(0x08003004,0x0202BE4C,4);put(0x08003204,0x0202CFBC,4)
      local entries={unitLookup=0x08003000,levelUp=0x08002000}
      for i,name in ipairs({'prepareBattle','normalBattle','finishBattle','expClear','restoreWeapon','expApply'})do
        local at=0x08001000+i*16;entries[name]=at
        -- Synthetic native routine: a 200-iteration loop, then return.
        put(at,0x20c8,2);put(at+2,0x3801,2);put(at+4,0xd1fd,2);put(at+6,0x4770,2)
      end
      local cpu=assert(load(cpuSource))();local measured={}
      pack={require=function(name)
        if name=='game.snapshot' then return function()return mem.u8 end end
        assert(name=='features.thumb')
        return {start=function(...)
          local run=cpu.start(...);local previous=0
          return function(slice)
            measured.maximum=math.max(measured.maximum,slice)
            local done,result,shadow,steps=run(slice)
            measured.steps=measured.steps+steps-previous;previous=steps
            return done,result,shadow,steps
          end
        end}
      end}
      local make=assert(load(predictionSource))()
      local function evaluate(slice)
        measured={maximum=0,steps=0};entries.cpuStepsPerTick=slice
        local run=make(mem.u8,entries);local ticks=0;local done,result
        repeat ticks=ticks+1;done,result=run();assert(ticks<100)until done
        return result,ticks,measured.steps,measured.maximum
      end
      local baseline,oldTicks,oldSteps,oldMax=evaluate(nil)
      local candidate,newTicks,newSteps,newMax=evaluate(512)
      assert(oldMax==2048 and newMax==512 and newTicks>oldTicks)
      assert(oldSteps==newSteps,'slicing must not skip native instructions')
      for i=1,8 do assert(candidate[i]==baseline[i])end
      entries.cpuStepsPerTick=0;assert(not pcall(make,mem.u8,entries))
      return true
    `),true);
  } finally {engine.global.close();}
});

test('analysis retries only opted-in transient budget failures on the same frozen snapshot',async()=>{
  const engine=await luaFactory().createEngine();
  try {
    engine.global.set('analysisSource',fs.readFileSync('runtime/fe8-vietnamese/features.analysis.lua','utf8'));
    assert.equal(await engine.doString(`
      local actor=0x0203A4EC
      mem={u16=function()return 0 end,u32=function()return 0 end,
        u8=function(a)return a==actor+9 and 97 or a==actor+8 and 1 or 0 end,
        read=function(a,n)return string.rep(string.char(0),n)end}
      ui={predictionPopup=true}
      local function scenario(retries,reason,alwaysFail)
        local launches,snapshots,slices=0,0,{}
        local frozen=function()return 0 end
        pack={require=function(name)
          if name=='game.profile' then return {activeUnit=0x03004E50} end
          if name=='game.snapshot' then return function()snapshots=snapshots+1;return frozen end end
          if name=='features.exp' then return function(kill,ram)
            assert(ram==frozen);return function()return true,{gain=kill and 53 or 10,leveled=true}end
          end end
          assert(name=='features.level_prediction')
          return function(ram,entries)
            assert(ram==frozen);launches=launches+1;slices[#slices+1]=entries.cpuStepsPerTick
            local attempt=launches
            return function()
              if alwaysFail or attempt<3 then error(reason)end
              return true,{1,2,3,4,5,6,7,8},100
            end
          end
        end}
        local update=assert(load(analysisSource))()({execution={cpuStepsPerTick=512,analysisBudgetRetries=retries}})
        local v
        for i=1,14 do v=update({forecastActive=true,exp=97,level=1,unitName='Fixture',deployment=1})end
        assert(snapshots==1 and v.rngExpHit==10 and v.rngExpKill==53)
        return v,launches,slices
      end
      local timeout='script exceeded its per-tick time limit'
      local v,n,s=scenario(2,timeout,false)
      assert(n==3 and s[1]==512 and s[2]==256 and s[3]==128)
      assert(v.predictionComplete and v.predictionAvailable and not v.analysisPredictionError)
      assert(v.rngHpGain==1 and v.rngMagGain==3 and v.rngResGain==8)
      v,n=scenario(2,timeout,true);assert(n==3 and v.analysisPredictionError:find(timeout,1,true))
      v,n=scenario(0,timeout,false);assert(n==1 and v.analysisPredictionError)
      v,n=scenario(2,'Unsupported EXP instruction',false)
      assert(n==1 and v.analysisPredictionError:find('Unsupported EXP instruction',1,true))
      return true
    `),true);
  } finally {engine.global.close();}
});
