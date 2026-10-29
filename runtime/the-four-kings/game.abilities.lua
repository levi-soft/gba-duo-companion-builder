-- Rebuild the exact-ROM personal/class/learned skills on private RAM.
return function(D)
  local skills = pack.require("features.native-skills")(D.skillConfig)
  local talk = pack.require("game.talk")(D)
  return {
    apply = function(values, unit)
      talk(values, unit)
      local ids = skills(unit)
      values.nativeSkillCount = #ids
      for n = 1, 6 do
        local id, key = ids[n] or 0, "nativeSkill" .. n
        local skill = D.skillData[id]
        values[key .. "Id"] = id
        values[key .. "Present"] = skill ~= nil
        values[key .. "Icon"] = skill and skill.icon or ""
        values[key .. "Name"] = skill and skill.name or ""
        values[key .. "Description"] = skill and skill.description or ""
      end
    end,
  }
end
