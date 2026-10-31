import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

const file='runtime/shared/presentation.continuation.lua';
// Before the fix, a final update has no continuation presenter and returns v.
const source=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'return function()return function(v)return v end end';
async function run(code){
  const engine=await luaFactory().createEngine();
  try{return await engine.doString(`
    ui={};input=nil;gfx=nil
    mem=setmetatable({},{__index=function()error('Continuation must not read or write game memory')end})
    local factory=(function()${source}\nend)()
    local function pulse(v)
      if not v.ui then return nil end
      if v.ui.set then return v.ui.set.companionWorkPulse end
      for _,action in ipairs(v.ui)do if type(action)=='table' and action.set and action.set.companionWorkPulse~=nil then return action.set.companionWorkPulse end end
    end
    local function applyUi(v)
      local changed=false
      local function apply(action)
        if type(action)~='table' then return end
        if action[1]~=nil then for _,child in ipairs(action)do apply(child)end
        elseif type(action.set)=='table' then
          for key,value in pairs(action.set)do
            if ui[key]~=value then ui[key]=value;changed=true end
          end
        end
      end
      apply(v.ui)
      return changed
    end
    ${code}`);
  }finally{engine.global.close();}
}

test('official paused UI acknowledgements finish an eight-getter Growth wave and then quiesce',async()=>{
  const result=await run(`
    local present=factory();ui.growthPopup=true
    local queued,ticks,automatic=true,0,0;local last
    while queued and ticks<20 do
      queued=false;ticks=ticks+1
      last=present({unitPresent=true,deployment=1,characterPointer=100,classPointer=200,nativeGrowthPending=ticks<8})
      local nextPulse=pulse(last)
      if nextPulse~=nil then automatic=automatic+1 end
      queued=applyUi(last)
    end
    return {ticks=ticks,automatic=automatic,pending=last.companionWorkPending,needs=last.companionWorkNeedsContinue,pulse=pulse(last)}
  `);
  assert.equal(result.ticks,9,'Eight getter snapshots are followed by one acknowledgement clearing persisted pending state');
  assert.equal(result.automatic,7);
  assert.equal(result.pending,false);assert.equal(result.needs,false);assert.equal(result.pulse,undefined);
});

test('official paused continuation also finishes the classic four-enemies-per-update Danger cache',async()=>{
  const result=await run(`
    local present=factory();ui.mainTab='Map';ui.mapDangerEnabled=true
    local queued,ticks,done=true,0,0;local last
    while queued and ticks<10 do
      queued=false;ticks=ticks+1;done=math.min(13,done+4)
      last=present({mapPresent=true,mapDangerEnabled=true,mapDangerReady=done==13,mapPickContext='1:2:3:4'})
      local nextPulse=pulse(last)
      queued=applyUi(last)
    end
    return {done=done,ticks=ticks,pending=last.companionWorkPending,pulse=pulse(last)}
  `);
  assert.equal(result.done,13);assert.equal(result.ticks,5);assert.equal(result.pending,false);assert.equal(result.pulse,undefined);
});

test('untouched idle packs emit nothing and completion clears persisted pending state exactly once',async()=>{
  const result=await run(`
    local present=factory();local untouched=present({})
    assert(untouched.ui==nil and ui.companionWorkPending==nil)
    local v=present({unitPresent=true,nativeMovePending=true});applyUi(v)
    v.nativeMovePending=false;v=present(v)
    local firstChanged=applyUi(v);local firstPulse=pulse(v)
    v=present(v);local secondChanged=applyUi(v)
    return {firstChanged=firstChanged,secondChanged=secondChanged,firstPulse=firstPulse,
      pending=ui.companionWorkPending,needs=ui.companionWorkNeedsContinue,finalActions=v.ui}
  `);
  assert.equal(result.firstChanged,true);assert.equal(result.secondChanged,false);assert.equal(result.firstPulse,undefined);
  assert.equal(result.pending,false);assert.equal(result.needs,false);assert.equal(result.finalActions,undefined);
});

