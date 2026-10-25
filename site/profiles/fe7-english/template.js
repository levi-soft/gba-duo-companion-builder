// Development UI prototype, not a registered ROM adapter or a stable release.
// The ROM contract and native runtime must be verified before catalogue support.
globalThis.makeFe7EnglishPrototype = function (identity) {
  if (identity?.gameCode !== 'AE7E' || identity.crc32 !== '2A524221') {
    throw Error('FE7 English requires a verified exact AE7E ROM identity');
  }
  const project = structuredClone(FE7_TEMPLATE);
  project.manifest.id = 'fe7-english-local-cache';
  project.manifest.name = 'FE7 English — Local ROM Cache';
  project.manifest.version = '0.1.0';
  project.manifest.match = {gameCode: [identity.gameCode], crc32: [identity.crc32]};
  project.layout = makeCompanionLayout(null, 'en');
  project.data = localizeCompanionUi(FE7_TEMPLATE.data, 'en');
  project.uiLanguage = 'en';
  project.developmentStage = 'ui-prototype';
  return project;
};
globalThis.FE7_ENGLISH_TEMPLATE = makeFe7EnglishPrototype({gameCode: 'AE7E', crc32: '2A524221'});
