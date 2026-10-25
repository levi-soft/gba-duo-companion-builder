-- Native FE6 equipment and five inventory slots.
return function(D)
  local raw, items = mem, D.items
  local rules = pack.require("game.rules")
  local rank, range = rules.rank, rules.range
  local types = rules.types
  local profile = pack.require("game.profile")
  local function weaponFor(u, c, k)
    for slot = 1, 5 do
      local value = raw.u16(u + 28 + (slot - 1) * 2)
      local item = items[value % 256]
      if
        item
        and (item.attributes & 1) ~= 0
        and ((item.attributes & 8) ~= 0 or value >> 8 > 0)
        and (item.type >= 8 or raw.u8(u + 38 + item.type) >= item.rank)
        and not ((raw.u8(u + 46) & 15) == 3 and (item.attributes & 2) ~= 0)
      then
        local lock = item.attributes & 0x3c00
        local attrs = c.attributes | k.attributes
        if
          lock == 0
          or ((lock & 0x400) ~= 0 and (attrs & 0x40000) ~= 0)
          or ((lock & 0x800) ~= 0 and (attrs & 0x10000) ~= 0)
          or ((lock & 0x1000) ~= 0 and (attrs & 0x20000) ~= 0)
          or ((lock & 0x2000) ~= 0 and (attrs & 0x80000) ~= 0)
        then
          return item, slot, value
        end
      end
    end
  end

  return function(v, u, inPreparations)
    local c, k = D.chars[raw.u32(u)], D.classes[raw.u32(u + 4)]

    local first, last = 0, 0
    for n = 1, 5 do
      local value = raw.u16(u + 26 + n * 2)
      local item = items[value % 256]
      local key = "item" .. n
      v[key] = value
      v[key .. "Id"] = value % 256
      if item and value ~= 0 then
        if first == 0 then
          first = n
        end
        last = n
        v[key .. "Name"] = item.name
        v[key .. "Icon"] = item.icon
        v[key .. "Uses"] = value >> 8
        v[key .. "MaxUses"] = item.maxUses
        v[key .. "Unbreakable"] = (item.attributes & 8) ~= 0
        v[key .. "UsesDisplay"] = v[key .. "Unbreakable"] and "--" or value >> 8
        v[key .. "MaxDisplay"] = v[key .. "Unbreakable"] and "--" or item.maxUses
        v[key .. "Description"] = item.description
        v[key .. "Might"] = item.might
        v[key .. "Hit"] = item.hit
        v[key .. "Crit"] = item.crit
        v[key .. "Weight"] = item.weight
        v[key .. "Type"] = types[item.type + 1] or "Item"
        v[key .. "Rank"] = rank(item.rank)
        v[key .. "Range"] = range(item.range)
        v[key .. "IsWeapon"] = (item.attributes & 1) ~= 0
        v[key .. "IsNonWeapon"] = (item.attributes & 1) == 0
        v[key .. "HasRank"] = (item.attributes & 5) ~= 0
      end
    end
    local count = 0
    for n = 1, 5 do
      if (v["item" .. n .. "Id"] or 0) > 0 then
        count = count + 1
      end
    end
    v.inventoryCount = count
    v.firstItemSlot = first
    v.lastItemSlot = last
    if profile.supportsDrops then
      v.unitDropsItem = (v.unitState & 0x1000) ~= 0
      for n = 1, 5 do
        v["item" .. n .. "Droppable"] = v.unitDropsItem and n == last
      end
    end
    v.firstItemPage = first > 0 and "slot" .. first or "none"
    for n = 1, 5 do
      v["firstItemSelected" .. n] = n == first
    end
    v.royalItemCount = count
    local w, slot, value = weaponFor(u, c, k)
    v.equipmentSlot = slot or 0
    v.equipmentWeapon = value or 0
    v.equipmentHasWeapon = w ~= nil
    v.equipmentMissing = w == nil
    v.equipmentMatches = true
    v.equipmentId = w and w.id or 0
    if w then
      local skill, spd = v.skill, v.spd
      if (v.unitState & 16) ~= 0 then
        skill = math.floor(skill / 2)
        spd = math.floor(spd / 2)
      end
      local speed = math.max(0, spd - math.max(0, w.weight - v.con))
      local rows = raw.u32(profile.terrainRows)
      local mapWidth, mapHeight = raw.u16(profile.mapWidth), raw.u16(profile.mapHeight)
      local terrain = 0
      if
        not inPreparations
        and v.unitX < mapWidth
        and v.unitY < mapHeight
        and rows >= 0x02000000
        and rows + mapHeight * 4 <= 0x02040000
      then
        local row = raw.u32(rows + v.unitY * 4)
        if row >= 0x02000000 and row + mapWidth <= 0x02040000 then
          terrain = raw.u8(row + v.unitX)
        end
      end
      v.equipmentAtk = v.str + w.might
      v.equipmentHit = skill * 2 + w.hit + math.floor(v.luck / 2)
      v.equipmentCrit = math.floor(skill / 2)
        + w.crit
        + (((c.attributes | k.attributes) & 64) ~= 0 and 30 or 0)
      v.equipmentAS = speed
      v.equipmentAvoid = speed * 2 + v.luck + (k.avoid[terrain + 1] or 0)
      v.equipmentRange = range(w.range)
    end
    return v
  end
end
