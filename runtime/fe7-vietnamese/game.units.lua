-- Selected unit and forecast bindings, defaults and UI pulse state.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local profile = pack.require("game.profile")

return function(D, map, values, abilities)
  local truth = values.truth
  local state = { pulseTick = 0, lastIdentity = nil }
  local mapMeta = map.meta
  local mapSlots = D.slots
  local mapCfg = map.config
  local applyMapSource = map.apply
  local emptyUnitValues = pack.require("presentation.defaults")(D, map, values, abilities, state)
  local validSlots = D.validSlots

  local readPreparations = pack.require("game.preparations")(D.slots, map.meta, profile)
  local bindFields = pack.require("game.bindings")(D, values, state)
  local readItems = pack.require("game.items")(D, map)
  local readBattle = pack.require("game.battle")(D)
  return function()
    local v = {}
    local unit, preparationsActive = readPreparations()
    if preparationsActive and not unit then
      return emptyUnitValues(true)
    end
    local playerPc, forecastProc, aiPc = 0, 0, 0
    for i = 0, 63 do
      local p = profile.processPool + i * 108
      local script = mem.u32(p)
      if script == profile.playerProcess then
        playerPc = mem.u32(p + 4)
      elseif script == profile.forecastProcess then
        forecastProc = p
      elseif script == profile.enemyProcess then
        aiPc = mem.u32(p + 4)
      end
    end
    local active = mem.u32(profile.activeUnit)
    -- Immutable validSlots metadata is initialized once above update().
    v.unitLocked = false
    v.forecastActive = false
    local faction = mem.u8(profile.phase)
    local playerOwns = playerPc >= profile.playerPcStart and playerPc <= profile.playerPcEnd and faction == 0
    local aiOwns = aiPc >= profile.enemyPcStart
      and aiPc <= profile.enemyPcEnd
      and (faction == 0x40 or faction == 0x80)
    if not preparationsActive and (playerOwns or aiOwns) and validSlots[active] then
      local state = mem.u32(active + 12)
      local deployment = mem.u8(active + 11)
      if
        mem.u32(active) ~= 0
        and mem.u32(active + 4) ~= 0
        and deployment > 0
        and (deployment & 0xc0) == faction
        and deployment == validSlots[active]
        and (state & 0x1000C) == 0
      then
        unit = active
        v.unitLocked = true
        v.forecastActive = playerOwns
          and forecastProc ~= 0
          and mem.u8(forecastProc + 0x33) == 1
          and mem.u8(forecastProc + 0x34) == 0
      end
    end
    if not unit then
      local cursorX, cursorY = mem.u16(profile.cursorX), mem.u16(profile.cursorY)
      local width, height = mem.u16(profile.mapWidth), mem.u16(profile.mapHeight)
      if
        width == 0
        or height == 0
        or width > 512
        or height > 512
        or cursorX >= width
        or cursorY >= height
      then
        return emptyUnitValues()
      end
      local rows = mem.u32(profile.unitRows)
      if rows < 0x02000000 or rows + height * 4 > 0x02040000 then
        return emptyUnitValues()
      end
      local row = mem.u32(rows + cursorY * 4)
      if row < 0x02000000 or row + width > 0x02040000 then
        return emptyUnitValues()
      end
      unit = mapSlots[mem.u8(row + cursorX)]
      if not unit then
        return emptyUnitValues()
      end
    end
    local slotId = mem.u8(unit + 11)
    if
      not mapMeta.chars[mem.u32(unit)]
      or not mapMeta.classes[mem.u32(unit + 4)]
      or mapSlots[slotId] ~= unit
      or mem.u8(unit + 19) == 0
      or (mem.u32(unit + 12) & (preparationsActive and 0x10004 or 0x1000c)) ~= 0
      or (
        not v.unitLocked
        and slotId >= 128
        and mapCfg.respectFog ~= false
        and (mem.u32(unit + 12) & 0x200) ~= 0
      )
    then
      return emptyUnitValues()
    end
    v.unitPresent, v.unitAbsent = true, false
    v["hp"] = mem.u8((unit + 19))
    v["maxHp"] = mem.u8((unit + 18))
    v["level"] = mem.u8((unit + 8))
    v["exp"] = mem.u8((unit + 9))
    v["str"] = mem.u8((unit + 20))
    v["skill"] = mem.u8((unit + 21))
    v["spd"] = mem.u8((unit + 22))
    v["def"] = mem.u8((unit + 23))
    v["res"] = mem.u8((unit + 24))
    v["luck"] = mem.u8((unit + 25))
    v["characterPointer"] = mem.u32((unit + 0))
    v["classPointer"] = mem.u32((unit + 4))
    v["conBonus"] = mem.s8((unit + 26))
    v["movBonus"] = mem.s8((unit + 29))
    v["rescueId"] = mem.u8((unit + 27))
    v["statusByte"] = mem.u8((unit + 48))
    v["deployment"] = mem.u8((unit + 11))
    v["unitState"] = mem.u32((unit + 12))
    v["unitX"] = mem.u8((unit + 16))
    v["unitY"] = mem.u8((unit + 17))
    v["rankSwordRaw"] = mem.u8((unit + 40))
    v["rankLanceRaw"] = mem.u8((unit + 41))
    v["rankAxeRaw"] = mem.u8((unit + 42))
    v["rankBowRaw"] = mem.u8((unit + 43))
    v["rankStaffRaw"] = mem.u8((unit + 44))
    v["rankAnimaRaw"] = mem.u8((unit + 45))
    v["rankLightRaw"] = mem.u8((unit + 46))
    v["rankDarkRaw"] = mem.u8((unit + 47))
    v["support1Exp"] = mem.u8((unit + 50))
    v["support2Exp"] = mem.u8((unit + 51))
    v["support3Exp"] = mem.u8((unit + 52))
    v["support4Exp"] = mem.u8((unit + 53))
    v["support5Exp"] = mem.u8((unit + 54))
    v["item1"] = mem.u16((unit + 30))
    v["item2"] = mem.u16((unit + 32))
    v["item3"] = mem.u16((unit + 34))
    v["item4"] = mem.u16((unit + 36))
    v["item5"] = mem.u16((unit + 38))
    local bound = bindFields(v, unit)
    if bound ~= v then
      return bound
    end
    applyMapSource(v, unit, preparationsActive)
    readItems(v, unit)
    readBattle(v)
    state.pulseTick = state.pulseTick + 1
    local studioPulseOn = ((state.pulseTick * 200) % 1000) < 500
    v.item1DropFlash = truth(v.item1Droppable) and studioPulseOn
    v.item2DropFlash = truth(v.item2Droppable) and studioPulseOn
    v.item3DropFlash = truth(v.item3Droppable) and studioPulseOn
    v.item4DropFlash = truth(v.item4Droppable) and studioPulseOn
    v.item5DropFlash = truth(v.item5Droppable) and studioPulseOn
    v.travelerFlash = truth(v.travelerPresent) and studioPulseOn
    v.conditionFlash = truth(v.conditionActive) and studioPulseOn
    v.forecastactorMultiFlash = truth(v.forecastactorHasMulti) and studioPulseOn
    v.forecastactorHpFlash = truth(v.forecastactorHasLoss) and studioPulseOn
    v.forecastactorTriangleFlash = truth(v.forecastactorTriangle) and studioPulseOn
    v.forecasttargetMultiFlash = truth(v.forecasttargetHasMulti) and studioPulseOn
    v.forecasttargetHpFlash = truth(v.forecasttargetHasLoss) and studioPulseOn
    v.forecasttargetTriangleFlash = truth(v.forecasttargetTriangle) and studioPulseOn
    v.mapDropFlash = truth(v.mapHasDrops) and studioPulseOn
    local identity = table.concat({
      tostring(v["characterPointer"]),
      tostring(v["deployment"]),
      tostring(v["item1Id"]),
      tostring(v["item2Id"]),
      tostring(v["item3Id"]),
      tostring(v["item4Id"]),
      tostring(v["item5Id"]),
    }, "|")
    if identity ~= state.lastIdentity then
      v.ui = {
        set = {
          ["inventoryDetail"] = v["firstItemPage"],
          ["itemSelected1"] = v["firstItemSelected1"],
          ["itemSelected2"] = v["firstItemSelected2"],
          ["itemSelected3"] = v["firstItemSelected3"],
          ["itemSelected4"] = v["firstItemSelected4"],
          ["itemSelected5"] = v["firstItemSelected5"],
        },
      }
      state.lastIdentity = identity
    end
    v.ui = v.ui or {}
    v.ui.set = v.ui.set or {}
    v.ui.set.companionView = v.forecastActive and "battle" or "companion"
    if v.forecastActive then
      v.ui.set.mainTab = "Units"
      v.ui.set.navUnits = true
      v.ui.set.navMap = false
    end
    local cl = mapMeta.classes[v.classPointer]
    local faction = (v.deployment or 0) >> 6
    v.mapSprite = cl and cl.mapSprites[faction == 1 and 2 or faction >= 2 and 3 or 1] or ""
    return v
  end
end
