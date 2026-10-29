-- Character records identify storage slots; class records identify species.
return function(D)
  local read=pack.require("game.fe8-battle")(D)
  return function(v)
    v=read(v)
    if v.forecastActive then
      for n,address in ipairs({0x0203A4EC,0x0203A56C})do
        local species=D.classes[mem.u32(address+4)]
        if species then v[(n==1 and "forecastactor" or "forecasttarget").."Name"]=species.name end
      end
    end
    return v
  end
end
