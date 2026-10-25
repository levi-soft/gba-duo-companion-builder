-- Tactical map, movement ranges, danger cache and roster.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local profile = pack.require("game.profile")

return function(D)
  local chars, classes, slots = D.chars, D.classes, D.slots
  actions = actions or {}
  function actions.focusMapUnit(id)
    local n = tonumber(id)
    if n and slots[n] and input and input.focusUnit then
      input.focusUnit(n)
    end
  end
  local mapCfg, mapMeta, mapSlots, mapWeapons =
    {
      allyColor = "#54d778",
      respectFog = true,
      enemyColor = "#ef4456",
      showRanges = true,
      dangerColor = "#b52b77",
      attackColor = "#ed4357",
      chapter = profile.chapter,
      playerColor = "#438cff",
      respectAiHold = true,
      moveColor = "#367ce8",
      cursorColor = "#ffe173",
      turn = profile.turn,
    }, D.mapMeta, D.slots, D.mapWeapons
  local fe8Chapters = D.fe8Chapters

  local function mapUsableWeapons(u, c, k)
    local result = {}
    local attrs = (c.attributes or 0) | (k.attributes or 0)
    local status = mem.u8(u + 48) & 15
    for slot = 0, 4 do
      local raw = mem.u16(u + 30 + slot * 2)
      local item = mapWeapons[raw % 256]
      if
        raw ~= 0
        and item
        and ((item.a & 8) ~= 0 or (raw >> 8) > 0)
        and (item.r == 0 or (attrs & item.r) == item.r)
        and ((item.a & 0x400) ~= 0 or item.t >= 8 or mem.u8(u + 40 + item.t) >= item.rank)
        and not (status == 3 and (item.a & 2) ~= 0)
      then
        result[#result + 1] = { item = item, raw = raw }
      end
    end
    return result
  end
  local function mapUnitReach(v, focus, grid, terrain)
    local w, h = v.mapWidth, v.mapHeight
    if not focus or focus.x >= w or focus.y >= h or (focus.state & 0x20) ~= 0 then
      return {}, 0, {}
    end
    local weather = mem.u8(0x0202BD05)
    local costs = (focus.state & 0x800) ~= 0 and mapMeta.ballistaCosts
      or focus.k.movementCosts[(weather == 1 or weather == 2) and 3 or weather == 4 and 2 or 1]
    local move = math.max(0, math.min(31, focus.k.move + mem.s8(focus.u + 29)))
    local aiA, aiB = mem.u8(focus.u + 66), mem.u8(focus.u + 68)
    if
      focus.status == 2
      or (mapCfg.respectAiHold ~= false and focus.id >= 64 and aiB == 3 and aiA >= 3 and aiA <= 5)
    then
      move = 0
    end
    local dist, buckets = {}, {}
    for n = 0, w * h - 1 do
      dist[n] = 255
    end
    for n = 0, move do
      buckets[n] = {}
    end
    local start = focus.y * w + focus.x
    dist[start] = 0
    buckets[0][1] = start
    for spent = 0, move do
      for _, index in ipairs(buckets[spent]) do
        if dist[index] == spent then
          local x, y = index % w, math.floor(index / w)
          for _, p in ipairs({ { x - 1, y }, { x + 1, y }, { x, y - 1 }, { x, y + 1 } }) do
            local nx, ny = p[1], p[2]
            if nx >= 0 and nx < w and ny >= 0 and ny < h then
              local id = grid[ny][nx]
              local cost = costs[terrain[ny][nx] + 1] or 255
              local next = spent + cost
              local n = ny * w + nx
              if
                (id == 0 or ((id ~ focus.id) & 128) == 0)
                and cost >= 1
                and cost < 255
                and next <= move
                and next < dist[n]
              then
                dist[n] = next
                buckets[next][#buckets[next] + 1] = n
              end
            end
          end
        end
      end
    end
    local ranges = {}
    if focus.status ~= 2 then
      for _, entry in ipairs(focus.usable) do
        local range = entry.item.range
        local min, max = range >> 4, range & 15
        if min > 0 and max >= min then
          for r = min, max do
            ranges[r] = true
          end
        end
      end
    end
    local attacked = {}
    for index = 0, w * h - 1 do
      if dist[index] <= move then
        local x, y = index % w, math.floor(index / w)
        local occupant = grid[y][x]

        if occupant == 0 or occupant == focus.id then
          for r in pairs(ranges) do
            for dy = -r, r do
              local ny = y + dy
              local dx = r - math.abs(dy)
              if ny >= 0 and ny < h then
                local nx = x - dx
                if nx >= 0 and nx < w then
                  attacked[ny * w + nx] = true
                end
                nx = x + dx
                if nx >= 0 and nx < w then
                  attacked[ny * w + nx] = true
                end
              end
            end
          end
        end
      end
    end
    return dist, move, attacked
  end
  local mapDangerCache = { key = nil, cells = {}, next = 1 }
  local function applyMapDanger(v, units, grid, terrain)
    v.mapDangerEnabled = ui and ui.mapDangerEnabled == true or false
    v.mapDangerDisabled = not v.mapDangerEnabled
    v.mapDangerReady = true
    v.mapDangerCount = 0
    v.mapDangerLabel = v.mapDangerEnabled and "Danger ON" or "Danger OFF"
    if not v.mapDangerEnabled then
      return
    end
    local parts = {
      tostring(v.mapWidth),
      ":",
      tostring(v.mapHeight),
      ":",
      tostring(mem.u8(mapCfg.chapter)),
      ":",
      tostring(mem.u8(0x0202BD05)),
      tostring(mapCfg.respectFog),
      tostring(mapCfg.respectAiHold),
    }
    for y = 0, v.mapHeight - 1 do
      for x = 0, v.mapWidth - 1 do
        parts[#parts + 1] = string.char(terrain[y][x], grid[y][x])
      end
    end
    local enemies = {}
    for id = 1, 255 do
      local unit = units[id]
      if unit then
        parts[#parts + 1] = string.char(id)
        for n = 0, 71 do
          parts[#parts + 1] = string.char(mem.u8(unit.u + n))
        end
        if id >= 128 and not (mapCfg.respectFog ~= false and (unit.state & 0x200) ~= 0) then
          enemies[#enemies + 1] = unit
        end
      end
    end
    local key = table.concat(parts)
    if key ~= mapDangerCache.key then
      mapDangerCache = { key = key, cells = {}, next = 1 }
    end
    -- Bound work per update; publish only the complete union, never a partial danger map.
    local stop = math.min(#enemies, mapDangerCache.next + 3)
    for n = mapDangerCache.next, stop do
      local _, _, attacked = mapUnitReach(v, enemies[n], grid, terrain)
      for index in pairs(attacked) do
        mapDangerCache.cells[index] = true
      end
    end
    mapDangerCache.next = stop + 1
    v.mapDangerReady = mapDangerCache.next > #enemies
    if not v.mapDangerReady then
      v.mapDangerLabel = "Danger..."
      return
    end
    for index in pairs(mapDangerCache.cells) do
      v.mapCells[index + 1].danger = true
      v.mapDangerCount = v.mapDangerCount + 1
    end
  end
  local function applyMapTactical(v, tr, ur, cx, cy, selected)
    local w, h = v.mapWidth, v.mapHeight
    local groups = { Player = {}, Enemy = {}, Ally = {} }
    local units = {}
    local grid, terrain = {}, {}
    for y = 0, h - 1 do
      local ids, ts = {}, {}
      for x = 0, w - 1 do
        ids[x] = mem.u8(mem.u32(ur + y * 4) + x)
        ts[x] = mem.u8(mem.u32(tr + y * 4) + x)
      end
      grid[y] = ids
      terrain[y] = ts
    end
    local selectedId = selected and mem.u8(selected + 11) or (grid[cy] and grid[cy][cx] or 0)
    v.mapPickContext = tostring(mem.u8(mapCfg.chapter))
      .. ":"
      .. tostring(mem.u16(mapCfg.turn))
      .. ":"
      .. tostring(cx)
      .. ":"
      .. tostring(cy)
    local picked = ui and tonumber(ui.mapPickedId) or 0
    if picked and picked > 0 then
      if not selected and ui.mapPickedContext == v.mapPickContext then
        selectedId = picked
      else
        v.ui = v.ui or {}
        v.ui.set = v.ui.set or {}
        v.ui.set.mapPickedId = 0
      end
    end
    for id, u in pairs(mapSlots) do
      local state = mem.u32(u + 12)
      local hp = mem.u8(u + 19)
      local c, k = mapMeta.chars[mem.u32(u)], mapMeta.classes[mem.u32(u + 4)]
      if c and k and hp > 0 and (state & 0x1000c) == 0 then
        local usable = mapUsableWeapons(u, c, k)
        local entry = usable[1]
        local weapon = entry and entry.item
        local unit = {
          id = id,
          u = u,
          state = state,
          c = c,
          k = k,
          usable = usable,
          x = mem.u8(u + 16),
          y = mem.u8(u + 17),
          status = mem.u8(u + 48) & 15,
        }
        units[id] = unit
        if not (id >= 128 and (state & 0x200) ~= 0 and mapCfg.respectFog ~= false) then
          local group = id < 64 and "Player" or id < 128 and "Ally" or "Enemy"
          local color = id < 64 and mapCfg.playerColor or id < 128 and mapCfg.allyColor or mapCfg.enemyColor
          local portrait = c.portrait ~= "" and c.portrait or k.portrait
          local hasDrop = false
          if (state & 0x1000) ~= 0 then
            for slot = 0, 4 do
              if mem.u16(u + 30 + slot * 2) ~= 0 then
                hasDrop = true
              end
            end
          end
          groups[group][#groups[group] + 1] = {
            id = id,
            isHeader = false,
            member = true,
            hasDrop = hasDrop,
            name = c.name,
            portrait = portrait,
            missingPortrait = portrait == "",
            hp = hp,
            maxHp = mem.u8(u + 18),
            weapon = weapon and weapon.name or "No weapon",
            weaponIcon = weapon and weapon.icon or "",
            weaponUses = weapon
                and ((weapon.a & 8) ~= 0 and "--" or tostring(entry.raw >> 8) .. "/" .. weapon.maxUses)
              or "--",
            color = color,
            selected = id == selectedId,
          }
        end
      end
    end
    v.mapRoster = {}
    for _, group in ipairs({ "Player", "Enemy", "Ally" }) do
      table.sort(groups[group], function(a, b)
        return a.id < b.id
      end)
      local color = group == "Player" and mapCfg.playerColor
        or group == "Enemy" and mapCfg.enemyColor
        or mapCfg.allyColor
      v.mapRoster[#v.mapRoster + 1] = { isHeader = true, member = false, label = group, color = color }
      for _, unit in ipairs(groups[group]) do
        v.mapRoster[#v.mapRoster + 1] = unit
      end
    end
    v.mapHasDrops = false
    for _, unit in ipairs(v.mapRoster) do
      if unit.hasDrop then
        v.mapHasDrops = true
      end
    end
    local focus = units[selectedId]
    v.mapRangeUnit = focus and focus.c.name or ""
    v.mapMoveCount = 0
    v.mapAttackCount = 0
    for _, cell in ipairs(v.mapCells) do
      cell.move = false
      cell.attack = false
      cell.inRange = false
      cell.picked = false
      cell.danger = false
      cell.dangerColor = mapCfg.dangerColor or "#b52b77"
      cell.rangeColor = "transparent"
    end
    applyMapDanger(v, units, grid, terrain)
    if
      focus
      and picked
      and picked > 0
      and not selected
      and ui.mapPickedContext == v.mapPickContext
      and focus.x < w
      and focus.y < h
    then
      v.mapCells[focus.y * w + focus.x + 1].picked = true
    end
    if
      not focus
      or mapCfg.showRanges == false
      or focus.x >= w
      or focus.y >= h
      or (focus.state & 0x20) ~= 0
    then
      return
    end
    local dist, move, attacked = mapUnitReach(v, focus, grid, terrain)
    for index = 0, w * h - 1 do
      if dist[index] and dist[index] <= move then
        v.mapCells[index + 1].move = true
        v.mapMoveCount = v.mapMoveCount + 1
      end
    end
    for index in pairs(attacked) do
      if not v.mapCells[index + 1].move then
        v.mapCells[index + 1].attack = true
        v.mapAttackCount = v.mapAttackCount + 1
      end
    end
    for _, cell in ipairs(v.mapCells) do
      cell.inRange = cell.move or cell.attack
      cell.rangeColor = cell.move and (mapCfg.moveColor or "#367ce8")
        or cell.attack and (mapCfg.attackColor or "#ed4357")
        or "transparent"
    end
  end
  -- BE8P terrain indices, shared minimap chip arrangement verified in its ROM.
  local function applyMapTile(x, y, tr, w, h)
    local function at(a, b)
      if a < 0 or b < 0 or a >= w or b >= h then
        return 0
      end
      return mem.u8(mem.u32(tr + b * 4) + a)
    end
    local t = at(x, y)
    local function connects(test)
      return (test(at(x, y + 1)) and 8 or 0)
        + (test(at(x, y - 1)) and 4 or 0)
        + (test(at(x + 1, y)) and 2 or 0)
        + (test(at(x - 1, y)) and 1 or 0)
    end
    if t == 2 then
      return 0x40 + connects(function(n)
        return n == t
      end)
    end
    if t == 0x10 then
      return 0x60
        + connects(function(n)
          return n == 0x10 or n == 0x15 or n == 0x36 or n == 0x16 or n == 0x13
        end)
    end
    if t == 0x15 or t == 0x16 or t == 0x2f or t == 0x35 or t == 0x36 or t == 0x3c then
      return 0x30
        + connects(function(n)
          return n == t or n == 0 or n == 0x15 or n == 0x36 or n == 0x3d
        end)
    end
    if t == 0x13 or t == 0x34 then
      return (at(x - 1, y) == t or at(x + 1, y) == t) and 0x10 or 0x18
    end
    local fixed = {
      [1] = 1,
      [3] = 2,
      [4] = 2,
      [5] = 2,
      [6] = 3,
      [7] = 3,
      [8] = 4,
      [10] = 5,
      [11] = 6,
      [12] = 8,
      [13] = 9,
      [14] = 10,
      [15] = 10,
      [17] = 11,
      [18] = 20,
      [23] = 12,
      [24] = 12,
      [29] = 13,
      [30] = 22,
      [31] = 14,
      [32] = 15,
      [33] = 15,
      [35] = 2,
      [37] = 26,
      [38] = 0x58,
      [39] = 19,
      [40] = 19,
      [41] = 19,
      [42] = 0x3a,
      [45] = 17,
      [49] = 25,
      [51] = 8,
      [55] = 6,
      [56] = 2,
      [58] = 0x58,
      [59] = 27,
      [62] = 12,
    }
    if fixed[t] then
      return fixed[t]
    end
    if t == 0 then
      return 0
    end
    return 0x20 + connects(function(n)
      return n == t
    end)
  end
  local function applyMap(v, selected, preparationsActive)
    local w, h = mem.u16(profile.mapWidth), mem.u16(profile.mapHeight)
    local tr, ur = mem.u32(profile.terrainRows), mem.u32(profile.unitRows)
    v.mapPresent = false
    v.mapCells = {}
    v.mapRoster = {}
    v.mapPlayerCount = 0
    v.mapEnemyCount = 0
    v.mapAllyCount = 0
    if preparationsActive then
      return
    end
    if w < 1 or h < 1 or w > 64 or h > 64 or tr < 0x02000000 or ur < 0x02000000 then
      return
    end
    local cx, cy = mem.u16(profile.cursorX), mem.u16(profile.cursorY)
    v.mapWidth = w
    v.mapHeight = h
    v.mapPresent = true
    v.mapAspect = w / h
    v.mapColumns = "repeat(" .. w .. ",1fr)"
    v.mapRows = "repeat(" .. h .. ",1fr)"
    local chapter = mem.u8(mapCfg.chapter)
    local chapterInfo = fe8Chapters[chapter + 1]
    v.mapChapter = (chapter == 0 and "Prologue: " or "Ch. " .. chapter .. ": ")
      .. (chapterInfo and chapterInfo.name or "---")
    v.mapVictory = chapterInfo and chapterInfo.victory or "---"
    v.mapTurn = mem.u16(mapCfg.turn)
    v.mapPlayerColor = mapCfg.playerColor
    v.mapEnemyColor = mapCfg.enemyColor
    v.mapAllyColor = mapCfg.allyColor
    for y = 0, h - 1 do
      for x = 0, w - 1 do
        local id = mem.u8(mem.u32(ur + y * 4) + x)
        local color = id == 0 and "transparent"
          or id < 64 and mapCfg.playerColor
          or id < 128 and mapCfg.allyColor
          or mapCfg.enemyColor
        v.mapCells[#v.mapCells + 1] = {
          tile = "asset:images/minimap/" .. applyMapTile(x, y, tr, w, h) .. ".png",
          marker = id ~= 0,
          color = color,
          cursor = x == cx and y == cy,
          cursorColor = mapCfg.cursorColor,
        }
      end
    end
    applyMapTactical(v, tr, ur, cx, cy, selected)
    for id, u in pairs(mapSlots) do
      if
        mem.u32(u) ~= 0
        and mem.u32(u + 4) ~= 0
        and mem.u8(u + 19) > 0
        and (mem.u32(u + 12) & 0x1000c) == 0
      then
        local key = id < 64 and "mapPlayerCount" or id < 128 and "mapAllyCount" or "mapEnemyCount"
        v[key] = v[key] + 1
      end
    end
  end

  return { apply = applyMap, meta = mapMeta }
end
