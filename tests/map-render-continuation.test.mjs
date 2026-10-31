import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

const families={
  fe7:'runtime/fe7-vietnamese/game.map.lua',
  fe8:'runtime/shared/game.fe8-map.lua',
  remastered:'runtime/fe6-remastered/game.map.lua',
};
const sources=Object.fromEntries(Object.entries(families).map(([key,file])=>[key,fs.readFileSync(file,'utf8')]));
const continuation=fs.readFileSync('runtime/shared/presentation.continuation.lua','utf8');
const picks=fs.readFileSync('runtime/shared/presentation.map-picks.lua','utf8');
const chapter=fs.readFileSync('runtime/shared/presentation.chapter.lua','utf8');

async function run(family,body,{width=15,height=21,onDemand=true}={}){
  const engine=await luaFactory().createEngine();
  try{return await engine.doString(`
    ui={mainTab='Map',mapDangerEnabled=false};actions={};input=nil;gfx=nil
    local raw={};local tileCalls,focusCalls,reads=0,0,0
    local profile={mapWidth=0x02000010,mapHeight=0x02000012,terrainRows=0x02000020,unitRows=0x02000024,
      cursorX=0x02000030,cursorY=0x02000032,chapter=0x02000034,turn=0x02000036}
    raw[profile.mapWidth]=${width};raw[profile.mapHeight]=${height}
    raw[profile.terrainRows]=0x02000400;raw[profile.unitRows]=0x02000600
    raw[profile.chapter]=1;raw[profile.turn]=1
    for y=0,${height}-1 do
      raw[0x02000400+y*4]=0x02001000+y*${width}
      raw[0x02000600+y*4]=0x02004000+y*${width}
      for x=0,${width}-1 do raw[0x02001000+y*${width}+x]=1 end
    end
    local unit=0x02020000
    raw[unit]=0x08001000;raw[unit+4]=0x08002000;raw[unit+11]=1
    raw[unit+16]=2;raw[unit+17]=3;raw[unit+18]=20;raw[unit+19]=20
    raw[0x02004000+3*${width}+2]=1
    mem={};for _,name in ipairs({'u8','u16','u32','s8'})do mem[name]=function(address)reads=reads+1;return raw[address] or 0 end end
    mem.write=function()error('Map presentation cannot write RAM')end
    local costs={};for n=1,65 do costs[n]=1 end
    local chars={[0x08001000]={name='Visible unit',portrait='',attributes=0}}
    local classes={[0x08002000]={name='Fixture',portrait='',attributes=0,move=0,
      movementCosts={costs,costs,costs},defense=costs,avoid=costs,resistance=costs}}
    local D={chars=chars,classes=classes,slots={[1]=unit},mapRenderOnDemand=${onDemand},mapRecipe={},
      mapMeta={chars=chars,classes=classes,defaultClass=0x08002000,chapters={},terrains={'Plain'},ballistaCosts=costs},
      mapWeapons={},fe8Chapters={}}
    pack={require=function(name)
      if name=='game.profile' then return profile end
      if name=='presentation.chapter' then return (function()${chapter}\nend)() end
      if name=='presentation.map-picks' then return (function()${picks}\nend)() end
      if name=='game.cursor-focus' then return function()
        return function(id,context,expected)
          focusCalls=focusCalls+1
          return {set={mapCursorSuccess=true},id=id,context=context,x=expected.x,y=expected.y}
        end
      end end
      error('Unexpected dependency '..name)
    end}
    local map=(function()${sources[family]}\nend)()(D,nil,function()
      tileCalls=tileCalls+1
      if __tileErrorAt==tileCalls then error('interrupted tile decode')end
      return 1
    end)
    local present=(function()${continuation}\nend)()()
    local function applyUi(v)
      local changed=false
      local function apply(action)
        if type(action)~='table' then return end
        if action[1]~=nil then for _,child in ipairs(action)do apply(child)end
        elseif type(action.set)=='table' then
          for key,value in pairs(action.set)do if ui[key]~=value then ui[key]=value;changed=true end end
        end
      end
      apply(v.ui);return changed
    end
    ${body}
  `);}finally{engine.global.close();}
}

