// Reuse the accepted English eight-stat/six-skill UI.
globalThis.POKEMBLEM_TEMPLATE=structuredClone(HAG_IN_WHITE_TEMPLATE);
Object.assign(POKEMBLEM_TEMPLATE.manifest,{id:"pokemblem-local-cache",name:"Pokemblem - Local ROM Cache",version:'1.0.0',match:{gameCode:['BE8E'],crc32:['10BDF112']}});
for(let n=1;n<=5;n++)Object.assign(POKEMBLEM_TEMPLATE.data,{['pokeMove'+n+'Id']:0,['pokeMove'+n+'Present']:false,['pokeMove'+n+'Name']:'---',['pokeMove'+n+'Description']:'No move in this slot.',['pokeMove'+n+'Stats']:'',['item'+n+'AccessoryEquipped']:false});
// A read-only companion selection is safe in both modes. Sending tactical
// cursor input is not verified for this ROM's free-movement mode.
(function visit(node){
  if(!node||typeof node!=='object')return;
  if(node.onClick?.call==='focusMapUnit'){delete node.onClick.call;delete node.onClick.args;}
  if(node.id==='hag-base-range-note')node.text='Map taps show companion details. Move-based movement, attack and danger overlays are unavailable. In-game cursor movement is unavailable.';
  if(Array.isArray(node.children))node.children=node.children.filter(child=>
    !String(child.class||'').includes('map-danger-button')&&!String(child.class||'').includes('map-legend')
    &&!/(?:mapMoveCount|mapAttackCount|mapDangerCount)/.test(child.text||''));
  if(node.class==='weapon-ranks'){
    node.class+=' poke-moves';
    node.children=[{type:'text',id:'poke-move-heading',class:'poke-move-heading',text:'Moves'},...Array.from({length:5},(_,index)=>{
      const n=index+1;
      return {type:'box',id:'poke-move-button-'+n,class:'poke-move-button',children:[{type:'text',id:'poke-move-name-'+n,class:'poke-move-name',text:'{pokeMove'+n+'Name}'}],onClick:{set:{inventoryDetail:'pokeMove'+n,itemSelected1:false,itemSelected2:false,itemSelected3:false,itemSelected4:false,itemSelected5:false}}};
    })];
  }
  if(node.type==='pages'&&node.state==='inventoryDetail'){
    for(let n=1;n<=5;n++)node.pages.push({name:'pokeMove'+n,child:{type:'column',id:'poke-move-detail-'+n,class:'remaster-skill-detail',children:[
      {type:'text',id:'poke-move-title-'+n,class:'detail-title',text:'{pokeMove'+n+'Name}'},
      {type:'text',id:'poke-move-stats-'+n,class:'remaster-skill-description',text:'{pokeMove'+n+'Stats}'},
      {type:'text',id:'poke-move-description-'+n,class:'remaster-skill-description',text:'{pokeMove'+n+'Description}'}
    ]}});
  }
  for(const value of Object.values(node))if(value&&typeof value==='object')Array.isArray(value)?value.forEach(visit):visit(value);
})(POKEMBLEM_TEMPLATE.layout);
POKEMBLEM_TEMPLATE.css+='\n.poke-moves{gap:0.5vmin;min-width:0;}.poke-move-heading{font-size:2.3vmin;line-height:2.8vmin;font-weight:bold;}.poke-move-button{flex:1;min-height:0;justify-content:center;padding:0.35vmin;border:0.18vmin solid #ad9565;border-radius:0.4vmin;}.poke-move-name{font-size:2.2vmin;line-height:2.7vmin;white-space:normal;}\n';
fitCompanionHeader(POKEMBLEM_TEMPLATE);
