import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=s=>Buffer.from(s).toString('base64');
function fixture(cache=true){
 const ram=Buffer.alloc(0x40000),unit=0x02002000;
 const put=(at,value,n=4)=>ram.writeUIntLE(value,at-0x02000000,n);
 put(0x02000010,3,2);put(0x02000012,2,2);put(0x02000020,0x02000400);put(0x02000024,0x02000420);
 for(let y=0;y<3;y++){put(0x02000400+y*4,0x02000500+y*3);put(0x02000420+y*4,0x02000600+y*3);}
 ram.fill(2,0x500,0x509);ram[0x600]=1;
 put(unit,0x08001000);put(unit+4,0x08002000);put(unit+11,1,1);put(unit+18,20,1);put(unit+19,20,1);
 const files={
  'game.fe8-map.lua':encode(fs.readFileSync('runtime/shared/game.fe8-map.lua')),
  'presentation.chapter.lua':encode(fs.readFileSync('runtime/shared/presentation.chapter.lua')),
  'presentation.map-picks.lua':encode(fs.readFileSync('runtime/shared/presentation.map-picks.lua')),
  'game.profile.lua':encode('return {mapWidth=0x02000010,mapHeight=0x02000012,terrainRows=0x02000020,unitRows=0x02000024,cursorX=0x02000030,cursorY=0x02000032,chapter=0x02000034,turn=0x02000036}'),
  'main.lua':encode(`
   local costs={};for n=1,65 do costs[n]=1 end
   local chars={[0x08001000]={name='Live unit',portrait='',attributes=0}}
   local classes={[0x08002000]={name='Fixture',portrait='',attributes=0,move=2,movementCosts={costs,costs,costs}}}
   local D={chars=chars,classes=classes,slots={[1]=${unit}},mapMeta={chars=chars,classes=classes,ballistaCosts=costs},mapWeapons={},fe8Chapters={},mapRenderOnDemand=${cache}}
   local map=pack.require('game.fe8-map')(D);local previous
   function update()
    if previous and ui.poison then previous[1].tile='poison';previous[1].danger=true;previous[1].marker=false;previous[1].move=false end
    local calls=0
    debug.sethook(function(event)
     local info=debug.getinfo(2,'n')
     if info.name=='applyMapTile' then
      calls=calls+1
      if ui.interruptAt==calls then error('authored tile interruption')end
     end
    end,'c')
    local v={};local ok,message=pcall(map.apply,v,${unit},false);debug.sethook()
    previous=v.mapCells
    v.auditOk=ok;v.auditInterrupted=not ok and tostring(message):find('authored tile interruption',1,true)~=nil or false
    v.auditTileCalls=calls
    return v
   end`)
 };
 return{project:{manifest:{script:'main.lua'},files},ranges:[{address:0x02000000,bytes:ram}]};
}
test('warm opted Map reuses only paths while cursor, marker, unit stats and overlays stay live',async()=>{
 const {project,ranges}=fixture();
 const result=await executeProject(project,{ranges,steps:[
  {ui:{mainTab:'Map'},expect:{auditOk:true,auditTileCalls:6,mapPresent:true,mapPlayerCount:1}},
  {ui:{mainTab:'Map',poison:true},patches:[{address:0x02000030,bytes:[1,0]},{address:0x02000600,bytes:[0,1]},{address:0x02002010,bytes:[1]},{address:0x02002013,bytes:[12]}],expect:{auditOk:true,auditTileCalls:0,mapPresent:true,mapPlayerCount:1}}
 ]});
 assert.equal(result.values[1].mapCells[0].tile,result.values[0].mapCells[0].tile);
 assert.equal(result.values[1].mapCells[0].marker,false);assert.equal(result.values[1].mapCells[1].marker,true);
 assert.equal(result.values[1].mapCells[0].cursor,false);assert.equal(result.values[1].mapCells[1].cursor,true);
 assert.equal(result.values[1].mapCells[0].danger,false);assert.equal(result.values[1].mapCells[0].move,true);
 assert.equal(result.values[1].mapRoster.find(row=>row.member).hp,12);
 assert.equal(result.readOnly,true);assert.equal(result.calls.length,0);
});
test('exact terrain bytes invalidate neighbors and dimensions invalidate identical flat terrain',async()=>{
 const {project,ranges}=fixture();
 const word=value=>[value&255,value>>>8&255,value>>>16&255,value>>>24&255];
 const result=await executeProject(project,{ranges,steps:[
  {ui:{mainTab:'Map'},expect:{auditTileCalls:6}},
  {ui:{mainTab:'Map'},patches:[{address:0x02000501,bytes:[1]}],expect:{auditTileCalls:6}},
  {ui:{mainTab:'Map'},expect:{auditTileCalls:0}},
  {ui:{mainTab:'Map'},patches:[{address:0x02000501,bytes:[2]}],expect:{auditTileCalls:6}},
  {ui:{mainTab:'Map'},patches:[{address:0x02000010,bytes:[2,0,3,0]},{address:0x02000404,bytes:word(0x02000502)},{address:0x02000408,bytes:word(0x02000504)},{address:0x02000424,bytes:word(0x02000602)},{address:0x02000428,bytes:word(0x02000604)}],expect:{auditTileCalls:6,mapWidth:2,mapHeight:3}},
  {ui:{mainTab:'Map'},expect:{auditTileCalls:0}}
 ]});
 assert.notEqual(result.values[0].mapCells[0].tile,result.values[1].mapCells[0].tile,'Neighbor connection must refresh even though this cell terrain is unchanged');
 assert.notEqual(result.values[0].mapCells[1].tile,result.values[4].mapCells[1].tile,'Same six terrain bytes in a different shape have different connections');
 assert.equal(result.readOnly,true);
});
test('a cold interrupted fill resumes verified paths and a changed key discards the partial cache',async()=>{
 const {project,ranges}=fixture();
 const result=await executeProject(project,{ranges,steps:[
  {ui:{mainTab:'Map',interruptAt:3},expect:{auditOk:false,auditInterrupted:true,auditTileCalls:3}},
  {ui:{mainTab:'Map'},expect:{auditOk:true,auditTileCalls:4}},
  {ui:{mainTab:'Map'},expect:{auditOk:true,auditTileCalls:0}},
  {ui:{mainTab:'Map',interruptAt:3},patches:[{address:0x02000501,bytes:[1]}],expect:{auditOk:false,auditInterrupted:true,auditTileCalls:3}},
  {ui:{mainTab:'Map'},patches:[{address:0x02000500,bytes:[3]}],expect:{auditOk:true,auditTileCalls:6}},
  {ui:{mainTab:'Map'},expect:{auditOk:true,auditTileCalls:0}}
 ]});
 assert.equal(result.values[1].mapCells.length,6);assert.equal(result.values[4].mapCells.length,6);
 assert.equal(result.readOnly,true);
});
test('binary terrain keys retain NUL and255 bytes without treating pointer changes as terrain changes',async()=>{
 const {project,ranges}=fixture();
 const word=value=>[value&255,value>>>8&255,value>>>16&255,value>>>24&255];
 const result=await executeProject(project,{ranges,steps:[
  {ui:{mainTab:'Map'},patches:[{address:0x02000500,bytes:[0,255,2,2,2,2]},{address:0x02000700,bytes:[0,255,2,2,2,2]}],expect:{auditTileCalls:6,auditOk:true}},
  {ui:{mainTab:'Map'},patches:[{address:0x02000400,bytes:word(0x02000700)},{address:0x02000404,bytes:word(0x02000703)}],expect:{auditTileCalls:0,auditOk:true}},
  {ui:{mainTab:'Map'},patches:[{address:0x02000701,bytes:[0]}],expect:{auditTileCalls:6,auditOk:true}}
 ]});
 assert.notEqual(result.values[0].mapCells[1].tile,result.values[2].mapCells[1].tile);
 assert.equal(result.readOnly,true);
});
test('cached visible outputs equal the default renderer through live unit, terrain and dimension changes',async()=>{
 const steps=[
  {ui:{mainTab:'Map'}},{ui:{mainTab:'Map',mapDangerEnabled:true}},
  {ui:{mainTab:'Map',poison:true},patches:[{address:0x02000030,bytes:[1,0]},{address:0x02000600,bytes:[0,1]},{address:0x02002010,bytes:[1]},{address:0x02002013,bytes:[12]}]},
  {ui:{mainTab:'Map'},patches:[{address:0x02000501,bytes:[1]}]},
  {ui:{mainTab:'Map'},patches:[{address:0x02000010,bytes:[2,0,3,0]}]},
  {ui:{mainTab:'Map'}}
 ];
 const output=[];
 for(const cache of [false,true]){const{project,ranges}=fixture(cache);const run=await executeProject(project,{ranges,steps});output.push(run.values.map(v=>{delete v.auditTileCalls;return v;}));assert.equal(run.readOnly,true);}
 assert.deepEqual(output[1],output[0]);
});
