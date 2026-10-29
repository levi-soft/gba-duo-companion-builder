import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const ids=['iron-emblem','the-four-kings','the-lonely-mirror','dream-of-five','dark-lord-maiden-of-light'];
const files=['runtime-modules.js','theme.js','radar.js','latin-text.js',
 'profiles/fe7-vietnamese/template.js','profiles/fe7-vietnamese/prepare.js',
 'profiles/fe6-remastered/template.js','profiles/fe8-vietnamese/template.js','profiles/fe8-vietnamese/prepare.js',
 'profiles/fe7-english/template.js','profiles/fe8-english/template.js','profiles/voids-blitzarre/template.js'];
function context(){
 const c={structuredClone,TextEncoder,TextDecoder,Uint8Array,Buffer};
 for(const file of [...files,...ids.flatMap(id=>['profiles/'+id+'/template.js','profiles/'+id+'/prepare.js'])])
  vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),c,{filename:file});
 return c;
}
const metadata=id=>JSON.parse(fs.readFileSync('site/profiles/'+id+'/profile.json'));
const encoded=source=>Buffer.from(source).toString('base64');

test('new classic companions keep native pack bindings and refuse other ROM revisions',async()=>{
 const c=context();
 for(const id of ids){
  const p=metadata(id),template=c[p.template],layout=JSON.stringify(template.layout);
  assert.deepEqual(structuredClone(template.manifest.match),{gameCode:[p.code],crc32:[p.crc32]});
  assert.equal(template.manifest.version,'1.0.0');assert.equal(template.uiLanguage,'en');
  for(const field of ['talkAvailable','Growth rates','Battle analysis'])assert(layout.includes(field),id+': '+field);
  assert.equal(layout.includes('nativeSkill6Icon'),id==='the-four-kings');
  assert(!layout.includes('growthMagCurrent'),'these ROMs use a shared power stat');
  const rom=new Uint8Array(256);rom.set(new TextEncoder().encode(p.code),0xac);
  await assert.rejects(c[p.api].prepare(rom,template,null),new RegExp('CRC32 '+p.crc32));
 }
});

test('classic FE8 adapters read changed affinity bonuses and native chapter prefixes',async()=>{
 const c=context();let profile;c.FE8PublicPrep.prepare=(a,b,d,e,p)=>{profile=p;};
 for(const id of ids.filter(id=>metadata(id).code==='BE8E')){
  c[metadata(id).api].prepare();
  const data={fe8Chapters:[{name:'Ch17x: Guarded Keep'},{name:'A Branch Without a Number'}]};
  const reader={u8:at=>at>=0x200&&at<0x238?((at-0x200)%8===0?1+Math.floor((at-0x200)/8):6):0,
   u16:()=>0,u32:at=>at===0x28534?0x08000200:0,text:()=>''};
  await profile.prepareExtra({reader,bytes:new Uint8Array(0x1000),data,image:()=>{throw Error('No image required for an empty skill table');}});
  assert.equal(data.lookup27.Fire,3);assert.equal(data.lookup32.Anima,3);
  assert.equal(data.fe8Chapters[0].label,'Ch17x');assert.equal(data.fe8Chapters[0].name,'Guarded Keep');
  assert.equal(data.fe8Chapters[1].label,'Chapter');
  assert.equal(data.fe8Chapters[1].name,'A Branch Without a Number');
 }
});

