// Reuse the accepted English FE8 UI; this ROM has one shared Str/Mag stat.
globalThis.SACRED_ECHOES_TEMPLATE=structuredClone(FE8_ENGLISH_TEMPLATE);
Object.assign(SACRED_ECHOES_TEMPLATE.manifest,{
  id:'sacred-echoes-local-cache',name:'Sacred Echoes - Local ROM Cache',version:'1.0.0',
  match:{gameCode:['BE8E'],crc32:['13F15F23']}
});
{
  const extension=withCompanionTalk(FE8_UI_EXTENSION,FE6_UI_EXTENSION);
  SACRED_ECHOES_TEMPLATE.layout=makeCompanionLayout(extension,'en');
  SACRED_ECHOES_TEMPLATE.css=COMPANION_THEME.css+extension.css;
}
(function annotate(node){
  if(!node || typeof node!=='object')return;
  for(const [key,value]of Object.entries(node))if(typeof value==='string')
    node[key]=value.replaceAll('rankStaff','rankDragonstone')
      .replace('weapon-ranks/staff.png','weapon-ranks/dragonstone.png');
  if(node.text==='Assumes survival; defeat EXP includes damage EXP.')
    node.text='Assumes survival and regular hits connecting; damage EXP leaves the foe alive. Defeat EXP is total.';
  if(node.name==='Map' && node.child?.children)node.child.children.unshift({
    type:'text',id:'sacred-ranges-progress',visibleIf:'$mapRangesBusy',
    text:'Calculating spell and equipment ranges...',style:{'font-size':'2vmin',color:'#f4d38c'}
  });
  for(const value of Object.values(node))if(value && typeof value==='object')
    Array.isArray(value)?value.forEach(annotate):annotate(value);
})(SACRED_ECHOES_TEMPLATE.layout);
