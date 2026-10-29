import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory,executeProject} from '../scripts/runtime-validation-engine.mjs';

const ids=['bells-of-byelen','cerulean-crescent','pokemblem','morrows-golden-country','sun-gods-wrath'];
const profiles=ids.map(id=>JSON.parse(fs.readFileSync('site/profiles/'+id+'/profile.json')));
const load=(context,file)=>vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),context,{filename:file});

test('custom hack templates retain approved release versions and exact ROM refusal',async()=>{
  const context={structuredClone,TextEncoder,TextDecoder,Uint8Array,Buffer};
  for(const file of ['runtime-modules.js','theme.js','radar.js','latin-text.js',
    'profiles/fe6-remastered/template.js','profiles/fe8-vietnamese/template.js',
    'profiles/fe8-vietnamese/prepare.js','profiles/fe8-english/template.js',
    'profiles/voids-blitzarre/template.js','profiles/hag-in-white/template.js'])load(context,file);
  for(const profile of profiles){
    load(context,'profiles/'+profile.id+'/template.js');
    load(context,'profiles/'+profile.id+'/prepare.js');
    const template=context[profile.template];
    assert.equal(template.manifest.version,'1.0.0');
    assert.equal(profile.status,'stable');
    assert.deepEqual(JSON.parse(JSON.stringify(template.manifest.match)),{gameCode:[profile.code],crc32:[profile.crc32]});
    assert.equal(Object.keys(template.files).length,0,'No extracted game assets in source templates');
    if(profile.id==='pokemblem'){
      assert.equal(profile.cursorNavigationVerified,false);
      assert(!JSON.stringify(template.layout).includes('focusMapUnit'),'Free-movement ROM must not offer unverified game cursor actions');
      assert(!JSON.stringify(template.layout).includes('map-danger-button'),'Move-based range controls stay unavailable');
      assert(!JSON.stringify(template.layout).includes('{rankSword}'),'Move IDs are never shown as FE rank letters');
    }
    const wrong=new Uint8Array(256);wrong.set(new TextEncoder().encode(profile.code),0xAC);
    await assert.rejects(context[profile.api].prepare(wrong,template,null),new RegExp(profile.crc32));
  }
});

test('all custom profiles preserve extended class tables and exact skill/cap contracts',()=>{
  const expected={
    'bells-of-byelen':[0x1114B80,132,0x17D9BD0,0x1114AEC],
    'cerulean-crescent':[0x125C970,255,0xB408F8,0xB2C020],
    'pokemblem':[0x13098AC,255,0x164CF40,0x13093B0],
    'morrows-golden-country':[0x807110,128,0x17BECE4,0x17A4504],
    'sun-gods-wrath':[0x1EC9CBC,256,0x1EFB87C,0x1EC9BBC]
  };
  for(const profile of profiles){
    let captured;
    const context={TextDecoder,Uint8Array,CompanionLatinText:()=>'',FE8PublicPrep:{prepare(...args){captured=args[4];}}};
    load(context,'profiles/'+profile.id+'/prepare.js');
    context[profile.api].prepare();
    assert.equal(captured.classes,expected[profile.id][0]);
    assert.equal(captured.classCount,expected[profile.id][1]);
    assert.equal(captured.crc32,parseInt(profile.crc32,16));
    const source=fs.readFileSync('site/profiles/'+profile.id+'/prepare.js','utf8');
    assert(source.includes('entry:0x'+(expected[profile.id][2]+0x08000000).toString(16).toUpperCase()));
    assert(source.includes('r.u8(0x'+expected[profile.id][3].toString(16).toUpperCase()+'+id)'));
  }
});

