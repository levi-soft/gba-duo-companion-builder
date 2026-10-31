import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

const source=fs.readFileSync('runtime/shared/game.cursor-focus.lua','utf8');
const presentation=fs.readFileSync('runtime/shared/presentation.map-picks.lua','utf8');
async function run(body,{fe6=false}={}){
  const e=await luaFactory().createEngine();
  try{return await e.doString(`
    ui={};actions={};local bytes,writes,requests={},{},{}
    local p={version=1,kind='fe-map',gameCode='AE7E',cursor=0x0202BBCC,size=0x0202E3D8,
      chapter=0x0202BC06,turn=0x0202BC08,bm=0x0202BBB8,procs=0x02024E28,
      playerScript=0x08B93374,idlePc=0x08B933E4,unitPosition=${fe6?14:16},unitHp=${fe6?17:19},
      unitStateBytes=${fe6?2:4},unavailableMask=${fe6?'0x2C':'0x1000C'},blue=0x0202BD50,green=0x0202DCD0,red=0x0202CEC0}
    local function put(a,n,w)for i=0,(w or 4)-1 do bytes[a+i]=(n>>(i*8))&255 end end
    local function get(a,w)local n=0;for i=0,w-1 do n=n|((bytes[a+i]or 0)<<(i*8))end;return n end
    mem={u8=function(a)return get(a,1)end,u16=function(a)return get(a,2)end,u32=function(a)return get(a,4)end}
    function mem.read(a,n)local b={};for i=0,n-1 do b[#b+1]=string.char(get(a+i,1))end;return table.concat(b)end
    function mem.write(a,b)writes[#writes+1]={address=a,length=#b};return false,'No memory-write permission'end
    mem.write8=mem.write;mem.write16=mem.write;mem.write32=mem.write
    input={focusUnit=function(id)requests[#requests+1]=id end}
    for i=1,4 do put(0x080000AC+i-1,('AE7E'):byte(i),1)end
    put(p.size,15,2);put(p.size+2,15,2);put(p.cursor,1,2);put(p.cursor+2,4,2);put(p.turn,1,2)
    put(p.bm+0x1C,16,2);put(p.bm+0x1E,64,2);put(p.bm+0x20,16,2);put(p.bm+0x22,64,2)
    put(p.procs,p.playerScript);put(p.procs+4,p.idlePc)
    put(p.size+4,0x02001000);for y=0,14 do put(0x02001000+y*4,0x02002000+y*15)end
    local u=0x0202CEC0;put(u,0x08004000);put(u+4,0x08005000);put(u+11,129,1)
    put(u+p.unitPosition,11,1);put(u+p.unitPosition+1,11,1);put(u+p.unitHp,25,1)
    put(0x02002000+11*15+11,129,1)
    local D={slots={[129]=u},mapMeta={chars={[0x08004000]={}},classes={[0x08005000]={}}}}
    local expected={id=129,mapPickContext='0:1:1:4',characterPointer=0x08004000,classPointer=0x08005000,x=11,y=11}
    local context=expected.mapPickContext
    pack={require=function(name)
      if name=='game.cursor-profile'then return p end
      if name=='game.cursor-focus'then return (function()${source}\nend)() end
      error('Unexpected module '..name)
    end}
    local focus,observe=(function()${source}\nend)()(D)
    ${body}
  `);}finally{e.global.close();}
}

test('Maiden Map marker requests native D-pad focus with write permission OFF and no fake completion',async()=>{
  const r=await run(`local present=(function()${presentation}\nend)()(D,nil,{respectFog=true})
    local v={mapPresent=true,mapPickContext=context,mapWidth=15,mapHeight=15,mapCells={},mapRoster={{member=true,id=129}}}
    for i=1,225 do v.mapCells[i]={unitId=i==177 and 129 or 0}end
    present(v);local action=actions.focusMapUnit(129,context)
    return {action=action,requests=requests,writes=writes,x=mem.u16(p.cursor),y=mem.u16(p.cursor+2)}`);
  assert.deepEqual(r.requests,[129],'input.focusUnit returns nil on existing Plus and still queues the request');
  assert.deepEqual(r.writes,{});assert.equal(r.x,1);assert.equal(r.y,4);
  assert.equal(r.action.set.mapCursorSuccess,false);assert.equal(r.action.set.mapCursorPending,true);
  assert.equal(r.action.set.mapCursorMessage,'','A normal pending tap must not insert a message above the chapter or resize the Map');
  assert.notEqual(r.action.set.mapPickedId,129);
});

