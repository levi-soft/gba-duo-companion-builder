// Accepted English layout; all game data and artwork are prepared from the ROM.
(function(root) {
  const extension=withCompanionTalk(FE8_UI_EXTENSION,FE6_UI_EXTENSION);
  root.DREAM_OF_FIVE_TEMPLATE=structuredClone(FE8_ENGLISH_TEMPLATE);
  Object.assign(DREAM_OF_FIVE_TEMPLATE.manifest,{
    id:'dream-of-five-local-cache',name:"Dream of Five - Definitive Edition - Local ROM Cache",version:'1.0.0',
    match:{gameCode:['BE8E'],crc32:['B313A6F5']}
  });
  DREAM_OF_FIVE_TEMPLATE.layout=makeCompanionLayout(extension,'en');
  DREAM_OF_FIVE_TEMPLATE.css=COMPANION_THEME.css+extension.css;
})(globalThis);
fitCompanionHeader(DREAM_OF_FIVE_TEMPLATE);
