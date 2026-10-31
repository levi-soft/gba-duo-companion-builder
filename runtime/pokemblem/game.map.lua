-- Exact-ROM native grids, with private native generation for companion picks.
local queries=pack.require("features.native-map-query")
return function(D)
  local movement=queries({cache=D.skillConfig and D.skillConfig.cache,beforeEntry=D.execution and D.execution.beforeEntry,
    allowArm=true,maxSteps=2000000,compactReads=true,trackRevision=false,deferCapture=true,
    preserveCompletedOnBudgetError=true})
  local privateRanges=pack.require("game.native-ranges")(D,movement)
  D.nativeMovementVerified=true
  D.mapMoveForUnit=function(unit)
    local value=movement.request("move:"..unit,{{entry=0x08019224,args={unit},key="move"}})
    if value then
      assert(value.move>=0 and value.move<=31,"Invalid Pokemblem native movement total")
      return value.move
    end
  end
  local map=pack.require("game.fe8-map")(D)
  map.config.showRanges=false
  local function ram(address,length)
    return address>=0x02000000 and address+length<=0x02040000
      or address>=0x03000000 and address+length<=0x03008000
  end
  local function processes()
    local idle,rangeOwner,freeMovement=false,false,(mem.u8(0x030017A7)&1)~=0
    for n=0,63 do
      local proc=0x02024E68+n*108
      local script,pc=mem.u32(proc),mem.u32(proc+4)
      if script==0x0969B044 or script==0x0969B004 or script==0x0969B024 then
        freeMovement=freeMovement or pc>=script+8 and pc<script+0x600
      elseif script==0x0859AAD8 then
        idle=pc==0x0859AB58 and mem.u8(proc+0x28)==0
        rangeOwner=pc==0x0859ABA0 or pc==0x0859ACA8
      end
    end
    return idle,rangeOwner,freeMovement
  end
  local function grid(global,width,height)
    local rows=mem.u32(global)
    if not ram(rows,height*4) then return nil end
    local result={}
    for y=0,height-1 do
      local row=mem.u32(rows+y*4)
      if not ram(row,width) then return nil end
      for x=0,width-1 do result[#result+1]=mem.u8(row+x) end
    end
    return result
  end
  local function at(values,n)return type(values)=="string" and values:byte(n) or values[n]end
  local function validGridRows(global,width,height)
    local rows=mem.u32(global)
    if not ram(rows,height*4)then return false end
    for y=0,height-1 do if not ram(mem.u32(rows+y*4),width)then return false end end
    return true
  end
  local function presentRanges(v,movement,attack,id,source)
    v.mapRangesNative=true;v.mapRangesUnitId=id;v.mapRangesSource=source
    v.mapRangesLabel=source=="game" and "Native ranges for the unit selected in game."
      or "Native ranges for the companion's selected unit."
    for n,cell in ipairs(v.mapCells)do
      cell.move=at(movement,n)<0x78;cell.attack=not cell.move and at(attack,n)>0
      cell.inRange=cell.move or cell.attack
      cell.rangeColor=cell.move and (map.config.moveColor or "#367ce8")
        or cell.attack and (map.config.attackColor or "#ed4357") or "transparent"
      if cell.move then v.mapMoveCount=v.mapMoveCount+1 end
      if cell.attack then v.mapAttackCount=v.mapAttackCount+1 end
    end
  end
  local function visibleUnit(id,width,height)
    local unit=D.slots[id]
    if unit and ram(unit,0x48) and mem.u8(unit+11)==id and mem.u8(unit+19)>0
      and (mem.u32(unit+12)&0x1002c)==0
      and (id<128 or (mem.u32(unit+12)&0x200)==0)
      and mem.u8(unit+16)<width and mem.u8(unit+17)<height then return unit end
  end
  local dangerUnion
  local function privateDanger(enemies,width,height)
    local changed=not dangerUnion or dangerUnion.width~=width or dangerUnion.height~=height
      or #dangerUnion.sources~=#enemies
    if not changed then
      for n,source in ipairs(enemies)do if source~=dangerUnion.sources[n]then changed=true;break end end
    end
    if changed then dangerUnion={width=width,height=height,sources=enemies,cells={},enemy=1,cell=1}end
    local used,count=0,width*height
    while used<1024 and dangerUnion.enemy<=#enemies do
      local source=enemies[dangerUnion.enemy]
      local stop=math.min(count,dangerUnion.cell+1024-used-1)
      for n=dangerUnion.cell,stop do
        if at(source,n)>0 then dangerUnion.cells[n]=true end
      end
      used=used+stop-dangerUnion.cell+1;dangerUnion.cell=stop+1
      if dangerUnion.cell>count then dangerUnion.enemy=dangerUnion.enemy+1;dangerUnion.cell=1 end
    end
    return dangerUnion.enemy>#enemies and dangerUnion.cells or nil
  end
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
    v.mapRangesUnavailable=false;v.mapRangesBusy=false;v.mapNativeRangesBusy=false
    v.mapRangesNative=false;v.mapRangesUnitId=0;v.mapRangesSource=""
    v.mapDangerEnabled=previous and previous.mapDangerEnabled==true or false
    -- Shared UI uses this as the OFF-state visibility, not a capability flag.
    v.mapDangerDisabled=not v.mapDangerEnabled;v.mapDangerReady=false
    v.mapDangerLabel=v.mapDangerEnabled and "Danger ON" or "Danger OFF"
    v.mapDangerSource=""
    v.mapRangesLabel="Point at or pick a unit to show its native ranges."
    v.mapMoveCount=0;v.mapAttackCount=0;v.mapDangerCount=0
    for _,cell in ipairs(v.mapCells or {})do
      cell.move=false;cell.attack=false;cell.inRange=false;cell.danger=false;cell.rangeColor="transparent"
    end
    if preparationsActive or not v.mapPresent then return end
    local width,height=v.mapWidth,v.mapHeight
    if not width or not height or width<1 or height<1 or width>64 or height>64 then return end
    local idle,rangeOwner,freeMovement=processes()
    if freeMovement then
      -- The map remains drawable, but no tactical range job exists in FreeMU.
      -- The reset above restores availability on the next tactical update.
      v.mapRangesUnavailable=true
      v.mapDangerDisabled=true
      v.mapRangesLabel="Free movement is active; ranges appear in tactical battles."
      v.mapDangerLabel=v.mapRangesLabel
      return
    end
    local active=mem.u32(0x03004E50)
    local layoutReady
    local function privateReady()
      if layoutReady==nil then
        layoutReady=validGridRows(0x0202E4E0,width,height)and validGridRows(0x0202E4E4,width,height)
      end
      return layoutReady
    end
    if not freeMovement and rangeOwner and selected and selected==active
      and ram(selected,0x48) and D.slots[mem.u8(selected+11)]==selected
      and mem.u8(selected+19)>0 and (mem.u32(selected+12)&0x1000c)==0
      and (mem.u8(selected+11)<128 or (mem.u32(selected+12)&0x200)==0) then
      local movement,attack=grid(0x0202E4E0,width,height),grid(0x0202E4E4,width,height)
      if movement and attack then
        presentRanges(v,movement,attack,mem.u8(selected+11),"game")
      end
    end
    if not v.mapRangesNative then
      for _,entry in ipairs(v.mapRoster or {})do
        local unit=entry.member and entry.selected and visibleUnit(entry.id,width,height)
        if unit then
          local ranges=privateReady()and privateRanges(unit,width,height)
          if ranges then presentRanges(v,ranges.movement,ranges.attack,entry.id,"private")
          else v.mapRangesBusy=true end
          break
        end
      end
    end
    -- FogDR repurposes the visibility grid only with chapter vision == 0.
    -- Never disclose hidden tiles by interpreting ordinary fog as threats.
    if not v.mapDangerEnabled then v.mapDangerReady=true
    elseif mem.u8(0x0202BCFD)==0 and mem.u8(0x03000006)>0 then
      local danger=grid(0x0202E4E8,width,height)
      if danger then
        v.mapDangerReady=true;v.mapDangerSource="game"
        for n,cell in ipairs(v.mapCells)do
          cell.danger=danger[n]>0
          cell.dangerColor=map.config.dangerColor or "#b52b77"
          if cell.danger then v.mapDangerCount=v.mapDangerCount+1 end
        end
      end
    end
    if v.mapDangerEnabled and not v.mapDangerReady then
      local enemies,ready={},true
      for _,entry in ipairs(v.mapRoster or {})do
        local unit=entry.member and entry.id>=128 and visibleUnit(entry.id,width,height)
        if unit then
          local ranges=privateReady()and privateRanges(unit,width,height)
          if ranges then enemies[#enemies+1]=ranges.attack else ready=false end
        end
      end
      if ready then
        local cells=privateDanger(enemies,width,height)
        v.mapDangerReady=cells~=nil
        if cells then
          v.mapDangerSource="private"
          for n,cell in ipairs(v.mapCells)do
            cell.danger=cells[n]==true
            cell.dangerColor=map.config.dangerColor or "#b52b77"
            if cell.danger then v.mapDangerCount=v.mapDangerCount+1 end
          end
        end
      end
      if not v.mapDangerReady then v.mapRangesBusy=true end
    end
    v.mapNativeRangesBusy=v.mapRangesBusy
    if v.mapRangesBusy then v.mapDangerLabel=v.mapDangerEnabled and "Calculating…" or "Danger OFF" end
  end
  local nativeGrids=map.apply
  map.apply=function(v,selected,preparations)
    movement.begin()
    local unit=v.unitPresent and D.slots[v.deployment]
    if unit then D.mapMoveForUnit(unit)end
    local result=nativeGrids(v,selected,preparations)
    movement.step(512) -- Header totals do not gate or delay the game's own grids.
    return result
  end
  return map
end
