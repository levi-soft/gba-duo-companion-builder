-- Native prediction is unavailable until this exact ROM's full path is verified.
return function(D)
  local observeRng=pack.require("features.rng-indicator")()
  local reason="Conditional EXP and level-up prediction have not been verified for this exact ROM."
  return function(v)
    v.analysisSupported=false
    v.analysisPresent=v.forecastActive==true;v.analysisMissing=not v.analysisPresent
    v.analysisReady=false;v.analysisFailed=v.analysisPresent or (ui and ui.predictionPopup==true) or false
    v.analysisPredictionError=v.analysisFailed and reason or nil
    v.predictionFailureReason=reason;v.analysisUnavailableReason=reason
    v.analysisExpSummary=reason;v.analysisLevelSummary=reason;v.analysisPredictionContext=reason
    v.analysisCurrentExp=v.exp;v.analysisDamageExp="---";v.analysisKillExp="---"
    v.rngExpHit=nil;v.rngExpKill=nil;v.rngAvailable=false;v.rngBattleActive=false
    v.predictionDamageEligible=false;v.predictionKillEligible=false
    v.predictionAvailable=false;v.predictionComplete=false;v.predictionBusy=false;v.predictionProgress=0
    return observeRng(v)
  end
end
