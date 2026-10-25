// Inherit the FE8 native ability extensions and the shared English UI.
globalThis.FE8_EUROPE_TEMPLATE = structuredClone(FE8_TEMPLATE);
Object.assign(FE8_EUROPE_TEMPLATE.manifest, {
  id: 'fe8-europe-local-cache', name: 'FE8 Europe — Local ROM Cache', version: '0.1.0',
  match: {gameCode: ['BE8P'], crc32: ['B3005195']}
});
FE8_EUROPE_TEMPLATE.layout = localizeCompanionUi(FE8_TEMPLATE.layout, 'en');
FE8_EUROPE_TEMPLATE.data = localizeCompanionUi(FE8_TEMPLATE.data, 'en');
FE8_EUROPE_TEMPLATE.uiLanguage = 'en';
FE8_EUROPE_TEMPLATE.developmentStage = 'regional-prototype';
