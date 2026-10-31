-- Exact-ROM FE8 entry veneers dispatch to this hack's native implementations.
-- Every call and all RNG writes execute only on the private CPU/RAM snapshot.
return {
  cpuStepsPerTick=512,analysisBudgetRetries=2,signedGains=true,
  nativeGrowth={refreshTicks=120,getters={
    {key="Hp",label="HP",entry=0x9F51008,currentField="maxHp"},
    {key="Power",label="Str",entry=0x9F51020,currentField="str"},
    {key="Mag",label="Mag",entry=0x9F51038,currentField="mag"},
    {key="Skill",label="Skl",entry=0x9F51064,currentField="skill"},
    {key="Spd",label="Spd",entry=0x9F5107C,currentField="spd"},
    {key="Luck",label="Lck",entry=0x9F510F4,currentField="luck"},
    {key="Def",label="Def",entry=0x9F51094,currentField="def"},
    {key="Res",label="Res",entry=0x9F510AC,currentField="res"},
    {key="Con",label="Con",entry=0x9F510C4,currentField="con",radar=false},
    {key="Mov",label="Mov",entry=0x9F510DC,currentField="move",radar=false},
  }},
  extraStats={{key="Con",currentOffset=0x1A},{key="Mov",currentOffset=0x1D}},
  unitLookup=0x0859A5D0,
  expClear=0x0802C740,restoreWeapon=0x0802C6EC,expApply=0x0802B92C,
  prepareBattle=0x0802EB10,scriptedBattle=0x0802CF4C,
  normalBattle=0x0802AED0,finishBattle=0x0802EB50,levelUp=0x0802BA28,
  extraGains={{key="Con",offset=0x59,mask=255,signBits=8},{key="Mov",offset=0x7F,mask=255,signBits=8}},
  transformGains=function(result,ram)
    -- This ROM leaves changeMag nonzero at cap. Its actual writeback adds the
    -- byte to the persistent unit, then 09EF7220 clamps against MagClass+2.
    -- Model that exact post-battle result after every native RNG call has run.
    local actor=0x0203A4EC
    local unit=mem.u32(0x0859A5D0+ram(actor+11)*4)
    assert(unit>=0x02000000 and unit+0x48<=0x02040000,"Invalid Sun persistent actor")
    local class=0
    for n=0,3 do class=class|(ram(unit+4+n)<<(n*8))end
    assert(class>=0x08000000 and class<0x0A000000,"Invalid Sun actor class")
    local cap=mem.u8(0x09ED2FC8+mem.u8(class+4)*4+2)
    local before=ram(unit+0x3A)
    result[3]=math.min((before+result[3])&255,cap)-before
  end,
}
