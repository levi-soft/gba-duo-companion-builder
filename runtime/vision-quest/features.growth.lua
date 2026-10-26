-- Preserve the common seven-stat Growth UI and the ROM's class level caps.
return function(D)
  local base=pack.require("features.base-growth")(D)
  return function(v)
    base(v)
    if v.growthPresent then
      local class=D.growthClasses[v.classPointer]
      v.growthLevelCap=D.levelCaps[class.id+1] or 20
      v.growthLevelsLeft=math.max(0,v.growthLevelCap-v.level)
      v.growthCalculationNote="Base ROM growth rates; skill and item bonuses are not included."
    end
    return v
  end
end
