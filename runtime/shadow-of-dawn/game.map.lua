-- Exact native movement includes stationary AI and active movement modifiers.
return function(D)
  return pack.require("game.fe8-native-map")(D,{moveEntry=0x08019224,workSlice=512})
end
