import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('file picker follows website language and preserves the selected filename',async()=>{
 const elements=new Map();
 const element=id=>{
  if(!elements.has(id))elements.set(id,{value:id==='language'?'en':'',files:[],events:{},textContent:'',addEventListener(type,handler){this.events[type]=handler;},click(){this.clicked=true;}});
  return elements.get(id);
 };
 const document={documentElement:{},getElementById:element};
 vm.runInNewContext(fs.readFileSync('site/app.js','utf8'),{document,Blob,CompanionBuild:{readRom:async()=>new Uint8Array(192),inspectProject:()=>({name:'Fixture',version:'1.0.0',gameCode:'TEST',crc32:'00000000',width:640,height:480,reader:'sample',dataFields:0,assets:0,luaFiles:0,files:0})}});
 assert.equal(element('pickRom').textContent,'Choose file');
 assert.equal(element('fileName').textContent,'No file selected');
 assert.equal(element('supportedGames').href,'supported-games.html?lang=en');
 element('pickRom').events.click();assert.equal(element('rom').clicked,true);
 element('language').value='vi';element('language').events.change();
 assert.equal(element('pickRom').textContent,'Chọn tệp');
 assert.equal(element('fileName').textContent,'Chưa chọn tệp');
 assert.equal(element('supportedGames').textContent,'Game được hỗ trợ');
 assert.equal(element('supportedGames').href,'supported-games.html?lang=vi');
 element('rom').files=[{name:'ROM Việt hóa.gba'}];element('rom').events.change();
 assert.equal(element('fileName').textContent,'ROM Việt hóa.gba');
 assert.equal(element('build').disabled,false);
 element('language').value='en';element('language').events.change();
 assert.equal(element('fileName').textContent,'ROM Việt hóa.gba');
 assert.equal(element('pickRom').textContent,'Choose file');
 element('custom').checked=true;element('custom').events.change();
 assert.equal(element('build').disabled,true);assert.equal(element('sourcePicker').hidden,false);
 element('source').files=[{name:'Dự án riêng.gbastudio.json',size:2,text:async()=>'{}'}];await element('source').events.change();
 assert.equal(element('build').disabled,false);assert.equal(element('sourceName').textContent,'Dự án riêng.gbastudio.json');
 element('custom').checked=false;element('custom').events.change();assert.equal(element('sourcePicker').hidden,true);
 const html=fs.readFileSync('site/index.html','utf8');
 assert.match(html,/<input[^>]*id="rom"[^>]*hidden/);
 assert.match(html,/<button type="button" id="pickRom"/);
});
