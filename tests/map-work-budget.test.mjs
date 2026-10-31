import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=s=>Buffer.from(s).toString('base64');
test('FE8 map reads each terrain/occupancy cell once and shares it with connectivity and ranges',async()=>{
 const ram=Buffer.alloc(0x40000),base=0x02000000,w=25,h=15;
 const profile=fs.readFileSync('runtime/fe8-vietnamese/game.profile.lua','utf8');
 const address=k=>Number(profile.match(new RegExp(k+' = (0x[0-9a-fA-F]+)'))[1]);
 const write=(a,v,n=4)=>ram.writeUIntLE(v,a-base,n);
 write(address('mapWidth'),w,2);write(address('mapHeight'),h,2);write(address('terrainRows'),base+0x1000);write(address('unitRows'),base+0x1100);
 for(let y=0;y<h;y++){write(base+0x1000+y*4,base+0x2000+y*w);write(base+0x1100+y*4,base+0x3000+y*w);}
 const project={manifest:{script:'main.lua'},files:{
  'game.map.lua':encode(fs.readFileSync('runtime/fe8-vietnamese/game.map.lua')),'game.fe8-map.lua':encode(fs.readFileSync('runtime/shared/game.fe8-map.lua')),
  'game.profile.lua':encode(profile),'presentation.chapter.lua':encode(fs.readFileSync('runtime/shared/presentation.chapter.lua')),
  'presentation.map-picks.lua':encode(fs.readFileSync('runtime/shared/presentation.map-picks.lua')),
  'main.lua':encode(`local reads=0;local read=mem.u8;mem.u8=function(a)if a>=0x02002000 and a<0x02003177 then reads=reads+1 end;return read(a)end
local map=pack.require('game.map')({chars={},classes={},slots={},mapMeta={chars={},classes={}},mapWeapons={},fe8Chapters={}})
function update()reads=0;local v={};map.apply(v);return {present=v.mapPresent,cells=#v.mapCells,reads=reads}end`)
 }};
 const r=await executeProject(project,{ranges:[{address:base,bytes:ram}],steps:[{ticks:3,expect:{present:true,cells:w*h,reads:2*w*h}}]});assert(r.readOnly);
});