test('native D-pad requests also work when every memory-write API is absent',async()=>{
  const r=await run(`mem.write=nil;mem.write8=nil;mem.write16=nil;mem.write32=nil
    local action=focus(129,context,expected);return {action=action,requests=requests}`);
  assert.deepEqual(r.requests,[129]);assert.equal(r.action.set.mapCursorPending,true);
  assert.doesNotMatch(r.action.set.mapCursorMessage,/Packs can change games|permission/i);
});

test('stock official without input.focusUnit reports unavailable and never falls back to RAM writes',async()=>{
  const r=await run(`input=nil;local action=focus(129,context,expected);return {action=action,writes=writes}`);
  assert.deepEqual(r.writes,{});assert.equal(r.action.set.mapCursorSuccess,false);
  assert.equal(r.action.set.mapCursorPending,false);assert.match(r.action.set.mapCursorMessage,/unavailable|not available|does not support/i);
  assert.doesNotMatch(r.action.set.mapCursorMessage,/Packs can change games|permission/i);
});

for(const id of [63,64,85,104,128,179,193,197,255])test('code17 unsupported deployment '+id+' is refused before queueing, including expanded Storge allies',async()=>{
  const r=await run(`expected.id=${id};local action=focus(${id},context,expected);return {action=action,requests=requests,writes=writes}`);
  assert.deepEqual(r.requests,{});assert.deepEqual(r.writes,{});
  assert.equal(r.action.set.mapCursorSuccess,false);assert.equal(r.action.set.mapCursorPending,false);
  assert.match(r.action.set.mapCursorMessage,/supported map slots/);
});

test('only actual game cursor arrival completes an asynchronous request',async()=>{
  const r=await run(`local action=focus(129,context,expected);assert(observe,'Native requests need an arrival observer')
    local waiting=observe({});put(p.cursor,7,2);put(p.cursor+2,4,2);local midway=observe({})
    put(p.cursor,11,2);put(p.cursor+2,11,2);local arrived=observe({});local quiet=observe({})
    return {action=action,waiting=waiting,midway=midway,arrived=arrived,quiet=quiet,requests=requests,writes=writes}`);
  assert.equal(r.action.set.mapCursorSuccess,false);assert.equal(r.waiting,undefined);assert.equal(r.midway,undefined);
  assert.equal(r.arrived.set.mapCursorSuccess,true);assert.equal(r.arrived.set.mapCursorPending,false);
  assert.equal(r.arrived.set.mapCursorMessage,'');assert.equal(r.quiet,undefined);
  assert.deepEqual(r.requests,[129]);assert.deepEqual(r.writes,{});
});

test('an uncompleted request stays silent and is not claimed complete',async()=>{
  const r=await run(`local action=focus(129,context,expected);assert(observe)
    local result;for i=1,20 do result=observe({})end
    return {action=action,result=result,x=mem.u16(p.cursor),requests=requests}`);
  assert.equal(r.action.set.mapCursorSuccess,false);assert.equal(r.result,undefined);assert.equal(r.x,1);
  assert.equal(r.action.set.mapCursorMessage,'');assert.deepEqual(r.requests,[129]);
});

