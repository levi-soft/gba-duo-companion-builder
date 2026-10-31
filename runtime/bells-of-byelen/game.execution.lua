-- Exact-ROM FE8 entry veneers dispatch to this hack's native implementations.
-- Every call and all RNG writes execute only on the private CPU/RAM snapshot.
return {
  cpuStepsPerTick=512,analysisBudgetRetries=2,signedGains=true,
  nativeGrowth={refreshTicks=120,getters={
    {key="Hp",label="HP",entry=0x9802CB0,currentField="maxHp"},
    {key="Power",label="Str",entry=0x9802CD0,currentField="str"},
    {key="Mag",label="Mag",entry=0x9802CF0,currentField="mag"},
    {key="Skill",label="Skl",entry=0x9802D28,currentField="skill"},
    {key="Spd",label="Spd",entry=0x9802D48,currentField="spd"},
    {key="Luck",label="Lck",entry=0x9802DB0,currentField="luck"},
    {key="Def",label="Def",entry=0x9802D68,currentField="def"},
    {key="Res",label="Res",entry=0x9802D8C,currentField="res"},
    {key="Con",label="Build",entry=0x9802DD4,currentField="con",radar=false},
    {key="Mov",label="Mov",entry=0x9802DEC,currentField="move",radar=false},
  }},
  extraStats={{key="Con",currentOffset=0x1A},{key="Mov",currentOffset=0x1D}},
  unitLookup=0x0859A5D0,
  expClear=0x0802C740,restoreWeapon=0x0802C6EC,expApply=0x0802B92C,
  prepareBattle=0x0802EB10,scriptedBattle=0x0802CF4C,
  normalBattle=0x0802AED0,finishBattle=0x0802EB50,levelUp=0x0802BA28,
  allowedBattleConfigs={[0]=true,[1]=true,[2]=true},
  extraGains={{key="Con",offset=0x59,shift=4,mask=15,signBits=4},{key="Mov",offset=0x59,mask=15,signBits=4}},
  beforeEntry={
    [0x0802BF32]=function(registers,read,write,context)
      if context~=nil then return end
      local gainPointer=registers[12]
      -- This exact level-up caller passes a small scalar as the second
      -- argument of vanilla CheckBattleUnitStatCaps. Every possible store is
      -- at gainPointer+0x73..0x79 in read-only BIOS; its calculations and CPU
      -- clobbers are discarded by the caller. No latch value is needed.
      -- Keep every valid RAM-buffer cap call and explicit-context path native.
      if gainPointer<0 or gainPointer+0x79>=0x4000 then return end
      local unit=registers[2]
      assert(registers[14]==0x0981E679 and unit==registers[4]
        and unit>=0x02000000 and unit+0x80<=0x02040000
        and registers[0]==gainPointer+0x73
        and read(0x0802BF24,4)==0x1c02b530
        and read(0x0802BF28,4)==0x2112468c
        and read(0x0802BF2C,4)==0x46605651
        and read(0x0802BF30,4)==0x78003073
        and read(0x0802BF68,4)==0x31734661
        and read(0x0802BF6C,2)==0x7008
        and read(0x0802BF72,2)==0x4664 and read(0x0802BF74,2)==0x3474
        and read(0x0802BF8E,2)==0x7020
        and read(0x0802BF94,4)==0x34754664
        and read(0x0802BFAC,2)==0x7020
        and read(0x0802BFB2,2)==0x4664 and read(0x0802BFB4,2)==0x3476
        and read(0x0802BFCA,2)==0x7020
        and read(0x0802BFD0,4)==0x34774664
        and read(0x0802BFE8,2)==0x7020
        and read(0x0802BFEE,2)==0x4663 and read(0x0802BFF0,2)==0x3378
        and read(0x0802C006,2)==0x7018
        and read(0x0802C00C,4)==0x33794663
        and read(0x0802C020,2)==0x7018
        and read(0x0802C022,2)==0xbc30 and read(0x0802C024,2)==0xbc01
        and read(0x0802C026,2)==0x4700
        and read(0x0981E670,4)==0x4b400020
        and read(0x0981E674,4)==0xf8c4f000
        and read(0x0981E678,4)==0xbc01bcf7
        and read(0x0981E67C,2)==0x4700
        and read(0x0981E774,4)==0x0802BF25
        and read(0x0981E800,2)==0x4718,
        "Unverified Bells scalar cap call")
      -- The original PUSH already ran. Restore it through its own epilogue;
      -- every real state/stack write and the caller's restoration remain intact.
      return 0x0802C022
    end,
    [0x0981D924]=function(registers,read,write)
      -- CanUseAccessory stores u16 at SP+4 then reloads a full word. Its
      -- callee immediately truncates to u8; the upper halfword is dead padding.
      -- Initialize only those two bytes; every meaningful stack read stays strict.
      write(registers[13]+6,0,2)
    end,
  },
}
