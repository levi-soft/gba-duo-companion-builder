return function(D)
  local skills = pack.require("features.native-skills")(D.skillConfig)
  local talk = pack.require("game.talk")(D)
  return {
    apply = function(v, unit)
      talk(v, unit)
      v.mag = unit and mem.u8(unit + 0x3a) or "---"
      v.powerLabel = "Str"
      local character=unit and D.chars[mem.u32(unit)]
      v.leadStars=character and D.leadership[character.id] or 0
      v.leadershipVisible=v.leadStars>0
      v.leadershipStars={}
      for n=1,v.leadStars do v.leadershipStars[n]={index=n,left=tostring((n-1)*14).."px"} end
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
