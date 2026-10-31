import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import vm from'node:vm';
await import('../site/jszip.min.js');const JSZip=globalThis.JSZip;
const profile={id:'fixture',name:'Synthetic fixture',code:'BE8E',crc32:'3CD932D7',api:'FixturePrep',template:'FixtureTemplate',runtime:'FixtureRuntime',output:'Fixture-0.1.0'};
function rom(){const bytes=new Uint8Array(192);bytes.set(Buffer.from('BE8E'),0xac);return bytes;}
function engine(){
 let prepared=0;const events={},context={Uint8Array,ArrayBuffer,Blob,TextDecoder,structuredClone,setTimeout,clearTimeout,Promise,AbortController,JSZip,console};context.globalThis=context;
 context.document={addEventListener:(name,callback)=>{events[name]=callback;},getElementById:()=>({textContent:''})};
 context.COMPANION_PROFILES=[profile];context.FE7PublicPrep={crc32:()=>0x3cd932d7,b64:bytes=>Buffer.from(bytes).toString('base64')};
 context.COMPANION_UI_FILES={};context.FixtureTemplate={manifest:{id:'synthetic-fixture',version:'0.1.0',formatVersion:2,match:{gameCode:['BE8E'],crc32:['3CD932D7']},script:'scripts/fixture.lua'},layout:{type:'column',children:[{type:'text',text:'Synthetic test'}]},css:'',data:{value:7},files:{'scripts/fixture.lua':Buffer.from('function update() return {value=7} end').toString('base64')},width:1240,height:1080};
 context.FixtureRuntime='synthetic';context.FixturePrep={prepare:async(bytes,template,runtime,options)=>{prepared++;assert.equal(runtime,'synthetic');template.files['scripts/fixture.lua']=Buffer.from('function update() return {value=7} end').toString('base64');options.onProgress?.('Preparing synthetic fixture');return{project:template,report:{files:1,crc32:'3CD932D7'}};}};
 vm.createContext(context);for(const file of ['pack-compiler.js','builder-core.js'])vm.runInContext(fs.readFileSync('site/'+file,'utf8'),context);
 return{context,events,prepared:()=>prepared};
}
test('shared core builds the actual format-2 ZIP from a synthetic producer',async()=>{
 const {context,prepared}=engine(),bytes=rom(),before=Buffer.from(bytes),progress=[];
 const result=await context.CompanionBuild.build(bytes,{profileId:'fixture',gameCode:'BE8E',crc32:'3CD932D7',onProgress:x=>progress.push(x)});
 assert.equal(prepared(),1);assert.equal(result.profile.id,'fixture');assert.deepEqual(Buffer.from(bytes),before,'ROM remains unchanged');assert(progress.length>0);
 const zip=await JSZip.loadAsync(result.zipBytes),manifest=JSON.parse(await zip.file('manifest.json').async('string'));
 assert.equal(manifest.formatVersion,2);assert.equal(manifest.layout,'layout.json');assert.deepEqual(manifest.styles,['style.css']);
 assert.equal(await zip.file('scripts/fixture.lua').async('string'),'function update() return {value=7} end');assert(zip.file('preview-data.json'));
});

test('ZIP export preserves required host features instead of downgrading the manifest',async()=>{
 const {context}=engine();context.FixtureTemplate.manifest.formatVersion=4;
 context.FixtureTemplate.manifest.requires={features:['gba-bus-context-v1','growth-radar-v1']};
 const {zipBytes}=await context.CompanionBuild.build(rom());
 const zip=await JSZip.loadAsync(zipBytes),manifest=JSON.parse(await zip.file('manifest.json').async('string'));
 assert.equal(manifest.formatVersion,4);assert.deepEqual(manifest.requires,{features:['gba-bus-context-v1','growth-radar-v1']});
});
test('seeded pack properties preserve arbitrary asset bytes and produce identical ZIPs for identical input',async()=>{
 let seed=0x11bbaa33;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let run=0;run<20;run++){
  const e=engine(),payload=Buffer.alloc(next()%512);for(let n=0;n<payload.length;n++)payload[n]=next()>>>24;
  e.context.COMPANION_UI_FILES['assets/generated.bin']=payload.toString('base64');
  const first=await e.context.CompanionBuild.build(rom()),second=await e.context.CompanionBuild.build(rom());
  assert.deepEqual(Buffer.from(first.zipBytes),Buffer.from(second.zipBytes),'identical source must produce byte-identical ZIP');
  const zip=await JSZip.loadAsync(first.zipBytes);
  for(const entry of Object.values(zip.files))assert.equal(entry.date.getFullYear(),1980,'every ZIP entry, including folders, needs a fixed timestamp');
  assert.deepEqual(await zip.file('assets/generated.bin').async('nodebuffer'),payload,'ZIP must preserve exact binary bytes');
 }
});

