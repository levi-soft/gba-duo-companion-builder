import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const formatterPath='runtime/pokemblem/presentation.pokemblem-text.lua';
const encode=text=>Buffer.from(text).toString('base64');
const formatter=()=>fs.existsSync(formatterPath)?fs.readFileSync(formatterPath,'utf8'):'return function(v)return v end';
// Author ParseDefinitions.txt, commit 46eb3c06cbc5811206a0980c82bf7451fcfb1e50.
const glyphs=[['\u0785','Lock'],['\u18B0','Water'],['\u18B1','Bug'],['\u18B2','Dragon'],
  ['\u18B3','Electric'],['\u18B4','Fighting'],['\u18B5','Fire'],['\u18B6','Ghost'],
  ['\u18B7','Grass'],['\u18B8','Ground'],['\u18B9','Ice'],['\u18BA','Normal'],
  ['\u18BE','Poison'],['\u18BF','Psychic'],['\u18C0','Rock'],['\u18C1','Flying'],['\u18C2','Steel']];

async function run(main,{sources={},ew=Buffer.alloc(0x40000),expect}={}){
  const files={'main.lua':main,'presentation.pokemblem-text.lua':formatter(),...sources};
  const result=await executeProject({manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,encode(v)]))},
    {ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[{expect}]});
  assert.equal(result.readOnly,true);assert.deepEqual(result.calls,[]);return result.values.at(-1);
}

test('cached native abilities, moves and held accessories display author labels without changing cached data or numeric fields',async()=>{
  const ew=Buffer.alloc(0x40000);ew[0x128]=26;ew.writeUInt16LE(0x8A1B,0x11E);
  const values=await run(`
    local format=pack.require('presentation.pokemblem-text')
    local D={customProfile={},skillConfig={},slots={[2]=0x02000100},classes={[0x08000200]={name='Pokémon'}},
      skillData={[168]={name='Chlorophyll',description="Chlorophyll: Doubled speed while outdoors or in Fiery Aura's range. ޅᢷ",icon='asset:skill.png'}},
      forecastItems={[26]={name='ᢷ Vine Whip',description='Physical: A grassy move. ᢷ',might=12,hit=90,weight=3,attributes=0},
        [27]={name='Accessory',description='ᢰ accessory.',attributes=0x00400000}}}
    local abilities=pack.require('game.abilities')(D)
    local moves=pack.require('presentation.pokemblem')(D)
    function update()
      local v={unitPresent=true,deployment=2,classPointer=0x08000200,item1Description=D.forecastItems[27].description}
      abilities.apply(v,0x02000100);moves(v)
      assert(format(v)==v)
      v.cacheUnchanged=D.skillData[168].description=="Chlorophyll: Doubled speed while outdoors or in Fiery Aura's range. ޅᢷ"
        and D.forecastItems[26].name=='ᢷ Vine Whip' and D.forecastItems[27].description=='ᢰ accessory.'
      return v
    end`,{ew,sources:{
      'game.abilities.lua':fs.readFileSync('runtime/pokemblem/game.abilities.lua','utf8'),
      'presentation.pokemblem.lua':fs.readFileSync('runtime/pokemblem/presentation.pokemblem.lua','utf8'),
      'features.native-skills.lua':'return function()return function()return {168}end end',
      'game.talk.lua':'return function()return function()end end'
    },expect:{nativeSkill1Description:"Chlorophyll: Doubled speed while outdoors or in Fiery Aura's range. [Lock] [Grass]",
      skill1Description:"Chlorophyll: Doubled speed while outdoors or in Fiery Aura's range. [Lock] [Grass]",
      nativeSkill1Name:'Chlorophyll',nativeSkill1Id:168,nativeSkill1Present:true,nativeSkill1Icon:'asset:skill.png',
      pokeMove1Name:'[Grass] Vine Whip',pokeMove1Description:'Physical: A grassy move. [Grass]',
      pokeMove1Stats:'Might 12 | Hit 90 | Weight 3',pokeMove1Id:26,item1Uses:10,item1AccessoryEquipped:true,
      item1Description:'[Water] accessory. Held accessory.',cacheUnchanged:true}});
  assert.equal(values.unitName,'Pokémon');
});

test('all seventeen documented custom glyphs retain their literal author labels and readable spacing',async()=>{
  await run(`local format=pack.require('presentation.pokemblem-text')
    function update()return format({nativeSkill1Description='${glyphs.map(([g])=>g).join('')}'})end`,
    {expect:{nativeSkill1Description:glyphs.map(([,label])=>'['+label+']').join(' ')}});
});

