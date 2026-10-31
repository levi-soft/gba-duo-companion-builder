import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=text=>Buffer.from(text).toString('base64');
const file='runtime/shared/presentation.growth-rates.lua';
const presentation=()=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):'return function()return function(v)return v end end';
async function replay(main,options={}){
  const ew=Buffer.alloc(0x40000);ew[0]=1;ew[0x11e]=1;ew[0x21e]=2;
  const sources={
    'main.lua':main,'presentation.growth-rates.lua':presentation(),
    'features.native-growth.lua':fs.readFileSync('runtime/shared/features.native-growth.lua','utf8'),
    'features.base-growth.lua':fs.readFileSync('runtime/shared/features.base-growth.lua','utf8'),
    'features.support.lua':'return function()end',
    'game.snapshot.lua':fs.readFileSync('runtime/shared/game.snapshot.lua','utf8'),
    'features.thumb.lua':`return{start=function(entry,args,shadow,options)
      local index=(entry-0x08001000)//4+1;local unit=args[1]
      local base=unit==0x02000100 and {60,40,20,45,30,35,25,10} or {70,30,25,50,20,40,30,15}
      local value=base[index]+options.ramByte(unit+30)*(index==2 and -5 or 1)
      return function()return true,value,shadow,1,options.busContext end
    end}`
  };
  const result=await executeProject({manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(sources).map(([name,text])=>[name,encode(text)]))},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],...options});
  assert.equal(result.readOnly,true);assert.deepEqual(result.calls,[]);return result;
}

const nativeMain=`
  gfx={radar=function()error('Growth must never call gfx.radar')end}
  local D={slots={[1]=0x02000100,[2]=0x02000200},growthCharacters={
    [0x08000100]={rates={60,40,20,45,30,35,25,10},radar='asset:base-one.png'},
    [0x08000200]={rates={70,30,25,50,20,40,30,15},radar='asset:base-two.png'}},execution={cpuStepsPerTick=512,nativeGrowth={getters={}}}}
  for n,key in ipairs({'Hp','Power','Mag','Skill','Spd','Luck','Def','Res'})do
    D.execution.nativeGrowth.getters[n]={key=key,label=key,entry=0x08001000+(n-1)*4,currentField='maxHp'}
  end
  local native=pack.require('features.native-growth')(D)
  local present=pack.require('presentation.growth-rates')(D)
  function update()
    local id=mem.u8(0x02000000)
    return present(native({unitPresent=true,characterPointer=0x08000000+id*0x100,classPointer=0x08000800,deployment=id,maxHp=99,growthHpCap=80,growthRadar='asset:combined.png'}))
  end
`;

test('native Growth retains base PNG through pending, effective refresh and identity changes without gfx.radar',async()=>{
  const run=await replay(nativeMain,{steps:[
    {ui:{growthPopup:true},expect:{growthRadar:'asset:base-one.png',growthHpRateText:'60% (…)'}},
    {ticks:7,ui:{growthPopup:true},expect:{growthHp:61,growthHpRateText:'60% (+1%)',growthPowerRateText:'40% (-5%)',growthHpCap:80}},
    {ui:{growthPopup:true},patches:[{address:0x0200011e,bytes:[2]}],expect:{growthHp:61,growthRatesStale:true,growthRadar:'asset:base-one.png',growthHpRateText:'60% (+1%)'}},
    {ticks:7,ui:{growthPopup:true},expect:{growthHp:62,growthHpRateText:'60% (+2%)',growthRatesStale:false}},
    {ui:{growthPopup:true},patches:[{address:0x02000000,bytes:[2]}],expect:{growthHp:'---',nativeGrowthReady:false,growthRadar:'asset:base-two.png',growthHpRateText:'70% (…)'}},
    {ticks:7,ui:{growthPopup:true},expect:{growthHp:72,growthHpRateText:'70% (+2%)'}}
  ]});
  assert.equal(run.values.at(-1).growthHpEffectiveRate,72);
});

test('FE8 Metis/Afa effective +5 is formatted once and keeps the original base PNG',async()=>{
  const result=await replay(`
    local D={chars={[0x08000100]={id=1,attributes=0}},slots={[1]=0x02000100},growthCharacters={[0x08000100]={growth={60,40,30,20,15,10,50},radars={'asset:base.png','asset:bonus.png'}}},growthClasses={[0x08000200]={id=1,attributes=0,caps={60,20,20,20,20,20,30}}}}
    local base=pack.require('features.base-growth')(D);local present=pack.require('presentation.growth-rates')(D)
    function update()return present(base({unitPresent=true,characterPointer=0x08000100,classPointer=0x08000200,deployment=1,maxHp=20,str=8,skill=7,spd=6,def=5,res=4,luck=3,level=1,exp=0}))end
  `,{steps:[{ui:{growthPopup:true},patches:[{address:0x0200010c,bytes:[0,32,0,0]}]}]});
  const v=result.values[0];assert.equal(v.growthHp,65);assert.equal(v.growthHpRateText,'60% (+5%)');assert.equal(v.growthHpBaseRate,60);
  assert.equal(v.growthHpEffectiveRate,65);assert.equal(v.growthHpBonusRate,5);assert.equal(v.growthLuckRateText,'50% (+5%)');assert.equal(v.growthRadar,'asset:base.png');assert.equal(v.growthHpCap,60);
});

