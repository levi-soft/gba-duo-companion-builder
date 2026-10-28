// Generated from ui/function-blocks.js; keep its Studio mirror synchronized.
(function(root){
"use strict";
// Shared native layout constructors. Mirrored in Companion Builder ui/function-blocks.js.
// No game knowledge, ROM access, runtime execution, global state or generated assets.
/** @typedef {{type:string,id:string,children?:NativeNode[],text?:string,src?:string,value?:string,maxKey?:string,label?:string,style?:Record<string,string>}} NativeNode */
/** @typedef {{id:string,nameField:string,title?:string,levelField?:string,levelLabel?:string,portrait?:string,currentHpField?:string,maximumHpField?:string,hpLabel?:string}} CharacterOptions */
/** @typedef {{id:string,title?:string,rows:{label?:string,labelField?:string,field:string}[]}} StatsOptions */
const forbidden=new Set(['__proto__','prototype','constructor']);
/** @param {string} value */
function path(value){if(typeof value!=='string'||value.length>256||! /^[\p{L}_][\p{L}\p{N}_-]*(?:\.(?:[\p{L}_][\p{L}\p{N}_-]*|\d+))*$/u.test(value)||value.split('.').some(k=>forbidden.has(k)))throw Error('Choose a valid data field.');return value;}
/** @param {string | undefined} value */
function label(value=''){if(typeof value!=='string'||value.length>128||/[{}$]/.test(value))throw Error('Use a short label without binding symbols.');return value;}
/** @param {string} value */
function blockId(value){if(typeof value!=='string'||! /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value))throw Error('Use a unique block ID of at most 64 characters.');return value;}
/** @param {string} value */
function portrait(value){
  if(value.startsWith('$')){path(value.slice(1));return value;}
  if(!value.startsWith('asset:'))throw Error('Choose a bound portrait or a local image.');
  const file=value.slice(6);if(!file||file.length>512||/^[\s/\\]|[\\:\x00-\x1f\x7f]/.test(file)||file.split('/').some(p=>!p||p==='.'||p==='..'||forbidden.has(p)))throw Error('Invalid local portrait path.');return value;
}
/** @param {CharacterOptions} options @returns {NativeNode} */
function characterCard(options){
  const id=blockId(options.id),name=path(options.nameField),title=label(options.title),levelLabel=label(options.levelLabel??'Level'),hpLabel=label(options.hpLabel??'HP');
  const level=options.levelField?path(options.levelField):'';
  const image=options.portrait?portrait(options.portrait):'';
  if(!!options.currentHpField!==!!options.maximumHpField)throw Error('Choose both current and maximum HP fields.');
  const hp=options.currentHpField?path(options.currentHpField):'',max=options.maximumHpField?path(options.maximumHpField):'';
  if(hp&&hp===max)throw Error('Current and maximum fields must be different.');
  /** @type {NativeNode[]} */
  const detail=[{type:'text',id:id+'-name',text:'{'+name+'}',style:{'font-size':'22px','font-weight':'700'}}];
  if(level)detail.push({type:'text',id:id+'-level',text:(levelLabel?levelLabel+': ':'')+'{'+level+'}'});
  if(hp)detail.push({type:'bar',id:id+'-hp',value:'$'+hp,maxKey:'$'+max,label:(hpLabel?hpLabel+': ':'')+'{'+hp+'} / {'+max+'}',style:{width:'100%',height:'24px'}});
  /** @type {NativeNode[]} */
  const row=[];
  if(image)row.push({type:'image',id:id+'-portrait',src:image,style:{width:'96px',height:'96px','object-fit':'contain','flex-shrink':'0'}});
  row.push({type:'column',id:id+'-details',children:detail,style:{gap:'6px',flex:'1 1 auto','min-width':'0'}});
  const body={type:'row',id:id+'-body',children:row,style:{width:'100%',gap:'12px','align-items':'center'}};
  return {type:'box',id,style:{width:'100%',padding:'12px',gap:'10px','flex-shrink':'0'},children:[...(title?[{type:'text',id:id+'-title',text:title,style:{'font-size':'18px','font-weight':'700'}}]:[]),body]};
}
/** @param {StatsOptions} options @returns {NativeNode} */
function statsTable(options){
  const id=blockId(options.id),title=label(options.title);
  if(!Array.isArray(options.rows)||!options.rows.length||options.rows.length>24)throw Error('Choose 1 to 24 stat rows.');
  const rows=options.rows.map((row,i)=>({label:row.labelField!==undefined?'{'+path(row.labelField)+'}':label(row.label),field:path(row.field),index:i}));
  if(rows.some(row=>!row.label.trim()))throw Error('Each stat row needs a display label.');
  /** @type {NativeNode[]} */
  const children=title?[{type:'text',id:id+'-title',text:title,style:{'font-size':'18px','font-weight':'700'}}]:[];
  for(const row of rows)children.push({type:'row',id:id+'-row-'+row.index,style:{width:'100%',gap:'16px',padding:'6px 0','align-items':'center'},children:[
    {type:'text',id:id+'-label-'+row.index,text:row.label,style:{flex:'1 1 auto','min-width':'0'}},
    {type:'text',id:id+'-value-'+row.index,text:'{'+row.field+'}',style:{'text-align':'right','font-weight':'700','flex-shrink':'0'}}
  ]});
  return {type:'box',id,style:{width:'100%',padding:'12px',gap:'6px','flex-shrink':'0'},children};
}

root.CompanionBlocks={characterCard,statsTable};
})(globalThis);
