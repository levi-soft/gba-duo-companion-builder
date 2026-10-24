-- FE6 Remastered support partner index.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  local applyFeSupportBindings = pack.require("features.support")
  local fe6SupportById = {}
  for _, character in pairs(D.chars) do
    fe6SupportById[character.id] = character
  end
  return function(v)
    applyFeSupportBindings(
      v,
      v.unitPresent and D.slots[v.deployment] or nil,
      tonumber(v.characterPointer) or 0,
      fe6SupportById
    )
    return v
  end
end
