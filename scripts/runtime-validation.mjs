// Usage: node scripts/runtime-validation.mjs /path/to/private-config.json [--baseline]
// The config, ROMs, RAM captures and output must remain outside tracked source.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {luaFactory,captureRanges,executeProject,compareProjects,projectSource} from './runtime-validation-engine.mjs';

const configFile=process.argv[2];
if(!configFile)throw Error('Provide a private validation config JSON; see docs/runtime-modules.md.');
const config=JSON.parse(fs.readFileSync(configFile,'utf8').replace(/^\uFEFF/,''));
const baselineOnly=process.argv.includes('--baseline');
const resolve=file=>path.resolve(path.dirname(configFile),file);
const factory=luaFactory(config.luaModulePath?resolve(config.luaModulePath):undefined);
const context={structuredClone,TextEncoder,btoa:value=>Buffer.from(value,'binary').toString('base64')};context.globalThis=context;
if(!baselineOnly)for(const file of config.moduleScripts||[])vm.runInNewContext(fs.readFileSync(resolve(file),'utf8'),context,{filename:file});
const rows=[];
for(const profile of config.profiles){
 const before=JSON.parse(fs.readFileSync(resolve(profile.project),'utf8'));
 let after;
 if(!baselineOnly){
  if(profile.candidate)after=JSON.parse(fs.readFileSync(resolve(profile.candidate),'utf8'));
  else{
   const data=projectSource(before,before.manifest.script).match(/^local D=([^\r\n]+)/m)?.[1];
   if(!data)throw Error('Baseline generated ROM table is missing');
   after=structuredClone(before);context.CompanionRuntime.install(after,profile.id,data);
  }
  if(profile.zip){
   await import('../site/jszip.min.js');
   const zip=await globalThis.JSZip.loadAsync(fs.readFileSync(resolve(profile.zip)));
   const manifest=JSON.parse(await zip.file('manifest.json').async('string'));
   assert.equal(manifest.script,after.manifest.script,'ZIP entry point differs from prepared project');
   assert.equal(manifest.version,after.manifest.version,'ZIP version differs from prepared project');
   const names=Object.keys(zip.files).filter(name=>!zip.files[name].dir&&name.endsWith('.lua')).sort();
   assert.deepEqual(names,Object.keys(after.files).filter(name=>name.endsWith('.lua')).sort(),'ZIP Lua modules differ from prepared project');
   const files={};
   for(const name of names){
    const bytes=await zip.files[name].async('nodebuffer');
    assert(bytes.equals(Buffer.from(after.files[name],'base64')),'ZIP Lua bytes differ: '+name);
    files[name]=bytes.toString('base64');
   }
   after={manifest,files};
  }
 }
 const ranges=profile.capture?captureRanges(resolve(profile.capture)):profile.ranges.map(range=>({address:range.address,bytes:fs.readFileSync(resolve(range.file))}));
 const rom=fs.readFileSync(resolve(profile.rom));
 const cases=profile.cases||[{name:'forecast-popup',steps:[{ticks:45,ui:{mainTab:'Units',predictionPopup:true}},{ticks:3,ui:{mainTab:'Map',predictionPopup:false}},{ticks:3,ui:{mainTab:'Units',growthPopup:true}}]}];
 for(const testCase of cases){
  const options={factory,ranges,rom,steps:testCase.steps,requiredCalls:testCase.requiredCalls};
  const evidence=baselineOnly?await executeProject(before,options):await compareProjects(before,after,options);
  const summary=baselineOnly?{ticks:evidence.values.length,readOnly:evidence.readOnly,outputSha256:crypto.createHash('sha256').update(JSON.stringify(evidence.values)).digest('hex')}:evidence;
  rows.push({profile:profile.id,case:testCase.name,...summary});
  console.log(profile.id+' / '+testCase.name+': '+summary.ticks+' ticks, read-only'+(baselineOnly?' baseline':' outputs identical'));
 }
}
if(config.report){const report=resolve(config.report);fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({baselineOnly,cases:rows},null,2)+'\n');}
