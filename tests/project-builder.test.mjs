import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
await import('../site/jszip.min.js');const JSZip=globalThis.JSZip;
const rom=()=>{const bytes=new Uint8Array(192);bytes.set(Buffer.from('TEST'),0xac);return bytes;};
const project=()=>({manifest:{id:'custom-test',name:'Đồng hành riêng',version:'0.1.0',match:{gameCode:['TEST','ABCD'],crc32:['2419A356','11111111']},script:'scripts/main.lua',tickHz:4,values:{hp:{type:'u8',addr:'02000000'}}},width:640,height:480,
  layout:{id:'root',type:'column',children:[{id:'text',type:'text',text:'HP {hp}'}]},css:':root { color: white; }',data:{hp:7},files:{'scripts/main.lua':Buffer.from('local x=require("scripts/helper")\nfunction update() return {hp=x.hp} end').toString('base64'),'scripts/helper.lua':Buffer.from('return {hp=7} -- dữ liệu').toString('base64'),'assets/test.bin':Buffer.from([0,255,128,7]).toString('base64')}});
function engine(){const context={structuredClone,Uint8Array,JSZip};context.globalThis=context;vm.createContext(context);
  for(const name of ['pack-compiler.js','builder-core.js'])vm.runInContext(fs.readFileSync('site/'+name,'utf8'),context);return context;
}
test('custom project builds without a game registry and preserves its reader and assets',async()=>{
  const c=engine(),source=project(),before=structuredClone(source),input=rom(),bytes=Buffer.from(input);
  assert.deepEqual(JSON.parse(JSON.stringify(c.CompanionBuild.romIdentity(input))),{gameCode:'TEST',crc32:'2419A356'});
  const result=await c.CompanionBuild.buildProject(input,source);
  assert.equal(result.report.runtimeVerified,false);assert.equal(result.report.source,'studio-project');
  const zip=await JSZip.loadAsync(result.zipBytes),m=JSON.parse(await zip.file('manifest.json').async('string'));
  assert.deepEqual(m.match,{gameCode:['TEST'],crc32:['2419A356']});assert.equal(m.script,source.manifest.script);assert.deepEqual(m.values,source.manifest.values);
  assert.deepEqual(m.studioDataFields.hp,{kind:'number'});
  for(const[name,bytes]of Object.entries(source.files))assert.deepEqual(await zip.file(name).async('nodebuffer'),Buffer.from(bytes,'base64'));
  assert.deepEqual(source,before);assert.deepEqual(Buffer.from(input),bytes);
});

test('custom input inspection shares packaging validation without compilation, ZIP output or source mutation',async()=>{
 const c=engine(),p=project(),before=structuredClone(p),input=rom(),copy=Buffer.from(input);
 c.CompanionCompiler.compileDesign=()=>{throw Error('Preflight must not compile');};c.JSZip=class{constructor(){throw Error('Preflight must not package');}};
 const report=JSON.parse(JSON.stringify(c.CompanionBuild.inspectProject(input,p)));
 assert.deepEqual(report,{gameCode:'TEST',crc32:'2419A356',files:3,fileBytes:Object.values(p.files).reduce((sum,value)=>sum+Buffer.from(value,'base64').length,0),assets:1,luaFiles:2,source:'studio-project',packId:'custom-test',name:p.manifest.name,version:'0.1.0',width:640,height:480,dataFields:1,nativeFields:1,reader:'lua',runtimeVerified:false,diagnostics:{errors:0,warnings:0,info:0,issues:[],truncated:false,complete:true}});
 assert.deepEqual(p,before);assert.deepEqual(Buffer.from(input),copy);
 delete p.manifest.script;assert.equal(c.CompanionBuild.inspectProject(input,p).reader,'native');delete p.manifest.values;assert.equal(c.CompanionBuild.inspectProject(input,p).reader,'sample');
});

