-- Keep the common Growth UI, replacing retail FE8's trainee level-cap rules.
return function(D)
  local base=pack.require("features.base-growth")(D)
  return function(v)
    base(v)
    if v.growthPresent then
      local class=D.growthClasses[v.classPointer]
      local cap=D.levelCaps[class.id] or 20
      v.growthLevelCap=cap
      v.growthLevelsLeft=math.max(0,cap-v.level)
    end
    return v
  end
end