test('Pokemblem decodes compact UTF-8 letters and preserves FE control handling',()=>{
  let profile;
  const context={TextDecoder,Uint8Array,FE8PublicPrep:{prepare(...args){profile=args[4];}}};
  load(context,'latin-text.js');load(context,'profiles/pokemblem/prepare.js');
  context.PokemblemPrep.prepare();
  assert.equal(profile.allowEmptyPortraits,true);
  assert.equal(profile.decodeText(Array.from(new TextEncoder().encode('Aᵇᶜᵈ'))),'Abcd');
  assert.equal(profile.decodeText(Array.from(new TextEncoder().encode('\u0299eta'))),'Beta');
  assert.equal(profile.decodeText([65,0x10,1,2,66,0x80,1,7,67]),'ABC');
  assert.equal(profile.decodeText([0x81,0x85]),'ae','Legacy compact glyph fallback remains available');
});

test('Pokemblem translates physical and special font icons without stripping real accents',()=>{
  let profile;
  const context={TextDecoder,Uint8Array,FE8PublicPrep:{prepare(...args){profile=args[4];}}};
  load(context,'latin-text.js');load(context,'profiles/pokemblem/prepare.js');
  context.PokemblemPrep.prepare();
  const suffix=Array.from(new TextEncoder().encode(' Move details. Pok\u00e9mon, \u00f4, \u00ea.'));
  assert.equal(profile.decodeText([0xE1,0xA2,0xBB,...suffix]),'Physical: Move details. Pok\u00e9mon, \u00f4, \u00ea.');
  assert.equal(profile.decodeText([0xE1,0xA2,0xBC,...suffix]),'Special: Move details. Pok\u00e9mon, \u00f4, \u00ea.');
  assert.equal(profile.decodeText(Array.from(new TextEncoder().encode('\u00f4 Pok\u00e9mon'))),'\u00f4 Pok\u00e9mon');
});

test('Cerulean and Sun export native affinity rows instead of retail constants',async()=>{
  for(const id of ['cerulean-crescent','sun-gods-wrath']){
    let profile;const context={TextDecoder,Uint8Array,CompanionLatinText:()=>'',FE8PublicPrep:{prepare(...args){profile=args[4];}}};
    load(context,'profiles/'+id+'/prepare.js');context[profiles.find(p=>p.id===id).api].prepare();
    const support=0x1000,row=[1,3,2,5,4,0,6,0];
    const reader={u32:at=>at===0x28534?0x08000000+support:0,u16:()=>0,text:()=>'',u8:at=>at>=support&&at<support+56?(at-support)%8===0?Math.floor((at-support)/8)+1:row[(at-support)%8]:0};
    const data={chars:{},mapMeta:{chars:{}},growthCharacters:{},growthClasses:{},fe8Chapters:[]};
    await profile.prepareExtra({reader,bytes:new Uint8Array(0x2000),data,project:{files:{}},options:{},image:()=>{throw Error('Unexpected image');}});
    for(const affinity of ['Fire','Thunder','Wind','Ice','Dark','Light','Anima']){
      assert.equal(data.lookup27[affinity],1.5);assert.equal(data.lookup28[affinity],1);
      assert.equal(data.lookup29[affinity],2.5);assert.equal(data.lookup30[affinity],2);
      assert.equal(data.lookup31[affinity],0);assert.equal(data.lookup32[affinity],3);
    }
    const wrong={...reader,u8:()=>0};
    await assert.rejects(profile.prepareExtra({reader:wrong,bytes:new Uint8Array(0x2000),data,project:{files:{}},options:{}}),/affinity table/);
  }
});

