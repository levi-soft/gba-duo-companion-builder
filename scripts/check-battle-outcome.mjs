// Usage: node scripts/check-battle-outcome.mjs /private/battle-case.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {parseEvidence} from './ram-evidence.mjs';
import {romIdentity} from './replay-evidence.mjs';
import {verifyBattleOutcome} from './battle-outcome.mjs';
const input=process.argv[2];if(!input)throw Error('Provide a private battle case JSON.');
const resolve=name=>path.resolve(path.dirname(input),name),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const configBytes=fs.readFileSync(input),config=JSON.parse(configBytes.toString('utf8').replace(/^\uFEFF/,''));
const file=resolve(config.evidence);assert(fs.statSync(file).size<=8*1024*1024,'Evidence file exceeds 8 MiB');
const evidenceBytes=fs.readFileSync(file),doc=parseEvidence(evidenceBytes.toString('utf8'));
const romFile=resolve(config.rom);assert(fs.statSync(romFile).size<=32*1024*1024,'ROM exceeds 32 MiB');
const rom=fs.readFileSync(romFile);assert.deepEqual(romIdentity(rom),config.match,'Actual ROM differs from outcome case');
if(config.report){
  const canonical=p=>{const absolute=fs.existsSync(p)?fs.realpathSync(p):path.resolve(p);return process.platform==='win32'?absolute.toLowerCase():absolute;};
  assert(![input,file,romFile].map(canonical).includes(canonical(resolve(config.report))),'Report must not overwrite a case, evidence or ROM input');
}
const result=verifyBattleOutcome(doc,config);
result.hashes={rom:sha(rom),evidence:sha(evidenceBytes),config:sha(configBytes),oracle:sha(fs.readFileSync(new URL('./battle-outcome.mjs',import.meta.url)))};
if(config.report){const output=resolve(config.report);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');}
console.log(`${result.passed?'PASS':'FAIL'}: ${result.checks.length} checks, ${result.expGain} EXP, level ${result.unitBefore.level} → ${result.unitAfter.level}`);
for(const c of result.checks.filter(c=>!c.passed))console.error(`${c.field}: expected ${c.expected}, actual ${c.actual}`);
if(!result.passed)process.exitCode=1;
