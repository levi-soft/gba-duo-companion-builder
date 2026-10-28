// Private ROMs, captures, projects, config and report stay outside public source.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {parseEvidence,validateEvidence} from './ram-evidence.mjs';
import {executeProject,luaFactory} from './runtime-validation-engine.mjs';

const crcTable=Uint32Array.from({length:256},(_,n)=>{
  for(let bit=0;bit<8;bit++)n=n&1?0xedb88320^(n>>>1):n>>>1;
  return n>>>0;
});
export function romIdentity(rom){
  if(!(rom instanceof Uint8Array)||rom.length<192||rom.length>32*1024*1024)throw Error('Invalid GBA ROM size.');
  let crc=0xffffffff;for(const byte of rom)crc=crcTable[(crc^byte)&255]^(crc>>>8);
  return {gameCode:String.fromCharCode(...rom.subarray(0xac,0xb0)),crc32:((crc^0xffffffff)>>>0).toString(16).toUpperCase().padStart(8,'0')};
}

export async function replayEvidence(project,evidence,rom,plan={},factory=luaFactory()){
  const doc=validateEvidence(evidence),identity=romIdentity(rom),first=doc.samples[0].packet;
  assert.equal(identity.gameCode,first.gameCode,'Evidence game code differs from ROM');
  assert.equal(identity.crc32,first.crc32,'Evidence CRC32 differs from ROM');
  assert(project.manifest.match?.gameCode?.includes(identity.gameCode),'Project must match the exact evidence game code');
  assert(project.manifest.match?.crc32?.some(c=>c.toUpperCase()===identity.crc32),'Project must match the exact evidence CRC32');
  const rows=[];
  for(const sample of doc.samples){
    const config=Object.hasOwn(plan,sample.label)?plan[sample.label]:{};
    const ranges=sample.packet.ranges.map(r=>({address:r.address,bytes:Buffer.from(r.base64,'base64')}));
    const steps=config.steps??[{ticks:3,ui:{}}];
    assert(Array.isArray(steps)&&steps.length>0,'Replay needs at least one step');
    let ticks=0;
    for(const step of steps){assert(Number.isSafeInteger(step.ticks)&&step.ticks>=1&&step.ticks<=1000,'Invalid replay tick count');ticks+=step.ticks;assert(ticks<=1000,'Replay sample exceeds 1000 ticks');assert(!step.patches&&!step.focusUnit,'Evidence replay is read-only; use runtime-validation for isolated experiments');}
    const output=await executeProject(project,{factory,ranges,rom,steps});
    rows.push({label:sample.label,frame:sample.packet.frame,ticks:output.values.length,readOnly:output.readOnly,
      expectedFields:steps.reduce((n,s)=>n+Object.keys(s.expect??{}).length,0),
      outputSha256:crypto.createHash('sha256').update(JSON.stringify(output.values)).digest('hex'),values:output.values.at(-1)});
  }
  return {identity,romSha256:crypto.createHash('sha256').update(rom).digest('hex'),samples:rows};
}

async function main(){
  const configFile=process.argv[2];if(!configFile)throw Error('Usage: node scripts/replay-evidence.mjs /private/config.json');
  const config=JSON.parse(fs.readFileSync(configFile,'utf8').replace(/^\uFEFF/,''));
  const resolve=file=>path.resolve(path.dirname(configFile),file);
  const evidenceFile=resolve(config.evidence);
  if(fs.statSync(evidenceFile).size>8*1024*1024)throw Error('Evidence file is too large.');
  const evidence=parseEvidence(fs.readFileSync(evidenceFile,'utf8'));
  const result=await replayEvidence(JSON.parse(fs.readFileSync(resolve(config.project),'utf8')),evidence,fs.readFileSync(resolve(config.rom)),config.samples,luaFactory(config.luaModulePath?resolve(config.luaModulePath):undefined));
  result.evidenceSha256=crypto.createHash('sha256').update(fs.readFileSync(evidenceFile)).digest('hex');
  result.projectSha256=crypto.createHash('sha256').update(fs.readFileSync(resolve(config.project))).digest('hex');
  if(config.report){const file=resolve(config.report);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');}
  for(const sample of result.samples)console.log(`${sample.label}: ${sample.ticks} read-only Lua ticks, ${sample.expectedFields} expected fields checked`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
