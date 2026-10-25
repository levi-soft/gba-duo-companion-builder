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

function update()
  return english(forecast(present(analyze(growth(inventory(support(read())))))))
end
