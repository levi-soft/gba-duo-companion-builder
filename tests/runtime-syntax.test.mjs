import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { LuaFactory } from 'wasmoon';

test('every authored Lua module compiles and exported dependency graphs are complete', async () => {
  const lua = await new LuaFactory().createEngine();
  let count = 0;
  try {
    for (const directory of fs.readdirSync('runtime', { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)) {
      for (const name of fs.readdirSync(path.join('runtime', directory)).filter(name => name.endsWith('.lua'))) {
        const file = path.join('runtime', directory, name);
        lua.global.set('moduleSource', fs.readFileSync(file, 'utf8'));
        lua.global.set('moduleName', file);
        // Compile without running a module or leaving results on the Lua stack.
        await lua.doString('local chunk, message = load(moduleSource, moduleName); if not chunk then error(message) end');
        count++;
      }
    }
    assert(count >= 40, 'Exercise the complete authored module set');
  } finally {
    lua.global.close();
  }
  const context = {};
  vm.runInNewContext(fs.readFileSync('site/runtime-modules.js', 'utf8'), context);
  for (const [profile, modules] of Object.entries(context.COMPANION_RUNTIME_MODULES)) {
    assert.equal((modules['main.lua'].match(/function update\(/g) || []).length, 1, profile);
    for (const [file, source] of Object.entries(modules)) {
      if (file !== 'main.lua') assert(!/function update\(/.test(source), profile + '/' + file);
      for (const match of source.matchAll(/pack\.require\(["']([^"']+)["']\)/g)) {
        const dependency = match[1];
        assert(/^[a-zA-Z0-9_.-]+$/.test(dependency) && !dependency.includes('..'));
        if (dependency !== 'data.rom_tables') assert(modules[dependency + '.lua'], profile + ' missing ' + dependency);
      }
    }
  }
});
