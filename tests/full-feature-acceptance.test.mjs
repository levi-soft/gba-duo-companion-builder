import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const encode=source=>Buffer.from(source).toString('base64');
const word=n=>Buffer.from(Uint32Array.of(n).buffer);

// Persisted UI picks below are reader-compatibility inputs, not physical taps.
// Their read-only assertions apply to readers/private calculations only.
test('Pokemblem native stat reader overrides injected legacy UI picks and clears invalid units',async()=>{
  const ram=Buffer.alloc(0x40000),base=0x02000000;
  const byte=(at,value)=>{ram[at-base]=value;};
  const put=(at,value)=>ram.writeUInt32LE(value,at-base);
  const units={1:0x02020000,2:0x02020100,129:0x02020200};
  for(const [id,unit] of Object.entries(units)){
    put(unit,0x0800A000+Number(id)*4);put(unit+4,0x0800B000+Number(id)*4);
    byte(unit+11,Number(id));byte(unit+18,20);byte(unit+19,20);
    byte(unit+16,Number(id)===129?6:Number(id)===1?4:5);byte(unit+17,5);
  }
  ram.writeUInt16LE(10,0x30);ram.writeUInt16LE(10,0x32);
  ram.writeUInt16LE(5,0x34);ram.writeUInt16LE(5,0x36);ram.writeUInt16LE(1,0x3A);
  put(0x0200003C,0x02000100);
  for(let y=0;y<10;y++)put(0x02000100+y*4,0x02001000+y*10);
  for(const [id,u]of Object.entries(units))byte(0x02001000+5*10+ram[u-base+16],Number(id));
  const main=`
    local slots={[1]=${units[1]},[2]=${units[2]},[129]=${units[129]}}
    local chars,classes={},{}
    for id,unit in pairs(slots)do
      chars[0x0800A000+id*4]={name='Unit'..id}
      classes[0x0800B000+id*4]={name=id==1 and '--' or 'Species'..id}
    end
    local D={slots=slots,chars=chars,classes=classes}
    local map={meta={chars=chars,classes=classes},config={},apply=function(v,unit,menu)v.menuSelectionActive=menu end}
    local read=pack.require('game.units')(D,map,{truth=function(value)return value==true end},{apply=function()end})
    function update()return read()end
  `;
  const files={
    'main.lua':encode(main),
    'game.profile.lua':encode(`return {processPool=0x02010000,playerProcess=0x08000200,forecastProcess=0x08000300,enemyProcess=0x08000400,activeUnit=0x02000060,phase=0x02000038,playerPcStart=0x08000210,playerPcEnd=0x08000220,enemyPcStart=0x08000410,enemyPcEnd=0x08000420,statScreenProcess=0x08001000,statScreenUnit=0x02000020,prepFlagAddress=0x02000050,prepFlagMask=1,prepUnitList=0x02012000,cursorX=0x02000034,cursorY=0x02000036,mapWidth=0x02000030,mapHeight=0x02000032,unitRows=0x0200003C,chapter=0x02000039,turn=0x0200003A}`),
    'presentation.defaults.lua':encode('return function()return function(menu)return {unitPresent=false,unitAbsent=true,menuSelectionActive=menu}end end'),
    'game.bindings.lua':encode('return function()return function(v)return v end end'),
    'game.items.lua':encode('return function()return function()end end'),
    'game.battle.lua':encode('return function()return function()end end')
  };
  for(const [name,file] of [
    ['game.units','runtime/pokemblem/game.units.lua'],
    ['game.selection','runtime/pokemblem/game.selection.lua'],
    ['game.companion-selection','runtime/shared/game.companion-selection.lua'],
    ['game.preparations','runtime/shared/game.preparations.lua'],
    ['game.native-selection','runtime/shared/game.native-selection.lua'],
    ['presentation.native-movement','runtime/shared/presentation.native-movement.lua']
  ])files[name+'.lua']=encode(fs.readFileSync(file,'utf8'));
  const picked={mapPickedId:129,mapPickedContext:'0:1:5:5'};
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:base,bytes:ram}],steps:[
    {ui:picked,expect:{deployment:129,companionPicked:true}},
    {ui:picked,patches:[{address:0x02010000,bytes:word(0x08001000)},{address:0x02010004,bytes:word(0x08001010)},{address:0x02000020,bytes:word(units[2])}],expect:{deployment:2,unitPresent:true,menuSelectionActive:true}},
    {ui:picked,patches:[{address:0x02000020,bytes:word(units[129])}],expect:{deployment:129,unitPresent:true,menuSelectionActive:true}},
    {ui:picked,patches:[{address:0x02000020,bytes:word(0x01000000)}],expect:{unitPresent:false,menuSelectionActive:true}},
    {ui:picked,patches:[{address:0x02000020,bytes:word(units[2])},{address:units[2]+19,bytes:[0]}],expect:{unitPresent:false,menuSelectionActive:true}},
    {ui:{mapPickedId:0,mapPickedContext:''},patches:[{address:0x02010004,bytes:word(0)},{address:units[2]+19,bytes:[20]}],expect:{deployment:2,unitPresent:true,menuSelectionActive:false}},
    {ui:{mapPickedId:0,mapPickedContext:''},patches:[{address:0x02010000,bytes:word(0x08000200)},{address:0x02010004,bytes:word(0x0859ACA8)},{address:0x02000060,bytes:word(units[129])},{address:0x02000034,bytes:[6,0]},{address:0x02001000+5*10+6,bytes:[0]}],expect:{deployment:129,unitPresent:true,unitLocked:true}},
    {ui:{mapPickedId:0,mapPickedContext:''},patches:[{address:units[129]+12,bytes:word(0x201)}],expect:{unitPresent:false}},
    {ui:picked,patches:[{address:0x02010000,bytes:word(0x08001000)},{address:0x02010004,bytes:word(0x08001010)},{address:0x02000050,bytes:[1]},{address:0x02000020,bytes:word(units[129])}],expect:{unitPresent:false,menuSelectionActive:true}}
  ]});
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('Pokemblem reads owned native IWRAM ranges and threat fog, clearing stale or hidden contexts',async()=>{
  const ew=Buffer.alloc(0x40000),iw=Buffer.alloc(0x8000),unit=0x02020000;
  const put=(address,value)=>{const b=address>=0x03000000?iw:ew;b.writeUInt32LE(value,address-(address>=0x03000000?0x03000000:0x02000000));};
  put(unit,0x08001000);put(unit+4,0x08002000);ew[unit-0x02000000+11]=2;ew[unit-0x02000000+19]=20;
  put(0x02024E68,0x0859AAD8);put(0x02024E6C,0x0859ABA0);put(0x03004E50,unit);
  put(0x0202E4E0,0x03000080);put(0x03000080,0x03000100);put(0x03000084,0x03000103);iw.set([0,1,255,2,255,255],0x100);
  put(0x0202E4E4,0x030000A0);put(0x030000A0,0x03000200);put(0x030000A4,0x03000203);iw.set([0,1,2,0,1,0],0x200);
  put(0x0202E4E8,0x02000120);put(0x02000120,0x02000200);put(0x02000124,0x02000203);ew.set([0,1,1,0,1,0],0x200);iw[6]=2;
  const files={
    'main.lua':encode(`local unit=${unit};local D={slots={[2]=unit}};local map=pack.require('game.map')(D);local present=pack.require('presentation.native-movement')(D);function update()local v={unitPresent=true,deployment=2,characterPointer=0x08001000,classPointer=0x08002000,move=6};map.apply(v,ui.selected and unit or nil,ui.preparations);return present(v)end`),
    'game.map.lua':encode(fs.readFileSync('runtime/pokemblem/game.map.lua','utf8')),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'presentation.native-movement.lua':encode(fs.readFileSync('runtime/shared/presentation.native-movement.lua','utf8')),
    'game.profile.lua':encode('return {chapter=0x0202BCFE}'),
    'features.thumb.lua':encode(`return {start=function(entry,args,initial,options)
      assert(entry==0x08019224);local total=0;return function(budget)
        total=math.min(600,total+budget);if total<600 then return false,nil,initial,total end
        return true,5,initial,total,options.busContext
      end
    end}`),
    'game.native-ranges.lua':encode('return function()return function()return nil end end'),
    'game.fe8-map.lua':encode(`return function(D)
      actions.focusMapUnit=function()return{}end
      return {config={},meta={classes={[0x08002000]={name='Species'}}},apply=function(v,selected,preparations)
        assert(ui.mapDangerEnabled==false,'Never use retail inventory danger calculations')
        v.mapPresent=not preparations;v.mapWidth=3;v.mapHeight=2;v.mapRoster={{id=2,member=true,selected=true}}
        v.mapCells={};for n=1,6 do v.mapCells[n]={}end
      end}
    end`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:iw}],steps:[
    {ui:{selected:true,mapDangerEnabled:true},expect:{mapRangesNative:true,mapRangesUnitId:2,mapMoveCount:3,mapAttackCount:2,mapDangerCount:3,mapDangerReady:true,nativeMovePending:true,move:'---'}},
    {ui:{selected:true,mapDangerEnabled:false},expect:{mapRangesNative:true,mapMoveCount:3,mapAttackCount:2,mapDangerCount:0,nativeMovePending:false,move:5}},
    {ui:{selected:true,mapDangerEnabled:true},patches:[{address:0x03004E50,bytes:word(0)}],expect:{mapRangesNative:false,mapMoveCount:0,mapAttackCount:0,mapDangerCount:3}},
    {ui:{selected:true,mapDangerEnabled:true},patches:[{address:0x03004E50,bytes:word(unit)},{address:0x02024E6C,bytes:word(0x0859AB58)}],focusUnit:2,expect:{mapRangesNative:false,mapMoveCount:0,mapAttackCount:0}},
    {ui:{selected:true,mapDangerEnabled:true},patches:[{address:0x030017A7,bytes:[1]}],focusUnit:2,expect:{mapRangesUnavailable:true,mapRangesNative:false,mapMoveCount:0,mapAttackCount:0}},
    {ui:{selected:true,mapDangerEnabled:true},patches:[{address:0x02024E6C,bytes:word(0x0859ABA0)}],expect:{mapRangesUnavailable:true,mapRangesNative:false,mapMoveCount:0,mapAttackCount:0}},
    {ui:{selected:true,mapDangerEnabled:true},patches:[{address:0x02024E68+108,bytes:word(0x0969B044)},{address:0x02024E6C+108,bytes:word(0x0969B064)}],focusUnit:2,expect:{mapRangesUnavailable:true,mapRangesNative:false,mapMoveCount:0,mapAttackCount:0}},
    {ui:{selected:true,mapDangerEnabled:true},patches:[{address:0x02024E6C+108,bytes:word(0)},{address:0x02024E6C,bytes:word(0x0859ABA0)},{address:0x030017A7,bytes:[0]},{address:0x0202BCFD,bytes:[1]}],expect:{mapRangesUnavailable:false,mapRangesNative:true,mapMoveCount:3,mapDangerCount:0,mapDangerReady:true,mapDangerDisabled:false}},
    {ui:{selected:true,mapDangerEnabled:true},patches:[{address:0x0202BCFD,bytes:[0]},{address:0x03000006,bytes:[0]}],expect:{mapRangesNative:true,mapDangerCount:0,mapDangerReady:true}},
    {ui:{selected:true,mapDangerEnabled:true},patches:[{address:0x03000006,bytes:[2]},{address:0x0202E4E4,bytes:word(0x03007FFC)}],expect:{mapRangesNative:false,mapMoveCount:0,mapAttackCount:0,mapDangerCount:3}},
    {ui:{selected:true,mapDangerEnabled:true,preparations:true},expect:{mapRangesNative:false,mapMoveCount:0,mapAttackCount:0,mapDangerCount:0,mapDangerReady:false}}
  ]});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
  assert.deepEqual(run.values[0].mapCells.map(cell=>[cell.move,cell.attack,cell.danger]),[
    [true,false,false],[true,false,true],[false,true,true],[true,false,false],[false,true,true],[false,false,false]
  ]);
});

