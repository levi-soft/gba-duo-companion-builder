import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=s=>Buffer.from(s).toString('base64');

test('Four Kings half-HP Might marker follows native item help and equipped Attack formatting',async()=>{
 // Native R/Items and R-help controls show --/--, Hit100, Crit0, Weight1.
 // Keep the raw 0xff marker in ROM data for native combat execution.
 for(const first of [1,2]){
  const ram=Buffer.alloc(0x40000),u=0x1000;
  ram.writeUInt32LE(0x08000100,u);ram.writeUInt32LE(0x08000200,u+4);
  ram[u+11]=1;ram[u+20]=10;ram[u+21]=22;ram[u+22]=20;ram[u+25]=5;ram[u+40]=121;
  ram.writeUInt16LE(first|(50<<8),u+30);
  const project={manifest:{script:'main.lua'},files:{
   'main.lua':encode(`local special={name='Half HP',t=0,a=1,r=0,n=1,m=255,h=100,w=1,c=0,g=17}
local ordinary={name='Sword',t=0,a=1,r=0,n=1,m=5,h=90,w=5,c=0,g=17}
local D={equipmentItems={[1]=special,[2]=ordinary},equipmentChars={[0x08000100]={a=0,con=0}},equipmentClasses={[0x08000200]={a=0,con=8,avoid={}}}}
local map={meta={classes={[0x08000200]={mapSprites={'blue','green','red'}}}}}
local read=pack.require('game.items')(D,map)
function update()
 local v={characterPointer=0x08000100,classPointer=0x08000200,deployment=1,con=8,rescueId=0,item1Might=255,item2Might=5,item3Might=0,item4Might=255,item5Might='---'}
 read(v,0x02001000);v.rawSpecialMight=special.m;return v
end`),
   'game.items.lua':encode(fs.readFileSync('runtime/the-four-kings/game.items.lua','utf8')),
   'game.fe8-equipment.lua':encode(fs.readFileSync('runtime/shared/game.fe8-equipment.lua','utf8')),
  }};
  const result=await executeProject(project,{ranges:[{address:0x02000000,bytes:ram}],steps:[{ticks:1}]}),v=result.values[0];
  assert.equal(v.equipmentAtk,first===1?'---':15);
  assert.equal(v.weaponMight,first===1?'---':5);
  assert.equal(v.weaponHit,first===1?100:90);assert.equal(v.weaponCrit,0);assert.equal(v.weaponWeight,first===1?1:5);
  assert.deepEqual([v.item1Might,v.item2Might,v.item3Might,v.item4Might,v.item5Might],['---',5,0,'---','---']);
  assert.equal(v.rawSpecialMight,255);assert.equal(result.readOnly,true);
 }
});
