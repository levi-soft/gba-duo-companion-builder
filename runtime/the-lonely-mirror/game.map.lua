-- A74E93C7: GenerateUnitMovementMapExt0801A3CC ->08192914 native hold hook.
-- It chooses impassable costs for these units, leaving only their origin tile.
return function(D)
  D.mapAiHoldForUnit=function(unit)
    local ai=mem.u8(unit+66)
    return mem.u8(unit+11)>=64 and mem.u8(unit+68)==3
      and(ai==3 or ai==6 or mem.u8(unit+65)==0x20)
  end
  return pack.require("game.fe8-map")(D)
end