test('DLATMOL preserves RAM-backed avatar names as runtime recipes',()=>{
 const c=context();let profile;c.FE7PublicPrep.prepare=(a,b,d,e,p)=>{profile=p;};c.DarkLordMaidenOfLightPrep.prepare();
 const pointer=0x08BDCE80,old='Old decoded bytes';
 const data={mapMeta:{chars:{[pointer]:{name:old}}},growthCharacters:{[pointer]:{name:old}},lookup12:{[pointer]:old},lookup14:{1:old}};
 const reader={u8:at=>at>=0x200&&at<0x238?((at-0x200)%8===0?1+Math.floor((at-0x200)/8):2):0,
  u16:at=>at===pointer-0x08000000?0x4DD:0,
  u32:at=>at===0x26998?0x08000200:at===0x12CB8?0x08B808AC:at===0xB808AC+0x4DD*4?0x8202BC18:0};
 profile.prepareExtra({reader,bytes:new Uint8Array(0x1000),data});
 assert.equal(profile.chapterCount,69);
 assert.deepEqual(structuredClone(data.dynamicNames[pointer]),{address:0x0202BC18,limit:16});
 assert.equal(data.lookup12[pointer],'Avatar');assert.equal(data.lookup14[1],'Avatar');
 assert.equal(data.mapMeta.chars[pointer].name,'Avatar');assert.equal(data.nameGlyphs[77],'M');
});

test('avatar rename updates unit, map, growth and support fields without writing RAM',async()=>{
 const source=fs.readFileSync('runtime/dark-lord-maiden-of-light/game.names.lua','utf8');
 const project={manifest:{script:'main.lua'},files:{'game.names.lua':encoded(source),'main.lua':encoded(`
   local D={dynamicNames={[1]={address=0x02000000,limit=16}},mapMeta={chars={[1]={name='Avatar'}}},
    lookup12={['1']='Avatar'},growthCharacters={[1]={name='Avatar'}},lookup14={['2']='Avatar'},nameGlyphs={}}
   for byte=0,255 do D.nameGlyphs[byte+1]=byte>=32 and byte<127 and string.char(byte) or '' end
   local apply=pack.require('game.names')(D)
   function update()apply();return{name=D.lookup12['1'],map=D.mapMeta.chars[1].name,
     growth=D.growthCharacters[1].name,support=D.lookup14['2']}end
 `)}};
 const initial=Buffer.alloc(16);initial.write('Mark');
 const result=await executeProject(project,{ranges:[{address:0x02000000,bytes:initial}],steps:[
  {ticks:2,expect:{name:'Mark',map:'Mark',growth:'Mark',support:'Mark'}},
  {ticks:2,patches:[{address:0x02000000,bytes:[77,105,114,97,0]}],expect:{name:'Mira',map:'Mira',growth:'Mira',support:'Mira'}},
  {ticks:1,patches:[{address:0x02000000,bytes:[0]}],expect:{name:'Avatar',map:'Avatar',growth:'Avatar',support:'Avatar'}}
 ]});
 assert.equal(result.readOnly,true);
});

test('Four Kings skill selection clears stale icons when the next unit has fewer skills',async()=>{
 const project={manifest:{script:'main.lua'},files:{
  'game.abilities.lua':encoded(fs.readFileSync('runtime/the-four-kings/game.abilities.lua','utf8')),
  'features.native-skills.lua':encoded('return function()return function(unit)if unit==1 then return {1,2,3,4,5,6} elseif unit==2 then return {3} else return {} end end end'),
  'game.talk.lua':encoded('return function()return function(v,u)v.talkAvailable=false end end'),
  'main.lua':encoded(`local D={skillData={}};for n=1,6 do D.skillData[n]={name='Skill '..n,icon='asset:skill'..n..'.png',description='Description '..n}end
    local apply=pack.require('game.abilities')(D).apply;local v={}
    function update()apply(v,mem.u8(0x02000000));return v end`)
 }};
 const result=await executeProject(project,{ranges:[{address:0x02000000,bytes:[1]}],steps:[
  {ticks:1,expect:{nativeSkillCount:6,nativeSkill6Present:true,nativeSkill6Icon:'asset:skill6.png'}},
  {ticks:1,patches:[{address:0x02000000,bytes:[2]}],expect:{nativeSkillCount:1,nativeSkill1Name:'Skill 3',nativeSkill6Present:false,nativeSkill6Icon:'',nativeSkill6Description:''}},
  {ticks:1,patches:[{address:0x02000000,bytes:[0]}],expect:{nativeSkillCount:0,nativeSkill1Present:false,nativeSkill1Name:'',nativeSkill1Icon:''}}
 ]});
 assert.equal(result.readOnly,true);
});

