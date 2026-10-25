-- Exact 9D22107C engine entries. All jobs operate on isolated CPU/RAM snapshots.
return {
  unitLookup = 0x0859A5D0,
  expClear = 0x0802C740,
  restoreWeapon = 0x0802C6EC,
  expApply = 0x0802B92C,
  prepareBattle = 0x0802EB10,
  scriptedBattle = 0x0802CF4C,
  normalBattle = 0x0802AED0,
  finishBattle = 0x0802EB50,
  levelUp = 0x0802BA28,
  beforeEntry = {
    [0x08B5A7EE] = function(registers, read)
      -- This ROM's NosferaFix also runs after the non-drain path leaves r3=4.
      -- Its signed read/add/store then targets BIOS address 9; the bus ignores
      -- that store. r2 is dead until the unconditional reload at 0802B7EA, and
      -- the intervening class comparison replaces the arithmetic flags.
      -- Eliminate only those three dead instructions. Valid battle-buffer
      -- writes and every combat/skill/RNG routine still execute unchanged.
      if registers[3] ~= 4 then
        return
      end
      assert(
        read(0x08B5A7EE, 2) == 0x569A
          and read(0x08B5A7F0, 2) == 0x1852
          and read(0x08B5A7F2, 2) == 0x715A
          and read(0x08B5A7F4, 2) == 0x6860
          and read(0x08B5A7F8, 2) == 0x2866
          and read(0x0802B7EA, 2) == 0x4A11,
        "Unverified NosferaFix protected-store path"
      )
      return 0x08B5A7F4
    end,
  },
}
