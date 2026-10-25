// Verified relocated FE6 tables for this exact Project Ember build.
(function(root) {
  const profile = Object.freeze({
    id:'fe6-project-ember', name:'Project Ember', code:'AFEJ', crc32:0x636F7B05, romSize:25355392,
    characters:0x6076D0, characterCount:226, classes:0x60A130, classCount:75,
    items:0x1808E74, itemCount:168, portraits:0x1605CF0, sprites:0x173271C,
    icons:0xF9D80, iconPalettes:0xFED80, spritePalettes:0x100968,
    slots:0x5C5280, text:0x180A394, chapters:0x6637A4, chapterTitles:root.FE6_ENGLISH_CHAPTER_TITLES, affinityBonuses:0x137DB0C,
    minimap:0x3273E4, minimapPalette:0x3277BC, decodeText:root.FE6_ENGLISH_ENCODING
  });
  root.FE6ProjectEmberPrep = {
    prepare(input, template, runtime, options={}) {
      return root.FE6RomPrep.prepare(input, template, runtime, options, profile);
    },
    radarSvg:root.FE6RomPrep.radarSvg
  };
})(globalThis);
