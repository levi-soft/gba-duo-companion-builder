import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject}from '../scripts/runtime-validation-engine.mjs';
const encode=s=>Buffer.from(s).toString('base64');
async function scenario(initial,steps){
 const sources={
  'main.lua':`local apply=pack.require('features.native-growth')({slots={[1]=0x02000100},execution={cpuStepsPerTick=512,nativeGrowth={getters={{key='Hp',label='HP',entry=0x08001000,currentField='maxHp'}}}}})
    function update()local v=apply({unitPresent=true,characterPointer=0x08000100,classPointer=0x08000200,deployment=1,maxHp=20});v.starts=starts or 0;return v end`,
  'features.native-growth.lua':fs.readFileSync('runtime/shared/features.native-growth.lua','utf8'),
  'game.snapshot.lua':fs.readFileSync('runtime/shared/game.snapshot.lua','utf8'),
  'features.thumb.lua':`return{start=function(entry,args,shadow,options)starts=(starts or 0)+1;return function()local flag=options.ramByte(0x0203F800);if flag==0 then error('Transient native flag state')end;return true,flag*25,{},1,options.busContext end end}`
 };
 const ew=Buffer.alloc(0x40000);ew[0x3F800]=initial;
 return executeProject({manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,encode(v)]))},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps});
}
test('a failed first native Growth query watches its actual dependency and can retry on popup reopening',async()=>{
 const r=await scenario(0,[{ticks:3,ui:{growthPopup:true},expect:{starts:1,nativeGrowthReady:false}},
  {ticks:1}, {ticks:1,ui:{growthPopup:true},expect:{starts:2}},
  {ticks:3,ui:{growthPopup:true},patches:[{address:0x0203F800,bytes:[3]}],expect:{starts:3,nativeGrowthReady:true,growthHp:75}}]);
 assert.equal(r.values.at(-1).nativeGrowthError,undefined);assert.equal(r.readOnly,true);
});
test('a failed refresh preserves the last valid vector without retrying unchanged failed inputs every tick',async()=>{
 const r=await scenario(3,[{ui:{growthPopup:true},expect:{growthHp:75,starts:1}},
  {ticks:4,ui:{growthPopup:true},patches:[{address:0x0203F800,bytes:[0]}],expect:{growthHp:75,growthRatesStale:true,starts:2}},
  {ticks:3,ui:{growthPopup:true},patches:[{address:0x0203F800,bytes:[4]}],expect:{growthHp:100,growthRatesStale:false,starts:3}}]);
 assert.equal(r.values.at(-1).nativeGrowthError,undefined);assert.equal(r.readOnly,true);
});
