import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

const registry={};
vm.runInNewContext(fs.readFileSync('site/runtime-modules.js','utf8'),registry);
const readers=Object.entries(registry.COMPANION_RUNTIME_MODULES);

test('the legacy internal selection helper remains packaged for all 30 reader profiles',()=>{
  assert.equal(readers.length,30);
  for(const [id,modules]of readers)assert(modules['game.companion-selection.lua'],id+' must package the shared selection helper');
});

// Compatibility coverage for previously persisted UI picks inside unit readers.
// These fixtures deliberately inject that state; they never invoke a Map tap.
// Physical tap acceptance requires actual cursor writes and game-frame evidence,
// independently covered by physical-cursor-action and the official APK audit.
// Reader refreshes and private calculations must continue to remain read-only.
for(const [id,modules] of readers)test(id+' validates legacy internal UI picks without overriding native owners',async()=>{
  const engine=await luaFactory().createEngine();
  const source=modules['game.units.lua'];
  const shared=modules['game.companion-selection.lua'];
  try{
    const result=await engine.doString(`
      input=nil;ui={};actions={}
      local p={processPool=0x02010000,playerProcess=0x08001000,forecastProcess=0x08002000,enemyProcess=0x08003000,
        activeUnit=0x02000060,phase=0x02000038,playerPcStart=0x08001010,playerPcEnd=0x08001020,
        enemyPcStart=0x08003010,enemyPcEnd=0x08003020,cursorX=0x02000034,cursorY=0x02000036,
        mapWidth=0x02000030,mapHeight=0x02000032,unitRows=0x0200003C,terrainRows=0x02000040,
        chapter=0x02000039,turn=0x0200003A}
      local slots={[1]=0x02020000,[2]=0x02020100,[129]=0x02020200}
      local raw={[p.mapWidth]=10,[p.mapHeight]=10,[p.cursorX]=5,[p.cursorY]=5,[p.turn]=1,
        [p.unitRows]=0x02000100,[p.terrainRows]=0x02000300,[p.activeUnit]=slots[1]}
      local fe6=${Boolean(modules['game.memory.lua'])}
      local chars,classes,validSlots={},{},{}
      for y=0,9 do raw[0x02000100+y*4]=0x02001000+y*10 end
      for n,u in pairs(slots)do
        raw[u]=0x0800A000+n*4;raw[u+4]=0x0800B000+n*4;raw[u+11]=n
        raw[u+8]=1;raw[u+9]=0;raw[u+(fe6 and 17 or 19)]=20;raw[u+(fe6 and 16 or 18)]=20
        raw[u+(fe6 and 14 or 16)]=n==129 and 6 or n==1 and 5 or 4
        raw[u+(fe6 and 15 or 17)]=5
        raw[0x02001000+5*10+raw[u+(fe6 and 14 or 16)]]=n
        chars[raw[u]]={name='Unit'..n};classes[raw[u+4]]={mapSprites={}}
        validSlots[u]=n
      end
      mem={};for _,name in ipairs({'u8','u16','u32','s8','s16','s32'})do mem[name]=function(a)return raw[a] or 0 end end
      local adapted={};for name,read in pairs(mem)do adapted[name]=function(a)
        for _,u in pairs(slots)do
          local offset=a-u
          if offset>=14 and offset<28 then return read(a-2)end
        end
        return read(a)
      end end
      local D={slots=slots,validSlots=validSlots,mapMeta={chars=chars,classes=classes},defaults={}}
      if not ${['fe7-vietnamese','fe7-english','the-last-promise','dark-lord-maiden-of-light'].includes(id)} then
        D.chars=chars;D.classes=classes
      end
      local map={meta={chars=chars,classes=classes},config={},apply=function(v,owner,menu)
        v.mapOwner=owner;v.menuSelectionActive=menu
      end}
      local select=(function()${shared}\nend)()
      local function native()return function()
        if ui.native=='invalid' then return nil,true end
        if ui.native then return slots[2],true end
        return nil,false
      end end
      pack={require=function(name)
        if name=='game.profile' then return p end
        if name=='game.companion-selection' then return select end
        if name=='game.fe8-units-stat' then return (function()${modules['game.fe8-units-stat.lua']||'return nil'}\nend)() end
        if name=='game.selection' then return (function()${modules['game.selection.lua']||'return nil'}\nend)() end
        if name=='game.preparations' or name=='game.native-selection' then return native end
        if name=='presentation.defaults' then return function()return function(menu)return {unitPresent=false,menuSelectionActive=menu}end end end
        if name=='game.bindings' then return function()return function(v,u)v.unitName='Unit'..mem.u8(u+11);return v end end end
        if name=='presentation.unit' then return function()return function(v,u)v.unitPresent=true;v.deployment=mem.u8(u+11);v.characterPointer=mem.u32(u);v.classPointer=mem.u32(u+4)end end end
        if name=='game.items' or name=='game.battle' then return function()return function()end end end
        if name=='presentation.native-movement' then return function()return function(v)return v end end end
        error('Unexpected module: '..name)
      end}
      local read=(function()${source}\nend)()(D,map,fe6 and adapted or {truth=function(v)return v==true end},{apply=function()end})
      local result={}
      result[1]=read()
      ui={mapPickedId=129,mapPickedContext='0:1:5:5'};result[2]=read();result[3]=read()
      raw[slots[129]+12]=0x200;result[4]=read();raw[slots[129]+12]=0
      ui={mapPickedId=129,mapPickedContext='0:0:5:5'};result[5]=read()
      ui={mapPickedId=129,mapPickedContext='0:1:5:5',native='R'};result[6]=read()
      ui={mapPickedId=129,mapPickedContext='0:1:5:5',native='invalid'};result[7]=read()
      ui={mapPickedId=129,mapPickedContext='0:1:5:5'}
      raw[p.processPool]=p.playerProcess;raw[p.processPool+4]=p.playerPcStart+1
      result[8]=read()
      raw[p.processPool]=0;raw[p.processPool+4]=0;raw[p.cursorX]=4;result[9]=read()
      raw[p.cursorX]=5;raw[slots[1]+(fe6 and 17 or 19)]=0;raw[slots[129]+(fe6 and 17 or 19)]=0
      result[10]=read()
      return result
    `);
    assert.equal(result[0].deployment,1);
    assert.equal(result[1].deployment,129,'An injected legacy pick is read as internal compatibility state, not proof of a physical Map tap');
    assert.equal(result[1].companionPicked,true);
    assert.equal(result[1].mapOwner,undefined,'A companion pick must not impersonate a native selected-unit owner');
    assert.equal(result[2].deployment,129,'Pick persists across idle ticks');
    assert.equal(result[3].deployment,1,'Newly hidden enemy cannot remain picked');
    assert.equal(result[3].ui.set.mapPickedId,0,'Hidden pick is cleared from UI state');
    assert.equal(result[4].deployment,1,'Chapter/turn context invalidates a stale pick');
    assert.equal(result[4].ui.set.mapPickedId,0);
    assert.equal(result[5].deployment,2,'Native R/preparations selection wins over companion pick');
    assert.equal(result[5].ui.set.mapPickedId,0);
    assert.equal(result[6].unitPresent,false,'Invalid native selection cannot fall back to a stale pick');
    assert.equal(result[6].ui.set.mapPickedId,0);
    assert.equal(result[7].deployment,1,'Native action owner wins over companion pick');
    assert.equal(result[7].unitLocked,true);
    assert.equal(result[8].deployment,2,'Moving the native cursor invalidates a stale pick');
    assert.equal(result[9].unitPresent,false);
    assert.equal(result[9].ui.set.mapPickedId,0,'Empty-unit fallback must retain stale-pick invalidation');
  }finally{engine.global.close();}
});

test('all Map factories reject unpublished IDs before reaching the physical action',async()=>{
  for(const file of ['runtime/shared/game.fe8-map.lua','runtime/fe7-vietnamese/game.map.lua','runtime/fe6-remastered/game.map.lua']){
    const source=fs.readFileSync(file,'utf8');
    const engine=await luaFactory().createEngine();
    try{
      const result=await engine.doString(`input=nil;actions={};mem=setmetatable({},{__index=function()error('An unpublished ID must be rejected before physical validation or RAM access')end})
        pack={require=function(name)
          if name=='game.profile'then return{}end
          if name=='presentation.map-picks'then return (function()${fs.readFileSync('runtime/shared/presentation.map-picks.lua','utf8')}\nend)() end
          return function()return''end
        end}
        local factory=(function()${source}\nend)()
        factory({slots={},chars={},classes={},mapMeta={},mapWeapons={},fe8Chapters={}})
        return actions.focusMapUnit(129)`);
      assert.deepEqual(result,{},file+' rejects an ID before any selectable map has been published');
    }finally{engine.global.close();}
  }
});
