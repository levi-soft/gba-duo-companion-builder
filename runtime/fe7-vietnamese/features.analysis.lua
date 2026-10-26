-- FE7 live Growth fields, RNG indicator and prediction cache orchestration.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  local growthCharacters, growthClasses, growthItems, growthSlots =
    D.growthCharacters, D.growthClasses, D.growthItems, D.slots
  local growthReadBattle = pack.require("features.level_prediction")(D).read
  local growthEstimateExp = pack.require("features.exp")(D)
  local growthTick = 0
  local growthOpponent = nil
  local growthBattleCache = nil
  local growthWasForecast = false
  local growthViewCache = nil
  local growthCheckedSeed = nil
  local growthCheckedChapter = nil
  local function growthRngSignal(v)
    local seed = { mem.u16(0x03000000), mem.u16(0x03000002), mem.u16(0x03000004) }
    local chapter = mem.u8(0x0202BC06)
    if growthCheckedChapter ~= chapter then
      growthCheckedSeed = nil
    end
    if v.forecastActive then
      growthCheckedSeed = seed
      growthCheckedChapter = chapter
    end
    local changed = growthCheckedSeed
        and (seed[1] ~= growthCheckedSeed[1] or seed[2] ~= growthCheckedSeed[2] or seed[3] ~= growthCheckedSeed[3])
      or false
    v.rngStateChanged = changed
    v.rngStateTracking = growthCheckedSeed ~= nil
    v.rngLedFlash = changed
    if (mem.u16(0x0203A3D8) & 1) ~= 0 then
      v.rngStateText = "Đang giao chiến"
      v.rngStateChanged = false
      v.rngLedFlash = false
    elseif v.forecastActive then
      v.rngStateText = "Đã ghi nhận RNG của dự báo này"
    elseif not growthCheckedSeed then
      v.rngStateText = "Mở dự báo giao chiến để ghi nhận RNG"
    elseif changed then
      v.rngStateText = "RNG đã đổi — có thể kiểm tra lại"
    else
      v.rngStateText = "RNG chưa đổi — so với lần xem dự báo gần nhất"
    end
  end
  return function(base)
    local v = base
    growthTick = growthTick + 1
    v.analysisFailed = false
    v.analysisPredictionError = nil
    v.predictionFailureReason = nil
    growthRngSignal(base)
    -- Derive presence here: the inherited runtime did not populate its pulse predicates.
    base.travelerPresent = base.unitPresent
        and (tonumber(base.rescueId) or 0) > 0
        and base.traveler ~= nil
        and base.traveler ~= "---"
        and base.traveler ~= ""
      or false
    base.conditionActive = base.unitPresent and ((tonumber(base.statusByte) or 0) & 15) ~= 0 or false
    base.travelerFlash = base.travelerPresent and growthTick % 6 < 3
    base.conditionFlash = base.conditionActive and growthTick % 6 < 3
    if growthViewCache and growthBattleCache then
      local q = growthViewCache
      local u = growthSlots[q.deployment]
      if
        not u
        or mem.u32(u) ~= q.characterPointer
        or mem.u32(u + 4) ~= q.classPointer
        or mem.u8(u + 8) ~= q.level
        or mem.u8(u + 9) ~= q.exp
        or mem.u8(u + 19) == 0
        or mem.u8(0x0202BC06) ~= growthBattleCache.chapter
      then
        growthViewCache = nil
        growthBattleCache = nil
      end
    end
    if
      growthViewCache
      and growthBattleCache
      and not base.forecastActive
      and (mem.u16(0x0203A3D8) & 1) ~= 0
    then
      local q = growthViewCache
      local u = growthSlots[q.deployment]
      if
        u
        and mem.u32(u) == q.characterPointer
        and mem.u32(u + 4) == q.classPointer
        and mem.u8(u + 8) == q.level
        and mem.u8(u + 9) == q.exp
        and mem.u8(0x0202BC06) == growthBattleCache.chapter
      then
        v = {}
        for key, value in pairs(base) do
          v[key] = value
        end
        for key, value in pairs(q) do
          v[key] = value
        end
      else
        growthViewCache = nil
      end
    end
    v.growthPresent = false
    v.growthMissing = true
    v.rngAvailable = false
    local c = growthCharacters[v.characterPointer]
    local k = growthClasses[v.classPointer]
    if not v.unitPresent or not c or not k then
      growthWasForecast = false
      return v
    end
    v.growthPresent = true
    v.growthMissing = false
    v.growthUnitName = v.unitName
    v.growthClassName = v.className
    v.growthPortrait = v.portrait
    v.growthLevel = v.level
    v.growthPowerLabel = v.powerLabel
    if v.forecastActive and v.deployment < 64 then
      growthViewCache = {}
      for _, key in ipairs({
        "characterPointer",
        "classPointer",
        "deployment",
        "level",
        "exp",
        "unitState",
        "maxHp",
        "hp",
        "str",
        "skill",
        "spd",
        "def",
        "res",
        "luck",
        "powerLabel",
        "unitName",
        "className",
        "portrait",
        "unitPresent",
      }) do
        growthViewCache[key] = v[key]
      end
    end
    local bonus = ((v.unitState or 0) & 0x2000) ~= 0 and 5 or 0
    v.growthRadar = ui and ui.growthPopup == true and c.radars[bonus == 5 and 2 or 1] or ""
    v.growthBonus = bonus == 5 and "Afa's Drops: tăng thêm 5 điểm %"
      or "Tỷ lệ tăng chỉ số của nhân vật"
    local promoted = ((c.attributes | k.attributes) & 0x100) ~= 0
    v.growthTier = promoted and "Đã chuyển chức nghiệp" or "Chưa chuyển chức nghiệp"
    v.growthExpLevel = (v.level or 0) + (promoted and 20 or 0)
    local levelCap = k.levelCap or 20
    v.growthLevelCap = levelCap
    v.growthLevelsLeft = math.max(0, levelCap - (v.level or 0))
    local allowed = (v.deployment or 255) < 64 and (v.exp or 255) ~= 255 and (v.level or levelCap) < levelCap
    v.growthExpNeeded = allowed and tostring(100 - v.exp) or "---"
    v.growthExpText = allowed and (tostring(v.exp) .. " / 100 EXP") or "Không thể nhận EXP"
    v.growthExpProgress = allowed and v.exp or 0
    v.growthExpMatch = "Choose an opponent to estimate battle EXP."
    v.rngExpHit = "---"
    v.rngExpKill = "---"
    v.rngExpReceived = "---"
    local function snapshot(u)
      local cp, kp = mem.u32(u), mem.u32(u + 4)
      local cc, kk = growthCharacters[cp], growthClasses[kp]
      if not cc or not kk then
        return nil
      end
      return {
        cp = cp,
        kp = kp,
        level = mem.u8(u + 8),
        attributes = cc.attributes | kk.attributes,
        power = kk.power,
        baseClass = kk.baseClass,
        name = cc.name,
      }
    end
    if v.forecastActive then
      local a, b = snapshot(0x0203A3F0), snapshot(0x0203A470)
      if a and b then
        if a.cp == v.characterPointer and a.kp == v.classPointer then
          growthOpponent = { owner = a.cp, other = b }
        elseif b.cp == v.characterPointer and b.kp == v.classPointer then
          growthOpponent = { owner = b.cp, other = a }
        end
      end
    end
    if growthOpponent and growthOpponent.owner == v.characterPointer and allowed then
      local me = {
        level = v.level,
        attributes = c.attributes | k.attributes,
        power = k.power,
        baseClass = k.baseClass,
      }
      local normal = mem.u8(0x0202BC13) ~= 1 and (mem.u8(0x0202BC0C) & 0x40) == 0
      local hit, kill = growthEstimateExp(me, growthOpponent.other, normal)
      -- Cards are conditional on survival and damage, never simulated hit/miss.
      local extraMap = (mem.u8(0x0202BC0C) & 128) ~= 0
      local friendly = v.forecastActive
        and (mem.u8(0x0203A3FB) & 0xc0) == 0
        and (mem.u8(0x0203A47B) & 0xc0) == 0
      if extraMap or friendly then
        hit = 0
        kill = 0
      end
      v.rngExpHit = hit
      v.rngExpKill = kill
      v.growthExpMatch = growthOpponent.other.name
        .. ": gây sát thương "
        .. hit
        .. " / hạ địch "
        .. kill
        .. " EXP nếu sống sót."
    else
      v.growthExpMatch = "Chọn đối thủ ở dự báo giao chiến để xem EXP."
    end
    v.rngContext = allowed and "Chọn vũ khí và đối thủ trước khi đánh"
      or "Nhân vật này không thể lên cấp"
    v.rngNotice = "Mô phỏng cả phản công, đánh tiếp và EXP."
    v.rngSeed = "Chưa chọn trận giao chiến"
    v.rngRollCount = 0
    local battle, reason = nil, nil
    local conditionalLevel = allowed
        and (tonumber(v.rngExpHit) or 0) > 0
        and v.exp + (tonumber(v.rngExpHit) or 0) >= 100
      or allowed and (tonumber(v.rngExpKill) or 0) > 0 and v.exp + (tonumber(v.rngExpKill) or 0) >= 100
    if v.forecastActive then
      battle, reason = growthReadBattle(conditionalLevel and v.deployment or nil)
      growthBattleCache = battle
    elseif
      growthBattleCache
      and (mem.u16(0x0203A3D8) & 1) ~= 0
      and mem.u8(0x0202BC06) == growthBattleCache.chapter
    then
      local q = growthBattleCache
      local same = (v.characterPointer == q.actor.cp and v.level == q.actor.level and v.exp == q.actor.exp)
        or (v.characterPointer == q.target.cp and v.level == q.target.level and v.exp == q.target.exp)
      if
        same
        and mem.u32(0x0203A3F0) == q.actor.cp
        and mem.u32(0x0203A470) == q.target.cp
        and mem.u8(0x0203A460) == q.actor.level
        and mem.u8(0x0203A461) == q.actor.exp
      then
        battle = q
      end
    end
    local predicted = nil
    if battle then
      if battle.actor.cp == v.characterPointer and battle.actor.id == v.deployment then
        predicted = battle.actor
      elseif battle.target.cp == v.characterPointer and battle.target.id == v.deployment then
        predicted = battle.target
      end
    end
    v.rngBattleActive = battle ~= nil
    v.rngBattleLevelUp = predicted and predicted.levelUp or false
    if reason then
      v.rngContext = reason
      v.analysisFailed = true
      v.analysisPredictionError = reason
      v.predictionFailureReason = reason
    end
    if predicted then
      v.rngAvailable = allowed and conditionalLevel and predicted.levelUp
      v.rngContext = v.rngAvailable and "Dự đoán chỉ số nếu đủ EXP lên cấp"
        or "Trận này chưa đủ EXP để lên cấp"
      local other = predicted == battle.actor and battle.target or battle.actor
      v.rngNotice = "EXP có điều kiện: nhân vật còn sống và gây sát thương."
      v.rngExpReceived = "---"
      v.rngSeed = string.format("RNG  %04X  %04X  %04X", battle.seed[1], battle.seed[2], battle.seed[3])
      v.rngRollCount = battle.rolls
      v.growthExpMatch = v.rngNotice
    end
    local keys = { "Hp", "Power", "Skill", "Spd", "Def", "Res", "Luck" }
    local current = { v.maxHp, v.str, v.skill, v.spd, v.def, v.res, v.luck }
    for i, key in ipairs(keys) do
      local cap = i == 1 and ((v.deployment or 0) >= 128 and (v.deployment or 0) < 192 and 120 or 60)
        or i == 7 and 30
        or k.caps[i]
      v["growth" .. key] = c.growth[i] + bonus
      v["growth" .. key .. "Current"] = current[i]
      v["growth" .. key .. "Cap"] = cap
      local gain = v.rngAvailable and predicted.gains[i] or 0
      v["rng" .. key .. "Gain"] = gain
    end
    v.ui = v.ui or {}
    v.ui.set = v.ui.set or {}
    if growthWasForecast and v.forecastActive and v.ui and v.ui.set then
      v.ui.set.mainTab = nil
      v.ui.set.navUnits = nil
      v.ui.set.navMap = nil
    elseif v.forecastActive and v.ui and v.ui.set then
      v.ui.set.navGrowth = false
    end
    growthWasForecast = v.forecastActive
    -- Do not force a tab switch. Units/Map navigation remains owned by its actions.
    if v ~= base then
      for key, value in pairs(v) do
        if key:sub(1, 6) == "growth" or key:sub(1, 3) == "rng" then
          base[key] = value
        end
      end
    end
    return base
  end
end
