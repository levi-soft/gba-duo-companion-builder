-- FE7 growth roll algorithm and stat caps.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local function growthLevelGains(c, k, u, rng)
  local bonus = (u.state & 0x2000) ~= 0 and 5 or 0
  local function increase(g)
    local n = 0
    while g > 100 do
      n = n + 1
      g = g - 100
    end
    return n + (rng.roll(g) and 1 or 0)
  end
  local gains, total = {}, 0
  for i = 1, 7 do
    gains[i] = increase(c.growth[i] + bonus)
    total = total + gains[i]
  end
  if total == 0 then
    for retry = 1, 2 do
      local found = false
      for i = 1, 7 do
        gains[i] = increase(c.growth[i])
        if gains[i] > 0 then
          found = true
          break
        end
      end
      if found then
        break
      end
    end
  end
  for i = 1, 7 do
    local cap = i == 1 and (u.id >= 128 and u.id < 192 and 120 or 60) or i == 7 and 30 or k.caps[i]
    gains[i] = math.max(0, math.min(gains[i], cap - u.stats[i]))
  end
  return gains
end
return { levelGains = growthLevelGains }
