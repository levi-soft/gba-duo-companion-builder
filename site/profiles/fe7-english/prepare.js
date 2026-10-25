// Share the FE7 reader and asset preparation; exact identity/language stay here.
(function (root) {
  const profile = Object.freeze({id: 'fe7-english', crc32: 0x2A524221, language: 'en'});
  root.FE7EnglishPrep = {
    ...root.FE7PublicPrep,
    prepare(input, template, runtime, options = {}) {
      return root.FE7PublicPrep.prepare(input, template, runtime, options, profile);
    },
    radarSvg(growth, bonus) {
      return root.CompanionRadar.svg(growth, bonus, 'en');
    }
  };
})(globalThis);
