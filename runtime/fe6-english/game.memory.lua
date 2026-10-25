-- Local read adapter for inherited map/Forecast and Preparations unit validation.
-- Native calculations and FE6 unit readers always use the untouched mem API.
return function(D)
  local raw = mem
  local profile = pack.require("game.profile")
  local first, last = 0x02040000, 0x02000000
  for _, slot in pairs(D.slots) do
    first, last = math.min(first, slot), math.max(last, slot + 72)
  end
  local function translate(address, width)
    local unit
    if address >= profile.battleTarget and address < profile.battleTarget + 128 then
      unit = profile.battleTarget
    elseif address >= profile.battleActor and address < profile.battleActor + 124 then
      unit = profile.battleActor
    end
    if unit then
      local offset = address - unit
      if offset >= 0x48 then
        if offset >= 0x72 then
          return unit + offset - 4, false
        end
        if offset >= 0x50 then
          return unit + offset - 2, false
        end
        return address, offset == 0x4C and width == 4
      end
    elseif address >= first and address < last then
      local candidate = first + math.floor((address - first) / 72) * 72
      if D.validSlots[candidate] then
        unit = candidate
      end
    end
    if not unit then
      return address, false
    end
    local offset = address - unit
    if offset == 12 and width == 4 then
      return unit + 12, true
    end
    if offset >= 14 and offset < 28 then
      offset = offset - 2
    elseif offset == 29 then
      offset = 26
    elseif offset >= 30 and offset < 62 then
      offset = offset - 2
    end
    return unit + offset, false
  end
  local adapted = {}
  for _, entry in ipairs({ { "u8", 1 }, { "s8", 1 }, { "u16", 2 }, { "s16", 2 }, { "u32", 4 }, { "s32", 4 } }) do
    local name, width = entry[1], entry[2]
    adapted[name] = function(address)
      local mapped, short = translate(address, width)
      return short and raw.u16(mapped) or raw[name](mapped)
    end
  end
  return adapted
end
