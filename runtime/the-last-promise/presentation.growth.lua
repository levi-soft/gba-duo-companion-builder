-- Class caps are supplied by Analysis from the ROM's verified level-cap table.
return function(v)
  local cap=tonumber(v.growthLevelCap) or 20
  v.growthLevelCap=cap
  v.growthCalculationNote=""
  local exp=tonumber(v.exp)
  local eligible=v.forecastActive and (tonumber(v.deployment) or 255)<64
    and exp and exp<100 and (tonumber(v.level) or cap)<cap
  local hit,kill=tonumber(v.rngExpHit),tonumber(v.rngExpKill)
  v.predictionDamageEligible=eligible and hit and hit>0 and exp+hit>=100 or false
  v.predictionKillEligible=eligible and kill and kill>0 and exp+kill>=100 or false
  return v
end