test('DLATMOL earned support cards follow the avatar name after initialization and renaming',async()=>{
 const cp=0x08000040,avatar=0x08000080,support=0x08000100,unit=0x02000100;
 const rom=Buffer.alloc(0x200);rom[cp-0x08000000+4]=1;rom[avatar-0x08000000+4]=2;
 rom.writeUInt32LE(support,cp-0x08000000+44);rom[support-0x08000000]=2;rom[support-0x08000000+0x15]=1;
 const ram=Buffer.alloc(0x200);ram.write('Mark');ram[unit-0x02000000+0x32]=100;
 const project={manifest:{script:'main.lua'},files:{
  'game.names.lua':encoded(fs.readFileSync('runtime/dark-lord-maiden-of-light/game.names.lua','utf8')),
  'game.support.lua':encoded(fs.readFileSync('runtime/dark-lord-maiden-of-light/game.support.lua','utf8')),
  'features.support.lua':encoded(fs.readFileSync('runtime/shared/features.support.lua','utf8')),
  'main.lua':encoded(`local D={lookup12={['${cp}']='Lynn',['${avatar}']='Avatar'},lookup3={},slots={[1]=${unit}},
    dynamicNames={[${avatar}]={address=0x02000000,limit=16}},mapMeta={chars={[${avatar}]={name='Avatar'}}},growthCharacters={},nameGlyphs={}}
   for byte=0,255 do D.nameGlyphs[byte+1]=byte>=32 and byte<127 and string.char(byte) or '' end
   local names=pack.require('game.names')(D);local cards=pack.require('game.support')(D)
   function update()names();return cards({unitPresent=true,deployment=1,characterPointer=${cp}})end`)
 }};
 const result=await executeProject(project,{rom,ranges:[{address:0x02000000,bytes:ram}],steps:[
  {ticks:2,expect:{support1Name:'Mark',support1Rank:'C'}},
  {ticks:2,patches:[{address:0x02000000,bytes:[77,105,114,97,0]}],expect:{support1Name:'Mira',support1Rank:'C'}},
  {ticks:1,patches:[{address:0x02000000,bytes:[0]}],expect:{support1Name:'Avatar'}}
 ]});
 assert.equal(result.readOnly,true);
});

test('Four Kings explicitly withholds unsupported predictions and clears the state on exit',async()=>{
 const project={manifest:{script:'main.lua'},files:{
  'features.analysis.lua':encoded(fs.readFileSync('runtime/the-four-kings/features.analysis.lua','utf8')),
  'presentation.prediction.lua':encoded(fs.readFileSync('runtime/shared/presentation.prediction.lua','utf8')),
  'main.lua':encoded(`local apply=pack.require('features.analysis')({});local present=pack.require('presentation.prediction')()
   function update()return present(apply({forecastActive=mem.u8(0x02000000)==1,exp=99,level=1,deployment=1}))end`)
 }};
 const result=await executeProject(project,{ranges:[{address:0x02000000,bytes:[1]},{address:0x03000000,bytes:Buffer.alloc(6)}],steps:[
  {ticks:3,expect:{analysisSupported:false,analysisFailed:true,analysisReady:false,predictionAvailable:false,predictionComplete:false,predictionBusy:false,predictionContext:'Conditional EXP and level-up prediction are unavailable for this ROM revision.'}},
  {ticks:1,patches:[{address:0x02000000,bytes:[0]}],expect:{analysisFailed:false,analysisPresent:false,predictionAvailable:false,predictionComplete:false}},
  {ticks:1,ui:{predictionPopup:true},expect:{analysisFailed:true,analysisPresent:false,predictionAvailable:false,predictionContext:'Conditional EXP and level-up prediction are unavailable for this ROM revision.'}},
  {ticks:1,expect:{analysisFailed:false,analysisPredictionError:undefined}}
 ]});
 assert.equal(result.readOnly,true);
});

