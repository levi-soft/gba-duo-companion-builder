import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const expected={
 'andaron-saga':['BE8E','A3B9CD19'],'bells-of-byelen':['BE8E','48B996CD'],
 'cerulean-crescent':['BE8E','DC071CC2'],'dark-lord-maiden-of-light':['AE7E','C99A6D26'],
 'dream-of-five':['BE8E','B313A6F5'],'eligors-spear':['BE8E','6E5FE3B0'],
 'iron-emblem':['BE8E','141FF3AA'],'justice-and-pride':['BE8E','AC23B461'],
 'pokemblem':['BE8E','10BDF112'],'the-dark-amulet':['BE8E','8537CE2A'],
 'the-four-kings':['BE8E','0DDE5BEB'],'the-lonely-mirror':['BE8E','A74E93C7'],
 'morrows-golden-country':['BE8E','20287E1B'],'shadow-of-dawn':['BE8E','EB38F5F7'],
 'sun-gods-wrath':['BE8E','566D7A9E']
};
function siteContext(){
 const c={structuredClone,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,DataView,Buffer,Blob,Response,CompressionStream,setTimeout,clearTimeout,AbortController};vm.createContext(c);
 for(const match of fs.readFileSync('site/index.html','utf8').matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"><\/script>/g)){
  if(match[1]==='app.js')continue;
  vm.runInContext(fs.readFileSync('site/'+match[1],'utf8'),c,{filename:match[1]});
 }
 return c;
}

test('new companion headers keep all six skills beside the unit identity and RNG control',()=>{
 const c=siteContext();let sixSkillHeaders=0;
 const visit=(node,check)=>{
  if(!node||typeof node!=='object')return;
  check(node);
  for(const value of Object.values(node))if(value&&typeof value==='object')
   (Array.isArray(value)?value:[value]).forEach(child=>visit(child,check));
 };
 for(const profile of c.COMPANION_PROFILES.filter(p=>expected[p.id])){
  visit(c[profile.template].layout,node=>{
   if(!node.class?.split(' ').includes('identity-line'))return;
   const descendants=[];visit(node,child=>descendants.push(child));
   const skills=descendants.find(child=>child.class==='remaster-skills');
   if(!skills)return;
   sixSkillHeaders++;
   assert.equal(node.type,'row',profile.id+': skills must share the identity row');
   assert(node.children.includes(skills),profile.id+': skills moved below the name/class');
   assert(node.children.some(child=>child.class==='unit-identity'),profile.id+': unit identity must share the skills row');
   assert.equal(skills.children.length,6,profile.id+': keep six skill slots');
   assert(node.children.some(child=>child.class==='rng-led-control'),profile.id+': RNG control must stay in the header');
  });
 }
 assert.equal(sixSkillHeaders,8,'Exercise every six-skill profile, not only text ability panels');
});

test('fifteen new ROM revisions remain separate from the fifteen existing profiles',async()=>{
 const c=siteContext();assert.equal(c.COMPANION_PROFILES.length,30);
 const identities=new Set();
 for(const profile of c.COMPANION_PROFILES){
  const identity=profile.code+':'+profile.crc32;assert(!identities.has(identity));identities.add(identity);
  if(!expected[profile.id])continue;
  assert.deepEqual([profile.code,profile.crc32],expected[profile.id]);
  assert.equal(profile.status,'stable');assert(profile.runtimeParent);
  const manifest=c[profile.template].manifest;
  assert.equal(manifest.version,'1.0.0');
  assert.deepEqual(JSON.parse(JSON.stringify(manifest.match)),{gameCode:[profile.code],crc32:[profile.crc32]});
  let progressed=false;const wrong=new Uint8Array(512);wrong.set(new TextEncoder().encode(profile.code),0xac);
  await assert.rejects(c[profile.api].prepare(wrong,c[profile.template],null,{onProgress(){progressed=true;}}),/CRC32/);
  assert.equal(progressed,false,'Foreign revisions must fail before ROM extraction: '+profile.id);
  assert(c.COMPANION_RUNTIME_MODULES[profile.id]?.['main.lua']);
  if(profile.id==='pokemblem')assert.deepEqual(JSON.parse(JSON.stringify(c.COMPANION_CURSOR_PROFILES[profile.id].modeGuard)),{address:'0x030017A7',mask:'0x01',expected:'0x00'},'Cursor navigation must reject armed or running free movement');
  else assert(c.COMPANION_CURSOR_PROFILES[profile.id]);
 }
 assert.equal(c.COMPANION_PROFILES.filter(x=>expected[x.id]).length,15);
 assert.equal(JSON.parse(fs.readFileSync('package.json')).version,'1.2.0','Explicitly approved thirty-profile Builder release');
});

