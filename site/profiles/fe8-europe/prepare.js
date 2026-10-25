// European English table/graphics addresses; never infer region from RAM.
(function (root) {
  const profile = Object.freeze({
    id: 'fe8-europe', code: 'BE8P', crc32: 0xB3005195, language: 'en', textEncoding: 'latin1',
    characters: 0xEFFFCC, classes: 0xF033AC, items: 0xF05DAC,
    portraits: 0xFA8E60, sprites: 0xFABB1C, icons: 0x7A39C0,
    iconPalettes: 0x7AA9C0, spritePalettes: 0x7B13E4, slots: 0x7AB8B0,
    text: 0x35B8AC, chapters: 0xFACB2C, minimap: 0xAEC3A8, minimapPalette: 0xAEC780
  });
  root.FE8EuropePrep = {
    ...root.FE8PublicPrep,
    prepare(input, template, runtime, options = {}) {
      return root.FE8PublicPrep.prepare(input, template, runtime, options, profile);
    },
    radarSvg(growth, bonus) {
      return root.CompanionRadar.svg(growth, bonus, 'en');
    }
  };
})(globalThis);
