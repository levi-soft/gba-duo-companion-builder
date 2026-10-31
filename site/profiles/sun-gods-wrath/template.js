// Reuse the accepted English eight-stat/six-skill UI.
globalThis.SUN_GODS_WRATH_TEMPLATE=structuredClone(HAG_IN_WHITE_TEMPLATE);
Object.assign(SUN_GODS_WRATH_TEMPLATE.manifest,{id:"sun-gods-wrath-local-cache",name:"The Sun God’s Wrath - Local ROM Cache",version:'1.0.0',match:{gameCode:['BE8E'],crc32:['566D7A9E']}});
// Mov/Con have their own verified ROM growth sources.
(function visit(node){if(!node||typeof node!=='object')return;if(node.id==='growth-calculation-note')node.text='Move {growthMovRateText} | Con {growthConRateText}\n{growthCalculationNote}';for(const value of Object.values(node))if(value&&typeof value==='object')Array.isArray(value)?value.forEach(visit):visit(value);})(SUN_GODS_WRATH_TEMPLATE.layout);
fitCompanionHeader(SUN_GODS_WRATH_TEMPLATE);

extendCompanionAnalysisStats(SUN_GODS_WRATH_TEMPLATE,[{key:"Con",label:"Con"},{key:"Mov",label:"Mov"}]);
