import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=text=>Buffer.from(text).toString('base64');

async function scenario({fault='getter-run',reason='script exceeded its per-tick time limit',failures=2,retries,firstAttemptClean=false,steps}={}){
  const ew=Buffer.alloc(0x40000);ew[0x112]=20;ew[0x114]=5;ew[0x3F800]=3;
  let growth=fs.readFileSync('runtime/shared/features.native-growth.lua','utf8');
  if(fault==='finish-publish'){
    // Fault injection after finish changes publication metadata, before its
    // protected operation returns; the prior complete vector must be restored.
    const marker=growth.includes('cache.pending=false')?'cache.pending=false':'cache.pending,cache.completed=false,tick';
    assert.ok(growth.includes(marker));
    growth=growth.replace(marker,marker+`;if attempts<=${failures+(firstAttemptClean?1:0)} and attempts>${firstAttemptClean?1:0} then error(${JSON.stringify(reason)})end`);
  }
  if(fault==='snapshot-setup'){
    const marker='cache.recordedRam=function(address)';assert.ok(growth.includes(marker));
    growth=growth.replace(marker,`if not growthSetupInterrupted then growthSetupInterrupted=true;error(${JSON.stringify(reason)})end;`+marker);
  }
  const snapshot=fs.readFileSync('runtime/shared/game.snapshot.lua','utf8');
  const sources={
    'main.lua':`
      mem.busContext=function()return{version=1,platform='gba',biosPrefetch=0xE3A02004}end
      local readByte=mem.u8
      mem.u8=function(address)
        if finishCheck and address==0x0203F800 then
          finishChecks=(finishChecks or 0)+1
          if finishChecks==2 then finishCheck=false;error(${JSON.stringify(reason)})end
        end
        return readByte(address)
      end
      local execution={cpuStepsPerTick=512,nativeGrowth={${retries===undefined?'':`budgetRetries=${retries},`}getters={
        {key='Hp',label='HP',entry=0x08001000,currentField='maxHp'},
        {key='Str',label='Str',entry=0x08002000,currentField='str'}},
        capProbe={entry=0x08003000,fields={{key='Hp',offset=18,gainOffset=0x73},{key='Str',offset=20,gainOffset=0x75}}}}}
      local apply=pack.require('features.native-growth')({slots={[1]=0x02000100},execution=execution})
      function update()
        currentTick=(currentTick or 0)+1
        local v=apply({unitPresent=true,characterPointer=0x08000100,classPointer=0x08000200,deployment=1,maxHp=20,str=5})
        assert(execution.cpuStepsPerTick==512 and execution.busContext==nil,'Execution metadata must remain unchanged')
        v.attempts=attempts or 0;v.snapshots=snapshots;v.slices=slices or {};v.startTicks=startTicks or {};return v
      end
    `,
    'features.native-growth.lua':growth,
    'game.snapshot.lua':`local actual=(function()${snapshot}\nend)();snapshots=0
      return function()snapshots=snapshots+1;return actual()end`,
    'features.thumb.lua':`
      local original=0xE3A02004
      return{start=function(entry,args,shadow,options)
        local index=entry==0x08001000 and 1 or entry==0x08002000 and 2 or 3
        if index==1 then
          attempts=(attempts or 0)+1;startTicks=startTicks or {};startTicks[#startTicks+1]=currentTick
          assert(options.busContext.biosPrefetch==original,'Retries must restore the ORIGINAL captured bus context')
          assert(shadow[0x02001080]==nil,'Retries must discard the entire private shadow')
        else
          assert(options.busContext.biosPrefetch==original+index-1,'Getter chain bus context must advance normally')
          assert(shadow[0x02001080]==(index==2 and 7 or 8),'Private getter chain must restart from the first getter')
        end
        local amount=options.ramByte(0x0203F800)
        local shouldFail=attempts<=${failures+(firstAttemptClean?1:0)} and attempts>${firstAttemptClean?1:0}
        if shouldFail and ((${JSON.stringify(fault)}=='getter-start' and index==1)or(${JSON.stringify(fault)}=='probe-start' and index==3))then
          shadow[0x02001080]=999;error(${JSON.stringify(reason)})
        end
        local called=false
        return function(slice)
          assert(not called,'An interrupted native closure must never resume');called=true
          slices=slices or {};if index==1 then slices[#slices+1]=slice end
          if shouldFail and ((${JSON.stringify(fault)}=='getter-run' and index==2)or(${JSON.stringify(fault)}=='probe-run' and index==3))then
            shadow[0x02001080]=999;error(${JSON.stringify(reason)})
          end
          if index<3 then shadow[0x02001080]=index==1 and 7 or 8
          else
            shadow[0x0203FE00+0x73]=10;shadow[0x0203FE00+0x75]=20
            if shouldFail and ${JSON.stringify(fault)}=='finish-check' then finishChecks=0;finishCheck=true end
          end
          return true,amount*10+index,shadow,1,{version=1,platform='gba',biosPrefetch=original+index}
        end
      end}
    `
  };
  const result=await executeProject({manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(sources).map(([name,source])=>[name,encode(source)]))},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:steps||[{ticks:24,ui:{growthPopup:true}}]});
  assert.equal(result.readOnly,true);assert.deepEqual(result.calls,[]);return result;
}

