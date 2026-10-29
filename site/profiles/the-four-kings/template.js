// Accepted English layout; all game data and artwork are prepared from the ROM.
(function(root) {
  root.THE_FOUR_KINGS_TEMPLATE=structuredClone(VOIDS_BLITZARRE_TEMPLATE);
  Object.assign(THE_FOUR_KINGS_TEMPLATE.manifest,{
    id:'the-four-kings-local-cache',name:"The Four Kings - Local ROM Cache",version:'1.0.0',
    match:{gameCode:['BE8E'],crc32:['0DDE5BEB']}
  });
})(globalThis);
fitCompanionHeader(THE_FOUR_KINGS_TEMPLATE);
