-- Shared companion-only Map selection. Uses the official read-only mem API;
-- the pick never moves the game's cursor, confirms an action, or writes RAM.
return function(D, profile, unit, v, nativeOwner, memory, config)
  local picked = ui and tonumber(ui.mapPickedId) or 0
  if not picked or picked == 0 then return unit end
  local function clear()
    v.ui = v.ui or {}
    v.ui.set = v.ui.set or {}
    v.ui.set.mapPickedId = 0
  end
  if nativeOwner or v.unitLocked or v.forecastActive then clear(); return unit end
  local mem = memory or mem
  local function ram(address, length)
    return address >= 0x02000000 and address + length <= 0x02040000
      or address >= 0x03000000 and address + length <= 0x03008000
  end
  local width, height = mem.u16(profile.mapWidth), mem.u16(profile.mapHeight)
  local cx, cy = mem.u16(profile.cursorX), mem.u16(profile.cursorY)
  local context = tostring(mem.u8(profile.chapter)) .. ":" .. tostring(mem.u16(profile.turn))
    .. ":" .. tostring(cx) .. ":" .. tostring(cy)
  local candidate = picked % 1 == 0 and picked >= 1 and picked <= 255 and D.slots[picked] or nil
  if width == 0 or height == 0 or width > 512 or height > 512 or cx >= width or cy >= height
    or ui.mapPickedContext ~= context or not candidate or not ram(candidate, 0x48) then
    clear(); return unit
  end
  -- FE7/Maiden prepare their character/class tables under mapMeta; the FE8
  -- readers also expose top-level aliases. Read the actual shared map contract.
  local metadata = D.mapMeta or D
  local state = mem.u32(candidate + 12)
  if mem.u8(candidate + 11) ~= picked or not metadata.chars[mem.u32(candidate)]
    or not metadata.classes[mem.u32(candidate + 4)] or mem.u8(candidate + 19) == 0
    or (state & 0x1002c) ~= 0
    or (picked >= 128 and (not config or config.respectFog ~= false) and (state & 0x200) ~= 0) then
    clear(); return unit
  end
  local x, y = mem.u8(candidate + 16), mem.u8(candidate + 17)
  local rows = mem.u32(profile.unitRows)
  if x >= width or y >= height or not ram(rows, height * 4) then clear(); return unit end
  local row = mem.u32(rows + y * 4)
  if not ram(row, width) or mem.u8(row + x) ~= picked then clear(); return unit end
  v.companionPicked = true
  return candidate
end