test('Cerulean and Morrow preserve bounded EWRAM name recipes at preparation',async()=>{
  for(const id of ['cerulean-crescent','morrows-golden-country']){
    let profile;const context={TextDecoder,Uint8Array,CompanionLatinText:()=>'',FE8PublicPrep:{prepare(...args){profile=args[4];}}};
    load(context,'profiles/'+id+'/prepare.js');context[profiles.find(p=>p.id===id).api].prepare();
    const pointer=0x08000000+profile.characters+52,textId=0x41,support=0x1000;
    const reader={u32:at=>at===0x28534?0x08000000+support:at===profile.text+textId*4?0x8202BD10:0,u16:at=>at===pointer-0x08000000?textId:0,text:()=>'',u8:at=>at>=support&&at<support+56&&(at-support)%8===0?Math.floor((at-support)/8)+1:0};
    const records=()=>({[pointer]:{name:'Masked ROM garbage',id:1}});
    const data={chars:records(),mapMeta:{chars:records()},forecastChars:records(),equipmentChars:records(),lookup10:{[pointer]:'Masked ROM garbage'},growthCharacters:{},growthClasses:{},fe8Chapters:[]};
    await profile.prepareExtra({reader,bytes:new Uint8Array(0x2000),data,project:{files:{}},options:{},image:()=>{throw Error('Unexpected image');}});
    assert.equal(data.dynamicNames[pointer].address,0x0202BD10);assert.equal(data.dynamicNames[pointer].limit,16);
    assert.equal(data.lookup10[pointer],'Avatar');
    for(const table of [data.chars,data.mapMeta.chars,data.forecastChars,data.equipmentChars])assert.equal(table[pointer].name,'Avatar');
  }
});

test('RAM-backed FE8 names refresh all runtime consumers and retained support references',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    for(const id of ['cerulean-crescent','morrows-golden-country']){
      let bytes=Buffer.from('Alice\0ignored');engine.global.set('__nameByte',address=>bytes[address-0x0202BD10]??0);
      const source=fs.readFileSync('runtime/'+id+'/game.names.lua','utf8');
      await engine.doString(`mem={u8=function(address)return __nameByte(address)end};local function record()return {[100]={name='Avatar'}}end
        nameData={dynamicNames={[100]={address=0x0202BD10,limit=16}},nameGlyphs={},chars=record(),mapMeta={chars=record()},forecastChars=record(),equipmentChars=record(),growthCharacters=record(),lookup10={}}
        for n=0,255 do nameData.nameGlyphs[n+1]=n>=32 and n<127 and string.char(n) or '' end
        retainedSupportPartner=nameData.chars[100];nameApply=(function()${source}\nend)()(nameData);nameApply()`);
      for(const name of ['Alice','Bob','Avatar','ABCDEFGHIJKLMNOP']){
        bytes=Buffer.from(name==='Avatar'?'\0':name==='ABCDEFGHIJKLMNOP'?name+'Q':name+'\0');
        const result=await engine.doString(`nameApply();return {nameData.lookup10['100'],nameData.chars[100].name,nameData.mapMeta.chars[100].name,nameData.forecastChars[100].name,nameData.equipmentChars[100].name,nameData.growthCharacters[100].name,retainedSupportPartner.name}`);
        assert.deepEqual(result,Array(7).fill(name));
      }
    }
  }finally{engine.global.close();}
});

test('RAM name changes also refresh cached Talk labels and prompts',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    for(const id of ['cerulean-crescent','morrows-golden-country']){
      const source=fs.readFileSync('runtime/'+id+'/game.abilities.lua','utf8');
      const result=await engine.doString(`pack={require=function(name)
        if name=='features.native-skills' then return function()return function()return {}end end end
        if name=='game.talk' then return function()return function(v)v.talkAvailable=true;v.talkTargetId=3;v.talkTargetName='Avatar';v.talkPrompt='Talk to Avatar.'end end end
        error(name)
      end}
      local D={chars={[100]={id=3,name='Avatar'}},customProfile={split=false},skillConfig={},skillData={}}
      local abilities=(function()${source}\nend)()(D)
      D.chars[100].name='Alice';local first={};abilities.apply(first,nil)
      D.chars[100].name='Bob';local second={};abilities.apply(second,nil)
      return {first=first,second=second}`);
      assert.equal(result.first.talkTargetName,'Alice');assert.equal(result.first.talkPrompt,'Talk to Alice.');
      assert.equal(result.second.talkTargetName,'Bob');assert.equal(result.second.talkPrompt,'Talk to Bob.');
    }
  }finally{engine.global.close();}
});

