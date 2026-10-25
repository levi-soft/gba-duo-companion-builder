(function (root) {
  'use strict';

  const CHUNK_BYTES = 49152;
  let started = false;

  async function start() {
    if (started) return;
    started = true;
    const bridge = root.PlusBuilder;
    if (!bridge) {
      document.getElementById('status').textContent =
        'This page runs inside GBA Duo Plus. Use the website to build a ZIP manually.';
      return;
    }

    try {
      const config = JSON.parse(bridge.configuration());
      if (!config || Array.isArray(config)
        || typeof config.profileId !== 'string'
        || typeof config.gameCode !== 'string'
        || !/^[0-9A-F]{8}$/i.test(config.crc32)
        || config.romUrl !== '/__plus/rom.gba') {
        throw Error('Invalid Plus builder configuration.');
      }
      const controller = new AbortController();
      const progress = message => {
        if (bridge.cancelled()) controller.abort();
        if (controller.signal.aborted) throw Error('Cancelled.');
        bridge.progress(String(message));
      };
      progress('Reading local ROM');
      const response = await fetch('/__plus/rom.gba', {
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
      });
      if (!response.ok) throw Error('The local ROM could not be read.');
      const length = Number(response.headers.get('content-length'));
      if (length > root.CompanionBuild.MAX_ROM_BYTES) throw Error('ROM exceeds 32 MiB.');
      const rom = new Uint8Array(await response.arrayBuffer());

      progress('Creating companion');
      const result = await root.CompanionBuild.build(rom, {
        ...config,
        signal: controller.signal,
        onProgress: progress,
        yieldControl: async () => {
          if (bridge.cancelled()) controller.abort();
          if (controller.signal.aborted) throw Error('Cancelled.');
          await new Promise(resolve => setTimeout(resolve, 0));
        },
      });
      if (bridge.cancelled()) throw Error('Cancelled.');
      bridge.beginZip(result.zipBytes.length);
      for (let offset = 0; offset < result.zipBytes.length; offset += CHUNK_BYTES) {
        if (bridge.cancelled()) throw Error('Cancelled.');
        bridge.appendZip(root.FE7PublicPrep.b64(result.zipBytes.subarray(offset, offset + CHUNK_BYTES)));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (bridge.cancelled()) throw Error('Cancelled.');
      bridge.finishZip();
    } catch (error) {
      bridge.fail(error?.message || 'Could not create companion.');
    }
  }

  document.addEventListener('DOMContentLoaded', start, { once: true });
})(globalThis);
