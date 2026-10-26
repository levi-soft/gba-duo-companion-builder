-- Conditional ordinary-hit HP bars, including Sacred Echoes' per-strike HP cost.
return function(D)
  local base=pack.require("game.fe8-battle")(D)
  return function(v)
    base(v)
    if not v.forecastActive then return v end
    local sides={}
    for n,address in ipairs({0x0203A4EC,0x0203A56C})do
      local weapon=mem.u16(address+0x4A)
      local id=weapon & 255
      local attrs=mem.u32(address+0x4C)
      local cp,kp=mem.u32(address),mem.u32(address+4)
      local pact=((D.chars[cp].attributes | D.classes[kp].attributes)&0x10000)~=0
      sides[n]={hp=mem.u8(address+0x72),max=mem.u8(address+18),
        can=mem.u8(address+0x52)~=0,hit=mem.s16(address+0x64),
        damage=v[(n==1 and "forecastactor" or "forecasttarget").."Mt"],
        speed=mem.s16(address+0x5E),brave=(attrs & 0x20)~=0,
        cost=pact and 0 or (D.spellCosts[id] or 0),
        uses=(attrs & 8)~=0 and 99 or weapon>>8,
        drain=D.drainItems[id]==true}
    end
    local function strike(n)
      local a,b=sides[n],sides[3-n]
      for _=1,a.brave and 2 or 1 do
        if not a.can or a.hp<=a.cost or a.hp<=0 or b.hp<=0 or a.uses<=0 then return end
        a.hp=a.hp-a.cost;a.uses=a.uses-1
        if a.hit>0 then
          local damage=math.min(b.hp,tonumber(a.damage) or 0)
          b.hp=b.hp-damage
          if a.drain then a.hp=math.min(a.max,a.hp+damage)end
        end
      end
    end
    strike(1);strike(2)
    if sides[1].speed>=sides[2].speed+2 then strike(1)
    elseif sides[2].speed>=sides[1].speed+2 then strike(2)end
    for n,s in ipairs(sides)do
      local prefix=n==1 and "forecastactor" or "forecasttarget"
      local loss=math.max(0,v[prefix.."Hp"]-s.hp)
      v[prefix.."AfterHp"],v[prefix.."HpLoss"]=s.hp,loss
      v[prefix.."HasLoss"]=loss>0
      v[prefix.."HpRemainWidth"]=tostring(s.hp/math.max(1,s.max)*100).."%"
      v[prefix.."HpLossWidth"]=tostring(loss/math.max(1,s.max)*100).."%"
    end
    return v
  end
end
