-- Native movement and item locks, including Landboat cannon ownership.
return function(D)
  return pack.require("game.fe8-native-map")(D,{
    moveEntry=0x08019224,weaponEntry=0x08016574,workSlice=512,
  })
end
