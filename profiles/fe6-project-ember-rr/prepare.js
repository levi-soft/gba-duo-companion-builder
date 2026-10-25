// Verified relocated FE6 tables for this exact Project Ember build.
(function(root) {
  const profile = Object.freeze({
    id:'fe6-project-ember-rr', name:'Project Ember Reverse Recruitment', code:'AFEJ', crc32:0x29BC2257, romSize:24475812,
    characters:0x6076D0, characterCount:226, classes:0x60A130, classCount:75,
    items:0x16411B4, itemCount:168, portraits:0x1658A34, sprites:0xDE11B8,
    icons:0xF9D80, iconPalettes:0xFED80, spritePalettes:0x100968,
    slots:0x5C5280, text:0x1753624, chapters:0x6637A4, chapterTitles:root.FE6_ENGLISH_CHAPTER_TITLES, affinityBonuses:0x66350C,
    minimap:0x3273E4, minimapPalette:0x3277BC, decodeText:root.FE6_ENGLISH_ENCODING
  });
  root.FE6ProjectEmberRRPrep = {
    prepare(input, template, runtime, options={}) {
      return root.FE6RomPrep.prepare(input, template, runtime, options, profile);
    },
    radarSvg:root.FE6RomPrep.radarSvg
  };
})(globalThis);