for(const [name,patch]of[
  ['enemy phase','put(p.chapter+1,0x80,1)'],['BM lock','put(p.bm+1,1,1)'],['display lock','put(p.bm+2,1,1)'],
  ['missing free-cursor process','put(p.procs,0)'],['non-idle process','put(p.procs+4,p.idlePc+8)'],['blocked native owner','put(p.procs+0x28,1,1)'],
  ['ended player process','put(p.procs+0x27,1,1)'],['starting player process','put(p.procs+0x27,8,1)'],['duplicate player process','put(p.procs+108,p.playerScript);put(p.procs+112,p.idlePc)'],
  ['zero map width','put(p.size,0,2)'],['oversize map','put(p.size+2,65,2)'],['stale context','context="0:2:1:4"'],
  ['wrong ROM code','put(0x080000AC,0,1)'],['dead target','put(u+p.unitHp,0,1)'],['fog-hidden enemy','put(u+12,0x200)'],
  ['rescued target','put(u+12,0x20)'],['slot reuse','put(u+11,130,1)'],['changed character','put(u,0x08004004)'],
  ['slot outside native bank','D.slots[129]=u+72'],
  ['moved target','put(u+p.unitPosition,10,1)'],['invalid row table','put(p.size+4,0x0203FFFF)'],['changed grid occupancy','put(0x02002000+11*15+11,0,1)'],
  ['Pokemblem FreeMU','p.modeGuard={address=0x030017A7,mask=1,expected=0};put(0x030017A7,1,1)'],
])test('native D-pad focus refuses '+name+' using fresh tap-time state',async()=>{
  const r=await run(`${patch};local action=focus(129,context,expected);return {action=action,requests=requests,writes=writes,x=mem.u16(p.cursor)}`);
  assert.deepEqual(r.requests,{});assert.deepEqual(r.writes,{});assert.equal(r.x,1);
  assert.equal(r.action.set.mapCursorSuccess,false);assert.equal(r.action.set.mapCursorPending,false);
  assert(r.action.set.mapCursorMessage);assert.notEqual(r.action.set.mapPickedId,129);
});

test('native FE6 uses raw16-bit state and14/15 position offsets before requesting focus',async()=>{
  const r=await run(`local action=focus(129,context,expected);return {action=action,requests=requests,writes=writes}`,{fe6:true});
  assert.deepEqual(r.requests,[129]);assert.deepEqual(r.writes,{});assert.equal(r.action.set.mapCursorPending,true);
});

for(const script of [0x0969B044,0x0969B004,0x0969B024])for(const starting of [false,true])test('Poke live FreeMU guards native requests '+script.toString(16)+(starting?' starting':''),async()=>{
  const r=await run(`p.modeGuard={address=0x030017A7,mask=1,expected=0,processScripts={0x0969B044,0x0969B004,0x0969B024}}
    put(p.procs+216,${script});put(p.procs+220,${script}+${starting?0:8});put(p.procs+216+0x27,${starting?8:0},1)
    local action=focus(129,context,expected);return {action=action,requests=requests,writes=writes}`);
  assert.deepEqual(r.requests,{});assert.deepEqual(r.writes,{});assert.equal(r.action.set.mapCursorSuccess,false);
});

for(const [name,patch]of [['chapter change','put(p.chapter,1,1)'],['turn change','put(p.turn,2,2)'],['slot replacement','put(u,0x08004004)'],['unit move','put(u+p.unitPosition,10,1)'],['menu owner','v.unitLocked=true']])test('queued focus cannot report arrival after '+name,async()=>{
  const r=await run(`focus(129,context,expected);assert(observe)
    local v={};${patch};put(p.cursor,11,2);put(p.cursor+2,11,2)
    return {result=observe(v),quiet=observe(v),requests=requests,writes=writes}`);
  assert.equal(r.result.set.mapCursorSuccess,false);assert.equal(r.result.set.mapCursorPending,false);
  assert.equal(r.quiet,undefined);assert.deepEqual(r.writes,{});
});

test('presenter merges confirmed cursor results into existing object and list UI actions',async()=>{
  for(const list of [false,true]){
    const r=await run(`local present=(function()${presentation}\nend)()(D,nil,{respectFog=true})
      local v={mapPresent=true,mapPickContext=context,mapWidth=15,mapHeight=15,mapCells={},mapRoster={{member=true,id=129}}}
      for i=1,225 do v.mapCells[i]={unitId=i==177 and 129 or 0}end
      present(v);actions.focusMapUnit(129,context);put(p.cursor,11,2);put(p.cursor+2,11,2)
      v.ui=${list?"{{set={rngAck=false}},{navigate='inventory'}}":"{set={rngAck=false},navigate='inventory'}"}
      present(v);return {ui=v.ui,requests=requests,writes=writes}`);
    const actions=list?r.ui:[r.ui],sets=actions.filter(action=>action?.set).map(action=>action.set);
    assert(sets.some(set=>set.rngAck===false));assert(sets.some(set=>set.mapCursorSuccess===true));
    assert(actions.some(action=>action.navigate==='inventory'));assert.deepEqual(r.writes,{});
  }
});
