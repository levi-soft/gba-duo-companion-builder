import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendEvidence,parseEvidence,replayBytes} from '../scripts/ram-evidence.mjs';
import {replayEvidence,replayOutputHash,romIdentity} from '../scripts/replay-evidence.mjs';
const rom=Buffer.alloc(192);rom.write('TEST',0xac);
const identity=romIdentity(rom);
const packet={...identity,sessionId:'synthetic',packId:'test',frame:8,ranges:[{address:0x02000000,length:4,base64:'AH+A/w=='}]};
const project={manifest:{script:'main.lua',match:{gameCode:['TEST'],crc32:[identity.crc32]}},files:{'main.lua':Buffer.from('function update()return {hp=mem.u8(0x02000001),last=mem.u8(0x02000003)}end').toString('base64')}};

test('replay digests ignore Lua map insertion order while preserving array order and field values',()=>{
  const a=[{last:255,hp:127,nested:{z:2,a:1},rolls:[1,2]}];
  const b=[{rolls:[1,2],nested:{a:1,z:2},hp:127,last:255}];
  const expected=createHash('sha256').update('[{"hp":127,"last":255,"nested":{"a":1,"z":2},"rolls":[1,2]}]').digest('hex');
  assert.equal(replayOutputHash(a),expected);assert.equal(replayOutputHash(b),expected);
  assert.notEqual(replayOutputHash([{...b[0],rolls:[2,1]}]),expected);
  assert.notEqual(replayOutputHash([{...b[0],hp:126}]),expected);
});
test('Studio evidence feeds the real offline Lua host and verifies expected semantic fields',async()=>{
  const doc=appendEvidence(null,packet,'Map');
  const result=await replayEvidence(project,doc,rom,{Map:{steps:[{ticks:3,ui:{},expect:{hp:127,last:255}}]}});
  assert.equal(result.samples[0].expectedFields,2);assert.equal(result.samples[0].ticks,3);assert.equal(result.samples[0].readOnly,true);
  const repeat=await replayEvidence(project,doc,rom);assert.equal(repeat.samples[0].outputSha256,result.samples[0].outputSha256);
  await assert.rejects(replayEvidence(project,doc,rom,{Map:{steps:[{ticks:1,expect:{hp:0}}]}}),/expected hp/);
});
test('wrong ROM/project and unsafe replay steps fail before executing Lua',async()=>{
  const doc=appendEvidence(null,packet,'Map'),wrong=Buffer.from(rom);wrong[0]=1;
  await assert.rejects(replayEvidence(project,doc,wrong),/CRC32/);
  await assert.rejects(replayEvidence({...project,manifest:{...project.manifest,match:{gameCode:['TEST']}}},doc,rom),/exact evidence CRC32/);
  for(const steps of [[{ticks:0}],[{ticks:1001}],[{ticks:1,patches:[]}],[]])await assert.rejects(replayEvidence(project,doc,rom,{Map:{steps}}));
});
test('seeded evidence properties preserve arbitrary byte strings and identity filters',()=>{
  let state=0xfef01234;const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
  for(let run=0;run<300;run++){
    const bytes=Buffer.alloc(1+next()%2048);for(let n=0;n<bytes.length;n++)bytes[n]=next()>>>24;
    const p={...packet,ranges:[{address:0x02000000+next()%(0x40000-bytes.length),length:bytes.length,base64:bytes.toString('base64')}]};
    const doc=parseEvidence(JSON.stringify(appendEvidence(null,p,'Generated')));
    assert.deepEqual(Buffer.from(replayBytes(doc.samples[0],p.ranges[0].address,bytes.length)),bytes);
    const crc=(Number.parseInt(p.crc32,16)^1)>>>0;
    assert.throws(()=>appendEvidence(doc,{...p,crc32:crc.toString(16).padStart(8,'0')},'Wrong ROM'),/changed/);
    assert.throws(()=>appendEvidence(null,{...p,ranges:[{...p.ranges[0],length:bytes.length+1}]},'Truncated'));
  }
});
