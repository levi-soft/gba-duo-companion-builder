-- English-only presentation adapter shared by the original FE profiles.
-- Deliberately excludes unit/item/class names and ROM-derived descriptions.
return function(strings)
  local translate = pack.require("presentation.locale")(strings)
  local fields = {
    "rngStateText",
    "growthBonus",
    "growthTier",
    "growthExpText",
    "growthExpMatch",
    "growthCalculationNote",
    "rngStatus",
    "rngNote",
    "rngContext",
    "rngNotice",
    "rngSeed",
    "predictionCondition",
    "predictionConfidence",
    "predictionValidationNote",
    "predictionContext",
    "predictionProgressText",
    "predictionFailureReason",
    "analysisPredictionError",
    "analysisPredictionContext",
    "analysisExpSummary",
    "analysisLevelSummary",
  }
  return function(values)
    for _, key in ipairs(fields) do
      values[key] = translate(values[key])
    end
    return values
  end
end
