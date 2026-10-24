import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function runtime(modules) {
  const context = { TextEncoder, Buffer, COMPANION_RUNTIME_MODULES: { fixture: modules } };
  vm.runInNewContext(fs.readFileSync('site/runtime-packager.js', 'utf8'), context);
  return context.CompanionRuntime;
}

test('module packaging preserves assets and identity while replacing the legacy entry', () => {
  const main = 'local D = pack.require("data.rom_tables")\nfunction update() return D end\n';
  const api = runtime({ 'main.lua': main, 'game.units.lua': 'return {}\n' });
  const project = { manifest: { id: 'fixture', version: '1.0.0', script: 'scripts/old.lua' }, files: { 'scripts/old.lua': 'old', 'assets/icon.png': 'image' } };
  api.install(project, 'fixture', '{["name"]="text with {braces}, commas and \\"quotes\\"",["lookup1"]={["12"]="unit"}}');
  assert.equal(project.manifest.script, 'main.lua');
  assert.equal(project.manifest.id, 'fixture');
  assert.equal(project.manifest.version, '1.0.0');
  assert.equal(project.files['scripts/old.lua'], undefined);
  assert.equal(project.files['assets/icon.png'], 'image');
  assert.equal(Buffer.from(project.files['main.lua'], 'base64').toString(), main);
  const data = Buffer.from(project.files['data.rom_tables.lua'], 'base64').toString();
  assert(data.startsWith('-- Generated locally from your ROM.'));
  assert(data.includes('["12"]="unit"'), 'string keys must remain string keys');
  assert(data.includes('text with {braces}, commas and \\"quotes\\"'));
});

test('module names use the existing flat pack.require contract and reject traversal', () => {
  for (const name of ['game/units.lua', '../bad.lua', 'data.rom_tables.lua']) {
    const api = runtime({ 'main.lua': 'return {}', [name]: 'return {}' });
    const project = { manifest: { script: 'old.lua' }, files: { 'old.lua': 'original' } };
    assert.throws(() => api.install(project, 'fixture', '{}'), /Invalid authored Lua module/);
    assert.equal(project.files['old.lua'], 'original', 'validate before mutating the project');
  }
});
