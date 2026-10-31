import fs from'node:fs';import test from'node:test';import assert from'node:assert/strict';
import{luaFactory}from'../scripts/runtime-validation-engine.mjs';
const source=fs.readFileSync('runtime/fe7-vietnamese/game.map.lua','utf8');
const picks=fs.readFileSync('runtime/shared/presentation.map-picks.lua','utf8');
const chapter=fs.readFileSync('runtime/shared/presentation.chapter.lua','utf8');
async function run(body){const e=await luaFactory().createEngine();try{return await e.doString(`
ui={mainTab='Map'};actions={};local raw,counts={},{};local w,h=10,8
local p={mapWidth=0x02000010,mapHeight=0x02000012,terrainRows=0x02000020,unitRows=0x02000024,
 cursorX=0x02000030,cursorY=0x02000032,chapter=0x02000034,turn=0x02000036}
raw[p.mapWidth]=w;raw[p.mapHeight]=h;raw[p.terrainRows]=0x02000400;raw[p.unitRows]=0x02000600
raw[p.cursorX]=1;raw[p.cursorY]=1;raw[p.turn]=1
for y=0,h-1 do raw[0x02000400+y*4]=0x02001000+y*w;raw[0x02000600+y*4]=0x02002000+y*w
 for x=0,w-1 do raw[0x02001000+y*w+x]=1 end end
local costs,zero={},{ };for n=1,65 do costs[n]=1;zero[n]=0 end;costs[3]=255
local chars={[0x08001000]={name='Ally',portrait='',attributes=0},[0x08001004]={name='Foe',portrait='',attributes=0}}
local classes={[0x08002000]={name='Soldier',portrait='',attributes=0,move=2,movementCosts={costs,costs,costs},defense=zero,avoid=zero,resistance=zero}}
local slots={[1]=0x02020000,[129]=0x02020100}
for id,u in pairs(slots)do raw[u]=id==1 and 0x08001000 or 0x08001004;raw[u+4]=0x08002000;raw[u+11]=id
 raw[u+16]=id==1 and 1 or 4;raw[u+17]=id==1 and 1 or 4;raw[u+18]=20;raw[u+19]=20
 raw[u+30]=0x1401;raw[u+40]=1;raw[0x02002000+raw[u+17]*w+raw[u+16]]=id end
mem={};for _,n in ipairs({'u8','u16','u32','s8'})do mem[n]=function(a)counts[a]=(counts[a]or 0)+1;return raw[a]or 0 end end
local D={slots=slots,mapRecipe={},mapWeapons={[1]={a=1,r=0,t=0,rank=1,range=0x11,name='Spear',icon='',maxUses=20}},
 mapMeta={chars=chars,classes=classes,chapters={},terrains={'Void','Plain','Forest'},defaultClass=0x08002000,ballistaCosts=costs}}
pack={require=function(n)if n=='game.profile'then return p end;if n=='presentation.chapter'then return(function()${chapter}\nend)()end
 if n=='presentation.map-picks'then return(function()${picks}\nend)()end;error(n)end}
local map=(function()${source}\nend)()(D,nil,function()return 1 end)
local function tick()
 counts={};local v={};map.apply(v,nil,false)
 local terrain,units,rows,max=0,0,0,0
 for a,n in pairs(counts)do
  if a>=0x02001000 and a<0x02001000+w*h then terrain=terrain+n;max=math.max(max,n)end
  if a>=0x02002000 and a<0x02002000+w*h then units=units+n;max=math.max(max,n)end
  if a>=0x02000400 and a<0x02000400+h*4 or a>=0x02000600 and a<0x02000600+h*4 then rows=rows+n end
 end
 return {v=v,terrain=terrain,units=units,rows=rows,max=max}
end
${body}`);}finally{e.global.close();}}

test('FE7 Map reads each validated row pointer and terrain/occupancy cell only once per update',async()=>{
 const r=await run('return {tick(),tick(),tick()}');
 for(const row of r){assert.equal(row.v.mapPresent,true);assert.equal(row.terrain,80);assert.equal(row.units,80);assert.equal(row.rows,16);assert.equal(row.max,1);assert.equal(row.v.mapCells.length,80);assert.equal(row.v.mapPickTargets.length,2);}
});

test('shared per-update grids keep terrain, occupancy, unit state and tactical outputs fresh on the next tick',async()=>{
 const r=await run(`local before=tick()
 raw[0x02001000+1*w+1]=2;raw[0x02001000+1*w+2]=2
 raw[0x02002000+4*w+4]=0;raw[0x02002000+4*w+5]=129;raw[slots[129]+16]=5;raw[slots[129]+19]=7
 local moved=tick();raw[slots[129]+12]=0x200;local fog=tick()
 raw[0x02000400]=0x0203FFFF;local invalid=tick()
 return {before=before,moved=moved,fog=fog,invalid=invalid}`);
 for(const key of ['before','moved','fog']){assert.equal(r[key].terrain,80);assert.equal(r[key].units,80);assert.equal(r[key].rows,16);assert.equal(r[key].max,1);}
 assert.equal(r.before.v.mapTerrain,'Plain');assert.equal(r.moved.v.mapTerrain,'Forest');
 assert.equal(r.moved.v.mapCells[44].marker,false);assert.equal(r.moved.v.mapCells[45].marker,true);
 assert.equal(r.moved.v.mapRoster.find(v=>v.member&&v.id===129).hp,7);
 assert(r.moved.v.mapMoveCount<r.before.v.mapMoveCount,'the newly blocked terrain changes the live movement result');
 assert.equal(r.fog.v.mapCells[45].marker,false);assert.equal(r.fog.v.mapCells[45].unitId,0);
 assert.equal(r.fog.v.mapRoster.some(v=>v.member&&v.id===129),false);assert.equal(r.fog.v.mapPickTargets.length,1);
 assert.equal(r.invalid.v.mapPresent,false);assert.equal(r.invalid.v.mapRenderPending,false);
 assert.equal(r.invalid.terrain,0);assert.equal(r.invalid.units,0,'invalid rows must be refused before reading their cells');
});
