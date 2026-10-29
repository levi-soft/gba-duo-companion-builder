-- Exact-ROM eight-stat Growth; no fixed FE6/FE8 cap-table address.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  return function(v)
    local cp = tonumber(v.characterPointer) or 0
    local kp = tonumber(v.classPointer) or 0
    local c = D.growthCharacters[cp]
    local k = D.growthClasses[kp]
    v.growthPresent = v.unitPresent == true and c ~= nil and k ~= nil
    v.growthMissing = not v.growthPresent
    v.growthRadar = ""
    if not v.growthPresent then
      return v
    end
    local promoted = (((D.chars[cp] and D.chars[cp].attributes or 0) | k.attributes) & 0x100) ~= 0
    v.growthTier = promoted and "Đã chuyển chức nghiệp" or "Chưa chuyển chức nghiệp"
    if not (ui and ui.growthPopup == true) then
      return v
    end
    v.growthRadar = c.radar
    v.growthUnitName = v.unitName
    v.growthClassName = v.className
    v.growthPortrait = v.portrait
    v.growthLevel = v.level
    v.growthPowerLabel = "Str"
    v.growthBonus = "Tỷ lệ tăng chỉ số của nhân vật"
    v.growthCalculationNote = "Tỷ lệ cơ bản từ ROM, chưa tính bonus skill/vật phẩm."
    local cap = D.levelCaps[k.id + 1] or 20
    v.growthLevelCap = cap
    v.growthExpLevel = (v.level or 0) + (promoted and 20 or 0)
    v.growthLevelsLeft = math.max(0, cap - (v.level or 0))
    local allowed = (v.deployment or 255) < 64 and (v.exp or 255) ~= 255 and (v.level or cap) < cap
    v.growthExpNeeded = allowed and tostring(100 - v.exp) or "---"
    v.growthExpText = allowed and (tostring(v.exp) .. " / 100 EXP") or "Không thể nhận EXP"
    v.growthExpProgress = allowed and v.exp or 0
    local keys = { "Hp", "Str", "Mag", "Skill", "Spd", "Luck", "Def", "Res" }
    local values = { v.maxHp, v.str, v.mag, v.skill, v.spd, v.luck, v.def, v.res }
    for n, key in ipairs(keys) do
      v["growth" .. key] = c.rates[n]
      v["growth" .. key .. "Current"] = values[n]
      v["growth" .. key .. "Cap"] = k.caps[n]
    end
    v.growthPower = v.growthStr
    v.growthPowerCurrent = v.growthStrCurrent
    v.growthPowerCap = v.growthStrCap
    return v
  end
end
