-- Conditional level-up execution; unsupported instructions fail closed.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local modThumbStart = pack.require("features.thumb").start
local modCaptureRam = pack.require("game.snapshot")
local function modLevelPredictionStart(sharedRam, profileOptions)
  local entries = profileOptions and profileOptions.entries or {}
  assert(entries.signedGains == nil or type(entries.signedGains) == "boolean", "Invalid signed gain option")
  assert(entries.transformGains == nil or type(entries.transformGains) == "function", "Invalid gain transform")
  local sliceSteps = entries.cpuStepsPerTick or 2048
  assert(sliceSteps >= 128 and sliceSteps <= 2048 and sliceSteps % 1 == 0, "Invalid analysis work slice")
  local actor, target = 0x0203A4EC, 0x0203A56C
  local config = mem.u16(0x0203A4D4)
  local allowed = entries.allowedBattleConfigs
  if allowed ~= nil then
    assert(type(allowed) == "table", "Invalid allowed battle configurations")
    for value, enabled in pairs(allowed) do
      assert(math.type(value) == "integer" and value >= 0 and value <= 0xffff
        and type(enabled) == "boolean", "Invalid allowed battle configurations")
    end
  end
  if allowed and allowed[config] ~= true or not allowed and config ~= 1 and config ~= 2 then
    error(string.format("Unverified battle configuration: %04X", config))
  end
  -- A job spans emulator frames. Freeze its entire RAM baseline once;
  -- live stack/global reads between slices can corrupt the private CPU.
  local ramByte, capturedContext = sharedRam
  if not ramByte then ramByte, capturedContext = modCaptureRam() end
  local busContext = entries.busContext
  if busContext == nil then busContext = capturedContext end
  local function input(a, n)
    n = n or 1
    local v = 0
    for k = 0, n - 1 do
      v = v | (((a + k >= 0x08000000 and mem.u8(a + k)) or ramByte(a + k)) << (k * 8))
    end
    return v
  end
  local initial = { [0x0203A4D4] = 1, [0x0203A4D5] = 0 }
  for _, bu in ipairs({ actor, target }) do
    for n = 0, 127 do
      initial[bu + n] = input(bu + n)
    end
    -- Forecast simulation has already changed HP and weapon durability.
    -- Rewind these private copies to their pre-combat values.
    initial[bu + 19] = input(bu + 0x72)
    -- Do not re-enable a defender's weapon when the forecast disabled its
    -- counterattack (for example, an axe against a javelin at range two).
    -- Only restore durability for a weapon that is allowed to participate.
    local canUseWeapon = input(bu + 0x52) ~= 0
    initial[bu + 0x48] = canUseWeapon and input(bu + 0x4a) or 0
    initial[bu + 0x49] = canUseWeapon and input(bu + 0x4b) or 0
    for n = 0x73, 0x7d do
      initial[bu + n] = 0
    end
  end
  for n = 0, 5 do
    initial[0x03000000 + n] = input(0x03000000 + n)
  end
  local unitLookup = entries.unitLookup or mem.u32(0x08019440)
  local actorUnit = input(unitLookup + input(actor + 11) * 4, 4)
  local targetUnit = input(unitLookup + input(target + 11) * 4, 4)
  -- Match the ROM's post-calculation call order, including restoring rune
  -- visibility, target equipment and the EXP routine before level-up.
  local phases = {
    { entry = entries.prepareBattle or 0x0802EB10, args = {}, limit = 200000 },
    {
      entry = profileOptions
          and profileOptions.scriptedBattle
          and input(0x0203A970, 4) ~= 0
          and (entries.scriptedBattle or 0x0802CF4C)
        or (entries.normalBattle or 0x0802AED0),
      args = {},
      limit = 1000000,
    },
    { entry = entries.finishBattle or 0x0802EB50, args = {}, limit = 200000 },
    { entry = entries.expClear or 0x0802C740, args = { target }, limit = 100000 },
    { entry = entries.restoreWeapon or 0x0802C6EC, args = { target }, limit = 100000 },
    { entry = entries.expApply or 0x0802B92C, args = {}, limit = 200000 },
  }
  local stage, previousSteps = 1, 0
  local function begin(shadow)
    local phase = phases[stage]
    local options = {
      maxSteps = phase.limit,
      ramByte = ramByte,
      strictStack = true,
      busContext = busContext,
      registers = { [4] = target, [5] = actor, [6] = targetUnit, [7] = targetUnit },
    }
    if entries.beforeEntry then
      options.beforeEntry = {}
      for address, hook in pairs(entries.beforeEntry) do
        options.beforeEntry[address] = hook
      end
    end
    if stage == 6 then
      options.registers[6] = actorUnit
      -- Hypothetical level-up only. The actual fight's hit/miss and EXP
      -- outcome are not exposed. No combat, skill or RNG call is skipped.
      local conditionalHooks = {
        [entries.expApply or 0x0802B92C] = function(registers, read, write)
          -- Conditional results assume the actor survives. Restore only this
          -- private post-combat HP after every combat/RNG call has completed;
          -- otherwise a simulated death silently bypasses the level-up hook.
          if read(actor + 19, 1) == 0 then
            write(actor + 19, 1, 1)
          end
        end,
        [entries.levelUp or 0x0802BA28] = function(registers, read, write)
          if registers[0] == actor and read(actor + 9, 1) < 100 then
            write(actor + 9, 100, 1)
          end
        end,
      }
      options.beforeEntry = options.beforeEntry or {}
      for address, hook in pairs(conditionalHooks) do
        options.beforeEntry[address] = hook
      end
    end
    return modThumbStart(phase.entry, phase.args, shadow, options)
  end
  local run = begin(initial)
  local function progress(steps)
    if stage == 1 then
      return 0
    end
    if stage == 2 then
      return 5 + math.min(64, math.floor(steps * 64 / 50000))
    end
    if stage < 6 then
      return 69 + (stage - 2) * 2
    end
    return 76 + math.min(23, math.floor(steps * 23 / 40000))
  end
  return function()
    local remaining = sliceSteps
    while remaining > 0 do
      local done, _, shadow, steps, context = run(remaining)
      busContext = context
      remaining = remaining - (steps - previousSteps)
      previousSteps = steps
      if not done then
        return false, nil, progress(steps)
      end
      if stage == #phases then
        local result = {}
        for n, offset in ipairs({ 0x73, 0x74, 0x7a, 0x75, 0x76, 0x79, 0x77, 0x78 }) do
          local value = shadow[actor + offset] or input(actor + offset)
          result[n] = entries.signedGains and value >= 128 and value - 256 or value
        end
        local extraKeys = {}
        if entries.extraGains then
          result.extraGains = {}
          for _, gain in ipairs(entries.extraGains) do
            assert(type(gain.key) == "string" and math.type(gain.offset) == "integer"
              and gain.offset >= 0 and gain.offset < 128
              and math.type(gain.shift or 0) == "integer" and (gain.shift or 0) >= 0
              and (gain.shift or 0) <= 7 and math.type(gain.mask or 255) == "integer"
              and (gain.mask or 255) >= 0 and (gain.mask or 255) <= 255
              and (gain.signBits == nil or math.type(gain.signBits) == "integer"
                and gain.signBits >= 1 and gain.signBits <= 8),
              "Invalid extra level-up gain recipe")
            local value = ((shadow[actor + gain.offset] or input(actor + gain.offset))
              >> (gain.shift or 0)) & (gain.mask or 255)
            if gain.signBits then
              local wrap = 1 << gain.signBits
              value = value & (wrap - 1)
              if value >= wrap // 2 then value = value - wrap end
            end
            result.extraGains[gain.key], extraKeys[gain.key] = value, true
          end
        end
        if entries.transformGains then
          -- A verified profile may translate native intermediate changes to
          -- persistent stat deltas only after every combat/RNG call finishes.
          -- The callback reads the frozen input and final private shadow;
          -- it mutates this result in place and has no host write API here.
          entries.transformGains(result, ramByte, shadow)
          for key in pairs(result) do
            assert(key == "extraGains" or math.type(key) == "integer" and key >= 1 and key <= 8,
              "Invalid transformed level-up gains")
          end
          for n = 1, 8 do
            assert(math.type(result[n]) == "integer" and result[n] >= -255 and result[n] <= 255,
              "Invalid transformed level-up gains")
          end
          assert(result.extraGains == nil or type(result.extraGains) == "table",
            "Invalid transformed level-up gains")
          for key, value in pairs(result.extraGains or {}) do
            assert(extraKeys[key] and math.type(value) == "integer" and value >= -255 and value <= 255,
              "Invalid transformed level-up gains")
          end
          for key in pairs(extraKeys) do
            assert(result.extraGains and math.type(result.extraGains[key]) == "integer",
              "Invalid transformed level-up gains")
          end
        end
        return true, result, 100
      end
      stage = stage + 1
      previousSteps = 0
      run = begin(shadow)
    end
    return false, nil, progress(previousSteps)
  end
end

-- FE8 routes tutorial/scripted battles through its actual scripted unwind.
local fe8LevelPredictionBase = modLevelPredictionStart
local function modLevelPredictionStart(sharedRam, entries)
  return fe8LevelPredictionBase(sharedRam, { scriptedBattle = true, entries = entries })
end
return modLevelPredictionStart