function abilityFixture(context,id){
 let profile;context.FE8PublicPrep.prepare=(a,b,d,e,p)=>{profile=p;};context[metadata(id).api].prepare();
 const ranges={
  'iron-emblem':{shot:[98,91],pierce:[35,36],shield:[97,12],slayer:[111,96],crit:15},
  'dream-of-five':{shot:[74,75],pierce:[74,75],shield:[109,110],slayer:[74,75],crit:20},
  'the-lonely-mirror':{shot:[29,30],pierce:[34,36],shield:[11,12],slayer:[60,60],crit:15}
 }[id];
 const bytes=new Map([[0x2B22A,ranges.shot[0]],[0x2B226,ranges.shot[1]],[0x2B2AE,ranges.pierce[0]],[0x2B2AA,ranges.pierce[1]],
  [0x2B34A,ranges.shield[0]],[0x2B346,ranges.shield[1]],[0x16C98,ranges.slayer[0]],[0x16C94,ranges.slayer[1]],[0x2AC4A,ranges.crit],[0x23E90,51],
  [0x300,23],[0x301,13],[0x400,181],[0x401,221],[0x402,253],[0x403,221],[0x125D334+253*36+31,3]]);
 const reader={u8:at=>bytes.get(at)??(at>=0x200&&at<0x238&&(at-0x200)%8===0?Math.floor((at-0x200)/8)+1:0),u16:()=>0,
  u32:at=>at===0x28534?0x08000200:at===0x170DDC?0x08000300:at===0x15E210?0x08000400:0,text:()=>''};
 const data={fe8Chapters:[],forecastItems:{253:{}}};profile.prepareExtra({reader,bytes:new Uint8Array(0x1000),data});
 return {data,profile,reader};
}

test('CLASSIC ability contracts read changed native ranges and bounded custom tables',()=>{
 const c=context();
 for(const id of ['iron-emblem','dream-of-five','the-lonely-mirror']){
  const {data}=abilityFixture(c,id),config=data.nativeAbilityConfig;
  assert.equal(config.critBonus,id==='dream-of-five'?20:15);
  if(id==='iron-emblem'){assert(config.shot.first>config.shot.last);assert(config.shield.first>config.shield.last);assert(config.slayer.first>config.slayer.last);assert.deepEqual(Object.keys(config.pickClasses),['13','23']);}
  if(id==='dream-of-five'){assert.equal(config.shot.first,74);assert.equal(config.pierce.last,75);assert.equal(config.shield.first,109);assert.equal(config.slayer.last,75);}
  if(id==='the-lonely-mirror'){
   assert.equal(config.pierce.first,34);assert.equal(config.pierce.chance,'Skill');assert.equal(config.shield.chance,'enemy Defense');
   assert.deepEqual(Object.keys(data.battleConfig.noFollowUpItems),['181','221','253']);assert.equal(data.forecastItems[253].weaponEffect,3);
  }
 }
 const {profile,reader}=abilityFixture(c,'the-lonely-mirror');
 assert.throws(()=>profile.prepareExtra({reader:{...reader,u8:at=>at>=0x400&&at<0x500?1:reader.u8(at)},bytes:new Uint8Array(0x1000),data:{forecastItems:{}}}),/Unterminated.*follow-up/);
});

