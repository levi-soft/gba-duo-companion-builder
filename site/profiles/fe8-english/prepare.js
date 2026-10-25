// Original English USA/Australia tables. Never reuse translated text or EU addresses.
(function(root) {
  const profile = Object.freeze({
    id:'fe8-english', code:'BE8E', crc32:0xA47246AE, language:'en', textEncoding:'latin1',
    characters:0x803D30, classes:0x807110, items:0x809B10,
    portraits:0x8ACBC4, sprites:0x8AF880, icons:0x5926F4,
    iconPalettes:0x5996F4, spritePalettes:0x59EE20, slots:0x59A5D0,
    text:0x15D48C, chapters:0x8B0890, minimap:0xA1FBD8, minimapPalette:0xA1FFB0
  });
  root.FE8EnglishPrep = {
    ...root.FE8PublicPrep,
    prepare(input,template,runtime,options={}) {
      return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);
    },
    radarSvg(growth,bonus) { return root.CompanionRadar.svg(growth,bonus,'en'); }
  };
})(globalThis);
