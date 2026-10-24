import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('file picker follows website language and preserves the selected filename',()=>{
 const elements=new Map();
 const element=id=>{
  if(!elements.has(id))elements.set(id,{value:id==='language'?'en':'',files:[],events:{},textContent:'',addEventListener(type,handler){this.events[type]=handler;},click(){this.clicked=true;}});
  return elements.get(id);
 };
 const document={documentElement:{},getElementById:element};
 vm.runInNewContext(fs.readFileSync('site/app.js','utf8'),{document});
 assert.equal(element('pickRom').textContent,'Choose file');
 assert.equal(element('fileName').textContent,'No file selected');
 element('pickRom').events.click();assert.equal(element('rom').clicked,true);
 element('language').value='vi';element('language').events.change();
 assert.equal(element('pickRom').textContent,'Chọn tệp');
 assert.equal(element('fileName').textContent,'Chưa chọn tệp');
 element('rom').files=[{name:'ROM Việt hóa.gba'}];element('rom').events.change();
 assert.equal(element('fileName').textContent,'ROM Việt hóa.gba');
 assert.equal(element('build').disabled,false);
 element('language').value='en';element('language').events.change();
 assert.equal(element('fileName').textContent,'ROM Việt hóa.gba');
 assert.equal(element('pickRom').textContent,'Choose file');
 const html=fs.readFileSync('site/index.html','utf8');
 assert.match(html,/<input[^>]*id="rom"[^>]*hidden/);
 assert.match(html,/<button type="button" id="pickRom"/);
});
