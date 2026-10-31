-- Exact-ROM FE8 entry veneers dispatch to this hack's native implementations.
-- Every call and all RNG writes execute only on the private CPU/RAM snapshot.
return {
  cpuStepsPerTick=512,analysisBudgetRetries=2,signedGains=true,
  nativeGrowth={refreshTicks=120,getters={
    {key="Hp",label="HP",entry=0x8B5F324,currentField="maxHp"},
    {key="Power",label="Str",entry=0x8B5F344,currentField="str"},
    {key="Mag",label="Mag",entry=0x8B5F364,currentField="mag"},
    {key="Skill",label="Skl",entry=0x8B5F39C,currentField="skill"},
    {key="Spd",label="Spd",entry=0x8B5F3BC,currentField="spd"},
    {key="Luck",label="Lck",entry=0x8B5F424,currentField="luck"},
    {key="Def",label="Def",entry=0x8B5F3DC,currentField="def"},
    {key="Res",label="Res",entry=0x8B5F400,currentField="res"},
  }},
  unitLookup=0x0859A5D0,
  expClear=0x0802C740,restoreWeapon=0x0802C6EC,expApply=0x0802B92C,
  prepareBattle=0x0802EB10,scriptedBattle=0x0802CF4C,
  normalBattle=0x0802AED0,finishBattle=0x0802EB50,levelUp=0x0802BA28,
}
