-- Companion runtime. Game-owned data is supplied only by local ROM preparation.
local D=__ROM_DATA__
-- FE7 Vietnamese companion 0.7.14. Built from ordered runtime sections; no runtime require/load.
-- Generated from manifest.studioComputed; shared with Studio live preview.
local studioPulseTick = 0
local lastUiIdentity = nil
local function truth(x) return x~=nil and x~=false and x~=0 and x~="" end
local function choose(c,a,b) if truth(c) then return a else return b end end
local function all(...) for i=1,select("#",...) do if not truth(select(i,...)) then return false end end return true end
local function any(...) for i=1,select("#",...) do if truth(select(i,...)) then return true end end return false end
local function first(...) for i=1,select("#",...) do local x=select(i,...) if x ~= nil and x ~= "" then return x end end return "" end
local mapCfg={["kind"]="fe7-us-v1",["size"]=33743832,["unitRows"]=33743836,["terrainRows"]=33743840,["cursor"]=33733580,["chapter"]=33733638,["turn"]=33733640,["tilePrefix"]="asset:images/minimap/",["playerColor"]="#438cff",["enemyColor"]="#ef4456",["allyColor"]="#54d778",["cursorColor"]="#ffe173",["maxDimension"]=64,["showRanges"]=true,["respectAiHold"]=true,["respectFog"]=true,["moveColor"]="#367ce8",["attackColor"]="#ed4357",["dangerColor"]="#b52b77"}
local mapRecipe=D.mapRecipe
local mapMeta=D.mapMeta
local mapSlots=D.slots
local mapWeapons=D.mapWeapons
actions=actions or {}
    function actions.focusMapUnit(id)
      if input and input.focusUnit then input.focusUnit(tonumber(id)) end
      return {}
    end

