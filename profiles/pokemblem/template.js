// Reuse the accepted English eight-stat/six-skill UI.
globalThis.POKEMBLEM_TEMPLATE=structuredClone(HAG_IN_WHITE_TEMPLATE);
Object.assign(POKEMBLEM_TEMPLATE.manifest,{id:"pokemblem-local-cache",name:"Pokemblem - Local ROM Cache",version:'1.0.0',match:{gameCode:['BE8E'],crc32:['10BDF112']}});
for(let n=1;n<=5;n++)Object.assign(POKEMBLEM_TEMPLATE.data,{['pokeMove'+n+'Id']:0,['pokeMove'+n+'Present']:false,['pokeMove'+n+'Name']:'---',['pokeMove'+n+'Description']:'No move in this slot.',['pokeMove'+n+'Stats']:'',['item'+n+'AccessoryEquipped']:false});
POKEMBLEM_TEMPLATE.data.mapRangesLabel='Select a unit in game to show its native ranges.';
// Native ranges and threat fog are read from the game. Cursor input additionally
// requires the authored navigation profile and the runtime's per-mode guard.
const pokemblemNavigationReady=Boolean(globalThis.COMPANION_CURSOR_PROFILES?.pokemblem);
(function visit(node){
  if(!node||typeof node!=='object')return;
  if(!pokemblemNavigationReady&&node.onClick?.call==='focusMapUnit'){delete node.onClick.call;delete node.onClick.args;}
  if(node.id==='hag-base-range-note')node.text='{mapRangesLabel}';
  if(/^remaster-skill-detail-[1-6]$/.test(node.id||'')){
    node.class+=' poke-native-skill-detail';
    for(const child of node.children||[]){
      if(child.class==='remaster-skill-heading'){
        child.class+=' poke-native-skill-heading';
        for(const heading of child.children||[])if(heading.class==='detail-title')heading.class+=' poke-native-skill-title';
      }
      if(child.class==='remaster-skill-description')child.class+=' poke-native-skill-body';
    }
  }
  if(node.class==='weapon-ranks'){
    node.class+=' poke-moves';
    node.children=[{type:'text',id:'poke-move-heading',class:'poke-move-heading',text:'Moves'},...Array.from({length:5},(_,index)=>{
      const n=index+1;
      return {type:'box',id:'poke-move-button-'+n,class:'poke-move-button',children:[{type:'text',id:'poke-move-name-'+n,class:'poke-move-name',text:'{pokeMove'+n+'Name}'}],onClick:{set:{inventoryDetail:'pokeMove'+n,itemSelected1:false,itemSelected2:false,itemSelected3:false,itemSelected4:false,itemSelected5:false}}};
    })];
  }
  if(node.type==='pages'&&node.state==='inventoryDetail'){
    for(let n=1;n<=5;n++)node.pages.push({name:'pokeMove'+n,child:{type:'column',id:'poke-move-detail-'+n,class:'remaster-skill-detail poke-move-detail',children:[
      {type:'text',id:'poke-move-title-'+n,class:'detail-title poke-move-title',text:'{pokeMove'+n+'Name}'},
      {type:'text',id:'poke-move-stats-'+n,class:'poke-move-stats',text:'{pokeMove'+n+'Stats}'},
      {type:'text',id:'poke-move-description-'+n,class:'remaster-skill-description poke-move-body',text:'{pokeMove'+n+'Description}'}
    ]}});
  }
  for(const value of Object.values(node))if(value&&typeof value==='object')Array.isArray(value)?value.forEach(visit):visit(value);
})(POKEMBLEM_TEMPLATE.layout);
POKEMBLEM_TEMPLATE.css+='\n.poke-moves{gap:0.5vmin;min-width:0;}.poke-move-heading{font-size:2.3vmin;line-height:2.8vmin;font-weight:bold;}.poke-move-button{flex:1;min-height:0;justify-content:center;padding:0.35vmin;border:0.18vmin solid #ad9565;border-radius:0.4vmin;}.poke-move-name{font-size:2.2vmin;line-height:2.7vmin;white-space:normal;}\n';
// Detail headings stay fixed while the full description scrolls inside its card.
POKEMBLEM_TEMPLATE.css+='\n.poke-move-detail,.poke-native-skill-detail{min-width:0;min-height:0;padding:0.45vmin 0.6vmin;gap:0.25vmin;overflow:hidden;}\n'
  +'.poke-move-title{height:2.5vmin;flex:0 0 2.5vmin;font-size:2.1vmin;line-height:2.5vmin;}\n'
  +'.poke-move-stats{height:2.5vmin;flex:0 0 2.5vmin;font-size:2vmin;line-height:2.5vmin;white-space:nowrap;}\n'
  +'.poke-move-body,.poke-native-skill-body{flex:1 1 0vmin;min-width:0;min-height:0;font-size:2.05vmin;line-height:2.55vmin;white-space:normal;overflow:auto;}\n'
  +'.poke-native-skill-heading{height:3vmin;flex:0 0 3vmin;min-height:0;gap:0.6vmin;}\n'
  +'.poke-native-skill-title{flex:1;min-width:0;font-size:2.1vmin;line-height:2.5vmin;}\n'
  +'.poke-native-skill-heading .remaster-detail-icon{width:2.8vmin;height:2.8vmin;flex:0 0 2.8vmin;}\n';
fitCompanionHeader(POKEMBLEM_TEMPLATE);