test('custom growth uses native class-indexed caps, zero values and correct stat cardinality',async()=>{
  const factory=luaFactory();
  for(const profile of profiles){
    const engine=await factory.createEngine();
    try{
      const split=['pokemblem','morrows-golden-country'].includes(profile.id);
      const module=fs.readFileSync('runtime/'+profile.id+'/features.growth.lua','utf8');
      const result=await engine.doString(`
        pack={require=function(name)assert(name=='features.base-growth');return function()return function(v)return v end end end}
        ui={growthPopup=true}
        local D={customProfile={split=${split},supports=false,growthNote='Actual ROM base'},levelCaps={10,20,30},
          growthCharacters={[100]={growth={0,2,3,4,5,6,7},rates={0,2,3,4,5,6,7,8},radars={'seven'},radar='eight'}},
          growthClasses={[200]={id=2,caps={80,30,31,32,33,34,35,36}}}}
        local apply=(function()${module}\nend)()(D)
        return apply({unitPresent=true,characterPointer=100,classPointer=200,level=1,maxHp=0,str=0,mag=0,skill=0,spd=0,luck=0,def=0,res=0})
      `);
      assert.equal(result.growthLevelCap,30,'Class ID2 maps to Lua array slot3');
      assert.equal(result.growthLevelsLeft,29);
      assert.equal(result.growthHp,0,'Zero growth must survive');
      assert.equal(result.growthCalculationNote,'Actual ROM base');
      assert.equal(result.growthRadar,split?'eight':'seven');
      if(split){assert.equal(result.growthMag,3);assert.equal(result.growthHpCurrent,0);assert.equal(result.growthHpCap,80);}
    }finally{engine.global.close();}
  }
});

test('custom growth applies the traced promoted EXP bonus from character or class attributes',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    for(const profile of profiles){
      const source=fs.readFileSync('runtime/'+profile.id+'/features.growth.lua','utf8'),bonus=profile.id==='cerulean-crescent'?3:20;
      const result=await engine.doString(`pack={require=function()return function()return function(v)return v end end end};ui={}
        local D={customProfile={split=false,supports=true,promotedExpBonus=${bonus},hpEnemyCap=120},levelCaps={30,30},chars={[100]={attributes=0}},
          growthCharacters={[100]={growth={0,0,0,0,0,0,0},radars={}}},growthClasses={[200]={id=1,attributes=0,caps={80,20,20,20,20,20,30}}}}
        local apply=(function()${source}\nend)()(D);local function read(deployment)return apply({unitPresent=true,characterPointer=100,classPointer=200,level=9,deployment=deployment})end
        local normal=read(1);D.chars[100].attributes=0x100;local character=read(1)
        D.chars[100].attributes=0;D.growthClasses[200].attributes=0x100;local class=read(1);local enemy=read(129)
        return {normal=normal.growthExpLevel,character=character.growthExpLevel,class=class.growthExpLevel,enemyHp=enemy.growthHpCap}`);
      assert.equal(result.normal,9);assert.equal(result.character,9+bonus);assert.equal(result.class,9+bonus);
      if(['morrows-golden-country','sun-gods-wrath'].includes(profile.id))assert.equal(result.enemyHp,120);
    }
  }finally{engine.global.close();}
});

