import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const encode=text=>Buffer.from(text).toString('base64');
const source=(id,name)=>encode(fs.readFileSync(`runtime/${id}/${name}.lua`));
const patch=(address,value,width=4)=>{const b=Buffer.alloc(width);b.writeUIntLE(value,0,width);return {address,bytes:[...b]};};
for(const id of ['fe6-remastered','fe8-vietnamese']){
  const profile=fs.readFileSync(`runtime/${id}/game.profile.lua`,'utf8');
  const address=key=>Number(profile.match(new RegExp(key+' = (0x[0-9A-Fa-f]+)'))[1]);
  test(id+': minimap rejects partial/out-of-range row tables before reading cells',async()=>{
    const ram=Buffer.alloc(0x40000),base=0x02000000;
    const write=(a,v,n=4)=>ram.writeUIntLE(v,a-base,n);
    write(address('mapWidth'),1,2);write(address('mapHeight'),1,2);
    write(address('terrainRows'),0x02001000);write(address('unitRows'),0x02001004);
    write(0x02001000,0x02001100);write(0x02001004,0x02001101);
    const project={manifest:{script:'main.lua'},files:{
      'main.lua':encode(`local D={chars={},classes={},slots={},mapMeta={chars={},classes={}},mapWeapons={},fe8Chapters={}}
local map=pack.require('game.map')(D)
function update()local v={};map.apply(v);return {mapPresent=v.mapPresent,cells=#v.mapCells}end`),
      'game.map.lua':source(id,'game.map'),'game.profile.lua':encode(profile),
      'presentation.chapter.lua':source('shared','presentation.chapter')
    }};
    const result=await executeProject(project,{ranges:[{address:base,bytes:ram}],steps:[
      {expect:{mapPresent:true,cells:1}},
      {patches:[patch(address('terrainRows'),0x0203FFFF)],expect:{mapPresent:false,cells:0}},
      {patches:[patch(address('terrainRows'),0x02001000),patch(0x02001000,0x02040000)],expect:{mapPresent:false}},
      {patches:[patch(0x02001000,0x02001100),patch(0x02001004,0x03000000)],expect:{mapPresent:false}},
      {patches:[patch(0x02001004,0x02001101)],expect:{mapPresent:true,cells:1}}
    ]});
    assert.equal(result.readOnly,true);
  });
  test(id+': cursor unit selection rejects empty, stale, dead and fog-hidden units',async()=>{
    const ram=Buffer.alloc(0x40000),base=0x02000000,unit=0x0202BE4C,enemy=0x0202DDCC;
    const write=(a,v,n=4)=>ram.writeUIntLE(v,a-base,n);
    write(address('mapWidth'),1,2);write(address('mapHeight'),1,2);write(address('unitRows'),0x02001000);write(0x02001000,0x02001100);write(0x02001100,1,1);
    for(const [u,n]of [[unit,1],[enemy,128]]){write(u,0x08001000);write(u+4,0x08002000);write(u+11,n,1);write(u+19,20,1);}
    const project={manifest:{script:'main.lua'},files:{
      'main.lua':encode(`local D={slots={[1]=${unit},[128]=${enemy}},chars={[0x08001000]={}},classes={[0x08002000]={}}}
local map={meta={chars=D.chars,classes=D.classes},apply=function()end}
local read=pack.require('game.units')(D,map,{truth=function(v)return v==true end},{apply=function()end})
function update()return read()end`),
      'game.units.lua':source(id,'game.units'),'game.profile.lua':encode(profile),
      'game.preparations.lua':encode(fs.readFileSync('runtime/shared/game.preparations.lua')),
      'presentation.defaults.lua':encode('return function()return function()return {unitPresent=false}end end'),
      'game.bindings.lua':encode('return function()return function(v)return v end end'),
      'game.items.lua':encode('return function()return function()end end'),
      'game.battle.lua':encode('return function()return function()end end')
    }};
    const result=await executeProject(project,{ranges:[{address:base,bytes:ram},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
      {expect:{unitPresent:true}},
      {patches:[patch(unit+19,0,1)],expect:{unitPresent:false}},
      {patches:[patch(unit+19,20,1),patch(unit+12,4)],expect:{unitPresent:false}},
      {patches:[patch(unit+12,8)],expect:{unitPresent:false}},
      {patches:[patch(unit+12,0),patch(unit+11,2,1)],expect:{unitPresent:false}},
      {patches:[patch(unit+11,1,1),patch(0x02001100,128,1),patch(enemy+12,0x200)],expect:{unitPresent:false}},
      {patches:[patch(enemy+12,0)],expect:{unitPresent:true}}
    ]});
    assert.equal(result.readOnly,true);
  });
  test(id+': fog-hidden enemy position has no minimap marker',async()=>{
    const ram=Buffer.alloc(0x40000),base=0x02000000,enemy=0x0202DDCC;
    const write=(a,v,n=4)=>ram.writeUIntLE(v,a-base,n);
    write(address('mapWidth'),1,2);write(address('mapHeight'),1,2);
    write(address('terrainRows'),0x02001000);write(address('unitRows'),0x02001004);
    write(0x02001000,0x02001100);write(0x02001004,0x02001101);
    write(0x02001101,128,1);write(enemy+12,0x200);
    const project={manifest:{script:'main.lua'},files:{
      'main.lua':encode(`local D={chars={},classes={},slots={[128]=${enemy}},mapMeta={chars={},classes={}},mapWeapons={},fe8Chapters={}}
local map=pack.require('game.map')(D)
function update()local v={};map.apply(v);return {marker=v.mapCells[1].marker,color=v.mapCells[1].color}end`),
      'game.map.lua':source(id,'game.map'),'game.profile.lua':encode(profile),
      'presentation.chapter.lua':source('shared','presentation.chapter')
    }};
    const result=await executeProject(project,{ranges:[{address:base,bytes:ram}],steps:[
      {expect:{marker:false,color:'transparent'}},
      {patches:[patch(enemy+12,0)],expect:{marker:true,color:'#ef4456'}}
    ]});
    assert.equal(result.readOnly,true);
  });
}
