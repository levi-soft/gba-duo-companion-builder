import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=text=>Buffer.from(text).toString('base64');
const query=fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8');
const snapshot=fs.readFileSync('runtime/shared/game.snapshot.lua','utf8');
async function run(main,{steps}={}){
  const ew=Buffer.alloc(0x40000);for(let n=0;n<32;n++)ew[0x1000+n]=n+10;
  const sources={
    'main.lua':main,
    'features.native-map-query.lua':query,
    'game.snapshot.lua':`local actual=(function()${snapshot}\nend)();captures=0;weakSnapshots=setmetatable({},{__mode='v'})
      return function()local ram,context=actual();captures=captures+1;weakSnapshots[captures]=ram;return ram,context end`,
    'features.thumb.lua':`return{start=function(entry,args,shadow,options)
      starts=(starts or 0)+1
      if armed and stage=='start' then armed=false;cleanupArmed=true;error(reason)end
      local id=args[1];local value=options.ramByte(0x02001000+id)
      assert(shadow[0x02002000]==nil,'A discarded partial native shadow must never resume')
      local called=false
      return function()
        assert(not called,'A discarded partial native CPU must never resume');called=true
        if (armed and stage=='run')or(chaos and starts%4==0)then
          armed=false;cleanupArmed=true;shadow[0x02002000]=999;error(reason or 'script exceeded its per-tick time limit')
        end
        return true,value,shadow,1,options.busContext
      end
    end}`
  };
  const result=await executeProject({manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(sources).map(([name,text])=>[name,encode(text)]))},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps});
  assert.equal(result.readOnly,true);assert.deepEqual(result.calls,[]);return result;
}
const phases=id=>`{{entry=0x08000000,args={${id}},key='value'}}`;

for(const opted of [false,true])test(`13 native jobs ${opted?'make bounded progress':'retain legacy full reset'} under a budget abort every fourth start`,async()=>{
  const result=await run(`
    local q=pack.require('features.native-map-query')({preserveCompletedOnBudgetError=${opted},deferCapture=true})
    chaos=true;local tick,complete=0,0
    function update()
      tick=tick+1;q.begin();complete=0
      for id=1,13 do local value=q.request('job:'..id,{{entry=0x08000000,args={id},key='value'}})
        if value then assert(value.value==id+10);complete=complete+1 end
      end
      pcall(q.step,512)
      return{complete=complete,tick=tick,captures=captures}
    end
  `,{steps:[{ticks:12}]});
  assert.equal(result.values.at(-1).complete,opted?13:0);
  if(opted)assert.ok(result.values.findIndex(value=>value.complete===13)<=5);
});

for(const stageName of ['initialize','args','start','run','transform-start','transform-run','after','compact'])test(`opted-in budget abort in private ${stageName} preserves completed entries only`,async()=>{
  const line=query.split('\n').findIndex(text=>text.includes('finish();task.spans=spans;task.reads=nil'))+1;
  const result=await run(`
    stage=${JSON.stringify(stageName)};reason='script exceeded its per-tick instruction budget'
    local q=pack.require('features.native-map-query')({preserveCompletedOnBudgetError=true,compactReads=${stageName==='compact'},trackRevision=${stageName!=='compact'}})
    local cached=${phases(1)}
    q.begin();q.request('cached',cached);q.step(512)
    local previousRevision=stage~='compact' and q.revision()
    local function fault(name)if armed and stage==name then armed=false;error(reason)end end
    local active={{entry=0x08000000,key='value',args=function(read)fault('args');return{2}end,
      transform=function(value)fault('transform-start');return function()fault('transform-run');return true,value,1 end end,
      after=function(value)fault('after');return value end}}
    armed=true
    if stage=='compact' then
      debug.sethook(function(_,line)if armed and debug.getinfo(2,'S').source=='@features.native-map-query.lua' and line==${line} then armed=false;debug.sethook();error(reason)end end,'l')
    end
    local ok=pcall(function()q.begin();assert(q.request('cached',cached));q.request('active',active,{initialize=function()fault('initialize')end});q.step(512)end)
    debug.sethook();assert(not ok)
    q.begin();local retained=q.request('cached',cached);local pending=q.request('active',active);q.step(512);local value=q.request('active',active)
    if previousRevision then assert(q.revision()~=previousRevision,'Recovery must advance the aggregate revision generation')end
    function update()return{retained=retained and retained.value,pending=pending~=nil,value=value and value.value,captures=captures}end
  `);
  assert.deepEqual(result.values[0],{retained:11,pending:false,value:12,captures:3});
});

