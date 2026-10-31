-- Private copy of EWRAM and IWRAM for conditional analysis.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local function modCaptureRam()
  local busContext = mem.busContext and mem.busContext() or nil
  local chunks = {}
  for n = 0, 3 do
    chunks[n] = mem.read(0x02000000 + n * 65536, 65536)
  end
  local iwram = mem.read(0x03000000, 32768)
  return function(a)
    if a >= 0x03000000 then
      return string.byte(iwram, a - 0x03000000 + 1)
    end
    local offset = a - 0x02000000
    return string.byte(chunks[offset // 65536], offset % 65536 + 1)
  end, busContext
end
-- All readers in one update observe the same frozen emulator frame. Sharing
-- that copy avoids capturing RAM three times when movement, Growth and Analysis
-- start together, which can exceed the official sandbox instruction budget.
-- begin() resets even after an interrupted update. Jobs retain their own closure;
-- clearing this cache never changes the snapshot an unfinished job already owns.
local active, cachedRam, cachedBus = false, nil, nil
local function detached(context)
  return context and { version = context.version, platform = context.platform,
    biosPrefetch = context.biosPrefetch } or nil
end
local snapshots = {}
function snapshots.begin()
  active, cachedRam, cachedBus = true, nil, nil
end
function snapshots.finish()
  active, cachedRam, cachedBus = false, nil, nil
end
return setmetatable(snapshots, { __call = function()
  if active and cachedRam then return cachedRam, detached(cachedBus) end
  local ram, context = modCaptureRam()
  if active then cachedRam, cachedBus = ram, detached(context) end
  return ram, detached(context)
end })
