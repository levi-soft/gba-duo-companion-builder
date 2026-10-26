-- BE8E / 13F15F23: native entry points include this hack's redirects.
-- Execute the local ROM's patched routines on isolated CPU/RAM copies.
return {
  -- Share CPU work across more updates while the emulator/UI are also running.
  cpuStepsPerTick = 512,
  analysisBudgetRetries = 2,
  unitLookup = 0x0859A5D0,
  expClear = 0x0802C740,
  restoreWeapon = 0x0802C6EC,
  expApply = 0x0802B92C,
  prepareBattle = 0x0802EB10,
  scriptedBattle = 0x0802CF4C,
  normalBattle = 0x0802AED0,
  finishBattle = 0x0802EB50,
  levelUp = 0x0802BA28,
  damageForExp = function(byte)
    local actor,target=0x0203A4EC,0x0203A56C
    local function word(at)return byte(at) | (byte(at+1)<<8)end
    local function signed(at)local n=word(at);return n>=32768 and n-65536 or n end
    local count=signed(actor+0x5E)>=signed(target+0x5E)+2 and 2 or 1
    if (byte(actor+0x4C) & 0x20)~=0 then count=count*2 end
    -- This ROM scales non-kill EXP by damage. Define the card explicitly as
    -- all regular hits connecting, without criticals, leaving the target alive.
    return math.max(1,math.min(byte(target+0x72)-1,
      math.max(1,signed(actor+0x5A)-signed(target+0x5C))*count))
  end,
  beforeEntry = {
    [0x08B4E376] = function(registers, read)
      -- This exact ROM's DrainEffectFix also reaches the non-drain path with
      -- r3=4. Its BIOS write is ignored by the GBA bus; r0/r2 and flags are dead
      -- before the unconditional reload. Keep valid battle-buffer paths intact.
      if registers[3] ~= 4 then return end
      assert(read(0x08B4E376, 2) == 0x5E9A
        and read(0x08B4E378, 2) == 0x1852
        and read(0x08B4E37A, 2) == 0x2005
        and read(0x08B4E37C, 2) == 0x521A
        and read(0x08B4E37E, 2) == 0x6860
        and read(0x0802B7EA, 2) == 0x4A11,
        "Unverified Sacred Echoes protected-store path")
      return 0x08B4E37E
    end,
  },
}
