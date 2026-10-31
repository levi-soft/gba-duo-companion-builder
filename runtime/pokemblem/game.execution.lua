-- Exact-ROM FE8 entry veneers dispatch to this hack's native implementations.
-- Every call and all RNG writes execute only on the private CPU/RAM snapshot.
return {
  cpuStepsPerTick=512,analysisBudgetRetries=2,signedGains=true,
  nativeGrowth={refreshTicks=120,capProbe={entry=0x0802BF24,fields={
    {key="Hp",offset=18,gainOffset=0x73},
    {key="Power",offset=20,gainOffset=0x74},
    {key="Mag",offset=58,gainOffset=0x7A},
    {key="Skill",offset=21,gainOffset=0x75},
    {key="Spd",offset=22,gainOffset=0x76},
    {key="Luck",offset=25,gainOffset=0x79},
    {key="Def",offset=23,gainOffset=0x77},
    {key="Res",offset=24,gainOffset=0x78},
  }},getters={
    {key="Hp",label="HP",entry=0x967094C,currentField="maxHp"},
    {key="Power",label="Str",entry=0x967096C,currentField="str"},
    {key="Mag",label="Mag",entry=0x967098C,currentField="mag"},
    {key="Skill",label="Skl",entry=0x96709C4,currentField="skill"},
    {key="Spd",label="Spd",entry=0x96709E4,currentField="spd"},
    {key="Luck",label="Lck",entry=0x9670A4C,currentField="luck"},
    {key="Def",label="Def",entry=0x9670A04,currentField="def"},
    {key="Res",label="Res",entry=0x9670A28,currentField="res"},
  }},
  unitLookup=0x0859A5D0,
  expClear=0x0802C740,restoreWeapon=0x0802C6EC,expApply=0x0802B92C,
  prepareBattle=0x0802EB10,scriptedBattle=0x0802CF4C,
  normalBattle=0x0802AED0,finishBattle=0x0802EB50,levelUp=0x0802BA28,
}
