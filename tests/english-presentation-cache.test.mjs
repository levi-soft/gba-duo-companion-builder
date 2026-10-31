import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

const english=fs.readFileSync('runtime/shared/presentation.english.lua','utf8');
const locale=fs.readFileSync('runtime/shared/presentation.locale.lua','utf8');
const strings=JSON.parse(fs.readFileSync('ui/locales/en.json','utf8')).runtime;
const fields=[...english.matchAll(/^\s+"([A-Za-z]+)",$/gm)].map(match=>match[1]);
const literal='{'+Object.entries(strings).map(([key,value])=>'['+JSON.stringify(key)+']='+JSON.stringify(value)).join(',')+'}';
async function run(body){const e=await luaFactory().createEngine();try{
  e.global.set('englishSource',english);e.global.set('localeSource',locale);e.global.set('stringsSource',literal);
  return await e.doString(`
    local calls,finds=0,0
    local realFind=string.find
    string.find=function(...)finds=finds+1;return realFind(...)end
    local dictionary=assert(load('return '..stringsSource))()
    local realLocale=assert(load(localeSource,'@presentation.locale.lua'))()
    pack={require=function(name)
      assert(name=='presentation.locale')
      return function(strings)
        local translate=realLocale(strings)
        return function(value)calls=calls+1;return translate(value)end
      end
    end}
    local factory=assert(load(englishSource,'@presentation.english.lua'))()
    local fields={${fields.map(field=>JSON.stringify(field)).join(',')}}
    local function values()
      local v={unitName='Orion',item1Description='Unchanged ROM description',growthHpCurrent=17,rngAvailable=false}
      for _,key in ipairs(fields)do v[key]='Stable authored status' end
      v.rngStateText='Mở dự báo giao chiến để ghi nhận RNG'
      v.predictionProgressText='Ước tính: 42%'
      v.growthExpMatch='Batta: gây sát thương 10 / hạ địch 35 EXP nếu sống sót.'
      return v
    end
    ${body}
  `);
}finally{e.global.close();}}

test('unchanged authored presentation inputs stop all translator and phrase-scan work after the first snapshot',async()=>{
  assert.equal(fields.length,21,'preserve the existing exact field whitelist');
  const r=await run(`local apply=factory(dictionary)
    local first=apply(values());local coldCalls,coldFinds=calls,finds
    local same=true
    for n=1,20 do
      local v=apply(values())
      for key,value in pairs(first)do if v[key]~=value then same=false end end
    end
    return {same=same,coldCalls=coldCalls,coldFinds=coldFinds,warmCalls=calls-coldCalls,warmFinds=finds-coldFinds,first=first}`);
  assert.equal(r.coldCalls,21);assert(r.coldFinds>0,'the real phrase translator must be exercised');
  assert.equal(r.warmCalls,0);assert.equal(r.warmFinds,0);assert.equal(r.same,true);
  assert.equal(r.first.rngStateText,'Open a battle forecast to record RNG');
  assert.equal(r.first.predictionProgressText,'Estimated: 42%');
  assert.equal(r.first.growthExpMatch,'Batta: damage 10 / defeat 35 EXP if the unit survives.');
  assert.equal(r.first.unitName,'Orion');assert.equal(r.first.item1Description,'Unchanged ROM description');
  assert.equal(r.first.growthHpCurrent,17);assert.equal(r.first.rngAvailable,false);
});

test('changed live text translates immediately and nil, false, numeric and empty values cannot keep stale output',async()=>{
  const r=await run(`local apply=factory(dictionary);apply(values());local initial=calls
    local changed=values();changed.predictionProgressText='Ước tính: 43%';apply(changed)
    local afterChanged=calls
    local outputs={}
    for _,item in ipairs({{nil},{false},{0},{''},{'Ước tính: 44%'}})do
      local v=values();v.predictionProgressText=item[1];apply(v)
      outputs[#outputs+1]={kind=type(v.predictionProgressText),value=v.predictionProgressText}
    end
    return {delta=afterChanged-initial,calls=calls,outputs=outputs,changed=changed.predictionProgressText}
  `);
  assert.equal(r.delta,1);assert.equal(r.changed,'Estimated: 43%');
  assert.deepEqual(r.outputs,[{kind:'nil'},{kind:'boolean',value:false},{kind:'number',value:0},{kind:'string',value:''},{kind:'string',value:'Estimated: 44%'}]);
  assert.equal(r.calls,27);
});

test('different fields and companion instances retain independent last input/output pairs',async()=>{
  const r=await run(`local a=factory({same='First'});local b=factory({same='Second'})
    local first=a({rngStatus='same'});local nextField=a({rngStatus='same',rngNotice='same'})
    local other=b({rngStatus='same'});local again=a({rngStatus='same',rngNotice='same'})
    return {first=first,nextField=nextField,other=other,again=again,calls=calls}`);
  assert.equal(r.first.rngStatus,'First');assert.equal(r.nextField.rngNotice,'First');
  assert.equal(r.other.rngStatus,'Second');assert.equal(r.again.rngStatus,'First');assert.equal(r.again.rngNotice,'First');
  assert.equal(r.calls,43,'21 initial fields per instance plus one newly changed field');
});

test('cache semantics match the original locale through exact strings, composed fragments and repeated in-place calls',async()=>{
  const r=await run(`local apply=factory(dictionary);local reference=realLocale(dictionary);local checks=0
    for _,text in ipairs({'Đang giao chiến','Ước tính: 0%','Ước tính: 99%','Batta: gây sát thương 1 / hạ địch 42 EXP nếu sống sót.','No authored fragment 100%.',''})do
      for n=1,3 do
        local v={rngContext=text};apply(v);assert(v.rngContext==reference(text));checks=checks+1
        local expected=reference(v.rngContext);apply(v);assert(v.rngContext==expected);checks=checks+1
      end
    end
    local nilStrings=factory(nil);local untouched=nilStrings({rngContext='Đang giao chiến'})
    return {checks=checks,untouched=untouched.rngContext}
  `);
  assert.equal(r.checks,36);assert.equal(r.untouched,'Đang giao chiến');
});
