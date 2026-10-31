import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const encode=text=>Buffer.from(text).toString('base64');
const query=fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8');
const cpu=fs.readFileSync('runtime/shared/features.thumb.lua','utf8');
const snapshot=fs.readFileSync('runtime/shared/game.snapshot.lua','utf8');
const rom=Buffer.alloc(8);[0xC803,0x4608,0x4770].forEach((op,n)=>rom.writeUInt16LE(op,n*2));
// Actual Thumb evaluator: LDMIA r0!,{r0,r1}; MOV r0,r1; BX lr.
function fixture(main){
  const ew=Buffer.alloc(0x40000);ew.writeUInt32LE(0x02002000,0x1000);ew.writeUInt32LE(13,0x1004);ew.writeUInt32LE(7,0x2000);ew.writeUInt32LE(5,0x2004);
  return {project:{manifest:{script:'main.lua'},files:{
    'main.lua':encode(main),'features.native-map-query.lua':encode(query),'features.thumb.lua':encode(cpu),
    'game.snapshot.lua':encode(`local actual=(function()${snapshot}\nend)();captureCount=0
      return function()
        captureCount=captureCount+1;local read=actual()
        return function(address)
          if injectedRead and address==0x02001004 then injectedRead=false;cleanupArmed=true;error('Injected ramByte interruption')end
          return read(address)
        end
      end`)
  }},options:{rom,ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}]}};
}
const phases="{{entry=0x08000000,args={0x02001000},key='move'}}";

test('a real CPU opcode interrupted after its first register load is discarded before fresh retry',async()=>{
  const f=fixture(`
    local q=pack.require('features.native-map-query')({});local tick=0;local phases=${phases}
    function update()
      tick=tick+1;if tick==1 then injectedRead=true end
      q.begin();q.request('unit',phases);local ok,message=pcall(q.step,512)
      local value=ok and q.request('unit',phases)
      return {ok=ok,value=value and value.move,captures=captureCount}
    end
  `);
  const run=await executeProject(f.project,{...f.options,steps:[
    {expect:{ok:false,captures:1}},
    {expect:{ok:true,value:13,captures:2}},
    {expect:{ok:true,value:13,captures:2}}
  ]});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('an instruction hook interrupting dependency registration clears completed and queued bookkeeping',async()=>{
  const line=query.split('\n').findIndex(text=>text.includes('dependencies[address]=(dependencies[address] or 0)+1'))+1;
  assert.ok(line>0);
  const f=fixture(`
    local q=pack.require('features.native-map-query')({});local phases=${phases}
    q.begin();q.request('unit',phases)
    local hits=0;debug.sethook(function(_,line)
      if debug.getinfo(2,'S').source=='@features.native-map-query.lua' and line==${line} then
        hits=hits+1;if hits==2 then debug.sethook();error('Injected budget interruption in dependency registration')end
      end
    end,'l')
    local ok=pcall(q.step,512);debug.sethook();assert(not ok)
    local stale=q.request('unit',phases);local retryOk=pcall(q.step,512)
    local result=q.request('unit',phases)
    function update()return {stale=stale~=nil,retryOk=retryOk,value=result and result.move,captures=captureCount}end
  `);
  const run=await executeProject(f.project,f.options);
  assert.deepEqual(run.values[0],{stale:false,retryOk:true,value:13,captures:2});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('a deferred initializer error discards its partial private shadow and reruns initialization',async()=>{
  const f=fixture(`
    local q=pack.require('features.native-map-query')({deferCapture=true});local count=0
    local function request()
      return q.request('unit',${phases},{initialize=function(shadow)
        count=count+1;shadow[0x02001004]=count==1 and 5 or 13
        if count==1 then error('Injected initializer interruption')end
      end})
    end
    function update()
      q.begin();request();local ok=pcall(q.step,512);local value=ok and request()
      return {ok=ok,value=value and value.move,initialized=count,captures=captureCount}
    end
  `);
  const run=await executeProject(f.project,{...f.options,steps:[
    {expect:{ok:false,initialized:1,captures:1}},
    {expect:{ok:true,value:13,initialized:2,captures:2}}
  ]});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('a failed active job evicts previous completed results and advances the aggregate revision generation',async()=>{
  const f=fixture(`
    local q=pack.require('features.native-map-query')({});local phases=${phases}
    q.begin();q.request('cached',phases);q.step(512);local previous=q.revision()
    q.begin();assert(q.request('cached',phases));q.request('active',phases);injectedRead=true
    local ok=pcall(q.step,512);assert(not ok)
    q.begin();local stale=q.request('cached',phases);q.request('active',phases);q.step(512)
    local result=q.request('cached',phases)
    function update()return {stale=stale~=nil,value=result.move,revisionChanged=q.revision()~=previous,captures=captureCount}end
  `);
  const run=await executeProject(f.project,f.options);
  assert.deepEqual(run.values[0],{stale:false,value:13,revisionChanged:true,captures:3});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('cleanup interrupted by a second hook is retried before the next query can publish or resume',async()=>{
  const line=query.split('\n').findIndex(text=>text.includes('cache,queue,dependencies,addresses,frameRam,frameBus=nil'))+1;
  assert.ok(line>0,'Recovery must drop all private-state references before allocating replacements');
  const f=fixture(`
    local q=pack.require('features.native-map-query')({});local phases=${phases}
    q.begin();q.request('unit',phases);injectedRead=true
    debug.sethook(function(_,line)
      if cleanupArmed and debug.getinfo(2,'S').source=='@features.native-map-query.lua' and line==${line} then
        cleanupArmed=false;debug.sethook();error('Injected cleanup interruption')
      end
    end,'l')
    local ok,message=pcall(q.step,512);debug.sethook()
    assert(not ok and tostring(message):find('Injected cleanup interruption',1,true))
    q.begin();local stale=q.request('unit',phases);q.step(512);local value=q.request('unit',phases)
    function update()return {stale=stale~=nil,value=value.move,captures=captureCount}end
  `);
  const run=await executeProject(f.project,f.options);
  assert.deepEqual(run.values[0],{stale:false,value:13,captures:2});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('compact-cache mem.read errors require a fresh snapshot rather than returning a previous cached value',async()=>{
  const f=fixture(`
    local q=pack.require('features.native-map-query')({compactReads=true,trackRevision=false});local phases=${phases}
    q.begin();q.request('unit',phases);q.step(512)
    local original=mem.read;local armed=true
    mem.read=function(address,length)
      if armed then armed=false;error('Injected cached span read failure')end
      return original(address,length)
    end
    q.begin();local ok=pcall(q.request,'unit',phases);assert(not ok)
    local stale=q.request('unit',phases);q.step(512);local result=q.request('unit',phases)
    function update()return {stale=stale~=nil,value=result.move,captures=captureCount}end
  `);
  const run=await executeProject(f.project,f.options);
  assert.deepEqual(run.values[0],{stale:false,value:13,captures:2});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});
