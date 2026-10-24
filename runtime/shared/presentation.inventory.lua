-- Inventory count and unrevealed support card presentation.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

-- Present occupied inventory slots and earned support partners.
return function(v)
  v.royalItemCount = 0
  for i = 1, 5 do
    if (tonumber(v["item" .. i .. "Id"]) or 0) > 0 then
      v.royalItemCount = v.royalItemCount + 1
    end
  end
  local hasSupport = false
  for i = 1, 5 do
    local k = "support" .. i
    local rank = v[k .. "Rank"]
    if rank == "C" or rank == "B" or rank == "A" then
      hasSupport = true
    else
      v[k .. "Name"] = ""
      v[k .. "Portrait"] = ""
      v[k .. "PortraitMissing"] = true
      v[k .. "DisplayRank"] = "---"
    end
  end
  v.supportEmpty = not hasSupport
  return v
end
