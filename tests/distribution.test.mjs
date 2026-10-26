import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
const site=path.resolve('site');

test('Plus runner dependencies satisfy the shipped protocol-1 query-free interceptor',()=>{
 const html=fs.readFileSync(path.join(site,'plus-runner.html'),'utf8');
 const origin='https://builder.gbaduo.local/';
 const dependencies=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
 assert(dependencies.length>10,'Check the actual runner dependency graph');
 for(const dependency of dependencies){
  const url=new URL(dependency,origin);
  assert.equal(url.origin,new URL(origin).origin);
  assert.equal(url.search,'','Plus 0.1.7-plus.2 blocks query strings: '+dependency);
  assert.equal(url.hash,'');
  assert(!url.pathname.includes('%'),'Plus blocks encoded paths');
  assert(fs.statSync(path.join(site,url.pathname.slice(1))).isFile());
 }
});

test('catalog declares the fifteen exact ROM profiles and Plus runner protocol',()=>{
 const catalog=JSON.parse(fs.readFileSync(path.join(site,'catalog.json')));
 assert.equal(catalog.schemaVersion,1);assert.equal(catalog.runnerProtocol,1);assert.equal(catalog.builderVersion,'1.1.5');
 assert.equal(catalog.builder.entrypoint,'plus-runner.html');
 assert.deepEqual(catalog.profiles.map(x=>[x.id,x.version,x.gameCode,x.crc32]),[["fe7-vietnamese","1.0.0","AE7E","32CD990D"],["fe6-remastered","1.0.0","BE8E","BD53D5F3"],["fe8-vietnamese","1.0.0","BE8E","3CD932D7"],["fe7-english","1.0.0","AE7E","2A524221"],["fe8-europe","1.0.0","BE8P","B3005195"],["fe8-english","1.0.0","BE8E","A47246AE"],["fe6-english","1.0.0","AFEJ","197DE10B"],["fe6-project-ember","1.0.0","AFEJ","636F7B05"],["fe6-project-ember-rr","1.0.0","AFEJ","29BC2257"],["voids-blitzarre","1.0.0","BE8E","9D22107C"],["storge","1.0.0","BE8E","079106D8"],["hag-in-white","1.0.0","BE8E","7479D7E2"],["sacred-echoes","1.0.0","BE8E","13F15F23"],["vision-quest","1.0.0","BE8E","2BCFEC83"],["the-last-promise","1.0.0","AE7E","D1C6E5D5"]]);
 const zip=fs.readFileSync(path.join(site,catalog.builder.url));assert.equal(zip.length,catalog.builder.bytes);
 assert.equal(crypto.createHash('sha256').update(zip).digest('hex'),catalog.builder.sha256);
 assert(catalog.builder.unpackedBytes>catalog.builder.bytes);
});

test('web and Plus use the same core and every HTML dependency is local',()=>{
 for(const name of ['index.html','plus-runner.html']){
  const html=fs.readFileSync(path.join(site,name),'utf8');assert(html.includes('builder-core.js'));
  for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){
   if(m[1].startsWith('#')||m[1].startsWith('https://github.com/'))continue;
   assert(!/^https?:|\/\//.test(m[1]),name+' external asset');assert(fs.existsSync(path.join(site,m[1].split(/[?#]/,1)[0])),name+' missing '+m[1]);
  }
  assert(html.includes('object-src \'none\''));assert(html.includes('base-uri \'none\''));
  assert(html.includes('frame-src \'none\''));assert(html.includes('form-action \'none\''));
 }
 const web=fs.readFileSync(path.join(site,'app.js'),'utf8'),runner=fs.readFileSync(path.join(site,'plus-runner.js'),'utf8');
 assert(web.includes('CompanionBuild.build'));assert(runner.includes('CompanionBuild.build'));
 assert(!web.includes('fetch('));assert(!web.includes('XMLHttpRequest'));assert(!web.includes('sendBeacon'));
 assert(runner.includes("'/__plus/rom.gba'"));assert(runner.includes('49152'));
});

test('Plus bridge exposes a bounded, cancellable result stream',()=>{
 const runner=fs.readFileSync(path.join(site,'plus-runner.js'),'utf8');
 for(const method of ['configuration','cancelled','progress','beginZip','appendZip','finishZip','fail'])assert(runner.includes('.'+method+'('),method);
 assert(runner.includes('profileId'));assert(runner.includes('gameCode'));assert(runner.includes('crc32'));
 const html=fs.readFileSync(path.join(site,'plus-runner.html'),'utf8');assert(html.includes("connect-src 'self'"));
});

test('English defaults and Vietnamese selection remain available',()=>{
 const html=fs.readFileSync(path.join(site,'index.html'),'utf8');assert(html.includes('lang="en"'));assert(html.includes('value="vi"'));
 const app=fs.readFileSync(path.join(site,'app.js'),'utf8');assert(app.includes('GBA Duo Plus'));assert(app.includes('Tạo companion'));
});

test('all hidden controls stay hidden despite component display rules',()=>{
 const css=fs.readFileSync(path.join(site,'app.css'),'utf8');
 const rule=css.match(/(?:^|\})\s*\[hidden\]\s*\{([^}]*)\}/);
 assert(rule,'A global [hidden] rule is required, not just progress[hidden]');
 assert(/display\s*:\s*none\s*!important\s*;?/.test(rule[1]));
 const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
 for(const id of ['cancel','progress','result'])assert(new RegExp('id="'+id+'"[^>]*\\bhidden\\b').test(html),id+' starts hidden');
});

test('pack templates ship no prepared game assets and no generated table contents',()=>{
 const context={structuredClone};context.globalThis=context;
 vm.runInNewContext(fs.readFileSync(path.join(site,'runtime-modules.js'),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(path.join(site,'theme.js'),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(path.join(site,'profiles.js'),'utf8'),context);
 for(const profile of context.COMPANION_PROFILES){
  vm.runInNewContext(fs.readFileSync(path.join(site,'profiles',profile.id,'template.js'),'utf8'),context);
  assert.equal(Object.keys(context[profile.template].files).length,0);assert(context[profile.runtime].includes('data.rom_tables'));
  assert(!Object.hasOwn(context.COMPANION_RUNTIME_MODULES[profile.id],'data.rom_tables.lua'));
 }
 const files=[];function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())visit(p);else files.push(p);}}visit(site);
 for(const file of files)assert(!/\.gba$|\.gbastudio\.json$|Local\.zip$|capture.*\.json$|\.sav$|\.ss$/i.test(file),file);
});

test('shared resources are restricted to the audited authored UI and licensed fonts',()=>{
 const context={};context.globalThis=context;vm.runInNewContext(fs.readFileSync(path.join(site,'resources.js'),'utf8'),context);
 const names=Object.keys(context.COMPANION_UI_FILES);assert.equal(names.length,40);
 for(const name of names)assert(/^assets\/(fonts\/|images\/royal\/|images\/growth\/icon-(close|analysis)\.png$|images\/indicators\/talk\.png$)/.test(name),name);
});