test('optional empty-portrait support accepts only null table entries and keeps strict defaults',async()=>{
 const c=siteContext(),bytes=new Uint8Array(0x40000),view=new DataView(bytes.buffer),base=0x08000000;
 const u32=(at,value)=>view.setUint32(at,value,true),u16=(at,value)=>view.setUint16(at,value,true);
 bytes.set(new TextEncoder().encode('TEST'),0xac);
 u32(0x6e0,base+0x1000);u32(0x6dc,base+0x1010);u32(0x1010,base+0x1020);
 bytes[0x10000+52+4]=1;u16(0x10000+52+6,1);
 // Authored uncompressed 4-bpp minimap sheet, not extracted game data.
 u32(0x37000,(4100<<8)>>>0);
 const profile={id:'synthetic-empty-portrait',code:'TEST',crc32:c.CompanionRom.crc32(bytes),language:'en',characters:0x10000,classes:0x14000,classCount:1,items:0x15000,portraits:0x18000,sprites:0x19000,icons:0x20000,iconPalettes:0x30000,spritePalettes:0x30100,slots:0x31000,text:0x32000,chapters:0x33000,minimap:0x37000,minimapPalette:0x30200};
 const template={manifest:{},files:{},data:{}};
 c.CompanionRuntime.install=()=>{};
 const options={renderRadar:()=>c.CompanionRom.png({width:1,height:1,rgba:new Uint8Array(4)})};
 await assert.rejects(c.FE8PublicPrep.prepare(bytes,template,null,options,profile),/outside/);
 const result=await c.FE8PublicPrep.prepare(bytes,template,null,options,{...profile,allowEmptyPortraits:true});
 assert.equal(result.data.chars[base+0x10000+52].portrait,'');
 assert.equal(Object.keys(result.project.files).some(x=>x.startsWith('assets/images/portraits/')),false);
 // An invalid nonzero entry is corruption, not an absent portrait.
 u32(0x18000+28+8,1);
 await assert.rejects(c.FE8PublicPrep.prepare(bytes,template,null,options,{...profile,crc32:c.CompanionRom.crc32(bytes),allowEmptyPortraits:true}),/outside/);
});

test('smaller Growth rasters preserve chart values and the existing default artwork',()=>{
 const c=siteContext(),growth=[50,45,40,35,30,25,20];
 const original=c.CompanionRadar.svg(growth,0,'en');
 assert.equal(createHash('sha256').update(original).digest('hex'),'064ac7eab94f95afc6d603f10ecb9acff0099d259208c121b796e5f7c3c8d9f9');
 const smaller=c.CompanionRadar.svg(growth,0,'en',0.5);
 assert(smaller.includes('width="360" height="370" viewBox="0 0 720 740"'));
 assert.equal(smaller.slice(smaller.indexOf('<g ')),original.slice(original.indexOf('<g ')));
 assert(c.CompanionRadar.svg(growth,0,'en',1/3).includes('width="240" height="247" viewBox="0 0 720 740"'));
 const scales=[],drawContext=new Proxy({scale(...values){scales.push(values);}},{get(target,key){return key in target?target[key]:()=>{};}});
 const canvas={width:0,height:0,getContext(){return drawContext;}};
 c.CompanionRadar.draw(canvas,growth,0,'en',0.5);
 assert.deepEqual([canvas.width,canvas.height],[360,370]);assert.deepEqual(scales,[[0.5,0.5]]);
 for(const invalid of [0,0.3,-1,NaN,Infinity,'0.5']){
  assert.throws(()=>c.CompanionRadar.svg(growth,0,'en',invalid),/raster scale/);
  assert.throws(()=>c.CompanionRadar.draw(canvas,growth,0,'en',invalid),/raster scale/);
 }
});

