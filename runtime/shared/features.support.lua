-- Earned support cards; read-only unit and ROM support records.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(v, u, cp, byId)
  for n = 1, 5 do
    local key = "support" .. n
    v[key .. "Name"] = ""
    v[key .. "Portrait"] = ""
    v[key .. "Rank"] = "---"
    v[key .. "DisplayRank"] = "---"
    v[key .. "PortraitMissing"] = true
  end
  v.supportEmpty = true
  if not u or cp < 0x08000000 or cp >= 0x0A000000 then
    return
  end
  local support = mem.u32(cp + 44)
  if support < 0x08000000 or support >= 0x0A000000 then
    return
  end
  local count = math.min(7, mem.u8(support + 0x15))
  local visible = 0
  -- All seven ROM records participate; the game allows at most five
  -- earned support levels, so compact earned partners into the five cards.
  for slot = 0, count - 1 do
    local points = mem.u8(u + 0x32 + slot)
    local rank = points > 240 and "A" or points > 160 and "B" or points > 80 and "C" or nil
    local partner = rank and byId[mem.u8(support + slot)] or nil
    if partner and visible < 5 then
      visible = visible + 1
      local key = "support" .. visible
      v[key .. "Name"] = partner.name
      v[key .. "Portrait"] = partner.portrait or ""
      v[key .. "Rank"] = rank
      v[key .. "DisplayRank"] = rank
      v[key .. "PortraitMissing"] = (partner.portrait or "") == ""
      v.supportEmpty = false
    end
  end
end
