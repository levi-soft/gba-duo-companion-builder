// Share the accepted eight-stat/six-skill UI instead of duplicating its layout.
globalThis.HAG_IN_WHITE_TEMPLATE=structuredClone(FE6_TEMPLATE);
Object.assign(HAG_IN_WHITE_TEMPLATE.manifest,{
  id:'hag-in-white-local-cache',name:'The Hag in White - Local ROM Cache',version:'1.0.0',
  match:{gameCode:['BE8E'],crc32:['7479D7E2']}
});
HAG_IN_WHITE_TEMPLATE.layout=makeCompanionLayout(FE6_UI_EXTENSION,'en');
HAG_IN_WHITE_TEMPLATE.data=localizeCompanionUi(FE6_TEMPLATE.data,'en');
HAG_IN_WHITE_TEMPLATE.uiLanguage='en';
// Tactical range overlays retain the same documented limit as the Void profile.
(function annotate(node) {
  if(!node || typeof node!=='object')return;
  if(node.name==='Map' && node.child?.children)node.child.children.unshift({
    type:'text',id:'hag-base-range-note',class:'hag-range-note',
    text:'Range overlays use base movement and weapon ranges. Range-changing skills are not included.'
  });
  for(const value of Object.values(node))if(value && typeof value==='object')
    Array.isArray(value)?value.forEach(annotate):annotate(value);
})(HAG_IN_WHITE_TEMPLATE.layout);
HAG_IN_WHITE_TEMPLATE.css+='\n.hag-range-note{font-size:1.6vmin;color:#f4d38c;padding:0.3vmin;}\n';
