-- Present ROM base growth and the already-computed effective-rate delta.
-- Numeric feature fields and caps remain owned by each game's implementation.
return function(D)
  local keys={"Hp","Power","Str","Mag","Skill","Spd","Luck","Def","Res","Con","Mov"}
  local engineKeys={"Hp","Power","Skill","Spd","Def","Res","Luck"}
  local splitKeys={"Hp","Power","Mag","Skill","Spd","Luck","Def","Res"}
  local function number(value)
    return type(value)=="number" and value==value and value~=math.huge and value~=-math.huge and value or nil
  end
  local function percent(value)
    return (value%1==0 and string.format("%.0f",value) or tostring(value)).."%"
  end
  return function(v)
    local cp=tonumber(v.characterPointer)
    -- FE6's retail-derived reader stores the same verified character growth
    -- fields directly on D.chars; other profiles use D.growthCharacters.
    local c=cp and ((D.growthCharacters and D.growthCharacters[cp]) or (D.chars and D.chars[cp]))
    local available=v.unitPresent==true and v.growthPresent~=false and c~=nil
    local base={}
    if available then
      if type(c.rates)=="table" and #c.rates>=8 then
        for n,key in ipairs(splitKeys)do base[key]=number(c.rates[n])end
      elseif type(c.growth)=="table" then
        for n,key in ipairs(engineKeys)do base[key]=number(c.growth[n])end
      end
      base.Str=base.Power
      base.Con,base.Mov=number(c.conGrowth),number(c.movGrowth)
    end
    local native=D.execution and D.execution.nativeGrowth
    local effectiveKnown=not native or v.nativeGrowthReady==true
    local power=number(v.growthPower) or number(v.growthStr)
    for _,key in ipairs(keys)do
      local baseline=base[key]
      local effective=effectiveKnown and number((key=="Power" or key=="Str") and power or v["growth"..key]) or nil
      local bonus=baseline~=nil and effective~=nil and effective-baseline or nil
      local text
      if baseline~=nil then
        text=percent(baseline)
        if bonus==nil then text=text.." (…)"
        elseif bonus~=0 then text=text.." ("..(bonus>0 and "+" or "")..percent(bonus)..")"end
      elseif key~="Con" and key~="Mov" then text="---"end
      -- Explicitly erase stale metadata when a new identity has no base axis.
      v["growth"..key.."BaseRate"]=baseline
      v["growth"..key.."EffectiveRate"]=baseline~=nil and effective or nil
      v["growth"..key.."BonusRate"]=bonus
      v["growth"..key.."RateText"]=text
    end
    local radar=available and (c.radar or c.radars and c.radars[1])
    v.growthRadar=type(radar)=="string" and radar:sub(1,6)=="asset:" and radar or ""
    v.growthRadarUnavailable=available and v.growthRadar=="" or false
    return v
  end
end
