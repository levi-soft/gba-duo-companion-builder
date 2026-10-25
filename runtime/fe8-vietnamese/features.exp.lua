-- Conditional damage and kill EXP, evaluated through the ROM routine.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local modThumbStart = pack.require("features.thumb").start
local function modExpQueryStart(kill, ramByte, entries)
  entries = entries or {}
  local actor, target = 0x0203A4EC, 0x0203A56C
  -- These cards describe EXP if the unit survives, never the selected
  -- fight's hidden hit/miss/death outcome from the simulation buffers.
  local initial = {
    [actor + 0x13] = math.max(1, ramByte(actor + 0x72)),
    [actor + 0x7c] = 1,
    [target + 0x13] = kill and 0 or math.max(1, ramByte(target + 0x13)),
    [0x0203A4D4] = 1,
    [0x0203A4D5] = 0,
  }
  local phases = {
    { entries.expClear or 0x0802C740, { target } },
    { entries.restoreWeapon or 0x0802C6EC, { target } },
    { entries.expApply or 0x0802B92C, {} },
  }
  local stage, run = 1, nil
  local function begin(shadow)
    return modThumbStart(
      phases[stage][1],
      phases[stage][2],
      shadow,
      { ramByte = ramByte, strictStack = true, maxSteps = 200000, registers = { [4] = target, [5] = actor } }
    )
  end
  run = begin(initial)
  return function()
    local done, _, shadow = run(2048)
    if not done then
      return false
    end
    if stage < #phases then
      stage = stage + 1
      run = begin(shadow)
      return false
    end
    return true,
      {
        gain = shadow[actor + 0x6e] or ramByte(actor + 0x6e),
        leveled = (shadow[actor + 8] or ramByte(actor + 8)) ~= ramByte(actor + 8),
      }
  end
end
return modExpQueryStart
