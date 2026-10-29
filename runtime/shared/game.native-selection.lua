-- Opt-in selection for native FE7/FE8 stat screens and Preparations.
-- A stat screen can change units without moving the map cursor or active unit.
return function(slots, metadata, profile, memory)
  local mem = memory or mem
  local readPreparations = pack.require("game.preparations")(slots, metadata, profile, mem)
  local function valid(unit)
    if not unit or unit < 0x02000000 or unit + 0x48 > 0x02040000 then return nil end
    local id = mem.u8(unit + 11)
    if slots[id] ~= unit or not metadata.chars[mem.u32(unit)]
      or not metadata.classes[mem.u32(unit + 4)] or mem.u8(unit + 19) == 0
      or (mem.u32(unit + 12) & 0x10004) ~= 0 then return nil end
    return unit
  end
  return function()
    local unit, preparations = readPreparations()
    if preparations then return unit, true end
    for index = 0, 63 do
      local proc = profile.processPool + index * 108
      local script, pc = mem.u32(proc), mem.u32(proc + 4)
      if script == profile.statScreenProcess and pc >= script + 8 and pc < script + 0x600 then
        -- The second value suppresses map/active-unit fallback while a unit
        -- menu owns selection, including invalid/ended native pointers.
        return valid(mem.u32(profile.statScreenUnit)), true
      end
    end
    return nil, false
  end
end
