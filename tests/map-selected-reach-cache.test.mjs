import fs from'node:fs';import test from'node:test';import assert from'node:assert/strict';
import{luaFactory}from'../scripts/runtime-validation-engine.mjs';
const families={fe7:'runtime/fe7-vietnamese/game.map.lua',fe8:'runtime/shared/game.fe8-map.lua',remastered:'runtime/fe6-remastered/game.map.lua'};
const shared=name=>fs.readFileSync('runtime/shared/'+name+'.lua','utf8');
async function run(body,{family='fe7',fe6=false,danger=false}={}){
 const authored=fs.readFileSync(families[family],'utf8');
 const source=authored.replace('local function mapUnitReach(v, focus, grid, terrain)',
  'local function mapUnitReach(v, focus, grid, terrain) if __countCompute and __selectedCompute then __computeCalls=__computeCalls+1 end')
  .replace('for spent = 0, move do','for spent = 0, move do if __interrupt and spent==1 then error("interrupted reach compute") end')
  .replace(/local dist, move, attacked = (selectedMapUnitReach|mapUnitReach)\(v, focus, grid, terrain\)/,
   '__selectedCompute=true; local dist, move, attacked = $1(v, focus, grid, terrain); __selectedCompute=false');
 const reference=authored.replace('local dist, move, attacked = selectedMapUnitReach(v, focus, grid, terrain)','local dist, move, attacked = mapUnitReach(v, focus, grid, terrain)');
 const e=await luaFactory().createEngine();try{return await e.doString(`
 ui={mainTab='Map',mapDangerEnabled=${danger}};actions={};local bytes={}
 local function put(a,n,w)for j=0,(w or 4)-1 do bytes[a+j]=(n>>(j*8))&255 end end
 local function get(a,w)local n=0;for j=0,w-1 do n=n|((bytes[a+j]or 0)<<(j*8))end;return n end
 mem={u8=function(a)return get(a,1)end,u16=function(a)return get(a,2)end,u32=function(a)return get(a,4)end,
  s8=function(a)local n=get(a,1);return n>127 and n-256 or n end}
 local p={mapWidth=0x02000010,mapHeight=0x02000012,terrainRows=0x02000020,unitRows=0x02000024,
  cursorX=0x02000030,cursorY=0x02000032,chapter=0x02000034,turn=0x02000036,weather=${fe6?'0x0202AA5D':'0x0202BC0D'},
  battleActor=0x02030000,battleTarget=0x02030100}
 local slots={[1]=0x02020000,[129]=0x02020048}
 local normal,rough,zero={},{},{};for n=1,65 do normal[n]=1;rough[n]=3;zero[n]=0 end;normal[3]=255
 local chars={[0x08001000]={name='One',portrait='',attributes=0},[0x08001004]={name='Two',portrait='',attributes=0}}
 local classes={};for _,cp in ipairs({0x08002000,0x08002004})do classes[cp]={name='Class',portrait='',attributes=0,
  move=cp==0x08002000 and 2 or 3,movementCosts={normal,rough,rough},defense=zero,avoid=zero,resistance=zero}end
 local D={chars=chars,classes=classes,slots=slots,validSlots={[slots[1]]=1,[slots[129]]=129},mapRecipe={},fe8Chapters={},
  mapWeapons={[1]={a=1,r=0,t=0,rank=1,range=0x11,name='Spear',icon='',maxUses=20}},
  mapMeta={chars=chars,classes=classes,chapters={},terrains={'Void','Plain','Wall'},defaultClass=0x08002000,ballistaCosts=rough}}
 put(p.mapWidth,10,2);put(p.mapHeight,8,2);put(p.cursorX,1,2);put(p.cursorY,1,2);put(p.terrainRows,0x02000400);put(p.unitRows,0x02000600)
 for y=0,7 do put(0x02000400+y*4,0x02001000+y*10);put(0x02000600+y*4,0x02002000+y*10)
  for x=0,9 do put(0x02001000+y*10+x,1,1)end end
 for id,u in pairs(slots)do put(u,0x08001000);put(u+4,0x08002000);put(u+11,id,1)
  put(u+${fe6?14:16},id==1 and 1 or 4,1);put(u+${fe6?15:17},id==1 and 1 or 4,1)
  put(u+${fe6?16:18},20,1);put(u+${fe6?17:19},20,1);put(u+${fe6?26:29},0,1)
  put(u+${fe6?28:30},0x1401,2);put(u+${fe6?38:40},1,1)
  put(0x02002000+(id==1 and 1 or 4)*10+(id==1 and 1 or 4),id,1)
 end
 pack={require=function(name)if name=='game.profile'then return p end
  if name=='presentation.chapter'then return(function()${shared('presentation.chapter')}\nend)()end
  if name=='presentation.map-picks'then return(function()${shared('presentation.map-picks')}\nend)()end;error(name)end}
 local memory=${fe6?`(function()${fs.readFileSync('runtime/fe6-english/game.memory.lua','utf8')}\nend)()(D)`:'nil'}
 local map=(function()${source}\nend)()(D,memory,function()return 1 end)
 local referenceFactory=(function()${reference}\nend)()
 local ref=referenceFactory(D,memory,function()return 1 end)
 local function equal(a,b)
  if type(a)~=type(b)then return false end;if type(a)~='table'then return a==b end
  for k,v in pairs(a)do if not equal(v,b[k])then return false end end
  for k in pairs(b)do if a[k]==nil then return false end end;return true
 end
 local function tick()
  __computeCalls=0;__countCompute=true;__selectedCompute=false;local v={};local ok,message=pcall(map.apply,v,nil,false);__countCompute=false
  local calls=__computeCalls
  if ok then local expected={};ref.apply(expected,nil,false);assert(equal(v,expected),'Full Map output differs from uncached computation')end
  return {v=v,calls=calls,ok=ok,error=not ok and tostring(message)or nil}
 end
 local function warm()assert(tick().ok);assert(tick().ok)end
 ${body}`);}finally{e.global.close();}}

