import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {romIdentity} from '../scripts/replay-evidence.mjs';
import {appendEvidence} from '../scripts/ram-evidence.mjs';
import {readOutcomeUnit,verifyBattleOutcome} from '../scripts/battle-outcome.mjs';
const match={gameCode:'TEST',crc32:'12345678'};
const fields=Object.fromEntries(Object.entries({characterPointer:[0,'u32'],classPointer:[4,'u32'],deployment:[11,'u8'],level:[8,'u8'],exp:[9,'u8'],hp:[19,'u8'],maxHp:[18,'u8'],power:[20,'u8'],speed:[22,'u8']}).map(([k,[offset,type]])=>[k,{offset,type}]));
const unit={address:0x02000000,fields},target={address:0x02000048,fields};
function make({exp=97,gain=13,power=14,speed=11,hpGain=0,powerGain=1,speedGain=1,kill=true}={}){
  const first=Buffer.alloc(256),last=Buffer.alloc(256);
  for(const b of [first,last]){
    b.writeUInt32LE(0x08000100,0);b.writeUInt32LE(0x08000200,4);b[11]=2;
    b.writeUInt32LE(0x08000300,72);b.writeUInt32LE(0x08000400,76);b[83]=129;b[80]=1;b[90]=21;
    b[0xf0]=9;
  }
  first[8]=7;first[9]=exp;first[18]=23;first[19]=23;first[20]=power;first[22]=speed;first[91]=21;
  last[8]=7+Math.floor((exp+gain)/100);last[9]=(exp+gain)%100;last[18]=23+hpGain;last[19]=9;last[20]=power+powerGain;last[22]=speed+speedGain;last[91]=kill?0:10;
  const packet=(bytes,frame)=>({...match,sessionId:'session-a',packId:'pack',frame,ranges:[{address:0x02000000,length:bytes.length,base64:bytes.toString('base64')}]});
  let doc=appendEvidence(null,packet(first,100),'Before');doc=appendEvidence(doc,packet(last,500),'After');
  const config={match,before:'Before',after:'After',unit,target,expPerLevel:100,expected:{expGain:gain,condition:kill?'kill':'damage',stats:{maxHp:23+hpGain,power:power+powerGain,speed:speed+speedGain},before:{level:7,exp}},guards:[{name:'chapter',address:0x020000f0,type:'u8',value:9}]};
  return {doc,config,first,last,packet};
}
test('outcome oracle reads actual unit bytes, checks EXP rollover and uses maximum HP rather than combat HP',()=>{
  const {doc,config}=make({hpGain:1});const result=verifyBattleOutcome(doc,config);
  assert.equal(result.passed,true);assert.equal(result.expGain,13);assert.equal(result.unitAfter.exp,10);assert.equal(result.unitAfter.level,8);
  assert.equal(result.unitAfter.hp,9);assert.equal(result.unitAfter.maxHp,24);assert.equal(result.target.condition,'kill');
});
test('wrong prediction reports failed stat/EXP checks instead of treating companion output as an oracle',()=>{
  const {doc,config}=make();config.expected.expGain=8;config.expected.stats.power=14;config.expected.condition='damage';
  const out=verifyBattleOutcome(doc,config);assert.equal(out.passed,false);
  assert.deepEqual(out.checks.filter(c=>!c.passed).map(c=>c.field),['expGain','exp','power','condition']);
});
test('rejects mixed identity, promotion, dead actor, capped EXP and rewound states',()=>{
  for(const mutate of [b=>b.writeUInt32LE(0x08000900,0),b=>b.writeUInt32LE(0x08000900,4),b=>{b[11]=3;},b=>{b[19]=0;},b=>{b[9]=255;},b=>{b[8]=9;}]){
    const c=make();mutate(c.last);c.doc.samples[1].packet=c.packet(c.last,500);assert.throws(()=>verifyBattleOutcome(c.doc,c.config));
  }
  const {doc,config}=make();doc.samples[1].packet.frame=99;assert.throws(()=>verifyBattleOutcome(doc,config),/later emulator frame/);
  doc.samples[1].packet.frame=500;config.match={...match,crc32:'00000000'};assert.throws(()=>verifyBattleOutcome(doc,config),/ROM filter/);
});
test('strict layouts reject missing fields, out-of-capture reads and duplicate sample labels',()=>{
  const {doc,config}=make();assert.throws(()=>readOutcomeUnit(doc.samples[0],{...unit,address:0x08000000}),/outside captured/);
  assert.throws(()=>readOutcomeUnit(doc.samples[0],{...unit,fields:{...fields,exp:{offset:-1,type:'u8'}}}));
  assert.throws(()=>verifyBattleOutcome(doc,{...config,expected:{...config.expected,stats:{hp:9}}}),/persistent stat/);
  assert.throws(()=>verifyBattleOutcome(doc,{...config,guards:Array(65).fill(config.guards[0])}),/64/);
  doc.samples[1].label='Before';assert.throws(()=>verifyBattleOutcome(doc,config),/exactly one/);
});
test('seeded progression properties distinguish correct and single-field-mutated predictions',()=>{
  let state=0x5127aa33;const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
  for(let i=0;i<160;i++){
    const c=make({exp:next()%100,gain:next()%100,power:1+next()%30,speed:1+next()%30,hpGain:next()%2,powerGain:next()%2,speedGain:next()%2,kill:!!(next()>>>31)});
    const expected=c.config.expected.expGain,out=verifyBattleOutcome(c.doc,c.config);
    assert.equal(out.passed,true);assert.equal(out.unitBefore.exp+expected,(out.unitAfter.level-out.unitBefore.level)*100+out.unitAfter.exp);
    c.config.expected.stats.speed++;const wrong=verifyBattleOutcome(c.doc,c.config);
    assert.equal(wrong.passed,false);assert.equal(wrong.checks.filter(c=>!c.passed).length,1);
  }
});

