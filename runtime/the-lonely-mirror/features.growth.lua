-- Actual base growths/caps from this ROM; prediction executes its own level-up routine.
return function(D)
  local base=pack.require("features.base-growth")(D)
  return function(v)
    base(v)
    v.growthCalculationNote="Base ROM growth rates; in-battle bonuses are not included."
    return v
  end
end
