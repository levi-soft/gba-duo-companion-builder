import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=s=>Buffer.from(s).toString('base64');
// The exact-ROM cap/caller contract. This mock contains no game ROM or RAM.
const opcodes=[
  [0x0802bf24,4,0x1c02b530],[0x0802bf28,4,0x2112468c],
  [0x0802bf2c,4,0x46605651],[0x0802bf30,4,0x78003073],
  [0x0802bf68,4,0x31734661],[0x0802bf6c,2,0x7008],
  [0x0802bf72,2,0x4664],[0x0802bf74,2,0x3474],[0x0802bf8e,2,0x7020],
  [0x0802bf94,4,0x34754664],[0x0802bfac,2,0x7020],
  [0x0802bfb2,2,0x4664],[0x0802bfb4,2,0x3476],[0x0802bfca,2,0x7020],
  [0x0802bfd0,4,0x34774664],[0x0802bfe8,2,0x7020],
  [0x0802bfee,2,0x4663],[0x0802bff0,2,0x3378],[0x0802c006,2,0x7018],
  [0x0802c00c,4,0x33794663],[0x0802c020,2,0x7018],
  [0x0802c022,2,0xbc30],[0x0802c024,2,0xbc01],[0x0802c026,2,0x4700],
  [0x0981e670,4,0x4b400020],[0x0981e674,4,0xf8c4f000],
  [0x0981e678,4,0xbc01bcf7],[0x0981e67c,2,0x4700],
  [0x0981e774,4,0x0802bf25],[0x0981e800,2,0x4718],
];
async function hook({pointer=15,context,badOpcode=false,badCaller=false}={}){
 const source=`
  local execution=pack.require('game.execution')
  local r={[0]=${pointer}+0x73,[2]=0x0203a4ec,[4]=0x0203a4ec,[12]=${pointer},[13]=0x03007e00,[14]=${badCaller?'0x0981e67b':'0x0981e679'}}
  local values={${opcodes.map(([a,w,v])=>`['${a}:${w}']=${v}`).join(',')}}
  local reads,writes=0,{}
  local function read(a,w) reads=reads+1;${badOpcode?'if a==0x0802bf6c then return 0 end':''};return values[tostring(a)..':'..tostring(w)] or 0 end
  local function write(a,v,w)writes[#writes+1]={a,v,w}end
  local fn=execution.beforeEntry[0x0802bf32] or function()end
  function update()
    local redirect=fn(r,read,write,${context===undefined?'nil':`{version=1,platform='gba',biosPrefetch=${context}}`})
    return{redirect=redirect,reads=reads,writes=#writes,pointer=r[12]}
  end`;
 const result=await executeProject({manifest:{script:'main.lua'},files:{'main.lua':encode(source),'game.execution.lua':encode(fs.readFileSync('runtime/bells-of-byelen/game.execution.lua','utf8'))}});
 return result.values[0];
}
test('Bells scalar cap call returns through its own epilogue without state writes',async()=>{
 for(const pointer of [0,15,16,0x3f86]){const result=await hook({pointer});assert.equal(result.redirect,0x0802c022);assert.equal(result.writes,0);assert.equal(result.pointer,pointer);}
});
test('Bells valid RAM gain buffers keep the genuine native cap function',async()=>{
 const result=await hook({pointer:0x0203a56c});assert.equal(result.redirect,undefined);assert.equal(result.reads,0);assert.equal(result.writes,0);
});
test('Bells context0 and arbitrary explicit latches retain the original path',async()=>{
 for(const context of [0,0xe3a02004,0x06060606,0xffffffff]){const result=await hook({context});assert.equal(result.redirect,undefined);assert.equal(result.reads,0);}
});
test('Bells crossing the BIOS boundary is not hidden as a scalar no-op',async()=>{
 const result=await hook({pointer:0x3f87});assert.equal(result.redirect,undefined);assert.equal(result.reads,0);
});
test('Bells changed opcode and wrong caller fail closed',async()=>{
 await assert.rejects(hook({badOpcode:true}),/Unverified Bells scalar cap call/);
 await assert.rejects(hook({badCaller:true}),/Unverified Bells scalar cap call/);
});
test('Bells accessory-padding hook remains active with the cap hook installed',async()=>{
 const source=`local hooks=pack.require('game.execution').beforeEntry;function update()local out={};hooks[0x0981d924]({[13]=0x03007e00},nil,function(a,v,w)out={address=a,value=v,width=w}end);return out end`;
 const result=await executeProject({manifest:{script:'main.lua'},files:{'main.lua':encode(source),'game.execution.lua':encode(fs.readFileSync('runtime/bells-of-byelen/game.execution.lua','utf8'))}});
 assert.deepEqual(result.values[0],{address:0x03007e06,value:0,width:2});
});
test('protected-read diagnostic includes both the byte address and executing PC',async()=>{
 const rom=Buffer.from([0x00,0x78]);const source=`local job=pack.require('features.thumb').start(0x08000000,{0x82});function update()return job(1)end`;
 await assert.rejects(executeProject({manifest:{script:'main.lua'},files:{'main.lua':encode(source),'features.thumb.lua':encode(fs.readFileSync('runtime/shared/features.thumb.lua','utf8'))}},{rom}),/GBA bus context: 00000082 at 08000000/);
});
