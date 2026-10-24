(function (root) {
  'use strict';

  // This file only packages authored Lua and locally prepared ROM data.
  // It never evaluates Lua, reads a ROM, or changes the game's memory.
  function encode(source) {
    const bytes = new TextEncoder().encode(source);
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    }
    return btoa(binary);
  }

  // Keep generated tables readable without changing strings or Lua key types.
  // Only the first two table levels are expanded; individual records stay compact.
  function formatData(literal) {
    let result = '', depth = 0, quote = null, escaped = false;
    const line = () => { result += '\n' + '  '.repeat(depth); };
    for (const character of literal) {
      if (quote) {
        result += character;
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
        result += character;
      } else if (character === '{') {
        result += character;
        depth++;
        if (depth <= 2) line();
      } else if (character === '}') {
        depth--;
        if (depth < 2) line();
        result += character;
      } else {
        result += character;
        if (character === ',' && depth <= 2) line();
      }
    }
    return result;
  }

  function install(project, profileId, dataLiteral) {
    const modules = root.COMPANION_RUNTIME_MODULES?.[profileId];
    if (!modules || typeof modules['main.lua'] !== 'string') {
      throw Error('Missing authored Lua modules for ' + profileId);
    }
    if (typeof dataLiteral !== 'string' || !dataLiteral.startsWith('{') || !dataLiteral.endsWith('}')) {
      throw Error('Prepared ROM data must be a serialized Lua table.');
    }
    for (const [name, source] of Object.entries(modules)) {
      if (!/^[a-z][a-z0-9_.-]*\.lua$/.test(name) || name.includes('..') || name === 'data.rom_tables.lua' || typeof source !== 'string') {
        throw Error('Invalid authored Lua module: ' + name);
      }
    }

    const files = project.files;
    const previousScript = project.manifest.script;
    if (previousScript && previousScript !== 'main.lua') delete files[previousScript];
    for (const [name, source] of Object.entries(modules)) files[name] = encode(source);
    files['data.rom_tables.lua'] = encode(
      '-- Generated locally from your ROM. Do not edit by hand.\n' +
      '-- Game logic lives in the authored game/features/presentation modules.\n' +
      'return ' + formatData(dataLiteral) + '\n'
    );
    project.manifest.script = 'main.lua';
    return project;
  }

  root.CompanionRuntime = { install, formatData };
})(globalThis);
