-- Exact native BU+1D getter, called by InitBattleUnit0802A5E0.
return function(D)
  return pack.require("game.fe8-native-map")(D,{moveEntry=0x08019224,workSlice=512})
end