test('eight-axis baseline wins over engine-seven data and preserves Power/Str aliases and signed rates',async()=>{
  const result=await replay(`
    local D={growthCharacters={[1]={rates={60,40,20,45,30,35,25,10},growth={1,2,3,4,5,6,7},radar='asset:eight.png',conGrowth=0,movGrowth=5}}}
    local present=pack.require('presentation.growth-rates')(D)
    function update()return present({unitPresent=true,characterPointer=1,growthStr=35,growthMag=20,growthLuck=36,growthDef=20,growthRes=-5,growthCon=0,growthMov=4,growthMovCap=15,maxHp=99})end
  `);
  const v=result.values[0];assert.equal(v.growthPowerRateText,'40% (-5%)');assert.equal(v.growthStrRateText,v.growthPowerRateText);
  assert.equal(v.growthMagRateText,'20%');assert.equal(v.growthLuckRateText,'35% (+1%)');assert.equal(v.growthDefRateText,'25% (-5%)');assert.equal(v.growthResRateText,'10% (-15%)');
  assert.equal(v.growthConRateText,'0%');assert.equal(v.growthMovRateText,'5% (-1%)');assert.equal(v.growthMovCap,15);assert.equal(v.growthStr,35);
});

test('Pokemblem uses character baseline and native effective rates without double-counting class contribution',async()=>{
  const result=await replay(`
    local D={growthCharacters={[1]={rates={60,40,20,45,30,35,25,10},radar='asset:character.png'}},classGrowths={[2]={20,10,5,5,5,5,5,5}},execution={nativeGrowth={}}}
    local present=pack.require('presentation.growth-rates')(D)
    function update()return present({unitPresent=true,characterPointer=1,classPointer=2,nativeGrowthReady=true,growthHp=80,growthPower=50,growthMag=25,growthRadar='asset:class-combined.png'})end
  `);
  const v=result.values[0];assert.equal(v.growthHpRateText,'60% (+20%)');assert.equal(v.growthHpBonusRate,20);assert.equal(v.growthHp,80);assert.equal(v.growthRadar,'asset:character.png');
});

test('native pending does not misreport base rates as a verified zero bonus and unknown extras stay absent',async()=>{
  const result=await replay(`
    local D={growthCharacters={[1]={growth={60,40,30,20,15,10,50},radars={'asset:base.png'}}},execution={nativeGrowth={}}}
    local present=pack.require('presentation.growth-rates')(D)
    function update()return present({unitPresent=true,characterPointer=1,nativeGrowthReady=false,nativeGrowthPending=true,growthHp=60,growthCon=10,growthMov=20,maxHp=99})end
  `);
  const v=result.values[0];assert.equal(v.growthHpRateText,'60% (…)');assert.equal(v.growthHpBaseRate,60);assert.equal(v.growthHpEffectiveRate,undefined);assert.equal(v.growthHpBonusRate,undefined);
  assert.equal(v.growthConRateText,undefined);assert.equal(v.growthMovRateText,undefined);assert.equal(v.growthRadar,'asset:base.png');assert.equal(v.growthHp,60);
});

test('FE6 character-table growth fallback maps engine-seven Luck correctly without using current stats',async()=>{
  const result=await replay(`
    local D={chars={[1]={growth={60,40,30,20,15,10,50},radar='asset:fe6.png'}}}
    local present=pack.require('presentation.growth-rates')(D)
    function update()return present({unitPresent=true,characterPointer=1,growthHp=60,growthPower=40,growthLuck=50,growthDef=15,growthRes=10,maxHp=999})end
  `);
  const v=result.values[0];assert.equal(v.growthLuckRateText,'50%');assert.equal(v.growthDefRateText,'15%');assert.equal(v.growthHpBaseRate,60);assert.equal(v.growthRadar,'asset:fe6.png');
});

test('missing baseline or absent unit clears prior rate presentation and never invents growth from current stats',async()=>{
  const result=await replay(`
    local present=pack.require('presentation.growth-rates')({growthCharacters={[1]={growth={60,40,30,20,15,10,50},radars={'asset:base.png'}}}})
    local v={unitPresent=true,characterPointer=1,growthHp=65,growthCon=8}
    function update()
      if ui.changed then v.characterPointer=2;v.unitPresent=not ui.absent;v.maxHp=999 end
      return present(v)
    end
  `,{steps:[{expect:{growthHpRateText:'60% (+5%)'}},{ui:{changed:true},expect:{growthHpRateText:'---',growthHpBaseRate:undefined,growthHpBonusRate:undefined,growthRadar:''}},{ui:{changed:true,absent:true},expect:{growthConRateText:undefined,growthHpRateText:'---'}}]});
  assert.equal(result.values.at(-1).growthHp,65);
});
