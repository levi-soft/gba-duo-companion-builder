import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

function context() {
  const c={structuredClone,TextEncoder,TextDecoder,Uint8Array};
  for(const file of ['runtime-modules.js','theme.js','radar.js','profiles/fe6-remastered/template.js',
    'profiles/fe8-vietnamese/template.js','profiles/fe8-vietnamese/prepare.js',
    'profiles/fe8-english/template.js','profiles/storge/template.js',
    'latin-text.js','profiles/storge/encoding.js','profiles/storge/prepare.js']) {
    vm.runInNewContext(fs.readFileSync('site/'+file,'utf8'),c,{filename:file});
  }
  return c;
}

test('Storge has an independent release identity and inherits English UI and FE8 contracts',async()=>{
  const c=context(),p=c.STORGE_TEMPLATE,layout=JSON.stringify(p.layout);
  assert.equal(p.manifest.version,'1.0.0');
  assert.equal(p.manifest.match.crc32[0],'079106D8');
  assert.equal(p.uiLanguage,'en');
  assert(layout.includes('Growth rates')&&layout.includes('Battle analysis')&&layout.includes('talkAvailable'));
  assert.equal(Object.keys(p.files).length,0,'No extracted assets in the public template');
  const wrong=new Uint8Array(256);wrong.set(new TextEncoder().encode('BE8E'),0xac);
  await assert.rejects(c.StorgePrep.prepare(wrong,p,null),/CRC32 079106D8/);
  for(const file of ['main.lua','game.profile.lua','game.execution.lua','game.preparations.lua','game.units.lua','features.analysis.lua']) {
    assert.equal(c.COMPANION_RUNTIME_MODULES.storge[file],c.COMPANION_RUNTIME_MODULES['fe8-english'][file]);
  }
  let profile;c.FE8PublicPrep.prepare=(a,b,d,e,f)=>{profile=f;};
  c.StorgePrep.prepare(wrong,p,null);
  assert.equal(profile.classCount,255,'Include the extended FE8 class table');
  assert.equal(profile.classes,0x11C9584);assert.equal(profile.text,0x1009948);
  assert.equal(profile.decodeText,c.StorgeText);
  assert.equal(c.COMPANION_CURSOR_PROFILES.storge.green,'0x02026E30');
  assert.equal(c.COMPANION_CURSOR_PROFILES['fe8-english'].green,'0x0202DDCC');
});

test('Storge decodes compact font characters without deleting the lower-case letters',()=>{
  const c=context();
  assert.equal(c.StorgeText([0xa4,0x81,0x6d,0x81,0x8a,0x81,0x99,0x81]),'Jamakaya');
  assert.equal(c.StorgeText([0xa3,0x96,0x6d,0x82,0x8c,0x6c,0x84,0x95]),'Humboldt');
  assert.equal(c.StorgeText([0x10,0x81,0x01,0x41,0x80,0x00,0x04,0x01,0x42]),'A B');
  assert.equal(c.StorgeText([0x42,0x65,0x63,0x6b,0x65,0x72]),'Becker');
});

test('Storge prepares directed Talk records and chapter labels before Lua export',()=>{
  const c=context();let profile;c.FE8PublicPrep.prepare=(a,b,d,e,f)=>{profile=f;};
  c.StorgePrep.prepare(null,null,null);
  const data={fe8Chapters:Array.from({length:79},()=>({name:'Chapter'}))};
  data.fe8Chapters[6].name='Finale: Father And Daughter';
  const reader={
    u8:a=>a>=0x8B0890?0:a===0x208?1:a===0x209?3:0,
    u16:a=>a===0x200?3:a===0x20c?3:a===0x20e?1:0,
    u32:a=>a===0x8B363C?0x08000100:a===0x104?0x08000200:a===0x204?0x08000300:0
  };
  profile.prepareExtra({reader,bytes:new Uint8Array(0x400),data});
  assert.deepEqual(structuredClone(data.talkEvents[0]),[
    {flag:0,from:1,to:3,anySource:false,conditionType:3,conditionFlag:1}
  ]);
  assert.equal(data.fe8Chapters[0].label,'Prologue');
  assert.equal(data.fe8Chapters[6].label,'Finale');
  assert.equal(data.fe8Chapters[6].name,'Father And Daughter');
});