test('shared core rejects unknown identities before any preparation',async()=>{
 for(const expected of [{profileId:'other'},{gameCode:'AE7E'},{crc32:'00000000'}]){
  const {context,prepared}=engine();await assert.rejects(context.CompanionBuild.build(rom(),expected));assert.equal(prepared(),0);
 }
 const {context}=engine();await assert.rejects(context.CompanionBuild.build(new Uint8Array(1)));const other=rom();other.set(Buffer.from('XXXX'),0xac);await assert.rejects(context.CompanionBuild.build(other));
});
test('verified identity reaches a generic template before producer navigation packaging',async()=>{
 const {context}=engine();context.FixtureTemplate.manifest.match={};
 const original=context.FixturePrep.prepare;
 context.FixturePrep.prepare=async(bytes,template,...rest)=>{
  assert.equal(JSON.stringify(template.manifest.match),JSON.stringify({gameCode:['BE8E'],crc32:['3CD932D7']}));
  return original(bytes,template,...rest);
 };
 const result=await context.CompanionBuild.build(rom());
 const zip=await JSZip.loadAsync(result.zipBytes),manifest=JSON.parse(await zip.file('manifest.json').async('string'));
 assert.deepEqual(manifest.match,{gameCode:['BE8E'],crc32:['3CD932D7']});
 assert.deepEqual(context.FixtureTemplate.manifest.match,{},'shared template stays generic');
});
test('cancellation prevents preparation and ZIP output',async()=>{
 const {context,prepared}=engine(),controller=new AbortController();controller.abort();await assert.rejects(context.CompanionBuild.build(rom(),{signal:controller.signal}),/Cancelled/);assert.equal(prepared(),0);
});

test('cancellation after preparation does not compile or publish a partial pack',async()=>{
 const {context,prepared}=engine(),controller=new AbortController(),original=context.FixturePrep.prepare;
 let compilations=0;
 context.FixturePrep.prepare=async(...args)=>{const result=await original(...args);controller.abort();return result;};
 context.CompanionCompiler.compileDesign=()=>{compilations++;throw Error('Compiler must not run after cancellation');};
 const bytes=rom(),before=Buffer.from(bytes);
 await assert.rejects(context.CompanionBuild.build(bytes,{signal:controller.signal}),error=>error.name==='AbortError');
 assert.equal(prepared(),1);assert.equal(compilations,0);assert.deepEqual(Buffer.from(bytes),before);
});
test('ROM file reader enforces one ROM and input limits',async()=>{
 const {context}=engine();let read=false;await assert.rejects(context.CompanionBuild.readRom({name:'huge.gba',size:65*1024*1024,arrayBuffer:async()=>{read=true;}}),/64 MiB/);assert.equal(read,false);
 const z=new JSZip();z.file('a.gba',rom());z.file('b.gba',rom());const bytes=await z.generateAsync({type:'arraybuffer'});
 await assert.rejects(context.CompanionBuild.readRom({name:'two.zip',size:bytes.byteLength,arrayBuffer:async()=>bytes}),/exactly one/);
 const one=new JSZip();one.file('only.gba',rom());const single=await one.generateAsync({type:'arraybuffer'});assert.deepEqual(Buffer.from(await context.CompanionBuild.readRom({name:'one.zip',size:single.byteLength,arrayBuffer:async()=>single})),Buffer.from(rom()));
});
test('forged ZIP size cannot bypass the actual inflated ROM limit',async()=>{
 const {context}=engine(),z=new JSZip();z.file('forged.gba',new Uint8Array(33*1024*1024));
 const bytes=await z.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:1}}),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 // Lie in local and central uncompressed-size headers. The actual data still
 // expands beyond the ROM budget, exercising the streaming rather than metadata guard.
 for(let n=0;n+28<bytes.length;n++){
  const signature=view.getUint32(n,true);if(signature===0x04034b50)view.setUint32(n+22,1,true);if(signature===0x02014b50)view.setUint32(n+24,1,true);
 }
 await assert.rejects(context.CompanionBuild.readRom({name:'forged.zip',size:bytes.length,arrayBuffer:async()=>bytes.buffer}),/32 MiB/);
});

