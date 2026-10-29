return function(D)
  local skills = pack.require("features.native-skills")(D.skillConfig)
  local talk = pack.require("game.talk")(D)
  return {
    apply = function(v, unit)
      talk(v, unit)
      v.mag = unit and mem.u8(unit + 0x3a) or "---"
      v.powerLabel = "Str"
      v.leadershipVisible, v.leadStars, v.leadershipStars = false, 0, {}
      local ids = skills(unit)
      for n = 1, 6 do
        local id, key = ids[n] or 0, "skill" .. n
        local skill = D.skillData[id]
        v[key .. "Id"] = id
        v[key .. "Present"] = skill ~= nil
        v[key .. "Missing"] = skill == nil
        v[key .. "Name"] = skill and skill.name or "---"
        v[key .. "Description"] = skill and skill.description or ""
        v[key .. "Icon"] = skill and skill.icon or ""
      end
    end,
  }
end
