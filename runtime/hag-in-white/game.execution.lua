-- BE8E / 7479D7E2: native entry points include this hack's redirects.
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
}