for(const reason of ['script exceeded its per-tick time limit','script exceeded its per-tick instruction budget']){
  for(const fault of ['getter-start','getter-run','probe-start','probe-run','finish-check','finish-publish'])test(`native Growth retries ${fault} ${reason} with a fresh whole getter/cap chain`,async()=>{
    const run=await scenario({fault,reason});const v=run.values.at(-1);
    assert.equal(v.nativeGrowthReady,true);assert.equal(v.nativeGrowthPending,false);assert.equal(v.nativeGrowthError,undefined);
    assert.equal(v.growthHp,31);assert.equal(v.growthStr,32);assert.equal(v.growthHpCap,30);assert.equal(v.growthStrCap,25);
    assert.equal(v.attempts,3);assert.equal(v.snapshots,1);assert.equal(v.slices.at(-1),128);
    if(fault!=='getter-start')assert.deepEqual(v.slices,[512,256,128]);
    assert.ok(v.startTicks.every((tick,n)=>n===0||tick>v.startTicks[n-1]));
    assert.ok(run.values.filter(value=>value.nativeGrowthPending).every(value=>value.growthHp==='---'&&value.growthStr==='---'&&value.nativeGrowthError===undefined));
  });
}

for(const options of [{failures:99},{retries:0},{reason:'Unsupported native instruction'}])test(`native Growth fails closed after ${JSON.stringify(options)}`,async()=>{
  const run=await scenario(options);const v=run.values.at(-1);
  assert.equal(v.nativeGrowthReady,false);assert.equal(v.nativeGrowthPending,false);assert.ok(v.nativeGrowthError);
  assert.equal(v.attempts,options.failures===99?3:1);assert.equal(v.snapshots,1);
});

test('native Growth replaces changed frozen inputs and resets its retry allowance',async()=>{
  const run=await scenario({fault:'getter-run',failures:3,steps:[
    {ticks:2,ui:{growthPopup:true}},
    {ticks:24,ui:{growthPopup:true},patches:[{address:0x0203F800,bytes:[4]}]}
  ]});
  const v=run.values.at(-1);assert.equal(v.nativeGrowthReady,true);assert.equal(v.growthHp,41);assert.equal(v.growthStr,42);
  assert.equal(v.snapshots,2);assert.deepEqual(v.slices,[512,512,256,128]);
  assert.ok(run.values.every(value=>value.growthHp!==31));
});

test('native Growth retains an atomic last valid vector while bounded retries refresh the same identity',async()=>{
  const run=await scenario({fault:'finish-publish',failures:2,firstAttemptClean:true,steps:[
    {ticks:12,ui:{growthPopup:true}},
    {ticks:1,ui:{growthPopup:true},patches:[{address:0x0203F800,bytes:[4]}]},
    {ticks:12,ui:{growthPopup:true}}
  ]});
  const pending=run.values.filter(value=>value.nativeGrowthPending&&value.nativeGrowthReady);
  assert.ok(pending.length>0);assert.ok(pending.every(value=>value.growthHp===31&&value.growthStr===32&&value.growthRatesStale));
  const v=run.values.at(-1);assert.equal(v.growthHp,41);assert.equal(v.growthStr,42);assert.equal(v.growthRatesStale,false);
  assert.equal(v.attempts,4);assert.equal(v.snapshots,2);assert.deepEqual(v.slices,[512,512,256,128]);
});

test('native Growth can retry an exhausted transient failure on manual popup reopening',async()=>{
  const run=await scenario({failures:3,steps:[
    {ticks:12,ui:{growthPopup:true},expect:{nativeGrowthReady:false,nativeGrowthPending:false,attempts:3}},
    {ui:{growthPopup:false}},
    {ticks:6,ui:{growthPopup:true},expect:{nativeGrowthReady:true,nativeGrowthPending:false,nativeGrowthError:undefined,attempts:4}}
  ]});
  const v=run.values.at(-1);assert.equal(v.snapshots,2);assert.deepEqual(v.slices,[512,256,128,512]);
});

test('native Growth fails closed if snapshot setup is interrupted before its tracked reader exists',async()=>{
  const reason='script exceeded its per-tick time limit';
  const run=await scenario({fault:'snapshot-setup',reason,steps:[
    {ticks:6,ui:{growthPopup:true},expect:{attempts:0,snapshots:1,nativeGrowthReady:false,nativeGrowthPending:false}},
    {ui:{growthPopup:false}},
    {ticks:5,ui:{growthPopup:true},expect:{attempts:1,snapshots:2,nativeGrowthReady:true,nativeGrowthPending:false,nativeGrowthError:undefined}}
  ]});
  assert.ok(run.values[0].nativeGrowthError.includes(reason));
  assert.deepEqual(run.values.at(-1).slices,[512]);
});
