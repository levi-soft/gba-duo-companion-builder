-- EU entry points matched against each actual ROM routine, not a global offset.
-- Native execution must remain confined to private CPU/RAM snapshots.
return {
  unitLookup = 0x087AB8B0,
  expClear = 0x0802CA90,
  restoreWeapon = 0x0802CA3C,
  expApply = 0x0802BC7C,
  prepareBattle = 0x0802EE60,
  scriptedBattle = 0x0802D29C,
  normalBattle = 0x0802B224,
  finishBattle = 0x0802EEA0,
  levelUp = 0x0802BD78,
}
