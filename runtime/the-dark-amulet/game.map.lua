-- 8537CE2A: native movement total includes its own stationary AI rules.
return function(D)
  return pack.require("game.fe8-native-map")(D,{moveEntry=0x08019224,workSlice=512})
end
