// Exact FE6 T-EN identity and table contract.
(function(root) {
  const profile = Object.freeze({
    id:'fe6-english', name:'FE6 T-EN', code:'AFEJ', crc32:0x197DE10B, romSize:8612264,
    characters:0x6076D0, characterCount:226, classes:0x60A130, classCount:75,
    items:0x60B648, itemCount:128, portraits:0x66075C, sprites:0x662C14,
    icons:0xF9D80, iconPalettes:0xFED80, spritePalettes:0x100968,
    slots:0x5C5280, text:0x833530, chapters:0x6637A4, chapterTitles:root.FE6_ENGLISH_CHAPTER_TITLES, affinityBonuses:0x66350C,
    minimap:0x3273E4, minimapPalette:0x3277BC, decodeText:root.FE6_ENGLISH_ENCODING
  });
  root.FE6EnglishPrep = {
    prepare(input, template, runtime, options = {}) {
      return root.FE6RomPrep.prepare(input, template, runtime, options, profile);
    },
    radarSvg:root.FE6RomPrep.radarSvg
  };
})(globalThis);
