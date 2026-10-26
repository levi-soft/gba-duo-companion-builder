// Reuse the accepted seven-stat, six-skill English FE8 UI and Talk detail.
globalThis.VISION_QUEST_TEMPLATE=structuredClone(VOIDS_BLITZARRE_TEMPLATE);
Object.assign(VISION_QUEST_TEMPLATE.manifest,{
  id:'vision-quest-local-cache',name:'Vision Quest - Local ROM Cache',version:'1.0.0',
  match:{gameCode:['BE8E'],crc32:['2BCFEC83']}
});