test('outcome CLI gates the actual ROM, records failures and cannot overwrite its input',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gba-outcome-'));
  try{
    const c=make(),rom=Buffer.alloc(192);rom.write('TEST',0xac);const identity=romIdentity(rom);
    c.config.match=identity;for(const sample of c.doc.samples)Object.assign(sample.packet,identity);
    Object.assign(c.config,{rom:'test.gba',evidence:'test.ram-evidence.json',report:'report.json'});
    fs.writeFileSync(path.join(dir,'test.gba'),rom);fs.writeFileSync(path.join(dir,'test.ram-evidence.json'),JSON.stringify(c.doc));
    const input=path.join(dir,'case.json');
    const run=()=>{fs.writeFileSync(input,JSON.stringify(c.config));return spawnSync(process.execPath,['scripts/check-battle-outcome.mjs',input],{encoding:'utf8'});};
    const passed=run();assert.equal(passed.status,0,passed.stderr);assert.match(passed.stdout,/PASS/);
    const good=JSON.parse(fs.readFileSync(path.join(dir,'report.json')));assert.equal(good.passed,true);assert.equal(good.hashes.rom.length,64);
    c.config.expected.stats.power++;const failed=run();assert.equal(failed.status,1);assert.match(failed.stdout,/FAIL/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'report.json'))).passed,false);
    c.config.report='test.gba';const protectedRun=run();assert.equal(protectedRun.status,1);assert.match(protectedRun.stderr,/must not overwrite/);
    assert.deepEqual(fs.readFileSync(path.join(dir,'test.gba')),rom);
    c.config.report='report.json';rom[0]=1;fs.writeFileSync(path.join(dir,'test.gba'),rom);const wrong=run();assert.equal(wrong.status,1);assert.match(wrong.stderr,/Actual ROM differs/);
  }finally{
    const resolved=fs.realpathSync(dir),parent=fs.realpathSync(os.tmpdir());assert.equal(path.dirname(resolved).toLowerCase(),parent.toLowerCase());assert(path.basename(resolved).startsWith('gba-outcome-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});
