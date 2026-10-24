-- FE7 support partner index from ROM character records.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  local lookup12, lookup3, growthSlots = D.lookup12, D.lookup3, D.slots
  local applyFeSupportBindings = pack.require("features.support")
  local fe7SupportById = {}
  for pointer, name in pairs(lookup12) do
    local cp = tonumber(pointer)
    if cp and cp >= 0x08000000 and cp < 0x0A000000 then
      fe7SupportById[mem.u8(cp + 4)] = { name = name, portrait = lookup3[tostring(cp)] or "" }
    end
  end
  return function(v)
    applyFeSupportBindings(
      v,
      v.unitPresent and growthSlots[v.deployment] or nil,
      tonumber(v.characterPointer) or 0,
      fe7SupportById
    )
    return v
  end
end
