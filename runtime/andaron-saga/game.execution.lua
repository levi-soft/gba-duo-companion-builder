-- BE8E / A3B9CD19; native ROM routines on frozen private RAM.
return {
  beforeEntry=pack.require("game.official-bios")(0x8b5087a,0x8b60dc2),
  signedGains=true,
  cpuStepsPerTick=512, analysisBudgetRetries=2,
  unitLookup=0x0859A5D0,expClear=0x0802C740,restoreWeapon=0x0802C6EC,
  expApply=0x0802B92C,prepareBattle=0x0802EB10,scriptedBattle=0x0802CF4C,
  normalBattle=0x0802AED0,finishBattle=0x0802EB50,levelUp=0x0802BA28,
}