test('CLASSIC native ability cards follow ROM classes, proc operands and changed critical bonus',async()=>{
 const c=context(),unit=0x02000100,cp=0x08000100,kp=id=>0x08001000+id*84;
 const cases={
  'iron-emblem':[[27,0,[]],[11,0,[]],[43,0,[]],[35,0,['Pierce']],[13,0,['Pick']],[23,0,['Pick']],[51,0,[]]],
  'dream-of-five':[[27,0,[]],[35,0,[]],[43,0,[]],[74,0,['Sure Shot','Pierce','Slayer']],[75,0,['Sure Shot','Pierce','Slayer']],[109,0,['Great Shield']],[110,0,['Great Shield']],[1,64,['Crit +20']]],
  'the-lonely-mirror':[[27,0,[]],[29,0,['Sure Shot']],[30,0,['Sure Shot']],[34,0,['Pierce']],[35,0,['Pierce']],[36,0,['Pierce']],[11,0,['Great Shield']],[43,0,[]],[60,0,['Slayer']]]
 };
 for(const [id,checks]of Object.entries(cases)){
  const {data}=abilityFixture(c,id),classes=checks.map(([n])=>`['${kp(n)}']={${n},0}`).join(','),ram=Buffer.alloc(8);ram.writeUInt32LE(cp);
  const project={manifest:{script:'main.lua'},files:{
   'game.native-abilities.lua':encoded(fs.readFileSync('runtime/'+id+'/game.native-abilities.lua','utf8')),
   'main.lua':encoded(`local D={nativeAbilityConfig=${c.CompanionRom.luaValue(data.nativeAbilityConfig)},nativeClasses={${classes}},nativeCharacters={}}
    local apply=pack.require('game.native-abilities')(D).apply;local v={}
    function update()D.nativeCharacters[tostring(${cp})]=ui.attributes or 0;local selected=${unit};if ui.empty then selected=nil end;apply(v,selected);return v end`)
  }};
  const steps=checks.map(([n,attributes])=>{const bytes=Buffer.alloc(4);bytes.writeUInt32LE(kp(n));return {ui:{attributes},patches:[{address:unit+4,bytes}]};});steps.push({ui:{empty:true},expect:{nativeSkillCount:0,nativeSkill1Present:false,nativeSkill4Description:''}});
  const run=await executeProject(project,{ranges:[{address:unit,bytes:ram}],steps});
  checks.forEach(([n,attributes,expected],index)=>{
   const v=run.values[index],names=[];for(let slot=1;slot<=4;slot++)if(v['nativeSkill'+slot+'Present'])names.push(v['nativeSkill'+slot+'Name']);
   assert.deepEqual(names,expected,id+' class '+n);assert.equal(v.nativeSkillCount,expected.length);
   if(id==='the-lonely-mirror'&&n===34)assert(v.nativeSkill1Description.includes('Skill%'));
   if(id==='the-lonely-mirror'&&n===11)assert(v.nativeSkill1Description.includes('enemy Defense%'));
  });
  assert.equal(run.readOnly,true);
 }
});

test('DLATMOL Talk targets track bounded avatar renames and clear after their event flag',async()=>{
 const cp=0x08000040,avatar=0x08000080,unit=0x02000100,target=0x02000180,ram=Buffer.alloc(0x300);ram.write('Mark');ram.writeUInt32LE(cp,unit-0x02000000);ram.writeUInt32LE(avatar,target-0x02000000);
 const project={manifest:{script:'main.lua'},files:{
  'game.names.lua':encoded(fs.readFileSync('runtime/dark-lord-maiden-of-light/game.names.lua','utf8')),
  'game.talk.lua':encoded(fs.readFileSync('runtime/dark-lord-maiden-of-light/game.talk.lua','utf8')),
  'main.lua':encoded(`local chars={[${cp}]={id=1,name='Source'},[${avatar}]={id=2,name='Avatar'}}
   local D={dynamicNames={[${avatar}]={address=0x02000000,limit=16}},mapMeta={chars=chars},lookup12={},growthCharacters={},nameGlyphs={}}
   for byte=0,255 do D.nameGlyphs[byte+1]=byte>=32 and byte<127 and string.char(byte) or '' end
   local names=pack.require('game.names')(D)
   local talk=pack.require('game.talk')({chars=chars,slots={[1]=${unit},[2]=${target}},talkConfig={chapter=0x02000200,temporaryFlags=0x02000210,permanentFlags=0x02000220},talkEvents={{{from=1,to=2,flag=1}}}})
   function update()names();local v={};talk(v,${unit});return v end`)
 }};
 const run=await executeProject(project,{ranges:[{address:0x02000000,bytes:ram}],steps:[
  {ticks:1,expect:{talkAvailable:true,talkTargetName:'Mark',talkPrompt:'Talk to Mark.'}},
  {ticks:1,patches:[{address:0x02000000,bytes:[77,105,114,97,0]}],expect:{talkTargetName:'Mira',talkPrompt:'Talk to Mira.'}},
  {ticks:1,patches:[{address:0x02000000,bytes:[0]}],expect:{talkTargetName:'Avatar'}},
  {ticks:1,patches:[{address:0x02000210,bytes:[1]}],expect:{talkAvailable:false,talkTargetName:'---',talkPrompt:'No available conversation.'}}
 ]});assert.equal(run.readOnly,true);
});

