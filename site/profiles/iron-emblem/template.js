// Accepted English layout; all game data and artwork are prepared from the ROM.
(function(root) {
  const extension=withCompanionTalk(FE8_UI_EXTENSION,FE6_UI_EXTENSION);
  root.IRON_EMBLEM_TEMPLATE=structuredClone(FE8_ENGLISH_TEMPLATE);
  Object.assign(IRON_EMBLEM_TEMPLATE.manifest,{
    id:'iron-emblem-local-cache',name:"Iron Emblem - Local ROM Cache",version:'1.0.0',
    match:{gameCode:['BE8E'],crc32:['141FF3AA']}
  });
  IRON_EMBLEM_TEMPLATE.layout=makeCompanionLayout(extension,'en');
  IRON_EMBLEM_TEMPLATE.css=COMPANION_THEME.css+extension.css;
})(globalThis);
fitCompanionHeader(IRON_EMBLEM_TEMPLATE);
