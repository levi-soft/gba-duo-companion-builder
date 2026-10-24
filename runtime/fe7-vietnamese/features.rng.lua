-- FE7 copied RNG state. Never writes game RAM.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local function growthRng(seed)
  local r = { state = { seed[1], seed[2], seed[3] }, count = 0 }
  function r.next()
    local s = r.state
    local n = ((((s[2] << 11) + (s[1] >> 5)) & 65535) ~ (((s[3] << 1) + (s[2] >> 15)) & 65535)) & 65535
    s[3] = s[2]
    s[2] = s[1]
    s[1] = n
    r.count = r.count + 1
    return (n * 100) >> 16
  end
  function r.roll(chance)
    return chance > r.next()
  end
  function r.hit(chance)
    return chance > ((r.next() + r.next()) // 2)
  end
  return r
end
return { new = growthRng }
