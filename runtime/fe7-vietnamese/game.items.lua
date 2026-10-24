-- Equipped weapon, inventory badges, rescue passenger and combat stats.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D, map)
  local mapMeta = map.meta
  local items, chars, classes, rescueSlots = D.battleItems, D.battleChars, D.battleClasses, D.slots
  return function(v, unit)
    local u = unit
    -- Immutable items metadata is initialized once above update().
    -- Immutable chars metadata is initialized once above update().
    -- Immutable classes metadata is initialized once above update().
    -- Immutable rescueSlots metadata is initialized once above update().
    v.traveler = "---"
    local rescued = rescueSlots[v.rescueId]
    if v.rescueId and v.rescueId ~= 0 and rescued and mem.u8(rescued + 11) == v.rescueId then
      local passenger = chars[mem.u32(rescued)]
      if passenger and passenger.name and not passenger.name:match("^Unit #") then
        v.traveler = passenger.name
      end
    end
    local char, cls = chars[v.characterPointer], classes[v.classPointer]
    local w, slot = nil, 0
    if char and cls then
      for i = 0, 4 do
        local raw = mem.u16(u + 0x1E + i * 2)
        local id = raw % 256
        local item = items[id]
        if item and (item.r == 0 or ((char.a & item.r) == item.r or (cls.a & item.r) == item.r)) then
          local rank = mem.u8(u + 0x28 + item.t)
          if item.t >= 8 or rank >= item.n then
            w, slot = item, i + 1
            break
          end
        end
      end
    end
    v.equipmentWeapon = w and mem.u16(u + 0x1E + (slot - 1) * 2) or 0
    v.equipmentSlot = slot
    v.equipmentHasWeapon = w ~= nil
    v.equipmentMatches = true
    v.equipmentMissing = w == nil
    v.equipmentId = w and (v.equipmentWeapon % 256) or 0
    v.equipmentName = w and w.name or "---"
    for i = 1, 5 do
      v["item" .. i .. "Badge"] = (slot == i) and "E" or ""
    end
    if w then
      local state = mem.u32(u + 12)
      local rescuing = (state & 0x10) ~= 0
      local skl = mem.u8(u + 21)
      local spd = mem.u8(u + 22)
      if rescuing then
        skl = math.floor(skl / 2)
        spd = math.floor(spd / 2)
      end
      local con = mem.s8(u + 26) + cls.con + char.con
      local as = math.max(0, spd - math.max(0, w.w - con))
      local luck = mem.u8(u + 25)
      local avoid = 0
      local rows = mem.u32(0x0202E3E0)
      if rows >= 0x02000000 and rows < 0x02040000 then
        local row = mem.u32(rows + mem.u8(u + 17) * 4)
        if row >= 0x02000000 and row < 0x02040000 then
          avoid = cls.avoid[mem.u8(row + mem.u8(u + 16)) + 1] or 0
        end
      end
      v.equipmentAtk = mem.u8(u + 20) + w.m
      v.equipmentHit = skl * 2 + w.h + math.floor(luck / 2)
      v.equipmentCrit = w.c + math.floor(skl / 2) + (((char.a & 0x40) ~= 0) and 15 or 0)
      v.equipmentAS = as
      v.equipmentAvoid = as * 2 + avoid + luck
      v.weaponMight = w.m
      v.weaponHit = w.h
      v.weaponCrit = w.c
      v.weaponWeight = w.w
      v.weaponType = ({
        "Sword",
        "Lance",
        "Axe",
        "Bow",
        "Staff",
        "Anima",
        "Light",
        "Dark",
        "Ballista",
        "Item",
        "Dragon",
      })[w.t + 1] or "---"
      v.weaponRank = w.n >= 251 and "S"
        or w.n >= 181 and "A"
        or w.n >= 121 and "B"
        or w.n >= 71 and "C"
        or w.n >= 31 and "D"
        or w.n > 0 and "E"
        or "---"
      local range = w.g
      v.equipmentRange = range == 16 and "1–Mag/2"
        or (
          (range >> 4) == (range & 15) and tostring(range & 15)
          or tostring(range >> 4) .. "–" .. tostring(range & 15)
        )
    else
      v.equipmentAtk = "---"
      v.equipmentHit = "---"
      v.equipmentCrit = "---"
      v.equipmentAS = "---"
      v.equipmentAvoid = "---"
      v.equipmentRange = "---"
    end

    return v
  end
end
