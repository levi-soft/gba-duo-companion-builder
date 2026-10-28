import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {characterCard,statsTable} from '../ui/function-blocks.js';
import {functionBlocksBundle} from '../scripts/build-function-blocks.mjs';
function walk(node){return[node,...(node.children??[]).flatMap(walk)];}
test('generated browser blocks match the portable constructors for non-FE fields',()=>{
 const c={};c.globalThis=c;vm.runInNewContext(fs.readFileSync('site/function-blocks.js','utf8'),c);
 const options={id:'pilot',title:'Phi công',nameField:'pilot',portrait:'$avatar',levelField:'rank',currentHpField:'ammo',maximumHpField:'capacity',hpLabel:'Đạn'};
 assert.deepEqual(JSON.parse(JSON.stringify(c.CompanionBlocks.characterCard(options))),characterCard(options));
 const table={id:'metrics',rows:[{labelField:'energyKind',field:'energy'},{label:'Tiền',field:'credits'}]};
 assert.deepEqual(JSON.parse(JSON.stringify(c.CompanionBlocks.statsTable(table))),statsTable(table));
 assert.equal(walk(statsTable(table)).find(n=>n.id==='metrics-label-0').text,'{energyKind}');
 assert(walk(characterCard(options)).some(n=>n.value==='$ammo'&&n.maxKey==='$capacity'));
 assert.equal(fs.readFileSync('site/function-blocks.js','utf8'),functionBlocksBundle(fs.readFileSync('ui/function-blocks.js','utf8').replace(/\r\n/g,'\n')));
});
test('blocks reject ambiguous paths and produce deterministic unique native nodes',()=>{
 for(const field of ['__proto__.x','constructor','hp} bad {maxHp'])assert.throws(()=>characterCard({id:'card',nameField:field}));
 assert.throws(()=>characterCard({id:'card',nameField:'name',portrait:'asset:../x.png'}));
 assert.throws(()=>statsTable({id:'stats',rows:Array.from({length:25},()=>({label:'X',field:'x'}))}));
 for(const labelField of ['constructor','__proto__.x',''])assert.throws(()=>statsTable({id:'stats',rows:[{labelField,field:'x'}]}));
 for(let count=1;count<=24;count++){const options={id:'stats',title:'Stats',rows:Array.from({length:count},(_,i)=>({label:'Metric '+i,field:'metric_'+i}))};const tree=statsTable(options),ids=walk(tree).map(n=>n.id);assert.equal(new Set(ids).size,ids.length);assert.deepEqual(tree,statsTable(options));}
});
