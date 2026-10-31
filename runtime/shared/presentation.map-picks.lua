-- Sparse marker geometry and the existing Plus native D-pad cursor action.
-- Publication and tap-time validation are read-only; the game owns movement.
return function(D, memory, config)
  local mem = memory or mem
  local metadata = D.mapMeta or D
  local lastContext, selectable, focusCursor, observeCursor
  selectable = {}
  actions = actions or {}
  function actions.focusMapUnit(value, context)
    local id = tonumber(value)
    if not id or id % 1 ~= 0 or id < 1 or id > 255 or not selectable[id]
      or not lastContext or (context ~= nil and context ~= lastContext) then return {} end
    if not focusCursor then focusCursor, observeCursor = pack.require("game.cursor-focus")(D) end
    return focusCursor(id, context or lastContext, selectable[id])
  end
  local function ram(address, length)
    return address >= 0x02000000 and address + length <= 0x02040000
      or address >= 0x03000000 and address + length <= 0x03008000
  end
  local function appendAction(v, action)
    if not action then return end
    if v.ui == nil then v.ui = action
    elseif type(v.ui) == "table" and v.ui[1] == nil then
      v.ui.set = v.ui.set or {}
      for key, value in pairs(action.set) do v.ui.set[key] = value end
    elseif type(v.ui) == "table" then v.ui[#v.ui + 1] = action
    else v.ui = { v.ui, action } end
  end
  return function(v)
    if observeCursor then appendAction(v, observeCursor(v)) end
    lastContext, selectable = nil, {}
    v.mapPickTargets = {}
    -- Base maps have already validated/read their occupancy grid. Reuse that
    -- same frame instead of adding a second cell read for hit-target geometry.
    local occupied = {}
    for index, cell in ipairs(v.mapCells or {}) do
      occupied[index], cell.unitId = cell.unitId, 0
    end
    local w, h = v.mapWidth, v.mapHeight
    if v.mapPresent ~= true or type(v.mapPickContext) ~= "string" or v.mapPickContext == ""
      or not w or not h or w < 1 or h < 1 or w > 64 or h > 64
      or not v.mapCells or #v.mapCells ~= w * h then return v end
    local canPick = not v.unitLocked and not v.forecastActive and not v.menuSelectionActive
    for _, entry in ipairs(v.mapRoster or {}) do
      local id = entry.member and entry.id
      local unit = id and D.slots[id]
      if unit and ram(unit, 0x48) and mem.u8(unit + 11) == id
        and metadata.chars[mem.u32(unit)] and metadata.classes[mem.u32(unit + 4)]
        and mem.u8(unit + 19) > 0 and (mem.u32(unit + 12) & 0x1002c) == 0
        and (id < 128 or config and config.respectFog == false or (mem.u32(unit + 12) & 0x200) == 0) then
        local x, y = mem.u8(unit + 16), mem.u8(unit + 17)
        if x < w and y < h then
          if occupied[y * w + x + 1] == id then
            v.mapCells[y * w + x + 1].unitId = id
            if canPick then
              local target = {
                id = id, mapPickContext = v.mapPickContext, x = x, y = y,
                characterPointer = mem.u32(unit), classPointer = mem.u32(unit + 4),
                left = tostring(x * 100 / w) .. "%", top = tostring(y * 100 / h) .. "%",
                width = tostring(100 / w) .. "%", height = tostring(100 / h) .. "%",
              }
              selectable[id] = target
              v.mapPickTargets[#v.mapPickTargets + 1] = target
            end
          end
        end
      end
    end
    if canPick then lastContext = v.mapPickContext end
    return v
  end
end
