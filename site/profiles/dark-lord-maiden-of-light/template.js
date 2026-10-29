// Accepted English layout; all game data and artwork are prepared from the ROM.
(function(root) {
  const extension=withCompanionTalk({pages:[],css:''},FE6_UI_EXTENSION);
  root.DARK_LORD_MAIDEN_OF_LIGHT_TEMPLATE=structuredClone(FE7_ENGLISH_TEMPLATE);
  Object.assign(DARK_LORD_MAIDEN_OF_LIGHT_TEMPLATE.manifest,{
    id:'dark-lord-maiden-of-light-local-cache',name:"Dark Lord and the Maiden of Light - Local ROM Cache",version:'1.0.0',
    match:{gameCode:['AE7E'],crc32:['C99A6D26']}
  });
  DARK_LORD_MAIDEN_OF_LIGHT_TEMPLATE.layout=makeCompanionLayout(extension,'en');
  DARK_LORD_MAIDEN_OF_LIGHT_TEMPLATE.css=COMPANION_THEME.css+extension.css;
})(globalThis);
fitCompanionHeader(DARK_LORD_MAIDEN_OF_LIGHT_TEMPLATE);
