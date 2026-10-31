-- Existing Plus navigation: request native D-pad input from an explicit tap.
-- Lua never writes RAM; the game owns cursor/camera/hover updates as it moves.
local profile = pack.require("game.cursor-profile")

return function(D)
  local metadata = D.mapMeta or D
  local pending
  local function result(ok, message, waiting)
    return { set = { mapCursorSuccess = ok, mapCursorPending = waiting == true,
      mapCursorMessage = message or "" } }
  end
  local function ram(address, length)
    return type(address) == "number" and (address >= 0x02000000 and address + length <= 0x02040000
      or address >= 0x03000000 and address + length <= 0x03008000)
  end
  local function unitAddress(id)
    if id >= 1 and id <= 62 then return profile.blue + (id - 1) * 72 end
    if id >= 65 and id <= 84 then return profile.green + (id - 65) * 72 end
    if id >= 129 and id <= 178 then return profile.red + (id - 129) * 72 end
  end
  local function mapState()
    local width, height = mem.u16(profile.size), mem.u16(profile.size + 2)
    local cx, cy = mem.u16(profile.cursor), mem.u16(profile.cursor + 2)
    if width < 1 or height < 1 or width > 64 or height > 64 or cx >= width or cy >= height then return end
    return width, height, cx, cy
  end
  local function modeAllowed()
    local guard = profile.modeGuard
    if not guard then return true end
    if (mem.u8(guard.address) & guard.mask) ~= guard.expected then return false end
    -- Old Plus has no modeGuard parser. These exact-ROM read-only checks stay
    -- in Lua, including owners which start before Pokemblem sets its mode bit.
    for i = 0, 63 do
      local proc = profile.procs + i * 108
      local script = mem.u32(proc)
      for _, freeScript in ipairs(guard.processScripts or {}) do
        if script == freeScript then
          local pc, flags = mem.u32(proc + 4), mem.u8(proc + 0x27)
          if (flags & 1) == 0 and ((flags & 8) ~= 0 or pc >= script + 8 and pc < script + 0x600) then return false end
        end
      end
    end
    return true
  end
  local function targetValid(id, expected, width, height)
    local unit = D.slots[id]
    if not ram(unit, 72) or unit ~= unitAddress(id) or mem.u8(unit + 11) ~= id then return false end
    local character, class = mem.u32(unit), mem.u32(unit + 4)
    local state = profile.unitStateBytes == 2 and mem.u16(unit + 12) or mem.u32(unit + 12)
    if character ~= expected.characterPointer or class ~= expected.classPointer
      or not metadata.chars[character] or not metadata.classes[class]
      or mem.u8(unit + profile.unitHp) == 0 or (state & (profile.unavailableMask | 0x20)) ~= 0
      or (id >= 128 and (state & 0x200) ~= 0) then return false end
    local x, y = mem.u8(unit + profile.unitPosition), mem.u8(unit + profile.unitPosition + 1)
    if x >= width or y >= height or x ~= expected.x or y ~= expected.y then return false end
    local rows = mem.u32(profile.size + 4)
    if not ram(rows, height * 4) then return false end
    local row = mem.u32(rows + y * 4)
    return ram(row, width) and mem.u8(row + x) == id
  end
  local function request(value, context, expected)
    local id = tonumber(value)
    if not id or id % 1 ~= 0 or id < 1 or id > 255 or type(expected) ~= "table" or expected.id ~= id then
      return result(false, "The unit is no longer available. Refresh the Map and try again.")
    end
    if profile.version ~= 1 or profile.kind ~= "fe-map" then
      return result(false, "Cursor navigation is not available for this game.")
    end
    if not input or type(input.focusUnit) ~= "function" then
      return result(false, "Game cursor navigation is unavailable in this app version.")
    end
    if not unitAddress(id) then return result(false, "This unit is outside the app's supported map slots.") end
    if profile.gameCode then
      for i = 1, 4 do
        if mem.u8(0x080000AC + i - 1) ~= profile.gameCode:byte(i) then
          return result(false, "This cursor profile does not match the loaded game.")
        end
      end
    end
    local width, height, cx, cy = mapState()
    if not width then return result(false, "The game is not on a valid map.") end
    local chapter, turn = mem.u8(profile.chapter), mem.u16(profile.turn)
    local current = tostring(chapter) .. ":" .. tostring(turn) .. ":" .. tostring(cx) .. ":" .. tostring(cy)
    if context ~= current or expected.mapPickContext ~= current then
      return result(false, "The Map changed. Choose the unit again.")
    end
    if mem.u8(profile.chapter + 1) ~= 0 or mem.u8(profile.bm + 1) ~= 0 or mem.u8(profile.bm + 2) ~= 0 then
      return result(false, "Wait until the game's free map cursor is available.")
    end
    if not modeAllowed() then return result(false, "Cursor movement is available in tactical map mode.") end
    local idle, players = false, 0
    for i = 0, 63 do
      local proc = profile.procs + i * 108
      if mem.u32(proc) == profile.playerScript then
        players = players + 1
        idle = mem.u32(proc + 4) == profile.idlePc and mem.u8(proc + 0x28) == 0
          and (mem.u8(proc + 0x27) & 0x09) == 0
      end
    end
    if not idle or players ~= 1 then return result(false, "Close the game's menu or action before moving its cursor.") end
    if not targetValid(id, expected, width, height) then
      return result(false, "The unit changed or is no longer visible at that map position.")
    end
    -- Existing Plus returns no Lua value. A normal return means queued, never
    -- that the asynchronous game cursor has already reached the target.
    input.focusUnit(id)
    pending = { id = id, chapter = chapter, turn = turn, expected = {
      characterPointer = expected.characterPointer, classPointer = expected.classPointer, x = expected.x, y = expected.y } }
    -- A normal tap stays silent while the game moves its cursor. Publishing
    -- pending text would insert a row above the chapter and resize the map.
    local action = result(false, "", true)
    -- Clear an old companion-only pick; never select the requested unit in UI.
    action.set.mapPickedId, action.set.mapPickedContext = 0, ""
    return action
  end
  local function observe(v)
    if not pending then return end
    local width, height, cx, cy = mapState()
    if not width or mem.u8(profile.chapter) ~= pending.chapter or mem.u16(profile.turn) ~= pending.turn
      or mem.u8(profile.chapter + 1) ~= 0 or v.unitLocked or v.forecastActive or v.menuSelectionActive
      or not modeAllowed() or not targetValid(pending.id, pending.expected, width, height) then
      pending = nil
      return result(false, "The map or unit changed. Choose the unit again.")
    end
    if cx == pending.expected.x and cy == pending.expected.y then
      pending = nil
      return result(true, "")
    end
  end
  return request, observe
end
