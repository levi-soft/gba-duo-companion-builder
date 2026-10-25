// Shared native FE6 table and asset preparation; exact-ROM contracts live in profiles.
(function(root) {
  const BASE = 0x08000000;
  function prepareChapters(reader, address, titleNames = []) {
    return Array.from({length:45}, (_, id) => {
      const record = address + id * 0x44;
      // Native FE6 stores the displayed number/gaiden flag separately from the
      // internal map ID. Main-story titles in these ROMs are graphical, so their
      // text records are blank. Profiles supply verified graphic transcriptions.
      const index = reader.u8(record + 0x3e);
      const label = id === 0 ? 'Tutorial' : id === 0x19 ? 'Final Chapter' :
        id === 0x27 ? 'Link Arena' : id >= 0x28 ? 'Trial Map ' + (id - 0x27) :
        'Ch. ' + (index >> 1) + (index & 1 ? 'x' : '');
      const name = reader.text(reader.u16(record + 0x38)).trim() || titleNames[reader.u8(record + 0x0e)] || '';
      const title = !name ? '' : name === label || name.startsWith(label + ':') ? name : label + ': ' + name;
      return {label, title,
        objectiveShort:reader.text(reader.u16(record + 0x30))};
    });
  }
  async function prepare(input, template, runtime, options = {}, profile) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const api = root.CompanionRom;
    if (bytes.length !== profile.romSize || api.crc32(bytes) !== profile.crc32 ||
        String.fromCharCode(...bytes.subarray(0xac, 0xb0)) !== profile.code)
      throw Error('This profile requires ' + profile.name + ': ' + profile.code + ' / CRC32 ' + profile.crc32.toString(16).toUpperCase().padStart(8, '0') + '.');
    if ('chapterTitles' in profile && (!Array.isArray(profile.chapterTitles) ||
        profile.chapterTitles.slice(0, 38).length !== 38 ||
        profile.chapterTitles.slice(0, 38).some(title => typeof title !== 'string' || !title.trim())))
      throw Error('Missing verified chapter title metadata for ' + profile.name + '.');
    const r = api.reader(bytes, profile), p = structuredClone(template);
    const chars = {}, classes = {}, items = {}, slots = {}, dimensions = {};
    const affinities = ['---', 'Fire', 'Thunder', 'Wind', 'Ice', 'Dark', 'Light', 'Anima'];
    let images = 0;
    async function progress(message) {
      if (options.signal?.aborted) throw Error('Cancelled.');
      options.onProgress?.(message);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    async function image(path, data) {
      const name = 'asset:' + path.slice(7);
      dimensions[name] = data.width / data.height;
      if (!p.files[path]) {
        p.files[path] = api.b64(await api.png(data));
        if (++images % 32 === 0) await progress('Building FE6 images: ' + images);
      }
      return name;
    }
    function portrait(id) {
      const a = profile.portraits + (id - 1) * 16, palette = r.ptr(a + 8), data = r.lz(r.ptr(a));
      if (data.length === 2880 || (r.u32(a + 4) === 0 && data.length % 320 === 0)) {
        const height = data.length / 40;
        if (height < 8 || height > 256) throw Error('Invalid FE6 class portrait');
        return api.tiles(r, data, 80, height, palette);
      }
      const src = api.tiles(r, data, 256, 32, palette);
      const out = {width: 96, height: 80, rgba: new Uint8Array(96 * 80 * 4)};
      for (const q of [[16,0,0,0,64,32], [16,32,64,0,64,32], [16,64,128,0,32,16],
                       [48,64,128,16,32,16], [0,48,160,0,16,32], [80,48,176,0,16,32]])
        api.blit(out, src, ...q);
      return out;
    }
    await progress('Reading FE6 characters');
    for (let id = 1; id <= profile.characterCount; id++) {
      const a = profile.characters + (id - 1) * 48;
      if (r.u8(a + 4) !== id) throw Error('FE6 character table mismatch');
      const face = r.u16(a + 6), support = r.u32(a + 44) - BASE;
      const count = support >= 0 && support + 31 <= bytes.length ? Math.min(10, r.u8(support + 30)) : 0;
      chars[a + BASE] = {id, name: r.text(r.u16(a)), description: r.text(r.u16(a + 2)),
        portrait: face ? await image('assets/images/portraits/' + face + '.png', portrait(face)) : '',
        affinity: r.u8(a + 9), con: r.s8(a + 19), attributes: r.u32(a + 40),
        supports: Array.from(bytes.subarray(support, support + count)),
        growth: Array.from(bytes.subarray(a + 28, a + 35))};
    }
    await progress('Reading FE6 classes');
    for (let id = 1; id <= profile.classCount; id++) {
      const a = profile.classes + (id - 1) * 72;
      if (r.u8(a + 4) !== id) throw Error('FE6 class table mismatch');
      const sid = r.u8(a + 6), face = r.u16(a + 8), entry = profile.sprites + sid * 8, size = r.u8(entry + 2);
      if (size > 2) throw Error('Unsupported FE6 map sprite');
      const data = r.lz(r.ptr(entry + 4)), w = size === 2 ? 32 : 16, h = size === 2 ? 32 : size === 1 ? 24 : 16;
      const sprites = [];
      for (let f = 0; f < 3; f++) {
        const src = api.tiles(r, data, w, size === 0 ? 48 : 96, profile.spritePalettes + f * 32);
        const out = {width: w, height: h, rgba: new Uint8Array(w * h * 4)};
        api.blit(out, src, 0, 0, 0, size === 1 ? 8 : 0, w, h);
        sprites.push(await image(`assets/images/map-sprites/${sid}-${f}.png`, out));
      }
      const terrain = offset => {
        const at = r.u32(a + offset) - BASE;
        return at >= 0 && at + 51 <= bytes.length ? Array.from(bytes.subarray(at, at + 51)) : [];
      };
      const costs = terrain(52).map(n => n > 127 ? n - 256 : n);
      classes[a + BASE] = {id, name: r.text(r.u16(a)), con: r.s8(a + 17), move: r.s8(a + 18),
        attributes: r.u32(a + 36), ranks: Array.from(bytes.subarray(a + 40, a + 48)), mapSprites: sprites,
        portrait: face ? await image('assets/images/portraits/' + face + '.png', portrait(face)) : '',
        movementCosts: [costs, costs, costs], avoid: terrain(56), defense: terrain(60), resistance: terrain(64),
        caps: [...bytes.subarray(a + 19, a + 25), 30]};
    }
    const icon = (id, bank = 0) => api.tiles(r, bytes.subarray(profile.icons + id * 128, profile.icons + (id + 1) * 128), 16, 16, profile.iconPalettes + bank * 32);
    await progress('Reading FE6 items');
    const drainItems = {};
    for (let id = 1; id < profile.itemCount; id++) {
      const a = profile.items + id * 32;
      if (r.u8(a + 6) !== id) continue;
      const iid = r.u8(a + 29);
      items[id] = {id, name: r.text(r.u16(a)), description: r.text(r.u16(a + 2)),
        icon: await image('assets/images/items/' + iid + '.png', icon(iid)), attributes: r.u16(a + 8),
        type: r.u8(a + 7), maxUses: r.u8(a + 20), might: r.u8(a + 21), hit: r.u8(a + 22),
        weight: r.u8(a + 23), crit: r.u8(a + 24), range: r.u8(a + 25), rank: r.u8(a + 28)};
      if (r.u8(a + 31) === 2) drainItems[id] = true;
    }
    for (const [n, name] of ['sword','lance','axe','bow','staff','anima','light','dark'].entries())
      await image('assets/images/weapon-ranks/' + name + '.png', icon(0x70 + n, 1));
    for (const [n, name] of affinities.slice(1).entries())
      await image('assets/images/affinities/' + name.toLowerCase() + '.png', icon(0x7a + n, 1));
    const sheet = api.tiles(r, r.lz(profile.minimap), 256, 32, profile.minimapPalette, true);
    for (let id = 0; id < 128; id++) {
      const out = {width: 4, height: 4, rgba: new Uint8Array(64)};
      api.blit(out, sheet, 0, 0, id % 32 * 8, Math.floor(id / 32) * 8, 4, 4);
      await image('assets/images/minimap/' + id + '.png', out);
    }
    for (let id = 1; id < 256; id++) {
      const u = r.u32(profile.slots + id * 4);
      if (u >= 0x02000000 && u + 72 <= 0x02040000) slots[id] = u;
    }
    const table = (records, fn) => Object.fromEntries(Object.entries(records).map(([key, val]) => [key, fn(val)]));
    const chapters = prepareChapters(r, profile.chapters, profile.chapterTitles);
    const mapWeapons = table(Object.fromEntries(Object.entries(items).filter(([, x]) => x.attributes & 1)), x => {
      const lock = [[0x400,0x40000], [0x800,0x10000], [0x1000,0x20000], [0x2000,0x80000]];
      return {name:x.name, icon:x.icon, maxUses:x.maxUses, a:x.attributes, t:x.type,
        r:lock.reduce((value, [item, unit]) => value | ((x.attributes & item) ? unit : 0), 0), rank:x.rank, range:x.range};
    });
    const D = {chars, classes, items, slots, dimensions, mapWeapons, drainItems,
      validSlots: Object.fromEntries(Object.entries(slots).map(([id, u]) => [u, +id])),
      defaults: structuredClone(p.data), mapMeta:{chars, classes,
        chapters:Object.fromEntries(chapters.map((c,id)=>[id,c])), ballistaCosts:[],
        terrains:["---","Plains","Road","Village","Closed village","House","Armory","Vendor","Arena","Storage","Fort","Gate","Forest","Thicket","Sand","Desert","River","Mountain","Peak","Bridge","Drawbridge","Sea","Lake","Floor","Floor","Fence","Wall","Breakable wall","Rubble","Pillar","Door","Throne","Open chest","Chest","Roof","Gate","Church","Ruins","Cliff","Ballista","Long ballista","Killer ballista","Ship","Shipwreck","Terrain 44","Stairs","Terrain 46","Glacier","Arena","Valley","Fence"], defaultClass:String(BASE + profile.classes)},
      forecastChars:chars, forecastClasses:classes, forecastItems:items,
      affinityBonuses:Array.from({length:7}, (_, id) => Array.from(bytes.subarray(profile.affinityBonuses + id * 8, profile.affinityBonuses + id * 8 + 7))),
      uiStrings:structuredClone(root.COMPANION_THEME.locales.en.runtime)};
    if (!options.renderRadar) throw Error('Radar renderer required');
    for (const c of Object.values(chars)) {
      const path = 'assets/images/growth/' + c.growth.join('-') + '-0.png';
      c.radar = 'asset:' + path.slice(7);
      if (!p.files[path]) p.files[path] = api.b64(await options.renderRadar(c.growth, 0, 100, p.files));
    }
    await progress('Packing ' + profile.name + ' local companion');
    root.CompanionRuntime.install(p, profile.id, api.luaValue(D));
    p.preparedLocally = true;
    return {project:p, data:D, report:{gameCode:profile.code, crc32:profile.crc32.toString(16).toUpperCase().padStart(8, '0'), localOnly:true,
      characters:Object.keys(chars).length, classes:Object.keys(classes).length, images, files:Object.keys(p.files).length}};
  }
  root.FE6RomPrep = {prepare, prepareChapters, radarSvg:(g,b) => root.CompanionRadar.svg(g,b,'en')};
})(globalThis);