for(const family of Object.keys(families))for(const danger of [false,true])test(family+' caches only one complete selected result with Danger '+danger,async()=>{
 const r=await run(`local a=tick();local b=tick();local c=tick()
  b.v.mapCells[1].move='poison';b.v.mapCells[1].attack='poison';b.v.mapRoster[2].hp=999
  local clean=tick()
  put(p.cursorX,4,2);put(p.cursorY,4,2);local other=tick()
  put(p.cursorX,1,2);put(p.cursorY,1,2);local back=tick()
  return {first=a.calls,second=b.calls,third=c.calls,clean=clean.calls,other=other.calls,back=back.calls}` ,{family,danger});
 assert(r.first>=1);assert.equal(r.second,0);assert.equal(r.third,0);assert.equal(r.clean,0);
 assert.equal(r.other,1);assert.equal(r.back,1,'only the most recent selected result is retained');
});

for(const family of Object.keys(families))for(const danger of [false,true])test(family+' invalidates safely for all72 unit bytes with Danger '+danger,async()=>{
 const r=await run(`warm();local checked=0
  for off=0,71 do local address=slots[1]+off;local old=get(address,1);put(address,old~1,1)
   local changed=tick();assert(changed.ok);if changed.v.mapRangeUnit~=''then assert(changed.calls==1,'changed byte reused cache '..off)end
   put(address,old,1);assert(tick().ok);checked=checked+1
  end
  return {checked=checked}`,{family,danger});
 assert.equal(r.checked,72);
});

for(const family of Object.keys(families))for(const danger of [false,true])test(family+' fresh grid/weather/config/identity inputs invalidate results with Danger '+danger,async()=>{
 const r=await run(`warm();local checks=0
  local function changed()local row=tick();assert(row.ok and row.calls==1,'change did not recompute');checks=checks+1;assert(tick().calls==0)end
  put(0x02001000+12,2,1);changed()
  put(0x02002000+12,129,1);changed()
  put(0x0202BC0D,4,1);put(0x0202BD05,4,1);changed()
  map.config.respectAiHold=false;ref.config.respectAiHold=false;changed()
  map.config.respectFog=false;ref.config.respectFog=false;changed()
  p.supportsBallista=false;changed()
  put(slots[1],0x08001004);changed()
  put(slots[1]+4,0x08002004);changed()
  ui.mainTab='Units';put(slots[1]+19,7,1);local hidden=tick();assert(hidden.calls==0 and hidden.v.mapPresent==false)
  ui.mainTab='Map';changed()
  return {checks=checks}`,{family,danger});
 assert.equal(r.checks,9);
});

for(const family of Object.keys(families))test(family+' publishes a cache atomically and recovers from interrupted computation',async()=>{
 const r=await run(`warm();put(0x02001000+12,2,1);__interrupt=true
  local failed=tick();assert(not failed.ok and failed.error:find('interrupted reach compute',1,true))
  __interrupt=false;put(0x02001000+12,1,1);local old=tick();assert(old.ok and old.calls==0,'interruption destroyed the last complete result')
  put(0x02001000+12,2,1);local recovered=tick();assert(recovered.ok and recovered.calls==1)
  return {ready=tick().calls}`,{family});
 assert.equal(r.ready,0);
});