test('preserved completed dependencies are revalidated and changed bytes force a fresh native result',async()=>{
  const result=await run(`
    local q=pack.require('features.native-map-query')({preserveCompletedOnBudgetError=true});local tick=0
    function update()
      tick=tick+1;q.begin();local previous=q.request('cached',${phases(1)})
      if tick==2 then stage='run';armed=true;reason='script exceeded its per-tick time limit';q.request('active',${phases(2)})end
      pcall(q.step,512);local value=q.request('cached',${phases(1)})
      return{reused=previous~=nil,value=value and value.value}
    end
  `,{steps:[{ticks:2},{patches:[{address:0x02001001,bytes:[99]}],ticks:1}]});
  assert.equal(result.values[1].reused,true);assert.equal(result.values[2].reused,false);assert.equal(result.values[2].value,99);
});

for(const failure of ['permanent','validation','dependency-commit'])test(`opted-in ${failure} failure still clears every completed entry`,async()=>{
  const line=query.split('\n').findIndex(text=>text.includes('dependencies[address]=(dependencies[address] or 0)+1'))+1;
  const result=await run(`
    local q=pack.require('features.native-map-query')({preserveCompletedOnBudgetError=true});local cached=${phases(1)}
    q.begin();q.request('cached',cached);q.step(512);q.begin();assert(q.request('cached',cached))
    local failure=${JSON.stringify(failure)};reason='script exceeded its per-tick time limit'
    if failure=='validation'then
      local actual=mem.u8;local once=true;mem.u8=function(address)if once then once=false;error(reason)end;return actual(address)end
    elseif failure=='dependency-commit'then
      debug.sethook(function(_,line)if debug.getinfo(2,'S').source=='@features.native-map-query.lua' and line==${line} then debug.sethook();error(reason)end end,'l')
    else stage='run';armed=true;reason='Unsupported native instruction'end
    local ok=pcall(function()if failure=='validation'then q.request('cached',cached)else q.request('active',${phases(2)});q.step(512)end end)
    debug.sethook();assert(not ok)
    q.begin();local stale=q.request('cached',cached);q.step(512);local value=q.request('cached',cached)
    function update()return{stale=stale~=nil,value=value and value.value}end
  `);
  assert.deepEqual(result.values[0],{stale:false,value:11});
});

test('interrupted pending cleanup restarts idempotently before any query API can resume a CPU',async()=>{
  const line=query.split('\n').findIndex(text=>text.includes('if not task.done then cache[key]=nil'))+1;
  assert.ok(line>0,'Pending cleanup must drop incomplete tasks without changing completed dependency refs');
  const result=await run(`
    local q=pack.require('features.native-map-query')({preserveCompletedOnBudgetError=true});local cached=${phases(1)}
    q.begin();q.request('cached',cached);q.step(512);q.begin();assert(q.request('cached',cached));q.request('active',${phases(2)})
    stage='run';armed=true;reason='script exceeded its per-tick time limit'
    debug.sethook(function(_,line)
      if cleanupArmed and debug.getinfo(2,'S').source=='@features.native-map-query.lua' and line==${line} then
        cleanupArmed=false;debug.sethook();error('Injected pending cleanup interruption')
      end
    end,'l')
    local ok,message=pcall(q.step,512);debug.sethook();assert(not ok and tostring(message):find('pending cleanup',1,true))
    q.begin();local retained=q.request('cached',cached);local pending=q.request('active',${phases(2)});q.step(512);local value=q.request('active',${phases(2)})
    function update()return{retained=retained and retained.value,pending=pending~=nil,value=value and value.value}end
  `);
  assert.deepEqual(result.values[0],{retained:11,pending:false,value:12});
});

test('periodic aborts retain bounded completed history and release all discarded frozen snapshots',async()=>{
  const result=await run(`
    local q=pack.require('features.native-map-query')({preserveCompletedOnBudgetError=true,maxCacheEntries=8,deferCapture=true});chaos=true
    for n=1,80 do q.begin();q.request('history:'..n,${phases(1)});pcall(q.step,512)end
    local function find(fn,wanted,seen)
      seen=seen or {};if seen[fn]then return end;seen[fn]=true
      for n=1,100 do local name,value=debug.getupvalue(fn,n);if not name then break end
        if name==wanted then return value end
        if type(value)=='function'then local found=find(value,wanted,seen);if found~=nil then return found end end
      end
    end
    q.begin();collectgarbage('collect');collectgarbage('collect')
    local count,actual=find(q.request,'cacheCount'),0
    for _,task in pairs(find(q.request,'cache'))do assert(task.done);actual=actual+1 end
    local snapshots=0;for _ in pairs(weakSnapshots)do snapshots=snapshots+1 end
    assert(count==actual and count<=8 and snapshots==0)
    function update()return{cacheCount=count,snapshots=snapshots}end
  `);
  assert.equal(result.values[0].snapshots,0);assert.ok(result.values[0].cacheCount<=8);
});