test('active HP ceilings and Pokemblem species Luck caps replace unrelated data bytes',async()=>{
  for(const id of ['cerulean-crescent','morrows-golden-country','sun-gods-wrath','pokemblem']){
    let profile;const context={TextDecoder,Uint8Array,CompanionLatinText:()=>'',FE8PublicPrep:{prepare(...args){profile=args[4];}}};
    load(context,'profiles/'+id+'/prepare.js');context[profiles.find(p=>p.id===id).api].prepare();
    const classAt=profile.classes+2*84,pointer=classAt+0x08000000,support=0x1000;
    const reader={u32:at=>at===0x28534?0x08000000+support:0,u16:()=>0,text:()=>'',u8:at=>{
      if(at>=support&&at<support+56&&(at-support)%8===0)return Math.floor((at-support)/8)+1;
      if(at===classAt+19)return 55;
      if(at===0x13094B0+2*4+3)return 35;
      if(at===0x2C016)return 60;
      return 20;
    }};
    const data={chars:{},mapMeta:{chars:{}},growthCharacters:{},growthClasses:{[pointer]:{id:2}},classes:{[pointer]:{id:2}},lookup10:{},lookup12:{},fe8Chapters:[]};
    await profile.prepareExtra({reader,bytes:{length:0x2000000,subarray:()=>new Uint8Array(7)},data,project:{files:{}},options:{}});
    const caps=data.growthClasses[pointer].caps;
    assert.equal(caps[0],id==='pokemblem'?55:id==='sun-gods-wrath'?60:80);
    if(id==='pokemblem')assert.equal(caps[5],35,'Luck comes from the species cap table, not an old instruction immediate');
  }
});

test('Pokemblem growth changes with species without changing the storage character',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    const module=fs.readFileSync('runtime/pokemblem/features.growth.lua','utf8');
    const result=await engine.doString(`
      pack={require=function()return function()return function(v)return v end end end}
      ui={growthPopup=true}
      local D={customProfile={split=true,supports=false,growthNote='Character + species'},levelCaps={100,100,100},
        growthCharacters={[100]={rates={10,5,5,5,5,5,5,40},radar='fallback'}},
        growthClasses={[200]={id=1,caps={45,30,35,25,30,60,30,30}},[300]={id=2,caps={55,40,40,35,30,60,30,40}}},
        classGrowths={[200]={50,30,35,40,20,20,30,35},[300]={60,45,45,45,25,20,30,45}},
        growthRadarCombinations={['10-5-5-5-5-5-5-40:200']='first',['10-5-5-5-5-5-5-40:300']='second'}}
      local apply=(function()${module}\nend)()(D)
      local a=apply({unitPresent=true,characterPointer=100,classPointer=200,level=1})
      local b=apply({unitPresent=true,characterPointer=100,classPointer=300,level=1})
      return {a=a,b=b}
    `);
    assert.equal(result.a.growthHp,60);assert.equal(result.b.growthHp,70);
    assert.equal(result.a.growthMag,40);assert.equal(result.b.growthMag,50);
    assert.equal(result.a.growthRadar,'first');assert.equal(result.b.growthRadar,'second');
  }finally{engine.global.close();}
});

test('unverified native prediction shows the reason on popup open and clears stale results',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    engine.global.set('rngSource',fs.readFileSync('runtime/shared/features.rng-indicator.lua','utf8'));
    await engine.doString(`mem={u16=function()return 0 end};pack={require=function(name)assert(name=='features.rng-indicator');return assert(load(rngSource))()end}`);
    for(const profile of profiles){
      const source=fs.readFileSync('runtime/'+profile.id+'/features.analysis.lua','utf8');
      const result=await engine.doString(`ui={predictionPopup=true};local apply=(function()${source}\nend)()({})
        local v={forecastActive=true,forecastactorHit=72,predictionAvailable=true,predictionComplete=true,predictionBusy=true,predictionProgress=99,
          rngAvailable=true,rngBattleActive=true,rngExpHit=10,rngExpKill=50,predictionDamageEligible=true,predictionKillEligible=true}
        local opened=apply(v);local reason=opened.analysisPredictionError
        ui.predictionPopup=false;local closed=apply({forecastActive=false,analysisFailed=true,analysisPredictionError='stale'})
        return {opened=opened,closed=closed,reason=reason}`);
      assert.equal(result.opened.forecastActive,true);assert.equal(result.opened.forecastactorHit,72);
      assert.equal(result.opened.analysisSupported,false);assert.equal(result.opened.analysisFailed,true);
      assert.equal(result.opened.predictionAvailable,false);assert.equal(result.opened.predictionDamageEligible,false);assert.equal(result.opened.predictionKillEligible,false);
      assert.equal(result.opened.rngExpHit,undefined);assert.equal(result.opened.rngExpKill,undefined);assert.equal(result.opened.predictionProgress,0);
      assert.match(result.reason,/not been verified/);assert.equal(result.opened.predictionFailureReason,result.reason);
      assert.equal(result.closed.analysisFailed,false);assert.equal(result.closed.analysisPredictionError,undefined);
    }
  }finally{engine.global.close();}
});

