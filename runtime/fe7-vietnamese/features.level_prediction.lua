-- FE7 battle RN consumption and conditional level-up simulation.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  local growthCharacters, growthClasses, growthItems, growthSlots =
    D.growthCharacters, D.growthClasses, D.growthItems, D.slots
  local growthBattleClassIds = {}
  for _, k in pairs(growthClasses) do
    growthBattleClassIds[k.id] = k
  end
  local growthRng = pack.require("features.rng").new
  local growthLevelGains = pack.require("features.growth").levelGains
  local function levelCap(unit)
    local class = growthClasses[unit.kp]
    return class and class.levelCap or 20
  end
  local function growthSimulateBattle(a, b, seed, normalMode, noExp, hypotheticalId)
    -- The caller supplies untouched battle records (before simulation effects).
    local rng = growthRng(seed)
    local rounds = {}
    local silencer = false
    local function effect(s)
      local it = growthItems[s.weapon % 256]
      return it and it.effect or 0
    end
    local function hit(s, t, first)
      local chance, crit = s.hit, s.crit
      if first and s.triangle then
        chance = 100
        crit = 100
      end
      local landed = rng.hit(chance)
      local critical, lethal, backfire = false, false, false
      local damage = 0
      if landed then
        damage = s.attack - t.defense
        critical = rng.roll(crit)
        if critical then
          lethal = rng.roll(s.silencer)
          damage = lethal and 127 or damage * 3
        end
        damage = math.min(127, math.max(0, damage))
        if damage > 0 then
          s.dealt = true
        end
        local e = effect(s)
        if e == 4 and rng.roll((31 - s.luck) & 65535) then
          s.hp = math.max(0, s.hp - damage)
          backfire = true
        else
          damage = math.min(damage, t.hp)
          t.hp = math.max(0, t.hp - damage)
        end
        if e == 2 then
          s.hp = math.min(s.maxHp, s.hp + damage)
        end
        if lethal then
          silencer = true
        end
      end
      rounds[#rounds + 1] =
        { id = s.id, hit = landed, crit = critical, silencer = lethal, backfire = backfire, damage = damage }
      if landed or (s.weaponAttributes & 0x82) ~= 0 then
        local it = growthItems[s.weapon % 256]
        if not it or (it.attributes & 8) == 0 then
          s.weapon = s.weapon - 256
          if s.weapon < 256 then
            s.weapon = 0
          end
        end
      end
      return s.hp <= 0 or t.hp <= 0
    end
    local first = true
    local function attack(s, t)
      if s.weapon == 0 then
        return false
      end
      local count = (s.weaponAttributes & 32) ~= 0 and 2 or 1
      for i = 1, count do
        local stop = hit(s, t, first)
        first = false
        if stop then
          return true
        end
      end
      return false
    end
    local finished = attack(a, b)
    if not finished then
      finished = attack(b, a)
    end
    if not finished and b.speed <= 250 and math.abs(a.speed - b.speed) >= 4 then
      local fast, slow = a, b
      if b.speed > a.speed then
        fast, slow = b, a
      end
      if effect(fast) ~= 3 then
        attack(fast, slow)
      end
    end
    local function exp(s, t)
      if
        noExp
        or (a.id & 0xc0) == 0 and (b.id & 0xc0) == 0
        or s.id >= 64
        or s.exp == 255
        or s.level >= levelCap(s)
        or s.hp <= 0
        or (t.attributes & 0x1000000) ~= 0
      then
        return 0
      end
      if not s.dealt then
        return 1
      end
      if s.power <= 0 then
        return 0
      end
      local function level(x)
        return x.level + ((x.attributes & 256) ~= 0 and 20 or 0)
      end
      local function power(x)
        local n = x.level * x.power
        if (x.attributes & 256) ~= 0 then
          local base = growthBattleClassIds[x.baseClass]
          n = n + 20 * (base and base.power or 0)
        end
        return n
      end
      local hitExp = math.max(0, 31 - level(s) + level(t)) // s.power
      local bonus = 0
      if t.hp == 0 then
        local ps, pt = power(s), power(t)
        bonus = normalMode and (pt > ps and 20 + pt - ps or 20 + pt - ps // 2) or 20 + pt - ps
        bonus = math.max(
          0,
          bonus + ((t.attributes & 8) ~= 0 and 20 or 0) + ((t.attributes & 0x8000) ~= 0 and 40 or 0)
        )
        if (s.attributes & 0x02000000) ~= 0 and silencer then
          bonus = bonus * 2
        end
      end
      return math.max(0, math.min(100, hitExp + bonus))
    end
    a.expGain = exp(a, b)
    b.expGain = exp(b, a)
    for _, s in ipairs({ a, b }) do
      -- Preserve the real combat/RN consumption. Only the selected unit's
      -- level-up eligibility may be hypothetical, as in the FE6/FE8 adapters.
      -- Default callers still receive the exact, actual simulated outcome.
      local hypothetical = not noExp and s.id == hypotheticalId
      s.gains = { 0, 0, 0, 0, 0, 0, 0 }
      s.levelUp = s.exp ~= 255
        and s.level < levelCap(s)
        and (hypothetical or s.exp + s.expGain >= 100 and s.expGain > 0)
      if s.levelUp then
        s.gains = growthLevelGains(growthCharacters[s.cp], growthClasses[s.kp], s, rng)
        if s.level == levelCap(s) - 1 then
          s.expGain = 100 - s.exp
        end
      end
    end
    return { actor = a, target = b, rounds = rounds, seed = seed, finalSeed = rng.state, rolls = rng.count }
  end
  local function growthReadBattle(hypotheticalId)
    local function read(u)
      local cp, kp = mem.u32(u), mem.u32(u + 4)
      local c, k = growthCharacters[cp], growthClasses[kp]
      if not c or not k then
        return nil
      end
      local id = mem.u8(u + 11)
      local w = mem.u16(u + 0x4a)
      local base = growthSlots[id] or u
      if mem.u8(u + 0x52) == 0 then
        w = 0
      end
      return {
        cp = cp,
        kp = kp,
        id = id,
        name = c.name,
        level = mem.u8(u + 0x70),
        exp = mem.u8(u + 0x71),
        state = mem.u32(u + 12),
        stats = {
          mem.u8(base + 18),
          mem.u8(base + 20),
          mem.u8(base + 21),
          mem.u8(base + 22),
          mem.u8(base + 23),
          mem.u8(base + 24),
          mem.u8(base + 25),
        },

        hp = mem.u8(u + 0x72),
        maxHp = mem.u8(u + 18),
        luck = mem.u8(u + 25),
        weapon = w,
        weaponAttributes = mem.u32(u + 0x4c),
        attributes = c.attributes | k.attributes,
        power = k.power,
        baseClass = k.baseClass,
        x = mem.s8(u + 16),
        y = mem.s8(u + 17),
        status = mem.u8(u + 48) & 15,

        attack = mem.s16(u + 0x5a),
        defense = mem.s16(u + 0x5c),
        speed = mem.s16(u + 0x5e),
        hit = mem.s16(u + 0x64),
        crit = mem.s16(u + 0x6a),
        silencer = mem.s16(u + 0x6c),
      }
    end
    local a, b = read(0x0203A3F0), read(0x0203A470)
    if not a or not b then
      return nil, "Dữ liệu giao chiến chưa sẵn sàng"
    end
    if mem.u32(0x0203A874) ~= 0 then
      return nil, "Trận theo kịch bản: chưa hỗ trợ dự đoán"
    end
    if (mem.u16(0x0203A3D8) & 32) ~= 0 then
      return nil, "Đấu trường: chưa hỗ trợ dự đoán"
    end
    -- Triangle attack is deterministic, but eligibility depends on adjacent allies.
    if
      (a.attributes & 0x600000) ~= 0
      and math.abs(a.x - b.x) + math.abs(a.y - b.y) == 1
      and a.status ~= 4
    then
      local rows = mem.u32(0x0202E3DC)
      local w, h = mem.u16(0x0202E3D8), mem.u16(0x0202E3DA)
      local count = 0
      if rows >= 0x02000000 and rows < 0x02040000 then
        for _, d in ipairs({ { 0, 1 }, { 1, 0 }, { 0, -1 }, { -1, 0 } }) do
          local x, y = b.x + d[1], b.y + d[2]
          if x >= 0 and x < w and y >= 0 and y < h then
            local id = mem.u8(mem.u32(rows + y * 4) + x)
            local u = growthSlots[id]
            if u and (id & 0xc0) == (a.id & 0xc0) and (mem.u8(u + 48) & 15) ~= 2 then
              local c, k = growthCharacters[mem.u32(u)], growthClasses[mem.u32(u + 4)]
              if c and k and ((c.attributes | k.attributes) & a.attributes & 0x600000) ~= 0 then
                count = count + 1
              end
            end
          end
        end
      end
      a.triangle = count >= 2
    end
    local seed = { mem.u16(0x03000000), mem.u16(0x03000002), mem.u16(0x03000004) }
    local normal = mem.u8(0x0202BC13) ~= 1 and (mem.u8(0x0202BC0C) & 64) == 0
    local result = growthSimulateBattle(a, b, seed, normal, (mem.u8(0x0202BC0C) & 128) ~= 0, hypotheticalId)
    result.chapter = mem.u8(0x0202BC06)
    return result
  end
  return { read = growthReadBattle, simulate = growthSimulateBattle }
end
