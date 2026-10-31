// Accepted English layout; all game data and artwork are prepared from the ROM.
(function(root) {
  const extension=withCompanionTalk(FE8_UI_EXTENSION,FE6_UI_EXTENSION);
  root.THE_LONELY_MIRROR_TEMPLATE=structuredClone(FE8_ENGLISH_TEMPLATE);
  Object.assign(THE_LONELY_MIRROR_TEMPLATE.manifest,{
    id:'the-lonely-mirror-local-cache',name:"The Lonely Mirror - Local ROM Cache",version:'1.0.0',
    match:{gameCode:['BE8E'],crc32:['A74E93C7']}
  });
  THE_LONELY_MIRROR_TEMPLATE.layout=makeCompanionLayout(extension,'en');
  THE_LONELY_MIRROR_TEMPLATE.css=COMPANION_THEME.css+extension.css;
})(globalThis);
fitCompanionHeader(THE_LONELY_MIRROR_TEMPLATE);
