-- English companion with exact-ROM moves/accessories before shared features.
local D = pack.require("data.rom_tables")
D.execution = pack.require("game.execution")
local values = pack.require("shared.values")
local map = pack.require("game.map")(D)
local abilities = pack.require("game.abilities")(D)
local read = pack.require("game.units")(D, map, values, abilities)
local presentation = pack.require("presentation.pokemblem")(D)
local growth = pack.require("features.growth")(D)
local analyze = pack.require("features.analysis")(D)
local present = pack.require("presentation.prediction")()
local forecast = pack.require("presentation.forecast")()
local english = pack.require("presentation.english")(D.uiStrings)
local text = pack.require("presentation.pokemblem-text")

local function updateProfile()
  return text(english(forecast(present(analyze(growth(presentation(read())))))))
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