test('opt-in movement cost modifiers affect reachability without changing defaults or blocked terrain',async()=>{
  const ram=Buffer.alloc(0x40000),unit=0x02002000;
  const put=(at,value)=>ram.writeUInt32LE(value,at-0x02000000);
  ram.writeUInt16LE(3,0x10);ram.writeUInt16LE(1,0x12);
  put(0x02000014,0x02000100);put(0x02000100,0x02000108);ram[0x108]=1;
  put(0x02000018,0x02000110);put(0x02000110,0x02000120);ram.set([1,2,3],0x120);
  put(unit,0x08001000);put(unit+4,0x08002000);ram[0x200B]=1;ram[0x2012]=20;ram[0x2013]=20;
  const main=`
    local costs={};for n=1,65 do costs[n]=255 end;costs[2]=1;costs[3]=2
    local char={name='Fixture',portrait='',attributes=0}
    local class={name='Fixture',portrait='',mapSprites={'','',''},attributes=0,move=1,movementCosts={costs,costs,costs}}
    local chars,classes={[0x08001000]=char},{[0x08002000]=class}
    local D={chars=chars,classes=classes,slots={[1]=${unit}},mapMeta={chars=chars,classes=classes,ballistaCosts=costs},mapWeapons={},fe8Chapters={}}
    local map=pack.require('game.fe8-map')(D)
    function update()
      D.mapMovementCostsForUnit=ui.enabled and function(unit,base)
        assert(unit==${unit});local adjusted={};for n,value in ipairs(base)do adjusted[n]=value==255 and 255 or 1 end;return adjusted
      end or nil
      D.mapRangesReady=ui.busy and function()return false end or nil
      local v={};map.apply(v,nil,false);v.originalCost=costs[3];v.blockedCost=costs[4];return v
    end
  `;
  const files={
    'main.lua':encode(main),
    'game.profile.lua':encode('return {mapWidth=0x02000010,mapHeight=0x02000012,unitRows=0x02000014,terrainRows=0x02000018,cursorX=0x0200001C,cursorY=0x0200001E,chapter=0x02000020,turn=0x02000022}'),
    'game.fe8-map.lua':encode(fs.readFileSync('runtime/shared/game.fe8-map.lua','utf8')),
    'presentation.chapter.lua':encode(fs.readFileSync('runtime/shared/presentation.chapter.lua','utf8')),
    'presentation.map-picks.lua':encode(fs.readFileSync('runtime/shared/presentation.map-picks.lua','utf8'))
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ram}],steps:[
    {ui:{enabled:false},expect:{mapMoveCount:1,originalCost:2,blockedCost:255}},
    {ui:{enabled:true},expect:{mapMoveCount:2,originalCost:2,blockedCost:255}},
    {ui:{enabled:false},expect:{mapMoveCount:1,originalCost:2,blockedCost:255}},
    {ui:{enabled:false,busy:true,mapDangerEnabled:true},expect:{mapMoveCount:0,mapRangesBusy:true,mapDangerEnabled:true,mapDangerDisabled:false,mapDangerReady:false,mapDangerCount:0}}
  ]});
  assert.equal(run.readOnly,true);assert.equal(run.values[1].mapCells[2].move,false);
});

