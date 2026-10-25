-- FE6 character growth, native class caps; no FE7/FE8 growth item bonus.
return function(D)
  return function(v)
    local c, k = D.chars[v.characterPointer], D.classes[v.classPointer]
    v.growthPresent = v.unitPresent == true and c ~= nil and k ~= nil
    v.growthMissing, v.growthRadar = not v.growthPresent, ""
    if not v.growthPresent then
      return v
    end
    local promoted = ((c.attributes | k.attributes) & 0x100) ~= 0
    v.growthTier = promoted and "Promoted" or "Unpromoted"
    v.growthCalculationNote, v.growthBonus = "", "Character growth rates"
    v.growthLevelCap, v.growthExpLevel = 20, v.level + (promoted and 20 or 0)
    v.growthLevelsLeft = math.max(0, 20 - v.level)
    v.growthExpNeeded = v.exp < 100 and tostring(100 - v.exp) or "---"
    v.growthExpText = v.exp < 100 and v.exp .. " / 100 EXP" or "Cannot gain EXP"
    v.growthExpProgress = v.exp < 100 and v.exp or 0
    v.growthUnitName, v.growthClassName, v.growthPortrait = v.unitName, v.className, v.portrait
    v.growthLevel, v.growthPowerLabel = v.level, v.powerLabel
    if ui and ui.growthPopup then
      v.growthRadar = c.radar
    end
    for n, key in ipairs({ "Hp", "Power", "Skill", "Spd", "Def", "Res", "Luck" }) do
      v["growth" .. key] = c.growth[n]
      v["growth" .. key .. "Cap"] = k.caps[n]
      v["growth" .. key .. "Current"] = ({ v.maxHp, v.str, v.skill, v.spd, v.def, v.res, v.luck })[n]
    end
    return v
  end
end