test('new root profiles retain native chapter prefixes without retail numbering or duplicate Prologue',async()=>{
 const c=siteContext();c.FE8PublicPrep.prepare=(...args)=>args[4];
 for(const id of ['andaron-saga','eligors-spear','justice-and-pride','the-dark-amulet','shadow-of-dawn']){
  const metadata=c.COMPANION_PROFILES.find(x=>x.id===id),profile=c[metadata.api].prepare();
  const data={fe8Chapters:[{name:'Prologue: Dark Omens'},{name:'Ch. 12x: Side story'},{name:'An unnumbered title'}],growthCharacters:{},growthClasses:{},chars:{},lookup12:{},forecastItems:{}};
  await profile.prepareExtra({reader:{u8:()=>0,u16:()=>0,u32:()=>0,text:()=>''},bytes:new Uint8Array(1),data,project:{files:{}},options:{},image:()=>{throw Error('No graphics expected in chapter-only fixture');}});
  assert.equal(data.fe8Chapters[0].name,'Dark Omens');
  assert.equal(data.fe8Chapters[0].label,id==='andaron-saga'?'Ch.1':'Prologue');
  assert.equal(data.fe8Chapters[1].label,'Ch. 12x');assert.equal(data.fe8Chapters[1].name,'Side story');
  assert.equal(data.fe8Chapters[2].label,'Chapter');assert.equal(data.fe8Chapters[2].name,'An unnumbered title');
 }
});

test('active player HP caps distinguish fixed-cap patches from class-cap patches',async()=>{
 const c=siteContext();c.FE8PublicPrep.prepare=(...args)=>args[4];
 for(const id of ['andaron-saga','eligors-spear','justice-and-pride','the-dark-amulet','shadow-of-dawn']){
  const metadata=c.COMPANION_PROFILES.find(x=>x.id===id),profile=c[metadata.api].prepare();
  for(const rawHp of [1,70,120]){
   const pointer=0x08000200,data={fe8Chapters:[{name:'Opening'}],growthCharacters:{},growthClasses:{[pointer]:{id:3,caps:[rawHp,30,30,30,30,30,30]}},chars:{},lookup12:{},forecastItems:{}};
   const reader={u8:at=>at===0x200+19?rawHp:0,u16:()=>0,u32:()=>0,text:()=>''};
   await profile.prepareExtra({reader,bytes:new Uint8Array(1),data,project:{files:{}},options:{},image:()=>{throw Error('No graphics expected in cap fixture');}});
   const expectedHp=['the-dark-amulet','shadow-of-dawn'].includes(id)?60:rawHp;
   assert.equal(data.growthClasses[pointer].caps[0],expectedHp,id+' raw class HP '+rawHp);
  }
 }
});

