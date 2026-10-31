import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

function catalog() {
  const context = {structuredClone};
  context.TextEncoder=TextEncoder;context.Buffer=Buffer;
  for (const file of ['site/profiles.js', 'site/runtime-modules.js', 'site/runtime-packager.js', 'site/theme.js'])
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, {filename:file});
  for (const profile of context.COMPANION_PROFILES)
    vm.runInNewContext(fs.readFileSync(`site/profiles/${profile.id}/template.js`, 'utf8'), context);
  return context;
}
function nodes(value, output=[]) {
  if (!value || typeof value !== 'object') return output;
  if (value.type) output.push(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach(item=>nodes(item, output));
    else nodes(child, output);
  }
  return output;
}

test('all 30 companion Growth tables display the shared base and signed bonus text', () => {
  const c=catalog();
  assert.equal(c.COMPANION_PROFILES.length, 30);
  for (const profile of c.COMPANION_PROFILES) {
    const template=c[profile.template], all=nodes(template.layout);
    const rateCells=all.filter(node=>/^\{growth(?:Hp|Power|Str|Mag|Skill|Spd|Luck|Def|Res)RateText\}$/.test(node.text||''));
    assert(rateCells.length>=7, `${profile.id}: base growth rows must show the signed bonus`);
    assert(!all.some(node=>/^\{growth(?:Hp|Power|Str|Mag|Skill|Spd|Luck|Def|Res)\}%$/.test(node.text||'')),
      `${profile.id}: a raw percent hides the dynamic bonus`);
    for (const cell of rateCells)
      assert(cell.class.split(' ').includes('growth-stat-rate'), `${profile.id}: bonus must fit its column`);
    assert(all.some(node=>node.src==='$growthRadar'), `${profile.id}: preserve the PNG radar binding`);
  }
});

test('all 30 generated runtimes include exactly one common Growth presenter and no private radar API', () => {
  const c=catalog();
  for (const profile of c.COMPANION_PROFILES) {
    const modules=c.COMPANION_RUNTIME_MODULES[profile.id];
    assert(modules['presentation.growth-rates.lua'], `${profile.id}: missing common formatter`);
    assert.equal((modules['main.lua'].match(/pack\.require\("presentation\.growth-rates"\)/g)||[]).length, 1,
      `${profile.id}: format the final values once`);
    assert(!Object.values(modules).some(source=>/gfx\.radar/.test(source)), `${profile.id}: official GBA Duo has no radar API`);
    assert(!c.COMPANION_HOST_REQUIREMENTS[profile.id]?.includes('growth-radar-v1'), `${profile.id}: private renderer dependency`);
  }
});

test('all 30 freshly packaged companions use an official manifest and retain resume controls after a snapshot error',()=>{
  const c=catalog();
  for(const profile of c.COMPANION_PROFILES){
    const project=structuredClone(c[profile.template]);
    project.manifest.match={gameCode:[profile.code],crc32:[profile.crc32]};
    c.CompanionRuntime.install(project,profile.id,'{}');
    assert(project.manifest.formatVersion<=3,profile.id+': official manifest format');
    assert.equal(project.manifest.requires,undefined,profile.id+': no private Plus feature dependency');
    const persistent=project.layout.children.find(node=>node.id==='companion-work-resume');
    const error=project.layout.children.find(node=>node.id==='companion-error-resume');
    assert.equal(persistent?.visibleIf,'$ui.companionWorkNeedsContinue',profile.id+': only stalled work requires a manual action');
    assert.equal(persistent?.onClick?.set?.companionWorkPulse,'{ui.companionWorkNext}');
    assert.equal(error?.visibleIf,'$_scriptError',profile.id+': first-snapshot error recovery');
    assert.equal(error?.onClick?.call,'resumeCompanion');
    const modalIndex=Math.max(...project.layout.children.map((node,index)=>
      ['$ui.growthPopup','$ui.predictionPopup'].includes(node.visibleIf)?index:-1));
    assert(project.layout.children.indexOf(persistent)>modalIndex,profile.id+': pending resume stays above modal scrims');
    assert(project.layout.children.indexOf(error)>modalIndex,profile.id+': error resume stays above modal scrims');
    assert(c.COMPANION_RUNTIME_MODULES[profile.id]['main.lua'].includes('function actions.resumeCompanion()'));
  }
});