test('one context has at most 512 automatic pulses, then a manual pulse restarts its bounded allowance',async()=>{
  const result=await run(`
    local present=factory();local v={mapPresent=true,mapRangesBusy=true,mapPickContext='1:2:3:4'}
    local emissions=0
    for n=1,700 do
      v=present(v);local nextPulse=pulse(v)
      if nextPulse~=nil then emissions=emissions+1 end
      applyUi(v)
    end
    local stopped=v.companionWorkNeedsContinue==true and pulse(v)==nil
    local manual=v.companionWorkNext
    ui.companionWorkPulse=manual;v=present(v)
    return {emissions=emissions,stopped=stopped,manual=manual,resumed=pulse(v),needs=v.companionWorkNeedsContinue}
  `);
  assert.equal(result.emissions,512);assert.equal(result.stopped,true);
  assert.notEqual(result.resumed,undefined);assert.notEqual(result.resumed,result.manual);assert.equal(result.needs,false);
});

test('delayed or absent UI acknowledgements cannot reset the bounded allowance on every update',async()=>{
  const result=await run(`
    local present=factory();ui.companionWorkPulse=0
    local v={mapPresent=true,mapNativeRangesBusy=true,mapPickContext='1:2:3:4'};local emissions=0
    for n=1,700 do v=present(v);if pulse(v)~=nil then emissions=emissions+1 end end
    local stopped=v.companionWorkNeedsContinue
    local manual=v.companionWorkNext
    ui.companionWorkPulse=manual;v=present(v)
    return {emissions=emissions,stopped=stopped,manual=manual,resumed=pulse(v),needs=v.companionWorkNeedsContinue}
  `);
  assert.equal(result.emissions,512);assert.equal(result.stopped,true);
  assert.notEqual(result.manual,0);assert.notEqual(result.manual,1,'Manual binding must differ from the last unacknowledged automatic pulse');
  assert.notEqual(result.resumed,undefined);assert.equal(result.needs,false);
});

test('changing live RNG and progress does not grant an endless automatic pulse allowance',async()=>{
  const result=await run(`
    local present=factory();ui.predictionPopup=true
    local v={predictionBusy=true,deployment=1,characterPointer=100,classPointer=200};local emissions=0
    for n=1,700 do
      v.rngStateKey=tostring(n);v.predictionProgress=n%99
      v=present(v);local nextPulse=pulse(v)
      if nextPulse~=nil then emissions=emissions+1 end
      applyUi(v)
    end
    return {emissions=emissions,needs=v.companionWorkNeedsContinue,rng=v.rngStateKey,progress=v.predictionProgress}
  `);
  assert.equal(result.emissions,512);assert.equal(result.needs,true);
  assert.equal(result.rng,'700');assert.equal(result.progress,700%99);
});

test('pulse wraparound still produces distinct automatic and manual values',async()=>{
  const result=await run(`
    local present=factory();ui.companionWorkPulse=2147483646
    local v=present({unitPresent=true,nativeMovePending=true})
    return {automatic=pulse(v),manual=v.companionWorkNext}
  `);
  assert.equal(result.automatic,0);assert.equal(result.manual,1);
});

const scopes=[
  ['visible Growth','ui.growthPopup=true','unitPresent=true,nativeGrowthPending=true',true],
  ['Growth needed for prediction','ui.predictionPopup=true','unitPresent=true,nativeGrowthPending=true',true],
  ['hidden Growth','','unitPresent=true,nativeGrowthPending=true',false],
  ['native movement','','unitPresent=true,nativeMovePending=true',true],
  ['absent unit movement','','unitPresent=false,nativeMovePending=true',false],
  ['visible Map','','mapPresent=true,mapRangesBusy=true',true],
  ['unfinished visible Map geometry',"ui.mainTab='Map'",'mapPresent=false,mapRenderPending=true',true],
  ['hidden Map geometry',"ui.mainTab='Units'",'mapPresent=false,mapRenderPending=true',false],
  ['Map geometry without an active Map tab','','mapPresent=false,mapRenderPending=true',false],
  ['finished Map geometry',"ui.mainTab='Map'",'mapPresent=true,mapRenderPending=false',false],
  ['hidden Map','','mapPresent=false,mapNativeRangesBusy=true',false],
  ['visible prediction','ui.predictionPopup=true','predictionBusy=true',true],
  ['hidden prediction','','predictionBusy=true',false],
  ['failed Growth','ui.growthPopup=true','unitPresent=true,nativeGrowthPending=true,nativeGrowthError="actual failure"',false],
  ['failed prediction','ui.predictionPopup=true','predictionBusy=true,analysisFailed=true',false],
  ['prediction error','ui.predictionPopup=true','predictionBusy=true,analysisPredictionError="actual failure"',false],
  ['complete prediction','ui.predictionPopup=true','predictionBusy=true,predictionComplete=true',false],
  ['unavailable Map','','mapPresent=true,mapRangesBusy=true,mapRangesUnavailable=true',false],
];
for(const [name,setup,fields,expected]of scopes)test('continuation scopes '+name,async()=>{
  const result=await run(`${setup};local v=factory()({${fields}});return {pending=v.companionWorkPending,automatic=pulse(v)~=nil}`);
  assert.equal(result.pending,expected);assert.equal(result.automatic,expected);
});

