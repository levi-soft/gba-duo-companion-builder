// Reuse the FE8 ability panel and common English UI, with an independent ROM match.
globalThis.FE8_ENGLISH_TEMPLATE = structuredClone(FE8_TEMPLATE);
Object.assign(FE8_ENGLISH_TEMPLATE.manifest, {
  id: 'fe8-english-local-cache', name: 'FE8 English - Local ROM Cache', version: '1.0.0',
  match: {gameCode: ['BE8E'], crc32: ['A47246AE']}
});
FE8_ENGLISH_TEMPLATE.layout = localizeCompanionUi(FE8_TEMPLATE.layout, 'en');
FE8_ENGLISH_TEMPLATE.data = localizeCompanionUi(FE8_TEMPLATE.data, 'en');
FE8_ENGLISH_TEMPLATE.uiLanguage = 'en';
