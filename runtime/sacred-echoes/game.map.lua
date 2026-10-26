-- Native map ranges include learned spells, class bonuses and equipment.
local query=pack.require("features.native-query")
return function(D)
  local cache,queue={},{}
  local revision=0
  local function stateFor(unit)
    local key=mem.read(unit,72)
    if cache[unit] and cache[unit].key==key then return cache[unit]end
    local state={key=key,weapons={},move=0,ready=false}
    local job=query({[0x0203A8F0]=0,[0x0203A8F1]=0})
    state.work=job;cache[unit]=state
    queue[#queue+1]={unit=unit,state=state}
    job.add(0x08019224,{unit},function(move)state.move=move end)
    job.add(D.spellConfig.entry,{unit},function(pointer,shadow)
      assert(pointer==D.spellConfig.buffer,"Unverified Sacred Echoes map spell getter")
      local raws={}
      for n=0,4 do raws[#raws+1]=mem.u16(unit+30+n*2)end
      for n=0,8 do
        local id=shadow[pointer+n]
        assert(id~=nil,"Map spell list was not rebuilt")
        if id==0 then break end
        raws[#raws+1]=0xFF00 | id
      end
      for _,value in ipairs(raws)do
        local raw=value
        local item=D.mapWeapons[raw & 255]
        if item and raw~=0 and ((item.a & 8)~=0 or raw>>8>0)then
          job.add(0x08016750,{unit,raw},function(can)
            if can==0 then return end
            job.add(0x08B47B54,{unit,raw},function(mask)
              local min,max
              for n=1,15 do if (mask & (1<<(n-1)))~=0 then min=min or n;max=n end end
              if min then
                local copy={};for name,value in pairs(item)do copy[name]=value end
                copy.range=(min<<4)|max
                state.weapons[#state.weapons+1]={item=copy,raw=raw}
              end
            end)
          end)
        end
      end
    end)
    return state
  end
  D.mapWeaponsForUnit=function(unit)return stateFor(unit).weapons end
  D.mapMoveForUnit=function(unit)return stateFor(unit).move end
  D.mapRangesReady=function()
    for _,job in ipairs(queue)do if cache[job.unit]==job.state and not job.state.ready then return false end end
    return true
  end
  D.mapRangeRevision=function()return revision end
  local base=pack.require("game.fe8-map")(D)
  local apply=base.apply
  base.apply=function(...)
    for _,job in ipairs(queue)do
      if cache[job.unit]==job.state and mem.read(job.unit,72)~=job.state.key then
        cache[job.unit]=nil
      end
    end
    while #queue>0 and (cache[queue[1].unit]~=queue[1].state or queue[1].state.ready)do table.remove(queue,1)end
    if queue[1] and queue[1].state.work.step(384)then
      queue[1].state.ready=true;revision=revision+1
    end
    return apply(...)
  end
  return base
end
