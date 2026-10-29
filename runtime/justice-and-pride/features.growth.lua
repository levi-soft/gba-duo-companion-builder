-- Display measured ROM base rates, without claiming custom skill/item modifiers.
return function(D)
  local base=pack.require("features.base-growth")(D)
  return function(v)
    base(v)
    if v.growthPresent then
      local c=D.growthCharacters[v.characterPointer]
      local k=D.growthClasses[v.classPointer]
      v.growthLevelCap=D.levelCaps[k.id+1] or 20
      v.growthLevelsLeft=math.max(0,v.growthLevelCap-v.level)
      for n,key in ipairs({"Hp","Power","Skill","Spd","Def","Res","Luck"})do v["growth"..key]=c.growth[n] end
      if ui and ui.growthPopup then v.growthRadar=c.radars[1] end
      v.growthCalculationNote="Base ROM growth rates; skill and item modifiers are not included."
    end
    return v
  end
end
