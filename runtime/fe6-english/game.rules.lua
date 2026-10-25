-- FE6 rank thresholds and packed weapon range formatting.
local function rank(value)
  return value >= 251 and "S"
    or value >= 201 and "A"
    or value >= 151 and "B"
    or value >= 101 and "C"
    or value >= 51 and "D"
    or value > 0 and "E"
    or "---"
end
local function range(value)
  local low, high = value >> 4, value & 15
  return low == high and tostring(low) or low .. "–" .. high
end
return {
  rank = rank,
  range = range,
  types = { "Sword", "Lance", "Axe", "Bow", "Staff", "Anima", "Light", "Dark", "Ballista", "Item", "Dragon" },
}
