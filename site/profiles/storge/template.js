// Inherit the accepted English FE8 UI and the shared Talk detail component.
(function(root) {
  const extension=withCompanionTalk(FE8_UI_EXTENSION,FE6_UI_EXTENSION);
  root.STORGE_TEMPLATE=structuredClone(FE8_ENGLISH_TEMPLATE);
  Object.assign(STORGE_TEMPLATE.manifest,{
    id:'storge-local-cache',name:'Storge - Local ROM Cache',version:'1.0.0',
    match:{gameCode:['BE8E'],crc32:['079106D8']}
  });
  STORGE_TEMPLATE.layout=makeCompanionLayout(extension,'en');
  STORGE_TEMPLATE.css=COMPANION_THEME.css+extension.css;
})(globalThis);
