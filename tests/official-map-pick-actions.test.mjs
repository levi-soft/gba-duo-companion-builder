import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

const source=fs.readFileSync('runtime/shared/presentation.map-picks.lua','utf8');
const delegated={set:{mapCursorSuccess:true,mapCursorMessage:'',mapPickedId:0,mapPickedContext:''}};
async function run(body){
  const engine=await luaFactory().createEngine();
  try{return await engine.doString(`
    input=nil;ui={};actions={}
    local raw={},dummy
    local profile={unitRows=0x02000000}
    local metadata={chars={[0x08000100]={}},classes={[0x08000200]={}}}
    -- This is the real FE7/Maiden table shape: no top-level chars/classes.
    local D={mapMeta=metadata,slots={}}
    local config={respectFog=true}
    raw[profile.unitRows]=0x02000100
    for y=0,7 do raw[0x02000100+y*4]=0x02001000+y*10 end
    local function put(id,x,y,state,hp,gridId)
      local u=0x02020000+id*72;D.slots[id]=u
      raw[u]=0x08000100;raw[u+4]=0x08000200;raw[u+11]=id;raw[u+12]=state or 0
      raw[u+16]=x;raw[u+17]=y;raw[u+19]=hp or 20
      if x<10 and y<8 then raw[0x02001000+y*10+x]=gridId or id end
    end
    put(1,2,3);put(2,3,3,0,0);put(129,4,3,0x200);put(65,5,3,0x20)
    put(3,10,3);put(4,6,3,0,20,0)
    local reads=0
    mem={};for _,name in ipairs({'u8','u16','u32'})do mem[name]=function(a)reads=reads+1;return raw[a] or 0 end end
    local focusCalls,focusFactories={},0
    local focusReply={set={mapCursorSuccess=true,mapCursorMessage='',mapPickedId=0,mapPickedContext=''}}
    -- Target-publication tests isolate the physical writer. The real writer's
    -- RAM/permission contract is covered independently in physical-cursor-action.
    pack={require=function(name)
      assert(name=='game.cursor-focus')
      return function(data)
        assert(data==D)
        focusFactories=focusFactories+1
        return function(id,context,expected)
          focusCalls[#focusCalls+1]={id=id,context=context,expected=expected}
          return focusReply
        end
      end
    end}
    local present=(function()${source}\nend)()(D,nil,config)
    local function values()
      local v={mapPresent=true,mapPickContext='0:1:2:3',mapWidth=10,mapHeight=8,mapCells={},mapRoster={}}
      for y=0,7 do for x=0,9 do v.mapCells[y*10+x+1]={marker=true,unitId=raw[0x02001000+y*10+x] or 0} end end
      for _,id in ipairs({1,2,129,65,3,4,255})do v.mapRoster[#v.mapRoster+1]={member=true,id=id} end
      return v
    end
    ${body}
  `);}finally{engine.global.close();}
}

test('published visible Map targets delegate to the physical cursor action with identity/context',async()=>{
  const r=await run(`local v=values();present(v);local before=reads
    local action=actions.focusMapUnit('1',v.mapPickContext)
    return {v=v,action=action,presenterActionReads=reads-before,calls=focusCalls,
      sameExpected=focusCalls[1].expected==v.mapPickTargets[1],sameReply=action==focusReply}`);
  assert.deepEqual(r.action,delegated);
  assert.equal(r.presenterActionReads,0,'only the presenter is isolated; the physical delegate must perform fresh tap-time reads');
  assert.equal(r.sameExpected,true,'forward the exact published identity and coordinates to fresh physical validation');
  assert.equal(r.sameReply,true,'the presenter must return the physical result without manufacturing success');
  assert.equal(r.calls.length,1);
  assert.equal(r.calls[0].id,1);assert.equal(r.calls[0].context,'0:1:2:3');
  assert.equal(r.v.mapPickTargets.length,1,'dead, fog-hidden, rescued, off-grid and replaced slots cannot become targets');
  assert.deepEqual(r.v.mapPickTargets[0],{id:1,mapPickContext:'0:1:2:3',characterPointer:0x08000100,classPointer:0x08000200,x:2,y:3,left:'20.0%',top:'37.5%',width:'10.0%',height:'12.5%'});
  assert.equal(r.v.mapCells[32].unitId,1);
  assert.equal(r.v.mapCells.filter(c=>c.unitId!==0).length,1);
});