for(const [width,height]of [[15,21],[37,26]])test(`paused classic Map ${width}x${height} publishes targets after bounded tile chunks without another tap`,async()=>{
  const r=await run('fe7',`
    local queued,ticks=true,0;local rows={};local before,after
    while queued and ticks<10 do
      ticks=ticks+1;local v={unitPresent=true,deployment=1};local start=tileCalls
      map.apply(v,nil,false);v=present(v)
      if ticks==1 then before=actions.focusMapUnit(1,'1:1:0:0')end
      rows[#rows+1]={present=v.mapPresent,renderPending=v.mapRenderPending,pending=v.companionWorkPending,
        needs=v.companionWorkNeedsContinue,targets=#v.mapPickTargets,tiles=tileCalls-start}
      queued=applyUi(v)
      if v.mapPresent then after=actions.focusMapUnit(1,v.mapPickContext)end
    end
    return {rows=rows,ticks=ticks,before=before,after=after,focusCalls=focusCalls,total=tileCalls,ui=ui}
  `,{width,height});
  const chunks=Math.ceil(width*height/256);
  assert.equal(r.rows[0].present,false);
  assert.equal(r.rows[0].renderPending,true,'an unfinished tile cache must explicitly advertise work');
  assert.equal(r.rows[0].pending,true,'official paused snapshots must continue even before mapPresent');
  assert.equal(r.rows[0].targets,0);
  assert.deepEqual(r.before,{},'an unpublished target remains an invalid action');
  assert.equal(r.ticks,chunks+1,'completion clears persisted work once, then quiesces');
  assert.equal(r.total,width*height,'already completed tile chunks must not be rebuilt');
  assert(r.rows.every(row=>row.tiles<=256));
  assert(r.rows.every(row=>row.needs===false),'ordinary short Map construction never exposes Continue');
  assert.equal(r.rows.at(-1).present,true);assert.equal(r.rows.at(-1).targets,1);
  assert.equal(r.rows.at(-1).renderPending,false);assert.equal(r.rows.at(-1).pending,false);
  assert.equal(r.ui.companionWorkPending,false);assert.equal(r.ui.companionWorkNeedsContinue,false);
  assert.equal(r.after.id,1);assert.equal(r.after.x,2);assert.equal(r.after.y,3);
});

test('hiding a partial classic Map stops render pulses and reopening resumes its cache',async()=>{
  const r=await run('fe7',`
    local v={};map.apply(v,nil,false);v=present(v);applyUi(v)
    local first={pending=v.companionWorkPending,tiles=tileCalls}
    ui.mainTab='Units';v=present(v);local cleared=applyUi(v)
    local hidden={pending=v.companionWorkPending,changed=cleared,tiles=tileCalls}
    v=present(v);local idle=applyUi(v)
    ui.mainTab='Map';map.apply(v,nil,false);v=present(v);applyUi(v)
    return {first=first,hidden=hidden,idle=idle,ready=v.mapPresent,renderPending=v.mapRenderPending,
      pending=v.companionWorkPending,tiles=tileCalls,targets=#v.mapPickTargets}
  `);
  assert.equal(r.first.pending,true);assert.equal(r.first.tiles,256);
  assert.equal(r.hidden.pending,false);assert.equal(r.hidden.changed,true);assert.equal(r.hidden.tiles,256);
  assert.equal(r.idle,false);assert.equal(r.ready,true);assert.equal(r.renderPending,false);
  assert.equal(r.pending,false);assert.equal(r.tiles,315);assert.equal(r.targets,1);
});

for(const family of Object.keys(families))test(family+' Map clears a reused render-pending flag for ready, preparations and invalid maps',async()=>{
  const r=await run(family,`
    local v={mapRenderPending=true};map.apply(v,nil,false)
    local ready={present=v.mapPresent,pending=v.mapRenderPending}
    v.mapRenderPending=true;map.apply(v,nil,true)
    local prep={present=v.mapPresent,pending=v.mapRenderPending}
    raw[profile.mapWidth]=0;v.mapRenderPending=true;map.apply(v,nil,false)
    return {ready=ready,prep=prep,invalid={present=v.mapPresent,pending=v.mapRenderPending}}
  `,{width:10,height:8});
  assert.deepEqual(r.ready,{present:true,pending:false});
  assert.deepEqual(r.prep,{present:false,pending:false});
  assert.deepEqual(r.invalid,{present:false,pending:false});
});

