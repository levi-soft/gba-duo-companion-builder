-- This exact ROM displays Might 0xff and its equipped Attack as unavailable.
-- Restrainer uses the byte as a half-HP effect marker, not 255 physical damage.
local read=pack.require("game.fe8-equipment")
return function(D,map)
  local equipment=read(D,map)
  return function(v,unit)
    equipment(v,unit)
    local weapon=D.equipmentItems[v.equipmentId]
    if weapon and weapon.m==255 then
      v.equipmentAtk,v.weaponMight="---","---"
    end
    for n=1,5 do
      local key="item"..n.."Might"
      if v[key]==255 then v[key]="---" end
    end
    return v
  end
end
