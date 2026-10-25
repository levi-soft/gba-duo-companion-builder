-- Selected player unit in Preparations. Never uses the map cursor as fallback.
-- Addresses belong to the exact-ROM profile; this module only reads game state.
return function(slots, metadata, profile)
  local chars, classes = metadata.chars, metadata.classes
  local function valid(unit)
    if not unit or unit < 0x02000000 or unit + 0x48 > 0x02040000 then
      return nil
    end
    local id = mem.u8(unit + 11)
    if id < 1 or id >= 64 or slots[id] ~= unit
      or not chars[mem.u32(unit)] or not classes[mem.u32(unit + 4)]
      or mem.u8(unit + 19) == 0 or (mem.u32(unit + 12) & 0x10004) ~= 0 then
      return nil
    end
    -- US_NOT_DEPLOYED (0x8) is valid while choosing the deployment roster.
    return unit
  end
  return function()
    local active, pick, items, stats = false, nil, nil, false
    for index = 0, 63 do
      local proc = profile.processPool + index * 108
      local script, pc = mem.u32(proc), mem.u32(proc + 4)
      -- An ended/uninitialized process must not expose stale selection fields.
      if pc >= script + 8 and pc < script + 0x600 then
        if script == profile.prepMainProcess then
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
    local count = mem.u32(profile.prepUnitList + 0x100)
    if count < 1 or count > 64 then
      return nil, true
    end
    local selected
    if items then
      selected = mem.u8(items + 0x2A)
    elseif pick then
      selected = mem.u16(pick + 0x2E)
    end
    if not selected or selected >= count then
      return nil, true
    end
    return valid(mem.u32(profile.prepUnitList + selected * 4)), true
  end
end
