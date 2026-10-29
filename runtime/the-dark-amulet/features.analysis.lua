-- This exact ROM has an active native battle hook whose item-table literal
-- is 0x000000C1. Following it reads protected BIOS memory outside the frozen
-- RAM/ROM contract. Do not guess that value or skip the native hook.
return function(D)
  local anchor = nil
  local reason = "Conditional EXP and level-up prediction are unavailable for this ROM revision."
  return function(v)
    local key = string.format("%04X %04X %04X", mem.u16(0x03000000), mem.u16(0x03000002), mem.u16(0x03000004))
    anchor = anchor or key
    if ui and (ui.rngAck == true or ui.predictionPopup == true) then
      anchor = key
      if ui.rngAck == true then
        v.ui = v.ui or {}
        v.ui.set = v.ui.set or {}
        v.ui.set.rngAck = false
      end
    end
    v.rngStateKey, v.rngStateChanged = key, key ~= anchor
    v.analysisSupported = false
    v.analysisPresent = v.forecastActive == true
    v.analysisMissing = not v.analysisPresent
    v.analysisReady = false
    v.analysisFailed = v.analysisPresent or (ui and ui.predictionPopup == true) or false
    v.analysisPredictionError = v.analysisFailed and reason or nil
    v.predictionFailureReason = reason
    v.analysisExpSummary, v.analysisLevelSummary = reason, reason
    v.analysisPredictionContext = reason
    v.analysisCurrentExp = v.exp
    v.analysisDamageExp, v.analysisKillExp = "---", "---"
    v.rngExpHit, v.rngExpKill = nil, nil
    v.predictionDamageEligible, v.predictionKillEligible = false, false
    v.predictionAvailable, v.predictionComplete, v.predictionBusy = false, false, false
    v.predictionProgress = 0
    return v
  end
end
