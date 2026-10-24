-- Value predicates used by the generated unit bindings.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local function truth(x)
  return x ~= nil and x ~= false and x ~= 0 and x ~= ""
end
local function choose(c, a, b)
  if truth(c) then
    return a
  else
    return b
  end
end
local function all(...)
  for i = 1, select("#", ...) do
    if not truth(select(i, ...)) then
      return false
    end
  end
  return true
end
local function any(...)
  for i = 1, select("#", ...) do
    if truth(select(i, ...)) then
      return true
    end
  end
  return false
end
local function first(...)
  for i = 1, select("#", ...) do
    local x = select(i, ...)
    if x ~= nil and x ~= "" then
      return x
    end
  end
  return ""
end
return { truth = truth, choose = choose, all = all, any = any, first = first }
