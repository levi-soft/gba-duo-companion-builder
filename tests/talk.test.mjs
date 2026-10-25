import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

test('Talk respects direction, temporary/permanent flags, target presence and stale selection',async()=>{
 const engine=await luaFactory().createEngine();
 try{
  engine.global.set('source',fs.readFileSync('runtime/shared/game.talk.lua','utf8'));
  assert.equal(await engine.doString(`
   local ram={};mem={u8=function(a)return ram[a]or 0 end,u32=function(a)return ram[a]or 0 end}
   local a,b=0x02001000,0x02001100;ram[a]=0x08000100;ram[b]=0x08000200
   local D={chars={[ram[a]]={id=1,name='Void'},[ram[b]]={id=2,name='Tim'}},slots={[1]=a,[2]=b},
    talkConfig={chapter=0x02000000,temporaryFlags=0x03005270,permanentFlags=0x03005250},
    talkEvents={{{flag=1,from=1,to=2},{flag=101,from=1,to=2}}}}
   local apply=assert(load(source))()(D);local v={};apply(v,a)
   assert(v.talkAvailable and v.talkTargetName=='Tim' and v.talkPrompt=='Talk to Tim.')
   apply(v,b);assert(not v.talkAvailable,'direction must not be invented')
   ram[0x03005270]=1;apply(v,a);assert(v.talkAvailable,'second pending permanent event must remain')
   ram[0x03005250]=1;apply(v,a);assert(not v.talkAvailable)
   ram[0x03005270]=0;ram[b+12]=4;apply(v,a);assert(not v.talkAvailable,'dead target')
   ram[b+12]=8;apply(v,a);assert(not v.talkAvailable,'benched target')
   ram[b+12]=0x10000;apply(v,a);assert(not v.talkAvailable,'hidden target')
   ram[b+12]=0;ram[b]=0;apply(v,a);assert(not v.talkAvailable,'empty slot')
   ram[b]=0x08000200;ram[0x02000000]=0x7f;apply(v,a);assert(not v.talkAvailable,'unsupported dynamic chapter')
   ram[0x02000000]=0;apply(v,a);assert(v.talkAvailable);apply(v,nil)
   assert(not v.talkAvailable and v.talkTargetId==0 and v.talkTargetName=='---' and v.talkPrompt=='No available conversation.')
   return true
  `),true);
 }finally{engine.global.close();}
});