test('Iron and Dream export native weapon effects for drain identification',()=>{
 const c=context(),tables={'iron-emblem':0x809B10,'dream-of-five':0x1B00150};
 for(const [id,table]of Object.entries(tables)){
  const {profile,reader}=abilityFixture(c,id),data={fe8Chapters:[],forecastItems:{70:{},71:{}}};
  profile.prepareExtra({reader:{...reader,u8:at=>at===table+70*36+31?0:at===table+71*36+31?2:reader.u8(at)},bytes:new Uint8Array(0x1000),data});
  assert.equal(data.forecastItems[70].weaponEffect,0);assert.equal(data.forecastItems[71].weaponEffect,2);
 }
});

test('CLASSIC opt-in forecasts heal by weapon effect and reject false drain ID70',async()=>{
 const a=0x02000100,d=0x02000180,cp=0x08001000,kp=0x08002000,ram=Buffer.alloc(0x300);
 for(const [u,hp,can]of [[a,10,1],[d,30,0]]){
  const o=u-0x02000000;ram.writeUInt32LE(cp,o);ram.writeUInt32LE(kp,o+4);ram[o+11]=u===a?1:129;ram[o+18]=30;ram[o+19]=hp;ram[o+0x72]=hp;ram[o+0x52]=can;
  ram.writeInt16LE(15,o+0x5A);ram.writeInt16LE(5,o+0x5C);ram.writeInt16LE(5,o+0x5E);ram.writeInt16LE(100,o+0x64);ram.writeUInt32LE(1,o+0x4C);
 }
 for(const id of ['iron-emblem','dream-of-five','the-lonely-mirror']){
  const project={manifest:{script:'main.lua'},files:{
   'game.profile.lua':encoded(`return{battleActor=${a},battleTarget=${d}}`),
   'game.fe8-battle.lua':encoded(fs.readFileSync('runtime/'+id+'/game.fe8-battle.lua','utf8')),
   'game.fe8-followup-battle.lua':encoded(fs.readFileSync('runtime/shared/game.fe8-followup-battle.lua','utf8')),
   'main.lua':encoded(`local D={forecastChars={[${cp}]={name='Unit',portrait=''}},forecastClasses={[${kp}]={name='Class',portrait=''}},forecastItems={}}
    for _,id in ipairs({17,70,71,217,242})do D.forecastItems[id]={name='Weapon',maxUses=30,icon='',weaponEffect=id==70 and 0 or 2}end
    local apply=pack.require('game.fe8-battle')(D);function update()return apply({forecastActive=true,deployment=1})end`)
  }};
  const steps=[17,70,71,217,242].map(weapon=>{const bytes=Buffer.alloc(4);bytes.writeUInt16LE(weapon|30<<8,0);bytes.writeUInt16LE(weapon|30<<8,2);return{patches:[{address:a+0x48,bytes}],expect:{forecastactorAfterHp:weapon===70?10:20}};});
  const result=await executeProject(project,{ranges:[{address:0x02000000,bytes:ram}],steps});assert.equal(result.readOnly,true);
 }
});
