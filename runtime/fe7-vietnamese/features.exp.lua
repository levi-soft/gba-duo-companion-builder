-- FE7 conditional damage and kill EXP formulas.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  local growthClasses = D.growthClasses
  local growthClassIds = {}
  for _, k in pairs(growthClasses) do
    growthClassIds[k.id] = k
  end
  local function growthEstimateExp(a, b, normalMode)
    local function expLevel(x)
      return x.level + ((x.attributes & 256) ~= 0 and 20 or 0)
    end
    local function power(x)
      local n = x.level * x.power
      if (x.attributes & 256) ~= 0 then
        local base = growthClassIds[x.baseClass]
        n = n + 20 * (base and base.power or 0)
      end
      return n
    end
    if (b.attributes & 0x1000000) ~= 0 or a.power <= 0 then
      return 0, 0
    end
    local hit = math.floor(math.max(0, 31 - expLevel(a) + expLevel(b)) / a.power)
    local pa, pb = power(a), power(b)
    local kill = normalMode and (pb > pa and 20 + pb - pa or 20 + pb - math.floor(pa / 2)) or 20 + pb - pa
    kill =
      math.max(0, kill + ((b.attributes & 8) ~= 0 and 20 or 0) + ((b.attributes & 0x8000) ~= 0 and 40 or 0))
    return math.min(100, hit), math.min(100, hit + kill)
  end
  return growthEstimateExp
end
