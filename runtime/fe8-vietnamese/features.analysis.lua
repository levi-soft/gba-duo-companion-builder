-- Incremental EXP and level-up analysis with per-forecast cache.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  local modCaptureRam = pack.require("game.snapshot")
  local expQueryStart = pack.require("features.exp")
  local levelPredictionStart = pack.require("features.level_prediction")
  local profile = pack.require("game.profile")
  local function modExpQueryStart(kill, ram)
    return expQueryStart(kill, ram, D.execution)
  end
  local function modLevelPredictionStart(ram)
    return levelPredictionStart(ram, D.execution)
  end
  local modRngAnchor = nil
  local modAnalysisCache = { key = nil }
  local modAnalysisTick = 0
  return function(v)
    modAnalysisTick = modAnalysisTick + 1
    local key = string.format("%04X %04X %04X", mem.u16(0x03000000), mem.u16(0x03000002), mem.u16(0x03000004))
    if not modRngAnchor then
      modRngAnchor = key
    end
    if ui and (ui.rngAck == true or ui.predictionPopup == true) then
      modRngAnchor = key
      if ui.rngAck == true then
        v.ui = v.ui or {}
        v.ui.set = v.ui.set or {}
        v.ui.set.rngAck = false
      end
    end
    v.rngStateChanged = key ~= modRngAnchor
    v.rngStateKey = key
    v.analysisPresent = v.forecastActive == true
    v.analysisMissing = not v.analysisPresent
    v.analysisReady = false
    v.analysisFailed = false
    v.predictionAvailable = false
    v.predictionComplete = false
    v.predictionProgress = 0
    v.predictionBusy = false
    if not v.analysisPresent then
      modAnalysisCache = { key = nil }
      return v
    end
    local actor, target = 0x0203A4EC, 0x0203A56C
    local bytes = {}
    for n = 0, 127 do
      bytes[#bytes + 1] = string.char(mem.u8(actor + n))
      bytes[#bytes + 1] = string.char(mem.u8(target + n))
    end
    local signature = table.concat(bytes)
    signature = signature .. key
    -- Learned skills and nearby units may change without changing the two
    -- battle buffers (for example after loading a different save state).
    signature = signature
      .. mem.read(profile.activeUnit, 4)
      .. mem.read(0x0203A958, 0x20)
      .. mem.read(0x0203A4D4, 0x18)
      .. mem.read(0x0202BE4C, 0x2688)
      .. mem.read(0x0203E884, 0x470)
    -- EXP also depends on chapter mode/flags and BmSt.gameStateBits.
    -- Exclude the PlaySt clocks and BmSt cursor/camera/frame counters: those
    -- advance while a forecast is unchanged and would continually restart jobs.
    signature = signature .. mem.read(0x0202BCFE, 0x0e) .. string.char(mem.u8(0x0202BCB4))
    if modAnalysisCache.key ~= signature then
      local ram = modCaptureRam()
      modAnalysisCache =
        { key = signature, ramByte = ram, query = modExpQueryStart(false, ram), queryStage = 1 }
    end
    local c = modAnalysisCache
    if c.query then
      local ok, done, result = pcall(c.query)
      if not ok then
        c.ok = false
        c.query = nil
        c.predictionError = tostring(done)
      elseif done then
        if c.queryStage == 1 then
          c.damageResult = result
          c.damage = result.gain
          c.queryStage = 2
          c.query = modExpQueryStart(true, c.ramByte)
        else
          c.killResult = result
          c.kill = result.gain
          c.query = nil
          c.ok = true
        end
      end
    end
    if c.query then
      v.predictionBusy = true
      v.predictionProgress = c.queryStage == 1 and 1 or 3
      v.analysisPredictionContext = "Đang tính EXP nếu nhân vật còn sống…"
      return v
    end
    c.age = (c.age or 0) + 1
    v.analysisReady = c.ok
    v.analysisFailed = not c.ok
    if not c.ok then
      v.analysisPredictionError = c.predictionError
    end
    if c.ok then
      v.analysisDamageExp = c.damage
      v.analysisKillExp = c.kill
      local exp = mem.u8(actor + 9)
      v.analysisCurrentExp = exp
      v.predictionDamageEligible = c.damageResult.leveled == true
      v.predictionKillEligible = c.killResult.leveled == true
      v.analysisExpSummary = string.format(
        "Hiện tại %d/100 EXP · Gây sát thương: %d/100 · Hạ đối thủ: %d/100",
        exp,
        exp + c.damage,
        exp + c.kill
      )
      v.analysisLevelSummary = (
        exp + c.damage >= 100 and "Gây sát thương: đủ EXP lên cấp."
        or "Gây sát thương: chưa đủ EXP lên cấp."
      )
        .. " "
        .. (
          exp + c.kill >= 100 and "Hạ đối thủ: đủ EXP lên cấp."
          or "Hạ đối thủ: chưa đủ EXP lên cấp."
        )
      v.growthUnitName = v.unitName
      v.growthPortrait = v.portrait
      v.growthLevel = mem.u8(actor + 8)
      v.growthExpText = tostring(exp) .. " / 100 EXP"
      v.growthPowerLabel = v.powerLabel or "Str"
      v.rngExpHit = c.damage
      v.rngExpKill = c.kill
      v.rngSeed = "RNG " .. key
      local keys = { "Hp", "Power", "Mag", "Skill", "Spd", "Luck", "Def", "Res" }
      local offsets = { 18, 20, 0x3a, 21, 22, 25, 23, 24 }
      for n, k in ipairs(keys) do
        v["growth" .. k .. "Current"] = mem.u8(actor + offsets[n])
        v["rng" .. k .. "Gain"] = 0
      end
      local kp = mem.u32(actor + 4)
      local cap = 20
      local eligible = c.damageResult.leveled or c.killResult.leveled
      v.predictionComplete = not eligible
      v.analysisPredictionContext = eligible and "Đang phân tích chỉ số nếu lên cấp…"
        or "Trận này chưa đủ EXP để lên cấp"
      if eligible then
        v.predictionProgress = 5
        v.predictionBusy = not c.gains and not c.predictionFailed
        if not c.prediction and not c.predictionFailed then
          -- Warm the result while the forecast is visible. A closed popup
          -- waits for a stable forecast before allocating its RAM snapshot.
          if c.age < 2 and not (ui and ui.predictionPopup == true) then
            return v
          end
          local ok, job = pcall(modLevelPredictionStart, c.ramByte)
          if ok then
            c.prediction = job
            return v
          else
            c.predictionFailed = true
            c.predictionError = tostring(job)
          end
        end
        if c.prediction and not c.gains then
          c.workTicks = (c.workTicks or 0) + 1
          local ok, done, gains, progress = pcall(c.prediction)
          if ok then
            c.progress = progress or c.progress or 0
          end
          if not ok then
            c.predictionFailed = true
            c.predictionError = tostring(done)
            c.prediction = nil
          elseif done then
            c.gains = gains
          end
        end
        v.analysisPredictionTicks = c.workTicks or 0
        v.predictionProgress = 5 + math.floor((c.progress or 0) * 94 / 100)
        if c.gains then
          v.analysisPredictionContext = "Dự đoán chỉ số nếu đủ EXP lên cấp"
          v.predictionAvailable = true
          v.predictionComplete = true
          for n, k in ipairs(keys) do
            v["rng" .. k .. "Gain"] = c.gains[n]
          end
        elseif c.predictionFailed then
          v.predictionBusy = false
          v.analysisPredictionContext = "Chưa hỗ trợ dự đoán tình huống này"
          v.analysisPredictionError = c.predictionError
        end
      end
    end
    return v
  end
end
