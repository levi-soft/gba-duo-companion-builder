import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
await import('./jszip.min.js');
const root=path.dirname(fileURLToPath(import.meta.url)),zip=new globalThis.JSZip();
async function add(dir,prefix=''){
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const name=prefix+entry.name;
  if(entry.isDirectory()){
   if(!['profiles','THIRD-PARTY','fe7-vietnamese','fe6-remastered','fe8-vietnamese','compiler-source','ui-source'].includes(entry.name))throw Error('Unexpected directory '+name);
   await add(path.join(dir,entry.name),name+'/');
  }else if(!entry.name.endsWith('.zip')&&entry.name!=='native-design.js'){
   if(/\.gba$|prepared-project|generated-tables|reference-tables|Local\.zip|\.gbastudio\.json$/.test(name))throw Error('Private file '+name);
   zip.file(name,await fs.readFile(path.join(dir,entry.name)));
  }
 }
}
await add(root);
// Keep the standalone packager's filename in sync with this local kit.
const readme=await fs.readFile(path.join(root,'README.md'),'utf8');
const version=readme.match(/^# Fire Emblem Companion Builder (\d+\.\d+\.\d+)/)?.[1];
if(!version)throw Error('Kit version is missing from README.md');
const output=process.argv[2]||path.resolve(root,`../FE-Companion-Builder-${version}-Public-Kit.zip`);
await fs.writeFile(output,await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}}));
console.log(output);

