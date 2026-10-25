-- FE6 minimap adjacency recipe; read-only terrain data.
local profile = pack.require("game.profile")
return function()
  local raw = mem
  return function(x, y)
    local rows, w, h = mem.u32(profile.terrainRows), mem.u16(profile.mapWidth), mem.u16(profile.mapHeight)
    local function at(dx, dy)
      local a, b = x + dx, y + dy
      if a < 0 or b < 0 or a >= w or b >= h then
        return 0
      end
      return raw.u8(raw.u32(rows + b * 4) + a)
    end
    local t = at(0, 0)
    local function links(predicate)
      local n = 0
      for _, d in ipairs({ { 0, 1 }, { 0, -1 }, { 1, 0 }, { -1, 0 } }) do
        n = n * 2 + (predicate(at(d[1], d[2])) and 1 or 0)
      end
      return n
    end
    if t == 2 then
      return 0x40 + links(function(a)
        return a == t
      end)
    end
    if t == 16 then
      return 0x60 + links(function(a)
        return a == 16 or a == 21 or a == 22 or a == 19
      end)
    end
    if t == 21 or t == 22 or t == 47 then
      return 0x30 + links(function(a)
        return a == t
      end)
    end
    if t == 19 then
      if at(1, 0) == 19 or at(-1, 0) == 19 then
        return 0x10
      end
      if at(0, 1) == 19 or at(0, -1) == 19 then
        return 0x18
      end
      if at(1, 0) == 16 or at(-1, 0) == 16 or at(1, 0) == 22 or at(-1, 0) == 22 then
        return 0x18
      end
      return 0x10
    end
    if t == 30 then
      return at(1, 0) == 30 and 0x16 or at(-1, 0) == 30 and 0x17 or 7
    end
    if t == 45 then
      return (at(1, 0) == 45 or at(-1, 0) == 45 or at(0, 1) == 45 or at(0, -1) == 45) and 0x12 or 0x11
    end
    if t == 25 or t == 26 or t == 27 or t == 28 or t == 34 or t == 43 or t == 44 or t == 46 then
      return 0x20 + links(function(a)
        return a == t
      end)
    end
    if t == 38 then
      local function water(a)
        return a == 21 or a == 22
      end
      if at(-1, 0) == t or at(1, 0) == t then
        return water(at(0, -1)) and 0x54 or water(at(0, 1)) and 0x50 or at(0, -1) == 15 and 0x5c or 0x58
      end
      if at(0, -1) == t or at(0, 1) == t then
        return water(at(1, 0)) and 0x52 or water(at(-1, 0)) and 0x56 or at(1, 0) == 15 and 0x5d or 0x59
      end
      if at(-1, 1) == t or at(1, -1) == t then
        return water(at(-1, -1)) and 0x55 or water(at(1, 1)) and 0x51 or at(-1, -1) == 15 and 0x5e or 0x5a
      end
      if at(1, 1) == t or at(-1, -1) == t then
        return water(at(1, -1)) and 0x53 or water(at(-1, 1)) and 0x57 or at(1, -1) == 15 and 0x5f or 0x5b
      end
      return 0x58
    end
    local fixed = {
      [0] = 0,
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
      [31] = 14,
      [32] = 15,
      [33] = 15,
      [37] = 26,
      [39] = 19,
      [40] = 19,
      [41] = 19,
      [42] = 0x3a,
      [49] = 25,
    }
    return fixed[t] or 0
  end
end
