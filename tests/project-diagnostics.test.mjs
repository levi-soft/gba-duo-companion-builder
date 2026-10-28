import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function engine(){const context={structuredClone,Uint8Array};context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync('site/builder-core.js','utf8'),context);return context;}
const project=()=>({manifest:{id:'diagnostic-test',name:'Test',version:'1.0.0',match:{gameCode:['TEST'],crc32:['2419A356']}},width:640,height:480,layout:{type:'column',id:'root',children:[]},css:'',data:{hp:0,active:false,name:'Aya'},files:{}});
const inspect=(c,p)=>JSON.parse(JSON.stringify(c.CompanionBuild.projectDiagnostics(p)));
const fields=r=>r.issues.filter(i=>i.field).map(i=>i.field);

test('the standalone Builder embeds the readable shared diagnostics source without an additional runtime script',()=>{
 const source=fs.readFileSync('ui/project-diagnostics.js','utf8').replace(/\r\n/g,'\n').replace(/^export /gm,'').trimEnd().split('\n').map(line=>'  '+line).join('\n');
 const core=fs.readFileSync('site/builder-core.js','utf8').replace(/\r\n/g,'\n');assert(core.includes('// BEGIN GENERATED PROJECT DIAGNOSTICS\n'+source+'\n  // END GENERATED PROJECT DIAGNOSTICS'));
 assert.equal(typeof engine().CompanionBuild.projectDiagnostics,'function');
});

test('dependency checks report exact components and properties across inactive pages, CSS, fonts and skins',()=>{
 const c=engine(),p=project();p.css='@font-face { font-family: demo; src: url("fonts/missing.woff2") }';
 p.layout.children=[{id:'portrait',type:'image',src:'asset:portraits/missing.png'},{type:'pages',id:'pages',pages:[{name:'a',child:{type:'text',text:'Ready'}},{name:'b',child:{type:'button',id:'action',buttonSkin:{normal:'assets/button.png',pressed:'assets/down.png'}}}]}];
 p.files['assets/button.png']='';const before=structuredClone(p),r=inspect(c,p);
 assert.equal(r.errors,3);assert.equal(r.complete,true);
 assert(r.issues.some(i=>i.nodeId==='portrait'&&i.property==='src'&&i.detail==='assets/portraits/missing.png'));
 assert(r.issues.some(i=>i.nodeId==='action'&&i.property==='buttonSkin.pressed'&&i.detail==='assets/down.png'));
 assert(r.issues.some(i=>i.location==='style.css'&&i.detail==='assets/fonts/missing.woff2'));
 assert.deepEqual(p,before);assert.match(c.CompanionBuild.projectIssueText(r.issues[0],'vi'),/Thiếu/);assert.match(c.CompanionBuild.projectIssueText(r.issues[0],'en'),/missing/);
});

test('runtime fields and sampled/conditional images remain nonblocking while compiler-required skins do not',()=>{
 const c=engine(),p=project();p.manifest.script='reader.lua';p.files['reader.lua']='';p.data.portrait='asset:generated.png';
 p.layout.children=[{type:'text',id:'name',text:'{runtime.name}'},{type:'image',id:'sample',src:'$portrait'},{type:'box',id:'hidden',visibleIf:'$active',children:[{type:'image',src:'asset:optional.png'}]},{type:'image',src:'assets/{name}.png'}];
 let r=inspect(c,p);assert.equal(r.errors,0);assert.equal(r.warnings,2);assert.equal(r.info,1);assert(r.issues.some(i=>i.code==='sample-asset'));assert(r.issues.some(i=>i.code==='conditional-asset'));
 p.layout.children.push({type:'button',id:'skin',visibleIf:'$active',buttonSkin:{normal:'assets/missing.png'}});r=inspect(c,p);assert.equal(r.errors,1);
 delete p.manifest.script;r=inspect(c,p);assert.equal(r.info,0);assert(r.issues.some(i=>i.code==='missing-field'&&i.field==='runtime.name'));
});

test('bindings follow native text, action, bar, state and list scopes without scanning literal JSON',()=>{
 const c=engine(),p=project();p.data.party=[{name:'Row',hp:0,active:false}];p.manifest.studioDataFields={'party[].rank':{kind:'number'}};p.manifest.values={max:{type:'u8',addr:'02000000'}};
 p.layout.children=[{type:'bar',id:'bar',value:'$hp',maxKey:'max',label:'{hp}'},{type:'list',id:'party',items:'$party',template:{type:'button',id:'row',text:'{name} {hp} {active} {rank} {@index} {item} {ui.page}',visibleIf:'active',classIf:{selected:'$active'},bindStyle:{opacity:'{hp}'},onClick:{set:{selected:'{name}',literal:{text:'{not_a_binding}'}},call:'literal_call',args:['$absent',false,{literal:'{ignore}'}],navigate:'details-{missingPage}'}}}];
 const r=inspect(c,p);assert.equal(r.errors,0);assert.deepEqual(fields(r).sort(),['absent','missingPage']);
 assert(r.issues.some(i=>i.nodeId==='row'&&i.property==='onClick.args.0'));assert(r.issues.some(i=>i.property==='onClick.navigate'));
});

test('empty and nested lists use representative local samples and schema without inventing missing fields',()=>{
 const c=engine(),p=project();p.data.party=[{members:[{score:0}]}];p.data.empty=[];p.manifest.studioDataFields={'party[].members[].declared':{kind:'number'}};
 p.layout.children=[{type:'list',items:'party',template:{type:'list',items:'members',template:{type:'text',text:'{score} {declared}'}}},{type:'list',items:'empty',template:{type:'column',children:[{type:'text',text:'{unobserved}'},{type:'image',id:'empty-image',src:'asset:still-required.png'}]}}];
 const r=inspect(c,p);assert.equal(r.errors,1);assert.equal(r.warnings,1);assert.equal(r.issues.find(i=>i.level==='warning').code,'row-sample');assert(r.issues.some(i=>i.nodeId==='empty-image'));assert.equal(fields(r).includes('unobserved'),false);
});