test('Pokemblem presents five native move IDs and strips only the accessory equipped flag',async()=>{
  const unit=0x02001000,ram=Buffer.alloc(0x40000),offset=unit-0x02000000;
  ram.set([26,18,48,120,0],offset+0x28);ram.writeUInt16LE(0x8A6C,offset+0x1E);ram.writeUInt16LE(0x8A30,offset+0x20);
  const source=fs.readFileSync('runtime/pokemblem/presentation.pokemblem.lua','utf8');
  const main=`local D={slots={[2]=${unit}},forecastItems={}}
    for _,id in ipairs({26,18,48,120})do D.forecastItems[id]={name='Move'..id,description='Move description',might=4,hit=90,weight=1,attributes=1}end
    D.forecastItems[108]={name='Berry',description='Restores HP.',attributes=0x400000}
    local apply=(function()${source}\nend)()(D)
    function update()return apply({unitPresent=ui.present,deployment=2,item1Uses=138,item1MaxDisplay=10,item2Uses=138,rankSword='C'})end`;
  const run=await executeProject({manifest:{script:'main.lua'},files:{'main.lua':Buffer.from(main).toString('base64')}},{ranges:[{address:0x02000000,bytes:ram}],steps:[
    {ui:{present:true},expect:{pokeMove1Name:'Move26',pokeMove2Name:'Move18',pokeMove3Name:'Move48',pokeMove4Name:'Move120',pokeMove5Present:false,item1Uses:10,item1UsesDisplay:10,item1MaxDisplay:10,item1AccessoryEquipped:true,item1Badge:'H',item2Uses:138,rankSword:'---'}},
    {ui:{present:true},patches:[{address:unit+0x1F,bytes:[10]}],expect:{item1AccessoryEquipped:false,item1Uses:10,item1Badge:''}},
    {ui:{present:false},expect:{pokeMove1Present:false,pokeMove1Name:'---',pokeMove1Description:'No move in this slot.',item1AccessoryEquipped:false}}
  ]});
  assert.equal(run.readOnly,true);assert.equal(run.calls.length,0);
});

test('Pokemblem combined-chart generation retains referenced fallbacks and UI icons',async()=>{
  let profile;const context={TextDecoder,Uint8Array,CompanionLatinText:()=>'',CompanionRom:{b64:bytes=>Buffer.from(bytes).toString('base64')},FE8PublicPrep:{prepare(...args){profile=args[4];}}};
  load(context,'profiles/pokemblem/prepare.js');context.PokemblemPrep.prepare();
  const cp=0x08803D64,kp=0x08000000+profile.classes+84;
  const data={chars:{[cp]:{id:1}},growthCharacters:{[cp]:{growth:[10,5,5,5,5,5,40],radars:['asset:images/growth/old-seven-0.png','asset:images/growth/old-seven-5.png']}},growthClasses:{[kp]:{id:1}},classes:{[kp]:{id:1}},lookup12:{},fe8Chapters:[]};
  const project={files:{'assets/images/growth/icon-close.png':'close','assets/images/growth/icon-analysis.png':'analysis','assets/images/growth/old-seven-0.png':'old','assets/images/growth/old-seven-5.png':'old'}};
  await profile.prepareExtra({reader:{u8:()=>5,u16:()=>0,u32:()=>0,text:()=>''},bytes:{length:0x2000000,subarray:()=>new Uint8Array([50,30,40,20,20,30,35])},data,project,options:{renderRadar:async()=>new Uint8Array([1,2,3])}});
  assert.equal(project.files['assets/images/growth/icon-close.png'],'close');assert.equal(project.files['assets/images/growth/icon-analysis.png'],'analysis');
  assert.equal(project.files['assets/images/growth/old-seven-0.png'],undefined);
  function check(value){if(typeof value==='string'&&value.startsWith('asset:'))assert(project.files['assets/'+value.slice(6)],'Missing referenced asset: '+value);else if(value&&typeof value==='object')Object.values(value).forEach(check);}
  check(data.growthCharacters);check(data.growthRadarCombinations);
});

