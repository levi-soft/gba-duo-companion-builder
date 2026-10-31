import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';
const encode=value=>Buffer.from(value).toString('base64');

test('official characterization exposes no private Plus APIs', async () => {
  const project={manifest:{script:'main.lua'},files:{'main.lua':encode(`
    assert(input==nil, 'Official GBA Duo does not register input')
    assert(mem.busContext==nil, 'Official GBA Duo does not expose protected bus context')
    assert(gfx.radar==nil, 'Official GBA Duo does not render runtime radars')
    function update() return {ready=true} end
  `)}};
  const result=await executeProject(project,{host:'official'});
  assert.equal(result.values[0].ready,true);
});

test('official characterization rejects injected private bus state before executing', async () => {
  const project={manifest:{script:'main.lua'},files:{'main.lua':encode('function update()return{}end')}};
  await assert.rejects(executeProject(project,{host:'official',busContext:{version:1,platform:'gba',biosPrefetch:0}}),
    /official.*bus context/i);
});
