-- Equipped weapon, inventory badges, rescue passenger and combat stats.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D, map)
  local mapMeta = map.meta
  return function(v, unit)
    local u = unit
    local items = D.equipmentItems
    local chars = D.equipmentChars
    local classes = D.equipmentClasses
    local rescueSlots = {
      [1] = 0x0202BE4C,
      [2] = 0x0202BE94,
      [3] = 0x0202BEDC,
      [4] = 0x0202BF24,
      [5] = 0x0202BF6C,
      [6] = 0x0202BFB4,
      [7] = 0x0202BFFC,
      [8] = 0x0202C044,
      [9] = 0x0202C08C,
      [10] = 0x0202C0D4,
      [11] = 0x0202C11C,
      [12] = 0x0202C164,
      [13] = 0x0202C1AC,
      [14] = 0x0202C1F4,
      [15] = 0x0202C23C,
      [16] = 0x0202C284,
      [17] = 0x0202C2CC,
      [18] = 0x0202C314,
      [19] = 0x0202C35C,
      [20] = 0x0202C3A4,
      [21] = 0x0202C3EC,
      [22] = 0x0202C434,
      [23] = 0x0202C47C,
      [24] = 0x0202C4C4,
      [25] = 0x0202C50C,
      [26] = 0x0202C554,
      [27] = 0x0202C59C,
      [28] = 0x0202C5E4,
      [29] = 0x0202C62C,
      [30] = 0x0202C674,
      [31] = 0x0202C6BC,
      [32] = 0x0202C704,
      [33] = 0x0202C74C,
      [34] = 0x0202C794,
      [35] = 0x0202C7DC,
      [36] = 0x0202C824,
      [37] = 0x0202C86C,
      [38] = 0x0202C8B4,
      [39] = 0x0202C8FC,
      [40] = 0x0202C944,
      [41] = 0x0202C98C,
      [42] = 0x0202C9D4,
      [43] = 0x0202CA1C,
      [44] = 0x0202CA64,
      [45] = 0x0202CAAC,
      [46] = 0x0202CAF4,
      [47] = 0x0202CB3C,
      [48] = 0x0202CB84,
      [49] = 0x0202CBCC,
      [50] = 0x0202CC14,
      [51] = 0x0202CC5C,
      [52] = 0x0202CCA4,
      [53] = 0x0202CCEC,
      [54] = 0x0202CD34,
      [55] = 0x0202CD7C,
      [56] = 0x0202CDC4,
      [57] = 0x0202CE0C,
      [58] = 0x0202CE54,
      [59] = 0x0202CE9C,
      [60] = 0x0202CEE4,
      [61] = 0x0202CF2C,
      [62] = 0x0202CF74,
      [65] = 0x0202DDCC,
      [66] = 0x0202DE14,
      [67] = 0x0202DE5C,
      [68] = 0x0202DEA4,
      [69] = 0x0202DEEC,
      [70] = 0x0202DF34,
      [71] = 0x0202DF7C,
      [72] = 0x0202DFC4,
      [73] = 0x0202E00C,
      [74] = 0x0202E054,
      [75] = 0x0202E09C,
      [76] = 0x0202E0E4,
      [77] = 0x0202E12C,
      [78] = 0x0202E174,
      [79] = 0x0202E1BC,
      [80] = 0x0202E204,
      [81] = 0x0202E24C,
      [82] = 0x0202E294,
      [83] = 0x0202E2DC,
      [84] = 0x0202E324,
      [129] = 0x0202CFBC,
      [130] = 0x0202D004,
      [131] = 0x0202D04C,
      [132] = 0x0202D094,
      [133] = 0x0202D0DC,
      [134] = 0x0202D124,
      [135] = 0x0202D16C,
      [136] = 0x0202D1B4,
      [137] = 0x0202D1FC,
      [138] = 0x0202D244,
      [139] = 0x0202D28C,
      [140] = 0x0202D2D4,
      [141] = 0x0202D31C,
      [142] = 0x0202D364,
      [143] = 0x0202D3AC,
      [144] = 0x0202D3F4,
      [145] = 0x0202D43C,
      [146] = 0x0202D484,
      [147] = 0x0202D4CC,
      [148] = 0x0202D514,
      [149] = 0x0202D55C,
      [150] = 0x0202D5A4,
      [151] = 0x0202D5EC,
      [152] = 0x0202D634,
      [153] = 0x0202D67C,
      [154] = 0x0202D6C4,
      [155] = 0x0202D70C,
      [156] = 0x0202D754,
      [157] = 0x0202D79C,
      [158] = 0x0202D7E4,
      [159] = 0x0202D82C,
      [160] = 0x0202D874,
      [161] = 0x0202D8BC,
      [162] = 0x0202D904,
      [163] = 0x0202D94C,
      [164] = 0x0202D994,
      [165] = 0x0202D9DC,
      [166] = 0x0202DA24,
      [167] = 0x0202DA6C,
      [168] = 0x0202DAB4,
      [169] = 0x0202DAFC,
      [170] = 0x0202DB44,
      [171] = 0x0202DB8C,
      [172] = 0x0202DBD4,
      [173] = 0x0202DC1C,
      [174] = 0x0202DC64,
      [175] = 0x0202DCAC,
      [176] = 0x0202DCF4,
      [177] = 0x0202DD3C,
      [178] = 0x0202DD84,
      [193] = 0x0202E36C,
      [194] = 0x0202E3B4,
      [195] = 0x0202E3FC,
      [196] = 0x0202E444,
      [197] = 0x0202E48C,
    }
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
      local rows = mem.u32(0x0202E4DC)
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
    local spriteClass = mapMeta.classes[v.classPointer]
    local spriteFaction = (v.deployment >> 6)
    v.mapSprite = spriteClass
        and spriteClass.mapSprites[(spriteFaction == 1 and 2 or spriteFaction >= 2 and 3 or 1)]
      or ""
    v.aid = math.max(
      0,
      ((classes[v.classPointer].a & 1) ~= 0)
          and (((chars[v.characterPointer].a | classes[v.classPointer].a) & 0x4000) ~= 0 and 20 or 25) - v.con
        or v.con - 1
    )

    return v
  end
end
