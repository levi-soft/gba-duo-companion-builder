-- Run an exact-ROM skill getter with a private cache/buffer, never live writes.
local start = pack.require("features.thumb").start
return function(config)
  return function(unit)
    if not unit then return {} end
    local initial = {}
    for n = 0, 3 do initial[config.cache + n] = 0 end
    local done, pointer, shadow = start(config.entry, { unit }, initial)(4000)
    assert(done and pointer == config.buffer, "Unverified native skill getter result")
    local ids = {}
    for n = 0, config.limit - 1 do
      local id = shadow[pointer + n]
      assert(id ~= nil, "Native skill buffer was not rebuilt")
      if id == 0 then break end
      ids[#ids + 1] = id
    end
    return ids
  end
end