test('Pokemblem maps current species names and suppresses unverified ranges without game writes',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    const source=fs.readFileSync('runtime/pokemblem/game.map.lua','utf8');
    const result=await engine.doString(`local config={showRanges=true};local positions={{id=2,name='P-01',x=1,y=2,member=true,selected=true},{id=1,name='Oak',member=true}}
      local species={name='Bulbasaur'}
      mem={u32=function(address)return address==0x02001004 and 100 or 200 end}
      ui={mapDangerEnabled=true,mapPickedId=129,mapPickedContext='native-context'}
      local original=ui
      pack={require=function(name)assert(name=='game.fe8-map');return function()return {meta={classes={[100]=species,[200]={name='--'}}},config=config,apply=function(v)
        assert(ui.mapDangerEnabled==false);assert(config.showRanges==false)
        assert(ui.mapPickedId==129 and ui.mapPickedContext=='native-context')
        v.mapRoster=positions;v.mapCells={{member=true,danger=true,attack=true,move=true,inRange=true,rangeColor='red'}}
      end}end end}
      local map=(function()${source}\nend)()({slots={[2]=0x02001000,[1]=0x02001100}});local v={};map.apply(v,nil,false)
      assert(ui==original and ui.mapDangerEnabled==true)
      assert(v.mapRoster[1].name=='Bulbasaur' and v.mapRangeUnit=='Bulbasaur')
      species.name='Ivysaur';map.apply(v,nil,false)
      return v`);
    assert.equal(result.mapRangesUnavailable,true);assert.equal(result.mapDangerReady,false);assert.equal(result.mapDangerEnabled,false);
    assert.equal(result.mapCells[0].member,true);assert.equal(result.mapCells[0].attack,false);assert.equal(result.mapCells[0].danger,false);assert.equal(result.mapCells[0].inRange,false);
    assert.equal(result.mapRoster[0].x,1);assert.equal(result.ui.set.mapDangerEnabled,false);
    assert.equal(result.mapRoster[0].id,2);assert.equal(result.mapRoster[0].name,'Ivysaur');assert.equal(result.mapRangeUnit,'Ivysaur');assert.equal(result.mapRoster[1].name,'Oak');
  }finally{engine.global.close();}
});

