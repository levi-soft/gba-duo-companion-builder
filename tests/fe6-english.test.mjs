import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';

async function withLua(files, code) {
  const engine = await luaFactory().createEngine();
  try {
    for (const [name, file] of Object.entries(files)) engine.global.set(name, fs.readFileSync(file, 'utf8'));
    return await engine.doString(code);
  } finally { engine.global.close(); }
}

test('FE6 T-EN 1.0.0 inherits the English UI and rejects other patches before preparation', async () => {
  const root = {structuredClone,TextDecoder,TextEncoder,Uint8Array}; root.globalThis = root;
  for (const file of ['runtime-modules.js','theme.js','profiles/fe7-vietnamese/template.js','profiles/fe8-vietnamese/prepare.js',
    'fe6-rom.js','profiles/fe6-english/encoding.js','profiles/fe6-english/chapter-titles.js','profiles/fe6-english/template.js','profiles/fe6-english/prepare.js'])
    vm.runInNewContext(fs.readFileSync('site/' + file,'utf8'),root);
  const project = root.FE6_ENGLISH_TEMPLATE;
  assert.equal(project.manifest.version,'1.0.0');
  assert.equal(project.manifest.match.crc32[0],'197DE10B');
  assert.equal(project.manifest.match.gameCode[0],'AFEJ');
  assert.equal(project.uiLanguage,'en');
  assert.equal(JSON.stringify(project.layout),JSON.stringify(root.localizeCompanionUi(root.FE7_TEMPLATE.layout,'en')));
  assert(JSON.stringify(project.layout).includes('Battle analysis'));
  await assert.rejects(root.FE6EnglishPrep.prepare(new Uint8Array(256),project),/AFEJ.*197DE10B/);
  assert.equal(root.FE6_ENGLISH_GLYPHS['8180'],' ');
});

test('FE6 adapter keeps native unit fields and adjacent 124-byte battle records separate', async () => {
  const result = await withLua({adapterSource:'runtime/fe6-english/game.memory.lua',
    profileSource:'runtime/fe6-english/game.profile.lua'}, `
    local p=assert(load(profileSource))()
    pack={require=function() return p end}
    mem={u8=function(a)return a end,s8=function(a)return a end,
      u16=function(a)return a+0.25 end,s16=function(a)return a end,
      u32=function(a)return a+0.5 end,s32=function(a)return a end}
    local unit=0x0202AB78
    local m=assert(load(adapterSource))()({slots={[1]=unit},validSlots={[unit]=1}})
    assert(m.u32(unit+12)==unit+12.25) -- state is u16, excludes x/y
    assert(m.u8(unit+16)==unit+14)
    assert(m.u16(unit+30)==unit+28.25)
    assert(m.u8(unit+40)==unit+38)
    assert(m.u8(unit+66)==unit+66) -- native AI offsets are unchanged
    for _,side in ipairs({p.battleActor,p.battleTarget}) do
      assert(m.u32(side+0x4C)==side+0x4C+0.25)
      assert(m.u8(side+0x52)==side+0x50)
      assert(m.u8(side+0x72)==side+0x6E)
      assert(m.u8(side+0x73)==side+0x6F)
    end
    assert(m.u32(p.battleTarget)==p.battleTarget+0.5)
    return true
  `);
  assert.equal(result,true);
});

test('FE6 supports include partners 8-10, use native thresholds and clear stale cards', async () => {
  assert.equal(await withLua({source:'runtime/fe6-english/game.support.lua'}, `
    local points={0,0,0,0,0,0,0,61,121,201}
    mem={u8=function(a)return points[a-0x1000-0x2F] or 0 end}
    local D={chars={[1]={id=1,supports={2,3,4,5,6,7,8,9,10,11}}}}
    for i=2,11 do D.chars[i]={id=i,name='Partner '..i,portrait=''} end
    local apply=assert(load(source))()(D)
    local v={unitPresent=true,characterPointer=1,unitBase=0x1000}
    apply(v)
    assert(v.support1Name=='Partner 9' and v.support1Rank=='C')
    assert(v.support2Name=='Partner 10' and v.support2Rank=='B')
    assert(v.support3Name=='Partner 11' and v.support3Rank=='A')
    points[8],points[9],points[10]=60,120,200
    apply(v)
    assert(v.support1Name=='Partner 10' and v.support1Rank=='C')
    assert(v.support2Name=='Partner 11' and v.support2Rank=='B')
    assert(v.support3Name=='' and v.support3Rank=='---')
    v.unitPresent=false;apply(v);assert(v.support1Name=='')
    return true
  `),true);
});

test('FE6 inventory reads native item slots, rank 51 and the +30 critical class bonus', async () => {
  assert.equal(await withLua({source:'runtime/fe6-english/game.items.lua',rulesSource:'runtime/fe6-english/game.rules.lua',
    profileSource:'runtime/fe6-english/game.profile.lua'}, `
    local u=0x0202AB78
    mem={u8=function(a) return a==u+38 and 51 or 0 end,
      u16=function(a) return a==u+28 and 0x1401 or 0 end,
      u32=function(a) return a==u and 1 or a==u+4 and 2 or 0 end}
    local rules=assert(load(rulesSource))()
    local profile=assert(load(profileSource))()
    pack={require=function(name) return name=='game.rules' and rules or profile end}
    local item={id=1,name='Test',icon='',description='Description',attributes=1,type=0,
      maxUses=20,might=5,hit=80,crit=0,weight=5,range=0x12,rank=51}
    local D={chars={[1]={attributes=0}},classes={[2]={attributes=64,avoid={}}},items={[1]=item}}
    local v={str=5,skill=10,spd=8,con=6,luck=4,unitState=0,unitX=0,unitY=0}
    assert(load(source))()(D)(v,u)
    assert(v.item1Type=='Sword' and v.item1Rank=='D' and v.item1Range=='1–2')
    assert(v.equipmentCrit==35 and v.inventoryCount==1 and v.firstItemPage=='slot1')
    assert(v.unitDropsItem==nil) -- vanilla FE6 has no drop patch
    profile.supportsDrops=true;v.unitState=0x1000
    assert(load(source))()(D)(v,u)
    assert(v.unitDropsItem and v.item1Droppable and not v.item2Droppable)
    v.unitState=0;assert(load(source))()(D)(v,u)
    assert(not v.unitDropsItem and not v.item1Droppable)
    return true
  `),true);
});

