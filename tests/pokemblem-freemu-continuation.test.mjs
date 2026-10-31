import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

test('Pokemblem FreeMU keeps its map drawable, marks ranges unavailable and stops phantom continuation; tactical return clears the flag',async()=>{
  const engine=await luaFactory().createEngine();
  const map=fs.readFileSync('runtime/pokemblem/game.map.lua','utf8');
  const continuation=fs.readFileSync('runtime/shared/presentation.continuation.lua','utf8');
  const movement=fs.readFileSync('runtime/shared/presentation.native-movement.lua','utf8');
  try{
    const result=await engine.doString(`
      ui={mainTab='Map',mapDangerEnabled=true};actions={};input=nil;gfx=nil
      local unit=0x02020000;local requests,privateCalls=0,0
      local bytes={[0x030017A7]=1,[unit+11]=2,[unit+19]=20,[unit+16]=1}
      local words={[0x02024E68]=0x0859AAD8,[0x02024E6C]=0x0859AB58,
        [unit]=0x08001000,[unit+4]=0x08002000,
        [0x0202E4E0]=0x02000100,[0x02000100]=0x02000200,[0x02000104]=0x02000203,
        [0x0202E4E4]=0x02000110,[0x02000110]=0x02000210,[0x02000114]=0x02000213}
      mem={u8=function(a)return bytes[a]or 0 end,u16=function(a)return bytes[a]or 0 end,
        u32=function(a)return words[a]or 0 end}
      pack={require=function(name)
        if name=='game.profile' then return {chapter=0x0202BCFE}end
        if name=='features.native-map-query' then return function()return {
          begin=function()end,step=function(budget)assert(budget==512)end,
          request=function()requests=requests+1;return not ui.movementPending and {move=6}or nil end
        }end end
        if name=='game.native-ranges' then return function()return function()
          privateCalls=privateCalls+1
          return {movement={0,1,255,255,255,255},attack={0,1,1,0,0,0}}
        end end end
        if name=='game.fe8-map' then return function()return {
          config={},meta={classes={[0x08002000]={name='Species'}}},apply=function(v)
            assert(ui.mapDangerEnabled==false)
            v.mapPresent=true;v.mapWidth=3;v.mapHeight=2;v.mapPickContext='1:2:0:0'
            v.mapRoster={{id=2,member=true,selected=true}}
            v.mapCells={};for n=1,6 do v.mapCells[n]={marker=true}end
          end
        }end end
        error(name)
      end}
      local D={slots={[2]=unit}}
      local map=(function()${map}\nend)()(D)
      local move=(function()${movement}\nend)()(D)
      local present=(function()${continuation}\nend)()()
      local function applyUi(v)
        if v.ui and v.ui.set then for key,value in pairs(v.ui.set)do ui[key]=value end end
      end
      local function step(v)
        map.apply(v,nil,false);v=present(move(v));return v
      end
      local function mark(v)return {unavailable=v.mapRangesUnavailable,pending=v.companionWorkPending,
        pulse=v.ui and v.ui.set and v.ui.set.companionWorkPulse,drawable=v.mapPresent,cells=#v.mapCells,
        native=v.mapRangesNative,moveCount=v.mapMoveCount,attackCount=v.mapAttackCount,
        dangerReady=v.mapDangerReady,rangesBusy=v.mapNativeRangesBusy,dangerDisabled=v.mapDangerDisabled,
        headerPending=v.nativeMovePending,headerMove=v.move,privateCalls=privateCalls,requests=requests}end
      local v={unitPresent=false};local result={}
      for n=1,5 do v=step(v);applyUi(v)end
      result[1]=mark(v)
      bytes[0x030017A7]=0;v=step(v);applyUi(v);result[2]=mark(v)
      bytes[0x030017A7]=1;v=step(v);applyUi(v);result[3]=mark(v)
      bytes[0x030017A7]=0;v=step(v);applyUi(v);result[4]=mark(v)
      -- A real header movement job is independent of unavailable FreeMU ranges.
      bytes[0x030017A7]=1;ui.movementPending=true
      v={unitPresent=true,deployment=2,characterPointer=0x08001000,classPointer=0x08002000}
      v=step(v);applyUi(v);result[5]=mark(v)
      ui.movementPending=false;v=step(v);applyUi(v);v=step(v);result[6]=mark(v)
      -- The three actual FreeMU process scripts also own this mode when its
      -- convenience flag is clear. An ended process must release ownership.
      bytes[0x030017A7]=0;v={unitPresent=false}
      for n,script in ipairs({0x0969B044,0x0969B004,0x0969B024})do
        words[0x02024E68+108]=script;words[0x02024E6C+108]=script+8
        v=step(v);applyUi(v);result[6+n]=mark(v)
      end
      words[0x02024E6C+108]=0x0969B024+0x600
      v=step(v);applyUi(v);result[10]=mark(v)
      return result
    `);
    for(const n of [0,2]){
      assert.equal(result[n].unavailable,true,'FreeMU ranges have no queued tactical work');
      assert.equal(result[n].pending,false);assert.equal(result[n].pulse,undefined);
      assert.equal(result[n].drawable,true);assert.equal(result[n].cells,6,'Keep the drawable map');
      assert.equal(result[n].native,false);assert.equal(result[n].moveCount,0);assert.equal(result[n].attackCount,0);
      assert.equal(result[n].rangesBusy,false);assert.equal(result[n].dangerDisabled,true);
    }
    assert.equal(result[0].privateCalls,0);assert.equal(result[0].requests,0,'No query exists to justify a continuation pulse');
    for(const n of [1,3]){
      assert.equal(result[n].unavailable,false,'Tactical return must clear FreeMU range unavailability');
      assert.equal(result[n].native,true);assert.equal(result[n].moveCount,2);assert.equal(result[n].dangerReady,true);
      assert.equal(result[n].dangerDisabled,false);assert.equal(result[n].pending,false);
    }
    assert.equal(result[4].unavailable,true);assert.equal(result[4].headerPending,true);
    assert.equal(result[4].pending,true);assert.notEqual(result[4].pulse,undefined,'Legitimate header work may continue during FreeMU');
    assert.equal(result[5].unavailable,true);assert.equal(result[5].headerPending,false);assert.equal(result[5].headerMove,6);
    assert.equal(result[5].pending,false);assert.equal(result[5].pulse,undefined);
    for(const n of [6,7,8]){
      assert.equal(result[n].unavailable,true,'Active FreeMU process must disable tactical ranges without relying on the mode bit');
      assert.equal(result[n].pending,false);assert.equal(result[n].pulse,undefined);
      assert.equal(result[n].privateCalls,result[5].privateCalls,'No tactical range job may be created in a FreeMU process');
    }
    assert.equal(result[9].unavailable,false,'An ended FreeMU process must not retain range unavailability');
    assert.equal(result[9].native,true);assert.equal(result[9].pending,false);
  }finally{engine.global.close();}
});