test('Sun native Acrobat adapter preserves impassable costs and refreshes per-unit and danger caches',async()=>{
  const ram=Buffer.alloc(0x40000),one=0x02002000,two=0x02002100;
  ram.writeUInt32LE(0x08001000,one-0x02000000);ram.writeUInt32LE(0x08002000,two-0x02000000);
  ram[one-0x02000000+71]=1;ram[one-0x02000000+70]=7;ram[two-0x02000000+70]=4;
  const files={
    'main.lua':encode(`
      local D={chars={[0x08001000]={id=1},[0x08002000]={id=2}},skillConfig={cache=0x02026BB0}}
      local map=pack.require('game.map')(D)
      local previous
      function update()
        local v={};map.apply(v)
        local base={0,1,2,5,254,255}
        local first=D.mapMovementCostsForUnit(${one},base)
        local second=D.mapMovementCostsForUnit(${two},base)
        D.mapMovementCostsForUnit(${one},base)
        local revision=D.mapRangeRevision()
        local changed=previous~=nil and previous~=revision;previous=revision
        return {first=first,second=second,base=base,calls=acrobatCalls,revisionChanged=changed,moveOne=D.mapMoveForUnit(${one}),moveTwo=D.mapMoveForUnit(${two}),nativeBusy=v.mapNativeRangesBusy}
      end
    `),
    'game.map.lua':encode(fs.readFileSync('runtime/sun-gods-wrath/game.map.lua','utf8')),
    'game.fe8-map.lua':encode(`return function(D)return {config={},apply=function(v)
      v.mapRangesBusy=not D.mapRangesReady({[1]={u=${one},state=0},[129]={u=${two},state=0}},1)
    end}end`),
    'game.fe8-native-map.lua':encode(fs.readFileSync('runtime/shared/game.fe8-native-map.lua','utf8')),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.thumb.lua':encode(`
      acrobatCalls=0
      return {start=function(entry,args,initial,options)
        assert(options.strictStack and options.maxSteps==8192)
        for n=0,3 do assert(initial[0x02026BB0+n]==0,'Invalidate only the private native skill cache')end
        if entry==0x08019224 then return function(budget)
          assert(budget>0);options.ramByte(0x02026BC8);return true,options.ramByte(args[1]+70),initial,1
        end end
        assert(entry==0x09EFBAF4 and args[2]==1,'Use the exact Sun SkillTester and Acrobat ID')
        acrobatCalls=acrobatCalls+1
        return function(budget)
          assert(budget>0);options.ramByte(0x0203A4D4);options.ramByte(args[1]==${one} and 0x0203E885 or 0x0203E895)
          return true,options.ramByte(args[1]+71),initial,1
        end
      end}
    `)
  };
  const steps=[
    {expect:{calls:2,revisionChanged:false,moveOne:7,moveTwo:4,nativeBusy:true}},
    {expect:{calls:2,revisionChanged:false,nativeBusy:false}},
    {patches:[{address:one+71,bytes:[0]}],expect:{calls:3,revisionChanged:true}},
    {patches:[{address:0x0203E885,bytes:[7]}],expect:{calls:4,revisionChanged:true}},
    {patches:[{address:0x02026BC8,bytes:[1]}],expect:{calls:6,revisionChanged:true}},
    {patches:[{address:0x0203A4D4,bytes:[1]}],expect:{calls:8,revisionChanged:true}},
    {patches:[{address:two+71,bytes:[1]}],expect:{calls:9,revisionChanged:true}},
    {patches:[{address:0x0203E8B5,bytes:[3]}],expect:{calls:9,revisionChanged:false}},
    {patches:[{address:one+70,bytes:[6]}],expect:{calls:10,revisionChanged:true,moveOne:6}}
  ];
  for(const step of steps)step.ui={mapDangerEnabled:true};
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ram},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps});
  const plain=[0,1,2,5,254,255],acrobat=[1,1,1,1,1,255];
  for(const value of run.values)assert.deepEqual(value.base,plain);
  assert.deepEqual(run.values[0].first,acrobat);assert.deepEqual(run.values[0].second,plain);
  assert.deepEqual(run.values[2].first,plain);assert.deepEqual(run.values[6].second,acrobat);
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('an injected stale legacy UI pick cannot reveal a now-hidden enemy through its name or ranges',async()=>{
  const ram=Buffer.alloc(0x40000),unit=0x02002000;
  const put=(at,value)=>ram.writeUInt32LE(value,at-0x02000000);
  ram.writeUInt16LE(3,0x10);ram.writeUInt16LE(1,0x12);
  put(0x02000014,0x02000100);put(0x02000100,0x02000108);ram[0x109]=129;
  put(0x02000018,0x02000110);put(0x02000110,0x02000120);ram.set([1,1,1],0x120);
  put(unit,0x08001000);put(unit+4,0x08002000);ram[0x200B]=129;ram[0x2010]=1;ram[0x2012]=20;ram[0x2013]=20;
  const files={
    'main.lua':encode(`
      local costs={};for n=1,65 do costs[n]=1 end
      local chars={[0x08001000]={name='Hidden enemy',portrait='',attributes=0}}
      local classes={[0x08002000]={name='Fixture',portrait='',mapSprites={'','',''},attributes=0,move=1,movementCosts={costs,costs,costs}}}
      local D={chars=chars,classes=classes,slots={[129]=${unit}},mapMeta={chars=chars,classes=classes,ballistaCosts=costs},mapWeapons={},fe8Chapters={}}
      local map=pack.require('game.fe8-map')(D)
      function update()local v={};map.apply(v,ui.selected and ${unit} or nil,false);return v end
    `),
    'game.profile.lua':encode('return {mapWidth=0x02000010,mapHeight=0x02000012,unitRows=0x02000014,terrainRows=0x02000018,cursorX=0x0200001C,cursorY=0x0200001E,chapter=0x02000020,turn=0x02000022}'),
    'game.fe8-map.lua':encode(fs.readFileSync('runtime/shared/game.fe8-map.lua','utf8')),
    'presentation.chapter.lua':encode(fs.readFileSync('runtime/shared/presentation.chapter.lua','utf8')),
    'presentation.map-picks.lua':encode(fs.readFileSync('runtime/shared/presentation.map-picks.lua','utf8'))
  };
  const picked={mapPickedId:129,mapPickedContext:'0:0:0:0'};
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ram}],steps:[
    {ui:picked,expect:{mapMoveCount:3,mapRangeUnit:'Hidden enemy'}},
    {ui:picked,patches:[{address:unit+12,bytes:word(0x200)}],expect:{mapMoveCount:0,mapAttackCount:0,mapRangeUnit:''}},
    {ui:{...picked,selected:true},expect:{mapMoveCount:0,mapAttackCount:0,mapRangeUnit:''}},
    {ui:picked,patches:[{address:unit+12,bytes:word(0)}],expect:{mapMoveCount:3,mapRangeUnit:'Hidden enemy'}}
  ]});
  assert.equal(run.values[1].ui.set.mapPickedId,0);
  assert.equal(run.values[1].mapRoster.some(row=>row.member),false);
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('Dark Lord full entry pipeline preserves Map and popup choices during stable Forecast and tracks RNG',async()=>{
  const ew=Buffer.alloc(0x40000),iw=Buffer.alloc(0x8000),unit=0x02010000,pool=0x02020000,forecast=pool+108;
  ew.writeUInt32LE(100,pool-0x02000000);ew.writeUInt32LE(102,pool-0x02000000+4);
  iw.writeUInt32LE(unit,0x4690);
  ew.writeUInt32LE(0x08010000,0x10000);ew.writeUInt32LE(0x08020000,0x10004);
  ew[0x1000B]=1;ew[0x10012]=20;ew[0x10013]=20;
  const files={
    'main.lua':encode(fs.readFileSync('runtime/dark-lord-maiden-of-light/main.lua','utf8')),
    'game.units.lua':encode(fs.readFileSync('runtime/dark-lord-maiden-of-light/game.units.lua','utf8')),
    'game.companion-selection.lua':encode(fs.readFileSync('runtime/shared/game.companion-selection.lua','utf8')),
    'presentation.prediction.lua':encode(fs.readFileSync('runtime/shared/presentation.prediction.lua','utf8')),
    'presentation.forecast.lua':encode(fs.readFileSync('runtime/shared/presentation.forecast.lua','utf8')),
    'features.rng-indicator.lua':encode(fs.readFileSync('runtime/shared/features.rng-indicator.lua','utf8')),
    'game.profile.lua':encode(`return {processPool=${pool},playerProcess=100,forecastProcess=200,enemyProcess=300,activeUnit=0x03004690,phase=0x0202BC07,playerPcStart=101,playerPcEnd=103,enemyPcStart=301,enemyPcEnd=303}`),
    'data.rom_tables.lua':encode(`local chars={[0x08010000]={}};local classes={[0x08020000]={mapSprites={}}};return {uiStrings={},mapMeta={chars=chars,classes=classes},slots={[1]=${unit}},validSlots={[${unit}]=1}}`),
    'shared.values.lua':encode('return {truth=function(value)return value==true end}'),
    'game.map.lua':encode('return function(D)return {meta=D.mapMeta,config={},apply=function()end}end'),
    'game.native-selection.lua':encode('return function()return function()return nil,false end end'),
    'presentation.defaults.lua':encode('return function()return function()error("Unexpected empty unit")end end'),
    'game.bindings.lua':encode('return function()return function(v)return v end end'),
    'game.items.lua':encode('return function()return function()end end'),
    'game.battle.lua':encode('return function()return function()end end'),
    'game.names.lua':encode('return function()return function()end end'),
    'presentation.unit-stats.lua':encode('return function()return function()end end'),
    'presentation.inventory.lua':encode('return function()end'),
    'presentation.growth.lua':encode('return function()end'),
    'game.support.lua':encode('return function()return function()end end'),
    'game.talk.lua':encode('return function()return function()end end'),
    'features.analysis.lua':encode('return function()return function()end end'),
    'presentation.english.lua':encode('return function()return function(v)return v end end')
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:iw}],steps:[
    {ui:{mainTab:'Map'},expect:{forecastActive:false,rngStateChanged:false}},
    {ui:{mainTab:'Map'},patches:[{address:forecast,bytes:word(200)},{address:forecast+0x33,bytes:[1]}],expect:{forecastActive:true,rngStateChanged:false}},
    {ui:{mainTab:'Map'},patches:[{address:0x03000000,bytes:[1]}],expect:{forecastActive:true,rngStateChanged:true}},
    {ui:{mainTab:'Map',predictionPopup:true},expect:{forecastActive:true,rngStateChanged:false}},
    {ui:{mainTab:'Map',predictionPopup:false},patches:[{address:forecast,bytes:word(0)}],expect:{forecastActive:false,rngStateChanged:false}},
    {ui:{mainTab:'Map'},patches:[{address:forecast,bytes:word(200)}],expect:{forecastActive:true,rngStateChanged:false}}
  ]});
  assert.equal(run.values[1].ui.set.mainTab,'Units');
  for(const n of [2,3]){
    assert.equal(run.values[n].ui.set.mainTab,undefined);
    assert.equal(run.values[n].ui.set.navUnits,undefined);
    assert.equal(run.values[n].ui.set.navMap,undefined);
    assert.equal(run.values[n].ui.set.predictionPopup,undefined);
  }
  for(const n of [1,4,5]){
    assert.equal(run.values[n].ui.set.predictionPopup,false);
    assert.equal(run.values[n].ui.set.growthPopup,false);
  }
  assert.equal(run.values[5].ui.set.mainTab,'Units');
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('opt-in native enemy inspection retains the removed map unit with identity, process, fog and lifecycle guards',async()=>{
  const ew=Buffer.alloc(0x40000),unit=0x02020000,pool=0x02010000,pc=0x08000240;
  const put=(address,value)=>ew.writeUInt32LE(value,address-0x02000000);
  put(unit,0x08001000);put(unit+4,0x08002000);ew[0x2000B]=129;ew[0x20013]=20;put(unit+12,1);
  put(pool,0x08000200);put(pool+4,pc);put(pool+108,0x08000300);put(0x02000060,unit);
  ew.writeUInt16LE(2,0x30);ew.writeUInt16LE(2,0x32);put(0x0200003C,0x02000100);put(0x02000100,0x02000120);put(0x02000104,0x02000122);
  const files={
    'main.lua':encode(`
      local D={chars={[0x08001000]={}},classes={[0x08002000]={}},slots={[129]=${unit}}}
      local map={meta={chars=D.chars,classes=D.classes},config={},apply=function(v,unit)v.rangeOwner=unit end}
      local values={truth=function(value)return value==true end};local abilities={apply=function()end}
      local factory=pack.require('game.fe8-units-stat')
      local opted=factory(D,map,values,abilities,{inspectionPc=${pc}})
      local original=factory(D,map,values,abilities)
      function update()return ui.original and original() or opted()end
    `),
    'game.fe8-units-stat.lua':encode(fs.readFileSync('runtime/shared/game.fe8-units-stat.lua','utf8')),
    'game.companion-selection.lua':encode(fs.readFileSync('runtime/shared/game.companion-selection.lua','utf8')),
    'presentation.native-movement.lua':encode(fs.readFileSync('runtime/shared/presentation.native-movement.lua','utf8')),
    'game.profile.lua':encode(`return {processPool=${pool},playerProcess=0x08000200,forecastProcess=0x08000300,enemyProcess=0x08000400,activeUnit=0x02000060,phase=0x02000038,playerPcStart=0x08000210,playerPcEnd=0x08000220,enemyPcStart=0x08000410,enemyPcEnd=0x08000420,cursorX=0x02000034,cursorY=0x02000036,mapWidth=0x02000030,mapHeight=0x02000032,unitRows=0x0200003C}`),
    'game.native-selection.lua':encode('return function()return function()return nil,ui.preparations==true end end'),
    'presentation.defaults.lua':encode('return function()return function(menu)return {unitPresent=false,unitAbsent=true,menuSelectionActive=menu}end end'),
    'game.bindings.lua':encode('return function()return function(v)return v end end'),
    'game.items.lua':encode('return function()return function()end end'),
    'game.battle.lua':encode('return function()return function()end end')
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew}],steps:[
    {expect:{unitPresent:true,unitLocked:true,deployment:129,forecastActive:false,rangeOwner:unit}},
    {ui:{original:true},expect:{unitPresent:false}},
    {patches:[{address:pool,bytes:word(0x08000500)}],expect:{unitPresent:false}},
    {patches:[{address:pool,bytes:word(0x08000200)},{address:pool+4,bytes:word(pc+8)}],expect:{unitPresent:false}},
    {patches:[{address:pool+4,bytes:word(pc)},{address:0x02000060,bytes:word(unit+4)}],expect:{unitPresent:false}},
    {patches:[{address:0x02000060,bytes:word(0x0203FFF8)}],expect:{unitPresent:false}},
    {patches:[{address:0x02000060,bytes:word(unit)},{address:unit+12,bytes:word(0x201)}],expect:{unitPresent:false}},
    {patches:[{address:unit+12,bytes:word(1)},{address:unit+19,bytes:[0]}],expect:{unitPresent:false}},
    {ui:{preparations:true},patches:[{address:unit+19,bytes:[20]}],expect:{unitPresent:false,menuSelectionActive:true}},
    {patches:[{address:pool+0x28,bytes:[1]}],expect:{unitPresent:false}},
    {patches:[{address:pool+0x28,bytes:[0]}],expect:{unitPresent:true,unitLocked:true,deployment:129,forecastActive:false}},
    {expect:{unitPresent:true,unitLocked:true,deployment:129,forecastActive:false}}
  ]});
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('native Map jobs share a strict slice, freeze inputs, discard stale completion and cache only observed dependencies',async()=>{
  const ram=Buffer.alloc(0x40000);ram[0x10]=3;ram[0x20]=5;
  const files={
    'main.lua':encode(`
      local query=pack.require('features.native-map-query')({cache=0x02000040,beforeEntry={[1]=function()end}})
      function update()
        query.begin()
        local a=query.request('a',{{entry=1,args={0x02000010},key='value'}})
        local b=query.request('b',{{entry=1,args={0x02000020},key='value'}})
        local ready=query.ready();local spent=query.step(2)
        return {a=a and a.value,b=b and b.value,ready=ready,spent=spent}
      end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.thumb.lua':encode(`return {start=function(entry,args,initial,options)
      assert(entry==1 and options.strictStack and options.maxSteps==8192)
      assert(type(options.beforeEntry[1])=='function')
      for n=0,3 do assert(initial[0x02000040+n]==0)end
      local total=0
      return function(budget)
        total=math.min(6,total+budget)
        if total<6 then return false,nil,initial,total end
        initial[0x02000040]=255
        return true,options.ramByte(args[1]),initial,total
      end
    end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ram},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
    {expect:{ready:false,spent:2}},
    {patches:[{address:0x02000010,bytes:[9]}],ticks:8},
    {expect:{ready:true,a:9,b:5,spent:0}},
    {patches:[{address:0x02000011,bytes:[8]}],expect:{ready:true,a:9,b:5,spent:0}},
    {patches:[{address:0x02000020,bytes:[7]}],expect:{ready:false,spent:2}}
  ]});
  assert(run.values.every(value=>value.spent<=2));
  assert(run.values.every(value=>value.a!==3),'A result from stale captured RAM must never publish');
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('native Map cache pins captured bus identity while forwarding the private latch between phases',async()=>{
  const ram=Buffer.alloc(0x40000);ram[0x10]=4;
  const files={
    'main.lua':encode(`
      mem.busContext=function()return {version=1,platform='gba',biosPrefetch=0x11223300|mem.u8(0x02000010)}end
      local query=pack.require('features.native-map-query')({});local previous
      function update()
        query.begin()
        local value=query.request('unit',{{entry=1,args={},key='move'},{entry=2,args={},key='advanced'}})
        query.step(512)
        local revision=query.revision();local changed=previous~=nil and previous~=revision;previous=revision
        return {move=value and value.move,advanced=value and value.advanced,starts=starts or 0,revisionChanged=changed}
      end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.thumb.lua':encode(`return {start=function(entry,args,initial,options)
      starts=(starts or 0)+1
      return function()
        return true,options.busContext.biosPrefetch&255,initial,1,{version=1,platform='gba',biosPrefetch=0x99AABB44}
      end
    end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ram},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
    {ticks:2,expect:{move:4,advanced:0x44,starts:2,revisionChanged:false}},
    {patches:[{address:0x02000010,bytes:[8]}],expect:{move:undefined,starts:4,revisionChanged:true}},
    {expect:{move:8,advanced:0x44,starts:4,revisionChanged:false}}
  ]});
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('native movement runs for Preparations and invalid maps before the Units post-read request, cancelling abandoned units',async()=>{
  const ew=Buffer.alloc(0x40000),one=0x02000100,two=0x02000200;ew[0x100+70]=5;ew[0x200+70]=7;
  const files={
    'main.lua':encode(`
      local D={slots={[1]=${one},[2]=${two}},mapWeapons={}}
      local map=pack.require('game.fe8-native-map')(D,{moveEntry=1,workSlice=512})
      function update()
        local v={unitPresent=true,deployment=ui.unit or 1}
        map.apply(v,nil,ui.preparations==true)
        local move=D.mapMoveForUnit(D.slots[v.deployment])
        return {move=move or '---',pending=type(move)~='number',starts=starts or 0,mapPresent=v.mapPresent}
      end
    `),
    'game.fe8-native-map.lua':encode(fs.readFileSync('runtime/shared/game.fe8-native-map.lua','utf8')),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'game.fe8-map.lua':encode('return function()return {config={},apply=function(v,unit,preparations)v.mapPresent=false end}end'),
    'features.thumb.lua':encode(`return {start=function(entry,args,initial,options)
      starts=(starts or 0)+1;local total=0
      return function(budget)
        total=math.min(600,total+budget)
        if total<600 then return false,nil,initial,total end
        return true,options.ramByte(args[1]+70),initial,total,options.busContext
      end
    end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
    {ui:{preparations:true,unit:1},expect:{move:'---',pending:true,starts:1,mapPresent:false}},
    {ui:{preparations:true,unit:1},expect:{move:5,pending:false,starts:1}},
    {ui:{preparations:true,unit:2},expect:{move:'---',pending:true,starts:2}},
    {ui:{preparations:true,unit:1},expect:{move:5,pending:false,starts:2}},
    {ui:{preparations:false,unit:2},expect:{move:'---',pending:true,starts:3}},
    {ui:{preparations:false,unit:2},expect:{move:7,pending:false,starts:3}}
  ]});
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('native Map cache evicts unused completed LRU tasks and dependency references while retaining current requests',async()=>{
  const ew=Buffer.alloc(0x40000);ew[0x10]=1;ew[0x11]=2;ew[0x12]=3;
  const files={
    'main.lua':encode(`
      local query=pack.require('features.native-map-query')({maxCacheEntries=2});local previous
      function update()
        query.begin();local value
        if ui.all then
          for n=1,3 do query.request('key:'..n,{{entry=1,args={0x0200000F+n},key='value'}})end
        else value=query.request('key:'..ui.unit,{{entry=1,args={0x0200000F+ui.unit},key='value'}})end
        local ready=query.ready();query.step(512)
        local revision=query.revision();local changed=previous~=nil and previous~=revision;previous=revision
        return {value=value and value.value,starts=starts or 0,ready=ready,revisionChanged=changed}
      end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode('return function()return function(address)return mem.u8(address)end end'),
    'features.thumb.lua':encode(`return {start=function(entry,args,initial,options)
      starts=(starts or 0)+1;return function()return true,options.ramByte(args[1]),initial,1,options.busContext end
    end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew}],steps:[
    {ui:{all:true},expect:{starts:3,ready:false,revisionChanged:false}},
    {ui:{all:true},expect:{starts:3,ready:true,revisionChanged:false}},
    {ui:{unit:3},expect:{starts:3,ready:true,revisionChanged:true}},
    {ui:{unit:1},expect:{starts:4,ready:false,revisionChanged:true}},
    {ui:{unit:1},expect:{starts:4,ready:true,value:1,revisionChanged:false}},
    {ui:{unit:3},expect:{starts:4,ready:true,value:3,revisionChanged:false}},
    {ui:{unit:3},patches:[{address:0x02000011,bytes:[9]}],expect:{starts:4,ready:true,value:3,revisionChanged:false}}
  ]});
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('native movement cards opt in explicitly, retain same-unit stale totals and clear confirmed identity changes',async()=>{
  const ew=Buffer.alloc(0x40000);ew[0x10]=1;
  const files={
    'main.lua':encode(`
      local D={slots={[1]=0x02000100,[2]=0x02000200}}
      D.mapMoveForUnit=function(unit)assert(unit==0x02000100 or unit==0x02000200);return not ui.pending and ui.total or nil end
      local present=pack.require('presentation.native-movement')(D)
      function update()
        D.nativeMovementVerified=ui.verified~=false
        return present({unitPresent=not ui.absent,deployment=ui.unit or 1,
          characterPointer=0x08001000,classPointer=ui.class or 0x08002000,move=ui.absent and '---' or 6})
      end
    `),
    'game.profile.lua':encode('return {chapter=0x02000010}'),
    'presentation.native-movement.lua':encode(fs.readFileSync('runtime/shared/presentation.native-movement.lua','utf8'))
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew}],steps:[
    {ui:{verified:false,total:5},expect:{move:6,nativeMovePending:undefined}},
    {ui:{total:5},expect:{move:5,nativeMoveTotal:5,nativeMovePending:false,nativeMoveStale:false}},
    {ui:{pending:true},expect:{move:5,nativeMoveTotal:5,nativeMovePending:true,nativeMoveStale:true}},
    {ui:{unit:2,pending:true},expect:{move:'---',nativeMoveTotal:undefined,nativeMovePending:true,nativeMoveStale:false}},
    {ui:{unit:2,total:0},expect:{move:0,nativeMoveTotal:0,nativeMovePending:false,nativeMoveStale:false}},
    {ui:{absent:true},expect:{move:'---',nativeMoveTotal:undefined,nativeMovePending:false,nativeMoveStale:false}},
    {ui:{unit:2,pending:true},expect:{move:'---',nativeMoveStale:false}},
    {ui:{unit:2,total:7},expect:{move:7,nativeMoveTotal:7}},
    {ui:{unit:2,pending:true,class:0x08003000},expect:{move:'---',nativeMoveTotal:undefined,nativeMoveStale:false}},
    {ui:{unit:2,class:0x08003000,total:0},expect:{move:0}},
    {ui:{unit:2,class:0x08003000,pending:true},patches:[{address:0x02000010,bytes:[2]}],expect:{move:'---',nativeMoveTotal:undefined,nativeMoveStale:false}}
  ]});
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('interrupted native Map jobs release abandoned queue snapshots even when the queue never drains',async()=>{
  const files={
    'main.lua':encode(`
      local query=pack.require('features.native-map-query')({})
      for n=1,64 do
        query.begin();query.request('unit:'..n,{{entry=1,args={},key='move'}})
        assert(query.step(512)==512)
      end
      collectgarbage('collect');local retained=0;for _ in pairs(snapshotClosures)do retained=retained+1 end
      query.begin();query.request('unit:64',{{entry=1,args={},key='move'}});query.step(512)
      local complete=query.request('unit:64',{{entry=1,args={},key='move'}})
      collectgarbage('collect');local remaining=0;for _ in pairs(snapshotClosures)do remaining=remaining+1 end
      function update()return {retained=retained,remaining=remaining,move=complete.move,created=snapshotCount}end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(`snapshotClosures=setmetatable({},{__mode='k'});snapshotCount=0
      return function()
        snapshotCount=snapshotCount+1
        local bytes=string.rep(string.char(snapshotCount),65536)
        local read=function()return bytes:byte(1)end
        snapshotClosures[read]=true;return read
      end`),
    'features.thumb.lua':encode(`return {start=function(entry,args,initial,options)
      local total=0;return function(budget)
        total=math.min(600,total+budget);if total<600 then return false,nil,initial,total end
        return true,7,initial,total,options.busContext
      end
    end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files});
  assert.deepEqual(run.values[0],{retained:1,remaining:0,move:7,created:64});
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('native Map range revision distinguishes changed dependency addresses with identical ordered byte values',async()=>{
  const ew=Buffer.alloc(0x40000);ew[0x10]=1;
  const files={
    'main.lua':encode(`
      local query=pack.require('features.native-map-query')({});local previous
      function update()
        query.begin();local value=query.request('move',{{entry=1,args={},key='move'}});query.step(512)
        local revision=query.revision();local changed=previous~=nil and previous~=revision
        local sameBytes=previous~=nil and previous:sub(-2)==revision:sub(-2);previous=revision
        return {move=value and value.move,changed=changed,sameBytes=sameBytes}
      end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.thumb.lua':encode(`return {start=function(entry,args,initial,options)return function()
      local flag=options.ramByte(0x02000020)
      return true,options.ramByte(flag==0 and 0x02000010 or 0x02000030),initial,1,options.busContext
    end end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
    {ticks:2,expect:{move:1,changed:false,sameBytes:true}},
    {patches:[{address:0x02000020,bytes:[1]}],expect:{move:undefined,changed:true,sameBytes:true}},
    {expect:{move:0,changed:false,sameBytes:true}}
  ]});
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('retiring a supported large native Map working set keeps cache pruning within the shared tick budget',async()=>{
  const files={
    'main.lua':encode(`
      local query=pack.require('features.native-map-query')({})
      query.begin()
      for n=1,600 do query.request('weapon:'..n,{{entry=1,args={},key='usable'}})end
      query.step(1000)
      local instructions=0;debug.sethook(function()instructions=instructions+100 end,'',100)
      query.begin();query.request('weapon:1',{{entry=1,args={},key='usable'}});query.step(512)
      debug.sethook()
      function update()return {pruneInstructionEstimate=instructions}end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode('return function()return function()return 0 end end'),
    'features.thumb.lua':encode('return {start=function(entry,args,initial,options)return function()return true,1,initial,1,options.busContext end end}')
  };
  const run=await executeProject({manifest:{script:'main.lua'},files});
  // Cerulean exposes 137 slots with up to five native weapon keys per unit.
  // This checks queue/cache bookkeeping only; game CPU work is separately sliced.
  assert.ok(run.values[0].pruneInstructionEstimate<100000,JSON.stringify(run.values[0]));
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});
