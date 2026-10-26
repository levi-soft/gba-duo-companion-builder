-- Preserve inventory/rescue bindings and adapt exact-ROM equipment/stat getters.
local query=pack.require("features.native-query")
return function(D,map)
  local base=pack.require("game.fe8-equipment")(D,map)
  local key,cached,pending,result
  local function begin(unit,v)
    local output={}
    local job=query({[0x0203A8F0]=0,[0x0203A8F1]=0})
    for field,entry in pairs({maxHp=0x08019190,str=0x080191B0,skill=0x080191D0,
      spd=0x08019210,def=0x08019250,res=0x08019270,luck=0x08019298,
      move=0x08019224,con=0x08019284,aid=0x080189B8})do
      local name=field
      job.add(entry,{unit},function(value)output[name]=value end)
    end
    job.add(0x08016B28,{unit},function(weapon)
      local item=D.forecastItems[weapon & 255]
      local slot=0
      for n=0,4 do if weapon~=0 and mem.u16(unit+30+n*2)==weapon then slot=n+1;break end end
      output.equipmentWeapon,output.equipmentSlot=weapon,slot
      output.equipmentHasWeapon,output.equipmentMissing=weapon~=0,weapon==0
      output.equipmentId,output.equipmentName=weapon & 255,item and item.name or "---"
      output.weaponType=item and D.weaponTypes[item.type] or "---"
      output.equipmentAS=output.spd
      job.add(0x08B47B54,{unit,weapon},function(mask)
        local min,max
        for n=1,15 do if (mask & (1<<(n-1)))~=0 then min=min or n;max=n end end
        output.equipmentRange=min and (min==max and tostring(min) or min.."-"..max) or "---"
      end)
      if weapon==0 or not item then
        output.equipmentAtk,output.equipmentHit,output.equipmentCrit="---","---","---"
        return
      end
      for field,entry in pairs({weaponMight=0x080175DC,weaponHit=0x080175F4,
        weaponWeight=0x0801760C,weaponCrit=0x08017624})do
        local name=field
        job.add(entry,{weapon},function(value)output[name]=value end)
      end
      local actor=0x0203A4EC
      job.add(0x0802A584,{actor,unit},function(_,shadow)
        for _,at in ipairs({0x48,0x4A})do
          shadow[actor+at],shadow[actor+at+1]=weapon & 255,weapon>>8
        end
        for n=0,3 do shadow[actor+0x4C+n]=(item.attributes>>(n*8)) & 255 end
        shadow[actor+0x53],shadow[actor+0x54]=0,0
      end)
      job.add(0x0802ABAC,{actor})
      job.add(0x0802AC18,{actor},function(_,shadow)
        local function word(at)return (shadow[actor+at] or 0)|((shadow[actor+at+1] or 0)<<8)end
        output.equipmentHit,output.equipmentCrit=word(0x60),word(0x66)
        output.equipmentAtk=output.str+output.weaponMight
        if item.id==7 then output.equipmentAtk=15 end
        if item.id==16 and (D.chars[v.characterPointer].attributes & 0x4000)~=0 then
          output.equipmentAtk=output.equipmentAtk+output.weaponMight
        end
        if item.id==0xB5 then output.equipmentAtk=0 end
      end)
    end)
    return job,output
  end
  return function(v,unit)
    base(v,unit)
    local current=tostring(unit)..mem.read(unit,72)
    if key~=current then key,cached=current,nil;pending,result=begin(unit,v)end
    if pending and pending.step(512)then cached,pending=result,nil end
    if not cached then
      v.equipmentAtk,v.equipmentHit,v.equipmentCrit,v.equipmentAvoid="...","...","...","..."
      return v
    end
    for name,value in pairs(cached)do v[name]=value end
    for n=1,5 do v["item"..n.."Badge"]=n==v.equipmentSlot and "E" or "" end
    local avoid=0
    local rows=mem.u32(0x0202E4DC)
    if rows>=0x02000000 and rows<0x02040000 and v.unitX<mem.u16(0x0202E4D4)
      and v.unitY<mem.u16(0x0202E4D6)then
      local row=mem.u32(rows+v.unitY*4)
      if row>=0x02000000 and row<0x02040000 then
        avoid=D.classes[v.classPointer].avoid[mem.u8(row+v.unitX)+1] or 0
      end
    end
    v.equipmentAvoid=v.spd+v.luck+avoid
    return v
  end
end
