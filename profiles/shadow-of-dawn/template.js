// Exact-ROM development profile; shared accepted English eight-stat UI.
globalThis.SHADOW_OF_DAWN_TEMPLATE=structuredClone(HAG_IN_WHITE_TEMPLATE);
Object.assign(SHADOW_OF_DAWN_TEMPLATE.manifest,{
  id:'shadow-of-dawn-local-cache',name:"The Shadow of Dawn - Local ROM Cache",version:'1.0.0',
  match:{gameCode:['BE8E'],crc32:['EB38F5F7']}
});
fitCompanionHeader(SHADOW_OF_DAWN_TEMPLATE);
