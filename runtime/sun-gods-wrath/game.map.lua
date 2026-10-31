-- 566D7A9E: native BU+1D getter and Acrobat cost-copy hook0801A4CC.
return function(D)
  return pack.require("game.fe8-native-map")(D,{
    moveEntry=0x08019224,acrobatEntry=0x09EFBAF4,acrobatId=1,workSlice=512,
  })
end
