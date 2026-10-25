-- Selected player unit in Preparations. Never uses the map cursor as fallback.
-- Addresses belong to the exact-ROM profile; this module only reads game state.
return function(slots, metadata, profile, memory)
  local mem = memory or mem
  local chars, classes = metadata.chars, metadata.classes
  local function valid(unit)
    if not unit or unit < 0x02000000 or unit + 0x48 > 0x02040000 then
      return nil
    end
    local id = mem.u8(unit + 11)
    if
      id < 1
      or id >= 64
      or slots[id] ~= unit
      or not chars[mem.u32(unit)]
      or not classes[mem.u32(unit + 4)]
      or mem.u8(unit + 19) == 0
      or (mem.u32(unit + 12) & 0x10004) ~= 0
    then
      return nil
    end
    -- US_NOT_DEPLOYED (0x8) is valid while choosing the deployment roster.
    return unit
  end
  return function()
    local active, pick, items, stats = false, nil, nil, false
    if profile.prepFlagAddress then
      active = (mem.u8(profile.prepFlagAddress) & profile.prepFlagMask) ~= 0
    end
    for index = 0, 63 do
      local proc = profile.processPool + index * 108
      local script, pc = mem.u32(proc), mem.u32(proc + 4)
      -- An ended/uninitialized process must not expose stale selection fields.
      if pc >= script + 8 and pc < script + 0x600 then
        if script == profile.prepMenuProcess then
          active, pick = true, proc
        elseif script == profile.prepMainProcess then
          active = true
        elseif script == profile.prepUnitProcess then
          active, pick = true, proc
        elseif script == profile.prepItemProcess then
          active, items = true, proc
        elseif script == profile.statScreenProcess then
          stats = true
        end
      end
    end
    if not active then
      return nil, false
    end
    if stats then
      return valid(mem.u32(profile.statScreenUnit)), true
    end
    local count, selected
    if profile.prepMenuProcess then
      -- Native FE6 uses one AtMenu proc: roster count +2D, index +30.
      -- Its upper menu (+29 == 0) has no active unit selection.
      if not pick or mem.u8(pick + 0x29) ~= 1 then
        return nil, true
      end
      count, selected = mem.u8(pick + 0x2D), mem.u8(pick + 0x30)
    else
      count = mem.u32(profile.prepUnitList + 0x100)
      if items then
        selected = mem.u8(items + 0x2A)
      elseif pick then
        selected = mem.u16(pick + 0x2E)
      end
    end
    if count < 1 or count > 64 then
      return nil, true
    end
    if not selected or selected >= count then
      return nil, true
    end
    return valid(mem.u32(profile.prepUnitList + selected * 4)), true
  end
end