test('continuation preserves existing object and list UI actions, RNG acknowledgement, and Map invalidation',async()=>{
  const result=await run(`
    local present=factory();ui.growthPopup=true
    local original={set={rngAck=false,mapPickedId=0},navigate='item2',state='inventoryDetail'}
    local v=present({unitPresent=true,nativeGrowthPending=true,ui=original,rngStateKey='fixed',characterPointer=100,classPointer=200})
    assert(v.ui.set.rngAck==false and v.ui.set.mapPickedId==0 and v.ui.navigate=='item2' and v.ui.state=='inventoryDetail')
    assert(original.set.companionWorkPulse==nil)
    assert(v.rngStateKey=='fixed' and v.characterPointer==100 and v.classPointer==200)
    local actions={{set={rngAck=false,mapPickedId=0}},{navigate='item2',state='inventoryDetail'},'back'}
    v={unitPresent=true,nativeGrowthPending=true,ui=actions}
    local max=0
    for n=1,12 do
      v=present(v);max=math.max(max,#v.ui);applyUi(v)
      assert(v.ui[1].set.rngAck==false and v.ui[1].set.mapPickedId==0)
      assert(v.ui[2].navigate=='item2' and v.ui[3]=='back')
    end
    assert(#actions==3)
    v.nativeGrowthPending=false;v=present(v);applyUi(v);v=present(v)
    return {maxActions=max,readyActions=#v.ui,pulse=pulse(v),pending=v.companionWorkPending}
  `);
  assert.equal(result.maxActions,4,'A reused action list must not accumulate pulse actions');
  assert.equal(result.readyActions,3);assert.equal(result.pulse,undefined);assert.equal(result.pending,false);
});

test('unit/class or Map-context change grants a fresh bounded allowance without changing ownership fields',async()=>{
  const result=await run(`
    local present=factory();local v={unitPresent=true,deployment=1,characterPointer=100,classPointer=200,
      mapPresent=true,mapRangesBusy=true,mapPickContext='1:2:3:4',unitLocked=true,rngStateKey='same'}
    for n=1,513 do v=present(v);ui.companionWorkPulse=pulse(v) or ui.companionWorkPulse end
    assert(v.companionWorkNeedsContinue==true)
    v.classPointer=201;v=present(v);local first=pulse(v)
    for n=1,513 do ui.companionWorkPulse=pulse(v) or ui.companionWorkPulse;v=present(v)end
    assert(v.companionWorkNeedsContinue==true)
    v.mapPickContext='1:3:3:4';v=present(v)
    return {first=first,second=pulse(v),needs=v.companionWorkNeedsContinue,locked=v.unitLocked,rng=v.rngStateKey,cp=v.characterPointer,kp=v.classPointer}
  `);
  assert.notEqual(result.first,undefined);assert.notEqual(result.second,undefined);assert.equal(result.needs,false);
  assert.equal(result.locked,true);assert.equal(result.rng,'same');assert.equal(result.cp,100);assert.equal(result.kp,201);
});