test('invalid IDs and stale caller contexts never reach the physical delegate',async()=>{
  const r=await run(`present(values());local replies={actions.focusMapUnit(0),actions.focusMapUnit(1.5),
    actions.focusMapUnit(256),actions.focusMapUnit('invalid'),actions.focusMapUnit(129),
    actions.focusMapUnit(1,'0:0:2:3'),actions.focusMapUnit(1)}
    return {replies=replies,calls=focusCalls}`);
  r.replies.slice(0,6).forEach(value=>assert.deepEqual(value,{}));
  assert.deepEqual(r.replies[6],delegated,'legacy roster ID-only calls delegate using the current published context');
  assert.equal(r.calls.length,1);assert.equal(r.calls[0].id,1);
});

test('dead, rescued, hidden, missing and off-grid targets cannot initialize the physical helper',async()=>{
  const r=await run(`present(values());local replies={}
    for _,id in ipairs({2,65,129,3,4,255})do replies[#replies+1]=actions.focusMapUnit(id,'0:1:2:3')end
    return {replies=replies,calls=focusCalls,factories=focusFactories}`);
  r.replies.forEach(value=>assert.deepEqual(value,{}));
  assert.equal(Object.keys(r.calls).length,0);assert.equal(r.factories,0);
});

test('physical refusal is forwarded unchanged without a companion-local pick',async()=>{
  const r=await run(`local v=values();present(v)
    focusReply={set={mapCursorSuccess=false,mapCursorMessage='Native write permission denied'}}
    local action=actions.focusMapUnit(1,v.mapPickContext)
    return {action=action,sameReply=action==focusReply,ui=ui,calls=focusCalls}`);
  assert.deepEqual(r.action,{set:{mapCursorSuccess:false,mapCursorMessage:'Native write permission denied'}});
  assert.equal(r.sameReply,true);assert.deepEqual(r.ui,{});assert.equal(r.calls.length,1);
});

test('repeated valid calls reuse the helper and forward its current reply each time',async()=>{
  const r=await run(`local v=values();present(v);actions.focusMapUnit(1,v.mapPickContext)
    focusReply={set={mapCursorSuccess=false,mapCursorMessage='Refresh the Map'}}
    local action=actions.focusMapUnit(1,v.mapPickContext)
    return {action=action,calls=focusCalls,factories=focusFactories}`);
  assert.equal(r.factories,1);assert.equal(r.calls.length,2);
  assert.deepEqual(r.action,{set:{mapCursorSuccess:false,mapCursorMessage:'Refresh the Map'}});
});

test('a hidden map resets cached actions and clears every cell unitId',async()=>{
  const r=await run(`local v=values();present(v);v.mapPresent=false;present(v)
    return {targets=v.mapPickTargets,cells=v.mapCells,action=actions.focusMapUnit(1)}`);
  assert.equal(Object.keys(r.targets).length,0);assert.deepEqual(r.action,{});
  assert(r.cells.every(c=>c.unitId===0));
});

for(const key of ['unitLocked','forecastActive','menuSelectionActive'])test('native '+key+' ownership retains priority over Map actions',async()=>{
  const r=await run(`local v=values();present(v);v.${key}=true;present(v)
    return {targets=v.mapPickTargets,id=v.mapCells[33].unitId,action=actions.focusMapUnit(1)}`);
  assert.equal(Object.keys(r.targets).length,0);assert.equal(r.id,1);assert.deepEqual(r.action,{});
});

test('changing map context rejects a delayed click then accepts the new published context',async()=>{
  const r=await run(`local v=values();present(v);v.mapPickContext='0:2:2:3';present(v)
    return {actions.focusMapUnit(1,'0:1:2:3'),actions.focusMapUnit(1,'0:2:2:3')}`);
  assert.deepEqual(r[0],{});assert.deepEqual(r[1],delegated);
});

test('explicit no-fog configuration preserves the existing visibility policy',async()=>{
  const r=await run(`config.respectFog=false;local v=values();present(v)
    return {targets=v.mapPickTargets,action=actions.focusMapUnit(129,v.mapPickContext),calls=focusCalls}`);
  assert.deepEqual(r.targets.map(t=>t.id),[1,129]);assert.equal(r.action.set.mapCursorSuccess,true);assert.equal(r.calls[0].id,129);
});

test('replaced occupancy never exposes stale selectable IDs',async()=>{
  const r=await run(`local v=values();present(v);raw[0x02001000+3*10+2]=0;v=values();present(v)
    return {targets=v.mapPickTargets,action=actions.focusMapUnit(1)}`);
  assert.equal(Object.keys(r.targets).length,0);assert.deepEqual(r.action,{});
});
