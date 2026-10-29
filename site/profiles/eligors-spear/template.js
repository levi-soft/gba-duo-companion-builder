// Exact-ROM development profile; shared accepted English seven-stat UI.
globalThis.ELIGORS_SPEAR_TEMPLATE=structuredClone(VOIDS_BLITZARRE_TEMPLATE);
Object.assign(ELIGORS_SPEAR_TEMPLATE.manifest,{
  id:'eligors-spear-local-cache',name:"Eligor's Spear - Local ROM Cache",version:'1.0.0',
  match:{gameCode:['BE8E'],crc32:['6E5FE3B0']}
});
fitCompanionHeader(ELIGORS_SPEAR_TEMPLATE);
