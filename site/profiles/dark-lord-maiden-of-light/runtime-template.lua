-- AE7E / C99A6D26: FE7 readers plus the exact-ROM Talk records.
local D=pack.require("data.rom_tables")
local names=pack.require("game.names")(D)
local values=pack.require("shared.values")
local map=pack.require("game.map")(D)
local read=pack.require("game.units")(D,map,values,nil)
local stats=pack.require("presentation.unit-stats")(D)
local inventory=pack.require("presentation.inventory")
local support=pack.require("game.support")(D)
local analyze=pack.require("features.analysis")(D)
local observeRng=pack.require("features.rng-indicator")()
local growthFields=pack.require("presentation.growth")
local present=pack.require("presentation.prediction")()
local forecast=pack.require("presentation.forecast")()
local english=pack.require("presentation.english")(D.uiStrings)
local talk=pack.require("game.talk")({
  chars=D.mapMeta.chars,slots=D.slots,talkConfig=D.talkConfig,talkEvents=D.talkEvents,
})

local function updateProfile()
  names()
  local v=read()
  stats(v)
  inventory(v)
  analyze(v)
  growthFields(v)
  support(v)
  talk(v,v.unitPresent and D.slots[v.deployment] or nil)
  return english(forecast(present(observeRng(v))))
end

-- Common Growth presentation; uses official pack.require and PNG assets only.
local applyGrowthRates = pack.require("presentation.growth-rates")(pack.require("data.rom_tables"))
local continueWork = pack.require("presentation.continuation")()
local updateSnapshots = pack.require("game.snapshot")
actions = actions or {}
function actions.resumeCompanion()
  local pulse = tonumber(ui and ui.companionWorkPulse) or 0
  if math.type(pulse) ~= "integer" or pulse < 0 or pulse >= 2147483647 then pulse = 0 end
  return { set = { companionWorkPulse = (pulse + 1) % 2147483647 } }
end
function update()
  if type(updateSnapshots) == "table" then updateSnapshots.begin() end
  local v = updateProfile()
  if type(updateSnapshots) == "table" then updateSnapshots.finish() end
  return continueWork(applyGrowthRates(v))
end
