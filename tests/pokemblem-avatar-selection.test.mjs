import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const encode=source=>Buffer.from(source).toString('base64');
const word=n=>Buffer.from(Uint32Array.of(n).buffer);
const pool=0x02010000, avatar=0x02020000, creature=0x02020100, enemy=0x02020200;

async function replay(steps){
  const ew=Buffer.alloc(0x40000),iw=Buffer.alloc(0x8000),base=0x02000000;
  const byte=(at,value)=>{ew[at-base]=value;};
  const put=(at,value)=>ew.writeUInt32LE(value,at-base);
  for(const [id,unit,x,y] of [[1,avatar,7,13],[2,creature,7,12],[129,enemy,6,9]]){
    put(unit,0x0800A000+id*4);put(unit+4,0x0800B000+id*4);
    byte(unit+11,id);byte(unit+18,20);byte(unit+19,20);byte(unit+16,x);byte(unit+17,y);
  }
  ew.writeUInt16LE(15,0x30);ew.writeUInt16LE(15,0x32);
  ew.writeUInt16LE(7,0x34);ew.writeUInt16LE(12,0x36);ew.writeUInt16LE(1,0x3A);
  put(0x0200003C,0x02000100);
  for(let y=0;y<15;y++)put(0x02000100+y*4,0x02001000+y*15);
  byte(0x02001000+13*15+7,1);byte(0x02001000+12*15+7,2);byte(0x02001000+9*15+6,129);
  const main=`
    local slots={[1]=${avatar},[2]=${creature},[129]=${enemy}}
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
    'game.profile.lua':encode(`return {processPool=${pool},playerProcess=0x08000200,forecastProcess=0x08000300,enemyProcess=0x08000400,activeUnit=0x02000060,phase=0x02000038,playerPcStart=0x08000210,playerPcEnd=0x08000220,enemyPcStart=0x08000410,enemyPcEnd=0x08000420,statScreenProcess=0x08001000,statScreenUnit=0x02000020,prepFlagAddress=0x02000050,prepFlagMask=1,prepUnitList=0x02012000,cursorX=0x02000034,cursorY=0x02000036,mapWidth=0x02000030,mapHeight=0x02000032,unitRows=0x0200003C,chapter=0x02000039,turn=0x0200003A}`),
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
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:base,bytes:ew},{address:0x03000000,bytes:iw}],steps});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);return run;
}

// These are unit-reader fixtures with injected persisted UI state. They do not
// exercise a physical Map tap or establish that the game cursor has moved.
test('Pokemblem tactical reader expires a legacy UI pick after native cursor movement',async()=>{
  await replay([
    {ui:{mapPickedId:0},expect:{deployment:2}},
    {ui:{mapPickedId:1,mapPickedContext:'0:1:7:12'},expect:{deployment:1,companionPicked:true}},
    {ui:{mapPickedId:0,mapPickedContext:'0:1:7:12'},patches:[{address:0x02000036,bytes:[13,0]}],expect:{deployment:1,partyFocus:undefined}},
    {patches:[{address:0x030017A7,bytes:[1]}],expect:{deployment:2,partyFocus:true}},
    {ui:{mapPickedId:129,mapPickedContext:'0:1:7:13'},expect:{deployment:129,companionPicked:true}},
    {patches:[{address:enemy+12,bytes:word(0x200)}],expect:{deployment:2,partyFocus:true}},
    {ui:{mapPickedId:0},patches:[{address:0x030017A7,bytes:[0]}],expect:{deployment:1,partyFocus:undefined}}
  ]);
});

for(const script of [0x0969B044,0x0969B004,0x0969B024])test(`Pokemblem avatar fallback recognizes only active FreeMU proc ${script.toString(16)} in the configured pool`,async()=>{
  const address=pool+63*108;
  await replay([
    {ui:{mapPickedId:0},patches:[{address:0x02000036,bytes:[13,0]},{address,bytes:word(script)},{address:address+4,bytes:word(script+8)}],expect:{deployment:2,partyFocus:true}},
    {patches:[{address:address+4,bytes:word(script+0x600)}],expect:{deployment:1,partyFocus:undefined}},
    {patches:[{address:address+4,bytes:word(script+7)}],expect:{deployment:1,partyFocus:undefined}},
    {patches:[{address:address+4,bytes:word(script+0x5ff)}],expect:{deployment:2,partyFocus:true}},
    {patches:[{address,bytes:word(0x0969B100)}],expect:{deployment:1,partyFocus:undefined}}
  ]);
});

test('Pokemblem native stat menu and locked forecast keep avatar ownership even during FreeMU',async()=>{
  await replay([
    {ui:{mapPickedId:129,mapPickedContext:'0:1:7:12'},patches:[{address:0x030017A7,bytes:[1]},{address:pool,bytes:word(0x08001000)},{address:pool+4,bytes:word(0x08001010)},{address:0x02000020,bytes:word(avatar)}],expect:{deployment:1,menuSelectionActive:true}},
    {patches:[{address:pool,bytes:word(0x08000200)},{address:pool+4,bytes:word(0x08000210)},{address:0x02000060,bytes:word(avatar)},{address:pool+108,bytes:word(0x08000300)}],expect:{deployment:1,unitLocked:true,forecastActive:true}},
    {patches:[{address:pool+108,bytes:word(0)}],expect:{deployment:1,unitLocked:true,forecastActive:false}}
  ]);
});
