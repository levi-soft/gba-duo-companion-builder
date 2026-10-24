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

function update()
  local v = read()
  v = inventory(v)
  v = growth(v)
  v = support(v)
  v = analyze(v)
  return present(v)
end
