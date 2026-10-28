(function(root){
 'use strict';
 const forbidden=new Set(['__proto__','prototype','constructor']);
 const safe=path=>typeof path==='string'&&path.length<=256&&/^[\p{L}_][\p{L}\p{N}_-]*(?:\.(?:[\p{L}_][\p{L}\p{N}_-]*|\d+))*$/u.test(path)&&!path.split('.').some(k=>forbidden.has(k));
 const numeric=value=>typeof value==='number'&&Number.isFinite(value)||typeof value==='string'&&(['','-','--','---','—','…'].includes(value.trim())||value.trim()!==''&&Number.isFinite(Number(value)));
 const names={name:['Name','Tên'],unitName:['Character name','Tên nhân vật'],hp:['Current HP','HP hiện tại'],maxHp:['Maximum HP','HP tối đa'],level:['Level','Cấp độ'],portrait:['Portrait','Chân dung'],avatar:['Avatar','Ảnh đại diện'],money:['Money','Tiền'],gold:['Gold','Vàng']};
 function own(data,path){let value=data;for(const key of path.split('.')){if(!value||typeof value!=='object'||!Object.hasOwn(value,key))return undefined;value=value[key];}return value;}
 // Root-scope fields only. Repeated-row layouts remain editable in Studio.
 // Field declarations are contracts, never proof of a live RAM observation.
 function catalog(source,language='en'){
  const declared=root.CompanionBuild.describeDataFields(source),result=[];
  for(const [path,info]of Object.entries(declared)){
   if(!safe(path)||path==='ui'||path.startsWith('ui.'))continue;
   const value=own(source.data,path),actual=typeof value;
   if(Array.isArray(value)||value&&actual==='object'||info.kind==='list')continue;
   const kind=info.kind==='number'&&(value==null||numeric(value))?'number':['string','number','boolean'].includes(actual)?actual:info.kind;
   if(!['string','number','boolean'].includes(kind))continue;
   const leaf=path.split('.').at(-1),label=(language==='vi'?info.labelVi:info.label)||info.label||names[leaf]?.[language==='vi'?1:0]||leaf.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');
   result.push({path,label,kind,value,declared:value==null});
  }
  return result;
 }
 function fail(code,field){const error=Error(code);error.field=field;throw error;}
 function short(value='',slot){if(typeof value!=='string'||value.length>128||/[{}$]/.test(value))fail('Template labels must be at most 128 characters without binding symbols.',slot);return value;}
 function prepare(source,config){
  if(!config||!['existing','card','stats','overview'].includes(config.kind))fail('Choose an existing layout, a character card, a stat table or both.');
  if(config.kind==='existing')return source;
  if(!root.CompanionBlocks)fail('Template components are unavailable. Reload the Builder.');
  const fields=catalog(source),title=short(config.title,'title'),hasCard=['card','overview'].includes(config.kind),hasStats=['stats','overview'].includes(config.kind);
  function field(path,kind,slot){const entry=fields.find(f=>f.path===path);if(!safe(path)||!entry||kind&&entry.kind!==kind)fail(kind==='number'?'Choose an available numeric field.':kind==='string'?'Choose an available image-source text field.':'Choose an available data field.',slot);return path;}
  const children=[];
  if(hasCard){
   const card=config.card??{},nameField=field(card.nameField,undefined,'card.nameField'),levelField=card.levelField?field(card.levelField,undefined,'card.levelField'):undefined,portrait=card.portraitField?'$'+field(card.portraitField,'string','card.portraitField'):undefined;
   let currentHpField,maximumHpField;
   if(card.barEnabled){currentHpField=field(card.currentField,'number','card.currentField');maximumHpField=field(card.maximumField,'number','card.maximumField');if(currentHpField===maximumHpField)fail('Current and maximum fields must be different.','card.maximumField');}
   children.push(root.CompanionBlocks.characterCard({id:'builder-card',title,nameField,levelField,portrait,currentHpField,maximumHpField,hpLabel:short(card.barLabel??'HP','card.barLabel'),levelLabel:short(card.levelLabel??'','card.levelLabel')}));
  }
  if(hasStats){
   if(!Array.isArray(config.rows)||!config.rows.length||config.rows.length>24)fail('Choose 1 to 24 stat rows.');
   const rows=config.rows.map((row,i)=>{if(!row||typeof row!=='object')fail('Choose an available data field.','rows.'+(i+1)+'.field');return {field:field(row.field,undefined,'rows.'+(i+1)+'.field'),label:short(row.label,'rows.'+(i+1)+'.label')};});
   children.push(root.CompanionBlocks.statsTable({id:'builder-stats',title:hasCard?'':title,rows}));
  }
  const {files,...authored}=source;
  const result=root.structuredClone?root.structuredClone(authored):JSON.parse(JSON.stringify(authored));
  result.files={...files}; // Base64 strings are immutable; avoid cloning large assets on each edit.
  // Keep author field names/contracts from the original reader/layout. New
  // widgets do not turn sample placeholders into successful game readings.
  result.manifest.studioDataFields=root.CompanionBuild.describeDataFields(source);
  result.layout={type:'column',id:'builder-layout',style:{width:'100%',height:'100%',padding:'16px',gap:'12px','overflow-y':'auto'},children};
  // Keep the project's CSS and resources: its fonts, theme and image paths
  // remain available. Existing game-specific selectors may need Studio edits.
  return result;
 }
 root.CompanionTemplates={catalog,prepare};
})(globalThis);
