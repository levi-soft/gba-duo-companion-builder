-- Resolve the game's player-named avatar from its bounded RAM text entry.
-- D is private companion state. No game memory or pack file is modified.
return function(D)
  local previous = {}
  return function()
    for pointer, recipe in pairs(D.dynamicNames) do
      local pieces = {}
      for offset = 0, recipe.limit - 1 do
        local byte = mem.u8(recipe.address + offset)
        if byte == 0 then break end
        pieces[#pieces + 1] = D.nameGlyphs[byte + 1] or ""
      end
      local name = table.concat(pieces):gsub("^%s+", ""):gsub("%s+$", "")
      if name == "" then name = "Avatar" end
      if previous[pointer] ~= name then
        local old = D.mapMeta.chars[pointer].name
        D.mapMeta.chars[pointer].name = name
        D.lookup12[tostring(pointer)] = name
        if D.growthCharacters[pointer] then D.growthCharacters[pointer].name = name end
        for field = 14, 22, 2 do
          for key, value in pairs(D["lookup" .. field] or {}) do
            if value == old then D["lookup" .. field][key] = name end
          end
        end
        previous[pointer] = name
      end
    end
  end
end
