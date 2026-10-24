import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';import vm from'node:vm';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),site=path.join(root,'site');
const config=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),version=config.version;
await import('../site/jszip.min.js');
const ctx={};ctx.globalThis=ctx;vm.runInNewContext(fs.readFileSync(path.join(site,'profiles.js'),'utf8'),ctx);
const zip=new globalThis.JSZip(),entries=[];
function walk(dir,prefix=''){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
  const relative=prefix+entry.name;if(relative==='catalog.json'||relative==='releases'||relative.startsWith('releases/'))continue;
  if(entry.isSymbolicLink())throw Error('Distribution must not contain symlinks');
  if(entry.isDirectory())walk(path.join(dir,entry.name),relative+'/');
  else{
   if(/\.gba$|\.gbastudio\.json$|Local\.zip$|capture.*\.json$|\.sav$|\.ss$/i.test(relative))throw Error('Private/generated game file: '+relative);
   const data=fs.readFileSync(path.join(dir,entry.name));entries.push({name:relative,bytes:data.length});
   zip.file(relative,data,{date:new Date('2000-01-01T00:00:00Z'),unixPermissions:0o100644,createFolders:false});
  }
 }
}
walk(site);
for(const name of ['index.html','plus-runner.html','plus-runner.js','builder-core.js','LICENSE'])if(!entries.some(e=>e.name===name))throw Error('Missing distribution entry: '+name);
const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:9},platform:'UNIX'});
fs.mkdirSync(path.join(site,'releases'),{recursive:true});const url=`releases/builder-${version}.zip`;fs.writeFileSync(path.join(site,url),bytes);
const catalog={schemaVersion:1,runnerProtocol:1,builderVersion:version,builder:{url,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,unpackedBytes:entries.reduce((n,e)=>n+e.bytes,0),entrypoint:'plus-runner.html'},profiles:ctx.COMPANION_PROFILES.map(p=>{const version=p.output.match(/-(\d+\.\d+\.\d+)$/)?.[1];if(!version)throw Error('Profile version missing: '+p.id);return{id:p.id,name:p.name,version,gameCode:p.code,crc32:p.crc32};})};
fs.writeFileSync(path.join(site,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
fs.mkdirSync(path.join(root,'reports'),{recursive:true});fs.writeFileSync(path.join(root,'reports/distribution.json'),JSON.stringify({version,catalog,files:entries},null,2)+'\n');
console.log(JSON.stringify({version,files:entries.length,bytes:catalog.builder.bytes,unpackedBytes:catalog.builder.unpackedBytes,sha256:catalog.builder.sha256},null,2));
