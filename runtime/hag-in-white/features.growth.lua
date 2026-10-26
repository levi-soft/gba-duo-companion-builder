-- Compose shared FE8 support/pulse fields with the accepted eight-stat UI data.
return function(D)
  local base = pack.require("features.base-growth")(D)
  local split = pack.require("features.split-growth")(D)
  return function(v)
    v = split(base(v))
    v.growthCalculationNote = "Base ROM growth rates; skill and item bonuses are not included."
    return v
  end
end