test('native follow-up restrictions keep damage, brave pairs, multipliers and HP totals consistent',async()=>{
 const module=fs.readFileSync('runtime/shared/game.fe8-followup-battle.lua','utf8'),encode=s=>Buffer.from(s).toString('base64');
 const project={manifest:{script:'main.lua'},files:{
  'main.lua':encode(`local D={forecastChars={[0x08000100]={name='A',portrait=''},[0x08000134]={name='B',portrait=''}},forecastClasses={[0x08000200]={name='Class',portrait=''}},forecastItems={},battleConfig={noFollowUpItems={[1]=true,[2]=true}}}
  for id=0,5 do D.forecastItems[id]={name='Fixture',icon='',maxUses=30,weaponEffect=id==3 and 3 or 0} end
  local forecast=pack.require('game.fe8-followup-battle')(D);function update()return forecast({forecastActive=true,deployment=1})end`),
  'game.fe8-followup-battle.lua':encode(module),
  'game.profile.lua':encode('return {battleActor=0x0203A4EC,battleTarget=0x0203A56C}')
 }};
 const rows=[
  {name:'restricted actor',a:1,d:5,as:20,ds:5,brave:false,multi:'',loss:10},
  {name:'restricted brave actor',a:2,d:5,as:20,ds:5,brave:true,multi:'×2',loss:20},
  {name:'allowed actor',a:5,d:5,as:20,ds:5,brave:false,multi:'×2',loss:20},
  {name:'allowed brave actor',a:5,d:5,as:20,ds:5,brave:true,multi:'×4',loss:40},
  {name:'effect3 before weapon',a:5,before:3,d:5,as:20,ds:5,brave:false,multi:'',loss:10},
  {name:'native target speed sentinel',a:5,d:5,as:300,ds:251,brave:false,multi:'',loss:10},
  {name:'restricted faster defender',a:5,d:1,as:5,ds:20,brave:false,multi:'',loss:10,targetMulti:'',actorLoss:10},
  {name:'allowed faster defender',a:5,d:5,as:5,ds:20,brave:false,multi:'',loss:10,targetMulti:'×2',actorLoss:20}
 ];
 for(const row of rows){
  const ram=Buffer.alloc(0x40000),a=0x3A4EC,d=0x3A56C;
  for(const[at,id,before,speed,deploy,cp]of [[a,row.a,row.before??row.a,row.as,1,0x08000100],[d,row.d,row.d,row.ds,129,0x08000134]]){
   ram.writeUInt32LE(cp,at);ram.writeUInt32LE(0x08000200,at+4);ram[at+8]=1;ram[at+11]=deploy;ram[at+18]=50;ram[at+19]=50;ram[at+0x72]=50;
   ram.writeUInt16LE(id|30<<8,at+0x48);ram.writeUInt16LE(before|30<<8,at+0x4A);ram.writeUInt32LE(at===a&&row.brave?0x20:0,at+0x4C);ram[at+0x52]=1;
   ram.writeInt16LE(15,at+0x5A);ram.writeInt16LE(5,at+0x5C);ram.writeInt16LE(speed,at+0x5E);ram.writeInt16LE(100,at+0x64);
  }
  const result=await executeProject(project,{ranges:[{address:0x02000000,bytes:ram}],steps:[{ticks:1}]}),v=result.values[0];
  assert.equal(v.forecastactorMultiplier,row.multi,row.name);assert.equal(v.forecasttargetHpLoss,row.loss,row.name);
  assert.equal(v.forecasttargetAfterHp,50-row.loss,row.name);assert.equal(parseFloat(v.forecasttargetHpLossWidth),row.loss*2,row.name);
  assert.equal(v.forecastactorDamage,row.loss>10?'10 x'+row.loss/10:'10',row.name);
  if(row.targetMulti!==undefined){assert.equal(v.forecasttargetMultiplier,row.targetMulti,row.name);assert.equal(v.forecastactorHpLoss,row.actorLoss,row.name);}
  assert.equal(result.readOnly,true);
 }
});

