-- Native FE6 unit header, ranks and conditions.
return function(D, valid)
  local raw, chars, classes, mapSlots, affinityBonuses = mem, D.chars, D.classes, D.slots, D.affinityBonuses
  local ranks = { "Sword", "Lance", "Axe", "Bow", "Staff", "Anima", "Light", "Dark" }
  local affinities = { "Fire", "Thunder", "Wind", "Ice", "Dark", "Light", "Anima" }
  local rank = pack.require("game.rules").rank

  return function(v, u)
    local c, k = chars[raw.u32(u)], classes[raw.u32(u + 4)]
    v.unitBase = u
    v.characterPointer = raw.u32(u)
    v.classPointer = raw.u32(u + 4)
    v.unitName = c.name
    v.className = k.name
    v.deployment = raw.u8(u + 11)
    v.portrait = c.portrait ~= "" and c.portrait or k.portrait
    v.portraitAspectRatio = D.dimensions[v.portrait] or 1.2
    local faction = v.deployment < 64 and 1 or v.deployment < 128 and 3 or 2
    v.mapSprite = k.mapSprites[faction]
    v.portraitMissing = v.portrait == ""
    v.unitPresent = true
    v.unitAbsent = false
    v.level = raw.u8(u + 8)
    v.exp = raw.u8(u + 9)
    v.expDisplay = v.exp == 255 and "---" or tostring(v.exp)
    v.expCompact = v.expDisplay
    v.levelProgress = v.exp == 255 and 0 or v.exp
    v.maxHp = raw.u8(u + 16)
    v.hp = raw.u8(u + 17)
    v.str = raw.u8(u + 18)
    v.skill = raw.u8(u + 19)
    v.spd = raw.u8(u + 20)
    v.def = raw.u8(u + 21)
    v.res = raw.u8(u + 22)
    v.luck = raw.u8(u + 23)
    v.unitX = raw.u8(u + 14)
    v.unitY = raw.u8(u + 15)
    v.unitState = raw.u16(u + 12)
    v.con = k.con + c.con + raw.s8(u + 24)
    v.move = k.move + raw.s8(u + 26)
    v.powerLabel = (k.ranks[6] > 0 or k.ranks[7] > 0 or k.ranks[8] > 0) and "Mag" or "Str"
    v.aid = (k.attributes & 1) ~= 0 and (((c.attributes | k.attributes) & 0x4000) ~= 0 and 20 or 25) - v.con
      or v.con - 1
    v.affinity = affinities[c.affinity] or "---"
    v.affinityIcon = c.affinity > 0 and "asset:images/affinities/" .. v.affinity:lower() .. ".png" or ""
    v.affinityMissing = v.affinityIcon == ""
    for _, bonus in ipairs(affinityBonuses) do
      if bonus[1] == c.affinity then
        for i, key in ipairs({
          "affinityPow",
          "affinityDef",
          "affinityHit",
          "affinityAvo",
          "affinityCrit",
          "affinityCritAvo",
        }) do
          v[key] = bonus[i + 1] / 2
        end
      end
    end
    v.rescueId = raw.u8(u + 25)
    v.traveler = "---"
    local rescued = mapSlots[v.rescueId]
    if valid(rescued, true) then
      v.traveler = chars[raw.u32(rescued)].name
    end
    v.statusByte = raw.u8(u + 46)
    v.condition = ({ "---", "Poison", "Sleep", "Silence", "Berserk" })[(v.statusByte & 15) + 1] or "---"
    v.conditionTurns = v.statusByte >> 4
    v.hasTraveler = v.rescueId ~= 0
    v.hasCondition = (v.statusByte & 15) ~= 0
    v.travelerPresent = v.hasTraveler
    v.conditionActive = v.hasCondition
    for n, name in ipairs(ranks) do
      local amount = raw.u8(u + 37 + n)
      local base = amount >= 251 and 251
        or amount >= 201 and 201
        or amount >= 151 and 151
        or amount >= 101 and 101
        or amount >= 51 and 51
        or 1
      v["rank" .. name .. "Raw"] = amount
      v["rank" .. name] = rank(amount)
      v["rank" .. name .. "Progress"] = amount > 0 and amount - base or 0
      v["rank" .. name .. "ProgressMax"] = 50
    end
    return v
  end
end
