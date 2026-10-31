import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const encode=source=>Buffer.from(source).toString('base64');
const newFe8=['andaron-saga','bells-of-byelen','cerulean-crescent','dream-of-five','eligors-spear','iron-emblem','justice-and-pride','morrows-golden-country','pokemblem','shadow-of-dawn','sun-gods-wrath','the-dark-amulet','the-four-kings','the-lonely-mirror'];
const shared=name=>encode(fs.readFileSync('runtime/shared/'+name+'.lua'));
function mapFixture({native=false,poke=false,onDemand=true}={}){
 const ew=Buffer.alloc(0x40000),iw=Buffer.alloc(0x8000),rom=Buffer.alloc(0x19400),unit=0x02002000;
 const put=(address,value,n=4)=>ew.writeUIntLE(value,address-0x02000000,n);
 put(0x02000010,3,2);put(0x02000012,2,2);
 put(0x02000020,0x02000400);put(0x02000024,0x02000410);
 for(let y=0;y<2;y++){put(0x02000400+y*4,0x02000500+y*3);put(0x02000410+y*4,0x02000600+y*3);}
 ew.fill(1,0x500,0x506);ew[0x600]=1;
 put(unit,0x08001000);put(unit+4,0x08002000);put(unit+11,1,1);put(unit+18,20,1);put(unit+19,20,1);put(unit+29,5,1);
 // Authored native getter deliberately takes513 Thumb instructions. The512
 // instruction queue slice must finish across two Units ticks while Map sleeps.
 rom.set([0xff,0x21,0x01,0x39,0xfd,0xd1,0x40,0x7f,0x70,0x47],poke?0x19224:0x100);
 const D=`local costs={};for n=1,65 do costs[n]=1 end
 local chars={[0x08001000]={name='Header unit',portrait='',attributes=0}}
 local classes={[0x08002000]={name='Fixture',portrait='',attributes=0,move=1,movementCosts={costs,costs,costs}}}
 local D={chars=chars,classes=classes,slots={[1]=${unit}},mapMeta={chars=chars,classes=classes,ballistaCosts=costs},mapWeapons={},fe8Chapters={},mapRenderOnDemand=${onDemand}}
 `;
 const files={
  'game.profile.lua':encode('return {mapWidth=0x02000010,mapHeight=0x02000012,terrainRows=0x02000020,unitRows=0x02000024,cursorX=0x02000030,cursorY=0x02000032,chapter=0x02000034,turn=0x02000036}'),
  'game.fe8-map.lua':shared('game.fe8-map'),'presentation.chapter.lua':shared('presentation.chapter'),
  'presentation.map-picks.lua':shared('presentation.map-picks'),
  'main.lua':encode(D+`
   local reads,geometry=0,0;local u8,u16,u32=mem.u8,mem.u16,mem.u32
   mem.u8=function(a)if a>=0x02000500 and a<0x02000606 then reads=reads+1 end;return u8(a)end
   mem.u16=function(a)if a==0x02000010 or a==0x02000012 then geometry=geometry+1 end;return u16(a)end
   local map=${poke?"pack.require('game.map')(D)":native?"pack.require('game.fe8-native-map')(D,{moveEntry=0x08000100})":"pack.require('game.fe8-map')(D)"}
   local present=${native||poke?"pack.require('presentation.native-movement')(D)":"function(v)return v end"}
   function update()
    reads,geometry=0,0
    local v={unitPresent=true,deployment=1,characterPointer=0x08001000,classPointer=0x08002000,move=1}
    map.apply(v,${unit},false);present(v)
    v.cellCount=#(v.mapCells or {});v.rosterCount=#(v.mapRoster or {});v.cellReads=reads;v.geometryReads=geometry
    return v
   end`)
 };
 if(native||poke){
  for(const name of ['features.thumb','features.native-map-query','game.snapshot','game.fe8-native-map','presentation.native-movement'])files[name+'.lua']=shared(name);
 }
 if(poke){
  files['game.map.lua']=encode(fs.readFileSync('runtime/pokemblem/game.map.lua'));
  files['game.native-ranges.lua']=encode(fs.readFileSync('runtime/pokemblem/game.native-ranges.lua'));
 }
 return{project:{manifest:{script:'main.lua'},files},options:{rom,ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:iw}]}};
}

test('opt-in Units→Map→Units avoids hidden map work and rebuilds current cells on reopening',async()=>{
 const {project,options}=mapFixture();
 const result=await executeProject(project,{...options,steps:[
  {ui:{mainTab:'Units'},expect:{mapPresent:false,cellCount:0,rosterCount:0,cellReads:0,geometryReads:0}},
  {ui:{mainTab:'Map'},expect:{mapPresent:true,cellCount:6,rosterCount:4,cellReads:12,mapMoveCount:6,mapPlayerCount:1}},
  {ui:{mainTab:'Units'},patches:[{address:0x02000500,bytes:[7]}],expect:{mapPresent:false,cellCount:0,rosterCount:0,cellReads:0,geometryReads:0}},
  {ui:{mainTab:'Map'},expect:{mapPresent:true,cellCount:6,cellReads:12,mapPlayerCount:1}}
 ]});
 assert.notEqual(result.values[1].mapCells[0].tile,result.values[3].mapCells[0].tile,'Opening Map must read the changed live terrain rather than restore stale hidden cells');
 assert.equal(result.readOnly,true);assert.equal(result.calls.length,0);
});

