-- The exact ROM's skill-list routine runs on private shadow RAM.
return function(D)
  local skills=pack.require("features.native-skills")(D.skillConfig)
  local talk=pack.require("game.talk")(D)
  local namesById={}
  for _,character in pairs(D.chars)do namesById[character.id]=character end
  return {apply=function(v,unit)
    talk(v,unit)
    local target=namesById[v.talkTargetId]
    if v.talkAvailable and target then
      v.talkTargetName=target.name;v.talkPrompt="Talk to "..target.name.."."
    end
    if D.customProfile.split then v.mag=unit and mem.u8(unit+0x3A) or "---";v.powerLabel="Str" end
    local ok,ids=pcall(skills,unit)
    if not ok then v.skillReadError=tostring(ids);ids={} end
    v.nativeSkillCount=#ids
    for n=1,6 do
      local id=ids[n] or 0;local skill=D.skillData[id]
      for _,prefix in ipairs({"nativeSkill","skill"})do
        local key=prefix..n;v[key.."Id"]=id;v[key.."Present"]=skill~=nil;v[key.."Missing"]=skill==nil;v[key.."Icon"]=skill and skill.icon or "";v[key.."Name"]=skill and skill.name or "";v[key.."Description"]=skill and skill.description or ""
      end
    end
  end}
end
