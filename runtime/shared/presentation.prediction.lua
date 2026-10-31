-- Shared conditional level-up presentation and progress state.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function()
  local predictionPresentationTick = 0
  local predictionWasForecast = false
  return function(v)
    predictionPresentationTick = predictionPresentationTick + 1
    -- Enter Forecast once, then respect the user's Units/Map navigation.
    -- The inherited FE6/FE8 readers request Units every tick otherwise.
    local forecast = v.forecastActive == true
    if forecast and predictionWasForecast and v.ui and v.ui.set then
      v.ui.set.mainTab = nil
      v.ui.set.navUnits = nil
      v.ui.set.navMap = nil
    end
    predictionWasForecast = forecast
    -- Eligibility comes only from conditional EXP, never the simulated outcome.
    local exp = tonumber(v.analysisCurrentExp or v.exp)
    local hit, kill = tonumber(v.rngExpHit), tonumber(v.rngExpKill)
    local canLevel = exp
      and exp < 100
      and (tonumber(v.growthLevel) or 20) < 20
      and (tonumber(v.deployment) or 255) < 64
    local damageEligible = v.predictionDamageEligible
    if damageEligible == nil then
      damageEligible = canLevel and hit and hit > 0 and exp + hit >= 100 or false
    end
    local killEligible = v.predictionKillEligible
    if killEligible == nil then
      killEligible = canLevel and kill and kill > 0 and exp + kill >= 100 or false
    end
    v.predictionDamageEligible = damageEligible
    v.predictionKillEligible = killEligible
    local eligible = damageEligible or killEligible
    local failed = v.analysisFailed == true or v.analysisPredictionError ~= nil
    v.predictionCondition = damageEligible
        and killEligible
        and "Nếu gây sát thương / hạ đối thủ và lên cấp"
      or damageEligible and "Nếu gây sát thương và lên cấp"
      or killEligible and "Nếu hạ đối thủ và lên cấp"
      or "Hai điều kiện chưa đủ EXP lên cấp"
    local available = v.predictionAvailable
    if available == nil then
      available = v.rngAvailable == true
    end
    available = available and eligible and not failed or false
    v.predictionAvailable = available
    local complete = v.predictionComplete
    if complete == nil then
      complete = v.rngBattleActive == true
    end
    complete = (complete or available) and not failed
    v.predictionComplete = complete == true
    v.predictionBusy = v.predictionBusy == true and not complete and not failed
    -- Result state is local to this calculation, not an accuracy percentage.
    v.predictionConfidence = failed and "Tình huống chưa hỗ trợ"
      or available and "Đã tính theo điều kiện"
      or v.predictionBusy and "Đang tính theo điều kiện"
      or complete and "Đã phân tích EXP theo điều kiện"
      or "Chờ dữ liệu giao chiến"
    v.predictionValidationNote =
      "Mức kiểm chứng được ghi trong tài liệu của profile; trạng thái này không cam kết độ chính xác 100%."
    v.predictionContext = failed
        and (v.predictionFailureReason or "Không thể phân tích tình huống này")
      or hit and kill and v.predictionCondition
      or "Phân tích EXP theo điều kiện"
    v.predictionProgress = complete and 100
      or (
        v.predictionBusy and math.max(0, math.min(99, math.floor(tonumber(v.predictionProgress) or 0))) or 0
      )
    v.predictionProgressText = complete and "Hoàn tất: 100%"
      or v.predictionBusy and ("Ước tính: " .. v.predictionProgress .. "%")
      or "Chưa có kết quả"
    local keys = { "Hp", "Power", "Mag", "Skill", "Spd", "Luck", "Def", "Res" }
    for _, key in ipairs(v.analysisExtraStats or {}) do keys[#keys + 1] = key end
    for _, key in ipairs(keys) do
      local current = tonumber(v["growth" .. key .. "Current"])
      local gain = tonumber(v["rng" .. key .. "Gain"]) or 0
      v["rng" .. key .. "Result"] = available
          and current
          and (tostring(current + gain) .. (gain ~= 0 and (" (" .. (gain > 0 and "+" or "") .. gain .. ")") or ""))
        or "---"
      v["rng" .. key .. "Flash"] = available and gain > 0 and predictionPresentationTick % 6 < 3 or false
    end
    return v
  end
end
