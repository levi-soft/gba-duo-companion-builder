-- Private copy of EWRAM and IWRAM for conditional analysis.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local function modCaptureRam()
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
  end
end
return modCaptureRam
