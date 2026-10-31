import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

test('Forecast transitions dismiss Analysis/Growth once and preserve navigation and stable-frame popup actions', async () => {
  const engine=await luaFactory().createEngine();
  try {
    engine.global.set('source',fs.readFileSync('runtime/shared/presentation.forecast.lua','utf8'));
    assert.equal(await engine.doString(`
      local apply=assert(load(source))()()
      local idle=apply({forecastActive=false})
      assert(idle.ui==nil)
      local enter=apply({forecastActive=true,ui={set={mainTab='Units',inventoryDetail='slot2'}}})
      assert(enter.ui.set.predictionPopup==false and enter.ui.set.growthPopup==false)
      assert(enter.ui.set.mainTab=='Units' and enter.ui.set.inventoryDetail=='slot2')
      local open=apply({forecastActive=true,ui={set={predictionPopup=true,mainTab='Map'}}})
      assert(open.ui.set.predictionPopup==true and open.ui.set.mainTab=='Map')
      local exit=apply({forecastActive=false,ui={set={companionView='companion'}}})
      assert(exit.ui.set.predictionPopup==false and exit.ui.set.growthPopup==false)
      assert(exit.ui.set.companionView=='companion')
      local reopen=apply({forecastActive=false,ui={set={growthPopup=true}}})
      assert(reopen.ui.set.growthPopup==true and reopen.ui.set.predictionPopup==nil)
      local reenter=apply({forecastActive=true})
      assert(reenter.ui.set.predictionPopup==false and reenter.ui.set.growthPopup==false)
      assert(apply({forecastActive=true}).ui==nil)
      return true
    `),true);
  } finally {engine.global.close();}
});

test('all profile entry points apply popup lifecycle even when no unit remains after Forecast', async () => {
  const root={};root.globalThis=root;
  vm.runInNewContext(fs.readFileSync('site/runtime-modules.js','utf8'),root);
  for (const [id,modules] of Object.entries(root.COMPANION_RUNTIME_MODULES)) {
    const engine=await luaFactory().createEngine();
    try {
      engine.global.set('mainSource',modules['main.lua']);
      engine.global.set('snapshotSource',modules['game.snapshot.lua']);
      engine.global.set('flowSource',fs.readFileSync('runtime/shared/presentation.forecast.lua','utf8'));
      assert.equal(await engine.doString(`
        local forecast=false
        local function identity(v) return v end
        pack={require=function(name)
          if name=='data.rom_tables' then return {uiStrings={},mapMeta={chars={}},slots={}} end
          if name=='shared.values' then return {} end
          if name=='game.execution' then return {} end
          if name=='game.snapshot' then return assert(load(snapshotSource))() end
          if name=='game.memory' or name=='game.map' or name=='game.abilities' then return function()return {}end end
          if name=='game.tiles' then return function()return function()return 0 end end end
          if name=='game.units' then return function() return function()
            return {forecastActive=forecast,unitPresent=false,ui={set={mainTab='Map'}}}
          end end end
          if name=='presentation.inventory' or name=='presentation.growth' or name=='presentation.pokemblem-text' then return identity end
          if name=='presentation.forecast' then return assert(load(flowSource))() end
          return function()return identity end
        end}
        assert(load(mainSource))()
        assert(update().ui.set.predictionPopup==nil)
        forecast=true;assert(update().ui.set.predictionPopup==false)
        assert(update().ui.set.predictionPopup==nil)
        forecast=false
        local closed=update()
        assert(closed.ui.set.predictionPopup==false and closed.ui.set.growthPopup==false)
        assert(closed.ui.set.mainTab=='Map')
        assert(update().ui.set.predictionPopup==nil)
        return true
      `),true,id);
    } finally {engine.global.close();}
  }
});
