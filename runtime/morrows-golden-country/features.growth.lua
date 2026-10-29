-- Preserve shared pulse/inventory fields; exact-ROM caps and stat cardinality.
return function(D)
  local base=pack.require("features.base-growth")(D)
  return function(v)
    v=base(v)
    if not D.customProfile.supports then
      v.supportEmpty=true
      for n=1,5 do v["support"..n.."Name"]="";v["support"..n.."Portrait"]="";v["support"..n.."Rank"]="---";v["support"..n.."DisplayRank"]="---";v["support"..n.."PortraitMissing"]=true end
    end
    local cp,kp=tonumber(v.characterPointer) or 0,tonumber(v.classPointer) or 0
    local c,k=D.growthCharacters[cp],D.growthClasses[kp]
    if not(v.unitPresent and c and k)then return v end
    local cap=D.levelCaps[k.id+1]
    local attributes=((D.chars and D.chars[cp] and D.chars[cp].attributes) or 0)|(k.attributes or 0)
    local expBonus=(attributes&0x100)~=0 and D.customProfile.promotedExpBonus or 0
    v.growthLevelCap=cap;v.growthExpLevel=(v.level or 0)+(expBonus or 0);v.growthLevelsLeft=math.max(0,cap-(v.level or 0))
    v.growthCalculationNote=D.customProfile.growthNote
    if D.customProfile.split then
      v.growthRadar=ui and ui.growthPopup and c.radar or ""
      v.growthPowerLabel="Str"
      local current={v.maxHp,v.str,v.mag,v.skill,v.spd,v.luck,v.def,v.res}
      for n,key in ipairs({"Hp","Str","Mag","Skill","Spd","Luck","Def","Res"})do v["growth"..key]=c.rates[n];v["growth"..key.."Current"]=current[n];v["growth"..key.."Cap"]=k.caps[n] end
      v.growthPower=v.growthStr;v.growthPowerCurrent=v.growthStrCurrent;v.growthPowerCap=v.growthStrCap
    else
      v.growthRadar=ui and ui.growthPopup and c.radars[1] or ""
      for n,key in ipairs({"Hp","Power","Skill","Spd","Def","Res","Luck"})do v["growth"..key]=c.growth[n] end
    end
    if D.customProfile.hpEnemyCap and ((v.deployment or 0)&0xC0)==0x80 then
      v.growthHpCap=D.customProfile.hpEnemyCap
    end
    return v
  end
end
