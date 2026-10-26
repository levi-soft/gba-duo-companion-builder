-- Sacred Echoes has class commands/traits, not the Skill System used by Hag.
return function(D)
  local talk=pack.require("game.talk")(D)
  local start=pack.require("features.thumb").start
  local cachedKey,cachedSpells
  local traits={
    shove={"Shove","Pushes an adjacent movable unit one space."},
    smite={"Smite","Pushes an adjacent movable unit two spaces."},
    canto={"Canto","Uses remaining movement after non-combat actions."},
    swap={"Swap","Switches places with an adjacent ally."},
    pivot={"Pivot","Moves to the opposite side of an adjacent ally."},
    armor={"Heavy Armor","Halves damage from bows."},
    apotrope={"Apotrope","Halves magical damage and grants Res +5."},
    bow1={"Bowrange +1","Adds one tile to bow attack range."},
    bow2={"Bowrange +2","Adds two tiles to bow attack range."},
    slayer={"Slayer","Attacks are effective against monsters."},
    lock={"Locktouch","Opens doors and chests without a key."},
    pact={"Pact","Spells do not cost HP."},
  }
  return {apply=function(v, unit)
    talk(v,unit)
    -- Keep the engine's fifth proficiency byte; expose the ROM's own category.
    for _,suffix in ipairs({"","Raw","Progress","ProgressMax"})do
      v["rankDragonstone"..suffix]=v["rankStaff"..suffix]
    end
    local keys={}
    local function add(key)keys[#keys+1]=key end
    if unit then
      local class,char=D.classes[mem.u32(unit+4)],D.chars[mem.u32(unit)]
      local id=class.id
      if D.classTraits[id] then for _,key in ipairs(D.classTraits[id])do add(key)end end
      if ((class.attributes | char.attributes) & 0x10000)~=0 then add("pact")end
      local key=tostring(unit)..mem.read(unit,72)
      if key~=cachedKey then
        local done,pointer,shadow=start(D.spellConfig.entry,{unit},{})(4000)
        assert(done and pointer==D.spellConfig.buffer,"Unverified Sacred Echoes spell getter")
        cachedSpells={}
        for n=0,8 do
          local id=shadow[pointer+n]
          assert(id~=nil,"Spell list was not rebuilt")
          if id==0 then break end
          local item=D.forecastItems[id]
          local cost=((class.attributes | char.attributes)&0x10000)~=0 and 0 or D.spellCosts[id]
          cachedSpells[#cachedSpells+1]=item.name.." ("..cost.." HP)"
        end
        cachedKey=key
      end
      if #cachedSpells>0 then
        traits.spells={"Spells ("..#cachedSpells..")",table.concat(cachedSpells,"; ")..". Casting requires current HP greater than the cost."}
        add("spells")
      end
    end
    v.nativeSkillCount=#keys
    for n=1,4 do
      local trait=traits[keys[n]]
      v["nativeSkill"..n.."Present"]=trait~=nil
      v["nativeSkill"..n.."Name"]=trait and trait[1] or ""
      v["nativeSkill"..n.."Description"]=trait and trait[2] or ""
    end
  end}
end
