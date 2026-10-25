-- Execute FE6 combat RNG then conditional level-up in private memory.
local thumb = pack.require("features.thumb").start
local profile = pack.require("game.profile")
return function(ramByte)
  local actor, target = profile.battleActor, profile.battleTarget
  local initial = { [profile.battleState + 1] = (ramByte(profile.battleState + 1) & ~2) | 1 }
  for _, side in ipairs({ actor, target }) do
    for n = 0, 123 do
      initial[side + n] = ramByte(side + n)
    end
    initial[side + 17] = ramByte(side + 0x6E)
    local armed = ramByte(side + 0x50) ~= 0 and (ramByte(side + 0x48) | ramByte(side + 0x49)) ~= 0
    initial[side + 0x48] = armed and ramByte(side + 0x4A) or 0
    initial[side + 0x49] = armed and ramByte(side + 0x4B) or 0
    initial[side + 0x6A] = 0
    for n = 0x6F, 0x76 do
      initial[side + n] = 0
    end
    initial[side + 0x78], initial[side + 0x79] = 0, 0
  end
  local stage, run = 1, nil
  local function begin(shadow)
    local options = { ramByte = ramByte, strictStack = true, maxSteps = 1000000 }
    if stage == 2 then
      options.beforeEntry = {
        [profile.applyExp] = function(registers, read, write)
          if read(actor + 17, 1) == 0 then
            write(actor + 17, 1, 1)
          end
        end,
        [profile.levelUp] = function(registers, read, write)
          if registers[0] == actor and read(actor + 9, 1) < 100 then
            write(actor + 9, 100, 1)
          end
        end,
      }
    end
    return thumb(stage == 1 and profile.battleUnwind or profile.applyExp, {}, shadow, options)
  end
  run = begin(initial)
  return function()
    local done, _, shadow, steps = run(2048)
    if not done then
      return false, nil, stage == 1 and math.min(70, math.floor(steps / 500)) or 85
    end
    if stage == 1 then
      stage = 2
      run = begin(shadow)
      return false, nil, 75
    end
    local gains = {}
    for n, offset in ipairs({ 0x6F, 0x70, -1, 0x71, 0x72, 0x75, 0x73, 0x74 }) do
      gains[n] = offset < 0 and 0 or (shadow[actor + offset] or ramByte(actor + offset))
    end
    return true, gains, 100
  end
end
