-- FE8 Growth fields, support cards, inventory count and status pulse.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  local applyFeSupportBindings = pack.require("features.support")
  local fe8GrowthTick = 0
  local fe8SupportById = {}
  for _, character in pairs(D.chars) do
    fe8SupportById[character.id] = character
  end

  return function(v)
    fe8GrowthTick = fe8GrowthTick + 1
    v.royalItemCount = 0
    for n = 1, 5 do
      if (tonumber(v["item" .. n .. "Id"]) or 0) > 0 then
        v.royalItemCount = v.royalItemCount + 1
      end
    end
    local cp, kp = tonumber(v.characterPointer) or 0, tonumber(v.classPointer) or 0
    local u = v.unitPresent and D.slots[v.deployment] or nil
    applyFeSupportBindings(v, u, cp, fe8SupportById)
    local c, k = D.growthCharacters[cp], D.growthClasses[kp]
    v.growthPresent = v.unitPresent == true and c ~= nil and k ~= nil
    v.growthMissing = not v.growthPresent
    v.growthRadar = ""
    v.travelerPresent = v.unitPresent and (tonumber(v.rescueId) or 0) > 0 or false
    v.conditionActive = v.unitPresent and ((tonumber(v.statusByte) or 0) & 15) ~= 0 or false
    v.travelerFlash = v.travelerPresent and fe8GrowthTick % 6 < 3 or false
    v.conditionFlash = v.conditionActive and fe8GrowthTick % 6 < 3 or false
    if not v.growthPresent then
      return v
    end
    local bonus = u and (mem.u32(u + 12) & 0x2000) ~= 0 and 5 or 0
    local promoted = ((D.chars[cp].attributes | k.attributes) & 0x100) ~= 0
    local cap = (k.id == 0x3d or k.id == 0x3e or k.id == 0x47) and 10 or 20
    v.growthTier = promoted and "Đã chuyển chức nghiệp" or "Chưa chuyển chức nghiệp"
    v.growthCalculationNote = bonus > 0 and "Đã cộng 5% từ Metis’s Tome." or ""
    v.growthLevelCap = cap
    v.growthExpLevel = (v.level or 0) + (promoted and 20 or 0)
    v.growthLevelsLeft = math.max(0, cap - (v.level or 0))
    v.growthExpNeeded = (v.exp or 255) < 100 and tostring(100 - v.exp) or "---"
    v.growthExpText = (v.exp or 255) < 100 and tostring(v.exp) .. " / 100 EXP" or "Không thể nhận EXP"
    v.growthExpProgress = (v.exp or 255) < 100 and v.exp or 0
    v.growthUnitName = v.unitName
    v.growthClassName = v.className
    v.growthPortrait = v.portrait
    v.growthLevel = v.level
    v.growthPowerLabel = v.powerLabel or "Str"
    v.growthBonus = "Tỷ lệ tăng chỉ số của nhân vật"
    if ui and ui.growthPopup then
      v.growthRadar = c.radars[bonus > 0 and 2 or 1]
    end
    for n, key in ipairs({ "Hp", "Power", "Skill", "Spd", "Def", "Res", "Luck" }) do
      v["growth" .. key] = c.growth[n] + bonus
      v["growth" .. key .. "Current"] = ({ v.maxHp, v.str, v.skill, v.spd, v.def, v.res, v.luck })[n]
      v["growth" .. key .. "Cap"] = k.caps[n]
    end
    return v
  end
end
