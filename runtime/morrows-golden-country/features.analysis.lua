-- Execute this exact ROM's conditional EXP and level-up path on frozen RAM.
return function(D)
  local analyze=pack.require("features.fe8-analysis")(D)
  local observeRng=pack.require("features.rng-indicator")()
  return function(v)
    v=analyze(v)
    v.analysisSupported=true
    v.predictionFailureReason=v.analysisPredictionError
    return observeRng(v)
  end
end
