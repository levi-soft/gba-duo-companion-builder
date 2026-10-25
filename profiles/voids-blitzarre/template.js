// Reuse the English FE8 panel; expand its native ability slots to six skill icons.
(function(root) {
  const extension = structuredClone(FE8_UI_EXTENSION);
  const buttons = extension.nativePanel.children[0];
  const prototype = buttons.children[0].children[0], page = extension.pages[0];
  function slot(value, index) {
    return JSON.parse(JSON.stringify(value).replaceAll('nativeSkill1','nativeSkill'+index)
      .replaceAll('-1"','-'+index+'"'));
  }
  buttons.children = Array.from({length:2}, (_, row) => ({
    type:'row', id:'void-skill-row-'+row, class:'native-ability-row',
    children:Array.from({length:3}, (_, col) => {
      const n=row*3+col+1, button=slot(prototype,n);
      button.children=[{type:'image',id:'void-skill-icon-'+n,class:'void-skill-icon',src:'$nativeSkill'+n+'Icon'}];
      return button;
    })
  }));
  extension.pages=Array.from({length:6},(_,index)=>slot(page,index+1));
  // Reuse the accepted Remastered sprite badge and Talk detail component.
  extension.sprite=structuredClone(FE6_UI_EXTENSION.sprite);
  const talk=structuredClone(FE6_UI_EXTENSION.pages.find(page=>page.name==='talk'));
  talk.child.class='native-ability-detail';
  talk.child.children[0].class='native-ability-title';
  talk.child.children[1].class='native-ability-description';
  extension.pages.push(talk);
  extension.css+='\n'+FE6_UI_EXTENSION.css.split('\n')
    .filter(rule=>/remaster-sprite-frame|remaster-unit-sprite|remaster-talk-badge/.test(rule)).join('\n');
  root.VOIDS_BLITZARRE_TEMPLATE=structuredClone(FE8_ENGLISH_TEMPLATE);
  Object.assign(VOIDS_BLITZARRE_TEMPLATE.manifest,{
    id:'voids-blitzarre-local-cache',name:"Void's Blitzarre Adventure - Local ROM Cache",version:'1.0.0',
    match:{gameCode:['BE8E'],crc32:['9D22107C']}
  });
  VOIDS_BLITZARRE_TEMPLATE.layout=makeCompanionLayout(extension,'en');
  function annotateMap(node) {
    if(!node || typeof node!=='object')return;
    if(node.name==='Map' && node.child?.children)node.child.children.unshift({
      type:'text',id:'void-base-range-note',class:'void-range-note',
      text:'Range overlays use base movement and weapon ranges. Range-changing skills are not included.'
    });
    for(const value of Object.values(node))if(value && typeof value==='object')
      Array.isArray(value)?value.forEach(annotateMap):annotateMap(value);
  }
  annotateMap(VOIDS_BLITZARRE_TEMPLATE.layout);
  VOIDS_BLITZARRE_TEMPLATE.css=COMPANION_THEME.css+extension.css+'\n.void-skill-icon{width:2.8vmin;height:2.8vmin;}\n';
  VOIDS_BLITZARRE_TEMPLATE.css+='\n.void-range-note{font-size:1.6vmin;color:#f4d38c;padding:0.3vmin;}\n';
})(globalThis);
