-- Opt-in exact-ROM native movement, usability and movement-cost predicates.
local queries=pack.require("features.native-map-query")
return function(D,config)
  local query=queries({cache=D.skillConfig and D.skillConfig.cache,beforeEntry=D.execution and D.execution.beforeEntry,
    preserveCompletedOnBudgetError=true})
  local inheritedReady,inheritedRevision=D.mapRangesReady,D.mapRangeRevision
  local inheritedCosts=D.mapMovementCostsForUnit
  local function unitResult(unit)
    local phases={{entry=config.moveEntry,args={unit},key="move"}}
    if config.acrobatEntry then phases[#phases+1]={entry=config.acrobatEntry,args={unit,config.acrobatId},key="acrobat"}end
    local value=query.request("unit:"..unit,phases)
    if value then
      assert(value.move>=0 and value.move<=31,"Invalid native movement result")
      if config.acrobatEntry then assert(value.acrobat==0 or value.acrobat==1,"Invalid native Acrobat result")end
    end
    return value
  end
  D.nativeMovementVerified=true
  D.mapMoveForUnit=function(unit)local value=unitResult(unit);return value and value.move end
  D.mapMovementStatus=function(unit)return unitResult(unit)~=nil end
  if config.acrobatEntry then
    D.mapMovementCostsForUnit=function(unit,costs)
      if inheritedCosts then costs=inheritedCosts(unit,costs)end
      local value=unitResult(unit)
      if not value or value.acrobat==0 then return costs end
      local adjusted={};for n,cost in ipairs(costs)do adjusted[n]=cost==255 and 255 or 1 end
      return adjusted
    end
  end
  if config.weaponEntry then
    D.mapWeaponsForUnit=function(unit)
      local result={}
      for slot=0,4 do
        local raw,item=mem.u16(unit+30+slot*2),nil
        item=D.mapWeapons[raw%256]
        if raw~=0 and item then
          local value=query.request("weapon:"..unit..":"..raw,{{entry=config.weaponEntry,args={unit,raw},key="usable"}})
          if value then
            assert(value.usable==0 or value.usable==1,"Invalid native weapon usability result")
            if value.usable==1 then result[#result+1]={raw=raw,item=item}end
          end
        end
      end
      return result
    end
  end
  D.mapRangesReady=function(units,focusId)
    if inheritedReady and not inheritedReady(units,focusId)then return false end
    local focus=units[focusId]
    if focus then unitResult(focus.u)end
    if ui and ui.mapDangerEnabled==true then
      for id,unit in pairs(units)do if id>=128 and(unit.state&0x200)==0 then unitResult(unit.u)end end
    end
    return query.ready()
  end
  D.mapRangeRevision=function()
    return (inheritedRevision and tostring(inheritedRevision()) or "")..query.revision()
  end
  local map=pack.require("game.fe8-map")(D)
  map.config.respectAiHold=false -- Exact native total includes the ROM's AI rules.
  local apply=map.apply
  map.apply=function(v,...)
    query.begin()
    -- The Units adapter requests totals after this call. Prequeue its selected
    -- unit even when Preparations or an invalid map makes the base map return.
    local selected=v and v.unitPresent and D.slots[v.deployment]
    if selected then unitResult(selected)end
    local result=apply(v,...)
    query.step(config.workSlice or 512)
    if v then v.mapNativeRangesBusy=v.mapRangesBusy==true end
    return result
  end
  return map
end
