-- Shared native movement presentation; exact stat/preparation/inspection ownership.
local read=pack.require("game.fe8-units-stat")
return function(D,map,values,abilities)
  return read(D,map,values,abilities,{inspectionPc=0x0859ACA8})
end
