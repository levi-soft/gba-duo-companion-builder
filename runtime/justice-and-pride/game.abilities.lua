-- Rebuild the ROM's own personal/class/learned skill list on private RAM.
return function(D)
  local skills=pack.require("features.native-skills")(D.skillConfig)
  local talk=pack.require("game.talk")(D)
  return {
    apply=function(v,unit)
      talk(v,unit)
      local ids=skills(unit)
      v.nativeSkillCount=#ids
      for n=1,6 do
        local id,key=ids[n] or 0,"nativeSkill"..n
        local skill=D.skillData[id]
        v[key.."Id"]=id
        v[key.."Present"]=skill~=nil
        v[key.."Icon"]=skill and skill.icon or ""
        v[key.."Name"]=skill and skill.name or ""
        v[key.."Description"]=skill and skill.description or ""
      end
    end,
  }
end