for(const family of Object.keys(families))test(family+' survives a cold compute failure and a key-build failure without publishing partial state',async()=>{
 const r=await run(`__interrupt=true;local cold=tick();assert(not cold.ok)
  __interrupt=false;assert(tick().calls==1);assert(tick().calls==0)
  local original=mem.u32;put(slots[1]+19,19,1)
  mem.u32=function(a)if a==slots[1]+40 then error('key construction budget failure')end;return original(a)end
  local keyFailure=tick();assert(not keyFailure.ok and keyFailure.error:find('key construction budget failure',1,true))
  mem.u32=original;put(slots[1]+19,20,1);assert(tick().calls==0,'key failure replaced the complete cache')
  put(slots[1]+19,19,1);assert(tick().calls==1)
  return {ready=tick().calls}`,{family});
 assert.equal(r.ready,0);
});

for(const family of Object.keys(families))test(family+' bypasses every native/dependency callback even after a warm result',async()=>{
 const r=await run(`local callbacks={mapReachForUnit=function()return{}end,mapMoveForUnit=function()return 2 end,
  mapMovementStatus=function()return true end,mapMovementCostsForUnit=function(_,costs)return costs end,
  mapAiHoldForUnit=function()return false end,mapWeaponsForUnit=function()return{{raw=0x1401,item=D.mapWeapons[1]}}end,
  mapRangesReady=function()return true end,mapRangeRevision=function()return 'external'end}
  local checks=0
  for name,fn in pairs(callbacks)do warm();D[name]=fn
   assert(tick().calls>=1 and tick().calls>=1,'callback bypass missing '..name)
   D[name]=nil;assert(tick().calls==1,'old dependency mode result survived '..name);assert(tick().calls==0);checks=checks+1
  end
  return {checks=checks}`,{family});
 assert.equal(r.checks,8);
});

test('native FE6 byte adapter retains fresh fields and selected cache semantics',async()=>{
 const r=await run(`warm();local hit=tick();assert(hit.calls==0)
  put(slots[1]+26,1,1);local changed=tick();assert(changed.ok and changed.calls==1)
  return {next=tick().calls}`,{fe6:true});
 assert.equal(r.next,0);
});

test('FE8 changing native movement and readiness outside unit RAM remains live and uncached',async()=>{
 const r=await run(`warm();local externalMove=2
  D.mapMoveForUnit=function()return externalMove end
  local a=tick();externalMove=4;local b=tick()
  assert(a.calls==1 and b.calls==1 and b.v.mapMoveCount>a.v.mapMoveCount)
  local ready=false;D.mapRangesReady=function()return ready end
  local waiting=tick();assert(waiting.v.mapRangesBusy==true and waiting.calls==0)
  ready=true;local done=tick();assert(done.ok and done.calls==1 and done.v.mapMoveCount==b.v.mapMoveCount)
  D.mapMoveForUnit=nil;D.mapRangesReady=nil
  return {fresh=tick().calls,next=tick().calls}`,{family:'fe8'});
 assert.equal(r.fresh,1);assert.equal(r.next,0);
});

test('native FE6 rain invalidates the Danger union and selected result using its actual profile weather address',async()=>{
 const r=await run(`warm();local before=tick().v
  put(p.weather,4,1);local changed=tick();assert(changed.ok and changed.calls==1)
  local fresh={};referenceFactory(D,memory,function()return 1 end).apply(fresh,nil,false)
  assert(changed.v.mapDangerCount==fresh.mapDangerCount,'Danger union retained the previous weather')
  assert(changed.v.mapDangerCount<before.mapDangerCount,'fixture must exercise rain movement costs')
  assert(tick().calls==0)
  put(0x0202BC0D,2,1);local unrelated=tick();assert(unrelated.calls==0,'unrelated FE7 address invalidated FE6 weather')
  return {before=before.mapDangerCount,after=changed.v.mapDangerCount}`,{fe6:true,danger:true});
 assert(r.after<r.before);
});

for(const family of ['fe8','remastered'])for(const danger of [false,true])test(family+' key weather matches the actual fixed engine address with Danger '+danger,async()=>{
 const r=await run(`warm();local before=tick().v
  put(0x0202BD05,4,1);local changed=tick();assert(changed.ok and changed.calls==1)
  assert(changed.v.mapMoveCount<before.mapMoveCount)
  assert(tick().calls==0);put(p.weather,2,1);local unrelated=tick()
  assert(unrelated.calls==0,'unused profile override caused a false weather dependency')
  return {move=changed.v.mapMoveCount}`,{family,danger});
 assert(r.move>0);
});
