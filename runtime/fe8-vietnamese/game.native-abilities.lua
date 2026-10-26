-- Native FE8 class and character abilities.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  local nativeAbilities = {
    ["shield"] = { "Great Shield", "Chance = enemy level%. Negates an incoming hit; some attacks bypass it." },
    ["shot"] = { "Sure Shot", "Chance = level%. Guarantees a hit. Does not activate with ballistae." },
    ["pierce"] = { "Pierce", "Chance = level%. Ignores enemy Defense." },
    ["slayer"] = { "Slayer", "Triples weapon might against monsters." },
    ["silencer"] = {
      "Silencer",
      "On a critical hit, may instantly defeat the target. Certain bosses resist it.",
    },
    ["summon"] = { "Summon", "Summons a Phantom to fight. One active Phantom per summoner." },
    ["pick"] = { "Pick", "Opens doors and chests without a key or lockpick." },
    ["lockpick"] = { "Lockpick", "Can use lockpicks to open doors and chests." },
    ["steal"] = {
      "Steal",
      "Steals a non-weapon item from an adjacent enemy when Speed and inventory conditions allow.",
    },
    ["vision"] = { "Vision +5", "Adds 5 tiles to vision range in fog of war." },
    ["traps"] = {
      "Disarm",
      "Disables fire traps; thieves avoid mines, while assassins can recover mines when inventory has room.",
    },
    ["canto"] = {
      "Canto",
      "Uses remaining movement after actions such as trading, rescuing or using an item; not after attacking.",
    },
    ["crit"] = { "Crit +15", "Adds 15 to critical rate." },
    ["dance"] = { "Dance", "Grants an adjacent ally another action." },
    ["play"] = { "Play", "Grants an adjacent ally another action." },
    ["triangle"] = {
      "Triangle",
      "Can perform a triangle attack when the required allied formation is in place.",
    },
  }
  local nativeClasses = D.nativeClasses
  local nativeCharacters = D.nativeCharacters
  local function applyNativeAbilities(v, u)
    local keys = {}
    if u then
      local cp = mem.u32(u)
      local cl = mem.u32(u + 4)
      local c = nativeClasses[tostring(cl)]
      local id = c and c[1] or 0
      local a = (nativeCharacters[tostring(cp)] or 0) | (c and c[2] or 0)
      if id == 11 or id == 12 then
        keys[#keys + 1] = "shield"
      end
      if id == 27 or id == 28 then
        keys[#keys + 1] = "shot"
      end
      if id == 35 or id == 36 then
        keys[#keys + 1] = "pierce"
      end
      if id == 43 or id == 44 then
        keys[#keys + 1] = "slayer"
      end
      if (a & 0x02000000) ~= 0 then
        keys[#keys + 1] = "silencer"
      end
      if (a & 0x08000000) ~= 0 then
        keys[#keys + 1] = "summon"
      end
      if id == 51 then
        keys[#keys + 1] = "pick"
      end
      if id ~= 51 and (a & 8) ~= 0 then
        keys[#keys + 1] = "lockpick"
      end
      if (a & 4) ~= 0 then
        keys[#keys + 1] = "steal"
      end
      if (a & 8) ~= 0 then
        keys[#keys + 1] = "vision"
      end
      if (a & 0x02000008) ~= 0 then
        keys[#keys + 1] = "traps"
      end
      if (a & 2) ~= 0 then
        keys[#keys + 1] = "canto"
      end
      if (a & 64) ~= 0 then
        keys[#keys + 1] = "crit"
      end
      if (a & 16) ~= 0 then
        keys[#keys + 1] = "dance"
      end
      if (a & 32) ~= 0 then
        keys[#keys + 1] = "play"
      end
      if (a & 0x600000) ~= 0 then
        keys[#keys + 1] = "triangle"
      end
    end
    v.nativeSkillCount = #keys
    for n = 1, 4 do
      local d = nativeAbilities[keys[n]]
      v["nativeSkill" .. n .. "Present"] = d ~= nil
      v["nativeSkill" .. n .. "Name"] = d and d[1] or ""
      v["nativeSkill" .. n .. "Description"] = d and d[2] or ""
    end
  end

  return { apply = applyNativeAbilities }
end
