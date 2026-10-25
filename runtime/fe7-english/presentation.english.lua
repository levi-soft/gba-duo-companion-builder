-- English-only presentation adapter. Shared FE7 calculations remain unchanged.
-- Deliberately excludes unit/item/class names and ROM-derived descriptions.
return function(strings)
  local translate = pack.require("presentation.locale")(strings)
  local fields = {
    "rngStateText",
    "growthBonus",
    "growthTier",
    "growthExpText",
    "growthExpMatch",
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
  }
  return function(values)
    for _, key in ipairs(fields) do
      values[key] = translate(values[key])
    end
    return values
  end
end
