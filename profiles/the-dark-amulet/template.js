// Exact-ROM development profile; shared accepted English eight-stat UI.
globalThis.THE_DARK_AMULET_TEMPLATE=structuredClone(HAG_IN_WHITE_TEMPLATE);
Object.assign(THE_DARK_AMULET_TEMPLATE.manifest,{
  id:'the-dark-amulet-local-cache',name:"The Dark Amulet - Local ROM Cache",version:'1.0.0',
  match:{gameCode:['BE8E'],crc32:['8537CE2A']}
});
fitCompanionHeader(THE_DARK_AMULET_TEMPLATE);
