-- Keep earned support names synchronized with the RAM-backed player avatar.
return function(D)
  local apply = pack.require("features.support")
  local byId, dynamic = {}, {}
  for pointer, name in pairs(D.lookup12) do
    local cp = tonumber(pointer)
    if cp and cp >= 0x08000000 and cp < 0x0A000000 then
      local id = mem.u8(cp + 4)
      byId[id] = { name = name, portrait = D.lookup3[tostring(cp)] or "" }
      if D.dynamicNames[cp] then dynamic[cp] = byId[id] end
    end
  end
  return function(v)
    for cp, partner in pairs(dynamic) do
      partner.name = D.lookup12[tostring(cp)]
    end
    apply(v, v.unitPresent and D.slots[v.deployment] or nil, tonumber(v.characterPointer) or 0, byId)
    return v
  end
end
