import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
await import('../site/jszip.min.js');const JSZip=globalThis.JSZip;
const plain=value=>JSON.parse(JSON.stringify(value));
function project(){return {manifest:{id:'custom-reader',name:'Bộ đọc riêng',version:'1.0.0',match:{gameCode:['TEST'],crc32:['2419A356']},script:'reader.lua',values:{energy:{type:'u8',addr:'02000000'}},studioDataFields:{pilot:{labelVi:'Phi công'},energy:{labelVi:'Năng lượng',kind:'number'},capacity:{kind:'number'},unknown:{kind:'number',labelVi:'Khai báo chưa có mẫu'}}},width:640,height:480,css:':root { color: white; }',data:{pilot:'Aya',portrait:'asset:portrait.png',rank:4,energy:0,capacity:'---',active:false,party:[{name:'Row only'}],ui:{page:'Old'}},layout:{type:'text',id:'original',text:'{pilot}'},files:{'reader.lua':Buffer.from('function update() return {} end').toString('base64'),'assets/opaque.bin':Buffer.from([0,255,7]).toString('base64')}};}
function engine(){const c={Uint8Array,structuredClone,JSZip};c.globalThis=c;vm.createContext(c);for(const name of ['pack-compiler.js','function-blocks.js','builder-core.js','project-templates.js'])vm.runInContext(fs.readFileSync('site/'+name,'utf8'),c);return c;}
const config={kind:'overview',title:'Thông tin',card:{nameField:'pilot',portraitField:'portrait',levelField:'rank',levelLabel:'Hạng',barEnabled:true,currentField:'energy',maximumField:'capacity',barLabel:'Năng lượng'},rows:[{field:'active',label:'Sẵn sàng'},{field:'energy',label:'Năng lượng'}]};
function walk(node){return [node,...(node.children??[]).flatMap(walk)];}
test('template catalog uses root reader fields, author labels and declared placeholders without making observations',()=>{
 const c=engine(),p=project(),before=structuredClone(p),fields=plain(c.CompanionTemplates.catalog(p,'vi'));
 assert.equal(fields.find(f=>f.path==='pilot').label,'Phi công');assert.equal(fields.find(f=>f.path==='energy').value,0);assert.equal(fields.find(f=>f.path==='active').value,false);
 assert.equal(fields.find(f=>f.path==='capacity').kind,'number');assert.equal(fields.find(f=>f.path==='unknown').declared,true);
 assert.equal(fields.some(f=>f.path.includes('party')||f.path.startsWith('ui.')),false);assert.deepEqual(p,before);
});
test('existing interface is the default identity operation and new templates preserve reader/resources/data and source identity',()=>{
 const c=engine(),p=project(),before=structuredClone(p);assert.equal(c.CompanionTemplates.prepare(p,{kind:'existing'}),p);
 const next=c.CompanionTemplates.prepare(p,config);assert.notEqual(next,p);assert.equal(next.manifest.script,'reader.lua');assert.deepEqual(next.manifest.values,p.manifest.values);assert.deepEqual(plain(next.files),p.files);assert.notEqual(next.files,p.files);assert.deepEqual(next.data,p.data);assert.equal(next.css,p.css);assert.deepEqual(next.manifest.match,p.manifest.match);
 const nodes=walk(next.layout);assert.equal(nodes.length,new Set(nodes.map(n=>n.id)).size);assert(nodes.some(n=>n.src==='$portrait'));assert(nodes.some(n=>n.value==='$energy'&&n.maxKey==='$capacity'));assert(nodes.some(n=>n.text==='Hạng: {rank}'));assert(nodes.some(n=>n.text==='Sẵn sàng'));assert.deepEqual(p,before);
 for(const kind of ['card','stats'])assert.equal(c.CompanionTemplates.prepare(p,{...config,kind}).layout.children.length,1);
});
test('template packaging uses exact existing reader bytes and remains a native editable format-2 pack',async()=>{
 const c=engine(),p=project(),rom=new Uint8Array(192);rom.set(Buffer.from('TEST'),0xac);const bytes=Buffer.from(rom),next=c.CompanionTemplates.prepare(p,config);
 const result=await c.CompanionBuild.buildProject(rom,next),zip=await JSZip.loadAsync(result.zipBytes),manifest=JSON.parse(await zip.file('manifest.json').async('string')),layout=JSON.parse(await zip.file('layout.json').async('string'));
 assert.equal(manifest.formatVersion,2);assert.deepEqual(manifest.match,{gameCode:['TEST'],crc32:['2419A356']});assert.equal(manifest.script,'reader.lua');assert.deepEqual(manifest.values,p.manifest.values);
 for(const [path,bytes]of Object.entries(p.files))assert.deepEqual(await zip.file(path).async('nodebuffer'),Buffer.from(bytes,'base64'));
 assert(walk(layout).some(n=>n.value==='$energy'));assert.equal(result.report.runtimeVerified,false);assert.deepEqual(Buffer.from(rom),bytes);
 assert.deepEqual(JSON.parse(await zip.file('preview-data.json').async('string')),p.data);
});
test('missing, unsafe, list-row, wrongly typed and ambiguous template choices are rejected atomically',()=>{
 const invalid=[{kind:'other'},{...config,card:{}},{...config,card:{...config.card,nameField:'party[].name'}},{...config,card:{...config.card,nameField:'ui.page'}},{...config,card:{...config.card,nameField:'constructor'}},{...config,card:{...config.card,portraitField:'rank'}},{...config,card:{...config.card,currentField:'pilot'}},{...config,card:{...config.card,maximumField:'energy'}},{...config,rows:[]},{...config,rows:[{field:'missing',label:'Chưa có'}]},{...config,rows:[{field:'energy',label:'{bad}'}]},{...config,title:'a'.repeat(129)},{...config,rows:Array(25).fill({field:'energy',label:'X'})}];
 const c=engine();for(const choice of invalid){const p=project(),before=structuredClone(p);assert.throws(()=>c.CompanionTemplates.prepare(p,choice));assert.deepEqual(p,before);}
});
test('generated template configurations keep only selected fields in native widgets and do not mutate the source',()=>{
 let seed=0x7ef1;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;const c=engine();
 for(let n=0;n<60;n++){const p=project(),before=structuredClone(p),count=1+random()%24,fields=['energy','active','rank','unknown'],rows=Array.from({length:count},(_,i)=>({field:fields[random()%fields.length],label:`Dòng ${i} Ω`}));
  const a=c.CompanionTemplates.prepare(p,{kind:'stats',rows}),b=c.CompanionTemplates.prepare(p,{kind:'stats',rows});assert.deepEqual(a,b);const nodes=walk(a.layout);
  for(let i=0;i<count;i++)assert(nodes.some(node=>node.id==='builder-stats-value-'+i&&node.text==='{'+rows[i].field+'}'));assert.deepEqual(p,before);
 }
});
