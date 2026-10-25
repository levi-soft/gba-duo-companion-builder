-- FE6 has up to ten partner entries and thresholds 61/121/201.
return function(D)
  local byId = {}
  for _, c in pairs(D.chars) do
    byId[c.id] = c
  end
  return function(v)
    for n = 1, 5 do
      local key = "support" .. n
      v[key .. "Name"], v[key .. "Portrait"], v[key .. "Rank"] = "", "", "---"
      v[key .. "DisplayRank"], v[key .. "PortraitMissing"] = "---", true
    end
    if not v.unitPresent then
      return v
    end
    local c = D.chars[v.characterPointer]
    local count = 0
    for n, id in ipairs(c.supports) do
      local points = mem.u8(v.unitBase + 0x2F + n)
      local partner = byId[id]
      if partner and points >= 61 and count < 5 then
        count = count + 1
        local key = "support" .. count
        v[key .. "Name"], v[key .. "Portrait"] = partner.name, partner.portrait
        v[key .. "Rank"] = points >= 201 and "A" or points >= 121 and "B" or "C"
        v[key .. "DisplayRank"], v[key .. "PortraitMissing"] = v[key .. "Rank"], partner.portrait == ""
      end
    end
    return v
  end
end
