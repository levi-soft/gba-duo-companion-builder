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

function update()
  return english(forecast(present(analyze(growth(presentation(read()))))))
end
