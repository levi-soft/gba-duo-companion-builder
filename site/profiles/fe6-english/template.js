// Inherit the common FE UI and its authored English strings.
globalThis.FE6_ENGLISH_TEMPLATE = structuredClone(FE7_TEMPLATE);
Object.assign(FE6_ENGLISH_TEMPLATE.manifest, {
  id: 'fe6-english-local-cache', name: 'FE6 T-EN — Local ROM Cache', version: '1.0.0',
  match: {gameCode: ['AFEJ'], crc32: ['197DE10B']}
});
FE6_ENGLISH_TEMPLATE.layout = localizeCompanionUi(FE7_TEMPLATE.layout, 'en');
FE6_ENGLISH_TEMPLATE.data = localizeCompanionUi(FE7_TEMPLATE.data, 'en');
FE6_ENGLISH_TEMPLATE.uiLanguage = 'en';
