-- English FE8 entry point: inherited readers, exact-ROM contracts, shared UI.
local D = pack.require("data.rom_tables")
D.execution = pack.require("game.execution")
local values = pack.require("shared.values")
local map = pack.require("game.map")(D)
local abilities = pack.require("game.abilities")(D)
local read = pack.require("game.units")(D, map, values, abilities)
local growth = pack.require("features.growth")(D)
local analyze = pack.require("features.analysis")(D)
local present = pack.require("presentation.prediction")()
local forecast = pack.require("presentation.forecast")()
local english = pack.require("presentation.english")(D.uiStrings)

function update()
  local v = read()
  v = growth(v)
  v = analyze(v)
  return english(forecast(present(v)))
end
