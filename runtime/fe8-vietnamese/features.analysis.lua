-- Incremental EXP and level-up analysis with per-forecast cache.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  local modCaptureRam = pack.require("game.snapshot")
  local expQueryStart = pack.require("features.exp")
  local levelPredictionStart = pack.require("features.level_prediction")
  local profile = pack.require("game.profile")
  local function executionWithSlice(execution, sliceSteps)
    execution = execution or D.execution
    if not sliceSteps then return execution end
    local entries = {}
    for key, value in pairs(execution or {}) do entries[key] = value end
    entries.cpuStepsPerTick = sliceSteps
    return entries
  end
  local function modExpQueryStart(kill, ram, execution, sliceSteps)
    return expQueryStart(kill, ram, executionWithSlice(execution, sliceSteps))
  end
  local function modLevelPredictionStart(ram, sliceSteps, execution)
    return levelPredictionStart(ram, executionWithSlice(execution, sliceSteps))
  end
  local function transientBudgetError(message)
    return message:find("script exceeded its per-tick time limit", 1, true)
      or message:find("script exceeded its per-tick instruction budget", 1, true)
  end
  local function handlePredictionError(cache, message)
    message = tostring(message)
    local entries = cache.execution or D.execution or {}
    if transientBudgetError(message) and (cache.budgetRetries or 0) < (entries.analysisBudgetRetries or 0) then
      cache.budgetRetries = (cache.budgetRetries or 0) + 1
      cache.sliceSteps = math.max(128, math.floor((cache.sliceSteps or entries.cpuStepsPerTick or 2048) / 2))
      cache.predictionError, cache.predictionFailed, cache.progress = nil, false, 0
      -- The interrupted CPU cannot resume safely. Rebuild it next update from
      -- the same frozen RAM/RNG, preserving conditional EXP and every ROM call.
    else
      cache.predictionFailed, cache.predictionError = true, message
    end
    cache.prediction = nil
  end
  local function handleExpQueryError(cache, message)
    message = tostring(message)
    cache.query = nil -- An interrupted native CPU/shadow is never resumed.
    local entries = cache.execution or D.execution or {}
    if transientBudgetError(message) and (cache.expBudgetRetries or 0) < (entries.analysisBudgetRetries or 0) then
      cache.expBudgetRetries = (cache.expBudgetRetries or 0) + 1
      cache.expSliceSteps = math.max(128, math.floor((cache.expSliceSteps or entries.cpuStepsPerTick or 2048) / 2))
      cache.expRetryPending, cache.ok, cache.predictionError = true, nil, nil
    else
      cache.expRetryPending, cache.ok, cache.predictionError = false, false, message
    end
  end
  local modRngAnchor = nil
  local modRngPopupOpen = false
  local modAnalysisCache = { key = nil }
  local modAnalysisTick = 0
  local function cacheMatches(cache)
    for address, value in pairs(cache.readDependencies or {}) do
      if mem.u8(address) ~= value then return false end
    end
    return true
  end
  local function publish(v, cache)
    if not cacheMatches(cache) then
      -- A native phase can discover a dependency after an earlier slice. Its
      -- frozen value must still match live RAM before any result is published.
      modAnalysisCache = { key = nil }
      for _, name in ipairs({ "analysisDamageExp", "analysisKillExp", "analysisCurrentExp",
        "analysisExpSummary", "analysisLevelSummary", "analysisPredictionContext", "analysisPredictionTicks",
        "analysisExtraStats", "analysisConPresent", "analysisMovPresent", "analysisPredictionError",
        "predictionDamageEligible", "predictionKillEligible", "predictionFailureReason", "rngExpHit", "rngExpKill" }) do
        v[name] = nil
      end
      v.analysisReady, v.analysisFailed, v.analysisSnapshotStale = false, false, true
      v.predictionAvailable, v.predictionComplete, v.predictionBusy, v.predictionProgress = false, false, true, 1
    end
    return v
  end
  return function(v)
    modAnalysisTick = modAnalysisTick + 1
    local key = string.format("%04X %04X %04X", mem.u16(0x03000000), mem.u16(0x03000002), mem.u16(0x03000004))
    if not modRngAnchor then
      modRngAnchor = key
    end
    local popupOpen = ui and ui.predictionPopup == true or false
    if ui and (ui.rngAck == true or (popupOpen and not modRngPopupOpen)) then
      modRngAnchor = key
      if ui.rngAck == true then
        v.ui = v.ui or {}
        v.ui.set = v.ui.set or {}
        v.ui.set.rngAck = false
      end
    end
    modRngPopupOpen = popupOpen
    v.rngStateChanged = key ~= modRngAnchor
    v.rngStateKey = key
    v.analysisPresent = v.forecastActive == true
    v.analysisMissing = not v.analysisPresent
    v.analysisReady = false
    v.analysisFailed = false
    v.analysisPredictionError = nil
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
    local context = mem.busContext and mem.busContext() or nil
    if context then
      assert(context.version == 1 and context.platform == "gba"
        and math.type(context.biosPrefetch) == "integer"
        and context.biosPrefetch >= 0 and context.biosPrefetch <= 0xffffffff, "Invalid GBA bus context")
      signature = signature .. string.format("bus1:%08X", context.biosPrefetch)
    end
    if modAnalysisCache.key ~= signature or not cacheMatches(modAnalysisCache) then
      local ram, frozenContext = modCaptureRam()
      local frozenRam, readDependencies = ram, {}
      ram = function(address)
        local value = frozenRam(address)
        readDependencies[address] = value
        return value
      end
      local execution = D.execution
      if frozenContext then
        execution = {}
        for name, value in pairs(D.execution or {}) do execution[name] = value end
        execution.busContext = frozenContext
      end
      modAnalysisCache =
        { key = signature, ramByte = ram, readDependencies = readDependencies, execution = execution,
          expRetryPending = true, queryStage = 1 }
    end
    local c = modAnalysisCache
    if c.expRetryPending then
      c.expRetryPending = false
      local ok, job = pcall(modExpQueryStart, c.queryStage == 2, c.ramByte, c.execution, c.expSliceSteps)
      if ok then c.query = job else handleExpQueryError(c, job) end
    end
    if c.query then
      local ok, done, result = pcall(c.query)
      if not ok then
        handleExpQueryError(c, done)
      elseif done then
        if c.queryStage == 1 then
          c.damageResult = result
          c.damage = result.gain
          c.queryStage = 2
          -- Each conditional EXP stage has its own bounded retry allowance.
          -- Keep the completed damage result while rebuilding the kill stage.
          c.query, c.expBudgetRetries, c.expSliceSteps, c.expRetryPending = nil, 0, nil, true
        else
          c.killResult = result
          c.kill = result.gain
          c.query = nil
          c.ok = true
        end
      end
    end
    if c.query or c.expRetryPending then
      v.predictionBusy = true
      v.predictionProgress = c.queryStage == 1 and 1 or 3
      v.analysisPredictionContext = "Đang tính EXP nếu nhân vật còn sống…"
      return publish(v, c)
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
      local extraStats = (c.execution or D.execution or {}).extraStats
      if extraStats then
        v.analysisExtraStats = {}
        for _, spec in ipairs(extraStats) do
          assert(spec.key == "Con" or spec.key == "Mov", "Invalid extra Analysis stat")
          local current = spec.currentValue and spec.currentValue(v, actor, c.ramByte)
            or spec.currentField and v[spec.currentField]
            or spec.currentOffset and c.ramByte(actor + spec.currentOffset)
          assert(type(current) == "number", "Missing current extra stat: " .. spec.key)
          v.analysisExtraStats[#v.analysisExtraStats + 1] = spec.key
          v["analysis" .. spec.key .. "Present"] = true
          v["growth" .. spec.key .. "Current"] = current
          v["rng" .. spec.key .. "Gain"] = 0
        end
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
            return publish(v, c)
          end
          local ok, job = pcall(modLevelPredictionStart, c.ramByte, c.sliceSteps, c.execution)
          if ok then
            c.prediction = job
            return publish(v, c)
          else
            handlePredictionError(c, job)
          end
        end
        if c.prediction and not c.gains then
          c.workTicks = (c.workTicks or 0) + 1
          local ok, done, gains, progress = pcall(c.prediction)
          if ok then
            c.progress = progress or c.progress or 0
          end
          if not ok then
            handlePredictionError(c, done)
          elseif done then
            local valid, message = pcall(function()
              for _, spec in ipairs(extraStats or {}) do
                assert(gains.extraGains and type(gains.extraGains[spec.key]) == "number", "Missing predicted extra stat: " .. spec.key)
              end
            end)
            if valid then c.gains = gains else handlePredictionError(c, message) end
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
          for _, k in ipairs(v.analysisExtraStats or {}) do
            v["rng" .. k .. "Gain"] = c.gains.extraGains[k]
          end
        elseif c.predictionFailed then
          v.predictionBusy = false
          v.analysisPredictionContext = "Chưa hỗ trợ dự đoán tình huống này"
          v.analysisPredictionError = c.predictionError
        end
      end
    end
    return publish(v, c)
  end
end
