import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
await import('../site/jszip.min.js');const JSZip=globalThis.JSZip;
// Event/DOM-model checks, not browser layout or native accessibility validation.
function app(){
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.id='';this.value='';this.files=[];this.checked=false;this.disabled=false;this.hidden=false;this.children=[];this.events={};this.textContent='';}
  addEventListener(event,callback){this.events[event]=callback;}
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=children;}
  click(){return this.events.click?.();}
 }
 const html=fs.readFileSync('site/index.html','utf8'),elements=new Map([...html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"/g)].map(([,tag,id])=>{const node=new Element(tag);node.id=id;return[id,node];}));
 function find(node,id){if(node.id===id)return node;for(const child of node.children){const found=find(child,id);if(found)return found;}return null;}
 const document={documentElement:{},createElement:tag=>new Element(tag),getElementById:id=>elements.get(id)??[...elements.values()].map(node=>find(node,id)).find(Boolean)??null};
 const e=id=>{const node=document.getElementById(id);assert(node,'Missing element '+id);return node;};e('language').value='vi';
 const blobs=new Map(),revoked=[];let sequence=0;
 const context={document,Uint8Array,Blob,structuredClone,AbortController,JSZip,URL:{createObjectURL(blob){const url='blob:test-'+sequence++;blobs.set(url,blob);return url;},revokeObjectURL(url){revoked.push(url);blobs.delete(url);}}};context.globalThis=context;vm.createContext(context);
 for(const script of ['pack-compiler.js','function-blocks.js','builder-core.js','project-templates.js','project-template-form.js','app.js'])vm.runInContext(fs.readFileSync('site/'+script,'utf8'),context);
 return {e,context,revoked,blobs};
}
function project(){return {manifest:{id:'pilot-test',name:'Thử mẫu Builder',version:'1.0.0',match:{gameCode:['TEST'],crc32:['2419A356']},script:'reader.lua',studioDataFields:{pilot:{labelVi:'Phi công'},energy:{labelVi:'Năng lượng'},capacity:{labelVi:'Giới hạn'}}},layout:{type:'text',id:'old',text:'Old interface'},css:':root { color:white }',data:{pilot:'Aya',energy:0,capacity:20,active:false,avatar:'asset:one.png',party:[{name:'Not root'}]},files:{'reader.lua':Buffer.from('function update() return {} end').toString('base64'),'assets/opaque.bin':Buffer.from([0,255]).toString('base64')},width:640,height:480};}
async function choose(a,p=project()){
 const {e}=a,rom=new Uint8Array(192);rom.set(Buffer.from('TEST'),0xac);const file={name:'test.gba',size:192,arrayBuffer:async()=>rom.buffer},source={name:'Nguồn.gbastudio.json',size:1000,text:async()=>JSON.stringify(p)};
 e('custom').checked=true;await e('custom').events.change();e('rom').files=[file];await e('rom').events.change();e('source').files=[source];await e('source').events.change();return {file,source};
}
async function change(a,id,value,event='change'){a.e(id).value=value;await a.e(id).events[event]();}
function nodes(root){return[root,...root.children.flatMap(nodes)];}
test('missing direct assets block export with localized component/property/path details and can be repaired in a copy',async()=>{
 const a=app(),p=project();p.layout={type:'image',id:'portrait-required',src:'asset:missing.png'};const before=structuredClone(p);let reads=0;
 const read=a.context.CompanionBuild.readRom;a.context.CompanionBuild.readRom=async file=>{reads++;return read(file);};await choose(a,p);
 assert.equal(a.e('build').disabled,true);assert.equal(a.e('projectDiagnostics').hidden,false);assert.match(a.e('projectCheckStatus').textContent,/tham chiếu/);
 assert.match(a.e('projectDiagnosticsList').textContent,/Thiếu ảnh/);assert.match(a.e('projectDiagnosticsList').textContent,/portrait-required · src · assets\/missing.png/);
 await a.e('build').events.click();assert.equal(a.blobs.size,0);
 await change(a,'language','en');assert.match(a.e('projectDiagnosticsList').textContent,/directly referenced/);assert.equal(a.e('build').disabled,true);assert.equal(reads,1);
 await change(a,'templateMode','card');await change(a,'templateName','pilot');assert.equal(a.e('build').disabled,false);assert.equal(a.e('projectDiagnostics').hidden,true);
 await a.e('build').events.click();assert.equal(a.e('result').hidden,false);const output=JSON.parse(await a.blobs.get(a.e('project').href).text());assert.notEqual(output.layout.id,p.layout.id);assert.deepEqual(p,before);
 await change(a,'templateMode','existing');assert.equal(a.e('build').disabled,true);assert.equal(a.e('result').hidden,true);assert.equal(a.revoked.length,2);assert.match(a.e('projectDiagnosticsList').textContent,/assets\/missing.png/);assert.equal(reads,1);
});

test('unknown Lua fields and sample image files show notes without blocking a real custom ZIP',async()=>{
 const a=app(),p=project();p.layout={type:'column',children:[{type:'text',id:'live-label',text:'{readerOnly}'},{type:'image',id:'live-image',src:'$avatar'}]};await choose(a,p);
 assert.equal(a.e('build').disabled,false);assert.equal(a.e('projectDiagnostics').hidden,false);assert.match(a.e('projectDiagnosticsList').textContent,/Lua/);assert.match(a.e('projectDiagnosticsList').textContent,/assets\/one.png/);
 await a.e('build').events.click();assert.equal(a.e('result').hidden,false);const zip=await JSZip.loadAsync(await a.blobs.get(a.e('zip').href).arrayBuffer());assert.equal(await zip.file('reader.lua').async('string'),'function update() return {} end');
 await change(a,'language','en');assert.equal(a.e('build').disabled,false);assert.equal(a.e('result').hidden,false);assert.match(a.e('projectDiagnosticsList').textContent,/actual reader output/);
 a.e('source').files=[];await a.e('source').events.change();assert.equal(a.e('projectDiagnostics').hidden,true);assert.equal(a.e('build').disabled,true);
});

test('checked sources default to the original interface, template choices use local fields and failures identify their control',async()=>{
 const a=app();assert.equal(a.e('templateSection').hidden,true);await choose(a);
 assert.equal(a.e('templateMode').value,'existing');assert.equal(a.e('templateSection').hidden,false);assert.equal(a.e('build').disabled,false);
 assert.equal(a.e('choose').textContent,'Tệp ROM (.gba hoặc .zip)');assert.equal(a.e('ready').textContent,'3. Nhập vào GBA Duo Plus'); // Template translations must not overwrite other IDs.
 await change(a,'templateMode','card');assert.equal(a.e('build').disabled,true);assert.match(a.e('projectCheckStatus').textContent,/Trường tên/);
 assert(a.e('templateName').children.some(o=>o.textContent.includes('Phi công')));assert.equal(a.e('templateName').children.some(o=>o.value.includes('party')),false);
 await change(a,'templateName','pilot');assert.equal(a.e('build').disabled,false);assert.equal(a.e('templateCardFields').hidden,false);assert.equal(a.e('templateStatsFields').hidden,true);
 a.e('templateBarToggle').checked=true;await a.e('templateBarToggle').events.change();assert.equal(a.e('build').disabled,true);assert.match(a.e('templateStatus').textContent,/Trường hiện tại/);
 await change(a,'templateCurrent','energy');await change(a,'templateMaximum','capacity');assert.equal(a.e('build').disabled,false);
 assert.equal(a.e('templateCurrent').children.some(o=>o.value==='pilot'),false);assert.equal(a.e('templateMaximum').children.some(o=>o.value==='energy'),false);
 await change(a,'templateCurrent','capacity');assert.equal(a.e('build').disabled,true);assert.equal(a.e('templateMaximum').children.find(o=>o.value==='capacity').disabled,true); // Preserved invalid selections are visible, not silently changed.
});
test('stat rows accept Vietnamese labels, preserve edits across language changes and report missing later rows',async()=>{
 const a=app();await choose(a);await change(a,'templateMode','stats');assert.equal(a.e('build').disabled,true);assert.match(a.e('templateStatus').textContent,/Dòng chỉ số 1/);
 await change(a,'template-row-field-0','energy');assert.equal(a.e('template-row-label-0').value,'Năng lượng');assert.equal(a.e('build').disabled,false);
 await change(a,'template-row-label-0','Đạn còn lại','input');await a.e('templateAddRow').events.click();assert.equal(a.e('build').disabled,true);assert.match(a.e('templateStatus').textContent,/Dòng chỉ số 2/);
 await change(a,'template-row-field-1','active');assert.equal(a.e('build').disabled,false);
 await change(a,'language','en');assert.equal(a.e('template-row-label-0').value,'Đạn còn lại');assert.equal(a.e('templateMode').value,'stats');assert.equal(a.e('build').disabled,false);assert.equal(a.e('templateModeLabel').textContent,'Interface in the exported copy');
 const firstRow=a.e('templateRows').children[0],remove=firstRow.children.find(n=>n.tagName==='BUTTON');await remove.events.click();assert.equal(a.e('templateRows').children.length,1);assert.equal(a.e('template-row-field-1').value,'active');
});
test('configured build uses cached ROM/source, produces real ZIP widgets and revokes downloads when configuration changes',async()=>{
 const a=app(),p=project(),before=structuredClone(p);let reads=0;const read=a.context.CompanionBuild.readRom;a.context.CompanionBuild.readRom=async file=>{reads++;return read(file);};await choose(a,p);
 await change(a,'templateMode','card');await change(a,'templateName','pilot');await change(a,'templatePortrait','avatar');assert.equal(reads,1);
 await a.e('build').events.click();assert.equal(a.e('result').hidden,false);const zip=await JSZip.loadAsync(await a.blobs.get(a.e('zip').href).arrayBuffer()),manifest=JSON.parse(await zip.file('manifest.json').async('string'));
 assert.equal(manifest.script,'reader.lua');for(const [path,bytes]of Object.entries(before.files))assert.deepEqual(await zip.file(path).async('nodebuffer'),Buffer.from(bytes,'base64'));
 const output=JSON.parse(await a.blobs.get(a.e('project').href).text());assert.equal(output.layout.id,'builder-layout');assert.equal(output.layout.children[0].id,'builder-card');assert.deepEqual(p,before);assert.equal(reads,1);
 await change(a,'templateHeading','Phi công hiện tại','input');assert.equal(a.e('result').hidden,true);assert.equal(a.revoked.length,2);assert.equal(reads,1);
 await change(a,'templateMode','existing');await a.e('build').events.click();const original=JSON.parse(await a.blobs.get(a.e('project').href).text());assert.deepEqual(original.layout,p.layout);assert.equal(reads,1);
});
test('source replacement resets a recipe and late reads cannot restore an older form',async()=>{
 const a=app();await choose(a);await change(a,'templateMode','card');await change(a,'templateName','pilot');
 let finish;const delayed=new Promise(resolve=>{finish=resolve;});a.e('source').files=[{name:'old.json',size:5,text:()=>delayed}];const old=a.e('source').events.change();assert.equal(a.e('templateSection').hidden,true);
 const newer=project();newer.manifest.name='Mới nhất';a.e('source').files=[{name:'new.json',size:200,text:async()=>JSON.stringify(newer)}];await a.e('source').events.change();assert.equal(a.e('templateMode').value,'existing');assert.equal(a.e('templateName').value,'');
 finish(JSON.stringify(project()));await old;assert.match(a.e('projectCheckDetails').textContent,/Mới nhất/);assert.equal(a.e('sourceName').textContent,'new.json');assert.equal(a.e('build').disabled,false);
});
test('building and language changes retain configuration and restore enabled row controls after cancellation',async()=>{
 const a=app();await choose(a);await change(a,'templateMode','stats');await change(a,'template-row-field-0','energy');await a.e('templateAddRow').events.click();await change(a,'template-row-field-1','active');
 let release;const waiting=new Promise(resolve=>{release=resolve;});a.context.CompanionBuild.buildProject=async(_rom,_p,{signal})=>{await waiting;assert.equal(signal.aborted,true);const error=Error('Cancelled.');error.name='AbortError';throw error;};
 const build=a.e('build').events.click();assert.equal(a.e('templateSection').disabled,true);await change(a,'language','en');await a.e('cancel').events.click();release();await build;
 assert.equal(a.e('templateSection').disabled,false);assert.equal(a.e('templateMode').value,'stats');assert.equal(a.e('result').hidden,true);assert.equal(a.e('build').disabled,false);
 for(const row of a.e('templateRows').children)assert.equal(row.children.find(n=>n.tagName==='BUTTON').disabled,false);
});
test('stat-row limits and output-only template state stay bounded and all dependencies are loaded before app initialization',async()=>{
 const a=app();await choose(a);await change(a,'templateMode','stats');for(let i=1;i<24;i++)await a.e('templateAddRow').events.click();assert.equal(a.e('templateRows').children.length,24);assert.equal(a.e('templateAddRow').disabled,true);await a.e('templateAddRow').events.click();assert.equal(a.e('templateRows').children.length,24);
 assert.equal(nodes(a.e('templateRows')).filter(n=>n.tagName==='SELECT').length,24);
 const html=fs.readFileSync('site/index.html','utf8');assert(html.indexOf('src="builder-core.js')<html.indexOf('src="project-templates.js'));assert(html.indexOf('src="project-template-form.js')<html.indexOf('src="app.js'));
 assert.equal(/fetch\(|XMLHttpRequest/.test(fs.readFileSync('site/project-templates.js','utf8')+fs.readFileSync('site/project-template-form.js','utf8')),false);
});