test('FE6 EXP and level prediction use native entries, preserve disabled counters and restore only private HP/EXP', async () => {
  assert.equal(await withLua({profileSource:'runtime/fe6-english/game.profile.lua',
    expSource:'runtime/fe6-english/features.exp.lua',levelSource:'runtime/fe6-english/features.level_prediction.lua'}, `
    local p=assert(load(profileSource))()
    local seen,hooks={},nil
    local function ram(a)
      if a==p.battleActor+0x50 or a==p.battleTarget+0x50 then return 1 end
      if a==p.battleActor+0x48 or a==p.battleActor+0x4A then return 7 end
      if a==p.battleTarget+0x4A then return 9 end
      return 0
    end
    pack={require=function(name)
      if name=='game.profile' then return p end
      assert(name=='features.thumb')
      return {start=function(entry,args,shadow,options)
        seen[#seen+1]=entry
        assert(options.ramByte==ram and options.strictStack)
        if entry==p.battleUnwind then
          assert(shadow[p.battleActor+0x48]==7)
          assert(shadow[p.battleTarget+0x48]==0) -- forecast-disabled counter remains disabled
        end
        if options.beforeEntry then hooks=options.beforeEntry end
        return function() return true,0,shadow,1 end
      end}
    end}
    assert(load(expSource))()(false,ram)()
    local job=assert(load(levelSource))()(ram);job();job()
    assert(#seen==3 and seen[1]==0x0802503C and seen[2]==0x08024AB4 and seen[3]==0x0802503C)
    assert(hooks[0x08025104] and not hooks[0x0802BA28])
    local writes={}
    local function read() return 0 end
    local function write(a,value,size) writes[a]=value;assert(size==1) end
    hooks[p.applyExp]({},read,write)
    hooks[p.levelUp]({[0]=p.battleActor},read,write)
    assert(writes[p.battleActor+17]==1 and writes[p.battleActor+9]==100)
    return true
  `),true);
});

test('FE6 selection rejects hidden/rescued/stale units and partial rows; idle activeUnit never owns selection', async () => {
  assert.equal(await withLua({source:'runtime/fe6-english/game.units.lua',profileSource:'runtime/fe6-english/game.profile.lua',
    selectionSource:'runtime/shared/game.companion-selection.lua'}, `
    local p=assert(load(profileSource))()
    local bytes={}
    local function put(a,value,size) for n=0,size-1 do bytes[a+n]=(value>>(n*8))&255 end end
    local function read(a,size) local v=0;for n=0,size-1 do v=v|((bytes[a+n] or 0)<<(n*8)) end;return v end
    mem={u8=function(a)return read(a,1)end,u16=function(a)return read(a,2)end,u32=function(a)return read(a,4)end}
    local first,second=0x0202AB78,0x0202ABC0
    local D={defaults={},slots={[1]=first,[2]=second},validSlots={[first]=1,[second]=2},
      chars={[0x08001000]={}},classes={[0x08002000]={}}}
    for id,u in ipairs({first,second}) do
      put(u,0x08001000,4);put(u+4,0x08002000,4);put(u+11,id,1);put(u+17,20,1)
    end
    put(p.mapWidth,2,2);put(p.mapHeight,2,2)
    put(p.unitRows,0x02031000,4);put(p.terrainRows,0x02031200,4)
    put(0x02031000,0x02031100,4);put(0x02031100,1,1)
    put(p.activeUnit,second,4)
    put(p.processPool,p.playerProcess,4);put(p.processPool+4,p.playerPcStart,4)
    pack={require=function(name)
      if name=='game.profile' then return p end
      if name=='game.companion-selection' then return assert(load(selectionSource))() end
      if name=='presentation.unit' then return function(data,valid) return function(v,u)
        v.unitPresent=true;v.characterPointer=read(u,4);v.deployment=read(u+11,1)
      end end end
      return function() return function(v)return v end end
    end}
    local update=assert(load(source))()(D,{apply=function()end},{})
    local v=update();assert(v.unitPresent and v.deployment==1 and not v.unitLocked)
    put(first+12,0x20,2);assert(not update().unitPresent)
    put(first+12,4,2);assert(not update().unitPresent)
    put(first+12,0,2);put(first+11,2,1);assert(not update().unitPresent)
    put(first+11,1,1);put(0x02031000,0x0203FFFF,4);assert(not update().unitPresent)
    put(0x02031000,0x02031100,4)
    put(p.processPool+4,p.playerPcStart+8,4)
    v=update();assert(v.unitPresent and v.deployment==2 and v.unitLocked)
    put(second+17,0,1);v=update();assert(v.unitPresent and v.deployment==1 and not v.unitLocked)
    D.slots[129]=first;D.validSlots[first]=129;put(first+11,129,1);put(first+12,0x200,2)
    assert(not update().unitPresent)
    return true
  `),true);
});
