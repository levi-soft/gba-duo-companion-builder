// Inherit the accepted native FE6 English UI without duplicating its layout.
globalThis.FE6_PROJECT_EMBER_TEMPLATE = structuredClone(FE6_ENGLISH_TEMPLATE);
Object.assign(FE6_PROJECT_EMBER_TEMPLATE.manifest, {
  id:'fe6-project-ember-local-cache', name:'Project Ember — Local ROM Cache', version:'1.0.0',
  match:{gameCode:['AFEJ'],crc32:['636F7B05']}
});