test('callers without mainTab retain the legacy Map API while explicit Units hides every profile',async()=>{
 for(const onDemand of [false,true]){
  const {project,options}=mapFixture({onDemand});
  const result=await executeProject(project,{...options,steps:[
   {ui:{},expect:{mapPresent:true,cellCount:6,rosterCount:4,cellReads:12,mapPlayerCount:1}},
   {ui:{mainTab:'Units'},expect:{mapPresent:false,cellCount:0,rosterCount:0,cellReads:0,geometryReads:0}}
  ]});
  assert.equal(result.readOnly,true);
 }
});

for(const poke of [false,true])test((poke?'Pokemblem':'FE8 native wrapper')+' completes header movement while Units skips Map',async()=>{
 const {project,options}=mapFixture({native:!poke,poke,onDemand:poke});
 const result=await executeProject(project,{...options,steps:[
  {ui:{mainTab:'Units'},expect:{mapPresent:false,cellCount:0,cellReads:0,geometryReads:0,nativeMovePending:true,move:'---'}},
  {ui:{mainTab:'Units'},expect:{mapPresent:false,cellCount:0,cellReads:0,geometryReads:0,nativeMovePending:false,move:5,nativeMoveTotal:5}},
  ...(!poke?[
   {ui:{mainTab:'Map'},expect:{mapPresent:true,cellCount:6,move:5,nativeMovePending:false,mapMoveCount:6}},
   {ui:{mainTab:'Units'},expect:{mapPresent:false,cellCount:0,cellReads:0,geometryReads:0,move:5,nativeMovePending:false}}
  ]:[])
 ]});
 assert.equal(result.readOnly,true);assert.equal(result.calls.length,0);
});

test('only fourteen new FE8 profile recipes opt in; FE7 and existing profiles retain defaults',()=>{
 for(const id of newFe8){
  let profile;const context={TextDecoder,Uint8Array,CompanionLatinText:()=>'',FE8PublicPrep:{prepare(...args){profile=args[4];}}};vm.createContext(context);
  vm.runInContext(fs.readFileSync(`site/profiles/${id}/prepare.js`,'utf8'),context);
  const metadata=JSON.parse(fs.readFileSync(`site/profiles/${id}/profile.json`));context[metadata.api].prepare();
  assert.equal(profile.mapRenderOnDemand,true,id);
 }
 for(const id of ['fe8-english','fe8-europe','vision-quest','storge','sacred-echoes','hag-in-white','voids-blitzarre']){
  let profile;const context={TextDecoder,Uint8Array,CompanionLatinText:()=>'',FE8PublicPrep:{prepare(...args){profile=args[4];}}};vm.createContext(context);
  vm.runInContext(fs.readFileSync(`site/profiles/${id}/prepare.js`,'utf8'),context);
  const api=Object.keys(context).find(key=>/Prep$/.test(key)&&key!=='FE8PublicPrep');context[api].prepare();
  assert.equal(profile.mapRenderOnDemand,undefined,id+' legacy opt-out');
 }
 assert.doesNotMatch(fs.readFileSync('site/profiles/dark-lord-maiden-of-light/prepare.js','utf8'),/mapRenderOnDemand/);
});

test('FE8PublicPrep emits the opt-in D flag while omitted and false defaults serialize identically',async()=>{
 const context={structuredClone,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,DataView,Buffer,Blob,Response,CompressionStream,setTimeout,
  COMPANION_THEME:{locales:{en:{runtime:{}}}},CompanionRuntime:{install(p,id,data){p.serialized=data;}}};vm.createContext(context);
 vm.runInContext(fs.readFileSync('site/profiles/fe8-vietnamese/prepare.js','utf8'),context);
 const bytes=new Uint8Array(0x40000),view=new DataView(bytes.buffer),base=0x08000000;
 const u32=(at,value)=>view.setUint32(at,value,true);bytes.set(new TextEncoder().encode('TEST'),0xac);
 u32(0x6e0,base+0x1000);u32(0x6dc,base+0x1010);u32(0x1010,base+0x1020);u32(0x37000,4100<<8);
 const recipe={id:'synthetic-on-demand',code:'TEST',crc32:context.CompanionRom.crc32(bytes),language:'en',characters:0x10000,classes:0x14000,classCount:1,items:0x15000,portraits:0x18000,sprites:0x19000,icons:0x20000,iconPalettes:0x30000,spritePalettes:0x30100,slots:0x31000,text:0x32000,chapters:0x33000,minimap:0x37000,minimapPalette:0x30200};
 const result=[];
 for(const flag of [undefined,false,true])result.push(await context.FE8PublicPrep.prepare(bytes,{manifest:{},files:{},data:{}},null,{renderRadar:()=>new Uint8Array()},flag===undefined?recipe:{...recipe,mapRenderOnDemand:flag}));
 assert.equal(result[0].data.mapRenderOnDemand,undefined);assert.equal(result[1].data.mapRenderOnDemand,undefined);
 assert.equal(result[0].project.serialized,result[1].project.serialized,'Legacy generated ROM tables stay byte-identical');
 assert.equal(result[2].data.mapRenderOnDemand,true);assert.match(result[2].project.serialized,/\["mapRenderOnDemand"\]=true/);
});
