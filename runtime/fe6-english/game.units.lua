-- Native FE6 selection: cursor fallback and a verified player-action owner.
return function(D, map, memory)
  local profile = pack.require("game.profile")
  local function ram(a, n)
    return a >= 0x02000000 and a + n <= 0x02040000
  end
  local function valid(u, passenger)
    return u
      and D.validSlots[u]
      and D.chars[mem.u32(u)]
      and D.classes[mem.u32(u + 4)]
      and mem.u8(u + 11) == D.validSlots[u]
      and mem.u8(u + 17) > 0
      and (mem.u16(u + 12) & (passenger and 0x0C or 0x2C)) == 0
      and not (not passenger and mem.u8(u + 11) >= 128 and (mem.u16(u + 12) & 0x200) ~= 0)
  end
  local fill = pack.require("presentation.unit")(D, valid)
  local items = pack.require("game.items")(D)
  local battle = pack.require("game.battle")(D, memory)
  local preparations = pack.require("game.preparations")(D.slots, map.meta, profile, memory)
  local tick = 0
  local lastIdentity
  return function()
    tick = tick + 1
    local v = {}
    for key, value in pairs(D.defaults) do
      v[key] = value
    end
    v.unitPresent, v.unitAbsent, v.forecastActive, v.unitLocked = false, true, false, false
    local w, h = mem.u16(profile.mapWidth), mem.u16(profile.mapHeight)
    local rows, terrain = mem.u32(profile.unitRows), mem.u32(profile.terrainRows)
    local x, y = mem.u16(profile.cursorX), mem.u16(profile.cursorY)
    local active = mem.u32(profile.activeUnit)
    local playerPc, forecast = 0, false
    for n = 0, 63 do
      local q = profile.processPool + n * 108
      local script = mem.u32(q)
      if script == profile.playerProcess then
        playerPc = mem.u32(q + 4)
      elseif script == profile.forecastProcess and mem.u8(q + 0x33) == 1 and mem.u8(q + 0x34) == 0 then
        forecast = true
      end
    end
    local u, inPreparations = preparations()
    if inPreparations then
      if u then
        fill(v, u)
        items(v, u, true)
      end
    elseif w > 0 and h > 0 and w <= 64 and h <= 64 and ram(rows, h * 4) and ram(terrain, h * 4) then
      if x < w and y < h then
        local row = mem.u32(rows + y * 4)
        if ram(row, w) then
          u = D.slots[mem.u8(row + x)]
        end
      end
      if
        mem.u8(profile.phase) == 0
        and playerPc > profile.playerPcStart
        and playerPc <= profile.playerPcEnd
        and valid(active)
        and mem.u8(active + 11) < 64
      then
        u, v.unitLocked = active, true
      end
      if valid(u) then
        fill(v, u)
        items(v, u)
        v.forecastActive = forecast
        battle(v)
      end
    end
    map.apply(v, v.unitLocked and u or nil, inPreparations)
    local flash = tick % 6 < 3
    for _, name in ipairs({
      "dropPulse",
      "mapDropPulse",
      "forecastactorMultiFlash",
      "forecasttargetMultiFlash",
      "forecastactorTriangleFlash",
      "forecasttargetTriangleFlash",
    }) do
      v[name] = flash
    end
    v.travelerFlash = v.travelerPresent and flash
    v.conditionFlash = v.conditionActive and flash
    if profile.supportsDrops then
      for n = 1, 5 do
        v["item" .. n .. "DropFlash"] = v["item" .. n .. "Droppable"] and flash or false
      end
      v.mapDropFlash = v.mapHasDrops and flash or false
    end
    v.ui = v.ui or { set = {} }
    v.ui.set = v.ui.set or {}
    local identity = tostring(v.characterPointer) .. ":" .. tostring(v.deployment)
    for n = 1, 5 do
      identity = identity .. ":" .. tostring(v["item" .. n .. "Id"])
    end
    if identity ~= lastIdentity then
      v.ui.set.inventoryDetail = v.firstItemPage or "none"
      for n = 1, 5 do
        v.ui.set["itemSelected" .. n] = v["firstItemSelected" .. n] or false
      end
      lastIdentity = identity
    end
    v.ui.set.companionView = v.forecastActive and "battle" or "companion"
    if v.forecastActive then
      v.ui.set.mainTab, v.ui.set.navUnits, v.ui.set.navMap = "Units", true, false
    end
    return v
  end
end
