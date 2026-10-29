// Reuse the accepted English seven-stat/six-skill UI.
globalThis.BELLS_OF_BYELEN_TEMPLATE=structuredClone(VOIDS_BLITZARRE_TEMPLATE);
Object.assign(BELLS_OF_BYELEN_TEMPLATE.manifest,{id:"bells-of-byelen-local-cache",name:"Bells of Byelen - Local ROM Cache",version:'1.0.0',match:{gameCode:['BE8E'],crc32:['48B996CD']}});
// Mov/Build have their own verified ROM growth sources.
(function visit(node){if(!node||typeof node!=='object')return;if(node.id==='growth-calculation-note')node.text='Move {growthMov}% | Build {growthCon}%\n{growthCalculationNote}';for(const value of Object.values(node))if(value&&typeof value==='object')Array.isArray(value)?value.forEach(visit):visit(value);})(BELLS_OF_BYELEN_TEMPLATE.layout);
fitCompanionHeader(BELLS_OF_BYELEN_TEMPLATE);
