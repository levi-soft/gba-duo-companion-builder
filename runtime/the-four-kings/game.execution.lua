-- Execute this ROM's patched routines on private RAM, in bounded work slices.
return {
  beforeEntry=pack.require("game.official-bios")(0x8b5e8fa,0x8b6ec16),
  signedGains = true,
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
}
