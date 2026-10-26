-- AE7E / D1C6E5D5: inherited FE7 readers, Talk and exact class level caps.
local D=pack.require("data.rom_tables")
local values=pack.require("shared.values")
local map=pack.require("game.map")(D)
local read=pack.require("game.units")(D,map,values,nil)
local stats=pack.require("presentation.unit-stats")(D)
local inventory=pack.require("presentation.inventory")
local support=pack.require("game.support")(D)
local analyze=pack.require("features.analysis")(D)
local growthFields=pack.require("presentation.growth")
local present=pack.require("presentation.prediction")()
local forecast=pack.require("presentation.forecast")()
local english=pack.require("presentation.english")(D.uiStrings)
local talk=pack.require("game.talk")({
  chars=D.mapMeta.chars,slots=D.slots,talkConfig=D.talkConfig,talkEvents=D.talkEvents,
})

function update()
  local v=read()
  stats(v)
  inventory(v)
  analyze(v)
  growthFields(v)
  support(v)
  talk(v,v.unitPresent and D.slots[v.deployment] or nil)
  return english(forecast(present(v)))
end
