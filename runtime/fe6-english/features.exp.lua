-- Conditional EXP through FE6 BattleApplyExpGains on a frozen RAM copy.
local thumb = pack.require("features.thumb").start
local profile = pack.require("game.profile")
return function(kill, ramByte)
  local actor, target = profile.battleActor, profile.battleTarget
  local initial = {
    [actor + 17] = math.max(1, ramByte(actor + 0x6E)),
    [actor + 0x78] = 1,
    [target + 17] = kill and 0 or math.max(1, ramByte(target + 0x6E)),
    [profile.battleState + 1] = (ramByte(profile.battleState + 1) & ~2) | 1,
  }
  for _, side in ipairs({ actor, target }) do
    initial[side + 0x6A] = 0
    for n = 0x6F, 0x76 do
      initial[side + n] = 0
    end
  end
  local run = thumb(
    profile.applyExp,
    {},
    initial,
    { ramByte = ramByte, strictStack = true, maxSteps = 200000 }
  )
  return function()
    local done, _, shadow = run(2048)
    if not done then
      return false
    end
    return true,
      {
        gain = shadow[actor + 0x6A] or ramByte(actor + 0x6A),
        leveled = (shadow[actor + 8] or ramByte(actor + 8)) ~= ramByte(actor + 8),
      }
  end
end
