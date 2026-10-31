import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject,luaFactory} from '../scripts/runtime-validation-engine.mjs';

test('Dark Lord preserves Map pick invalidation while refreshing a new unit inventory',async()=>{
 const engine=await luaFactory().createEngine();
 try{
  const source=fs.readFileSync('runtime/dark-lord-maiden-of-light/game.units.lua','utf8');
  const result=await engine.doString(`
   local unit=0x02010000
   local profile={processPool=0x02020000,playerProcess=100,forecastProcess=200,enemyProcess=300,activeUnit=0x03004690,phase=0x0202BC07,playerPcStart=101,playerPcEnd=103,enemyPcStart=301,enemyPcEnd=303}
   local memory={[0x02020000]=100,[0x02020004]=102,[0x03004690]=unit,[unit]=0x08010000,[unit+4]=0x08020000,[unit+11]=1,[unit+18]=20,[unit+19]=20}
   mem={u8=function(a)return memory[a] or 0 end,u16=function(a)return memory[a] or 0 end,u32=function(a)return memory[a] or 0 end,s8=function(a)return memory[a] or 0 end}
   local generation=0
   pack={require=function(name)
    if name=='game.profile' then return profile end
    if name=='game.companion-selection' then return (function()${fs.readFileSync('runtime/shared/game.companion-selection.lua','utf8')}\nend)() end
    if name=='presentation.defaults' then return function()return function()error('Unexpected empty unit')end end end
    if name=='game.native-selection' then return function()return function()return nil,false end end end
    if name=='game.bindings' then return function()return function(v)generation=generation+1;v.firstItemPage='item'..generation;v.firstItemSelected1=true;v.item1Id=generation;return v end end end
    if name=='game.items' or name=='game.battle' then return function()return function()end end end
    error(name)
   end}
   local D={slots={[1]=unit},validSlots={[unit]=1}}
   local map={meta={chars={[0x08010000]={}},classes={[0x08020000]={mapSprites={}}}},config={},apply=function(v)v.ui={set={mapPickedId=0,mapPickedContext='fresh'}}end}
   local read=(function()${source}\nend)()(D,map,{truth=function(v)return v==true end},{apply=function()end})
   return {read(),read()}
  `);
  for(const [n,v]of result.entries()){
   assert.equal(v.unitLocked,true);assert.equal(v.deployment,1);
   assert.equal(v.ui.set.mapPickedId,0);assert.equal(v.ui.set.mapPickedContext,'fresh');
   assert.equal(v.ui.set.inventoryDetail,'item'+(n+1));assert.equal(v.ui.set.itemSelected1,true);
  }
 }finally{engine.global.close();}
});

test('RNG observation survives unit/map changes and works outside Forecast without executing native analysis',async()=>{
 const encode=s=>Buffer.from(s).toString('base64');
 for(const id of ['bells-of-byelen','cerulean-crescent','pokemblem','morrows-golden-country','sun-gods-wrath','dark-lord-maiden-of-light']){
  const main=id==='dark-lord-maiden-of-light'
   ? `local observe=pack.require('features.rng-indicator')();function update()return observe({unitPresent=ui.present,unitName=ui.name})end`
   : `local apply=pack.require('features.analysis')({});function update()return apply({unitPresent=ui.present,unitName=ui.name,forecastActive=false})end`;
  const files={'main.lua':encode(main),'features.rng-indicator.lua':encode(fs.readFileSync('runtime/shared/features.rng-indicator.lua','utf8'))};
  if(id!=='dark-lord-maiden-of-light')Object.assign(files,{
   'features.analysis.lua':encode(fs.readFileSync('runtime/'+id+'/features.analysis.lua','utf8')),
   'features.fe8-analysis.lua':encode(fs.readFileSync('runtime/fe8-vietnamese/features.analysis.lua','utf8')),
   'game.profile.lua':encode('return{}'),
   'game.snapshot.lua':encode('return function()error("Inactive Forecast must not snapshot")end'),
   'features.exp.lua':encode('return function()error("Inactive Forecast must not start EXP")end'),
   'features.level_prediction.lua':encode('return function()error("Inactive Forecast must not start a level job")end'),
  });
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x03000000,bytes:Buffer.alloc(6)}],steps:[
   {ui:{mainTab:'Units',name:'First',present:true},expect:{rngStateChanged:false,rngStateTracking:true}},
   {ui:{mainTab:'Units',name:'First',present:true},patches:[{address:0x03000000,bytes:[1,0]}],expect:{rngStateChanged:true}},
   {ui:{mainTab:'Map',name:'Second',present:true},expect:{rngStateChanged:true}},
   {ui:{mainTab:'Units',present:false},expect:{rngStateChanged:true}},
   {ui:{growthPopup:true,name:'Second',present:true},expect:{rngStateChanged:true}},
   {ui:{rngAck:true},expect:{rngStateChanged:false}},
   {ui:{},patches:[{address:0x03000002,bytes:[2,0]}],expect:{rngStateChanged:true}},
   {ui:{predictionPopup:true},expect:{rngStateChanged:false}},
   {ui:{predictionPopup:false},expect:{rngStateChanged:false}},
   {ui:{mainTab:'Map'},patches:[{address:0x03000004,bytes:[3,0]}],expect:{rngStateChanged:true}}
  ]});
  assert.equal(run.values[5].ui.set.rngAck,false,id+' acknowledgement consumed');
  assert.equal(run.values.at(-1).rngStateKey,'0001 0002 0003');
  if(id!=='dark-lord-maiden-of-light')for(const v of run.values){assert.equal(v.analysisSupported,true);assert.equal(v.predictionAvailable,false);assert.equal(v.rngExpHit,undefined);}
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
 }
});
