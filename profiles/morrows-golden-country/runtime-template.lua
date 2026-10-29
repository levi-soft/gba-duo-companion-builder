-- Resolve player names before reading unit, map, forecast and support fields.
local D = pack.require("data.rom_tables")
D.execution = pack.require("game.execution")
local names = pack.require("game.names")(D)
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
  names()
  return english(forecast(present(analyze(growth(read())))))
end
