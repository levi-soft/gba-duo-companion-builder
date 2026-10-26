import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';import assert from 'node:assert/strict';

test('Vision Quest inherits the English six-skill UI and rejects foreign ROMs',async()=>{
  const c={structuredClone,TextEncoder,TextDecoder,Uint8Array,Buffer};
  for(const file of ['runtime-modules.js','theme.js','radar.js','latin-text.js',
    'profiles/fe6-remastered/template.js','profiles/fe8-vietnamese/template.js',
    'profiles/fe8-vietnamese/prepare.js','profiles/fe8-english/template.js',
    'profiles/voids-blitzarre/template.js','profiles/vision-quest/template.js','profiles/vision-quest/prepare.js'])
    vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),c,{filename:file});
  const p=c.VISION_QUEST_TEMPLATE;
  assert.equal(p.manifest.version,'1.0.0');assert.equal(p.uiLanguage,'en');
  assert.deepEqual(JSON.parse(JSON.stringify(p.manifest.match)),{gameCode:['BE8E'],crc32:['2BCFEC83']});
  assert.equal(JSON.stringify(p.layout),JSON.stringify(c.VOIDS_BLITZARRE_TEMPLATE.layout));
  const layout=JSON.stringify(p.layout);for(const binding of ['nativeSkill6Icon','talk','Growth rates','Battle analysis'])assert(layout.includes(binding),binding);
  assert.equal(Object.keys(p.files).length,0);
  const wrong=new Uint8Array(256);wrong.set(new TextEncoder().encode('BE8E'),0xac);
  await assert.rejects(c.VisionQuestPrep.prepare(wrong,p,null),/CRC32 2BCFEC83/);
  // Compact glyphs used by class names must be decoded before UI display.
  assert.equal(c.CompanionLatinText([0xad,0x77,0x84,0xbc,0x4d,0x85,0x8f,0x83]),'Swd Merc');
});

test('Vision Quest uses ROM chapter prefixes rather than retail slot numbers',async()=>{
  const c={};let profile;c.FE8PublicPrep={prepare(...args){profile=args[4];}};
  vm.runInNewContext(fs.readFileSync('site/profiles/vision-quest/prepare.js','utf8'),c);
  c.VisionQuestPrep.prepare();
  const bytes=new Uint8Array(0xB2B720),data={fe8Chapters:Array.from({length:79},()=>({name:'Fixture title'}))};
  const reader={u8:at=>at===0x104?63:0,u16:at=>at===0x102?1:at===0x106?2:0,
    u32:at=>at===0x16A484?0x08000100:at===0x100?0x10000:at===0x104?0x2003f:0,
    text:id=>id===1?'1-1':id===2?'1-7x':''};
  await profile.prepareExtra({reader,bytes,data,image:()=>{throw Error('No skill art in this fixture');}});
  assert.equal(data.fe8Chapters[0].label,'Ch. 1-1');assert.equal(data.fe8Chapters[63].label,'Ch. 1-7x');
  assert.equal(data.fe8Chapters[0].name,'Fixture title');
  assert.equal(data.talkEvents.length,79);
});