for(const family of Object.keys(families))test(family+' skips all hidden Map reads for Units/Growth and rebuilds fresh cells when reopened',async()=>{
  const r=await run(family,`
    local v={unitPresent=true,deployment=1,hp=20,move=7}
    ui={mainTab='Units'};reads=0;map.apply(v,nil,false)
    local initial={reads=reads,present=v.mapPresent,pending=v.mapRenderPending,targets=#v.mapPickTargets,hp=v.hp,move=v.move}
    ui={mainTab='Map'};map.apply(v,nil,false)
    local opened={present=v.mapPresent,targets=#v.mapPickTargets,terrain=v.mapTerrain,tile=v.mapCells[1].tile}
    ui={mainTab='Units',growthPopup=true};reads=0;map.apply(v,nil,false)
    local hidden={reads=reads,present=v.mapPresent,pending=v.mapRenderPending,targets=#v.mapPickTargets,cells=#v.mapCells,action=actions.focusMapUnit(1)}
    raw[0x02001000]=2;raw[0x02004000+3*10+2]=0;raw[0x02004000+3*10+3]=1;raw[unit+16]=3;raw[unit+19]=11
    ui={mainTab='Inventory'};reads=0;map.apply(v,nil,false)
    local other={reads=reads,present=v.mapPresent,targets=#v.mapPickTargets}
    ui={mainTab='Map'};map.apply(v,nil,false)
    local current={present=v.mapPresent,targets=v.mapPickTargets,oldMarker=v.mapCells[33].marker,newMarker=v.mapCells[34].marker,
      hp=v.mapRoster[2].hp,terrain=v.mapTerrain,tile=v.mapCells[1].tile}
    ui={};map.apply(v,nil,false)
    return {initial=initial,opened=opened,hidden=hidden,other=other,current=current,legacy=v.mapPresent}
  `,{width:10,height:8,onDemand:false});
  assert.deepEqual(r.initial,{reads:0,present:false,pending:false,targets:0,hp:20,move:7});
  assert.equal(r.opened.present,true);assert.equal(r.opened.targets,1);
  assert.deepEqual(r.hidden,{reads:0,present:false,pending:false,targets:0,cells:0,action:{}});
  assert.deepEqual(r.other,{reads:0,present:false,targets:0});
  assert.equal(r.current.present,true);assert.equal(r.current.targets.length,1);assert.equal(r.current.targets[0].x,3);
  assert.equal(r.current.oldMarker,false);assert.equal(r.current.newMarker,true);assert.equal(r.current.hp,11);
  if(family==='fe7')assert.notEqual(r.current.terrain,r.opened.terrain);
  else assert.notEqual(r.current.tile,r.opened.tile);
  assert.equal(r.legacy,true);
});

test('FE7 resumes only the uncompleted tile after a mid-slice decoder error',async()=>{
 const r=await run('fe7',`
  __tileErrorAt=3;local ok,message=pcall(map.apply,{},nil,false)
  assert(not ok and tostring(message):find('interrupted tile decode',1,true));local failed=tileCalls
  __tileErrorAt=nil;local v={};map.apply(v,nil,false);local recovered=tileCalls-failed
  map.apply(v,nil,false);return {failed=failed,recovered=recovered,final=tileCalls,present=v.mapPresent}
 `,{width:10,height:8});
 assert.equal(r.failed,3);assert.equal(r.recovered,78);assert.equal(r.final,81);assert.equal(r.present,true);
});

for(const change of ['terrain','chapter'])test('FE7 discards an interrupted tile prefix after '+change+' identity changes',async()=>{
 const r=await run('fe7',`
  __tileErrorAt=3;assert(not pcall(map.apply,{},nil,false));__tileErrorAt=nil
  ${change==='terrain'?'raw[0x02001000]=2':'raw[profile.chapter]=2'}
  tileCalls=0;local v={};map.apply(v,nil,false)
  return {calls=tileCalls,present=v.mapPresent,pending=v.mapRenderPending}
 `,{width:10,height:8});
 assert.deepEqual(r,{calls:80,present:true,pending:false});
});
