-- Exact-ROM FE8 entry veneers dispatch to this hack's native implementations.
-- Every call and all RNG writes execute only on the private CPU/RAM snapshot.
return {
  cpuStepsPerTick=512,analysisBudgetRetries=2,signedGains=true,
  nativeGrowth={refreshTicks=120,getters={
    {key="Hp",label="HP",entry=0x97FE62C,currentField="maxHp"},
    {key="Power",label="Str",entry=0x97FE64C,currentField="str"},
    {key="Mag",label="Mag",entry=0x97FE66C,currentField="mag"},
    {key="Skill",label="Skl",entry=0x97FE6A4,currentField="skill"},
    {key="Spd",label="Spd",entry=0x97FE6C4,currentField="spd"},
    {key="Luck",label="Lck",entry=0x97FE72C,currentField="luck"},
    {key="Def",label="Def",entry=0x97FE6E4,currentField="def"},
    {key="Res",label="Res",entry=0x97FE708,currentField="res"},
  }},
  unitLookup=0x0859A5D0,
  expClear=0x0802C740,restoreWeapon=0x0802C6EC,expApply=0x0802B92C,
  prepareBattle=0x0802EB10,scriptedBattle=0x0802CF4C,
  normalBattle=0x0802AED0,finishBattle=0x0802EB50,levelUp=0x0802BA28,
}
