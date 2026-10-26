-- BE8E / 2BCFEC83: execute the ROM's patched combat/EXP/level-up routines.
return {
  cpuStepsPerTick=512,
  analysisBudgetRetries=2,
  unitLookup=0x0859A5D0,
  expClear=0x0802C740,
  restoreWeapon=0x0802C6EC,
  expApply=0x0802B92C,
  prepareBattle=0x0802EB10,
  scriptedBattle=0x0802CF4C,
  normalBattle=0x0802AED0,
  finishBattle=0x0802EB50,
  levelUp=0x0802BA28,
}