test('Pokemblem companion selection honors visible picks and native selection without game writes',async()=>{
  const ram=Buffer.alloc(0x40000),base=0x02000000;
  const w8=(a,v)=>{ram[a-base]=v;},w16=(a,v)=>ram.writeUInt16LE(v,a-base),w32=(a,v)=>ram.writeUInt32LE(v,a-base);
  const avatar=0x02001000,creature=0x02001080,enemy=0x02001100;
  w16(0x02003000,3);w16(0x02003002,1);w32(0x02003004,0x02002000);w32(0x02002000,0x02002100);
  w8(0x02003010,1);w16(0x02003012,2);w16(0x02003014,0);w16(0x02003016,0);
  for(const [u,id,kp,x]of [[avatar,1,0x08000200,0],[creature,2,0x08000300,1],[enemy,129,0x08000400,2]]){
    w32(u,0x08000100);w32(u+4,kp);w8(u+11,id);w8(u+16,x);w8(u+17,0);w8(u+19,10);w8(0x02002100+x,id);
  }
  const main=`
    local choose=pack.require('game.selection')
    local D={chars={[0x08000100]={}},classes={[0x08000200]={name='--'},[0x08000300]={name='Creature'},[0x08000400]={name='Enemy'}},slots={[1]=${avatar},[2]=${creature},[129]=${enemy}}}
    local profile={mapWidth=0x02003000,mapHeight=0x02003002,unitRows=0x02003004,chapter=0x02003010,turn=0x02003012,cursorX=0x02003014,cursorY=0x02003016}
    function update()local v={unitLocked=ui.locked};local u=choose(D,profile,${avatar},v,ui.preparations);return {selected=u,party=v.partyFocus==true,picked=v.companionPicked==true}end`;
  const files={'main.lua':Buffer.from(main).toString('base64'),'game.selection.lua':fs.readFileSync('runtime/pokemblem/game.selection.lua').toString('base64')};
  const result=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:base,bytes:ram}],steps:[
    {ui:{},expect:{selected:creature,party:true,picked:false}},
    {ui:{mapPickedId:129,mapPickedContext:'1:2:0:0'},expect:{selected:enemy,picked:true}},
    {ui:{mapPickedId:129,mapPickedContext:'1:1:0:0'},expect:{selected:creature,picked:false}},
    {ui:{locked:true,mapPickedId:129,mapPickedContext:'1:2:0:0'},expect:{selected:avatar}},
    {ui:{preparations:true},expect:{selected:avatar}},
    {ui:{mapPickedId:129,mapPickedContext:'1:2:0:0'},patches:[{address:enemy+12,bytes:[0,2,0,0]}],expect:{selected:creature,picked:false}}
  ]});
  assert.equal(result.readOnly,true);assert.equal(result.calls.length,0);
});

test('Pokemblem lifecycle accepts a valid companion pick while the game cursor is empty',async()=>{
  const engine=await luaFactory().createEngine();
  try{
    const units=fs.readFileSync('runtime/pokemblem/game.units.lua','utf8');
    const result=await engine.doString(`
      local profile={processPool=0,activeUnit=1,phase=2,mapWidth=3,mapHeight=4,cursorX=5,cursorY=6,unitRows=7,playerPcStart=1,playerPcEnd=2,enemyPcStart=1,enemyPcEnd=2}
      local picked=0x02001000;local mem8={[picked+11]=2,[picked+19]=10};local mem32={[7]=0x02002000,[0x02002000]=0x02002100,[picked]=100,[picked+4]=200}
      mem={u8=function(a)return mem8[a] or 0 end,s8=function(a)return mem8[a] or 0 end,u16=function(a)return a==3 and 2 or a==4 and 1 or 0 end,u32=function(a)return mem32[a] or 0 end}
      local empty=function()return {unitPresent=false}end
      pack={require=function(name)
        if name=='game.profile' then return profile end
        if name=='game.selection' then return function(_,_,unit,v)assert(unit==nil);v.companionPicked=true;return picked end end
        if name=='presentation.defaults' then return function()return empty end end
        if name=='game.preparations' then return function()return function()return nil,false end end end
        if name=='game.bindings' then return function()return function(v)return v end end end
        if name=='game.items' or name=='game.battle' then return function()return function()end end end
        error(name)
      end}
      local D={chars={[100]={}},classes={[200]={}},slots={[2]=picked}}
      local read=(function()${units}\nend)()(D,{config={},apply=function()end,meta={}},{truth=function(x)return x end},{apply=function()end})
      return read()`);
    assert.equal(result.unitPresent,true);assert.equal(result.deployment,2);assert.equal(result.companionPicked,true);
  }finally{engine.global.close();}
});
