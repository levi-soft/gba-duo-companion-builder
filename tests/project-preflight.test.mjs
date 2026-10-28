import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function rom(){const bytes=new Uint8Array(192);bytes.set(Buffer.from('TEST'),0xac);return bytes;}
function project(){return {manifest:{id:'test-project',name:'Dự án mẫu',version:'1.0.0',match:{gameCode:['TEST'],crc32:['2419A356']}},layout:{type:'text',id:'name',text:'{name}'},css:'',data:{name:'Sample'},files:{},width:640,height:480};}
const romFile=()=>({name:'ROM Việt hóa.gba',size:192,arrayBuffer:async()=>rom().buffer});
const sourceFile=(value=project(),name='Dự án riêng.gbastudio.json')=>({name,size:1000,text:async()=>JSON.stringify(value)});
function app(){
 const elements=new Map(),revoked=[];let nextUrl=0;
 const element=id=>{
  if(!elements.has(id))elements.set(id,{value:id==='language'?'en':'',files:[],checked:false,events:{},textContent:'',addEventListener(type,handler){this.events[type]=handler;},click(){this.clicked=true;}});
  return elements.get(id);
 };
 const context={document:{documentElement:{},getElementById:element},Uint8Array,Blob,structuredClone,AbortController,URL:{createObjectURL:()=>`blob:test-${nextUrl++}`,revokeObjectURL:url=>revoked.push(url)}};context.globalThis=context;vm.createContext(context);
 for(const name of ['builder-core.js','app.js'])vm.runInContext(fs.readFileSync('site/'+name,'utf8'),context);
 return {element,context,revoked};
}
async function choose(e,source=sourceFile()){
 e('custom').checked=true;await e('custom').events.change();e('rom').files=[romFile()];await e('rom').events.change();e('source').files=[source];await e('source').events.change();
}
test('custom inputs are checked before enabling build and the report survives language changes',async()=>{
 const {element:e}=app();e('language').value='vi';e('language').events.change();
 e('custom').checked=true;await e('custom').events.change();assert.equal(e('build').disabled,true);assert.equal(e('projectCheck').hidden,false);
 e('rom').files=[romFile()];await e('rom').events.change();e('source').files=[sourceFile()];const checking=e('source').events.change();
 assert.equal(e('build').disabled,true);assert.match(e('projectCheckStatus').textContent,/Đang kiểm tra/);await checking;
 assert.equal(e('build').disabled,false);assert.match(e('projectCheckDetails').textContent,/Dự án mẫu/);assert.match(e('projectCheckDetails').textContent,/TEST · CRC32 2419A356/);assert.equal(e('projectCheckWarning').hidden,false);
 e('language').value='en';e('language').events.change();assert.match(e('projectCheckStatus').textContent,/Input checks passed/);assert.match(e('projectCheckDetails').textContent,/Sample data only/);assert.equal(e('build').disabled,false);
 e('custom').checked=false;await e('custom').events.change();assert.equal(e('projectCheck').hidden,true);
 assert.match(fs.readFileSync('site/index.html','utf8'),/id="projectCheck"[^>]*aria-labelledby="projectCheckTitle"/);
});
test('custom input errors are actionable, translated and remain blocked across language changes',async()=>{
 const {element:e}=app();e('language').value='vi';e('language').events.change();const mismatch=project();mismatch.manifest.match.crc32=['00000000'];await choose(e,sourceFile(mismatch));
 assert.equal(e('build').disabled,true);assert.match(e('projectCheckStatus').textContent,/ROM không khớp/);assert.equal(e('projectCheckDetails').hidden,false);assert.match(e('projectCheckDetails').textContent,/TEST · CRC32 2419A356/);
 e('language').value='en';e('language').events.change();assert.match(e('projectCheckStatus').textContent,/exact ROM/);assert.equal(e('build').disabled,true);
 e('source').files=[sourceFile({formatVersion:1,presets:[]})];await e('source').events.change();assert.match(e('projectCheckStatus').textContent,/block configuration library/);
 e('language').value='vi';e('language').events.change();assert.match(e('projectCheckStatus').textContent,/thư viện cấu hình khối/);
 e('source').files=[{name:'broken.json',size:3,text:async()=>'{bad'}];await e('source').events.change();assert.match(e('projectCheckStatus').textContent,/JSON không hợp lệ/);assert.equal(e('build').disabled,true);
});
test('late file reads cannot replace the most recently selected project check',async()=>{
 const {element:e}=app();await choose(e);let finish;const delayed=new Promise(resolve=>{finish=resolve;});
 e('source').files=[{name:'old.json',size:3,text:()=>delayed}];const old=e('source').events.change();assert.equal(e('build').disabled,true);
 const newer=project();newer.manifest.name='Newest choice';e('source').files=[sourceFile(newer,'new.json')];await e('source').events.change();assert.equal(e('build').disabled,false);
 finish(JSON.stringify({...project(),manifest:{...project().manifest,match:{gameCode:['NOPE'],crc32:['00000000']}}}));await old;
 assert.equal(e('sourceName').textContent,'new.json');assert.match(e('projectCheckDetails').textContent,/Newest choice/);assert.equal(e('build').disabled,false);
 e('source').files=[];await e('source').events.change();assert.equal(e('build').disabled,true);assert.equal(e('projectCheckDetails').hidden,true);
});
test('custom build uses checked inputs and clears previous downloads after a selection change',async()=>{
 const {element:e,context,revoked}=app();let reads=0,builds=0;const read=context.CompanionBuild.readRom;context.CompanionBuild.readRom=async file=>{reads++;return read(file);};
 await choose(e);assert.equal(reads,1);
 context.CompanionBuild.buildProject=async(bytes,p)=>{builds++;assert.equal(p.manifest.name,'Dự án mẫu');assert.equal(bytes.length,192);return {project:p,profile:{name:p.manifest.name,nameVi:p.manifest.name,output:'test-project'},zipBytes:new Uint8Array([1,2]),report:{files:0,crc32:'2419A356'}};};
 await e('build').events.click();assert.equal(builds,1);assert.equal(reads,1);assert.equal(e('result').hidden,false);assert.equal(e('zip').download,'test-project-Local.zip');
 const bad=project();bad.manifest.match.crc32=[];e('source').files=[sourceFile(bad)];await e('source').events.change();assert.equal(e('result').hidden,true);assert.equal(e('build').disabled,true);assert.equal(revoked.length,2);
 await e('build').events.click();assert.equal(builds,1);
});
