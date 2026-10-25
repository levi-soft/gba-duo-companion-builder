-- Companion entry point: read game state, apply features, then present.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local D = pack.require("data.rom_tables")
local values = pack.require("shared.values")
local map = pack.require("game.map")(D)
local abilities = nil
local read = pack.require("game.units")(D, map, values, abilities)
local inventory = pack.require("presentation.inventory")
local support = pack.require("game.support")(D)
local analyze = pack.require("features.analysis")(D)
local growthFields = pack.require("presentation.growth")
local present = pack.require("presentation.prediction")()
local forecast = pack.require("presentation.forecast")()

function update()
  local v = read()
  v = inventory(v)
  v = analyze(v)
  v = growthFields(v)
  v = support(v)
  return forecast(present(v))
end
