// Exact-ROM development profile; shared accepted English eight-stat UI.
globalThis.ANDARON_SAGA_TEMPLATE=structuredClone(HAG_IN_WHITE_TEMPLATE);
Object.assign(ANDARON_SAGA_TEMPLATE.manifest,{
  id:'andaron-saga-local-cache',name:"Andaron Saga - Local ROM Cache",version:'1.0.0',
  match:{gameCode:['BE8E'],crc32:['A3B9CD19']}
});
fitCompanionHeader(ANDARON_SAGA_TEMPLATE,{leadership:true});
