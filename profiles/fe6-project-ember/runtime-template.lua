-- FE6 T-EN: native readers and calculations, inherited shared English UI.
local D = pack.require("data.rom_tables")
local memory = pack.require("game.memory")(D)
local map = pack.require("game.map")(D, memory, pack.require("game.tiles")())
local read = pack.require("game.units")(D, map, memory)
local support = pack.require("game.support")(D)
local growth = pack.require("features.growth")(D)
local inventory = pack.require("presentation.inventory")
local analyze = pack.require("features.analysis")(D)
local present = pack.require("presentation.prediction")()
local forecast = pack.require("presentation.forecast")()
local english = pack.require("presentation.english")(D.uiStrings)

local function updateProfile()
  return english(forecast(present(analyze(growth(inventory(support(read())))))))
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
