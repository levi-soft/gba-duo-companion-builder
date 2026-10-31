-- Tactical map, movement ranges, danger cache and roster.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local profile = pack.require("game.profile")
local chapterTitle = pack.require("presentation.chapter")

return function(D, memory, tileReader)
  local mem = memory or mem
  local mapCfg = {
    ["kind"] = profile.mapKind or "fe7-us-v1",
    ["size"] = profile.mapWidth,
    ["unitRows"] = profile.unitRows,
    ["terrainRows"] = profile.terrainRows,
    ["cursor"] = profile.cursorX,
    ["chapter"] = profile.chapter,
    ["turn"] = profile.turn,
    ["tilePrefix"] = "asset:images/minimap/",
    ["playerColor"] = "#438cff",
    ["enemyColor"] = "#ef4456",
    ["allyColor"] = "#54d778",
    ["cursorColor"] = "#ffe173",
    ["maxDimension"] = 64,
    ["showRanges"] = true,
    ["respectAiHold"] = true,
    ["respectFog"] = true,
    ["moveColor"] = "#367ce8",
    ["attackColor"] = "#ed4357",
    ["dangerColor"] = "#b52b77",
  }
  local mapRecipe = D.mapRecipe
  local mapMeta = D.mapMeta
  local mapSlots = D.slots
  local mapWeapons = D.mapWeapons

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
    local weather = mem.u8(profile.weather or 0x0202BC0D)
    local costs = profile.supportsBallista ~= false and (focus.state & 0x800) ~= 0 and mapMeta.ballistaCosts
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
      tostring(mem.u8(profile.weather or 0x0202BC0D)),
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
        if memory then
          -- FE6's read adapter remaps byte fields independently; a word read
          -- there is not always the same four bytes. Preserve its exact key.
          for n = 0, 71 do parts[#parts + 1] = string.char(mem.u8(unit.u + n)) end
        else
          for n = 0, 71, 4 do
            local word = mem.u32(unit.u + n)
            parts[#parts + 1] = string.char(word & 255, (word >> 8) & 255, (word >> 16) & 255, (word >> 24) & 255)
          end
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
  -- Only numeric reach results are retained. Native/query-backed inputs must
  -- run their dependency checks on every update and never enter this cache.
  local selectedReachCache
  local function selectedMapUnitReach(v, focus, grid, terrain)
    if D.nativeMovementVerified == true or D.mapReachForUnit or D.mapMoveForUnit or D.mapMovementStatus
      or D.mapMovementCostsForUnit or D.mapAiHoldForUnit or D.mapWeaponsForUnit
      or D.mapRangesReady or D.mapRangeRevision then
      selectedReachCache = nil
      return mapUnitReach(v, focus, grid, terrain)
    end
    local weather = mem.u8(profile.weather or 0x0202BC0D)
    local parts = {
      v.mapDangerEnabled and "danger" or "selected",
      string.char(v.mapWidth, v.mapHeight, focus.id, weather,
        mapCfg.respectFog == false and 0 or 1, mapCfg.respectAiHold == false and 0 or 1,
        profile.supportsBallista == false and 0 or 1, mapCfg.showRanges == false and 0 or 1),
    }
    if v.mapDangerEnabled and mapDangerCache.key then
      -- This key was built from this update's complete grids and live units.
      parts[#parts + 1] = mapDangerCache.key
    else
      for y = 0, v.mapHeight - 1 do
        parts[#parts + 1] = string.char(table.unpack(terrain[y], 0, v.mapWidth - 1))
        parts[#parts + 1] = string.char(table.unpack(grid[y], 0, v.mapWidth - 1))
      end
      if memory then
        for n = 0, 71 do parts[#parts + 1] = string.char(mem.u8(focus.u + n)) end
      else
        for n = 0, 71, 4 do
          local word = mem.u32(focus.u + n)
          parts[#parts + 1] = string.char(word & 255, (word >> 8) & 255, (word >> 16) & 255, (word >> 24) & 255)
        end
      end
    end
    local key = table.concat(parts)
    if selectedReachCache and selectedReachCache.key == key then
      return selectedReachCache.distances, selectedReachCache.movement, selectedReachCache.attacks
    end
    local distances, movement, attacks = mapUnitReach(v, focus, grid, terrain)
    -- Publish once, only after computation and construction both finish.
    -- The caller reads these arrays and builds fresh cells/roster/header values.
    selectedReachCache = { key = key, distances = distances, movement = movement, attacks = attacks }
    return distances, movement, attacks
  end

  local function applyMapTactical(v, grid, terrain, cx, cy, selected)
    local w, h = v.mapWidth, v.mapHeight
    local groups = { Player = {}, Enemy = {}, Ally = {} }
    local units = {}
    local selectedId = selected and mem.u8(selected + 11) or (grid[cy] and grid[cy][cx] or 0)
    v.mapPickContext = tostring(mem.u8(mapCfg.chapter))
      .. ":"
      .. tostring(mem.u16(mapCfg.turn))
      .. ":"
      .. tostring(cx)
      .. ":"
      .. tostring(cy)
    local picked = ui and tonumber(ui.mapPickedId) or 0
    if v.ui and v.ui.set and v.ui.set.mapPickedId == 0 then picked = 0 end
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
          if profile.supportsDrops ~= false and (state & 0x1000) ~= 0 then
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
    if focus and focus.id >= 128 and mapCfg.respectFog ~= false and (focus.state & 0x200) ~= 0 then
      focus = nil
    end
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
    local dist, move, attacked = selectedMapUnitReach(v, focus, grid, terrain)
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
  local mapCacheKey = nil
  local mapCachedTiles = {}
  local mapBuildIndex = 0
  local function mapTile(x, y)
    if tileReader then
      return tileReader(x, y)
    end
    local r, stack = {}, {}
    for i = 0, 15 do
      r[i] = 0
    end
    r[0] = x
    r[1] = y
    r[14] = 4294967294
    local pc, cmp = mapRecipe.entry, 0
    local function val(a)
      return a[1] == -1 and r[a[2]] or a[2]
    end
    local function jump(a)
      if a == 4294967294 then
        return -1
      elseif a >= 268435456 then
        return (a - 268435456) / 2
      else
        return mapRecipe.addresses[a & 0xfffffffe]
      end
    end
    for step = 1, 3000 do
      if pc < 0 then
        return r[0]
      end
      local ins = mapRecipe.program[pc + 1]
      pc = pc + 1
      local op, a, b, c = ins[1], ins[2], ins[3], ins[4]
      if op == "push" then
        for i = #a, 1, -1 do
          stack[#stack + 1] = r[a[i]]
        end
      elseif op == "pop" then
        for i = 1, #a do
          r[a[i]] = table.remove(stack)
        end
      elseif op == "mov" or op == "movs" then
        if a[2] == 15 then
          pc = jump(val(b))
        else
          r[a[2]] = val(b)
        end
      elseif op == "adds" or op == "subs" or op == "lsls" then
        local l = val(c and b or a)
        local n = val(c or b)
        r[a[2]] = (op == "adds" and l + n or op == "subs" and l - n or l << n) & 0xffffffff
      elseif op == "cmp" then
        cmp = val(a) - val(b)
      elseif op == "literal" then
        r[a] = b == "terrainRows" and mapCfg.terrainRows or b
      elseif op == "ldr" or op == "ldrb" then
        local addr = (val(b) + val(c)) & 0xffffffff
        r[a] = mapRecipe.romWords[addr] or (op == "ldrb" and mem.u8(addr) or mem.u32(addr))
      elseif op == "bl" then
        r[14] = 268435456 + pc * 2
        pc = a
      elseif op == "bx" then
        pc = jump(r[a])
      elseif
        op == "b"
        or op == "beq" and cmp == 0
        or op == "bne" and cmp ~= 0
        or op == "bgt" and cmp > 0
        or op == "bls" and cmp <= 0
      then
        pc = a
      end
    end
    return 0
  end
  local function applyMapSource(v, selected, preparationsActive)
    v.mapPlayerColor = mapCfg.playerColor
    v.mapEnemyColor = mapCfg.enemyColor
    v.mapAllyColor = mapCfg.allyColor
    v.mapPresent = false
    v.mapRenderPending = false
    v.mapHasDrops = false
    v.mapDangerEnabled = false
    v.mapDangerDisabled = true
    v.mapDangerReady = true
    v.mapDangerLabel = "Danger OFF"
    v.mapDangerCount = 0
    v.mapRoster = {}
    v.mapCells = {}
    v.mapWidth = 0
    v.mapHeight = 0
    v.mapColumns = "repeat(1,1fr)"
    v.mapRows = "repeat(1,1fr)"
    v.mapAspect = 1.5
    v.mapChapter = "---"
    v.mapVictory = "---"
    v.mapTurn = "---"
    v.mapTerrain = "---"
    v.mapTerrainDef = "---"
    v.mapTerrainAvo = "---"
    v.mapTerrainRes = "---"
    v.mapUnitName = "---"
    v.mapUnitClass = "---"
    v.mapUnitHp = "---"
    v.mapUnitMaxHp = "---"
    v.mapUnitPortrait = ""
    v.mapUnitMissing = true
    v.mapPlayerCount = 0
    v.mapEnemyCount = 0
    v.mapAllyCount = 0
    if ui and ui.mainTab ~= nil and ui.mainTab ~= "Map" then return end
    if preparationsActive then
      return
    end
    local w, h = mem.u16(mapCfg.size), mem.u16(mapCfg.size + 2)
    if w < 1 or h < 1 or w > mapCfg.maxDimension or h > mapCfg.maxDimension then
      return
    end
    local tr, ur = mem.u32(mapCfg.terrainRows), mem.u32(mapCfg.unitRows)
    local function valid(a, n)
      return a >= 0x02000000 and a + n <= 0x02040000
    end
    if not valid(tr, h * 4) or not valid(ur, h * 4) then
      return
    end
    local terrainRows, unitRows = {}, {}
    for y = 0, h - 1 do
      local terrainRow, unitRow = mem.u32(tr + y * 4), mem.u32(ur + y * 4)
      if not valid(terrainRow, w) or not valid(unitRow, w) then
        return
      end
      terrainRows[y], unitRows[y] = terrainRow, unitRow
    end
    -- One fresh, validated grid per update. Signature, rendered cells and
    -- tactical ranges share it; no live grid survives into the next update.
    local grid, terrainGrid = {}, {}
    for y = 0, h - 1 do
      local ids, tiles = {}, {}
      for x = 0, w - 1 do
        ids[x], tiles[x] = mem.u8(unitRows[y] + x), mem.u8(terrainRows[y] + x)
      end
      grid[y], terrainGrid[y] = ids, tiles
    end
    if not v.unitLocked then
      selected = nil
    end
    local chapter = mem.u8(mapCfg.chapter)
    local cx, cy = mem.u16(mapCfg.cursor), mem.u16(mapCfg.cursor + 2)
    v.mapPresent = true
    v.mapWidth = w
    v.mapHeight = h
    v.mapColumns = "repeat(" .. w .. ",1fr)"
    v.mapRows = "repeat(" .. h .. ",1fr)"
    v.mapAspect = w / h
    v.mapChapter = chapterTitle(mapMeta.chapters[chapter], "Chapter " .. chapter)
    v.mapVictory = mapCfg.objectives and (mapCfg.objectives[chapter] or mapCfg.objectives[tostring(chapter)])
      or (mapMeta.chapters[chapter] and mapMeta.chapters[chapter].objectiveShort)
      or "---"
    v.mapTurn = mem.u16(mapCfg.turn)
    local parts = { tostring(chapter), tostring(w), tostring(h), tostring(tr) }
    for y = 0, h - 1 do
      for x = 0, w - 1 do
        parts[#parts + 1] = string.char(terrainGrid[y][x])
      end
    end
    local signature = table.concat(parts, "|")
    if signature ~= mapCacheKey then
      mapCachedTiles = {}
      mapBuildIndex = 0
      mapCacheKey = signature
    end
    local stop = math.min(w * h, mapBuildIndex + 256)
    for n = mapBuildIndex, stop - 1 do
      mapCachedTiles[n + 1] = mapTile(n % w, math.floor(n / w))
      mapBuildIndex = n + 1
    end
    if mapBuildIndex < w * h then
      v.mapPresent = false
      v.mapRenderPending = true
      return
    end
    for y = 0, h - 1 do
      for x = 0, w - 1 do
        local terrain = terrainGrid[y][x]
        local id = grid[y][x]
        local color = id == 0 and "transparent"
          or id < 64 and mapCfg.playerColor
          or id < 128 and mapCfg.allyColor
          or mapCfg.enemyColor
        local visible = id ~= 0
        local slot = mapSlots[id]
        if id >= 128 and mapCfg.respectFog ~= false and slot and (mem.u32(slot + 12) & 0x200) ~= 0 then
          visible = false
          color = "transparent"
        end
        v.mapCells[#v.mapCells + 1] = {
          tile = mapCfg.tilePrefix .. mapCachedTiles[y * w + x + 1] .. ".png",
          unitId = visible and id or 0,
          marker = visible,
          color = color,
          cursor = x == cx and y == cy,
          cursorColor = mapCfg.cursorColor,
        }
        if x == cx and y == cy then
          v.mapTerrain = mapMeta.terrains[terrain + 1] or "Terrain " .. terrain
          local u = visible and mapSlots[id] or nil
          if u then
            local char, cls = mapMeta.chars[mem.u32(u)], mapMeta.classes[mem.u32(u + 4)]
            if char and cls then
              v.mapUnitName = char.name
              v.mapUnitClass = cls.name
              v.mapUnitHp = mem.u8(u + 19)
              v.mapUnitMaxHp = mem.u8(u + 18)
              v.mapUnitPortrait = char.portrait ~= "" and char.portrait or cls.portrait
              v.mapUnitMissing = false
              v.mapTerrainDef = cls.defense[terrain + 1] or 0
              v.mapTerrainAvo = cls.avoid[terrain + 1] or 0
              v.mapTerrainRes = cls.resistance[terrain + 1] or 0
            end
          end
          if v.mapUnitMissing then
            local cls = mapMeta.classes[tonumber(mapMeta.defaultClass)]
            v.mapTerrainDef = cls.defense[terrain + 1] or 0
            v.mapTerrainAvo = cls.avoid[terrain + 1] or 0
            v.mapTerrainRes = cls.resistance[terrain + 1] or 0
          end
        end
      end
    end
    applyMapTactical(v, grid, terrainGrid, cx, cy, selected)
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

  local presentPicks = pack.require("presentation.map-picks")(D, mem, mapCfg)
  return { apply = function(v, selected, preparationsActive)
    applyMapSource(v, selected, preparationsActive)
    presentPicks(v)
  end, meta = mapMeta, config = mapCfg }
end
