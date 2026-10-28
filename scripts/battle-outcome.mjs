// Independent outcome oracle: reads recorded unit bytes, never companion formulas.
import assert from 'node:assert/strict';
import {validateEvidence,replayBytes} from './ram-evidence.mjs';
const types={u8:[1,false],u16:[2,false],u32:[4,false],s8:[1,true],s16:[2,true],s32:[4,true]};
const key=k=>typeof k==='string'&&/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)&&!['constructor','prototype','__proto__'].includes(k);
const integer=n=>Number.isSafeInteger(n);
function scalar(sample,address,type){
  assert(Object.hasOwn(types,type),'Unsupported outcome field type');
  const [size,signed]=types[type],bytes=Buffer.from(replayBytes(sample,address,size));
  return signed?bytes.readIntLE(0,size):bytes.readUIntLE(0,size);
}
export function readOutcomeUnit(sample,unit){
  assert(unit&&integer(unit.address)&&unit.fields&&typeof unit.fields==='object'&&!Array.isArray(unit.fields),'Invalid unit layout');
  const fields=Object.entries(unit.fields);assert(fields.length>=6&&fields.length<=32,'Outcome layout requires 6 to 32 fields');
  const out={};
  for(const [name,spec]of fields){
    assert(key(name)&&spec&&integer(spec.offset)&&spec.offset>=0&&spec.offset<=1024&&Object.hasOwn(types,spec.type),'Invalid outcome field');
    out[name]=scalar(sample,unit.address+spec.offset,spec.type);
  }
  for(const name of ['characterPointer','classPointer','deployment','level','exp','hp'])assert(Object.hasOwn(out,name),'Missing outcome field '+name);
  return out;
}
export function verifyBattleOutcome(evidence,config){
  const doc=validateEvidence(evidence);
  assert(config&&config.match?.gameCode===doc.samples[0].packet.gameCode&&config.match?.crc32?.toUpperCase()===doc.samples[0].packet.crc32,'Outcome ROM filter differs from evidence');
  const find=label=>{const found=doc.samples.filter(s=>s.label===label);assert.equal(found.length,1,'Outcome label must identify exactly one sample: '+label);return found[0];};
  const before=find(config.before),after=find(config.after);
  assert(after.packet.frame>before.packet.frame,'Outcome requires a later emulator frame; do not mix save-state branches');
  const unitBefore=readOutcomeUnit(before,config.unit),unitAfter=readOutcomeUnit(after,config.unit);
  for(const name of ['characterPointer','classPointer','deployment'])assert(unitBefore[name]>0&&unitBefore[name]===unitAfter[name],'Unit identity changed: '+name);
  assert(unitBefore.hp>0&&unitAfter.hp>0,'This outcome check requires a surviving unit');
  const base=config.expPerLevel;
  assert(integer(base)&&base>=1&&base<=10000,'Set the verified EXP per level explicitly');
  assert(unitBefore.exp>=0&&unitBefore.exp<base&&unitAfter.exp>=0&&unitAfter.exp<base,'Unsupported EXP sentinel or level-cap state');
  const levels=unitAfter.level-unitBefore.level;
  assert(unitBefore.level>0&&(levels===0||levels===1),'Only one ordinary battle and at most one level-up are supported');
  const expected=config.expected;
  assert(expected&&integer(expected.expGain)&&expected.expGain>=0&&expected.expGain<=base,'Invalid predicted EXP gain');
  assert(expected.stats&&typeof expected.stats==='object'&&!Array.isArray(expected.stats),'Provide predicted final stat values');
  const stats=Object.entries(expected.stats);assert(stats.length>0&&stats.length<=24,'Provide 1 to 24 predicted stats');
  const nonStats=new Set(['characterPointer','classPointer','deployment','level','exp','hp']);
  const checks=[];
  const check=(field,want,actual)=>checks.push({field,expected:want,actual,passed:want===actual});
  const expGain=levels*base+unitAfter.exp-unitBefore.exp;
  assert(expGain>=0&&expGain<=base,'Unsupported EXP transition');
  check('expGain',expected.expGain,expGain);
  check('level',unitBefore.level+Math.floor((unitBefore.exp+expected.expGain)/base),unitAfter.level);
  check('exp',(unitBefore.exp+expected.expGain)%base,unitAfter.exp);
  for(const [name,value]of stats){assert(key(name)&&!nonStats.has(name)&&Object.hasOwn(unitBefore,name)&&integer(value),'Invalid predicted persistent stat '+name);check(name,value,unitAfter[name]);}
  for(const [name,value]of Object.entries(expected.before??{})){assert(key(name)&&Object.hasOwn(unitBefore,name)&&integer(value),'Invalid pre-battle assertion');check('before.'+name,value,unitBefore[name]);}
  assert(config.guards===undefined||(Array.isArray(config.guards)&&config.guards.length<=64),'Provide at most 64 battle context guards');
  for(const guard of config.guards??[]){
    assert(guard&&key(guard.name)&&integer(guard.value),'Invalid battle context guard');
    check('before.'+guard.name,guard.value,scalar(before,guard.address,guard.type));
    check('after.'+guard.name,guard.value,scalar(after,guard.address,guard.type));
  }
  let target;
  if(config.target){
    const a=readOutcomeUnit(before,config.target),b=readOutcomeUnit(after,config.target);
    assert(a.characterPointer>0&&a.hp>0,'Target must be alive in the before sample');
    assert(b.characterPointer===a.characterPointer||(b.characterPointer===0&&b.hp===0),'Target slot was reused');
    if(b.characterPointer!==0)for(const name of ['classPointer','deployment'])assert(a[name]===b[name],'Target identity changed');
    const condition=b.hp===0?'kill':b.hp<a.hp?'damage':'no-damage';
    assert(['kill','damage','no-damage'].includes(expected.condition),'Provide the predicted EXP condition');
    check('condition',expected.condition,condition);target={before:a,after:b,condition};
  }else assert(expected.condition===undefined,'A condition assertion needs target RAM');
  return {passed:checks.every(c=>c.passed),match:config.match,frames:{before:before.packet.frame,after:after.packet.frame},
    expGain,leveled:levels===1,unitBefore,unitAfter,target,checks};
}