test('CSS URL inspection skips comments/strings and remote URLs but checks multiple local URLs and decoded names',()=>{
 const c=engine(),p=project();p.files['assets/ảnh một.png']='';
 p.css=`/* url(comment.png) */ text { content: 'url(string.png)'; background:url("%E1%BA%A3nh%20m%E1%BB%99t.png"); mask:url(missing.svg#part); border-image:URL('other.png'); } image { background:url(https://example.invalid/image.png),url(data:image/png;base64,AA==) }`;
 const r=inspect(c,p);assert.equal(r.errors,2);assert.deepEqual(r.issues.map(i=>i.detail).sort(),['assets/missing.svg','assets/other.png']);
 p.css='';p.layout.children=[{type:'image',src:'asset:../bad.png'},{type:'text',text:'Price $5; {constructor.hidden}'}];const unsafe=inspect(c,p);assert.equal(unsafe.errors,1);assert.equal(unsafe.warnings,1);assert.equal(unsafe.issues[0].code,'asset-path');
});

test('custom packaging rejects missing files before compile/ZIP, retains identity and never changes inputs',async()=>{
 const c=engine(),p=project(),rom=new Uint8Array(192);rom.set(Buffer.from('TEST'),0xac);p.layout.children.push({type:'image',id:'missing',src:'asset:no.png'});const before=structuredClone(p),bytes=Buffer.from(rom);
 c.CompanionCompiler={compileDesign(){assert.fail('Must not compile a blocked project');}};c.JSZip=class{constructor(){assert.fail('Must not create ZIP');}};
 const checked=c.CompanionBuild.inspectProject(rom,p);assert.equal(checked.diagnostics.errors,1);
 await assert.rejects(c.CompanionBuild.buildProject(rom,p),error=>{assert.match(error.message,/references/);assert.equal(error.diagnostics.issues[0].nodeId,'missing');assert.equal(error.romIdentity.crc32,'2419A356');return true;});
 assert.deepEqual(p,before);assert.deepEqual(Buffer.from(rom),bytes);
});

test('large diagnostic reports preserve total counts and prioritize blocking issues even after many notes',()=>{
 const c=engine(),p=project();p.layout.children=Array.from({length:130},(_,i)=>({type:'text',id:'note'+i,text:'{unknown'+i+'}'}));p.layout.children.push({type:'image',id:'late-error',src:'asset:missing.png'});
 const r=inspect(c,p);assert.equal(r.errors,1);assert.equal(r.warnings,130);assert.equal(r.issues.length,100);assert.equal(r.truncated,true);assert.equal(r.issues[0].nodeId,'late-error');assert.equal(r.complete,true);
 const cyclic=project();cyclic.layout.children.push(cyclic.layout);const bounded=inspect(c,cyclic);assert.equal(bounded.complete,false);assert(bounded.issues.some(i=>i.code==='diagnostic-limit'));
});

test('seeded present/missing reference sets obey file-addition monotonicity and leave their source untouched',()=>{
 const c=engine();let seed=0x51a7e;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 for(let run=0;run<80;run++){
  const p=project(),count=1+next()%30;let missing=0;
  for(let i=0;i<count;i++){const name='assets/ảnh-'+run+'-'+i+'.png';p.layout.children.push({type:'image',id:'image-'+i,src:name});if(next()%3)p.files[name]='';else missing++;}
  const before=structuredClone(p),a=inspect(c,p);assert.equal(a.errors,missing);assert.deepEqual(p,before);
  for(const node of p.layout.children)p.files[node.src]='';const b=inspect(c,p);assert.equal(b.errors,0);assert.equal(b.warnings,0);assert.equal(b.info,0);
 }
});

test('existing browser-only assets are flagged at their references without dropping files or flagging unused resources',()=>{
 const c=engine(),p=project();p.files={'assets/vector.svg':'','assets/font.woff2':'','assets/unused.svg':'','assets/ok.png':''};p.data.portrait='asset:vector.svg';
 p.css='@font-face { font-family: web; src:url(font.woff2) }';
 p.layout.children=[{id:'direct',type:'image',src:'asset:vector.svg'},{id:'skin',type:'button',buttonSkin:{normal:'assets/vector.svg'}},{id:'sample',type:'image',src:'$portrait'},{id:'legacy-font',type:'text',text:'Font',font:'font.woff2'},{id:'ok',type:'image',src:'asset:ok.png'}];
 const before=structuredClone(p),r=inspect(c,p);assert.equal(r.errors,0);assert.equal(r.warnings,5);assert(r.issues.every(i=>['android-image-format','android-font-format'].includes(i.code)));assert(!r.issues.some(i=>i.detail==='assets/unused.svg'));
 assert(r.issues.some(i=>i.nodeId==='skin'&&i.property==='buttonSkin.normal'));assert(r.issues.some(i=>i.location==='style.css'&&i.code==='android-font-format'));assert(r.issues.some(i=>i.nodeId==='sample'));assert.deepEqual(p,before);
 for(const issue of r.issues){assert.match(c.CompanionBuild.projectIssueText(issue,'vi'),/Companion Android/);assert.match(c.CompanionBuild.projectIssueText(issue,'en'),/Android companion/);}
});
