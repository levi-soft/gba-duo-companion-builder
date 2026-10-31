-- Companion entry point: read game state, apply features, then present.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local D = pack.require("data.rom_tables")
local values = pack.require("shared.values")
local map = pack.require("game.map")(D)
local abilities = pack.require("game.abilities")(D)
local read = pack.require("game.units")(D, map, values, abilities)
local inventory = pack.require("presentation.inventory")
local growth = pack.require("features.growth")(D)
local support = pack.require("game.support")(D)
local analyze = pack.require("features.analysis")(D)
local present = pack.require("presentation.prediction")()
local forecast = pack.require("presentation.forecast")()

local function updateProfile()
  local v = read()
  v = inventory(v)
  v = growth(v)
  v = support(v)
  v = analyze(v)
  return forecast(present(v))
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