local function mapUsableWeapons(u,c,k)
  local result={};local attrs=(c.attributes or 0) | (k.attributes or 0);local status=mem.u8(u+48) & 15
  for slot=0,4 do local raw=mem.u16(u+30+slot*2);local item=mapWeapons[raw%256]
    if raw~=0 and item and ((item.a & 8)~=0 or (raw>>8)>0) and (item.r==0 or (attrs & item.r)==item.r) and ((item.a & 0x400)~=0 or item.t>=8 or mem.u8(u+40+item.t)>=item.rank) and not(status==3 and (item.a & 2)~=0) then result[#result+1]={item=item,raw=raw} end
  end
  return result
end
local function mapUnitReach(v,focus,grid,terrain)
  local w,h=v.mapWidth,v.mapHeight
  if not focus or focus.x>=w or focus.y>=h or (focus.state & 0x20)~=0 then return {},0,{} end
  local weather=mem.u8(0x0202bc0d);local costs=(focus.state & 0x800)~=0 and mapMeta.ballistaCosts or focus.k.movementCosts[(weather==1 or weather==2) and 3 or weather==4 and 2 or 1]
  local move=math.max(0,math.min(31,focus.k.move+mem.s8(focus.u+29)))
  local aiA,aiB=mem.u8(focus.u+66),mem.u8(focus.u+68)
  if focus.status==2 or (mapCfg.respectAiHold~=false and focus.id>=64 and aiB==3 and aiA>=3 and aiA<=5) then move=0 end
  local dist,buckets={},{};for n=0,w*h-1 do dist[n]=255 end;for n=0,move do buckets[n]={} end
  local start=focus.y*w+focus.x;dist[start]=0;buckets[0][1]=start
  for spent=0,move do for _,index in ipairs(buckets[spent])do if dist[index]==spent then
    local x,y=index%w,math.floor(index/w)
    for _,p in ipairs({{x-1,y},{x+1,y},{x,y-1},{x,y+1}})do local nx,ny=p[1],p[2]
      if nx>=0 and nx<w and ny>=0 and ny<h then local id=grid[ny][nx];local cost=costs[terrain[ny][nx]+1] or 255;local next=spent+cost;local n=ny*w+nx
        if (id==0 or ((id ~ focus.id) & 128)==0) and cost>=1 and cost<255 and next<=move and next<dist[n] then dist[n]=next;buckets[next][#buckets[next]+1]=n end
      end
    end
  end end end
  local ranges={};if focus.status~=2 then for _,entry in ipairs(focus.usable)do local range=entry.item.range;local min,max=range>>4,range & 15;if min>0 and max>=min then for r=min,max do ranges[r]=true end end end end
  local attacked={}
  for index=0,w*h-1 do if dist[index]<=move then
    local x,y=index%w,math.floor(index/w);local occupant=grid[y][x];
    if occupant==0 or occupant==focus.id then for r in pairs(ranges)do for dy=-r,r do
      local ny=y+dy;local dx=r-math.abs(dy)
      if ny>=0 and ny<h then local nx=x-dx;if nx>=0 and nx<w then attacked[ny*w+nx]=true end;nx=x+dx;if nx>=0 and nx<w then attacked[ny*w+nx]=true end end
    end end end
  end end
  return dist,move,attacked
end
local mapDangerCache={key=nil,cells={},next=1}
local function applyMapDanger(v,units,grid,terrain)
  v.mapDangerEnabled=ui and ui.mapDangerEnabled==true or false;v.mapDangerDisabled=not v.mapDangerEnabled;v.mapDangerReady=true;v.mapDangerCount=0;v.mapDangerLabel=v.mapDangerEnabled and "Danger ON" or "Danger OFF"
  if not v.mapDangerEnabled then return end
  local parts={tostring(v.mapWidth),":",tostring(v.mapHeight),":",tostring(mem.u8(mapCfg.chapter)),":",tostring(mem.u8(0x0202bc0d)),tostring(mapCfg.respectFog),tostring(mapCfg.respectAiHold)}
  for y=0,v.mapHeight-1 do for x=0,v.mapWidth-1 do parts[#parts+1]=string.char(terrain[y][x],grid[y][x]) end end
  local enemies={}
  for id=1,255 do local unit=units[id];if unit then
    parts[#parts+1]=string.char(id);for n=0,71 do parts[#parts+1]=string.char(mem.u8(unit.u+n)) end
    if id>=128 and not(mapCfg.respectFog~=false and (unit.state & 0x200)~=0) then enemies[#enemies+1]=unit end
  end end
  local key=table.concat(parts)
  if key~=mapDangerCache.key then mapDangerCache={key=key,cells={},next=1} end
  -- Bound work per update; publish only the complete union, never a partial danger map.
  local stop=math.min(#enemies,mapDangerCache.next+3)
  for n=mapDangerCache.next,stop do local _,_,attacked=mapUnitReach(v,enemies[n],grid,terrain);for index in pairs(attacked)do mapDangerCache.cells[index]=true end end
  mapDangerCache.next=stop+1;v.mapDangerReady=mapDangerCache.next>#enemies
  if not v.mapDangerReady then v.mapDangerLabel="Danger...";return end
  for index in pairs(mapDangerCache.cells)do v.mapCells[index+1].danger=true;v.mapDangerCount=v.mapDangerCount+1 end
end
local function applyMapTactical(v,tr,ur,cx,cy,selected)
  local w,h=v.mapWidth,v.mapHeight;local groups={Player={},Enemy={},Ally={}};local units={};local grid,terrain={},{}
  for y=0,h-1 do local ids,ts={},{};for x=0,w-1 do ids[x]=mem.u8(mem.u32(ur+y*4)+x);ts[x]=mem.u8(mem.u32(tr+y*4)+x) end;grid[y]=ids;terrain[y]=ts end
  local selectedId=selected and mem.u8(selected+11) or (grid[cy] and grid[cy][cx] or 0)
  v.mapPickContext=tostring(mem.u8(mapCfg.chapter))..":"..tostring(mem.u16(mapCfg.turn))..":"..tostring(cx)..":"..tostring(cy)
  local picked=ui and tonumber(ui.mapPickedId) or 0
  if picked and picked>0 then
    if not selected and ui.mapPickedContext==v.mapPickContext then selectedId=picked
    else v.ui=v.ui or {};v.ui.set=v.ui.set or {};v.ui.set.mapPickedId=0 end
  end
  for id,u in pairs(mapSlots) do
    local state=mem.u32(u+12);local hp=mem.u8(u+19);local c,k=mapMeta.chars[mem.u32(u)],mapMeta.classes[mem.u32(u+4)]
    if c and k and hp>0 and (state & 0x1000c)==0 then
      local usable=mapUsableWeapons(u,c,k);local entry=usable[1];local weapon=entry and entry.item
      local unit={id=id,u=u,state=state,c=c,k=k,usable=usable,x=mem.u8(u+16),y=mem.u8(u+17),status=mem.u8(u+48) & 15};units[id]=unit
      if not(id>=128 and (state & 0x200)~=0 and mapCfg.respectFog~=false) then
        local group=id<64 and "Player" or id<128 and "Ally" or "Enemy";local color=id<64 and mapCfg.playerColor or id<128 and mapCfg.allyColor or mapCfg.enemyColor
        local portrait=c.portrait~="" and c.portrait or k.portrait
        local hasDrop=false;if (state & 0x1000)~=0 then for slot=0,4 do if mem.u16(u+30+slot*2)~=0 then hasDrop=true end end end
        groups[group][#groups[group]+1]={id=id,isHeader=false,member=true,hasDrop=hasDrop,name=c.name,portrait=portrait,missingPortrait=portrait=="",hp=hp,maxHp=mem.u8(u+18),weapon=weapon and weapon.name or "No weapon",weaponIcon=weapon and weapon.icon or "",weaponUses=weapon and ((weapon.a & 8)~=0 and "--" or tostring(entry.raw>>8).."/"..weapon.maxUses) or "--",color=color,selected=id==selectedId}
      end
    end
  end
  v.mapRoster={};for _,group in ipairs({"Player","Enemy","Ally"}) do
    table.sort(groups[group],function(a,b)return a.id<b.id end)
    local color=group=="Player" and mapCfg.playerColor or group=="Enemy" and mapCfg.enemyColor or mapCfg.allyColor
    v.mapRoster[#v.mapRoster+1]={isHeader=true,member=false,label=group,color=color};for _,unit in ipairs(groups[group])do v.mapRoster[#v.mapRoster+1]=unit end
  end
  v.mapHasDrops=false;for _,unit in ipairs(v.mapRoster)do if unit.hasDrop then v.mapHasDrops=true end end
     local focus=units[selectedId]
   if focus and focus.id>=128 and mapCfg.respectFog~=false and (focus.state&0x200)~=0 then focus=nil end
   v.mapRangeUnit=focus and focus.c.name or "";v.mapMoveCount=0;v.mapAttackCount=0
  for _,cell in ipairs(v.mapCells)do cell.move=false;cell.attack=false;cell.inRange=false;cell.picked=false;cell.danger=false;cell.dangerColor=mapCfg.dangerColor or "#b52b77";cell.rangeColor="transparent" end
  applyMapDanger(v,units,grid,terrain)
  if focus and picked and picked>0 and not selected and ui.mapPickedContext==v.mapPickContext and focus.x<w and focus.y<h then v.mapCells[focus.y*w+focus.x+1].picked=true end
  if not focus or mapCfg.showRanges==false or focus.x>=w or focus.y>=h or (focus.state & 0x20)~=0 then return end
  local dist,move,attacked=mapUnitReach(v,focus,grid,terrain)
  for index=0,w*h-1 do if dist[index] and dist[index]<=move then v.mapCells[index+1].move=true;v.mapMoveCount=v.mapMoveCount+1 end end
  for index in pairs(attacked)do if not v.mapCells[index+1].move then v.mapCells[index+1].attack=true;v.mapAttackCount=v.mapAttackCount+1 end end
  for _,cell in ipairs(v.mapCells)do cell.inRange=cell.move or cell.attack;cell.rangeColor=cell.move and (mapCfg.moveColor or "#367ce8") or cell.attack and (mapCfg.attackColor or "#ed4357") or "transparent" end
end
local mapCacheKey=nil; local mapCachedTiles={}; local mapBuildIndex=0
local function mapTile(x,y)
      local r,stack={},{}; for i=0,15 do r[i]=0 end; r[0]=x;r[1]=y;r[14]=4294967294
      local pc,cmp=mapRecipe.entry,0
      local function val(a) return a[1]==-1 and r[a[2]] or a[2] end
      local function jump(a) if a==4294967294 then return -1 elseif a>=268435456 then return (a-268435456)/2 else return mapRecipe.addresses[a & 0xfffffffe] end end
      for step=1,3000 do
        if pc<0 then return r[0] end
        local ins=mapRecipe.program[pc+1];pc=pc+1;local op,a,b,c=ins[1],ins[2],ins[3],ins[4]
        if op=="push" then for i=#a,1,-1 do stack[#stack+1]=r[a[i]] end
        elseif op=="pop" then for i=1,#a do r[a[i]]=table.remove(stack) end
        elseif op=="mov" or op=="movs" then if a[2]==15 then pc=jump(val(b)) else r[a[2]]=val(b) end
        elseif op=="adds" or op=="subs" or op=="lsls" then local l=val(c and b or a);local n=val(c or b);r[a[2]]=(op=="adds" and l+n or op=="subs" and l-n or l<<n) & 0xffffffff
        elseif op=="cmp" then cmp=val(a)-val(b)
        elseif op=="literal" then r[a]=b=="terrainRows" and mapCfg.terrainRows or b
        elseif op=="ldr" or op=="ldrb" then local addr=(val(b)+val(c)) & 0xffffffff;r[a]=mapRecipe.romWords[addr] or (op=="ldrb" and mem.u8(addr) or mem.u32(addr))
        elseif op=="bl" then r[14]=268435456+pc*2;pc=a
        elseif op=="bx" then pc=jump(r[a])
        elseif op=="b" or op=="beq" and cmp==0 or op=="bne" and cmp~=0 or op=="bgt" and cmp>0 or op=="bls" and cmp<=0 then pc=a end
      end
      return 0
    end
local function applyMapSource(v,selected)
      v.mapPlayerColor=mapCfg.playerColor;v.mapEnemyColor=mapCfg.enemyColor;v.mapAllyColor=mapCfg.allyColor
      v.mapPresent=false;v.mapHasDrops=false;v.mapDangerEnabled=false;v.mapDangerDisabled=true;v.mapDangerReady=true;v.mapDangerLabel="Danger OFF";v.mapDangerCount=0;v.mapRoster={};v.mapCells={};v.mapWidth=0;v.mapHeight=0;v.mapColumns="repeat(1,1fr)";v.mapRows="repeat(1,1fr)";v.mapAspect=1.5
      v.mapChapter="---";v.mapVictory="---";v.mapTurn="---";v.mapTerrain="---";v.mapTerrainDef="---";v.mapTerrainAvo="---";v.mapTerrainRes="---"
      v.mapUnitName="---";v.mapUnitClass="---";v.mapUnitHp="---";v.mapUnitMaxHp="---";v.mapUnitPortrait="";v.mapUnitMissing=true;v.mapPlayerCount=0;v.mapEnemyCount=0;v.mapAllyCount=0
      local w,h=mem.u16(mapCfg.size),mem.u16(mapCfg.size+2)
      if w<1 or h<1 or w>mapCfg.maxDimension or h>mapCfg.maxDimension then return end
      local tr,ur=mem.u32(mapCfg.terrainRows),mem.u32(mapCfg.unitRows)
      local function valid(a,n) return a>=0x02000000 and a+n<=0x02040000 end
      if not valid(tr,h*4) or not valid(ur,h*4) then return end
      for y=0,h-1 do if not valid(mem.u32(tr+y*4),w) or not valid(mem.u32(ur+y*4),w) then return end end
      if not v.unitLocked then selected=nil end
      local chapter=mem.u8(mapCfg.chapter);local cx,cy=mem.u16(mapCfg.cursor),mem.u16(mapCfg.cursor+2)
      v.mapPresent=true;v.mapWidth=w;v.mapHeight=h;v.mapColumns="repeat("..w..",1fr)";v.mapRows="repeat("..h..",1fr)";v.mapAspect=w/h
      v.mapChapter=mapMeta.chapters[chapter] and mapMeta.chapters[chapter].title or "Chapter "..chapter;v.mapVictory=mapCfg.objectives and (mapCfg.objectives[chapter] or mapCfg.objectives[tostring(chapter)]) or (mapMeta.chapters[chapter] and mapMeta.chapters[chapter].objectiveShort) or "---";v.mapTurn=mem.u16(mapCfg.turn)
      local parts={tostring(chapter),tostring(w),tostring(h),tostring(tr)}
      for y=0,h-1 do local row=mem.u32(tr+y*4);for x=0,w-1 do parts[#parts+1]=string.char(mem.u8(row+x)) end end
      local signature=table.concat(parts,"|");if signature~=mapCacheKey then mapCachedTiles={};mapBuildIndex=0;mapCacheKey=signature end
      local stop=math.min(w*h,mapBuildIndex+256);for n=mapBuildIndex,stop-1 do mapCachedTiles[n+1]=mapTile(n%w,math.floor(n/w)) end;mapBuildIndex=stop
      if mapBuildIndex<w*h then v.mapPresent=false;return end
      for y=0,h-1 do for x=0,w-1 do
        local terrain=mem.u8(mem.u32(tr+y*4)+x);local id=mem.u8(mem.u32(ur+y*4)+x)
        local color=id==0 and "transparent" or id<64 and mapCfg.playerColor or id<128 and mapCfg.allyColor or mapCfg.enemyColor
                 local visible=id~=0;local slot=mapSlots[id]
         if id>=128 and mapCfg.respectFog~=false and slot and (mem.u32(slot+12)&0x200)~=0 then visible=false;color="transparent" end
         v.mapCells[#v.mapCells+1]={tile=mapCfg.tilePrefix..mapCachedTiles[y*w+x+1]..".png",marker=visible,color=color,cursor=x==cx and y==cy,cursorColor=mapCfg.cursorColor}
        if x==cx and y==cy then
          v.mapTerrain=mapMeta.terrains[terrain+1] or "Terrain "..terrain
                     local u=visible and mapSlots[id] or nil;if u then local char,cls=mapMeta.chars[mem.u32(u)],mapMeta.classes[mem.u32(u+4)];if char and cls then v.mapUnitName=char.name;v.mapUnitClass=cls.name;v.mapUnitHp=mem.u8(u+19);v.mapUnitMaxHp=mem.u8(u+18);v.mapUnitPortrait=char.portrait~="" and char.portrait or cls.portrait;v.mapUnitMissing=false;v.mapTerrainDef=cls.defense[terrain+1] or 0;v.mapTerrainAvo=cls.avoid[terrain+1] or 0;v.mapTerrainRes=cls.resistance[terrain+1] or 0 end end
          if v.mapUnitMissing then local cls=mapMeta.classes[tonumber(mapMeta.defaultClass)];v.mapTerrainDef=cls.defense[terrain+1] or 0;v.mapTerrainAvo=cls.avoid[terrain+1] or 0;v.mapTerrainRes=cls.resistance[terrain+1] or 0 end
        end
      end end
      applyMapTactical(v,tr,ur,cx,cy,selected)
      for id,u in pairs(mapSlots) do if mem.u32(u)~=0 and mem.u32(u+4)~=0 and mem.u8(u+19)>0 and (mem.u32(u+12) & 0x1000c)==0 then local key=id<64 and "mapPlayerCount" or id<128 and "mapAllyCount" or "mapEnemyCount";v[key]=v[key]+1 end end
    end
local function emptyUnitValues()
  local v = {["hp"]="---",["maxHp"]="---",["level"]="---",["exp"]=0,["str"]="---",["skill"]="---",["spd"]="---",["def"]="---",["res"]="---",["luck"]="---",["characterPointer"]=0,["classPointer"]=0,["conBonus"]=0,["movBonus"]=0,["rescueId"]=0,["statusByte"]=0,["className"]="---",["affinity"]="",["portrait"]="",["mapSprite"]="",["move"]="---",["con"]="---",["aid"]="---",["traveler"]="---",["condition"]="---",["conditionTurns"]=0,["unitState"]=0,["unitX"]=0,["unitY"]=0,["rankSwordRaw"]=0,["rankLanceRaw"]=0,["rankAxeRaw"]=0,["rankBowRaw"]=0,["rankStaffRaw"]=0,["rankAnimaRaw"]=0,["rankLightRaw"]=0,["rankDarkRaw"]=0,["support1Exp"]=0,["support2Exp"]=0,["support3Exp"]=0,["support4Exp"]=0,["support5Exp"]=0,["item1"]=0,["item2"]=0,["item3"]=0,["item4"]=0,["item5"]=0,["equipmentAtk"]="---",["equipmentHit"]="---",["equipmentCrit"]="---",["equipmentAvoid"]="---",["equipmentAS"]="---",["equipmentRange"]="---",["equipmentSlot"]=0,["equipmentWeapon"]=0,["equipmentMatches"]=false,["deployment"]=0,["unitName"]="---",["expDisplay"]="",["rankSword"]="---",["rankSwordProgress"]=0,["rankSwordProgressMax"]=1,["rankLance"]="---",["rankLanceProgress"]=0,["rankLanceProgressMax"]=1,["rankAxe"]="---",["rankAxeProgress"]=0,["rankAxeProgressMax"]=1,["rankBow"]="---",["rankBowProgress"]=0,["rankBowProgressMax"]=1,["rankStaff"]="---",["rankStaffProgress"]=0,["rankStaffProgressMax"]=1,["rankAnima"]="---",["rankAnimaProgress"]=0,["rankAnimaProgressMax"]=1,["rankLight"]="---",["rankLightProgress"]=0,["rankLightProgressMax"]=1,["rankDark"]="---",["rankDarkProgress"]=0,["rankDarkProgressMax"]=1,["powerLabel"]="Str",["support1Name"]="",["support1Portrait"]="",["support1Rank"]="---",["support2Name"]="",["support2Portrait"]="",["support2Rank"]="---",["support3Name"]="",["support3Portrait"]="",["support3Rank"]="---",["support4Name"]="",["support4Portrait"]="",["support4Rank"]="---",["support5Name"]="",["support5Portrait"]="",["support5Rank"]="---",["item1Id"]=0,["item1Name"]="",["item1Icon"]="",["item1Uses"]=0,["item1MaxUses"]=0,["item1Unbreakable"]=false,["item1UsesDisplay"]=0,["item1MaxDisplay"]=0,["item2Id"]=0,["item2Name"]="",["item2Icon"]="",["item2Uses"]=0,["item2MaxUses"]=0,["item2Unbreakable"]=false,["item2UsesDisplay"]=0,["item2MaxDisplay"]=0,["item3Id"]=0,["item3Name"]="",["item3Icon"]="",["item3Uses"]=0,["item3MaxUses"]=0,["item3Unbreakable"]=false,["item3UsesDisplay"]=0,["item3MaxDisplay"]=0,["item4Id"]=0,["item4Name"]="",["item4Icon"]="",["item4Uses"]=0,["item4MaxUses"]=0,["item4Unbreakable"]=false,["item4UsesDisplay"]=0,["item4MaxDisplay"]=0,["item5Id"]=0,["item5Name"]="",["item5Icon"]="",["item5Uses"]=0,["item5MaxUses"]=0,["item5Unbreakable"]=false,["item5UsesDisplay"]=0,["item5MaxDisplay"]=0,["firstItemSlot"]=0,["lastItemSlot"]=0,["unitDropsItem"]=false,["item1Droppable"]=false,["item2Droppable"]=false,["item3Droppable"]=false,["item4Droppable"]=false,["item5Droppable"]=false,["firstItemPage"]="none",["item1Description"]="",["item1Might"]=0,["item1Hit"]=0,["item1Crit"]=0,["item1Weight"]=0,["item1Type"]="",["item1Rank"]="",["item1Range"]="",["item1IsWeapon"]=false,["item1HasRank"]=false,["firstItemSelected1"]=false,["item2Description"]="",["item2Might"]=0,["item2Hit"]=0,["item2Crit"]=0,["item2Weight"]=0,["item2Type"]="",["item2Rank"]="",["item2Range"]="",["item2IsWeapon"]=false,["item2HasRank"]=false,["firstItemSelected2"]=false,["item3Description"]="",["item3Might"]=0,["item3Hit"]=0,["item3Crit"]=0,["item3Weight"]=0,["item3Type"]="",["item3Rank"]="",["item3Range"]="",["item3IsWeapon"]=false,["item3HasRank"]=false,["firstItemSelected3"]=false,["item4Description"]="",["item4Might"]=0,["item4Hit"]=0,["item4Crit"]=0,["item4Weight"]=0,["item4Type"]="",["item4Rank"]="",["item4Range"]="",["item4IsWeapon"]=false,["item4HasRank"]=false,["firstItemSelected4"]=false,["item5Description"]="",["item5Might"]=0,["item5Hit"]=0,["item5Crit"]=0,["item5Weight"]=0,["item5Type"]="",["item5Rank"]="",["item5Range"]="",["item5IsWeapon"]=false,["item5HasRank"]=false,["firstItemSelected5"]=false,["affinityPow"]=0,["affinityDef"]=0,["affinityHit"]=0,["affinityAvo"]=0,["affinityCrit"]=0,["affinityCritAvo"]=0,["item1IsNonWeapon"]=false,["item2IsNonWeapon"]=false,["item3IsNonWeapon"]=false,["item4IsNonWeapon"]=false,["item5IsNonWeapon"]=false,["support1PortraitMissing"]=true,["support1DisplayRank"]="---",["support2PortraitMissing"]=true,["support2DisplayRank"]="---",["support3PortraitMissing"]=true,["support3DisplayRank"]="---",["support4PortraitMissing"]=true,["support4DisplayRank"]="---",["support5PortraitMissing"]=true,["support5DisplayRank"]="---",["expCompact"]="---",["levelProgress"]=0,["portraitMissing"]=true,["portraitAspectRatio"]=1.2,["headerAspectRatio"]=4.137931034482759,["travelerPresent"]=false,["conditionActive"]=false,["affinityIcon"]="",["affinityMissing"]=true,["supportEmpty"]=false,["unitPresent"]=false,["unitAbsent"]=true,["unitLocked"]=false,["forecastActive"]=false,["forecastactorName"]="---",["forecastactorClass"]="---",["forecastactorHp"]="---",["forecastactorMaxHp"]="---",["forecastactorDamage"]="---",["forecastactorHit"]="---",["forecastactorCrit"]="---",["forecastactorAS"]="---",["forecastactorWeapon"]="---",["forecastactorPortrait"]="",["forecastactorIcon"]="",["forecasttargetName"]="---",["forecasttargetClass"]="---",["forecasttargetHp"]="---",["forecasttargetMaxHp"]="---",["forecasttargetDamage"]="---",["forecasttargetHit"]="---",["forecasttargetCrit"]="---",["forecasttargetAS"]="---",["forecasttargetWeapon"]="---",["forecasttargetPortrait"]="",["forecasttargetIcon"]="",["forecastactorLevel"]="---",["forecastactorAfterHp"]="---",["forecastactorUses"]="--",["forecastactorMt"]="---",["forecastactorMultiplier"]="",["forecastactorTriangle"]="",["forecastactorAdvantage"]=false,["forecastactorDisadvantage"]=false,["forecastactorHasMulti"]=false,["forecastactorHasLoss"]=false,["forecastactorHpLoss"]=0,["forecastactorHpRemainWidth"]="0%",["forecastactorHpLossWidth"]="0%",["forecasttargetLevel"]="---",["forecasttargetAfterHp"]="---",["forecasttargetUses"]="--",["forecasttargetMt"]="---",["forecasttargetMultiplier"]="",["forecasttargetTriangle"]="",["forecasttargetAdvantage"]=false,["forecasttargetDisadvantage"]=false,["forecasttargetHasMulti"]=false,["forecasttargetHasLoss"]=false,["forecasttargetHpLoss"]=0,["forecasttargetHpRemainWidth"]="0%",["forecasttargetHpLossWidth"]="0%",["forecastactorMultiFlash"]=false,["forecastactorHpFlash"]=false,["forecastactorTriangleFlash"]=false,["forecasttargetMultiFlash"]=false,["forecasttargetHpFlash"]=false,["forecasttargetTriangleFlash"]=false}
  local identity = table.concat({tostring(v["characterPointer"]),tostring(v["deployment"]),tostring(v["item1Id"]),tostring(v["item2Id"]),tostring(v["item3Id"]),tostring(v["item4Id"]),tostring(v["item5Id"])}, "|")
  if identity ~= lastUiIdentity then
    v.ui = {set={["inventoryDetail"]=v["firstItemPage"],["itemSelected1"]=v["firstItemSelected1"],["itemSelected2"]=v["firstItemSelected2"],["itemSelected3"]=v["firstItemSelected3"],["itemSelected4"]=v["firstItemSelected4"],["itemSelected5"]=v["firstItemSelected5"]}}
    lastUiIdentity = identity
  end
  v.ui=v.ui or {}; v.ui.set=v.ui.set or {}; v.ui.set.companionView=v.forecastActive and "battle" or "companion"
  if v.forecastActive then v.ui.set.mainTab="Units"; v.ui.set.navUnits=true; v.ui.set.navMap=false end
  applyMapSource(v)
  v.ui=v.ui or {}; v.ui.set=v.ui.set or {}; v.ui.set.companionView=v.forecastActive and "battle" or "companion"
  if v.forecastActive then v.ui.set.mainTab="Units"; v.ui.set.navUnits=true; v.ui.set.navMap=false end
  studioPulseTick = studioPulseTick + 1
  local studioPulseOn = ((studioPulseTick * 200) % 1000) < 500
  v.item1DropFlash = truth(v.item1Droppable) and studioPulseOn
  v.item2DropFlash = truth(v.item2Droppable) and studioPulseOn
  v.item3DropFlash = truth(v.item3Droppable) and studioPulseOn
  v.item4DropFlash = truth(v.item4Droppable) and studioPulseOn
  v.item5DropFlash = truth(v.item5Droppable) and studioPulseOn
  v.travelerFlash = truth(v.travelerPresent) and studioPulseOn
  v.conditionFlash = truth(v.conditionActive) and studioPulseOn
  v.forecastactorMultiFlash = truth(v.forecastactorHasMulti) and studioPulseOn
  v.forecastactorHpFlash = truth(v.forecastactorHasLoss) and studioPulseOn
  v.forecastactorTriangleFlash = truth(v.forecastactorTriangle) and studioPulseOn
  v.forecasttargetMultiFlash = truth(v.forecasttargetHasMulti) and studioPulseOn
  v.forecasttargetHpFlash = truth(v.forecasttargetHasLoss) and studioPulseOn
  v.forecasttargetTriangleFlash = truth(v.forecasttargetTriangle) and studioPulseOn
  v.mapDropFlash = truth(v.mapHasDrops) and studioPulseOn
  return v
end
local lookup1=D.lookup1
local lookup2=D.lookup2
local lookup3=D.lookup3
local lookup4=D.lookup4
local lookup5=D.lookup5
local lookup6=D.lookup6
local lookup7=D.lookup7
local lookup8=D.lookup8
local lookup9=D.lookup9
local lookup10=D.lookup10
local lookup11=D.lookup11
local lookup12=D.lookup12
local lookup13=D.lookup13
local lookup14=D.lookup14
local lookup15=D.lookup15
local lookup16=D.lookup16
local lookup17=D.lookup17
local lookup18=D.lookup18
local lookup19=D.lookup19
local lookup20=D.lookup20
local lookup21=D.lookup21
local lookup22=D.lookup22
local lookup23=D.lookup23
local lookup24=D.lookup24
local lookup25=D.lookup25
local lookup26=D.lookup26
local lookup27=D.lookup27
local lookup28=D.lookup28
local lookup29=D.lookup29
local lookup30=D.lookup30
local lookup31=D.lookup31
local lookup32=D.lookup32
local lookup33=D.lookup33
local lookup34=D.lookup34
local lookup35=D.lookup35
local lookup36=D.lookup36
local lookup37=D.lookup37
local lookup38=D.lookup38
local lookup39=D.lookup39
local lookup40=D.lookup40
local lookup41=D.lookup41
local lookup42=D.lookup42
local lookup43=D.lookup43
local lookup44=D.lookup44
local lookup45=D.lookup45
local lookup46=D.lookup46
local lookup47=D.lookup47
local validSlots=D.validSlots
local rescueSlots=D.slots
local items=D.battleItems
local chars=D.battleChars
local classes=D.battleClasses
local fc,fk,fi=D.forecastChars,D.forecastClasses,D.forecastItems

function update()
  local v = {}
  local unit = nil
  local playerPc, forecastProc, aiPc = 0, 0, 0
  for i=0,63 do local p=33705512+i*108; local script=mem.u32(p); if script==146355060 then playerPc=mem.u32(p+4) elseif script==146369884 then forecastProc=p elseif script==146370460 then aiPc=mem.u32(p+4) end end
  local active=mem.u32(50349712)
  -- Immutable validSlots metadata is initialized once above update().
  v.unitLocked=false; v.forecastActive=false
  local faction=mem.u8(33733639); local playerOwns=playerPc>=0x08B933EC and playerPc<=0x08B93568 and faction==0
  local aiOwns=aiPc>=0x08B96FA4 and aiPc<=0x08B9700C and (faction==0x40 or faction==0x80)
  if (playerOwns or aiOwns) and validSlots[active] then
    local state=mem.u32(active+12); local deployment=mem.u8(active+11)
    if mem.u32(active)~=0 and mem.u32(active+4)~=0 and deployment>0 and (deployment & 0xc0)==faction and deployment==validSlots[active] and (state & 0x1000C)==0 then
      unit=active; v.unitLocked=true; v.forecastActive=playerOwns and forecastProc~=0 and mem.u8(forecastProc+0x33)==1 and mem.u8(forecastProc+0x34)==0
    end
  end
  if not unit then
  local cursorX, cursorY = mem.u16(33733580), mem.u16(33733582)
  local width, height = mem.u16(33743832), mem.u16(33743834)
  if width == 0 or height == 0 or width > 512 or height > 512 or cursorX >= width or cursorY >= height then return emptyUnitValues() end
  local rows = mem.u32(33743836)
  if rows < 0x02000000 or rows + height*4 > 0x02040000 then return emptyUnitValues() end
  local row = mem.u32(rows + cursorY*4)
  if row < 0x02000000 or row + width > 0x02040000 then return emptyUnitValues() end
  unit = mapSlots[mem.u8(row + cursorX)]
  if not unit then return emptyUnitValues() end
  end
  local slotId=mem.u8(unit+11)
  if not mapMeta.chars[mem.u32(unit)] or not mapMeta.classes[mem.u32(unit+4)] or
     mapSlots[slotId]~=unit or mem.u8(unit+19)==0 or (mem.u32(unit+12)&0x1000c)~=0 or
     (not v.unitLocked and slotId>=128 and mapCfg.respectFog~=false and (mem.u32(unit+12)&0x200)~=0) then
    return emptyUnitValues()
  end
  v.unitPresent, v.unitAbsent = true, false
  v["hp"] = mem.u8((unit + 19))
  v["maxHp"] = mem.u8((unit + 18))
  v["level"] = mem.u8((unit + 8))
  v["exp"] = mem.u8((unit + 9))
  v["str"] = mem.u8((unit + 20))
  v["skill"] = mem.u8((unit + 21))
  v["spd"] = mem.u8((unit + 22))
  v["def"] = mem.u8((unit + 23))
  v["res"] = mem.u8((unit + 24))
  v["luck"] = mem.u8((unit + 25))
  v["characterPointer"] = mem.u32((unit + 0))
  v["classPointer"] = mem.u32((unit + 4))
  v["conBonus"] = mem.s8((unit + 26))
  v["movBonus"] = mem.s8((unit + 29))
  v["rescueId"] = mem.u8((unit + 27))
  v["statusByte"] = mem.u8((unit + 48))
  v["deployment"] = mem.u8((unit + 11))
  v["unitState"] = mem.u32((unit + 12))
  v["unitX"] = mem.u8((unit + 16))
  v["unitY"] = mem.u8((unit + 17))
  v["rankSwordRaw"] = mem.u8((unit + 40))
  v["rankLanceRaw"] = mem.u8((unit + 41))
  v["rankAxeRaw"] = mem.u8((unit + 42))
  v["rankBowRaw"] = mem.u8((unit + 43))
  v["rankStaffRaw"] = mem.u8((unit + 44))
  v["rankAnimaRaw"] = mem.u8((unit + 45))
  v["rankLightRaw"] = mem.u8((unit + 46))
  v["rankDarkRaw"] = mem.u8((unit + 47))
  v["support1Exp"] = mem.u8((unit + 50))
  v["support2Exp"] = mem.u8((unit + 51))
  v["support3Exp"] = mem.u8((unit + 52))
  v["support4Exp"] = mem.u8((unit + 53))
  v["support5Exp"] = mem.u8((unit + 54))
  v["item1"] = mem.u16((unit + 30))
  v["item2"] = mem.u16((unit + 32))
  v["item3"] = mem.u16((unit + 34))
  v["item4"] = mem.u16((unit + 36))
  v["item5"] = mem.u16((unit + 38))
  v["className"] = lookup1[tostring(v["classPointer"])]
  if v["className"] == nil then return {} end
  v["affinity"] = lookup2[tostring(v["characterPointer"])]
  if v["affinity"] == nil then return {} end
  v["portrait"] = first(lookup3[tostring(v["characterPointer"])],lookup4[tostring(v["classPointer"])])
  if v["portrait"] == nil then return {} end
  v["mapSprite"] = lookup5[tostring(v["classPointer"])]
  if v["mapSprite"] == nil then return {} end
  v["move"] = (lookup6[tostring(v["classPointer"])] + v["movBonus"])
  if v["move"] == nil then return {} end
  v["con"] = (lookup7[tostring(v["classPointer"])] + lookup8[tostring(v["characterPointer"])] + v["conBonus"])
  if v["con"] == nil then return {} end
  v["aid"] = math.max(0,(((26 * lookup9[tostring(v["classPointer"])]) - 1) + (v["con"] * (1 - (2 * lookup9[tostring(v["classPointer"])]))) + (-5 * lookup9[tostring(v["classPointer"])] * math.max(lookup8[tostring(v["characterPointer"])],lookup9[tostring(v["classPointer"])]))))
  if v["aid"] == nil then return {} end
  v["traveler"] = lookup10[tostring(v["rescueId"])]
  if v["traveler"] == nil then return {} end
  v["condition"] = lookup11[tostring((v["statusByte"] % 16))]
  if v["condition"] == nil then return {} end
  v["conditionTurns"] = math.floor(v["statusByte"] / 16)
  if v["conditionTurns"] == nil then return {} end
  v["unitName"] = lookup12[tostring(v["characterPointer"])]
  if v["unitName"] == nil then return {} end
  v["expDisplay"] = lookup13[tostring(v["exp"])]
  if v["expDisplay"] == nil then return {} end
  v["rankSword"] = choose((v["rankSwordRaw"] >= 251),"S",choose((v["rankSwordRaw"] >= 181),"A",choose((v["rankSwordRaw"] >= 121),"B",choose((v["rankSwordRaw"] >= 71),"C",choose((v["rankSwordRaw"] >= 31),"D",choose((v["rankSwordRaw"] >= 1),"E","---"))))))
  if v["rankSword"] == nil then return {} end
  v["rankSwordProgress"] = choose((v["rankSwordRaw"] >= 251),1,choose((v["rankSwordRaw"] >= 181),(v["rankSwordRaw"] - 181),choose((v["rankSwordRaw"] >= 121),(v["rankSwordRaw"] - 121),choose((v["rankSwordRaw"] >= 71),(v["rankSwordRaw"] - 71),choose((v["rankSwordRaw"] >= 31),(v["rankSwordRaw"] - 31),choose((v["rankSwordRaw"] >= 1),(v["rankSwordRaw"] - 1),0))))))
  if v["rankSwordProgress"] == nil then return {} end
  v["rankSwordProgressMax"] = choose((v["rankSwordRaw"] >= 251),1,choose((v["rankSwordRaw"] >= 181),70,choose((v["rankSwordRaw"] >= 121),60,choose((v["rankSwordRaw"] >= 71),50,choose((v["rankSwordRaw"] >= 31),40,choose((v["rankSwordRaw"] >= 1),30,1))))))
  if v["rankSwordProgressMax"] == nil then return {} end
  v["rankLance"] = choose((v["rankLanceRaw"] >= 251),"S",choose((v["rankLanceRaw"] >= 181),"A",choose((v["rankLanceRaw"] >= 121),"B",choose((v["rankLanceRaw"] >= 71),"C",choose((v["rankLanceRaw"] >= 31),"D",choose((v["rankLanceRaw"] >= 1),"E","---"))))))
  if v["rankLance"] == nil then return {} end
  v["rankLanceProgress"] = choose((v["rankLanceRaw"] >= 251),1,choose((v["rankLanceRaw"] >= 181),(v["rankLanceRaw"] - 181),choose((v["rankLanceRaw"] >= 121),(v["rankLanceRaw"] - 121),choose((v["rankLanceRaw"] >= 71),(v["rankLanceRaw"] - 71),choose((v["rankLanceRaw"] >= 31),(v["rankLanceRaw"] - 31),choose((v["rankLanceRaw"] >= 1),(v["rankLanceRaw"] - 1),0))))))
  if v["rankLanceProgress"] == nil then return {} end
  v["rankLanceProgressMax"] = choose((v["rankLanceRaw"] >= 251),1,choose((v["rankLanceRaw"] >= 181),70,choose((v["rankLanceRaw"] >= 121),60,choose((v["rankLanceRaw"] >= 71),50,choose((v["rankLanceRaw"] >= 31),40,choose((v["rankLanceRaw"] >= 1),30,1))))))
  if v["rankLanceProgressMax"] == nil then return {} end
  v["rankAxe"] = choose((v["rankAxeRaw"] >= 251),"S",choose((v["rankAxeRaw"] >= 181),"A",choose((v["rankAxeRaw"] >= 121),"B",choose((v["rankAxeRaw"] >= 71),"C",choose((v["rankAxeRaw"] >= 31),"D",choose((v["rankAxeRaw"] >= 1),"E","---"))))))
  if v["rankAxe"] == nil then return {} end
  v["rankAxeProgress"] = choose((v["rankAxeRaw"] >= 251),1,choose((v["rankAxeRaw"] >= 181),(v["rankAxeRaw"] - 181),choose((v["rankAxeRaw"] >= 121),(v["rankAxeRaw"] - 121),choose((v["rankAxeRaw"] >= 71),(v["rankAxeRaw"] - 71),choose((v["rankAxeRaw"] >= 31),(v["rankAxeRaw"] - 31),choose((v["rankAxeRaw"] >= 1),(v["rankAxeRaw"] - 1),0))))))
  if v["rankAxeProgress"] == nil then return {} end
  v["rankAxeProgressMax"] = choose((v["rankAxeRaw"] >= 251),1,choose((v["rankAxeRaw"] >= 181),70,choose((v["rankAxeRaw"] >= 121),60,choose((v["rankAxeRaw"] >= 71),50,choose((v["rankAxeRaw"] >= 31),40,choose((v["rankAxeRaw"] >= 1),30,1))))))
  if v["rankAxeProgressMax"] == nil then return {} end
  v["rankBow"] = choose((v["rankBowRaw"] >= 251),"S",choose((v["rankBowRaw"] >= 181),"A",choose((v["rankBowRaw"] >= 121),"B",choose((v["rankBowRaw"] >= 71),"C",choose((v["rankBowRaw"] >= 31),"D",choose((v["rankBowRaw"] >= 1),"E","---"))))))
  if v["rankBow"] == nil then return {} end
  v["rankBowProgress"] = choose((v["rankBowRaw"] >= 251),1,choose((v["rankBowRaw"] >= 181),(v["rankBowRaw"] - 181),choose((v["rankBowRaw"] >= 121),(v["rankBowRaw"] - 121),choose((v["rankBowRaw"] >= 71),(v["rankBowRaw"] - 71),choose((v["rankBowRaw"] >= 31),(v["rankBowRaw"] - 31),choose((v["rankBowRaw"] >= 1),(v["rankBowRaw"] - 1),0))))))
  if v["rankBowProgress"] == nil then return {} end
  v["rankBowProgressMax"] = choose((v["rankBowRaw"] >= 251),1,choose((v["rankBowRaw"] >= 181),70,choose((v["rankBowRaw"] >= 121),60,choose((v["rankBowRaw"] >= 71),50,choose((v["rankBowRaw"] >= 31),40,choose((v["rankBowRaw"] >= 1),30,1))))))
  if v["rankBowProgressMax"] == nil then return {} end
  v["rankStaff"] = choose((v["rankStaffRaw"] >= 251),"S",choose((v["rankStaffRaw"] >= 181),"A",choose((v["rankStaffRaw"] >= 121),"B",choose((v["rankStaffRaw"] >= 71),"C",choose((v["rankStaffRaw"] >= 31),"D",choose((v["rankStaffRaw"] >= 1),"E","---"))))))
  if v["rankStaff"] == nil then return {} end
  v["rankStaffProgress"] = choose((v["rankStaffRaw"] >= 251),1,choose((v["rankStaffRaw"] >= 181),(v["rankStaffRaw"] - 181),choose((v["rankStaffRaw"] >= 121),(v["rankStaffRaw"] - 121),choose((v["rankStaffRaw"] >= 71),(v["rankStaffRaw"] - 71),choose((v["rankStaffRaw"] >= 31),(v["rankStaffRaw"] - 31),choose((v["rankStaffRaw"] >= 1),(v["rankStaffRaw"] - 1),0))))))
  if v["rankStaffProgress"] == nil then return {} end
  v["rankStaffProgressMax"] = choose((v["rankStaffRaw"] >= 251),1,choose((v["rankStaffRaw"] >= 181),70,choose((v["rankStaffRaw"] >= 121),60,choose((v["rankStaffRaw"] >= 71),50,choose((v["rankStaffRaw"] >= 31),40,choose((v["rankStaffRaw"] >= 1),30,1))))))
  if v["rankStaffProgressMax"] == nil then return {} end
  v["rankAnima"] = choose((v["rankAnimaRaw"] >= 251),"S",choose((v["rankAnimaRaw"] >= 181),"A",choose((v["rankAnimaRaw"] >= 121),"B",choose((v["rankAnimaRaw"] >= 71),"C",choose((v["rankAnimaRaw"] >= 31),"D",choose((v["rankAnimaRaw"] >= 1),"E","---"))))))
  if v["rankAnima"] == nil then return {} end
  v["rankAnimaProgress"] = choose((v["rankAnimaRaw"] >= 251),1,choose((v["rankAnimaRaw"] >= 181),(v["rankAnimaRaw"] - 181),choose((v["rankAnimaRaw"] >= 121),(v["rankAnimaRaw"] - 121),choose((v["rankAnimaRaw"] >= 71),(v["rankAnimaRaw"] - 71),choose((v["rankAnimaRaw"] >= 31),(v["rankAnimaRaw"] - 31),choose((v["rankAnimaRaw"] >= 1),(v["rankAnimaRaw"] - 1),0))))))
  if v["rankAnimaProgress"] == nil then return {} end
  v["rankAnimaProgressMax"] = choose((v["rankAnimaRaw"] >= 251),1,choose((v["rankAnimaRaw"] >= 181),70,choose((v["rankAnimaRaw"] >= 121),60,choose((v["rankAnimaRaw"] >= 71),50,choose((v["rankAnimaRaw"] >= 31),40,choose((v["rankAnimaRaw"] >= 1),30,1))))))
  if v["rankAnimaProgressMax"] == nil then return {} end
  v["rankLight"] = choose((v["rankLightRaw"] >= 251),"S",choose((v["rankLightRaw"] >= 181),"A",choose((v["rankLightRaw"] >= 121),"B",choose((v["rankLightRaw"] >= 71),"C",choose((v["rankLightRaw"] >= 31),"D",choose((v["rankLightRaw"] >= 1),"E","---"))))))
  if v["rankLight"] == nil then return {} end
  v["rankLightProgress"] = choose((v["rankLightRaw"] >= 251),1,choose((v["rankLightRaw"] >= 181),(v["rankLightRaw"] - 181),choose((v["rankLightRaw"] >= 121),(v["rankLightRaw"] - 121),choose((v["rankLightRaw"] >= 71),(v["rankLightRaw"] - 71),choose((v["rankLightRaw"] >= 31),(v["rankLightRaw"] - 31),choose((v["rankLightRaw"] >= 1),(v["rankLightRaw"] - 1),0))))))
  if v["rankLightProgress"] == nil then return {} end
  v["rankLightProgressMax"] = choose((v["rankLightRaw"] >= 251),1,choose((v["rankLightRaw"] >= 181),70,choose((v["rankLightRaw"] >= 121),60,choose((v["rankLightRaw"] >= 71),50,choose((v["rankLightRaw"] >= 31),40,choose((v["rankLightRaw"] >= 1),30,1))))))
  if v["rankLightProgressMax"] == nil then return {} end
  v["rankDark"] = choose((v["rankDarkRaw"] >= 251),"S",choose((v["rankDarkRaw"] >= 181),"A",choose((v["rankDarkRaw"] >= 121),"B",choose((v["rankDarkRaw"] >= 71),"C",choose((v["rankDarkRaw"] >= 31),"D",choose((v["rankDarkRaw"] >= 1),"E","---"))))))
  if v["rankDark"] == nil then return {} end
  v["rankDarkProgress"] = choose((v["rankDarkRaw"] >= 251),1,choose((v["rankDarkRaw"] >= 181),(v["rankDarkRaw"] - 181),choose((v["rankDarkRaw"] >= 121),(v["rankDarkRaw"] - 121),choose((v["rankDarkRaw"] >= 71),(v["rankDarkRaw"] - 71),choose((v["rankDarkRaw"] >= 31),(v["rankDarkRaw"] - 31),choose((v["rankDarkRaw"] >= 1),(v["rankDarkRaw"] - 1),0))))))
  if v["rankDarkProgress"] == nil then return {} end
  v["rankDarkProgressMax"] = choose((v["rankDarkRaw"] >= 251),1,choose((v["rankDarkRaw"] >= 181),70,choose((v["rankDarkRaw"] >= 121),60,choose((v["rankDarkRaw"] >= 71),50,choose((v["rankDarkRaw"] >= 31),40,choose((v["rankDarkRaw"] >= 1),30,1))))))
  if v["rankDarkProgressMax"] == nil then return {} end
  v["powerLabel"] = choose((math.max(v["rankStaffRaw"],v["rankAnimaRaw"],v["rankLightRaw"],v["rankDarkRaw"]) >= 1),"Mag","Str")
  if v["powerLabel"] == nil then return {} end
  v["support1Name"] = lookup14[tostring(v["characterPointer"])]
  if v["support1Name"] == nil then return {} end
  v["support1Portrait"] = lookup15[tostring(v["characterPointer"])]
  if v["support1Portrait"] == nil then return {} end
  v["support1Rank"] = choose((v["support1Exp"] >= 241),"A",choose((v["support1Exp"] >= 161),"B",choose((v["support1Exp"] >= 81),"C","---")))
  if v["support1Rank"] == nil then return {} end
  v["support2Name"] = lookup16[tostring(v["characterPointer"])]
  if v["support2Name"] == nil then return {} end
  v["support2Portrait"] = lookup17[tostring(v["characterPointer"])]
  if v["support2Portrait"] == nil then return {} end
  v["support2Rank"] = choose((v["support2Exp"] >= 241),"A",choose((v["support2Exp"] >= 161),"B",choose((v["support2Exp"] >= 81),"C","---")))
  if v["support2Rank"] == nil then return {} end
  v["support3Name"] = lookup18[tostring(v["characterPointer"])]
  if v["support3Name"] == nil then return {} end
  v["support3Portrait"] = lookup19[tostring(v["characterPointer"])]
  if v["support3Portrait"] == nil then return {} end
  v["support3Rank"] = choose((v["support3Exp"] >= 241),"A",choose((v["support3Exp"] >= 161),"B",choose((v["support3Exp"] >= 81),"C","---")))
  if v["support3Rank"] == nil then return {} end
  v["support4Name"] = lookup20[tostring(v["characterPointer"])]
  if v["support4Name"] == nil then return {} end
  v["support4Portrait"] = lookup21[tostring(v["characterPointer"])]
  if v["support4Portrait"] == nil then return {} end
  v["support4Rank"] = choose((v["support4Exp"] >= 241),"A",choose((v["support4Exp"] >= 161),"B",choose((v["support4Exp"] >= 81),"C","---")))
  if v["support4Rank"] == nil then return {} end
  v["support5Name"] = lookup22[tostring(v["characterPointer"])]
  if v["support5Name"] == nil then return {} end
  v["support5Portrait"] = lookup23[tostring(v["characterPointer"])]
  if v["support5Portrait"] == nil then return {} end
  v["support5Rank"] = choose((v["support5Exp"] >= 241),"A",choose((v["support5Exp"] >= 161),"B",choose((v["support5Exp"] >= 81),"C","---")))
  if v["support5Rank"] == nil then return {} end
  v["item1Id"] = (v["item1"] % 256)
  if v["item1Id"] == nil then return {} end
  v["item1Name"] = lookup24[tostring(v["item1Id"])]
  if v["item1Name"] == nil then return {} end
  v["item1Icon"] = lookup25[tostring(v["item1Id"])]
  if v["item1Icon"] == nil then return {} end
  v["item1Uses"] = math.floor(v["item1"] / 256)
  if v["item1Uses"] == nil then return {} end
  v["item1MaxUses"] = lookup26[tostring(v["item1Id"])]
  if v["item1MaxUses"] == nil then return {} end
  v["item1Unbreakable"] = lookup27[tostring(v["item1Id"])]
  if v["item1Unbreakable"] == nil then return {} end
  v["item1UsesDisplay"] = choose(v["item1Unbreakable"],"∞",v["item1Uses"])
  if v["item1UsesDisplay"] == nil then return {} end
  v["item1MaxDisplay"] = choose(v["item1Unbreakable"],"∞",v["item1MaxUses"])
  if v["item1MaxDisplay"] == nil then return {} end
  v["item2Id"] = (v["item2"] % 256)
  if v["item2Id"] == nil then return {} end
  v["item2Name"] = lookup24[tostring(v["item2Id"])]
  if v["item2Name"] == nil then return {} end
  v["item2Icon"] = lookup25[tostring(v["item2Id"])]
  if v["item2Icon"] == nil then return {} end
  v["item2Uses"] = math.floor(v["item2"] / 256)
  if v["item2Uses"] == nil then return {} end
  v["item2MaxUses"] = lookup26[tostring(v["item2Id"])]
  if v["item2MaxUses"] == nil then return {} end
  v["item2Unbreakable"] = lookup27[tostring(v["item2Id"])]
  if v["item2Unbreakable"] == nil then return {} end
  v["item2UsesDisplay"] = choose(v["item2Unbreakable"],"∞",v["item2Uses"])
  if v["item2UsesDisplay"] == nil then return {} end
  v["item2MaxDisplay"] = choose(v["item2Unbreakable"],"∞",v["item2MaxUses"])
  if v["item2MaxDisplay"] == nil then return {} end
  v["item3Id"] = (v["item3"] % 256)
  if v["item3Id"] == nil then return {} end
  v["item3Name"] = lookup24[tostring(v["item3Id"])]
  if v["item3Name"] == nil then return {} end
  v["item3Icon"] = lookup25[tostring(v["item3Id"])]
  if v["item3Icon"] == nil then return {} end
  v["item3Uses"] = math.floor(v["item3"] / 256)
  if v["item3Uses"] == nil then return {} end
  v["item3MaxUses"] = lookup26[tostring(v["item3Id"])]
  if v["item3MaxUses"] == nil then return {} end
  v["item3Unbreakable"] = lookup27[tostring(v["item3Id"])]
  if v["item3Unbreakable"] == nil then return {} end
  v["item3UsesDisplay"] = choose(v["item3Unbreakable"],"∞",v["item3Uses"])
  if v["item3UsesDisplay"] == nil then return {} end
  v["item3MaxDisplay"] = choose(v["item3Unbreakable"],"∞",v["item3MaxUses"])
  if v["item3MaxDisplay"] == nil then return {} end
  v["item4Id"] = (v["item4"] % 256)
  if v["item4Id"] == nil then return {} end
  v["item4Name"] = lookup24[tostring(v["item4Id"])]
  if v["item4Name"] == nil then return {} end
  v["item4Icon"] = lookup25[tostring(v["item4Id"])]
  if v["item4Icon"] == nil then return {} end
  v["item4Uses"] = math.floor(v["item4"] / 256)
  if v["item4Uses"] == nil then return {} end
  v["item4MaxUses"] = lookup26[tostring(v["item4Id"])]
  if v["item4MaxUses"] == nil then return {} end
  v["item4Unbreakable"] = lookup27[tostring(v["item4Id"])]
  if v["item4Unbreakable"] == nil then return {} end
  v["item4UsesDisplay"] = choose(v["item4Unbreakable"],"∞",v["item4Uses"])
  if v["item4UsesDisplay"] == nil then return {} end
  v["item4MaxDisplay"] = choose(v["item4Unbreakable"],"∞",v["item4MaxUses"])
  if v["item4MaxDisplay"] == nil then return {} end
  v["item5Id"] = (v["item5"] % 256)
  if v["item5Id"] == nil then return {} end
  v["item5Name"] = lookup24[tostring(v["item5Id"])]
  if v["item5Name"] == nil then return {} end
  v["item5Icon"] = lookup25[tostring(v["item5Id"])]
  if v["item5Icon"] == nil then return {} end
  v["item5Uses"] = math.floor(v["item5"] / 256)
  if v["item5Uses"] == nil then return {} end
  v["item5MaxUses"] = lookup26[tostring(v["item5Id"])]
  if v["item5MaxUses"] == nil then return {} end
  v["item5Unbreakable"] = lookup27[tostring(v["item5Id"])]
  if v["item5Unbreakable"] == nil then return {} end
  v["item5UsesDisplay"] = choose(v["item5Unbreakable"],"∞",v["item5Uses"])
  if v["item5UsesDisplay"] == nil then return {} end
  v["item5MaxDisplay"] = choose(v["item5Unbreakable"],"∞",v["item5MaxUses"])
  if v["item5MaxDisplay"] == nil then return {} end
  v["firstItemSlot"] = choose((v["item1Id"] >= 1),1,choose((v["item2Id"] >= 1),2,choose((v["item3Id"] >= 1),3,choose((v["item4Id"] >= 1),4,choose((v["item5Id"] >= 1),5,0)))))
  if v["firstItemSlot"] == nil then return {} end
  v["lastItemSlot"] = choose((v["item5Id"] >= 1),5,choose((v["item4Id"] >= 1),4,choose((v["item3Id"] >= 1),3,choose((v["item2Id"] >= 1),2,choose((v["item1Id"] >= 1),1,0)))))
  if v["lastItemSlot"] == nil then return {} end
  v["unitDropsItem"] = ((math.floor(v["unitState"] / 4096) % 2) == 1)
  if v["unitDropsItem"] == nil then return {} end
  v["item1Droppable"] = all(v["unitDropsItem"],(v["lastItemSlot"] == 1))
  if v["item1Droppable"] == nil then return {} end
  v["item2Droppable"] = all(v["unitDropsItem"],(v["lastItemSlot"] == 2))
  if v["item2Droppable"] == nil then return {} end
  v["item3Droppable"] = all(v["unitDropsItem"],(v["lastItemSlot"] == 3))
  if v["item3Droppable"] == nil then return {} end
  v["item4Droppable"] = all(v["unitDropsItem"],(v["lastItemSlot"] == 4))
  if v["item4Droppable"] == nil then return {} end
  v["item5Droppable"] = all(v["unitDropsItem"],(v["lastItemSlot"] == 5))
  if v["item5Droppable"] == nil then return {} end
  v["firstItemPage"] = lookup28[tostring(v["firstItemSlot"])]
  if v["firstItemPage"] == nil then return {} end
  v["item1Description"] = lookup29[tostring(v["item1Id"])]
  if v["item1Description"] == nil then return {} end
  v["item1Might"] = lookup30[tostring(v["item1Id"])]
  if v["item1Might"] == nil then return {} end
  v["item1Hit"] = lookup31[tostring(v["item1Id"])]
  if v["item1Hit"] == nil then return {} end
  v["item1Crit"] = lookup32[tostring(v["item1Id"])]
  if v["item1Crit"] == nil then return {} end
  v["item1Weight"] = lookup33[tostring(v["item1Id"])]
  if v["item1Weight"] == nil then return {} end
  v["item1Type"] = lookup34[tostring(v["item1Id"])]
  if v["item1Type"] == nil then return {} end
  v["item1Rank"] = lookup35[tostring(v["item1Id"])]
  if v["item1Rank"] == nil then return {} end
  v["item1Range"] = lookup36[tostring(v["item1Id"])]
  if v["item1Range"] == nil then return {} end
  v["item1IsWeapon"] = lookup37[tostring(v["item1Id"])]
  if v["item1IsWeapon"] == nil then return {} end
  v["item1HasRank"] = lookup38[tostring(v["item1Id"])]
  if v["item1HasRank"] == nil then return {} end
  v["firstItemSelected1"] = (v["firstItemSlot"] == 1)
  if v["firstItemSelected1"] == nil then return {} end
  v["item2Description"] = lookup29[tostring(v["item2Id"])]
  if v["item2Description"] == nil then return {} end
  v["item2Might"] = lookup30[tostring(v["item2Id"])]
  if v["item2Might"] == nil then return {} end
  v["item2Hit"] = lookup31[tostring(v["item2Id"])]
  if v["item2Hit"] == nil then return {} end
  v["item2Crit"] = lookup32[tostring(v["item2Id"])]
  if v["item2Crit"] == nil then return {} end
  v["item2Weight"] = lookup33[tostring(v["item2Id"])]
  if v["item2Weight"] == nil then return {} end
  v["item2Type"] = lookup34[tostring(v["item2Id"])]
  if v["item2Type"] == nil then return {} end
  v["item2Rank"] = lookup35[tostring(v["item2Id"])]
  if v["item2Rank"] == nil then return {} end
  v["item2Range"] = lookup36[tostring(v["item2Id"])]
  if v["item2Range"] == nil then return {} end
  v["item2IsWeapon"] = lookup37[tostring(v["item2Id"])]
  if v["item2IsWeapon"] == nil then return {} end
  v["item2HasRank"] = lookup38[tostring(v["item2Id"])]
  if v["item2HasRank"] == nil then return {} end
  v["firstItemSelected2"] = (v["firstItemSlot"] == 2)
  if v["firstItemSelected2"] == nil then return {} end
  v["item3Description"] = lookup29[tostring(v["item3Id"])]
  if v["item3Description"] == nil then return {} end
  v["item3Might"] = lookup30[tostring(v["item3Id"])]
  if v["item3Might"] == nil then return {} end
  v["item3Hit"] = lookup31[tostring(v["item3Id"])]
  if v["item3Hit"] == nil then return {} end
  v["item3Crit"] = lookup32[tostring(v["item3Id"])]
  if v["item3Crit"] == nil then return {} end
  v["item3Weight"] = lookup33[tostring(v["item3Id"])]
  if v["item3Weight"] == nil then return {} end
  v["item3Type"] = lookup34[tostring(v["item3Id"])]
  if v["item3Type"] == nil then return {} end
  v["item3Rank"] = lookup35[tostring(v["item3Id"])]
  if v["item3Rank"] == nil then return {} end
  v["item3Range"] = lookup36[tostring(v["item3Id"])]
  if v["item3Range"] == nil then return {} end
  v["item3IsWeapon"] = lookup37[tostring(v["item3Id"])]
  if v["item3IsWeapon"] == nil then return {} end
  v["item3HasRank"] = lookup38[tostring(v["item3Id"])]
  if v["item3HasRank"] == nil then return {} end
  v["firstItemSelected3"] = (v["firstItemSlot"] == 3)
  if v["firstItemSelected3"] == nil then return {} end
  v["item4Description"] = lookup29[tostring(v["item4Id"])]
  if v["item4Description"] == nil then return {} end
  v["item4Might"] = lookup30[tostring(v["item4Id"])]
  if v["item4Might"] == nil then return {} end
  v["item4Hit"] = lookup31[tostring(v["item4Id"])]
  if v["item4Hit"] == nil then return {} end
  v["item4Crit"] = lookup32[tostring(v["item4Id"])]
  if v["item4Crit"] == nil then return {} end
  v["item4Weight"] = lookup33[tostring(v["item4Id"])]
  if v["item4Weight"] == nil then return {} end
  v["item4Type"] = lookup34[tostring(v["item4Id"])]
  if v["item4Type"] == nil then return {} end
  v["item4Rank"] = lookup35[tostring(v["item4Id"])]
  if v["item4Rank"] == nil then return {} end
  v["item4Range"] = lookup36[tostring(v["item4Id"])]
  if v["item4Range"] == nil then return {} end
  v["item4IsWeapon"] = lookup37[tostring(v["item4Id"])]
  if v["item4IsWeapon"] == nil then return {} end
  v["item4HasRank"] = lookup38[tostring(v["item4Id"])]
  if v["item4HasRank"] == nil then return {} end
  v["firstItemSelected4"] = (v["firstItemSlot"] == 4)
  if v["firstItemSelected4"] == nil then return {} end
  v["item5Description"] = lookup29[tostring(v["item5Id"])]
  if v["item5Description"] == nil then return {} end
  v["item5Might"] = lookup30[tostring(v["item5Id"])]
  if v["item5Might"] == nil then return {} end
  v["item5Hit"] = lookup31[tostring(v["item5Id"])]
  if v["item5Hit"] == nil then return {} end
  v["item5Crit"] = lookup32[tostring(v["item5Id"])]
  if v["item5Crit"] == nil then return {} end
  v["item5Weight"] = lookup33[tostring(v["item5Id"])]
  if v["item5Weight"] == nil then return {} end
  v["item5Type"] = lookup34[tostring(v["item5Id"])]
  if v["item5Type"] == nil then return {} end
  v["item5Rank"] = lookup35[tostring(v["item5Id"])]
  if v["item5Rank"] == nil then return {} end
  v["item5Range"] = lookup36[tostring(v["item5Id"])]
  if v["item5Range"] == nil then return {} end
  v["item5IsWeapon"] = lookup37[tostring(v["item5Id"])]
  if v["item5IsWeapon"] == nil then return {} end
  v["item5HasRank"] = lookup38[tostring(v["item5Id"])]
  if v["item5HasRank"] == nil then return {} end
  v["firstItemSelected5"] = (v["firstItemSlot"] == 5)
  if v["firstItemSelected5"] == nil then return {} end
  v["affinityPow"] = lookup39[tostring(v["affinity"])]
  if v["affinityPow"] == nil then return {} end
  v["affinityDef"] = lookup40[tostring(v["affinity"])]
  if v["affinityDef"] == nil then return {} end
  v["affinityHit"] = lookup41[tostring(v["affinity"])]
  if v["affinityHit"] == nil then return {} end
  v["affinityAvo"] = lookup42[tostring(v["affinity"])]
  if v["affinityAvo"] == nil then return {} end
  v["affinityCrit"] = lookup43[tostring(v["affinity"])]
  if v["affinityCrit"] == nil then return {} end
  v["affinityCritAvo"] = lookup44[tostring(v["affinity"])]
  if v["affinityCritAvo"] == nil then return {} end
  v["item1IsNonWeapon"] = choose(v["item1IsWeapon"],false,true)
  if v["item1IsNonWeapon"] == nil then return {} end
  v["item2IsNonWeapon"] = choose(v["item2IsWeapon"],false,true)
  if v["item2IsNonWeapon"] == nil then return {} end
  v["item3IsNonWeapon"] = choose(v["item3IsWeapon"],false,true)
  if v["item3IsNonWeapon"] == nil then return {} end
  v["item4IsNonWeapon"] = choose(v["item4IsWeapon"],false,true)
  if v["item4IsNonWeapon"] == nil then return {} end
  v["item5IsNonWeapon"] = choose(v["item5IsWeapon"],false,true)
  if v["item5IsNonWeapon"] == nil then return {} end
  v["support1PortraitMissing"] = choose(v["support1Portrait"],false,true)
  if v["support1PortraitMissing"] == nil then return {} end
  v["support1DisplayRank"] = choose(v["support1Name"],v["support1Rank"],"---")
  if v["support1DisplayRank"] == nil then return {} end
  v["support2PortraitMissing"] = choose(v["support2Portrait"],false,true)
  if v["support2PortraitMissing"] == nil then return {} end
  v["support2DisplayRank"] = choose(v["support2Name"],v["support2Rank"],"---")
  if v["support2DisplayRank"] == nil then return {} end
  v["support3PortraitMissing"] = choose(v["support3Portrait"],false,true)
  if v["support3PortraitMissing"] == nil then return {} end
  v["support3DisplayRank"] = choose(v["support3Name"],v["support3Rank"],"---")
  if v["support3DisplayRank"] == nil then return {} end
  v["support4PortraitMissing"] = choose(v["support4Portrait"],false,true)
  if v["support4PortraitMissing"] == nil then return {} end
  v["support4DisplayRank"] = choose(v["support4Name"],v["support4Rank"],"---")
  if v["support4DisplayRank"] == nil then return {} end
  v["support5PortraitMissing"] = choose(v["support5Portrait"],false,true)
  if v["support5PortraitMissing"] == nil then return {} end
  v["support5DisplayRank"] = choose(v["support5Name"],v["support5Rank"],"---")
  if v["support5DisplayRank"] == nil then return {} end
  v["expCompact"] = lookup45[tostring(v["exp"])]
  if v["expCompact"] == nil then return {} end
  v["levelProgress"] = choose((v["exp"] == 255),0,v["exp"])
  if v["levelProgress"] == nil then return {} end
  v["portraitMissing"] = choose(v["portrait"],false,true)
  if v["portraitMissing"] == nil then return {} end
  v["portraitAspectRatio"] = lookup46[tostring(v["portrait"])]
  if v["portraitAspectRatio"] == nil then return {} end
  v["headerAspectRatio"] = (v["portraitAspectRatio"] * 3.4482758620689657)
  if v["headerAspectRatio"] == nil then return {} end
  v["travelerPresent"] = choose((v["rescueId"] == 0),false,true)
  if v["travelerPresent"] == nil then return {} end
  v["conditionActive"] = choose(((v["statusByte"] % 16) == 0),false,true)
  if v["conditionActive"] == nil then return {} end
  v["affinityIcon"] = lookup47[tostring(v["affinity"])]
  if v["affinityIcon"] == nil then return {} end
  v["affinityMissing"] = choose(v["affinityIcon"],false,true)
  if v["affinityMissing"] == nil then return {} end
  v["supportEmpty"] = choose(first(v["support1Name"],v["support2Name"],v["support3Name"],v["support4Name"],v["support5Name"]),false,true)
  if v["supportEmpty"] == nil then return {} end
  applyMapSource(v,unit)
  local u = unit
  -- Immutable items metadata is initialized once above update().
  -- Immutable chars metadata is initialized once above update().
  -- Immutable classes metadata is initialized once above update().
  -- Immutable rescueSlots metadata is initialized once above update().
  v.traveler="---"; local rescued=rescueSlots[v.rescueId]; if v.rescueId and v.rescueId~=0 and rescued and mem.u8(rescued+11)==v.rescueId then local passenger=chars[mem.u32(rescued)]; if passenger and passenger.name and not passenger.name:match("^Unit #") then v.traveler=passenger.name end end
  local char, cls = chars[v.characterPointer], classes[v.classPointer]
  local w, slot = nil, 0
  if char and cls then for i=0,4 do local raw=mem.u16(u+0x1E+i*2); local id=raw%256; local item=items[id]; if item and (item.r==0 or ((char.a & item.r)==item.r or (cls.a & item.r)==item.r)) then local rank=mem.u8(u+0x28+item.t); if item.t>=8 or rank>=item.n then w,slot=item,i+1; break end end end end
  v.equipmentWeapon=w and mem.u16(u+0x1E+(slot-1)*2) or 0; v.equipmentSlot=slot; v.equipmentHasWeapon=w~=nil; v.equipmentMatches=true; v.equipmentMissing=w==nil; v.equipmentId=w and (v.equipmentWeapon%256) or 0; v.equipmentName=w and w.name or "---"
  for i=1,5 do v["item"..i.."Badge"]=(slot==i) and "E" or "" end
  if w then local state=mem.u32(u+12); local rescuing=(state & 0x10)~=0; local skl=mem.u8(u+21); local spd=mem.u8(u+22); if rescuing then skl=math.floor(skl/2); spd=math.floor(spd/2) end; local con=mem.s8(u+26)+cls.con+char.con; local as=math.max(0,spd-math.max(0,w.w-con)); local luck=mem.u8(u+25); local avoid=0; local rows=mem.u32(0x0202E3E0); if rows>=0x02000000 and rows<0x02040000 then local row=mem.u32(rows+mem.u8(u+17)*4); if row>=0x02000000 and row<0x02040000 then avoid=cls.avoid[mem.u8(row+mem.u8(u+16))+1] or 0 end end; v.equipmentAtk=mem.u8(u+20)+w.m; v.equipmentHit=skl*2+w.h+math.floor(luck/2); v.equipmentCrit=w.c+math.floor(skl/2)+(((char.a & 0x40)~=0) and 15 or 0); v.equipmentAS=as; v.equipmentAvoid=as*2+avoid+luck; v.weaponMight=w.m; v.weaponHit=w.h; v.weaponCrit=w.c; v.weaponWeight=w.w; v.weaponType=({"Sword","Lance","Axe","Bow","Staff","Anima","Light","Dark","Ballista","Item","Dragon"})[w.t+1] or "---"; v.weaponRank=w.n>=251 and "S" or w.n>=181 and "A" or w.n>=121 and "B" or w.n>=71 and "C" or w.n>=31 and "D" or w.n>0 and "E" or "---"; local range=w.g; v.equipmentRange=range==16 and "1–Mag/2" or ((range>>4)==(range&15) and tostring(range&15) or tostring(range>>4).."–"..tostring(range&15)) else v.equipmentAtk="---"; v.equipmentHit="---"; v.equipmentCrit="---"; v.equipmentAS="---"; v.equipmentAvoid="---"; v.equipmentRange="---" end
  -- Immutable fc, fk, fi metadata is initialized once above update().
  local show=v.forecastActive; v.forecastActive=false
  local a=33793008; local d=a+128
  if show and mem.u8(a+11)==v.deployment and fc[mem.u32(a)] and fc[mem.u32(d)] and fk[mem.u32(a+4)] and fk[mem.u32(d+4)] and mem.u8(a+18)>0 and mem.u8(d+18)>0 then
    for i=1,2 do local u=i==1 and a or d; local other=i==1 and d or a; local prefix=i==1 and "forecastactor" or "forecasttarget"; local c,k=fc[mem.u32(u)],fk[mem.u32(u+4)]; local item=fi[mem.u16(u+0x4A)%256]; local can=mem.u8(u+0x52)~=0; local speed=mem.s16(u+0x5E); local count=(speed>=mem.s16(other+0x5E)+4 and 2 or 1)*((mem.u32(u+0x4C) & 0x20)~=0 and 2 or 1); local damage=math.max(0,mem.s16(u+0x5A)-mem.s16(other+0x5C)); v[prefix.."Name"]=c.name; v[prefix.."Class"]=k.name; v[prefix.."Portrait"]=c.portrait~="" and c.portrait or k.portrait; v[prefix.."Hp"]=mem.u8(u+0x72); v[prefix.."MaxHp"]=mem.u8(u+18); v[prefix.."Weapon"]=item and item.name or "---"; v[prefix.."Icon"]=item and item.icon or ""; v[prefix.."Damage"]=can and (tostring(damage)..(count>1 and " x"..count or "")) or "---"; v[prefix.."Hit"]=can and mem.s16(u+0x64) or "---"; v[prefix.."Crit"]=can and mem.s16(u+0x6A) or "---"; v[prefix.."AS"]=speed end
    local sides={}; for i=1,2 do local u=i==1 and a or d; local other=i==1 and d or a; local prefix=i==1 and "forecastactor" or "forecasttarget"; local weapon=mem.u16(u+0x4A); if weapon==0 then v[prefix.."Weapon"]="No weapon"; v[prefix.."Icon"]="" end; local attrs=mem.u32(u+0x4C); local item=fi[weapon%256]; local speed=mem.s16(u+0x5E); local count=(speed>=mem.s16(other+0x5E)+4 and 2 or 1)*((attrs & 0x20)~=0 and 2 or 1); local can=mem.u8(u+0x52)~=0; local tri=mem.s8(u+0x54); if tri==0 then tri=mem.s8(u+0x53) end; v[prefix.."Level"]=mem.u8(u+8); v[prefix.."Uses"]=weapon~=0 and ((attrs & 8)~=0 and "--" or tostring(weapon>>8).."/"..tostring(item and item.maxUses or 0)) or "--"; v[prefix.."Mt"]=can and math.max(0,mem.s16(u+0x5A)-mem.s16(other+0x5C)) or "---"; v[prefix.."Multiplier"]=can and count>1 and "×"..count or ""; v[prefix.."HasMulti"]=can and count>1; v[prefix.."Triangle"]=tri>0 and "↑" or tri<0 and "↓" or ""; v[prefix.."Advantage"]=tri>0; v[prefix.."Disadvantage"]=tri<0; sides[i]={hp=mem.u8(u+0x72),max=mem.u8(u+18),speed=speed,can=can,hit=mem.s16(u+0x64),damage=math.max(0,mem.s16(u+0x5A)-mem.s16(other+0x5C)),brave=(attrs & 0x20)~=0,uses=weapon>>8,unbreakable=(attrs & 8)~=0,drain=weapon%256==17 or weapon%256==70} end
    local totals={}; for i=1,2 do local s=sides[i]; local count=(s.speed>=sides[3-i].speed+4 and 2 or 1)*(s.brave and 2 or 1); totals[i]=(s.can and s.hit>0) and math.max(0,s.damage)*math.min(count,s.unbreakable and count or math.max(0,s.uses)) or 0 end; local hp={}; for i=1,2 do local s=sides[i]; hp[i]=math.max(0,math.min(s.max,s.hp+(s.drain and math.min(sides[3-i].hp,totals[i]) or 0)-totals[3-i])) end
    for i=1,2 do local prefix=i==1 and "forecastactor" or "forecasttarget"; local s=sides[i]; local loss=math.max(0,s.hp-hp[i]); v[prefix.."AfterHp"]=hp[i]; v[prefix.."HpLoss"]=loss; v[prefix.."HasLoss"]=loss>0; v[prefix.."HpRemainWidth"]=tostring(math.min(s.max,hp[i])/math.max(1,s.max)*100).."%"; v[prefix.."HpLossWidth"]=tostring(loss/math.max(1,s.max)*100).."%" end
    v.forecastActive=true
  end
  studioPulseTick = studioPulseTick + 1
  local studioPulseOn = ((studioPulseTick * 200) % 1000) < 500
  v.item1DropFlash = truth(v.item1Droppable) and studioPulseOn
  v.item2DropFlash = truth(v.item2Droppable) and studioPulseOn
  v.item3DropFlash = truth(v.item3Droppable) and studioPulseOn
  v.item4DropFlash = truth(v.item4Droppable) and studioPulseOn
  v.item5DropFlash = truth(v.item5Droppable) and studioPulseOn
  v.travelerFlash = truth(v.travelerPresent) and studioPulseOn
  v.conditionFlash = truth(v.conditionActive) and studioPulseOn
  v.forecastactorMultiFlash = truth(v.forecastactorHasMulti) and studioPulseOn
  v.forecastactorHpFlash = truth(v.forecastactorHasLoss) and studioPulseOn
  v.forecastactorTriangleFlash = truth(v.forecastactorTriangle) and studioPulseOn
  v.forecasttargetMultiFlash = truth(v.forecasttargetHasMulti) and studioPulseOn
  v.forecasttargetHpFlash = truth(v.forecasttargetHasLoss) and studioPulseOn
  v.forecasttargetTriangleFlash = truth(v.forecasttargetTriangle) and studioPulseOn
  v.mapDropFlash = truth(v.mapHasDrops) and studioPulseOn
  local identity = table.concat({tostring(v["characterPointer"]),tostring(v["deployment"]),tostring(v["item1Id"]),tostring(v["item2Id"]),tostring(v["item3Id"]),tostring(v["item4Id"]),tostring(v["item5Id"])}, "|")
  if identity ~= lastUiIdentity then
    v.ui = {set={["inventoryDetail"]=v["firstItemPage"],["itemSelected1"]=v["firstItemSelected1"],["itemSelected2"]=v["firstItemSelected2"],["itemSelected3"]=v["firstItemSelected3"],["itemSelected4"]=v["firstItemSelected4"],["itemSelected5"]=v["firstItemSelected5"]}}
    lastUiIdentity = identity
  end
  v.ui=v.ui or {}; v.ui.set=v.ui.set or {}; v.ui.set.companionView=v.forecastActive and "battle" or "companion"
  if v.forecastActive then v.ui.set.mainTab="Units"; v.ui.set.navUnits=true; v.ui.set.navMap=false end
  local cl=mapMeta.classes[v.classPointer];local faction=(v.deployment or 0)>>6;v.mapSprite=cl and cl.mapSprites[faction==1 and 2 or faction>=2 and 3 or 1] or ""
  return v
end

-- Royal presentation: count occupied inventory slots; retain original update.
local royalOriginalUpdate = update
function update()
  local v = royalOriginalUpdate()
  v.royalItemCount = 0
  for i=1,5 do if (tonumber(v["item"..i.."Id"]) or 0)>0 then v.royalItemCount=v.royalItemCount+1 end end
  local hasSupport=false
  for i=1,5 do
    local k="support"..i; local rank=v[k.."Rank"]
    if rank=="C" or rank=="B" or rank=="A" then hasSupport=true
    else v[k.."Name"]="";v[k.."Portrait"]="";v[k.."PortraitMissing"]=true;v[k.."DisplayRank"]="---" end
  end
  v.supportEmpty=not hasSupport
  return v
end

local growthCharacters=D.growthCharacters
local growthClasses=D.growthClasses
local growthItems=D.growthItems
local growthSlots=D.slots
local growthBattleClassIds={} for _,k in pairs(growthClasses)do growthBattleClassIds[k.id]=k end
-- FE7 AE7E combat RNG, compared with the original Thumb battle routines.
-- All state is a private copy. This module never writes mem or sends input.
function growthRng(seed)
 local r={state={seed[1],seed[2],seed[3]},count=0}
 function r.next()
  local s=r.state
  local n=((((s[2]<<11)+(s[1]>>5))&65535)~(((s[3]<<1)+(s[2]>>15))&65535))&65535
  s[3]=s[2];s[2]=s[1];s[1]=n;r.count=r.count+1
  return (n*100)>>16
 end
 function r.roll(chance) return chance>r.next() end
 function r.hit(chance) return chance>((r.next()+r.next())//2) end
 return r
end
function growthLevelGains(c,k,u,rng)
 local bonus=(u.state&0x2000)~=0 and 5 or 0
 local function increase(g)
  local n=0;while g>100 do n=n+1;g=g-100 end
  return n+(rng.roll(g) and 1 or 0)
 end
 local gains,total={},0
 for i=1,7 do gains[i]=increase(c.growth[i]+bonus);total=total+gains[i] end
 if total==0 then for retry=1,2 do
  local found=false
  for i=1,7 do gains[i]=increase(c.growth[i]);if gains[i]>0 then found=true;break end end
  if found then break end
 end end
 for i=1,7 do
  local cap=i==1 and (u.id>=128 and u.id<192 and 120 or 60) or i==7 and 30 or k.caps[i]
  gains[i]=math.max(0,math.min(gains[i],cap-u.stats[i]))
 end
 return gains
end
function growthSimulateBattle(a,b,seed,normalMode,noExp,hypotheticalId)
 -- The caller supplies untouched battle records (before simulation effects).
 local rng=growthRng(seed);local rounds={};local silencer=false
 local function effect(s) local it=growthItems[s.weapon%256];return it and it.effect or 0 end
 local function hit(s,t,first)
  local chance,crit=s.hit,s.crit
  if first and s.triangle then chance=100;crit=100 end
  local landed=rng.hit(chance);local critical,lethal,backfire=false,false,false
  local damage=0
  if landed then
   damage=s.attack-t.defense
   critical=rng.roll(crit)
   if critical then lethal=rng.roll(s.silencer);damage=lethal and 127 or damage*3 end
   damage=math.min(127,math.max(0,damage));if damage>0 then s.dealt=true end
   local e=effect(s)
   if e==4 and rng.roll((31-s.luck)&65535) then s.hp=math.max(0,s.hp-damage);backfire=true
   else damage=math.min(damage,t.hp);t.hp=math.max(0,t.hp-damage) end
   if e==2 then s.hp=math.min(s.maxHp,s.hp+damage) end
   if lethal then silencer=true end
  end
  rounds[#rounds+1]={id=s.id,hit=landed,crit=critical,silencer=lethal,backfire=backfire,damage=damage}
  if landed or (s.weaponAttributes&0x82)~=0 then
   local it=growthItems[s.weapon%256]
   if not it or (it.attributes&8)==0 then s.weapon=s.weapon-256;if s.weapon<256 then s.weapon=0 end end
  end
  return s.hp<=0 or t.hp<=0
 end
 local first=true
 local function attack(s,t)
  if s.weapon==0 then return false end
  local count=(s.weaponAttributes&32)~=0 and 2 or 1
  for i=1,count do local stop=hit(s,t,first);first=false;if stop then return true end end
  return false
 end
 local finished=attack(a,b)
 if not finished then finished=attack(b,a) end
 if not finished and b.speed<=250 and math.abs(a.speed-b.speed)>=4 then
  local fast,slow=a,b;if b.speed>a.speed then fast,slow=b,a end
  if effect(fast)~=3 then attack(fast,slow) end
 end
 local function exp(s,t)
  if noExp or (a.id&0xc0)==0 and (b.id&0xc0)==0 or s.id>=64 or s.exp==255 or s.level>=20 or s.hp<=0 or (t.attributes&0x1000000)~=0 then return 0 end
  if not s.dealt then return 1 end
  if s.power<=0 then return 0 end
  local function level(x)return x.level+((x.attributes&256)~=0 and 20 or 0)end
  local function power(x)
   local n=x.level*x.power
   if (x.attributes&256)~=0 then local base=growthBattleClassIds[x.baseClass];n=n+20*(base and base.power or 0) end
   return n
  end
  local hitExp=math.max(0,31-level(s)+level(t))//s.power
  local bonus=0
  if t.hp==0 then
   local ps,pt=power(s),power(t)
   bonus=normalMode and (pt>ps and 20+pt-ps or 20+pt-ps//2) or 20+pt-ps
   bonus=math.max(0,bonus+((t.attributes&8)~=0 and 20 or 0)+((t.attributes&0x8000)~=0 and 40 or 0))
   if (s.attributes&0x2000000)~=0 and silencer then bonus=bonus*2 end
  end
  return math.max(0,math.min(100,hitExp+bonus))
 end
 a.expGain=exp(a,b);b.expGain=exp(b,a)
 for _,s in ipairs({a,b})do
  -- Preserve the real combat/RN consumption. Only the selected unit's
  -- level-up eligibility may be hypothetical, as in the FE6/FE8 adapters.
  -- Default callers still receive the exact, actual simulated outcome.
  local hypothetical=not noExp and s.id==hypotheticalId
  s.gains={0,0,0,0,0,0,0};s.levelUp=s.exp~=255 and s.level<20 and (hypothetical or s.exp+s.expGain>=100 and s.expGain>0)
  if s.levelUp then
   s.gains=growthLevelGains(growthCharacters[s.cp],growthClasses[s.kp],s,rng)
   if s.level==19 then s.expGain=100-s.exp end
  end
 end
 return {actor=a,target=b,rounds=rounds,seed=seed,finalSeed=rng.state,rolls=rng.count}
end
function growthReadBattle(hypotheticalId)
 local function read(u)
  local cp,kp=mem.u32(u),mem.u32(u+4);local c,k=growthCharacters[cp],growthClasses[kp]
  if not c or not k then return nil end
  local id=mem.u8(u+11);local w=mem.u16(u+0x4a)
  local base=growthSlots[id] or u
  if mem.u8(u+0x52)==0 then w=0 end
  return {cp=cp,kp=kp,id=id,name=c.name,level=mem.u8(u+0x70),exp=mem.u8(u+0x71),state=mem.u32(u+12),
   stats={mem.u8(base+18),mem.u8(base+20),mem.u8(base+21),mem.u8(base+22),mem.u8(base+23),mem.u8(base+24),mem.u8(base+25)},
   hp=mem.u8(u+0x72),maxHp=mem.u8(u+18),luck=mem.u8(u+25),weapon=w,weaponAttributes=mem.u32(u+0x4c),
   attributes=c.attributes|k.attributes,power=k.power,baseClass=k.baseClass,x=mem.s8(u+16),y=mem.s8(u+17),status=mem.u8(u+48)&15,
   attack=mem.s16(u+0x5a),defense=mem.s16(u+0x5c),speed=mem.s16(u+0x5e),hit=mem.s16(u+0x64),crit=mem.s16(u+0x6a),silencer=mem.s16(u+0x6c)}
 end
 local a,b=read(0x0203a3f0),read(0x0203a470)
 if not a or not b then return nil,"Dữ liệu giao chiến chưa sẵn sàng" end
 if mem.u32(0x0203a874)~=0 then return nil,"Trận theo kịch bản: chưa hỗ trợ dự đoán" end
 if (mem.u16(0x0203a3d8)&32)~=0 then return nil,"Đấu trường: chưa hỗ trợ dự đoán" end
 -- Triangle attack is deterministic, but eligibility depends on adjacent allies.
 if (a.attributes&0x600000)~=0 and math.abs(a.x-b.x)+math.abs(a.y-b.y)==1 and a.status~=4 then
  local rows=mem.u32(0x0202e3dc);local w,h=mem.u16(0x0202e3d8),mem.u16(0x0202e3da);local count=0
  if rows>=0x02000000 and rows<0x02040000 then
   for _,d in ipairs({{0,1},{1,0},{0,-1},{-1,0}})do
    local x,y=b.x+d[1],b.y+d[2]
    if x>=0 and x<w and y>=0 and y<h then
     local id=mem.u8(mem.u32(rows+y*4)+x);local u=growthSlots[id]
     if u and (id&0xc0)==(a.id&0xc0) and (mem.u8(u+48)&15)~=2 then
      local c,k=growthCharacters[mem.u32(u)],growthClasses[mem.u32(u+4)]
      if c and k and ((c.attributes|k.attributes)&a.attributes&0x600000)~=0 then count=count+1 end
     end
    end
   end
  end
  a.triangle=count>=2
 end
 local seed={mem.u16(0x03000000),mem.u16(0x03000002),mem.u16(0x03000004)}
 local normal=mem.u8(0x0202bc13)~=1 and (mem.u8(0x0202bc0c)&64)==0
 local result=growthSimulateBattle(a,b,seed,normal,(mem.u8(0x0202bc0c)&128)~=0,hypotheticalId)
 result.chapter=mem.u8(0x0202bc06)
 return result
end

-- Read-only hypothetical level-up. RNG is copied; mem is never written.
local growthPreviousUpdate=update
local growthTick=0
local growthOpponent=nil
local growthBattleCache=nil
local growthWasForecast=false
local growthViewCache=nil
local growthCheckedSeed=nil
local growthCheckedChapter=nil
local function growthRngSignal(v)
 local seed={mem.u16(0x03000000),mem.u16(0x03000002),mem.u16(0x03000004)}
 local chapter=mem.u8(0x0202bc06)
 if growthCheckedChapter~=chapter then growthCheckedSeed=nil end
 if v.forecastActive then growthCheckedSeed=seed;growthCheckedChapter=chapter end
 local changed=growthCheckedSeed and (seed[1]~=growthCheckedSeed[1] or seed[2]~=growthCheckedSeed[2] or seed[3]~=growthCheckedSeed[3]) or false
 v.rngStateChanged=changed
 v.rngStateTracking=growthCheckedSeed~=nil
 v.rngLedFlash=changed
 if (mem.u16(0x0203a3d8)&1)~=0 then
  v.rngStateText="Đang giao chiến"
  v.rngStateChanged=false
  v.rngLedFlash=false
 elseif v.forecastActive then v.rngStateText="Đã ghi nhận RNG của dự báo này"
 elseif not growthCheckedSeed then v.rngStateText="Mở dự báo giao chiến để ghi nhận RNG"
 elseif changed then v.rngStateText="RNG đã đổi — có thể kiểm tra lại"
 else v.rngStateText="RNG chưa đổi — so với lần xem dự báo gần nhất" end
end
local growthClassIds={};for _,k in pairs(growthClasses)do growthClassIds[k.id]=k end
function growthEstimateExp(a,b,normalMode)
 local function expLevel(x) return x.level+((x.attributes&256)~=0 and 20 or 0) end
 local function power(x)
  local n=x.level*x.power
  if (x.attributes&256)~=0 then local base=growthClassIds[x.baseClass];n=n+20*(base and base.power or 0) end
  return n
 end
 if (b.attributes&0x1000000)~=0 or a.power<=0 then return 0,0 end
 local hit=math.floor(math.max(0,31-expLevel(a)+expLevel(b))/a.power)
 local pa,pb=power(a),power(b)
 local kill=normalMode and (pb>pa and 20+pb-pa or 20+pb-math.floor(pa/2)) or 20+pb-pa
 kill=math.max(0,kill+((b.attributes&8)~=0 and 20 or 0)+((b.attributes&0x8000)~=0 and 40 or 0))
 return math.min(100,hit),math.min(100,hit+kill)
end
function update()
 local base=growthPreviousUpdate();local v=base;growthTick=growthTick+1
 v.analysisFailed=false;v.analysisPredictionError=nil;v.predictionFailureReason=nil
 growthRngSignal(base)
 -- Derive presence here: the inherited runtime did not populate its pulse predicates.
 base.travelerPresent=base.unitPresent and (tonumber(base.rescueId) or 0)>0 and base.traveler~=nil and base.traveler~="---" and base.traveler~="" or false
 base.conditionActive=base.unitPresent and ((tonumber(base.statusByte) or 0)&15)~=0 or false
 base.travelerFlash=base.travelerPresent and growthTick%6<3
 base.conditionFlash=base.conditionActive and growthTick%6<3
 if growthViewCache and growthBattleCache then
  local q=growthViewCache;local u=growthSlots[q.deployment]
  if not u or mem.u32(u)~=q.characterPointer or mem.u32(u+4)~=q.classPointer or mem.u8(u+8)~=q.level or mem.u8(u+9)~=q.exp or mem.u8(u+19)==0 or mem.u8(0x0202bc06)~=growthBattleCache.chapter then growthViewCache=nil;growthBattleCache=nil end
 end
 if growthViewCache and growthBattleCache and not base.forecastActive and (mem.u16(0x0203a3d8)&1)~=0 then
  local q=growthViewCache;local u=growthSlots[q.deployment]
  if u and mem.u32(u)==q.characterPointer and mem.u32(u+4)==q.classPointer and mem.u8(u+8)==q.level and mem.u8(u+9)==q.exp and mem.u8(0x0202bc06)==growthBattleCache.chapter then
   v={};for key,value in pairs(base)do v[key]=value end;for key,value in pairs(q)do v[key]=value end
  else growthViewCache=nil end
 end
 v.growthPresent=false;v.growthMissing=true;v.rngAvailable=false
 local c=growthCharacters[v.characterPointer];local k=growthClasses[v.classPointer]
 if not v.unitPresent or not c or not k then growthWasForecast=false;return v end
 v.growthPresent=true;v.growthMissing=false
 v.growthUnitName=v.unitName;v.growthClassName=v.className;v.growthPortrait=v.portrait;v.growthLevel=v.level;v.growthPowerLabel=v.powerLabel
 if v.forecastActive and v.deployment<64 then
  growthViewCache={};for _,key in ipairs({"characterPointer","classPointer","deployment","level","exp","unitState","maxHp","hp","str","skill","spd","def","res","luck","powerLabel","unitName","className","portrait","unitPresent"})do growthViewCache[key]=v[key] end
 end
 local bonus=((v.unitState or 0)&0x2000)~=0 and 5 or 0
 v.growthRadar=ui and ui.growthPopup==true and c.radars[bonus==5 and 2 or 1] or ""
 v.growthBonus=bonus==5 and "Afa's Drops: tăng thêm 5 điểm %" or "Tỷ lệ tăng chỉ số của nhân vật"
 local promoted=((c.attributes|k.attributes)&0x100)~=0
 v.growthTier=promoted and "Đã chuyển chức nghiệp" or "Chưa chuyển chức nghiệp"
 v.growthExpLevel=(v.level or 0)+(promoted and 20 or 0)
 v.growthLevelsLeft=math.max(0,20-(v.level or 0))
 local allowed=(v.deployment or 255)<64 and (v.exp or 255)~=255 and (v.level or 20)<20
 v.growthExpNeeded=allowed and tostring(100-v.exp) or "---"
 v.growthExpText=allowed and (tostring(v.exp).." / 100 EXP") or "Không thể nhận EXP"
 v.growthExpProgress=allowed and v.exp or 0
 v.growthExpMatch="Choose an opponent to estimate battle EXP."
 v.rngExpHit="---";v.rngExpKill="---";v.rngExpReceived="---"
 local function snapshot(u)
  local cp,kp=mem.u32(u),mem.u32(u+4);local cc,kk=growthCharacters[cp],growthClasses[kp]
  if not cc or not kk then return nil end
  return {cp=cp,kp=kp,level=mem.u8(u+8),attributes=cc.attributes|kk.attributes,power=kk.power,baseClass=kk.baseClass,name=cc.name}
 end
 if v.forecastActive then
  local a,b=snapshot(0x0203a3f0),snapshot(0x0203a470)
  if a and b then
   if a.cp==v.characterPointer and a.kp==v.classPointer then growthOpponent={owner=a.cp,other=b}
   elseif b.cp==v.characterPointer and b.kp==v.classPointer then growthOpponent={owner=b.cp,other=a} end
  end
 end
 if growthOpponent and growthOpponent.owner==v.characterPointer and allowed then
  local me={level=v.level,attributes=c.attributes|k.attributes,power=k.power,baseClass=k.baseClass}
  local normal=mem.u8(0x0202bc13)~=1 and (mem.u8(0x0202bc0c)&0x40)==0
  local hit,kill=growthEstimateExp(me,growthOpponent.other,normal)
  -- Cards are conditional on survival and damage, never simulated hit/miss.
  local extraMap=(mem.u8(0x0202bc0c)&128)~=0
  local friendly=v.forecastActive and (mem.u8(0x0203a3fb)&0xc0)==0 and (mem.u8(0x0203a47b)&0xc0)==0
  if extraMap or friendly then hit=0;kill=0 end
  v.rngExpHit=hit;v.rngExpKill=kill
  v.growthExpMatch=growthOpponent.other.name..": gây sát thương "..hit.." / hạ địch "..kill.." EXP nếu sống sót."
 else v.growthExpMatch="Chọn đối thủ ở dự báo giao chiến để xem EXP." end
 v.rngContext=allowed and "Chọn vũ khí và đối thủ trước khi đánh" or "Nhân vật này không thể lên cấp"
 v.rngNotice="Mô phỏng cả phản công, đánh tiếp và EXP."
 v.rngSeed="Chưa chọn trận giao chiến";v.rngRollCount=0
 local battle,reason=nil,nil
 local conditionalLevel=allowed and (tonumber(v.rngExpHit)or 0)>0 and v.exp+(tonumber(v.rngExpHit)or 0)>=100 or allowed and (tonumber(v.rngExpKill)or 0)>0 and v.exp+(tonumber(v.rngExpKill)or 0)>=100
 if v.forecastActive then battle,reason=growthReadBattle(conditionalLevel and v.deployment or nil);growthBattleCache=battle
 elseif growthBattleCache and (mem.u16(0x0203a3d8)&1)~=0 and mem.u8(0x0202bc06)==growthBattleCache.chapter then
  local q=growthBattleCache
  local same=(v.characterPointer==q.actor.cp and v.level==q.actor.level and v.exp==q.actor.exp) or (v.characterPointer==q.target.cp and v.level==q.target.level and v.exp==q.target.exp)
  if same and mem.u32(0x0203a3f0)==q.actor.cp and mem.u32(0x0203a470)==q.target.cp and mem.u8(0x0203a460)==q.actor.level and mem.u8(0x0203a461)==q.actor.exp then battle=q end
 end
 local predicted=nil
 if battle then
  if battle.actor.cp==v.characterPointer and battle.actor.id==v.deployment then predicted=battle.actor
  elseif battle.target.cp==v.characterPointer and battle.target.id==v.deployment then predicted=battle.target end
 end
 v.rngBattleActive=battle~=nil;v.rngBattleLevelUp=predicted and predicted.levelUp or false
 if reason then
  v.rngContext=reason;v.analysisFailed=true;v.analysisPredictionError=reason
  v.predictionFailureReason=reason
 end
 if predicted then
  v.rngAvailable=allowed and conditionalLevel and predicted.levelUp
  v.rngContext=v.rngAvailable and "Dự đoán chỉ số nếu đủ EXP lên cấp" or "Trận này chưa đủ EXP để lên cấp"
  local other=predicted==battle.actor and battle.target or battle.actor
  v.rngNotice="EXP có điều kiện: nhân vật còn sống và gây sát thương."
  v.rngExpReceived="---"
  v.rngSeed=string.format("RNG  %04X  %04X  %04X",battle.seed[1],battle.seed[2],battle.seed[3]);v.rngRollCount=battle.rolls
  v.growthExpMatch=v.rngNotice
 end
 local keys={"Hp","Power","Skill","Spd","Def","Res","Luck"}
 local current={v.maxHp,v.str,v.skill,v.spd,v.def,v.res,v.luck}
 for i,key in ipairs(keys)do
  local cap=i==1 and ((v.deployment or 0)>=128 and (v.deployment or 0)<192 and 120 or 60) or i==7 and 30 or k.caps[i]
  v["growth"..key]=c.growth[i]+bonus;v["growth"..key.."Current"]=current[i];v["growth"..key.."Cap"]=cap
  local gain=v.rngAvailable and predicted.gains[i] or 0
  v["rng"..key.."Gain"]=gain
 end
 v.ui=v.ui or {};v.ui.set=v.ui.set or {}
 if v.forecastActive~=growthWasForecast then
  v.ui.set.growthPopup=false;v.ui.set.predictionPopup=false
 end
 if growthWasForecast and v.forecastActive and v.ui and v.ui.set then
  v.ui.set.mainTab=nil;v.ui.set.navUnits=nil;v.ui.set.navMap=nil
 elseif v.forecastActive and v.ui and v.ui.set then v.ui.set.navGrowth=false
 end
 growthWasForecast=v.forecastActive
 -- Do not force a tab switch. Units/Map navigation remains owned by its actions.
 if v~=base then for key,value in pairs(v)do if key:sub(1,6)=="growth" or key:sub(1,3)=="rng" then base[key]=value end end end
 return base
end

-- shared-growth-fields-v1
local sharedGrowthUpdate=update
function update()local v=sharedGrowthUpdate();v.growthLevelCap=20;v.growthCalculationNote="";return v end

-- Shared earned-support display for FE GBA profiles. Read-only RAM/ROM.
local function applyFeSupportBindings(v,u,cp,byId)
  for n=1,5 do
    local key="support"..n
    v[key.."Name"]="";v[key.."Portrait"]=""
    v[key.."Rank"]="---";v[key.."DisplayRank"]="---"
    v[key.."PortraitMissing"]=true
  end
  v.supportEmpty=true
  if not u or cp<0x08000000 or cp>=0x0a000000 then return end
  local support=mem.u32(cp+44)
  if support<0x08000000 or support>=0x0a000000 then return end
  local count=math.min(7,mem.u8(support+0x15))
  local visible=0
  -- All seven ROM records participate; the game allows at most five
  -- earned support levels, so compact earned partners into the five cards.
  for slot=0,count-1 do
    local points=mem.u8(u+0x32+slot)
    local rank=points>240 and "A" or points>160 and "B" or points>80 and "C" or nil
    local partner=rank and byId[mem.u8(support+slot)]or nil
    if partner and visible<5 then
      visible=visible+1;local key="support"..visible
      v[key.."Name"]=partner.name;v[key.."Portrait"]=partner.portrait or ""
      v[key.."Rank"]=rank;v[key.."DisplayRank"]=rank
      v[key.."PortraitMissing"]=(partner.portrait or "")==""
      v.supportEmpty=false
    end
  end
end

local fe7SupportById={}
for pointer,name in pairs(lookup12)do
  local cp=tonumber(pointer)
  if cp and cp>=0x08000000 and cp<0x0a000000 then
    fe7SupportById[mem.u8(cp+4)]={name=name,portrait=lookup3[tostring(cp)]or ""}
  end
end
local fe7SupportUpdate=update
function update()
  local v=fe7SupportUpdate()
  applyFeSupportBindings(v,v.unitPresent and growthSlots[v.deployment]or nil,tonumber(v.characterPointer)or 0,fe7SupportById)
  return v
end

-- Shared kit presentation. ROM adapters supply gains and computation progress.
-- No confidence percentage is fabricated from unrepresentative test samples.
local predictionPresentationUpdate=update
local predictionPresentationTick=0
local predictionWasForecast=false
function update()
  local v=predictionPresentationUpdate()
  predictionPresentationTick=predictionPresentationTick+1
  -- Enter Forecast once, then respect the user's Units/Map navigation.
  -- The inherited FE6/FE8 readers request Units every tick otherwise.
  local forecast=v.forecastActive==true
  if forecast and predictionWasForecast and v.ui and v.ui.set then
    v.ui.set.mainTab=nil;v.ui.set.navUnits=nil;v.ui.set.navMap=nil
  end
  predictionWasForecast=forecast
  -- Eligibility comes only from conditional EXP, never the simulated outcome.
  local exp=tonumber(v.analysisCurrentExp or v.exp)
  local hit,kill=tonumber(v.rngExpHit),tonumber(v.rngExpKill)
  local canLevel=exp and exp<100 and (tonumber(v.growthLevel)or 20)<20 and (tonumber(v.deployment)or 255)<64
  local damageEligible=v.predictionDamageEligible
  if damageEligible==nil then damageEligible=canLevel and hit and hit>0 and exp+hit>=100 or false end
  local killEligible=v.predictionKillEligible
  if killEligible==nil then killEligible=canLevel and kill and kill>0 and exp+kill>=100 or false end
  v.predictionDamageEligible=damageEligible;v.predictionKillEligible=killEligible
  local eligible=damageEligible or killEligible
  local failed=v.analysisFailed==true or v.analysisPredictionError~=nil
  v.predictionCondition=damageEligible and killEligible and "Nếu gây sát thương / hạ đối thủ và lên cấp" or damageEligible and "Nếu gây sát thương và lên cấp" or killEligible and "Nếu hạ đối thủ và lên cấp" or "Hai điều kiện chưa đủ EXP lên cấp"
  local available=v.predictionAvailable
  if available==nil then available=v.rngAvailable==true end
  available=available and eligible and not failed or false
  v.predictionAvailable=available
  local complete=v.predictionComplete
  if complete==nil then complete=v.rngBattleActive==true end
  complete=(complete or available)and not failed
  v.predictionComplete=complete==true
  v.predictionBusy=v.predictionBusy==true and not complete and not failed
  -- Result state is local to this calculation, not an accuracy percentage.
  v.predictionConfidence=failed and "Tình huống chưa hỗ trợ" or available and "Đã tính theo điều kiện" or v.predictionBusy and "Đang tính theo điều kiện" or complete and "Đã phân tích EXP theo điều kiện" or "Chờ dữ liệu giao chiến"
  v.predictionValidationNote="Mức kiểm chứng được ghi trong tài liệu của profile; trạng thái này không cam kết độ chính xác 100%."
  v.predictionContext=failed and (v.predictionFailureReason or "Không thể phân tích tình huống này") or hit and kill and v.predictionCondition or "Phân tích EXP theo điều kiện"
  v.predictionProgress=complete and 100 or (v.predictionBusy and math.max(0,math.min(99,math.floor(tonumber(v.predictionProgress)or 0)))or 0)
  v.predictionProgressText=complete and "Hoàn tất: 100%" or v.predictionBusy and ("Ước tính: "..v.predictionProgress.."%") or "Chưa có kết quả"
  for _,key in ipairs({"Hp","Power","Mag","Skill","Spd","Luck","Def","Res"})do
    local current=tonumber(v["growth"..key.."Current"])
    local gain=tonumber(v["rng"..key.."Gain"])or 0
    v["rng"..key.."Result"]=available and current and (tostring(current+gain)..(gain>0 and (" (+"..gain..")")or ""))or "---"
    v["rng"..key.."Flash"]=available and gain>0 and predictionPresentationTick%6<3 or false
  end
  return v
end