test('ZIP stream errors reject the ROM instead of returning accumulated partial bytes',async()=>{
 const {context}=engine(),events={};let pauses=0;
 const stream={on(name,callback){events[name]=callback;return this;},pause(){pauses++;},resume(){events.data(new Uint8Array([1,2,3]));events.error(Error('Truncated ZIP stream'));events.end();}};
 context.JSZip={loadAsync:async()=>({files:{'fixture.gba':{dir:false,name:'fixture.gba',internalStream:()=>stream}}})};
 await assert.rejects(context.CompanionBuild.readRom({name:'truncated.zip',size:3,arrayBuffer:async()=>new ArrayBuffer(3)}),/Truncated ZIP stream/);
 assert.equal(pauses,1);
});
function bridgeEngine({config={},cancelAfterAppend=false,cancelBefore=false,zipBytes}={}){
 const e=engine(),chunks=[],calls=[],state={cancelled:cancelBefore};let error,fetches=0;
 e.context.PlusBuilder={configuration:()=>JSON.stringify({profileId:'fixture',gameCode:'BE8E',crc32:'3CD932D7',romUrl:'/__plus/rom.gba',...config}),cancelled:()=>state.cancelled,progress:message=>calls.push(['progress',message]),beginZip:n=>calls.push(['begin',n]),appendZip:s=>{assert(s.length<=65536);chunks.push(Buffer.from(s,'base64'));if(cancelAfterAppend)state.cancelled=true;},finishZip:()=>calls.push(['finish']),fail:message=>{error=message;calls.push(['fail',message]);}};
 e.context.fetch=async(url,options)=>{fetches++;assert.equal(url,'/__plus/rom.gba');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');return{ok:true,headers:{get:()=>String(rom().length)},arrayBuffer:async()=>rom().buffer};};
 if(zipBytes)e.context.CompanionBuild.build=async()=>({zipBytes});
 vm.runInContext(fs.readFileSync('site/plus-runner.js','utf8'),e.context);
 return{...e,chunks,calls,start:()=>e.events.DOMContentLoaded(),error:()=>error,fetches:()=>fetches};
}
test('Plus runner auto-starts and produces the same compiled pack format',async()=>{
 const e=bridgeEngine();await e.start();assert.equal(e.error(),undefined);assert.equal(e.fetches(),1);assert.equal(e.calls.at(-1)[0],'finish');
 const zip=await JSZip.loadAsync(Buffer.concat(e.chunks));assert.equal(JSON.parse(await zip.file('manifest.json').async('string')).id,'synthetic-fixture');
 const count=e.calls.length;await e.start();assert.equal(e.calls.length,count,'second DOM-ready event must not rerun a build');
});
test('Plus runner bounds streaming chunks and preserves bytes',async()=>{
 const bytes=Uint8Array.from({length:49152*2+123},(_,n)=>n%251),e=bridgeEngine({zipBytes:bytes});await e.start();assert.equal(e.chunks.length,3);assert.deepEqual(Buffer.concat(e.chunks),Buffer.from(bytes));assert.equal(e.calls.find(x=>x[0]==='begin')[1],bytes.length);
});
test('Plus runner rejects arbitrary ROM URLs before fetching',async()=>{
 const e=bridgeEngine({config:{romUrl:'https://example.invalid/rom.gba'}});await e.start();assert.match(e.error(),/configuration/);assert.equal(e.fetches(),0);assert(!e.calls.some(x=>x[0]==='begin'));
});
test('Plus runner cancellation never commits a partial pack',async()=>{
 const before=bridgeEngine({cancelBefore:true});await before.start();assert.match(before.error(),/Cancelled/);assert.equal(before.fetches(),0);
 const mid=bridgeEngine({zipBytes:new Uint8Array(100000),cancelAfterAppend:true});await mid.start();assert.match(mid.error(),/Cancelled/);assert.equal(mid.chunks.length,1);assert(!mid.calls.some(x=>x[0]==='finish'));
});

test('Plus runner reports preparation errors without beginning an install stream',async()=>{
 const e=bridgeEngine();
 e.context.FixturePrep.prepare=async()=>{throw Error('Synthetic preparation failure');};
 await e.start();
 assert.match(e.error(),/Synthetic preparation failure/);
 assert.equal(e.fetches(),1);
 assert(!e.calls.some(call=>call[0]==='begin'||call[0]==='finish'));
 assert.equal(e.chunks.length,0);
});
