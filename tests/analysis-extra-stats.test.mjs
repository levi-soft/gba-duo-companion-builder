import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const file=s=>Buffer.from(s).toString('base64');
test('extra Analysis stats extend the common popup without changing the base layout',()=>{
  const base=JSON.parse(fs.readFileSync('ui/theme.layout.json'));
  const c={structuredClone};vm.runInNewContext(fs.readFileSync('ui/theme-factory.js','utf8'),c);
  const template={layout:structuredClone(base),css:''};
  c.extendCompanionAnalysisStats(template,[{key:'Con',label:'Build'},{key:'Mov',label:'Mov'}]);
  const rows=[];function walk(n){if(!n||typeof n!=='object')return;if(n.class==='prediction-stat-row')rows.push(n);for(const v of Object.values(n))if(v&&typeof v==='object')(Array.isArray(v)?v:[v]).forEach(walk);}walk(template.layout);
  assert.equal(rows.filter(r=>r.children.some(n=>n.text==='{rngConResult}')).length,1);
  assert.equal(rows.filter(r=>r.children.some(n=>n.text==='{rngMovResult}')).length,1);
  assert.equal(rows.find(r=>r.children.some(n=>n.text==='{rngConResult}')).children[0].text,'Build');
  assert.equal(rows.find(r=>r.children.some(n=>n.text==='{rngConResult}')).visibleIf,'$analysisConPresent');
  assert.deepEqual(JSON.parse(fs.readFileSync('ui/theme.layout.json')),base,'Shared base must remain unchanged');
  assert.throws(()=>c.extendCompanionAnalysisStats(template,[{key:'Con',label:'Duplicate'}]),/already exists/);
});
test('signed native stat reductions retain their delta in the result',async()=>{
  const project={manifest:{script:'main.lua'},files:{
    'main.lua':file(`local present=pack.require('presentation.prediction')()
      function update()return present({forecastActive=true,exp=99,growthLevel=1,deployment=1,rngExpHit=1,rngExpKill=1,
        predictionAvailable=true,growthHpCurrent=100,rngHpGain=-40,growthPowerCurrent=10,rngPowerGain=0})end`),
    'presentation.prediction.lua':file(fs.readFileSync('runtime/shared/presentation.prediction.lua','utf8'))
  }};
  const {values}=await executeProject(project,{ticks:1});
  assert.equal(values[0].rngHpResult,'60 (-40)');assert.equal(values[0].rngPowerResult,'10');assert.equal(values[0].rngHpFlash,false);
});
test('extra native gains publish the verified current values, result and blink state',async()=>{
  const p={manifest:{script:'main.lua'},files:{
    'main.lua':file(`local D={execution={extraStats={{key='Con',currentField='con'},{key='Mov',currentField='move'}}}}
      local analyze=pack.require('features.analysis')(D);local present=pack.require('presentation.prediction')()
      function update()return present(analyze({forecastActive=ui.forecast,unitName='Fixture',exp=99,con=12,move=5,level=1,deployment=1}))end`),
    'features.analysis.lua':file(fs.readFileSync('runtime/fe8-vietnamese/features.analysis.lua','utf8')),
    'presentation.prediction.lua':file(fs.readFileSync('runtime/shared/presentation.prediction.lua','utf8')),
    'game.snapshot.lua':file('return function()return function()return 0 end end'),
    'game.profile.lua':file('return{activeUnit=0x03000010}'),
    'features.exp.lua':file('return function()return function()return true,{gain=1,leveled=true}end end'),
    'features.level_prediction.lua':file('return function()return function()return true,{0,0,0,0,0,0,0,0,extraGains={Con=1,Mov=2}},100 end end')
  }};
  const ew=Buffer.alloc(0x40000);ew[0x3A4EC+9]=99;
  const result=await executeProject(p,{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[{ticks:12,ui:{forecast:true,predictionPopup:true}},{ticks:1,ui:{forecast:false}}]});
  const v=result.values[11];assert.equal(v.analysisConPresent,true);assert.equal(v.analysisMovPresent,true);assert.equal(v.growthConCurrent,12);assert.equal(v.growthMovCurrent,5);
  assert.equal(v.rngConGain,1);assert.equal(v.rngMovGain,2);assert.equal(v.rngConResult,'13 (+1)');assert.equal(v.rngMovResult,'7 (+2)');
  assert(result.values.some(v=>v.rngConFlash===true));assert(result.values.some(v=>v.rngConFlash===false));
  assert.equal(result.values[12].analysisConPresent,undefined);assert.equal(result.values[12].analysisMovPresent,undefined);
});
