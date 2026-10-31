import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const profiles = [
  ['andaron-saga', 0x08b5087a, 0x08b60dc2],
  ['justice-and-pride', 0x08b538aa, 0x08b6571a],
  ['the-dark-amulet', 0x08b721fe, 0x08b82a5e],
  ['the-four-kings', 0x08b5e8fa, 0x08b6ec16],
  ['shadow-of-dawn', 0x08b721fe, 0x08b82a5e],
];
const helperPath = 'runtime/shared/game.official-bios.lua';
function helperSource() { return fs.existsSync(helperPath) ? fs.readFileSync(helperPath, 'utf8') : ''; }
function biosImage() {
  const match = helperSource().match(/local hleHex = \[\[([\s\S]*?)\]\]/);
  const image = Buffer.alloc(0x4000);
  if (match) Buffer.from(match[1].replace(/\s/g, ''), 'hex').copy(image);
  return image;
}
function fixture(profile, {context, badOpcode=false, badBios=false, badCaller=false, mutateContext=false}={}) {
  const [id, pc, caller] = profile, entry=pc-0x12, base=0x08000000;
  const rom=Buffer.alloc(0xc00000), ewram=Buffer.alloc(0x40000), iwram=Buffer.alloc(0x8000);
  const put=(at,ops)=>ops.forEach((value,n)=>rom.writeUInt16LE(value,at-base+n*2));
  put(entry,[0xb5f0,0x1c04,0x1c0d,0x201e,0x5c20,0x4910,0x2224,0x4342,0x1889,
    0x79c9,0x2906,0xd116,0x480b,0x4686,0x1c20,0x490c,0xf800,0x2800,0xd00f,
    0x215a,0x5a60,0x3001,0x5260,0x2160,0x5a60,0x3005,0x5260,0x2162,0x5a60,
    0x3005,0x5260,0x2166,0x5a60,0x3005,0x5260,0xbdf0]);
  rom.writeUInt32LE(0x08001001,entry-base+0x48);
  rom.writeUInt32LE(0xc1,entry-base+0x4c);
  rom.writeUInt32LE(0x1c04b5f0,entry-base+0x50);
  put(0x08001000,[0x2001,0x4770]); // A real positive skill branch must remain reachable with context byte6.
  put(caller-0x30,[0xb570,0x1c04,0x1c0d,0x1c16,0x6832,0x2a00,0xd007,0x2001,
    0x4302,0x1c20,0x1c29,0xf000,0xf805,0x3604,0xe7f4,0xbc70,0xbc01,0x4700]);
  put(caller-12,[0xb570,0x1c04,0x1c0d,0x1c16,0xf000,0xf803,0xbc70,0xbc01,0x4700,0x4730]);
  if (badOpcode) rom.writeUInt16LE(0x2905,pc-base+2);
  if (badCaller) rom.writeUInt16LE(0x46c0,caller-base+4);
  const bios=biosImage();if(badBios)bios[0x1000]=6;
  const unit=0x0203a4ec;ewram[unit-0x02000000+0x1e]=1;
  const main=`
    input=nil;gfx=nil;mem.busContext=nil
    local reads=0;local rawRead=mem.read
    mem.read=function(a,n)if a==0 then reads=reads+1 end;return rawRead(a,n)end
    local execution=pack.require('game.execution')
    local hooks=execution.beforeEntry
    ${mutateContext ? `hooks[${entry}]=function(r,read,write,context)
      assert(context and context.biosPrefetch==6,'Missing fourth captured context')
      context.biosPrefetch=4
    end` : ''}
    local run=pack.require('features.thumb').start(${caller-12},{${unit},${unit+128},${entry|1}},nil,
      {maxSteps=10000,beforeEntry=hooks,${context===undefined?'':`busContext={version=1,platform='gba',biosPrefetch=${context}},`}})
    local result
    function update()
      if result then return result end
      local done,value,shadow=run(128)
      if not done then return {done=false} end
      result={done=true,value=value,reads=reads,stats={}}
      for _,offset in ipairs({0x5a,0x60,0x62,0x66})do
        result.stats[#result.stats+1]=(shadow[${unit}+offset] or 0)|((shadow[${unit}+offset+1] or 0)<<8)
      end
      return result
    end`;
  const sources={'main.lua':main,'features.thumb.lua':fs.readFileSync('runtime/shared/features.thumb.lua','utf8'),
    'game.execution.lua':fs.readFileSync('runtime/'+id+'/game.execution.lua','utf8')};
  if (helperSource()) sources['game.official-bios.lua']=helperSource();
  return {project:{manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(sources).map(([name,src])=>[name,Buffer.from(src).toString('base64')]))},
    options:{rom,ranges:[{address:0,bytes:bios},{address:0x02000000,bytes:ewram},{address:0x03000000,bytes:iwram}],steps:[{ticks:16}]}};
}
async function run(profile,options) {const f=fixture(profile,options);return (await executeProject(f.project,f.options)).values.at(-1);}

for(const profile of profiles) test(profile[0]+': official API and nil context retain the native false-guard output',async()=>{
  const value=await run(profile);
  assert.equal(value.done,true);assert.deepEqual(value.stats,[0,0,0,0]);assert.equal(value.reads,1);
});
test('captured byte6 keeps the genuine positive skill branch and never consults raw firmware',async()=>{
  for(const p of profiles){const value=await run(p,{context:6,badBios:true});assert.deepEqual(value.stats,[1,5,5,5]);assert.equal(value.reads,0);}
});
test('captured non6 context uses the original branch without raw-firmware validation',async()=>{
  for(const p of profiles){const value=await run(p,{context:4,badBios:true});assert.deepEqual(value.stats,[0,0,0,0]);assert.equal(value.reads,0);}
});
test('captured zero latch is a present context and retains the original path',async()=>{
  for(const p of profiles){const value=await run(p,{context:0,badBios:true});assert.deepEqual(value.stats,[0,0,0,0]);assert.equal(value.reads,0);}
});
test('fourth hook context is detached from the private CPU and does not alter the byte6 path',async()=>{
  const value=await run(profiles[0],{context:6,badBios:true,mutateContext:true});
  assert.deepEqual(value.stats,[1,5,5,5]);assert.equal(value.reads,0);
});
test('changed ROM comparison fails closed rather than bypassing a different mechanic',async()=>{
  await assert.rejects(run(profiles[0],{badOpcode:true}),/Unverified.*guard/);
});
test('different raw BIOS image fails closed',async()=>{
  await assert.rejects(run(profiles[0],{badBios:true}),/Unverified.*BIOS/);
});
test('unverified caller fails closed rather than assuming caller-saved flags are dead',async()=>{
  await assert.rejects(run(profiles[0],{badCaller:true}),/Unverified.*caller/);
});
test('pinned official full HLE image excludes byte6 at every possible aligned prefetch low byte',()=>{
  const image=biosImage();assert.equal(crypto.createHash('sha256').update(image).digest('hex'),'9f307cb8ba43f3d258baafaacbf7a3c32f690541ebc31f4bf6459f443bfa27d2');
  for(let at=0;at<image.length;at+=2)assert.notEqual(image[at],6,'Possible Thumb/ARM prefetch low byte at '+at.toString(16));
});