test('custom packages retain matching author canvas/grid metadata even when the native layout has no compiled editor styles',async()=>{
 const c=engine(),p=project();p.width=750;p.height=1334;p.editorGrid={visible:false,snap:true,size:24};
 const before=structuredClone(p),result=await c.CompanionBuild.buildProject(rom(),p),zip=await JSZip.loadAsync(result.zipBytes),metadata=JSON.parse(await zip.file('studio-design.json').async('string'));
 assert.equal(metadata.version,1);assert.deepEqual([metadata.width,metadata.height],[750,1334]);assert.deepEqual(metadata.editorGrid,p.editorGrid);
 assert.equal(metadata.generatedLayout,await zip.file('layout.json').async('string'));assert.equal(metadata.generatedCss,await zip.file('style.css').async('string'));assert.deepEqual(metadata.layout,p.layout);assert.deepEqual(p,before);
 const manifest=JSON.parse(await zip.file('manifest.json').async('string'));assert.equal(manifest.width,undefined);assert.equal(manifest.editorGrid,undefined);
});
test('reader data declarations carry named scalar and list-row fields without deriving RAM addresses',()=>{
  const c=engine(),p=project();p.data.party=[{name:'One',hp:3}];p.manifest.studioDataFields={hp:{label:'Health',labelVi:'Sức khỏe',kind:'number'}};
  const fields=JSON.parse(JSON.stringify(c.CompanionBuild.describeDataFields(p)));
  assert.equal(fields.hp.labelVi,'Sức khỏe');assert.deepEqual(fields.party,{kind:'list'});assert.deepEqual(fields['party[].hp'],{kind:'number'});assert.deepEqual(fields['party[].name'],{kind:'string'});
  assert.equal(Object.values(fields).some(info=>Object.hasOwn(info,'addr')||Object.hasOwn(info,'verified')),false);
  assert.equal(p.manifest.studioDataFields.party,undefined);
  p.data.maxHp='---';p.layout.children.push({id:'bar',type:'bar',value:'$hp',maxKey:'$maxHp'});
  assert.equal(c.CompanionBuild.describeDataFields(p).maxHp.kind,'number');assert.equal(p.data.maxHp,'---');
});
test('custom projects reject mismatched ROMs and unsupported generation before compilation',async()=>{
  const cases=[p=>p.manifest.match.crc32=[],p=>p.manifest.match.gameCode=['ABCD'],p=>p.manifest.studioGraphics={portrait:{}},p=>p.manifest.studioComputed={hp:3},p=>p.manifest.studioPulse={periodMs:100,bindings:{}},p=>delete p.files['scripts/main.lua'],p=>p.files['../bad.lua']='',p=>{p.manifest.script='manifest.json';p.files['manifest.json']='';},p=>p.files['assets/no.bin']='!!!!',p=>p.files['assets/no.bin']='AB==',p=>p.width=0,p=>p.manifest.tickHz=31,p=>p.files=JSON.parse('{"constructor":""}'),p=>p.data=3,p=>p.layout='not a layout',p=>p.manifest.name='x'.repeat(257),p=>p.manifest.version='x'.repeat(65)];
  for(const change of cases){const c=engine(),p=project();change(p);let compiled=false;c.CompanionCompiler.compileDesign=()=>{compiled=true;throw Error('must not compile');};assert.throws(()=>c.CompanionBuild.inspectProject(rom(),p));await assert.rejects(c.CompanionBuild.buildProject(rom(),p));assert.equal(compiled,false);}
});

test('configuration libraries are identified as the wrong input instead of being packaged as projects',()=>{
 const c=engine();assert.throws(()=>c.CompanionBuild.inspectProject(rom(),{formatVersion:1,presets:[]}),/block configuration library/);
});
test('seeded custom builds preserve opaque binary modules and are reproducible',async()=>{
  let seed=0xcafef00d;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const c=engine();
  for(let n=0;n<24;n++){const p=project(),payload=Buffer.from(Array.from({length:next()%1024},()=>next()>>>24));p.files['assets/opaque.bin']=payload.toString('base64');
    const a=await c.CompanionBuild.buildProject(rom(),p),b=await c.CompanionBuild.buildProject(rom(),p);
    assert.deepEqual(Buffer.from(a.zipBytes),Buffer.from(b.zipBytes));const zip=await JSZip.loadAsync(a.zipBytes);assert.deepEqual(await zip.file('assets/opaque.bin').async('nodebuffer'),payload);
  }
});
test('custom build cancellation never publishes a partial result',async()=>{
  const c=engine(),controller=new AbortController();controller.abort();await assert.rejects(c.CompanionBuild.buildProject(rom(),project(),{signal:controller.signal}),e=>e.name==='AbortError');
  const late=new AbortController();await assert.rejects(c.CompanionBuild.buildProject(rom(),project(),{signal:late.signal,onProgress:()=>late.abort()}),e=>e.name==='AbortError');
});
test('custom project CLI builds a ZIP and refuses to overwrite files',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gba-project-builder-'));
  try{
    const p=path.join(dir,'source.json'),r=path.join(dir,'test.gba'),out=path.join(dir,'pack.zip');fs.writeFileSync(p,JSON.stringify(project()));fs.writeFileSync(r,rom());
    const run=output=>spawnSync(process.execPath,['scripts/build-project.mjs',p,r,output],{encoding:'utf8'});
    assert.equal(run(out).status,0);const before=fs.readFileSync(out);assert.notEqual(run(out).status,0);assert.deepEqual(fs.readFileSync(out),before);
    assert.notEqual(run(p).status,0);assert.equal(JSON.parse(fs.readFileSync(p)).manifest.id,'custom-test');
  }finally{const actual=fs.realpathSync(dir);assert.equal(path.dirname(actual),fs.realpathSync(os.tmpdir()));assert(path.basename(actual).startsWith('gba-project-builder-'));fs.rmSync(actual,{recursive:true,force:true});}
});
