import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('supported games follow the profile registry, including future entries and language navigation',()=>{
  const nodes=new Map();
  const create=()=>({children:[],events:{},value:'en',textContent:'',append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},addEventListener(type,handler){this.events[type]=handler;}});
  const element=id=>{if(!nodes.has(id))nodes.set(id,create());return nodes.get(id);};
  const document={documentElement:{},getElementById:element,createElement:create};
  const context={document,URLSearchParams,location:{search:'?lang=vi'}};
  vm.runInNewContext(fs.readFileSync('site/profiles.js','utf8'),context);
  context.COMPANION_PROFILES.push({id:'future-game',name:'Future game',nameVi:'Game bổ sung',code:'NEXT',crc32:'0123ABCD',output:'Future-Companion-1.2.3'});
  const expectedCount=context.COMPANION_PROFILES.length;
  vm.runInNewContext(fs.readFileSync('site/supported-games.js','utf8'),context);
  assert.equal(element('gameList').children.length,expectedCount);
  assert.equal(element('count').textContent,`${expectedCount} game được hỗ trợ`);
  assert.equal(element('start').href,'index.html?lang=vi');
  const card=element('gameList').children.at(-1);
  assert.equal(card.children[0].textContent,'Game bổ sung');
  assert.equal(card.children[1].textContent,'Companion 1.2.3');
  assert.equal(card.children[2].children[1].children[3].textContent,'0123ABCD');
  element('language').value='en';element('language').events.change();
  assert.equal(element('gameList').children.length,expectedCount);
  assert.equal(element('gameList').children.at(-1).children[0].textContent,'Future game');
  assert.equal(element('start').href,'index.html?lang=en');
  assert.equal(document.documentElement.lang,'en');
});
