(function (root) {
  'use strict';

  const MAX_ROM_BYTES = 32 * 1024 * 1024;
  const MAX_INPUT_BYTES = 64 * 1024 * 1024;
  const clone = value => root.structuredClone
    ? root.structuredClone(value)
    : JSON.parse(JSON.stringify(value));

  function cancelled(signal) {
    if (!signal?.aborted) return;
    const error = new Error('Cancelled.');
    error.name = 'AbortError';
    throw error;
  }

  function profileFor(rom, expected = {}) {
    if (!(rom instanceof Uint8Array) || rom.length < 0xc0 || rom.length > MAX_ROM_BYTES) {
      throw Error('ROM must be a GBA file between 192 bytes and 32 MiB.');
    }
    const crc = root.FE7PublicPrep.crc32(rom).toString(16).toUpperCase().padStart(8, '0');
    const code = String.fromCharCode(...rom.subarray(0xac, 0xb0));
    const profile = root.COMPANION_PROFILES.find(candidate => candidate.crc32 === crc && candidate.code === code);
    if (!profile) throw Error('Unsupported ROM / CRC32 ' + crc + '. Use an exact supported ROM revision.');
    if (expected.profileId !== undefined && expected.profileId !== profile.id) {
      throw Error('ROM does not match the selected profile.');
    }
    if (expected.crc32 !== undefined && String(expected.crc32).toUpperCase() !== crc) {
      throw Error('ROM CRC32 differs from the catalog.');
    }
    if (expected.gameCode !== undefined && expected.gameCode !== code) {
      throw Error('ROM game code differs from the catalog.');
    }
    return profile;
  }

  async function readRom(file) {
    if (!file || file.size > MAX_INPUT_BYTES) throw Error('File exceeds 64 MiB.');
    const buffer = await file.arrayBuffer();
    if (!/\.zip$/i.test(file.name)) {
      if (buffer.byteLength > MAX_ROM_BYTES) throw Error('ROM exceeds 32 MiB.');
      return new Uint8Array(buffer);
    }

    const zip = await root.JSZip.loadAsync(buffer);
    const entries = Object.values(zip.files).filter(entry => !entry.dir && /\.gba$/i.test(entry.name));
    if (entries.length !== 1) throw Error('ZIP must contain exactly one .gba ROM.');
    if (entries[0]._data?.uncompressedSize > MAX_ROM_BYTES) throw Error('ROM exceeds 32 MiB.');

    // Bound the actual inflated stream as well as the untrusted ZIP size header.
    return new Promise((resolve, reject) => {
      let total = 0;
      let settled = false;
      let stream;
      const chunks = [];
      const fail = error => {
        if (settled) return;
        settled = true;
        stream?.pause();
        chunks.length = 0;
        reject(error);
      };
      try {
        stream = entries[0].internalStream('uint8array');
      } catch (error) {
        fail(error);
        return;
      }
      stream.on('data', chunk => {
        if (settled) return;
        total += chunk.byteLength;
        if (total > MAX_ROM_BYTES) {
          fail(Error('ROM exceeds 32 MiB.'));
          return;
        }
        chunks.push(chunk);
      });
      stream.on('error', fail);
      stream.on('end', () => {
        if (settled) return;
        settled = true;
        const rom = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          rom.set(chunk, offset);
          offset += chunk.byteLength;
        }
        chunks.length = 0;
        resolve(rom);
      });
      stream.resume();
    });
  }

  let fontPromise;
  function fonts() {
    return fontPromise ??= Promise.all([
      ['Inter-Regular.otf', '400'],
      ['Inter-Bold.otf', '700'],
    ].map(async ([name, weight]) => {
      const bytes = root.FE7PublicPrep.from64(root.COMPANION_UI_FILES['assets/fonts/' + name]);
      const face = new FontFace('KitInter', bytes, { weight });
      await face.load();
      document.fonts.add(face);
    }));
  }

  async function renderRadar(growth, bonus, language = 'vi') {
    await fonts();
    const canvas = document.createElement('canvas');
    root.CompanionRadar.draw(canvas, growth, bonus, language);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => result
        ? resolve(result)
        : reject(Error('Could not render Growth diagram.')), 'image/png');
    });
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function build(rom, options = {}) {
    cancelled(options.signal);
    const profile = profileFor(rom, options);
    const api = root[profile.api];
    const template = clone(root[profile.template]);
    // Producers may start from a generic public template. Navigation packaging
    // must receive the exact identity already verified by profileFor().
    template.manifest.match = { gameCode: [profile.code], crc32: [profile.crc32] };
    template.files = clone(root.COMPANION_UI_FILES);
    const result = await api.prepare(rom, template, root[profile.runtime], {
      signal: options.signal,
      renderRadar: options.renderRadar || ((growth, bonus) => renderRadar(growth, bonus, profile.language || 'vi')),
      onProgress: options.onProgress,
      yieldControl: options.yieldControl || (() => new Promise(resolve => setTimeout(resolve, 0))),
    });
    cancelled(options.signal);

    const project = result.project;
    const compiled = root.CompanionCompiler.compileDesign(project);
    const zip = new root.JSZip();
    for (const [name, data] of Object.entries(compiled.files)) zip.file(name, data, { base64: true });
    const generatedLayout = JSON.stringify(compiled.layout, null, 2);
    zip.file('layout.json', generatedLayout);
    zip.file('style.css', compiled.css);
    if (compiled.hasEditorMetadata) {
      zip.file('studio-design.json', JSON.stringify({
        version: 1,
        layout: project.layout,
        css: project.css,
        generatedLayout,
        generatedCss: compiled.css,
      }));
    }
    zip.file('manifest.json', JSON.stringify({
      ...project.manifest,
      formatVersion: 2,
      layout: 'layout.json',
      styles: ['style.css'],
    }, null, 2));
    zip.file('preview-data.json', JSON.stringify(project.data));
    const zipBytes = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    cancelled(options.signal);
    return { profile, project, report: result.report, zipBytes };
  }

  root.CompanionBuild = { build, readRom, profileFor, MAX_ROM_BYTES, MAX_INPUT_BYTES };
})(globalThis);