test('a manual tap resumes a paused job after an uncaught budget failure dropped the requested snapshot',async()=>{
  const result=await run(`
    local present=factory();ui.growthPopup=true
    local getters=0;local function step(fail)
      getters=math.min(8,getters+1)
      if fail then error('actual uncaught host budget failure')end
      return present({unitPresent=true,deployment=1,characterPointer=100,classPointer=200,nativeGrowthPending=getters<8})
    end
    local displayed=step(false);applyUi(displayed)
    local previous=ui.companionWorkPulse
    local ok,message=pcall(step,true)
    assert(not ok and message:find('actual uncaught host budget failure',1,true))
    -- Official receives no result/actions from that failed snapshot. Only the
    -- pending label's last displayed binding can request the next snapshot.
    displayed={_frameCounter=10,_scriptError=message}
    local manual=ui.companionWorkNext
    assert(manual~=previous,'A pending-label tap must change UI even after the automatic pulse was acknowledged')
    ui.companionWorkPulse=manual
    local queued=true;local ticks=0
    while queued and ticks<20 do
      queued=false;ticks=ticks+1;displayed=step(false)
      local automatic=pulse(displayed)
      queued=applyUi(displayed)
    end
    return {getters=getters,pending=displayed.companionWorkPending,ticks=ticks,pulse=pulse(displayed)}
  `);
  assert.equal(result.getters,8);assert.equal(result.pending,false);assert.equal(result.ticks,7);assert.equal(result.pulse,undefined);
});

test('the manual continuation binding survives official replacement of every snapshot value after an error',async()=>{
  const result=await run(`
    local present=factory();ui.growthPopup=true
    local displayed=present({unitPresent=true,deployment=1,characterPointer=100,classPointer=200,nativeGrowthPending=true})
    applyUi(displayed)
    -- CompanionSnapshot.build produces only these built-ins after Lua returns
    -- null; CompanionTree replaces, rather than merges, its displayed values.
    displayed={_frameCounter=10,_scriptError='actual uncaught budget failure'}
    assert(displayed.companionWorkNext==nil)
    local manual=ui.companionWorkNext
    local previous=ui.companionWorkPulse
    if manual~=nil then ui.companionWorkPulse=manual end
    local resumed=present({unitPresent=true,deployment=1,characterPointer=100,classPointer=200,nativeGrowthPending=true})
    return {persistentPending=ui.companionWorkPending,manual=manual,changed=manual~=nil and manual~=previous,resumed=pulse(resumed)}
  `);
  assert.equal(result.persistentPending,true);assert.equal(result.changed,true);assert.notEqual(result.resumed,undefined);
});

test('normal Map work runs without a Continue button; an exhausted job and a script error retain recovery',async()=>{
  const layout=JSON.parse(fs.readFileSync('ui/theme.layout.json','utf8'));
  const work=layout.children.find(node=>node.id==='companion-work-resume');
  const error=layout.children.find(node=>node.id==='companion-error-resume');
  const visible=(node,values)=>Boolean(node.visibleIf.slice(1).split('.').reduce((value,key)=>value?.[key],values));
  const phases=await run(`
    local present=factory();ui.mainTab='Map'
    local v={mapPresent=true,mapRangesBusy=true,mapPickContext='1:1:0:0'}
    v=present(v);applyUi(v)
    local normal={companionWorkPending=ui.companionWorkPending,companionWorkNeedsContinue=ui.companionWorkNeedsContinue}
    for n=1,512 do v=present(v);applyUi(v)end
    local stopped={companionWorkPending=ui.companionWorkPending,companionWorkNeedsContinue=ui.companionWorkNeedsContinue}
    v.mapRangesBusy=false;v=present(v);applyUi(v)
    return {normal=normal,stopped=stopped,ready={companionWorkPending=ui.companionWorkPending,companionWorkNeedsContinue=ui.companionWorkNeedsContinue}}
  `);
  assert.equal(phases.normal.companionWorkPending,true);
  assert.equal(visible(work,{ui:phases.normal}),false,'Automatic Map progress does not require a Continue action');
  assert.equal(visible(work,{ui:phases.stopped}),true,'A genuinely exhausted job remains recoverable');
  assert.equal(visible(work,{ui:phases.ready}),false);
  assert.equal(visible(error,{ui:phases.ready}),false);
  assert.equal(visible(error,{_scriptError:'actual failed snapshot'}),true);
});
