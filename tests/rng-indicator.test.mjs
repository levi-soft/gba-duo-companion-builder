import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

for(const sourceFile of ['runtime/fe8-vietnamese/features.analysis.lua','runtime/shared/features.rng-indicator.lua']){
test(`${sourceFile}: RNG records popup opening and detects subsequent changes while it stays open`,async()=>{
  const engine=await luaFactory().createEngine();
  try{
    engine.global.set('source',fs.readFileSync(sourceFile,'utf8'));
    assert.equal(await engine.doString(`
      local seed={0x1234,0x5678,0x9ABC}
      mem={u16=function(address)return seed[(address-0x03000000)//2+1]end}
      ui={}
      pack={require=function(name)
        if name=='game.profile' then return {} end
        return function()error('Forecast execution must not run on the map')end
      end}
      local apply=assert(load(source))()({})
      local first=apply({forecastActive=false})
      assert(first.rngStateChanged==false)
      seed[1]=0x4321
      local changed=apply({forecastActive=false})
      assert(changed.rngStateChanged==true and changed.rngStateKey=='4321 5678 9ABC')
      assert(apply({forecastActive=false,unitName='Another unit'}).rngStateChanged==true)
      ui={rngAck=true}
      local acknowledged=apply({forecastActive=false})
      assert(acknowledged.rngStateChanged==false and acknowledged.ui.set.rngAck==false)
      ui={};seed[2]=0x8765
      assert(apply({forecastActive=false}).rngStateChanged==true)
      ui={predictionPopup=true}
      assert(apply({forecastActive=false}).rngStateChanged==false)
      seed[3]=0xABCD
      assert(apply({forecastActive=false}).rngStateChanged==true,'An already open popup must not acknowledge new RNG')
      ui={predictionPopup=true,rngAck=true}
      local explicit=apply({forecastActive=false})
      assert(explicit.rngStateChanged==false and explicit.ui.set.rngAck==false)
      ui={predictionPopup=true};seed[1]=0x1111
      assert(apply({forecastActive=false}).rngStateChanged==true)
      ui={}
      assert(apply({forecastActive=false}).rngStateChanged==true)
      ui={predictionPopup=true}
      assert(apply({forecastActive=false}).rngStateChanged==false,'Closing and reopening records a fresh seed')
      return true
    `),true);
  }finally{engine.global.close();}
});
}
