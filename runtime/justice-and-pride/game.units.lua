-- Exact-ROM script0859AAD8..ACE8 matches native-observed FE8 inspection.
local read=pack.require("game.fe8-units-stat")
return function(D,map,values,abilities)
  return read(D,map,values,abilities,{inspectionPc=0x0859ACA8})
end
