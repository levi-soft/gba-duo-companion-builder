import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

test('chapter headers preserve names and never disappear for blank or missing ROM text',async()=>{
  const e=await luaFactory().createEngine();
  try{
    e.global.set('source',fs.readFileSync('runtime/shared/presentation.chapter.lua','utf8'));
    assert.equal(await e.doString(`local f=assert(load(source))()
      assert(f({title="Ch. 1: Existing name"},"Chapter 1")=="Ch. 1: Existing name")
      assert(f({title=""},"Chapter 31")=="Chapter 31")
      assert(f({title="  ",label="Ch. 20x"},"Chapter 37")=="Ch. 20x")
      assert(f(nil,"Chapter 255")=="Chapter 255")
      assert(f({name="Name"},"Ch. 5",true)=="Ch. 5: Name")
      assert(f({name=""},"Prologue",true)=="Prologue")
      assert(f({name="  "},"Ch. 70",true)=="Ch. 70")
      assert(f({},"Ch. 71",true)=="Ch. 71")
      return true`),true);
  }finally{e.global.close();}
});

test('native FE6 chapter labels use displayed numbering and gaiden flags instead of internal map indexes',()=>{
  const c={};vm.runInNewContext(fs.readFileSync('site/fe6-rom.js','utf8'),c);
  const flags={1:2,26:20,28:34,32:17,37:41,38:43};
  const reader={u8:a=>flags[Math.floor(a/68)]||0,u16:a=>a%68===0x38?100+Math.floor(a/68):500,
    text:id=>id>=140&&id<=144?'Trial name '+id:id===500?'Seize gate':''};
  const rows=c.FE6RomPrep.prepareChapters(reader,0);
  assert.equal(rows[1].label,'Ch. 1');assert.equal(rows[26].label,'Ch. 10');
  assert.equal(rows[28].label,'Ch. 17');assert.equal(rows[32].label,'Ch. 8x');
  assert.equal(rows[37].label,'Ch. 20x');assert.equal(rows[38].label,'Ch. 21x');
  assert.equal(rows[0].label,'Tutorial');assert.equal(rows[25].label,'Final Chapter');
  assert.equal(rows[39].label,'Link Arena');assert.equal(rows[40].label,'Trial Map 1');
  assert.equal(rows[44].title,'Trial Map 5: Trial name 144');assert.equal(rows[1].objectiveShort,'Seize gate');
});

test('native FE6 uses graphic title IDs for full names, including route splits and gaiden chapters',()=>{
  const c={};
  for(const file of ['site/fe6-rom.js','site/profiles/fe6-english/chapter-titles.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),c);
  const flags={1:2,10:20,26:20,28:34,32:17,37:41};
  const titles={0:39,1:0,10:10,25:37,26:12,28:27,32:8,37:31};
  const reader={u8:a=>a%68===0x0e?(titles[Math.floor(a/68)]??38):(flags[Math.floor(a/68)]||0),u16:a=>Math.floor(a/68),text:id=>id===44?"Guinivere's Trial":''};
  const rows=c.FE6RomPrep.prepareChapters(reader,0,c.FE6_ENGLISH_CHAPTER_TITLES);
  assert.equal(rows[1].title,'Ch. 1: Dawn of Destiny');
  assert.equal(rows[10].title,'Ch. 10: Western Resistance');
  assert.equal(rows[26].title,'Ch. 10: Amidst a Struggle');
  assert.equal(rows[28].title,"Ch. 17: The Bishop's Teachings");
  assert.equal(rows[32].title,'Ch. 8x: The Blazing Blade');
  assert.equal(rows[37].title,'Ch. 20x: The Tempest Bow');
  assert.equal(rows[25].title,'Final Chapter: Beyond the Darkness');
  assert.equal(rows[0].title,'Tutorial');assert.equal(rows[39].title,'');
  assert.equal(rows[44].title,"Trial Map 5: Guinivere's Trial");
});

test('builder refuses missing chapter metadata before extraction instead of silently exporting numbers alone',async()=>{
  const c={};vm.runInNewContext(fs.readFileSync('site/fe6-rom.js','utf8'),c);
  c.CompanionRom={crc32:()=>0x12345678,reader:()=>{throw Error('Extraction must not start');}};
  const bytes=new Uint8Array(256);bytes.set(new TextEncoder().encode('AFEJ'),0xac);
  const profile={name:'FE6 title fixture',romSize:256,code:'AFEJ',crc32:0x12345678,chapterTitles:undefined};
  await assert.rejects(c.FE6RomPrep.prepare(bytes,{},null,{},profile),/Missing verified chapter title metadata/);
});
