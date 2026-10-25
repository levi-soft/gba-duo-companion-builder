import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

test('FE8 Europe inherits the English shared UI and native ability panel at 1.0.0', async () => {
  const root={structuredClone,TextDecoder,TextEncoder,Uint8Array};root.globalThis=root;
  for(const file of ['runtime-modules.js','theme.js','radar.js','profiles/fe8-vietnamese/template.js',
    'profiles/fe8-vietnamese/prepare.js','profiles/fe8-europe/template.js','profiles/fe8-europe/prepare.js']) {
    vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),root);
  }
  const project=root.FE8_EUROPE_TEMPLATE;
  assert.equal(project.manifest.version,'1.0.0');
  assert.equal(project.manifest.match.gameCode[0],'BE8P');
  assert.equal(project.manifest.match.crc32[0],'B3005195');
  assert.equal(project.uiLanguage,'en');
  assert.equal(JSON.stringify(project.layout),JSON.stringify(root.localizeCompanionUi(root.FE8_TEMPLATE.layout,'en')));
  assert(JSON.stringify(project.layout).includes('Battle analysis'));
  assert.equal(root.FE8_TEMPLATE.data.predictionConfidence,'Chờ dữ liệu giao chiến');
  const wrongRegion=new Uint8Array(256);wrongRegion.set(new TextEncoder().encode('BE8E'),172);
  await assert.rejects(root.FE8EuropePrep.prepare(wrongRegion,project,null),/requires BE8P/);
});

test('FE8 regional EXP and level jobs use every configured EU entry point and hook', async () => {
  const engine=await luaFactory().createEngine();
  try {
    for(const [global,file] of Object.entries({
      executionSource:'runtime/fe8-europe/game.execution.lua',
      expSource:'runtime/fe8-vietnamese/features.exp.lua',
      levelSource:'runtime/fe8-vietnamese/features.level_prediction.lua'
    }))engine.global.set(global,fs.readFileSync(file,'utf8'));
    const result=await engine.doString(`
      local entries=assert(load(executionSource))()
      local observed={}
      local scripted=false
      local function ram(a) return a==0x0203A970 and scripted and 1 or 0 end
      mem={u8=function(a) return 0 end,u16=function(a) return a==0x0203A4D4 and 1 or 0 end,
        u32=function(a) error('Unexpected US ROM literal lookup') end}
      local hooks
      pack={require=function(name)
        if name=='game.snapshot' then return function() return ram end end
        assert(name=='features.thumb')
        return {start=function(entry,args,shadow,options)
          observed[#observed+1]=entry
          if options.beforeEntry then hooks=options.beforeEntry end
          return function() return true,0,shadow,1 end
        end}
      end}
      local exp=assert(load(expSource))()(false,ram,entries)
      for i=1,3 do exp() end
      local normal=assert(load(levelSource))()(ram,entries);normal()
      scripted=true
      local scriptedJob=assert(load(levelSource))()(ram,entries);scriptedJob()
      assert(hooks[entries.expApply] and hooks[entries.levelUp])
      assert(not hooks[0x0802B92C] and not hooks[0x0802BA28])
      return observed
    `);
    assert.deepEqual(result,[
      0x0802CA90,0x0802CA3C,0x0802BC7C,
      0x0802EE60,0x0802B224,0x0802EEA0,0x0802CA90,0x0802CA3C,0x0802BC7C,
      0x0802EE60,0x0802D29C,0x0802EEA0,0x0802CA90,0x0802CA3C,0x0802BC7C
    ]);
  } finally {engine.global.close();}
});
