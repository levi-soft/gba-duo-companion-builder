-- Moves are stored separately from inventory; inventory-only threat maps lie.
-- Preserve map positions and companion picks until move-based ranges are traced.
return function(D)
  local map=pack.require("game.fe8-map")(D)
  map.config.showRanges=false
  local apply=map.apply
  map.apply=function(v,selected,preparationsActive)
    local previous=ui
    -- ui can be host-backed userdata, so avoid enumerating/copying it.
    local safe=setmetatable({mapDangerEnabled=false},{__index=function(_,key)return previous and previous[key]end})
    ui=safe
    local ok,message=pcall(apply,v,selected,preparationsActive)
    ui=previous
    if not ok then error(message)end
    -- Creature identity is the current class/species, not its reusable P-xx slot.
    -- Avatar classes are '--'; retain their actual character names.
    for _,entry in ipairs(v.mapRoster or {})do
      local unit=entry.member and D.slots[entry.id] or nil
      local species=unit and map.meta.classes[mem.u32(unit+4)] or nil
      if species and species.name and species.name~="" and species.name~="--" then
        entry.name=species.name
        if entry.selected then v.mapRangeUnit=species.name end
      end
    end
    v.mapRangesUnavailable=true;v.mapRangesBusy=false
    v.mapDangerEnabled=false;v.mapDangerDisabled=false;v.mapDangerReady=false
    v.mapDangerLabel="Move-based ranges unavailable"
    v.mapMoveCount=0;v.mapAttackCount=0;v.mapDangerCount=0
    for _,cell in ipairs(v.mapCells or {})do
      cell.move=false;cell.attack=false;cell.inRange=false;cell.danger=false;cell.rangeColor="transparent"
    end
    v.ui=v.ui or {};v.ui.set=v.ui.set or {};v.ui.set.mapDangerEnabled=false
  end
  return map
end