test('HP drain follows the native before-weapon effect on either side, not retail item IDs',async()=>{
 const encode=s=>Buffer.from(s).toString('base64');
 const project={manifest:{script:'main.lua'},files:{
  'main.lua':encode(`local D={forecastChars={[0x08000100]={name='A',portrait=''},[0x08000134]={name='B',portrait=''}},forecastClasses={[0x08000200]={name='Class',portrait=''}},forecastItems={}}
    for _,id in ipairs({17,20,70,71,217})do D.forecastItems[id]={name='Fixture',icon='',maxUses=30,weaponEffect=(id==71 or id==217) and 2 or 0}end
    local forecast=pack.require('game.fe8-followup-battle')(D);function update()return forecast({forecastActive=true,deployment=1})end`),
  'game.fe8-followup-battle.lua':encode(fs.readFileSync('runtime/shared/game.fe8-followup-battle.lua','utf8')),
  'game.profile.lua':encode('return {battleActor=0x0203A4EC,battleTarget=0x0203A56C}')
 }};
 for(const side of ['actor','target'])for(const [current,before,expectedHp]of [[70,70,20],[17,17,20],[71,71,30],[217,217,30],[70,71,30],[71,70,20]]){
  const ram=Buffer.alloc(0x40000),a=0x3A4EC,d=0x3A56C;
  for(const [at,cp,deploy,isDrainer]of [[a,0x08000100,1,side==='actor'],[d,0x08000134,129,side==='target']]){
   ram.writeUInt32LE(cp,at);ram.writeUInt32LE(0x08000200,at+4);ram[at+8]=1;ram[at+11]=deploy;ram[at+18]=50;ram[at+19]=isDrainer?20:50;ram[at+0x72]=ram[at+19];
   ram.writeUInt16LE((isDrainer?current:20)|30<<8,at+0x48);ram.writeUInt16LE((isDrainer?before:20)|30<<8,at+0x4A);ram[at+0x52]=isDrainer?1:0;
   ram.writeInt16LE(15,at+0x5A);ram.writeInt16LE(5,at+0x5C);ram.writeInt16LE(10,at+0x5E);ram.writeInt16LE(100,at+0x64);
  }
  const result=await executeProject(project,{ranges:[{address:0x02000000,bytes:ram}],steps:[{ticks:1}]}),v=result.values[0];
  assert.equal(v['forecast'+side+'AfterHp'],expectedHp,side+' current/before '+current+'/'+before);
  assert.equal(v['forecast'+(side==='actor'?'target':'actor')+'AfterHp'],40);assert.equal(result.readOnly,true);
 }
});

test('native query failures clear prior results and a fresh forecast can recover',async()=>{
 for(const id of ['andaron-saga','justice-and-pride','the-dark-amulet','shadow-of-dawn']){
  const source=fs.readFileSync('runtime/'+id+'/features.analysis.lua','utf8');
  const modules={
   'main.lua':`local apply=pack.require('features.analysis')({});function update()return apply({forecastActive=ui.forecast~=false,exp=99})end`,
   'features.analysis.lua':source,'features.fe8-analysis.lua':fs.readFileSync('runtime/fe8-vietnamese/features.analysis.lua','utf8'),
   'game.snapshot.lua':`return function()return mem.u8 end`,'game.profile.lua':`return{activeUnit=0x03000010}`,
   'features.exp.lua':`return function()return function()if ui.fail then error('Native CPU: missing captured bus context')end;return true,{gain=1,leveled=false}end end`,
   'features.level_prediction.lua':`return function()error('No level-up job is eligible')end`
  };
  const project={manifest:{script:'main.lua'},files:Object.fromEntries(Object.entries(modules).map(([name,text])=>[name,Buffer.from(text).toString('base64')]))};
  const result=await executeProject(project,{ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000)},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
   {ticks:4,expect:{analysisReady:true,rngExpHit:1,rngExpKill:1}},
   {ticks:3,ui:{fail:true},patches:[{address:0x03000000,bytes:[1]}],expect:{analysisFailed:true,predictionAvailable:false,predictionComplete:false,rngExpHit:undefined,rngExpKill:undefined}},
   {ticks:1,ui:{forecast:false,predictionPopup:true},expect:{analysisFailed:false,analysisPredictionError:undefined,analysisReady:false,predictionAvailable:false}},
   {ticks:4,expect:{analysisReady:true,analysisFailed:false,rngExpHit:1,rngExpKill:1}}
  ]});
  assert.match(result.values[4].analysisPredictionError,/missing captured bus context/);assert.equal(result.readOnly,true);
 }
});
