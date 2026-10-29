-- Keep Talk separate from retail class-ID ability assumptions.
return function(D)
  local talk=pack.require("game.talk")(D)
  return {apply=function(v,unit)
    talk(v,unit);v.nativeSkillCount=0
    for n=1,6 do
      local key="nativeSkill"..n
      v[key.."Id"]=0;v[key.."Present"]=false;v[key.."Icon"]="";v[key.."Name"]="";v[key.."Description"]=""
    end
  end}
end