test('only skill, move and inventory description display fields are formatted',async()=>{
  await run(`local format=pack.require('presentation.pokemblem-text')
    function update()
      local fields={};local v={unitName='ᢷ',className='ᢷ',item1Name='ᢷ',enemyName='ᢷ',growthBonus='ᢷ',
        nativeSkill1Id=168,pokeMove1Id=26,item1Uses=10,skill1Present=false,ui={set={mainTab='Units',skillDetail='skill1'}}}
      local state=v.ui
      for n=1,6 do for _,prefix in ipairs({'nativeSkill','skill'})do for _,suffix in ipairs({'Name','Description'})do
        fields[#fields+1]=prefix..n..suffix
      end end end
      for n=1,5 do
        for _,suffix in ipairs({'Name','Description','Stats'})do fields[#fields+1]='pokeMove'..n..suffix end
        fields[#fields+1]='item'..n..'Description'
      end
      for _,key in ipairs(fields)do v[key]='ᢷ' end
      format(v)
      local count=0;for _,key in ipairs(fields)do if v[key]=='[Grass]' then count=count+1 end end
      v.convertedFields=count;v.uiUnchanged=v.ui==state and v.ui.set.mainTab=='Units' and v.ui.set.skillDetail=='skill1'
      return v
    end`,{expect:{convertedFields:44,unitName:'ᢷ',className:'ᢷ',item1Name:'ᢷ',enemyName:'ᢷ',growthBonus:'ᢷ',
      nativeSkill1Id:168,pokeMove1Id:26,item1Uses:10,skill1Present:false,uiUnchanged:true}});
});

test('plain labels are idempotent and legitimate or unknown Unicode is preserved',async()=>{
  const unicode='Pokémon “♀♂” 未知 ᣃ';
  await run(`local format=pack.require('presentation.pokemblem-text')
    function update()
      local v={nativeSkill1Description='${unicode}',skill1Description='Already [Lock] [Grass]',
        pokeMove1Description='${unicode} ޅᢷ',pokeMove1Name=false,pokeMove1Stats=12}
      format(v);local once=v.pokeMove1Description;format(v);v.idempotent=once==v.pokeMove1Description
      return v
    end`,{expect:{nativeSkill1Description:unicode,skill1Description:'Already [Lock] [Grass]',
      pokeMove1Description:unicode+' [Lock] [Grass]',pokeMove1Name:false,pokeMove1Stats:12,idempotent:true}});
});

test('formatting adds only missing icon separators and preserves existing line breaks and surrounding text',async()=>{
  await run(`local format=pack.require('presentation.pokemblem-text')
    function update()return format({nativeSkill1Name='Grassᢷmove',nativeSkill1Description='Line one.\\nޅᢷ',
      skill1Description='  Prefix  ᢷ  suffix  ',pokeMove1Description='[Grass]'})end`,
    {expect:{nativeSkill1Name:'Grass [Grass] move',nativeSkill1Description:'Line one.\n[Lock] [Grass]',
      skill1Description:'  Prefix  [Grass]  suffix  ',pokeMove1Description:'[Grass]'}});
});

test('the Pokemblem entry point formats the final English/Forecast values and preserves UI actions',async()=>{
  const identity=trace=>`return function()return function(v)v.order=v.order..'/${trace}';return v end end`;
  const values=await run(fs.readFileSync('runtime/pokemblem/main.lua','utf8'),{sources:{
    'data.rom_tables.lua':'return {}','game.execution.lua':'return {}','shared.values.lua':'return {}',
    'game.map.lua':'return function()return {}end','game.abilities.lua':'return function()return {}end',
    'game.units.lua':`return function()return function()return {order='read',nativeSkill1Id=168}end end`,
    'presentation.pokemblem.lua':identity('moves'),'features.growth.lua':identity('growth'),
    'features.analysis.lua':identity('analysis'),'presentation.prediction.lua':identity('prediction'),
    'presentation.forecast.lua':`return function()return function(v)v.order=v.order..'/forecast';v.ui={set={mainTab='Map',predictionPopup=false}};return v end end`,
    'presentation.english.lua':`return function()return function(v)v.order=v.order..'/english';v.nativeSkill1Description='Final ޅᢷ';return v end end`
  },expect:{order:'read/moves/growth/analysis/prediction/forecast/english',nativeSkill1Description:'Final [Lock] [Grass]',nativeSkill1Id:168}});
  assert.deepEqual(values.ui,{set:{mainTab:'Map',predictionPopup:false}});
});

test('future preparation translates the documented icons while retaining Physical/Special and real Unicode',()=>{
  let profile;const context={TextDecoder,Uint8Array,FE8PublicPrep:{prepare(...args){profile=args[4];}}};
  for(const file of ['site/latin-text.js','site/profiles/pokemblem/prepare.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  context.PokemblemPrep.prepare();
  const decode=text=>profile.decodeText([...new TextEncoder().encode(text)]).replace(/\s+/g,' ').trim();
  for(const [glyph,label]of glyphs)assert.equal(decode(glyph),'['+label+']');
  assert.equal(decode('ޅᢷ'),'[Lock] [Grass]');
  assert.equal(decode('ᢻ Move'),'Physical: Move');assert.equal(decode('ᢼ Move'),'Special: Move');
  assert.equal(decode('Pokémon “♀♂” 未知 ᣃ'),'Pokémon “♀♂” 未知 ᣃ');
  assert.equal(profile.decodeText([65,0x10,1,2,66,0x80,1,7,67]),'ABC');
});
