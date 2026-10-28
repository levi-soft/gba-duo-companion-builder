// Prepare a private custom companion without adding a curated game profile.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const [projectFile,romFile,output]=process.argv.slice(2);
if (!projectFile||!romFile||!output) throw Error('Usage: node scripts/build-project.mjs project.gbastudio.json game.gba output.zip');
// Never overwrite inputs or a previous output, including through a symlink.
if (fs.existsSync(output)) throw Error('Output already exists. Choose a new ZIP path.');
const absolute=p=>path.resolve(p).toLowerCase();
if ([projectFile,romFile].some(p=>absolute(p)===absolute(output))) throw Error('Output must differ from inputs.');
if (fs.statSync(projectFile).size>64*1024*1024||fs.statSync(romFile).size>32*1024*1024) throw Error('Input exceeds the project/ROM size limit.');
await import('../site/jszip.min.js');
const context={structuredClone,Uint8Array,JSZip:globalThis.JSZip};context.globalThis=context;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../site');
for (const name of ['pack-compiler.js','builder-core.js']) vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
const source=JSON.parse(fs.readFileSync(projectFile,'utf8').replace(/^\uFEFF/,''));
const result=await context.CompanionBuild.buildProject(new Uint8Array(fs.readFileSync(romFile)),source);
fs.writeFileSync(output,result.zipBytes,{flag:'wx'});
console.log(JSON.stringify({output,report:result.report,bytes:result.zipBytes.length}));
