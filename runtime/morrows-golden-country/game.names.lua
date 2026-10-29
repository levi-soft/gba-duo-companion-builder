-- Bounded read-only player names from exact-ROM EWRAM text recipes.
return function(D)
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
      -- Update records in place: support cards retain these record references.
      for _, records in ipairs({D.chars, D.mapMeta.chars, D.forecastChars, D.equipmentChars, D.growthCharacters}) do
        if records[pointer] then records[pointer].name = name end
      end
      D.lookup10[tostring(pointer)] = name
    end
  end
end
