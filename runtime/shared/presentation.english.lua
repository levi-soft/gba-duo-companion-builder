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
  -- The prepared locale is immutable. Retain only each field's latest pair,
  -- so unchanged snapshots avoid rescanning authored fragments. Live text
  -- changes still translate immediately; no unit/game state is cached here.
  local lastInput, lastOutput, seen = {}, {}, {}
  return function(values)
    for index, key in ipairs(fields) do
      local value = values[key]
      if not seen[index] or value ~= lastInput[index] then
        lastInput[index], lastOutput[index], seen[index] = value, translate(value), true
      end
      values[key] = lastOutput[index]
    end
    return values
  end
end
