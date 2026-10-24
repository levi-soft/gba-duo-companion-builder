local D=__ROM_DATA__
local modTalkSlots=D.modTalkSlots
local modTalkNames=D.modTalkNames
-- Matches this ROM's GetTalkee: pending chapter talk, with target on field.
local function modTalkTarget(unit)
  if not unit or mem.u32(unit)==0 then return 0 end
  local chapter=mem.u8(0x0202bcfe)
  if chapter==0x7f then return 0 end
  local eventId=mem.u8(0x088b0890+chapter*0x94+0x74)
  local group=mem.u32(0x091fd800+eventId*4)
  if group<0x08000000 or group>=0x0a000000 then return 0 end
  local events=mem.u32(group+4)
  if events<0x08000000 or events>=0x0a000000 then return 0 end
  local pid=mem.u8(mem.u32(unit)+4)
  local function flagSet(flag)
    if flag==0 or flag==100 then return false end
    local index=flag<100 and flag-1 or flag-101
    local base=flag<100 and 0x03005270 or 0x03005250
    return (mem.u8(base+math.floor(index/8)) & (1<<(index%8)))~=0
  end
  for n=0,255 do
    local p=events+n*16;local flag=mem.u8(p+2)
    if flag==0 then return 0 end
    if mem.u8(p+8)==pid and not flagSet(flag) then
      local target=mem.u8(p+9)
      for id,u in pairs(modTalkSlots) do
        if id<=0xbf and mem.u32(u)~=0 and (mem.u32(u+12)&0x1000c)==0 and mem.u8(mem.u32(u)+4)==target then return target end
      end
    end
  end
  return 0
end

local modSkillData=D.modSkillData
local function applyModSkills(v,unit)
  v.talkTargetId=modTalkTarget(unit);v.talkAvailable=v.talkTargetId~=0
  v.talkTargetName=modTalkNames[v.talkTargetId] or "---"
  v.talkPrompt=v.talkAvailable and ("Nói chuyện với "..v.talkTargetName..".") or "Hiện không có nhân vật để nói chuyện."
  v.powerLabel="Str"
  v.mag=unit and mem.u32(unit)~=0 and mem.u8(unit+0x3a) or "---"
  v.leadStars=0;v.leadershipStars={};v.leadershipVisible=false
  if unit and mem.u32(unit)~=0 then
    local pid=mem.u8(mem.u32(unit)+4)
    for n=0,255 do local p=0x09897810+n*2;local id=mem.u8(p);if id==0 then break end
      if id==pid then v.leadStars=mem.u8(p+1);break end
    end
    v.leadershipVisible=v.leadStars>0
    for n=1,v.leadStars do v.leadershipStars[n]={index=n,left=tostring((n-1)*14).."px"} end
  end
  local ids={}
  if unit and mem.u32(unit)~=0 and mem.u32(unit+4)~=0 then
    if mem.u32(0x02026bb0)==unit then
      for n=0,5 do local id=mem.u8(0x02026b90+n);if id==0 then break end;ids[#ids+1]=id end
    else
      local pid=mem.u8(mem.u32(unit)+4);local cid=mem.u8(mem.u32(unit+4)+4)
      local function add(id) if id~=0 and id~=255 then ids[#ids+1]=id end end
      add(mem.u8(0x08b2f7dc+pid));add(mem.u8(0x08b2f6dc+cid))
      if pid<=0x46 then for n=1,4 do add(mem.u8(0x0203e884+pid*16+n)) end end
    end
  end
  for n=1,6 do
    local id=ids[n] or 0;local s=modSkillData[id];local key="skill"..n
    v[key.."Id"]=id;v[key.."Present"]=s~=nil;v[key.."Missing"]=s==nil
    v[key.."Icon"]=s and s.icon or "";v[key.."Name"]=s and s.name or "---"
    v[key.."Description"]=s and s.description or ""
  end
end

local chars,classes,slots=D.chars,D.classes,D.slots
actions=actions or {};function actions.focusMapUnit(id) local n=tonumber(id);if n and slots[n] and input and input.focusUnit then input.focusUnit(n) end end
local mapCfg,mapMeta,mapSlots,mapWeapons={allyColor="#54d778",respectFog=true,enemyColor="#ef4456",showRanges=true,dangerColor="#b52b77",attackColor="#ed4357",chapter=33733886,playerColor="#438cff",respectAiHold=true,moveColor="#367ce8",cursorColor="#ffe173",turn=33733888},D.mapMeta,D.slots,D.mapWeapons
local fe8Chapters=D.fe8Chapters

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
  local weather=mem.u8(0x0202bd05);local costs=(focus.state & 0x800)~=0 and mapMeta.ballistaCosts or focus.k.movementCosts[(weather==1 or weather==2) and 3 or weather==4 and 2 or 1]
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
  local parts={tostring(v.mapWidth),":",tostring(v.mapHeight),":",tostring(mem.u8(mapCfg.chapter)),":",tostring(mem.u8(0x0202bd05)),tostring(mapCfg.respectFog),tostring(mapCfg.respectAiHold)}
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
  local focus=units[selectedId];v.mapRangeUnit=focus and focus.c.name or "";v.mapMoveCount=0;v.mapAttackCount=0
  for _,cell in ipairs(v.mapCells)do cell.move=false;cell.attack=false;cell.inRange=false;cell.picked=false;cell.danger=false;cell.dangerColor=mapCfg.dangerColor or "#b52b77";cell.rangeColor="transparent" end
  applyMapDanger(v,units,grid,terrain)
  if focus and picked and picked>0 and not selected and ui.mapPickedContext==v.mapPickContext and focus.x<w and focus.y<h then v.mapCells[focus.y*w+focus.x+1].picked=true end
  if not focus or mapCfg.showRanges==false or focus.x>=w or focus.y>=h or (focus.state & 0x20)~=0 then return end
  local dist,move,attacked=mapUnitReach(v,focus,grid,terrain)
  for index=0,w*h-1 do if dist[index] and dist[index]<=move then v.mapCells[index+1].move=true;v.mapMoveCount=v.mapMoveCount+1 end end
  for index in pairs(attacked)do if not v.mapCells[index+1].move then v.mapCells[index+1].attack=true;v.mapAttackCount=v.mapAttackCount+1 end end
  for _,cell in ipairs(v.mapCells)do cell.inRange=cell.move or cell.attack;cell.rangeColor=cell.move and (mapCfg.moveColor or "#367ce8") or cell.attack and (mapCfg.attackColor or "#ed4357") or "transparent" end
end
-- BE8P terrain indices, shared minimap chip arrangement verified in its ROM.
local function applyMapTile(x,y,tr,w,h)
  local function at(a,b) if a<0 or b<0 or a>=w or b>=h then return 0 end return mem.u8(mem.u32(tr+b*4)+a) end
  local t=at(x,y)
  local function connects(test)
    return (test(at(x,y+1)) and 8 or 0)+(test(at(x,y-1)) and 4 or 0)+(test(at(x+1,y)) and 2 or 0)+(test(at(x-1,y)) and 1 or 0)
  end
  if t==2 then return 0x40+connects(function(n)return n==t end) end
  if t==0x10 then return 0x60+connects(function(n)return n==0x10 or n==0x15 or n==0x36 or n==0x16 or n==0x13 end) end
  if t==0x15 or t==0x16 or t==0x2f or t==0x35 or t==0x36 or t==0x3c then
    return 0x30+connects(function(n)return n==t or n==0 or n==0x15 or n==0x36 or n==0x3d end)
  end
  if t==0x13 or t==0x34 then return (at(x-1,y)==t or at(x+1,y)==t) and 0x10 or 0x18 end
  local fixed={[1]=1,[3]=2,[4]=2,[5]=2,[6]=3,[7]=3,[8]=4,[10]=5,[11]=6,[12]=8,[13]=9,[14]=10,[15]=10,[17]=11,[18]=20,[23]=12,[24]=12,[29]=13,[30]=22,[31]=14,[32]=15,[33]=15,[35]=2,[37]=26,[38]=0x58,[39]=19,[40]=19,[41]=19,[42]=0x3a,[45]=17,[49]=25,[51]=8,[55]=6,[56]=2,[58]=0x58,[59]=27,[62]=12}
  if fixed[t] then return fixed[t] end
  if t==0 then return 0 end
  return 0x20+connects(function(n)return n==t end)
end
local function applyMap(v,selected)
  local w,h=mem.u16(0x0202e4d4),mem.u16(0x0202e4d6)
  local tr,ur=mem.u32(0x0202e4dc),mem.u32(0x0202e4d8)
  v.mapPresent=false;v.mapCells={};v.mapRoster={};v.mapPlayerCount=0;v.mapEnemyCount=0;v.mapAllyCount=0
  if w<1 or h<1 or w>64 or h>64 or tr<0x02000000 or ur<0x02000000 then return end
  local cx,cy=mem.u16(0x0202bcc4),mem.u16(0x0202bcc6)
  v.mapWidth=w;v.mapHeight=h;v.mapPresent=true;v.mapAspect=w/h
  v.mapColumns="repeat("..w..",1fr)";v.mapRows="repeat("..h..",1fr)"
  local chapter=mem.u8(mapCfg.chapter);local chapterInfo=fe8Chapters[chapter+1]
  v.mapChapter=(chapter==0 and "Prologue: " or "Ch. "..chapter..": ")..(chapterInfo and chapterInfo.name or "---")
  v.mapVictory=chapterInfo and chapterInfo.victory or "---";v.mapTurn=mem.u16(mapCfg.turn)
  v.mapPlayerColor=mapCfg.playerColor;v.mapEnemyColor=mapCfg.enemyColor;v.mapAllyColor=mapCfg.allyColor
  for y=0,h-1 do for x=0,w-1 do
    local id=mem.u8(mem.u32(ur+y*4)+x)
    local color=id==0 and "transparent" or id<64 and mapCfg.playerColor or id<128 and mapCfg.allyColor or mapCfg.enemyColor
    v.mapCells[#v.mapCells+1]={tile="asset:images/minimap/"..applyMapTile(x,y,tr,w,h)..".png",marker=id~=0,color=color,cursor=x==cx and y==cy,cursorColor=mapCfg.cursorColor}
  end end
  applyMapTactical(v,tr,ur,cx,cy,selected)
  for id,u in pairs(mapSlots)do if mem.u32(u)~=0 and mem.u32(u+4)~=0 and mem.u8(u+19)>0 and (mem.u32(u+12)&0x1000c)==0 then
    local key=id<64 and "mapPlayerCount" or id<128 and "mapAllyCount" or "mapEnemyCount";v[key]=v[key]+1
  end end
end

-- Generated from manifest.studioComputed; shared with Studio live preview.
local studioPulseTick = 0
local lastUiIdentity = nil
local function truth(x) return x~=nil and x~=false and x~=0 and x~="" end
local function choose(c,a,b) if truth(c) then return a else return b end end
local function all(...) for i=1,select("#",...) do if not truth(select(i,...)) then return false end end return true end
local function any(...) for i=1,select("#",...) do if truth(select(i,...)) then return true end end return false end
local function first(...) for i=1,select("#",...) do local x=select(i,...) if x ~= nil and x ~= "" then return x end end return "" end
local function emptyUnitValues()
  local v = {["\104\112"]="\045\045\045",["\109\097\120\072\112"]="\045\045\045",["\108\101\118\101\108"]="\045\045\045",["\101\120\112"]=0,["\115\116\114"]="\045\045\045",["\115\107\105\108\108"]="\045\045\045",["\115\112\100"]="\045\045\045",["\100\101\102"]="\045\045\045",["\114\101\115"]="\045\045\045",["\108\117\099\107"]="\045\045\045",["\099\104\097\114\097\099\116\101\114\080\111\105\110\116\101\114"]=0,["\099\108\097\115\115\080\111\105\110\116\101\114"]=0,["\099\111\110\066\111\110\117\115"]=0,["\109\111\118\066\111\110\117\115"]=0,["\114\101\115\099\117\101\073\100"]=0,["\115\116\097\116\117\115\066\121\116\101"]=0,["\099\108\097\115\115\078\097\109\101"]="\045\045\045",["\097\102\102\105\110\105\116\121"]="",["\112\111\114\116\114\097\105\116"]="",["\109\097\112\083\112\114\105\116\101"]="",["\109\111\118\101"]="\045\045\045",["\099\111\110"]="\045\045\045",["\097\105\100"]="\045\045\045",["\116\114\097\118\101\108\101\114"]="\045\045\045",["\099\111\110\100\105\116\105\111\110"]="\045\045\045",["\099\111\110\100\105\116\105\111\110\084\117\114\110\115"]=0,["\117\110\105\116\083\116\097\116\101"]=0,["\117\110\105\116\088"]=0,["\117\110\105\116\089"]=0,["\114\097\110\107\083\119\111\114\100\082\097\119"]=0,["\114\097\110\107\076\097\110\099\101\082\097\119"]=0,["\114\097\110\107\065\120\101\082\097\119"]=0,["\114\097\110\107\066\111\119\082\097\119"]=0,["\114\097\110\107\083\116\097\102\102\082\097\119"]=0,["\114\097\110\107\065\110\105\109\097\082\097\119"]=0,["\114\097\110\107\076\105\103\104\116\082\097\119"]=0,["\114\097\110\107\068\097\114\107\082\097\119"]=0,["\115\117\112\112\111\114\116\049\069\120\112"]=0,["\115\117\112\112\111\114\116\050\069\120\112"]=0,["\115\117\112\112\111\114\116\051\069\120\112"]=0,["\115\117\112\112\111\114\116\052\069\120\112"]=0,["\115\117\112\112\111\114\116\053\069\120\112"]=0,["\105\116\101\109\049"]=0,["\105\116\101\109\050"]=0,["\105\116\101\109\051"]=0,["\105\116\101\109\052"]=0,["\105\116\101\109\053"]=0,["\101\113\117\105\112\109\101\110\116\065\116\107"]="\045\045\045",["\101\113\117\105\112\109\101\110\116\072\105\116"]="\045\045\045",["\101\113\117\105\112\109\101\110\116\067\114\105\116"]="\045\045\045",["\101\113\117\105\112\109\101\110\116\065\118\111\105\100"]="\045\045\045",["\101\113\117\105\112\109\101\110\116\065\083"]="\045\045\045",["\101\113\117\105\112\109\101\110\116\082\097\110\103\101"]="\045\045\045",["\101\113\117\105\112\109\101\110\116\083\108\111\116"]=0,["\101\113\117\105\112\109\101\110\116\087\101\097\112\111\110"]=0,["\101\113\117\105\112\109\101\110\116\077\097\116\099\104\101\115"]=false,["\100\101\112\108\111\121\109\101\110\116"]=0,["\117\110\105\116\078\097\109\101"]="\045\045\045",["\101\120\112\068\105\115\112\108\097\121"]="",["\114\097\110\107\083\119\111\114\100"]="\045\045\045",["\114\097\110\107\083\119\111\114\100\080\114\111\103\114\101\115\115"]=0,["\114\097\110\107\083\119\111\114\100\080\114\111\103\114\101\115\115\077\097\120"]=1,["\114\097\110\107\076\097\110\099\101"]="\045\045\045",["\114\097\110\107\076\097\110\099\101\080\114\111\103\114\101\115\115"]=0,["\114\097\110\107\076\097\110\099\101\080\114\111\103\114\101\115\115\077\097\120"]=1,["\114\097\110\107\065\120\101"]="\045\045\045",["\114\097\110\107\065\120\101\080\114\111\103\114\101\115\115"]=0,["\114\097\110\107\065\120\101\080\114\111\103\114\101\115\115\077\097\120"]=1,["\114\097\110\107\066\111\119"]="\045\045\045",["\114\097\110\107\066\111\119\080\114\111\103\114\101\115\115"]=0,["\114\097\110\107\066\111\119\080\114\111\103\114\101\115\115\077\097\120"]=1,["\114\097\110\107\083\116\097\102\102"]="\045\045\045",["\114\097\110\107\083\116\097\102\102\080\114\111\103\114\101\115\115"]=0,["\114\097\110\107\083\116\097\102\102\080\114\111\103\114\101\115\115\077\097\120"]=1,["\114\097\110\107\065\110\105\109\097"]="\045\045\045",["\114\097\110\107\065\110\105\109\097\080\114\111\103\114\101\115\115"]=0,["\114\097\110\107\065\110\105\109\097\080\114\111\103\114\101\115\115\077\097\120"]=1,["\114\097\110\107\076\105\103\104\116"]="\045\045\045",["\114\097\110\107\076\105\103\104\116\080\114\111\103\114\101\115\115"]=0,["\114\097\110\107\076\105\103\104\116\080\114\111\103\114\101\115\115\077\097\120"]=1,["\114\097\110\107\068\097\114\107"]="\045\045\045",["\114\097\110\107\068\097\114\107\080\114\111\103\114\101\115\115"]=0,["\114\097\110\107\068\097\114\107\080\114\111\103\114\101\115\115\077\097\120"]=1,["\112\111\119\101\114\076\097\098\101\108"]="\083\116\114",["\115\117\112\112\111\114\116\049\078\097\109\101"]="",["\115\117\112\112\111\114\116\049\080\111\114\116\114\097\105\116"]="",["\115\117\112\112\111\114\116\049\082\097\110\107"]="\045\045\045",["\115\117\112\112\111\114\116\050\078\097\109\101"]="",["\115\117\112\112\111\114\116\050\080\111\114\116\114\097\105\116"]="",["\115\117\112\112\111\114\116\050\082\097\110\107"]="\045\045\045",["\115\117\112\112\111\114\116\051\078\097\109\101"]="",["\115\117\112\112\111\114\116\051\080\111\114\116\114\097\105\116"]="",["\115\117\112\112\111\114\116\051\082\097\110\107"]="\045\045\045",["\115\117\112\112\111\114\116\052\078\097\109\101"]="",["\115\117\112\112\111\114\116\052\080\111\114\116\114\097\105\116"]="",["\115\117\112\112\111\114\116\052\082\097\110\107"]="\045\045\045",["\115\117\112\112\111\114\116\053\078\097\109\101"]="",["\115\117\112\112\111\114\116\053\080\111\114\116\114\097\105\116"]="",["\115\117\112\112\111\114\116\053\082\097\110\107"]="\045\045\045",["\105\116\101\109\049\073\100"]=0,["\105\116\101\109\049\078\097\109\101"]="",["\105\116\101\109\049\073\099\111\110"]="",["\105\116\101\109\049\085\115\101\115"]=0,["\105\116\101\109\049\077\097\120\085\115\101\115"]=0,["\105\116\101\109\049\085\110\098\114\101\097\107\097\098\108\101"]=false,["\105\116\101\109\049\085\115\101\115\068\105\115\112\108\097\121"]=0,["\105\116\101\109\049\077\097\120\068\105\115\112\108\097\121"]=0,["\105\116\101\109\050\073\100"]=0,["\105\116\101\109\050\078\097\109\101"]="",["\105\116\101\109\050\073\099\111\110"]="",["\105\116\101\109\050\085\115\101\115"]=0,["\105\116\101\109\050\077\097\120\085\115\101\115"]=0,["\105\116\101\109\050\085\110\098\114\101\097\107\097\098\108\101"]=false,["\105\116\101\109\050\085\115\101\115\068\105\115\112\108\097\121"]=0,["\105\116\101\109\050\077\097\120\068\105\115\112\108\097\121"]=0,["\105\116\101\109\051\073\100"]=0,["\105\116\101\109\051\078\097\109\101"]="",["\105\116\101\109\051\073\099\111\110"]="",["\105\116\101\109\051\085\115\101\115"]=0,["\105\116\101\109\051\077\097\120\085\115\101\115"]=0,["\105\116\101\109\051\085\110\098\114\101\097\107\097\098\108\101"]=false,["\105\116\101\109\051\085\115\101\115\068\105\115\112\108\097\121"]=0,["\105\116\101\109\051\077\097\120\068\105\115\112\108\097\121"]=0,["\105\116\101\109\052\073\100"]=0,["\105\116\101\109\052\078\097\109\101"]="",["\105\116\101\109\052\073\099\111\110"]="",["\105\116\101\109\052\085\115\101\115"]=0,["\105\116\101\109\052\077\097\120\085\115\101\115"]=0,["\105\116\101\109\052\085\110\098\114\101\097\107\097\098\108\101"]=false,["\105\116\101\109\052\085\115\101\115\068\105\115\112\108\097\121"]=0,["\105\116\101\109\052\077\097\120\068\105\115\112\108\097\121"]=0,["\105\116\101\109\053\073\100"]=0,["\105\116\101\109\053\078\097\109\101"]="",["\105\116\101\109\053\073\099\111\110"]="",["\105\116\101\109\053\085\115\101\115"]=0,["\105\116\101\109\053\077\097\120\085\115\101\115"]=0,["\105\116\101\109\053\085\110\098\114\101\097\107\097\098\108\101"]=false,["\105\116\101\109\053\085\115\101\115\068\105\115\112\108\097\121"]=0,["\105\116\101\109\053\077\097\120\068\105\115\112\108\097\121"]=0,["\102\105\114\115\116\073\116\101\109\083\108\111\116"]=0,["\108\097\115\116\073\116\101\109\083\108\111\116"]=0,["\117\110\105\116\068\114\111\112\115\073\116\101\109"]=false,["\105\116\101\109\049\068\114\111\112\112\097\098\108\101"]=false,["\105\116\101\109\050\068\114\111\112\112\097\098\108\101"]=false,["\105\116\101\109\051\068\114\111\112\112\097\098\108\101"]=false,["\105\116\101\109\052\068\114\111\112\112\097\098\108\101"]=false,["\105\116\101\109\053\068\114\111\112\112\097\098\108\101"]=false,["\102\105\114\115\116\073\116\101\109\080\097\103\101"]="\110\111\110\101",["\105\116\101\109\049\068\101\115\099\114\105\112\116\105\111\110"]="",["\105\116\101\109\049\077\105\103\104\116"]=0,["\105\116\101\109\049\072\105\116"]=0,["\105\116\101\109\049\067\114\105\116"]=0,["\105\116\101\109\049\087\101\105\103\104\116"]=0,["\105\116\101\109\049\084\121\112\101"]="",["\105\116\101\109\049\082\097\110\107"]="",["\105\116\101\109\049\082\097\110\103\101"]="",["\105\116\101\109\049\073\115\087\101\097\112\111\110"]=false,["\105\116\101\109\049\072\097\115\082\097\110\107"]=false,["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\049"]=false,["\105\116\101\109\050\068\101\115\099\114\105\112\116\105\111\110"]="",["\105\116\101\109\050\077\105\103\104\116"]=0,["\105\116\101\109\050\072\105\116"]=0,["\105\116\101\109\050\067\114\105\116"]=0,["\105\116\101\109\050\087\101\105\103\104\116"]=0,["\105\116\101\109\050\084\121\112\101"]="",["\105\116\101\109\050\082\097\110\107"]="",["\105\116\101\109\050\082\097\110\103\101"]="",["\105\116\101\109\050\073\115\087\101\097\112\111\110"]=false,["\105\116\101\109\050\072\097\115\082\097\110\107"]=false,["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\050"]=false,["\105\116\101\109\051\068\101\115\099\114\105\112\116\105\111\110"]="",["\105\116\101\109\051\077\105\103\104\116"]=0,["\105\116\101\109\051\072\105\116"]=0,["\105\116\101\109\051\067\114\105\116"]=0,["\105\116\101\109\051\087\101\105\103\104\116"]=0,["\105\116\101\109\051\084\121\112\101"]="",["\105\116\101\109\051\082\097\110\107"]="",["\105\116\101\109\051\082\097\110\103\101"]="",["\105\116\101\109\051\073\115\087\101\097\112\111\110"]=false,["\105\116\101\109\051\072\097\115\082\097\110\107"]=false,["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\051"]=false,["\105\116\101\109\052\068\101\115\099\114\105\112\116\105\111\110"]="",["\105\116\101\109\052\077\105\103\104\116"]=0,["\105\116\101\109\052\072\105\116"]=0,["\105\116\101\109\052\067\114\105\116"]=0,["\105\116\101\109\052\087\101\105\103\104\116"]=0,["\105\116\101\109\052\084\121\112\101"]="",["\105\116\101\109\052\082\097\110\107"]="",["\105\116\101\109\052\082\097\110\103\101"]="",["\105\116\101\109\052\073\115\087\101\097\112\111\110"]=false,["\105\116\101\109\052\072\097\115\082\097\110\107"]=false,["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\052"]=false,["\105\116\101\109\053\068\101\115\099\114\105\112\116\105\111\110"]="",["\105\116\101\109\053\077\105\103\104\116"]=0,["\105\116\101\109\053\072\105\116"]=0,["\105\116\101\109\053\067\114\105\116"]=0,["\105\116\101\109\053\087\101\105\103\104\116"]=0,["\105\116\101\109\053\084\121\112\101"]="",["\105\116\101\109\053\082\097\110\107"]="",["\105\116\101\109\053\082\097\110\103\101"]="",["\105\116\101\109\053\073\115\087\101\097\112\111\110"]=false,["\105\116\101\109\053\072\097\115\082\097\110\107"]=false,["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\053"]=false,["\097\102\102\105\110\105\116\121\080\111\119"]=0,["\097\102\102\105\110\105\116\121\068\101\102"]=0,["\097\102\102\105\110\105\116\121\072\105\116"]=0,["\097\102\102\105\110\105\116\121\065\118\111"]=0,["\097\102\102\105\110\105\116\121\067\114\105\116"]=0,["\097\102\102\105\110\105\116\121\067\114\105\116\065\118\111"]=0,["\105\116\101\109\049\073\115\078\111\110\087\101\097\112\111\110"]=false,["\105\116\101\109\050\073\115\078\111\110\087\101\097\112\111\110"]=false,["\105\116\101\109\051\073\115\078\111\110\087\101\097\112\111\110"]=false,["\105\116\101\109\052\073\115\078\111\110\087\101\097\112\111\110"]=false,["\105\116\101\109\053\073\115\078\111\110\087\101\097\112\111\110"]=false,["\115\117\112\112\111\114\116\049\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"]=true,["\115\117\112\112\111\114\116\049\068\105\115\112\108\097\121\082\097\110\107"]="\045\045\045",["\115\117\112\112\111\114\116\050\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"]=true,["\115\117\112\112\111\114\116\050\068\105\115\112\108\097\121\082\097\110\107"]="\045\045\045",["\115\117\112\112\111\114\116\051\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"]=true,["\115\117\112\112\111\114\116\051\068\105\115\112\108\097\121\082\097\110\107"]="\045\045\045",["\115\117\112\112\111\114\116\052\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"]=true,["\115\117\112\112\111\114\116\052\068\105\115\112\108\097\121\082\097\110\107"]="\045\045\045",["\115\117\112\112\111\114\116\053\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"]=true,["\115\117\112\112\111\114\116\053\068\105\115\112\108\097\121\082\097\110\107"]="\045\045\045",["\101\120\112\067\111\109\112\097\099\116"]="\045\045\045",["\108\101\118\101\108\080\114\111\103\114\101\115\115"]=0,["\112\111\114\116\114\097\105\116\077\105\115\115\105\110\103"]=true,["\112\111\114\116\114\097\105\116\065\115\112\101\099\116\082\097\116\105\111"]=1.2,["\104\101\097\100\101\114\065\115\112\101\099\116\082\097\116\105\111"]=4.137931034482759,["\116\114\097\118\101\108\101\114\080\114\101\115\101\110\116"]=false,["\099\111\110\100\105\116\105\111\110\065\099\116\105\118\101"]=false,["\097\102\102\105\110\105\116\121\073\099\111\110"]="",["\097\102\102\105\110\105\116\121\077\105\115\115\105\110\103"]=true,["\115\117\112\112\111\114\116\069\109\112\116\121"]=false,["\117\110\105\116\080\114\101\115\101\110\116"]=false,["\117\110\105\116\065\098\115\101\110\116"]=true,["\117\110\105\116\076\111\099\107\101\100"]=false,["\102\111\114\101\099\097\115\116\065\099\116\105\118\101"]=false,["\102\111\114\101\099\097\115\116\097\099\116\111\114\078\097\109\101"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\067\108\097\115\115"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\072\112"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\077\097\120\072\112"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\068\097\109\097\103\101"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\072\105\116"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\067\114\105\116"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\065\083"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\087\101\097\112\111\110"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\080\111\114\116\114\097\105\116"]="",["\102\111\114\101\099\097\115\116\097\099\116\111\114\073\099\111\110"]="",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\078\097\109\101"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\067\108\097\115\115"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\072\112"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\077\097\120\072\112"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\068\097\109\097\103\101"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\072\105\116"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\067\114\105\116"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\065\083"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\087\101\097\112\111\110"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\080\111\114\116\114\097\105\116"]="",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\073\099\111\110"]="",["\102\111\114\101\099\097\115\116\097\099\116\111\114\076\101\118\101\108"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\065\102\116\101\114\072\112"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\085\115\101\115"]="\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\077\116"]="\045\045\045",["\102\111\114\101\099\097\115\116\097\099\116\111\114\077\117\108\116\105\112\108\105\101\114"]="",["\102\111\114\101\099\097\115\116\097\099\116\111\114\084\114\105\097\110\103\108\101"]="",["\102\111\114\101\099\097\115\116\097\099\116\111\114\065\100\118\097\110\116\097\103\101"]=false,["\102\111\114\101\099\097\115\116\097\099\116\111\114\068\105\115\097\100\118\097\110\116\097\103\101"]=false,["\102\111\114\101\099\097\115\116\097\099\116\111\114\072\097\115\077\117\108\116\105"]=false,["\102\111\114\101\099\097\115\116\097\099\116\111\114\072\097\115\076\111\115\115"]=false,["\102\111\114\101\099\097\115\116\097\099\116\111\114\072\112\076\111\115\115"]=0,["\102\111\114\101\099\097\115\116\097\099\116\111\114\072\112\082\101\109\097\105\110\087\105\100\116\104"]="\048\037",["\102\111\114\101\099\097\115\116\097\099\116\111\114\072\112\076\111\115\115\087\105\100\116\104"]="\048\037",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\076\101\118\101\108"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\065\102\116\101\114\072\112"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\085\115\101\115"]="\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\077\116"]="\045\045\045",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\077\117\108\116\105\112\108\105\101\114"]="",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\084\114\105\097\110\103\108\101"]="",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\065\100\118\097\110\116\097\103\101"]=false,["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\068\105\115\097\100\118\097\110\116\097\103\101"]=false,["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\072\097\115\077\117\108\116\105"]=false,["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\072\097\115\076\111\115\115"]=false,["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\072\112\076\111\115\115"]=0,["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\072\112\082\101\109\097\105\110\087\105\100\116\104"]="\048\037",["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\072\112\076\111\115\115\087\105\100\116\104"]="\048\037",["\102\111\114\101\099\097\115\116\097\099\116\111\114\077\117\108\116\105\070\108\097\115\104"]=false,["\102\111\114\101\099\097\115\116\097\099\116\111\114\072\112\070\108\097\115\104"]=false,["\102\111\114\101\099\097\115\116\097\099\116\111\114\084\114\105\097\110\103\108\101\070\108\097\115\104"]=false,["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\077\117\108\116\105\070\108\097\115\104"]=false,["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\072\112\070\108\097\115\104"]=false,["\102\111\114\101\099\097\115\116\116\097\114\103\101\116\084\114\105\097\110\103\108\101\070\108\097\115\104"]=false}
  local identity = table.concat({tostring(v["characterPointer"]),tostring(v["deployment"]),tostring(v["item1Id"]),tostring(v["item2Id"]),tostring(v["item3Id"]),tostring(v["item4Id"]),tostring(v["item5Id"])}, "|")
  if identity ~= lastUiIdentity then
    v.ui = {set={["inventoryDetail"]=v["firstItemPage"],["itemSelected1"]=v["firstItemSelected1"],["itemSelected2"]=v["firstItemSelected2"],["itemSelected3"]=v["firstItemSelected3"],["itemSelected4"]=v["firstItemSelected4"],["itemSelected5"]=v["firstItemSelected5"]}}
    lastUiIdentity = identity
  end
  applyMap(v,nil);v.ui=v.ui or {};v.ui.set=v.ui.set or {};v.ui.set.companionView="companion"
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
  applyModSkills(v,nil)
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
function update()
  local v = {}
  local unit = nil

  local playerPc,forecastProc,aiPc=0,0,0
  for n=0,63 do local q=0x02024E68+n*108;local s=mem.u32(q);if s==0x0859AAD8 then playerPc=mem.u32(q+4) elseif s==0x0859E520 then forecastProc=q elseif s==0x085A8024 then aiPc=mem.u32(q+4) end end
  local active=mem.u32(0x03004E50)
  v.unitLocked=false;v.forecastActive=false
  local phase=mem.u8(0x0202BCFF)
  local playerOwns=playerPc>=0x0859AB60 and playerPc<=0x0859AC00 and phase==0
  local aiOwns=aiPc>=0x085A802C and aiPc<=0x085A808C and (phase==0x80 or phase==0x40)
  if playerOwns or aiOwns then
    local id=active>=0x02000000 and active<0x02040000 and mem.u8(active+11) or 0
    if slots[id]==active and (id & 0xc0)==phase and chars[mem.u32(active)] and classes[mem.u32(active+4)] and (mem.u32(active+12) & 0x1000c)==0 then unit=active;v.unitLocked=true;v.forecastActive=playerOwns and forecastProc~=0 end
  end

  if not unit then
  local cursorX, cursorY = mem.u16(33733828), mem.u16(33733830)
  local width, height = mem.u16(33744084), mem.u16(33744086)
  if width == 0 or height == 0 or width > 512 or height > 512 or cursorX >= width or cursorY >= height then return emptyUnitValues() end
  local rows = mem.u32(33744088)
  if rows < 0x02000000 or rows + height*4 > 0x02040000 then return emptyUnitValues() end
  local row = mem.u32(rows + cursorY*4)
  if row < 0x02000000 or row + width > 0x02040000 then return emptyUnitValues() end
  unit = slots[mem.u8(row+cursorX)]
  if not unit then return emptyUnitValues() end
  end
  v.unitPresent, v.unitAbsent = true, false
  v["\104\112"] = mem.u8((unit + 19))
  v["\109\097\120\072\112"] = mem.u8((unit + 18))
  v["\108\101\118\101\108"] = mem.u8((unit + 8))
  v["\101\120\112"] = mem.u8((unit + 9))
  v["\115\116\114"] = mem.u8((unit + 20))
  v["\115\107\105\108\108"] = mem.u8((unit + 21))
  v["\115\112\100"] = mem.u8((unit + 22))
  v["\100\101\102"] = mem.u8((unit + 23))
  v["\114\101\115"] = mem.u8((unit + 24))
  v["\108\117\099\107"] = mem.u8((unit + 25))
  v["\099\104\097\114\097\099\116\101\114\080\111\105\110\116\101\114"] = mem.u32((unit + 0))
  v["\099\108\097\115\115\080\111\105\110\116\101\114"] = mem.u32((unit + 4))
  v["\099\111\110\066\111\110\117\115"] = mem.s8((unit + 26))
  v["\109\111\118\066\111\110\117\115"] = mem.s8((unit + 29))
  v["\114\101\115\099\117\101\073\100"] = mem.u8((unit + 27))
  v["\115\116\097\116\117\115\066\121\116\101"] = mem.u8((unit + 48))
  v["\100\101\112\108\111\121\109\101\110\116"] = mem.u8((unit + 11))
  v["\117\110\105\116\083\116\097\116\101"] = mem.u32((unit + 12))
  v["\117\110\105\116\088"] = mem.u8((unit + 16))
  v["\117\110\105\116\089"] = mem.u8((unit + 17))
  v["\114\097\110\107\083\119\111\114\100\082\097\119"] = mem.u8((unit + 40))
  v["\114\097\110\107\076\097\110\099\101\082\097\119"] = mem.u8((unit + 41))
  v["\114\097\110\107\065\120\101\082\097\119"] = mem.u8((unit + 42))
  v["\114\097\110\107\066\111\119\082\097\119"] = mem.u8((unit + 43))
  v["\114\097\110\107\083\116\097\102\102\082\097\119"] = mem.u8((unit + 44))
  v["\114\097\110\107\065\110\105\109\097\082\097\119"] = mem.u8((unit + 45))
  v["\114\097\110\107\076\105\103\104\116\082\097\119"] = mem.u8((unit + 46))
  v["\114\097\110\107\068\097\114\107\082\097\119"] = mem.u8((unit + 47))
  v["\115\117\112\112\111\114\116\049\069\120\112"] = mem.u8((unit + 50))
  v["\115\117\112\112\111\114\116\050\069\120\112"] = mem.u8((unit + 51))
  v["\115\117\112\112\111\114\116\051\069\120\112"] = mem.u8((unit + 52))
  v["\115\117\112\112\111\114\116\052\069\120\112"] = mem.u8((unit + 53))
  v["\115\117\112\112\111\114\116\053\069\120\112"] = mem.u8((unit + 54))
  v["\105\116\101\109\049"] = mem.u16((unit + 30))
  v["\105\116\101\109\050"] = mem.u16((unit + 32))
  v["\105\116\101\109\051"] = mem.u16((unit + 34))
  v["\105\116\101\109\052"] = mem.u16((unit + 36))
  v["\105\116\101\109\053"] = mem.u16((unit + 38))
  v["\099\108\097\115\115\078\097\109\101"] = lookup1[tostring(v["\099\108\097\115\115\080\111\105\110\116\101\114"])]
  if v["\099\108\097\115\115\078\097\109\101"] == nil then return {} end
  v["\097\102\102\105\110\105\116\121"] = lookup2[tostring(v["\099\104\097\114\097\099\116\101\114\080\111\105\110\116\101\114"])]
  if v["\097\102\102\105\110\105\116\121"] == nil then return {} end
  v["\112\111\114\116\114\097\105\116"] = first(lookup3[tostring(v["\099\104\097\114\097\099\116\101\114\080\111\105\110\116\101\114"])],lookup4[tostring(v["\099\108\097\115\115\080\111\105\110\116\101\114"])])
  if v["\112\111\114\116\114\097\105\116"] == nil then return {} end
  v["\109\097\112\083\112\114\105\116\101"] = ""
  if v["\109\097\112\083\112\114\105\116\101"] == nil then return {} end
  v["\109\111\118\101"] = (lookup5[tostring(v["\099\108\097\115\115\080\111\105\110\116\101\114"])] + v["\109\111\118\066\111\110\117\115"])
  if v["\109\111\118\101"] == nil then return {} end
  v["\099\111\110"] = (lookup6[tostring(v["\099\108\097\115\115\080\111\105\110\116\101\114"])] + lookup7[tostring(v["\099\104\097\114\097\099\116\101\114\080\111\105\110\116\101\114"])] + v["\099\111\110\066\111\110\117\115"])
  if v["\099\111\110"] == nil then return {} end
  v["\097\105\100"] = 0
  if v["\097\105\100"] == nil then return {} end
  v["\116\114\097\118\101\108\101\114"] = "\045\045\045"
  if v["\116\114\097\118\101\108\101\114"] == nil then return {} end
  v["\099\111\110\100\105\116\105\111\110"] = lookup8[tostring((v["\115\116\097\116\117\115\066\121\116\101"] % 16))]
  if v["\099\111\110\100\105\116\105\111\110"] == nil then return {} end
  v["\099\111\110\100\105\116\105\111\110\084\117\114\110\115"] = math.floor(v["\115\116\097\116\117\115\066\121\116\101"] / 16)
  if v["\099\111\110\100\105\116\105\111\110\084\117\114\110\115"] == nil then return {} end
  v["\117\110\105\116\078\097\109\101"] = lookup9[tostring(v["\099\104\097\114\097\099\116\101\114\080\111\105\110\116\101\114"])]
  if v["\117\110\105\116\078\097\109\101"] == nil then return {} end
  v["\101\120\112\068\105\115\112\108\097\121"] = lookup10[tostring(v["\101\120\112"])]
  if v["\101\120\112\068\105\115\112\108\097\121"] == nil then return {} end
  v["\114\097\110\107\083\119\111\114\100"] = choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 251),"\083",choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 181),"\065",choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 121),"\066",choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 71),"\067",choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 31),"\068",choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 1),"\069","\045\045\045"))))))
  if v["\114\097\110\107\083\119\111\114\100"] == nil then return {} end
  v["\114\097\110\107\083\119\111\114\100\080\114\111\103\114\101\115\115"] = choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 251),1,choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 181),(v["\114\097\110\107\083\119\111\114\100\082\097\119"] - 181),choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 121),(v["\114\097\110\107\083\119\111\114\100\082\097\119"] - 121),choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 71),(v["\114\097\110\107\083\119\111\114\100\082\097\119"] - 71),choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 31),(v["\114\097\110\107\083\119\111\114\100\082\097\119"] - 31),choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 1),(v["\114\097\110\107\083\119\111\114\100\082\097\119"] - 1),0))))))
  if v["\114\097\110\107\083\119\111\114\100\080\114\111\103\114\101\115\115"] == nil then return {} end
  v["\114\097\110\107\083\119\111\114\100\080\114\111\103\114\101\115\115\077\097\120"] = choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 251),1,choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 181),70,choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 121),60,choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 71),50,choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 31),40,choose((v["\114\097\110\107\083\119\111\114\100\082\097\119"] >= 1),30,1))))))
  if v["\114\097\110\107\083\119\111\114\100\080\114\111\103\114\101\115\115\077\097\120"] == nil then return {} end
  v["\114\097\110\107\076\097\110\099\101"] = choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 251),"\083",choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 181),"\065",choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 121),"\066",choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 71),"\067",choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 31),"\068",choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 1),"\069","\045\045\045"))))))
  if v["\114\097\110\107\076\097\110\099\101"] == nil then return {} end
  v["\114\097\110\107\076\097\110\099\101\080\114\111\103\114\101\115\115"] = choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 251),1,choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 181),(v["\114\097\110\107\076\097\110\099\101\082\097\119"] - 181),choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 121),(v["\114\097\110\107\076\097\110\099\101\082\097\119"] - 121),choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 71),(v["\114\097\110\107\076\097\110\099\101\082\097\119"] - 71),choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 31),(v["\114\097\110\107\076\097\110\099\101\082\097\119"] - 31),choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 1),(v["\114\097\110\107\076\097\110\099\101\082\097\119"] - 1),0))))))
  if v["\114\097\110\107\076\097\110\099\101\080\114\111\103\114\101\115\115"] == nil then return {} end
  v["\114\097\110\107\076\097\110\099\101\080\114\111\103\114\101\115\115\077\097\120"] = choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 251),1,choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 181),70,choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 121),60,choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 71),50,choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 31),40,choose((v["\114\097\110\107\076\097\110\099\101\082\097\119"] >= 1),30,1))))))
  if v["\114\097\110\107\076\097\110\099\101\080\114\111\103\114\101\115\115\077\097\120"] == nil then return {} end
  v["\114\097\110\107\065\120\101"] = choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 251),"\083",choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 181),"\065",choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 121),"\066",choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 71),"\067",choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 31),"\068",choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 1),"\069","\045\045\045"))))))
  if v["\114\097\110\107\065\120\101"] == nil then return {} end
  v["\114\097\110\107\065\120\101\080\114\111\103\114\101\115\115"] = choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 251),1,choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 181),(v["\114\097\110\107\065\120\101\082\097\119"] - 181),choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 121),(v["\114\097\110\107\065\120\101\082\097\119"] - 121),choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 71),(v["\114\097\110\107\065\120\101\082\097\119"] - 71),choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 31),(v["\114\097\110\107\065\120\101\082\097\119"] - 31),choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 1),(v["\114\097\110\107\065\120\101\082\097\119"] - 1),0))))))
  if v["\114\097\110\107\065\120\101\080\114\111\103\114\101\115\115"] == nil then return {} end
  v["\114\097\110\107\065\120\101\080\114\111\103\114\101\115\115\077\097\120"] = choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 251),1,choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 181),70,choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 121),60,choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 71),50,choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 31),40,choose((v["\114\097\110\107\065\120\101\082\097\119"] >= 1),30,1))))))
  if v["\114\097\110\107\065\120\101\080\114\111\103\114\101\115\115\077\097\120"] == nil then return {} end
  v["\114\097\110\107\066\111\119"] = choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 251),"\083",choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 181),"\065",choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 121),"\066",choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 71),"\067",choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 31),"\068",choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 1),"\069","\045\045\045"))))))
  if v["\114\097\110\107\066\111\119"] == nil then return {} end
  v["\114\097\110\107\066\111\119\080\114\111\103\114\101\115\115"] = choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 251),1,choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 181),(v["\114\097\110\107\066\111\119\082\097\119"] - 181),choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 121),(v["\114\097\110\107\066\111\119\082\097\119"] - 121),choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 71),(v["\114\097\110\107\066\111\119\082\097\119"] - 71),choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 31),(v["\114\097\110\107\066\111\119\082\097\119"] - 31),choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 1),(v["\114\097\110\107\066\111\119\082\097\119"] - 1),0))))))
  if v["\114\097\110\107\066\111\119\080\114\111\103\114\101\115\115"] == nil then return {} end
  v["\114\097\110\107\066\111\119\080\114\111\103\114\101\115\115\077\097\120"] = choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 251),1,choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 181),70,choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 121),60,choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 71),50,choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 31),40,choose((v["\114\097\110\107\066\111\119\082\097\119"] >= 1),30,1))))))
  if v["\114\097\110\107\066\111\119\080\114\111\103\114\101\115\115\077\097\120"] == nil then return {} end
  v["\114\097\110\107\083\116\097\102\102"] = choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 251),"\083",choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 181),"\065",choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 121),"\066",choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 71),"\067",choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 31),"\068",choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 1),"\069","\045\045\045"))))))
  if v["\114\097\110\107\083\116\097\102\102"] == nil then return {} end
  v["\114\097\110\107\083\116\097\102\102\080\114\111\103\114\101\115\115"] = choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 251),1,choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 181),(v["\114\097\110\107\083\116\097\102\102\082\097\119"] - 181),choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 121),(v["\114\097\110\107\083\116\097\102\102\082\097\119"] - 121),choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 71),(v["\114\097\110\107\083\116\097\102\102\082\097\119"] - 71),choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 31),(v["\114\097\110\107\083\116\097\102\102\082\097\119"] - 31),choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 1),(v["\114\097\110\107\083\116\097\102\102\082\097\119"] - 1),0))))))
  if v["\114\097\110\107\083\116\097\102\102\080\114\111\103\114\101\115\115"] == nil then return {} end
  v["\114\097\110\107\083\116\097\102\102\080\114\111\103\114\101\115\115\077\097\120"] = choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 251),1,choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 181),70,choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 121),60,choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 71),50,choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 31),40,choose((v["\114\097\110\107\083\116\097\102\102\082\097\119"] >= 1),30,1))))))
  if v["\114\097\110\107\083\116\097\102\102\080\114\111\103\114\101\115\115\077\097\120"] == nil then return {} end
  v["\114\097\110\107\065\110\105\109\097"] = choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 251),"\083",choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 181),"\065",choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 121),"\066",choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 71),"\067",choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 31),"\068",choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 1),"\069","\045\045\045"))))))
  if v["\114\097\110\107\065\110\105\109\097"] == nil then return {} end
  v["\114\097\110\107\065\110\105\109\097\080\114\111\103\114\101\115\115"] = choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 251),1,choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 181),(v["\114\097\110\107\065\110\105\109\097\082\097\119"] - 181),choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 121),(v["\114\097\110\107\065\110\105\109\097\082\097\119"] - 121),choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 71),(v["\114\097\110\107\065\110\105\109\097\082\097\119"] - 71),choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 31),(v["\114\097\110\107\065\110\105\109\097\082\097\119"] - 31),choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 1),(v["\114\097\110\107\065\110\105\109\097\082\097\119"] - 1),0))))))
  if v["\114\097\110\107\065\110\105\109\097\080\114\111\103\114\101\115\115"] == nil then return {} end
  v["\114\097\110\107\065\110\105\109\097\080\114\111\103\114\101\115\115\077\097\120"] = choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 251),1,choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 181),70,choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 121),60,choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 71),50,choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 31),40,choose((v["\114\097\110\107\065\110\105\109\097\082\097\119"] >= 1),30,1))))))
  if v["\114\097\110\107\065\110\105\109\097\080\114\111\103\114\101\115\115\077\097\120"] == nil then return {} end
  v["\114\097\110\107\076\105\103\104\116"] = choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 251),"\083",choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 181),"\065",choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 121),"\066",choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 71),"\067",choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 31),"\068",choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 1),"\069","\045\045\045"))))))
  if v["\114\097\110\107\076\105\103\104\116"] == nil then return {} end
  v["\114\097\110\107\076\105\103\104\116\080\114\111\103\114\101\115\115"] = choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 251),1,choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 181),(v["\114\097\110\107\076\105\103\104\116\082\097\119"] - 181),choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 121),(v["\114\097\110\107\076\105\103\104\116\082\097\119"] - 121),choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 71),(v["\114\097\110\107\076\105\103\104\116\082\097\119"] - 71),choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 31),(v["\114\097\110\107\076\105\103\104\116\082\097\119"] - 31),choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 1),(v["\114\097\110\107\076\105\103\104\116\082\097\119"] - 1),0))))))
  if v["\114\097\110\107\076\105\103\104\116\080\114\111\103\114\101\115\115"] == nil then return {} end
  v["\114\097\110\107\076\105\103\104\116\080\114\111\103\114\101\115\115\077\097\120"] = choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 251),1,choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 181),70,choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 121),60,choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 71),50,choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 31),40,choose((v["\114\097\110\107\076\105\103\104\116\082\097\119"] >= 1),30,1))))))
  if v["\114\097\110\107\076\105\103\104\116\080\114\111\103\114\101\115\115\077\097\120"] == nil then return {} end
  v["\114\097\110\107\068\097\114\107"] = choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 251),"\083",choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 181),"\065",choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 121),"\066",choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 71),"\067",choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 31),"\068",choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 1),"\069","\045\045\045"))))))
  if v["\114\097\110\107\068\097\114\107"] == nil then return {} end
  v["\114\097\110\107\068\097\114\107\080\114\111\103\114\101\115\115"] = choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 251),1,choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 181),(v["\114\097\110\107\068\097\114\107\082\097\119"] - 181),choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 121),(v["\114\097\110\107\068\097\114\107\082\097\119"] - 121),choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 71),(v["\114\097\110\107\068\097\114\107\082\097\119"] - 71),choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 31),(v["\114\097\110\107\068\097\114\107\082\097\119"] - 31),choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 1),(v["\114\097\110\107\068\097\114\107\082\097\119"] - 1),0))))))
  if v["\114\097\110\107\068\097\114\107\080\114\111\103\114\101\115\115"] == nil then return {} end
  v["\114\097\110\107\068\097\114\107\080\114\111\103\114\101\115\115\077\097\120"] = choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 251),1,choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 181),70,choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 121),60,choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 71),50,choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 31),40,choose((v["\114\097\110\107\068\097\114\107\082\097\119"] >= 1),30,1))))))
  if v["\114\097\110\107\068\097\114\107\080\114\111\103\114\101\115\115\077\097\120"] == nil then return {} end
  v["\112\111\119\101\114\076\097\098\101\108"] = lookup11[tostring(v["\099\108\097\115\115\080\111\105\110\116\101\114"])]
  if v["\112\111\119\101\114\076\097\098\101\108"] == nil then return {} end
  v["\115\117\112\112\111\114\116\049\078\097\109\101"] = ""
  if v["\115\117\112\112\111\114\116\049\078\097\109\101"] == nil then return {} end
  v["\115\117\112\112\111\114\116\049\080\111\114\116\114\097\105\116"] = ""
  if v["\115\117\112\112\111\114\116\049\080\111\114\116\114\097\105\116"] == nil then return {} end
  v["\115\117\112\112\111\114\116\049\082\097\110\107"] = choose((v["\115\117\112\112\111\114\116\049\069\120\112"] >= 241),"\065",choose((v["\115\117\112\112\111\114\116\049\069\120\112"] >= 161),"\066",choose((v["\115\117\112\112\111\114\116\049\069\120\112"] >= 81),"\067","\045\045\045")))
  if v["\115\117\112\112\111\114\116\049\082\097\110\107"] == nil then return {} end
  v["\115\117\112\112\111\114\116\050\078\097\109\101"] = ""
  if v["\115\117\112\112\111\114\116\050\078\097\109\101"] == nil then return {} end
  v["\115\117\112\112\111\114\116\050\080\111\114\116\114\097\105\116"] = ""
  if v["\115\117\112\112\111\114\116\050\080\111\114\116\114\097\105\116"] == nil then return {} end
  v["\115\117\112\112\111\114\116\050\082\097\110\107"] = choose((v["\115\117\112\112\111\114\116\050\069\120\112"] >= 241),"\065",choose((v["\115\117\112\112\111\114\116\050\069\120\112"] >= 161),"\066",choose((v["\115\117\112\112\111\114\116\050\069\120\112"] >= 81),"\067","\045\045\045")))
  if v["\115\117\112\112\111\114\116\050\082\097\110\107"] == nil then return {} end
  v["\115\117\112\112\111\114\116\051\078\097\109\101"] = ""
  if v["\115\117\112\112\111\114\116\051\078\097\109\101"] == nil then return {} end
  v["\115\117\112\112\111\114\116\051\080\111\114\116\114\097\105\116"] = ""
  if v["\115\117\112\112\111\114\116\051\080\111\114\116\114\097\105\116"] == nil then return {} end
  v["\115\117\112\112\111\114\116\051\082\097\110\107"] = choose((v["\115\117\112\112\111\114\116\051\069\120\112"] >= 241),"\065",choose((v["\115\117\112\112\111\114\116\051\069\120\112"] >= 161),"\066",choose((v["\115\117\112\112\111\114\116\051\069\120\112"] >= 81),"\067","\045\045\045")))
  if v["\115\117\112\112\111\114\116\051\082\097\110\107"] == nil then return {} end
  v["\115\117\112\112\111\114\116\052\078\097\109\101"] = ""
  if v["\115\117\112\112\111\114\116\052\078\097\109\101"] == nil then return {} end
  v["\115\117\112\112\111\114\116\052\080\111\114\116\114\097\105\116"] = ""
  if v["\115\117\112\112\111\114\116\052\080\111\114\116\114\097\105\116"] == nil then return {} end
  v["\115\117\112\112\111\114\116\052\082\097\110\107"] = choose((v["\115\117\112\112\111\114\116\052\069\120\112"] >= 241),"\065",choose((v["\115\117\112\112\111\114\116\052\069\120\112"] >= 161),"\066",choose((v["\115\117\112\112\111\114\116\052\069\120\112"] >= 81),"\067","\045\045\045")))
  if v["\115\117\112\112\111\114\116\052\082\097\110\107"] == nil then return {} end
  v["\115\117\112\112\111\114\116\053\078\097\109\101"] = ""
  if v["\115\117\112\112\111\114\116\053\078\097\109\101"] == nil then return {} end
  v["\115\117\112\112\111\114\116\053\080\111\114\116\114\097\105\116"] = ""
  if v["\115\117\112\112\111\114\116\053\080\111\114\116\114\097\105\116"] == nil then return {} end
  v["\115\117\112\112\111\114\116\053\082\097\110\107"] = choose((v["\115\117\112\112\111\114\116\053\069\120\112"] >= 241),"\065",choose((v["\115\117\112\112\111\114\116\053\069\120\112"] >= 161),"\066",choose((v["\115\117\112\112\111\114\116\053\069\120\112"] >= 81),"\067","\045\045\045")))
  if v["\115\117\112\112\111\114\116\053\082\097\110\107"] == nil then return {} end
  v["\105\116\101\109\049\073\100"] = (v["\105\116\101\109\049"] % 256)
  if v["\105\116\101\109\049\073\100"] == nil then return {} end
  v["\105\116\101\109\049\078\097\109\101"] = lookup12[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\078\097\109\101"] == nil then return {} end
  v["\105\116\101\109\049\073\099\111\110"] = lookup13[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\073\099\111\110"] == nil then return {} end
  v["\105\116\101\109\049\085\115\101\115"] = math.floor(v["\105\116\101\109\049"] / 256)
  if v["\105\116\101\109\049\085\115\101\115"] == nil then return {} end
  v["\105\116\101\109\049\077\097\120\085\115\101\115"] = lookup14[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\077\097\120\085\115\101\115"] == nil then return {} end
  v["\105\116\101\109\049\085\110\098\114\101\097\107\097\098\108\101"] = lookup15[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\085\110\098\114\101\097\107\097\098\108\101"] == nil then return {} end
  v["\105\116\101\109\049\085\115\101\115\068\105\115\112\108\097\121"] = choose(v["\105\116\101\109\049\085\110\098\114\101\097\107\097\098\108\101"],"\226\136\158",v["\105\116\101\109\049\085\115\101\115"])
  if v["\105\116\101\109\049\085\115\101\115\068\105\115\112\108\097\121"] == nil then return {} end
  v["\105\116\101\109\049\077\097\120\068\105\115\112\108\097\121"] = choose(v["\105\116\101\109\049\085\110\098\114\101\097\107\097\098\108\101"],"\226\136\158",v["\105\116\101\109\049\077\097\120\085\115\101\115"])
  if v["\105\116\101\109\049\077\097\120\068\105\115\112\108\097\121"] == nil then return {} end
  v["\105\116\101\109\050\073\100"] = (v["\105\116\101\109\050"] % 256)
  if v["\105\116\101\109\050\073\100"] == nil then return {} end
  v["\105\116\101\109\050\078\097\109\101"] = lookup12[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\078\097\109\101"] == nil then return {} end
  v["\105\116\101\109\050\073\099\111\110"] = lookup13[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\073\099\111\110"] == nil then return {} end
  v["\105\116\101\109\050\085\115\101\115"] = math.floor(v["\105\116\101\109\050"] / 256)
  if v["\105\116\101\109\050\085\115\101\115"] == nil then return {} end
  v["\105\116\101\109\050\077\097\120\085\115\101\115"] = lookup14[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\077\097\120\085\115\101\115"] == nil then return {} end
  v["\105\116\101\109\050\085\110\098\114\101\097\107\097\098\108\101"] = lookup15[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\085\110\098\114\101\097\107\097\098\108\101"] == nil then return {} end
  v["\105\116\101\109\050\085\115\101\115\068\105\115\112\108\097\121"] = choose(v["\105\116\101\109\050\085\110\098\114\101\097\107\097\098\108\101"],"\226\136\158",v["\105\116\101\109\050\085\115\101\115"])
  if v["\105\116\101\109\050\085\115\101\115\068\105\115\112\108\097\121"] == nil then return {} end
  v["\105\116\101\109\050\077\097\120\068\105\115\112\108\097\121"] = choose(v["\105\116\101\109\050\085\110\098\114\101\097\107\097\098\108\101"],"\226\136\158",v["\105\116\101\109\050\077\097\120\085\115\101\115"])
  if v["\105\116\101\109\050\077\097\120\068\105\115\112\108\097\121"] == nil then return {} end
  v["\105\116\101\109\051\073\100"] = (v["\105\116\101\109\051"] % 256)
  if v["\105\116\101\109\051\073\100"] == nil then return {} end
  v["\105\116\101\109\051\078\097\109\101"] = lookup12[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\078\097\109\101"] == nil then return {} end
  v["\105\116\101\109\051\073\099\111\110"] = lookup13[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\073\099\111\110"] == nil then return {} end
  v["\105\116\101\109\051\085\115\101\115"] = math.floor(v["\105\116\101\109\051"] / 256)
  if v["\105\116\101\109\051\085\115\101\115"] == nil then return {} end
  v["\105\116\101\109\051\077\097\120\085\115\101\115"] = lookup14[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\077\097\120\085\115\101\115"] == nil then return {} end
  v["\105\116\101\109\051\085\110\098\114\101\097\107\097\098\108\101"] = lookup15[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\085\110\098\114\101\097\107\097\098\108\101"] == nil then return {} end
  v["\105\116\101\109\051\085\115\101\115\068\105\115\112\108\097\121"] = choose(v["\105\116\101\109\051\085\110\098\114\101\097\107\097\098\108\101"],"\226\136\158",v["\105\116\101\109\051\085\115\101\115"])
  if v["\105\116\101\109\051\085\115\101\115\068\105\115\112\108\097\121"] == nil then return {} end
  v["\105\116\101\109\051\077\097\120\068\105\115\112\108\097\121"] = choose(v["\105\116\101\109\051\085\110\098\114\101\097\107\097\098\108\101"],"\226\136\158",v["\105\116\101\109\051\077\097\120\085\115\101\115"])
  if v["\105\116\101\109\051\077\097\120\068\105\115\112\108\097\121"] == nil then return {} end
  v["\105\116\101\109\052\073\100"] = (v["\105\116\101\109\052"] % 256)
  if v["\105\116\101\109\052\073\100"] == nil then return {} end
  v["\105\116\101\109\052\078\097\109\101"] = lookup12[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\078\097\109\101"] == nil then return {} end
  v["\105\116\101\109\052\073\099\111\110"] = lookup13[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\073\099\111\110"] == nil then return {} end
  v["\105\116\101\109\052\085\115\101\115"] = math.floor(v["\105\116\101\109\052"] / 256)
  if v["\105\116\101\109\052\085\115\101\115"] == nil then return {} end
  v["\105\116\101\109\052\077\097\120\085\115\101\115"] = lookup14[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\077\097\120\085\115\101\115"] == nil then return {} end
  v["\105\116\101\109\052\085\110\098\114\101\097\107\097\098\108\101"] = lookup15[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\085\110\098\114\101\097\107\097\098\108\101"] == nil then return {} end
  v["\105\116\101\109\052\085\115\101\115\068\105\115\112\108\097\121"] = choose(v["\105\116\101\109\052\085\110\098\114\101\097\107\097\098\108\101"],"\226\136\158",v["\105\116\101\109\052\085\115\101\115"])
  if v["\105\116\101\109\052\085\115\101\115\068\105\115\112\108\097\121"] == nil then return {} end
  v["\105\116\101\109\052\077\097\120\068\105\115\112\108\097\121"] = choose(v["\105\116\101\109\052\085\110\098\114\101\097\107\097\098\108\101"],"\226\136\158",v["\105\116\101\109\052\077\097\120\085\115\101\115"])
  if v["\105\116\101\109\052\077\097\120\068\105\115\112\108\097\121"] == nil then return {} end
  v["\105\116\101\109\053\073\100"] = (v["\105\116\101\109\053"] % 256)
  if v["\105\116\101\109\053\073\100"] == nil then return {} end
  v["\105\116\101\109\053\078\097\109\101"] = lookup12[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\078\097\109\101"] == nil then return {} end
  v["\105\116\101\109\053\073\099\111\110"] = lookup13[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\073\099\111\110"] == nil then return {} end
  v["\105\116\101\109\053\085\115\101\115"] = math.floor(v["\105\116\101\109\053"] / 256)
  if v["\105\116\101\109\053\085\115\101\115"] == nil then return {} end
  v["\105\116\101\109\053\077\097\120\085\115\101\115"] = lookup14[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\077\097\120\085\115\101\115"] == nil then return {} end
  v["\105\116\101\109\053\085\110\098\114\101\097\107\097\098\108\101"] = lookup15[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\085\110\098\114\101\097\107\097\098\108\101"] == nil then return {} end
  v["\105\116\101\109\053\085\115\101\115\068\105\115\112\108\097\121"] = choose(v["\105\116\101\109\053\085\110\098\114\101\097\107\097\098\108\101"],"\226\136\158",v["\105\116\101\109\053\085\115\101\115"])
  if v["\105\116\101\109\053\085\115\101\115\068\105\115\112\108\097\121"] == nil then return {} end
  v["\105\116\101\109\053\077\097\120\068\105\115\112\108\097\121"] = choose(v["\105\116\101\109\053\085\110\098\114\101\097\107\097\098\108\101"],"\226\136\158",v["\105\116\101\109\053\077\097\120\085\115\101\115"])
  if v["\105\116\101\109\053\077\097\120\068\105\115\112\108\097\121"] == nil then return {} end
  v["\102\105\114\115\116\073\116\101\109\083\108\111\116"] = choose((v["\105\116\101\109\049\073\100"] >= 1),1,choose((v["\105\116\101\109\050\073\100"] >= 1),2,choose((v["\105\116\101\109\051\073\100"] >= 1),3,choose((v["\105\116\101\109\052\073\100"] >= 1),4,choose((v["\105\116\101\109\053\073\100"] >= 1),5,0)))))
  if v["\102\105\114\115\116\073\116\101\109\083\108\111\116"] == nil then return {} end
  v["\108\097\115\116\073\116\101\109\083\108\111\116"] = choose((v["\105\116\101\109\053\073\100"] >= 1),5,choose((v["\105\116\101\109\052\073\100"] >= 1),4,choose((v["\105\116\101\109\051\073\100"] >= 1),3,choose((v["\105\116\101\109\050\073\100"] >= 1),2,choose((v["\105\116\101\109\049\073\100"] >= 1),1,0)))))
  if v["\108\097\115\116\073\116\101\109\083\108\111\116"] == nil then return {} end
  v["\117\110\105\116\068\114\111\112\115\073\116\101\109"] = ((math.floor(v["\117\110\105\116\083\116\097\116\101"] / 4096) % 2) == 1)
  if v["\117\110\105\116\068\114\111\112\115\073\116\101\109"] == nil then return {} end
  v["\105\116\101\109\049\068\114\111\112\112\097\098\108\101"] = all(v["\117\110\105\116\068\114\111\112\115\073\116\101\109"],(v["\108\097\115\116\073\116\101\109\083\108\111\116"] == 1))
  if v["\105\116\101\109\049\068\114\111\112\112\097\098\108\101"] == nil then return {} end
  v["\105\116\101\109\050\068\114\111\112\112\097\098\108\101"] = all(v["\117\110\105\116\068\114\111\112\115\073\116\101\109"],(v["\108\097\115\116\073\116\101\109\083\108\111\116"] == 2))
  if v["\105\116\101\109\050\068\114\111\112\112\097\098\108\101"] == nil then return {} end
  v["\105\116\101\109\051\068\114\111\112\112\097\098\108\101"] = all(v["\117\110\105\116\068\114\111\112\115\073\116\101\109"],(v["\108\097\115\116\073\116\101\109\083\108\111\116"] == 3))
  if v["\105\116\101\109\051\068\114\111\112\112\097\098\108\101"] == nil then return {} end
  v["\105\116\101\109\052\068\114\111\112\112\097\098\108\101"] = all(v["\117\110\105\116\068\114\111\112\115\073\116\101\109"],(v["\108\097\115\116\073\116\101\109\083\108\111\116"] == 4))
  if v["\105\116\101\109\052\068\114\111\112\112\097\098\108\101"] == nil then return {} end
  v["\105\116\101\109\053\068\114\111\112\112\097\098\108\101"] = all(v["\117\110\105\116\068\114\111\112\115\073\116\101\109"],(v["\108\097\115\116\073\116\101\109\083\108\111\116"] == 5))
  if v["\105\116\101\109\053\068\114\111\112\112\097\098\108\101"] == nil then return {} end
  v["\102\105\114\115\116\073\116\101\109\080\097\103\101"] = lookup16[tostring(v["\102\105\114\115\116\073\116\101\109\083\108\111\116"])]
  if v["\102\105\114\115\116\073\116\101\109\080\097\103\101"] == nil then return {} end
  v["\105\116\101\109\049\068\101\115\099\114\105\112\116\105\111\110"] = lookup17[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\068\101\115\099\114\105\112\116\105\111\110"] == nil then return {} end
  v["\105\116\101\109\049\077\105\103\104\116"] = lookup18[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\077\105\103\104\116"] == nil then return {} end
  v["\105\116\101\109\049\072\105\116"] = lookup19[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\072\105\116"] == nil then return {} end
  v["\105\116\101\109\049\067\114\105\116"] = lookup20[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\067\114\105\116"] == nil then return {} end
  v["\105\116\101\109\049\087\101\105\103\104\116"] = lookup21[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\087\101\105\103\104\116"] == nil then return {} end
  v["\105\116\101\109\049\084\121\112\101"] = lookup22[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\084\121\112\101"] == nil then return {} end
  v["\105\116\101\109\049\082\097\110\107"] = lookup23[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\082\097\110\107"] == nil then return {} end
  v["\105\116\101\109\049\082\097\110\103\101"] = lookup24[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\082\097\110\103\101"] == nil then return {} end
  v["\105\116\101\109\049\073\115\087\101\097\112\111\110"] = lookup25[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\073\115\087\101\097\112\111\110"] == nil then return {} end
  v["\105\116\101\109\049\072\097\115\082\097\110\107"] = lookup25[tostring(v["\105\116\101\109\049\073\100"])]
  if v["\105\116\101\109\049\072\097\115\082\097\110\107"] == nil then return {} end
  v["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\049"] = (v["\102\105\114\115\116\073\116\101\109\083\108\111\116"] == 1)
  if v["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\049"] == nil then return {} end
  v["\105\116\101\109\050\068\101\115\099\114\105\112\116\105\111\110"] = lookup17[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\068\101\115\099\114\105\112\116\105\111\110"] == nil then return {} end
  v["\105\116\101\109\050\077\105\103\104\116"] = lookup18[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\077\105\103\104\116"] == nil then return {} end
  v["\105\116\101\109\050\072\105\116"] = lookup19[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\072\105\116"] == nil then return {} end
  v["\105\116\101\109\050\067\114\105\116"] = lookup20[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\067\114\105\116"] == nil then return {} end
  v["\105\116\101\109\050\087\101\105\103\104\116"] = lookup21[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\087\101\105\103\104\116"] == nil then return {} end
  v["\105\116\101\109\050\084\121\112\101"] = lookup22[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\084\121\112\101"] == nil then return {} end
  v["\105\116\101\109\050\082\097\110\107"] = lookup23[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\082\097\110\107"] == nil then return {} end
  v["\105\116\101\109\050\082\097\110\103\101"] = lookup24[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\082\097\110\103\101"] == nil then return {} end
  v["\105\116\101\109\050\073\115\087\101\097\112\111\110"] = lookup25[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\073\115\087\101\097\112\111\110"] == nil then return {} end
  v["\105\116\101\109\050\072\097\115\082\097\110\107"] = lookup25[tostring(v["\105\116\101\109\050\073\100"])]
  if v["\105\116\101\109\050\072\097\115\082\097\110\107"] == nil then return {} end
  v["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\050"] = (v["\102\105\114\115\116\073\116\101\109\083\108\111\116"] == 2)
  if v["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\050"] == nil then return {} end
  v["\105\116\101\109\051\068\101\115\099\114\105\112\116\105\111\110"] = lookup17[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\068\101\115\099\114\105\112\116\105\111\110"] == nil then return {} end
  v["\105\116\101\109\051\077\105\103\104\116"] = lookup18[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\077\105\103\104\116"] == nil then return {} end
  v["\105\116\101\109\051\072\105\116"] = lookup19[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\072\105\116"] == nil then return {} end
  v["\105\116\101\109\051\067\114\105\116"] = lookup20[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\067\114\105\116"] == nil then return {} end
  v["\105\116\101\109\051\087\101\105\103\104\116"] = lookup21[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\087\101\105\103\104\116"] == nil then return {} end
  v["\105\116\101\109\051\084\121\112\101"] = lookup22[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\084\121\112\101"] == nil then return {} end
  v["\105\116\101\109\051\082\097\110\107"] = lookup23[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\082\097\110\107"] == nil then return {} end
  v["\105\116\101\109\051\082\097\110\103\101"] = lookup24[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\082\097\110\103\101"] == nil then return {} end
  v["\105\116\101\109\051\073\115\087\101\097\112\111\110"] = lookup25[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\073\115\087\101\097\112\111\110"] == nil then return {} end
  v["\105\116\101\109\051\072\097\115\082\097\110\107"] = lookup25[tostring(v["\105\116\101\109\051\073\100"])]
  if v["\105\116\101\109\051\072\097\115\082\097\110\107"] == nil then return {} end
  v["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\051"] = (v["\102\105\114\115\116\073\116\101\109\083\108\111\116"] == 3)
  if v["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\051"] == nil then return {} end
  v["\105\116\101\109\052\068\101\115\099\114\105\112\116\105\111\110"] = lookup17[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\068\101\115\099\114\105\112\116\105\111\110"] == nil then return {} end
  v["\105\116\101\109\052\077\105\103\104\116"] = lookup18[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\077\105\103\104\116"] == nil then return {} end
  v["\105\116\101\109\052\072\105\116"] = lookup19[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\072\105\116"] == nil then return {} end
  v["\105\116\101\109\052\067\114\105\116"] = lookup20[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\067\114\105\116"] == nil then return {} end
  v["\105\116\101\109\052\087\101\105\103\104\116"] = lookup21[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\087\101\105\103\104\116"] == nil then return {} end
  v["\105\116\101\109\052\084\121\112\101"] = lookup22[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\084\121\112\101"] == nil then return {} end
  v["\105\116\101\109\052\082\097\110\107"] = lookup23[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\082\097\110\107"] == nil then return {} end
  v["\105\116\101\109\052\082\097\110\103\101"] = lookup24[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\082\097\110\103\101"] == nil then return {} end
  v["\105\116\101\109\052\073\115\087\101\097\112\111\110"] = lookup25[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\073\115\087\101\097\112\111\110"] == nil then return {} end
  v["\105\116\101\109\052\072\097\115\082\097\110\107"] = lookup25[tostring(v["\105\116\101\109\052\073\100"])]
  if v["\105\116\101\109\052\072\097\115\082\097\110\107"] == nil then return {} end
  v["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\052"] = (v["\102\105\114\115\116\073\116\101\109\083\108\111\116"] == 4)
  if v["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\052"] == nil then return {} end
  v["\105\116\101\109\053\068\101\115\099\114\105\112\116\105\111\110"] = lookup17[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\068\101\115\099\114\105\112\116\105\111\110"] == nil then return {} end
  v["\105\116\101\109\053\077\105\103\104\116"] = lookup18[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\077\105\103\104\116"] == nil then return {} end
  v["\105\116\101\109\053\072\105\116"] = lookup19[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\072\105\116"] == nil then return {} end
  v["\105\116\101\109\053\067\114\105\116"] = lookup20[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\067\114\105\116"] == nil then return {} end
  v["\105\116\101\109\053\087\101\105\103\104\116"] = lookup21[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\087\101\105\103\104\116"] == nil then return {} end
  v["\105\116\101\109\053\084\121\112\101"] = lookup22[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\084\121\112\101"] == nil then return {} end
  v["\105\116\101\109\053\082\097\110\107"] = lookup23[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\082\097\110\107"] == nil then return {} end
  v["\105\116\101\109\053\082\097\110\103\101"] = lookup24[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\082\097\110\103\101"] == nil then return {} end
  v["\105\116\101\109\053\073\115\087\101\097\112\111\110"] = lookup25[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\073\115\087\101\097\112\111\110"] == nil then return {} end
  v["\105\116\101\109\053\072\097\115\082\097\110\107"] = lookup25[tostring(v["\105\116\101\109\053\073\100"])]
  if v["\105\116\101\109\053\072\097\115\082\097\110\107"] == nil then return {} end
  v["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\053"] = (v["\102\105\114\115\116\073\116\101\109\083\108\111\116"] == 5)
  if v["\102\105\114\115\116\073\116\101\109\083\101\108\101\099\116\101\100\053"] == nil then return {} end
  v["\097\102\102\105\110\105\116\121\080\111\119"] = lookup26[tostring(v["\097\102\102\105\110\105\116\121"])]
  if v["\097\102\102\105\110\105\116\121\080\111\119"] == nil then return {} end
  v["\097\102\102\105\110\105\116\121\068\101\102"] = lookup27[tostring(v["\097\102\102\105\110\105\116\121"])]
  if v["\097\102\102\105\110\105\116\121\068\101\102"] == nil then return {} end
  v["\097\102\102\105\110\105\116\121\072\105\116"] = lookup28[tostring(v["\097\102\102\105\110\105\116\121"])]
  if v["\097\102\102\105\110\105\116\121\072\105\116"] == nil then return {} end
  v["\097\102\102\105\110\105\116\121\065\118\111"] = lookup29[tostring(v["\097\102\102\105\110\105\116\121"])]
  if v["\097\102\102\105\110\105\116\121\065\118\111"] == nil then return {} end
  v["\097\102\102\105\110\105\116\121\067\114\105\116"] = lookup30[tostring(v["\097\102\102\105\110\105\116\121"])]
  if v["\097\102\102\105\110\105\116\121\067\114\105\116"] == nil then return {} end
  v["\097\102\102\105\110\105\116\121\067\114\105\116\065\118\111"] = lookup31[tostring(v["\097\102\102\105\110\105\116\121"])]
  if v["\097\102\102\105\110\105\116\121\067\114\105\116\065\118\111"] == nil then return {} end
  v["\105\116\101\109\049\073\115\078\111\110\087\101\097\112\111\110"] = choose(v["\105\116\101\109\049\073\115\087\101\097\112\111\110"],false,true)
  if v["\105\116\101\109\049\073\115\078\111\110\087\101\097\112\111\110"] == nil then return {} end
  v["\105\116\101\109\050\073\115\078\111\110\087\101\097\112\111\110"] = choose(v["\105\116\101\109\050\073\115\087\101\097\112\111\110"],false,true)
  if v["\105\116\101\109\050\073\115\078\111\110\087\101\097\112\111\110"] == nil then return {} end
  v["\105\116\101\109\051\073\115\078\111\110\087\101\097\112\111\110"] = choose(v["\105\116\101\109\051\073\115\087\101\097\112\111\110"],false,true)
  if v["\105\116\101\109\051\073\115\078\111\110\087\101\097\112\111\110"] == nil then return {} end
  v["\105\116\101\109\052\073\115\078\111\110\087\101\097\112\111\110"] = choose(v["\105\116\101\109\052\073\115\087\101\097\112\111\110"],false,true)
  if v["\105\116\101\109\052\073\115\078\111\110\087\101\097\112\111\110"] == nil then return {} end
  v["\105\116\101\109\053\073\115\078\111\110\087\101\097\112\111\110"] = choose(v["\105\116\101\109\053\073\115\087\101\097\112\111\110"],false,true)
  if v["\105\116\101\109\053\073\115\078\111\110\087\101\097\112\111\110"] == nil then return {} end
  v["\115\117\112\112\111\114\116\049\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] = choose(v["\115\117\112\112\111\114\116\049\080\111\114\116\114\097\105\116"],false,true)
  if v["\115\117\112\112\111\114\116\049\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] == nil then return {} end
  v["\115\117\112\112\111\114\116\049\068\105\115\112\108\097\121\082\097\110\107"] = choose(v["\115\117\112\112\111\114\116\049\078\097\109\101"],v["\115\117\112\112\111\114\116\049\082\097\110\107"],"\045\045\045")
  if v["\115\117\112\112\111\114\116\049\068\105\115\112\108\097\121\082\097\110\107"] == nil then return {} end
  v["\115\117\112\112\111\114\116\050\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] = choose(v["\115\117\112\112\111\114\116\050\080\111\114\116\114\097\105\116"],false,true)
  if v["\115\117\112\112\111\114\116\050\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] == nil then return {} end
  v["\115\117\112\112\111\114\116\050\068\105\115\112\108\097\121\082\097\110\107"] = choose(v["\115\117\112\112\111\114\116\050\078\097\109\101"],v["\115\117\112\112\111\114\116\050\082\097\110\107"],"\045\045\045")
  if v["\115\117\112\112\111\114\116\050\068\105\115\112\108\097\121\082\097\110\107"] == nil then return {} end
  v["\115\117\112\112\111\114\116\051\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] = choose(v["\115\117\112\112\111\114\116\051\080\111\114\116\114\097\105\116"],false,true)
  if v["\115\117\112\112\111\114\116\051\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] == nil then return {} end
  v["\115\117\112\112\111\114\116\051\068\105\115\112\108\097\121\082\097\110\107"] = choose(v["\115\117\112\112\111\114\116\051\078\097\109\101"],v["\115\117\112\112\111\114\116\051\082\097\110\107"],"\045\045\045")
  if v["\115\117\112\112\111\114\116\051\068\105\115\112\108\097\121\082\097\110\107"] == nil then return {} end
  v["\115\117\112\112\111\114\116\052\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] = choose(v["\115\117\112\112\111\114\116\052\080\111\114\116\114\097\105\116"],false,true)
  if v["\115\117\112\112\111\114\116\052\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] == nil then return {} end
  v["\115\117\112\112\111\114\116\052\068\105\115\112\108\097\121\082\097\110\107"] = choose(v["\115\117\112\112\111\114\116\052\078\097\109\101"],v["\115\117\112\112\111\114\116\052\082\097\110\107"],"\045\045\045")
  if v["\115\117\112\112\111\114\116\052\068\105\115\112\108\097\121\082\097\110\107"] == nil then return {} end
  v["\115\117\112\112\111\114\116\053\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] = choose(v["\115\117\112\112\111\114\116\053\080\111\114\116\114\097\105\116"],false,true)
  if v["\115\117\112\112\111\114\116\053\080\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] == nil then return {} end
  v["\115\117\112\112\111\114\116\053\068\105\115\112\108\097\121\082\097\110\107"] = choose(v["\115\117\112\112\111\114\116\053\078\097\109\101"],v["\115\117\112\112\111\114\116\053\082\097\110\107"],"\045\045\045")
  if v["\115\117\112\112\111\114\116\053\068\105\115\112\108\097\121\082\097\110\107"] == nil then return {} end
  v["\101\120\112\067\111\109\112\097\099\116"] = lookup32[tostring(v["\101\120\112"])]
  if v["\101\120\112\067\111\109\112\097\099\116"] == nil then return {} end
  v["\108\101\118\101\108\080\114\111\103\114\101\115\115"] = choose((v["\101\120\112"] == 255),0,v["\101\120\112"])
  if v["\108\101\118\101\108\080\114\111\103\114\101\115\115"] == nil then return {} end
  v["\112\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] = choose(v["\112\111\114\116\114\097\105\116"],false,true)
  if v["\112\111\114\116\114\097\105\116\077\105\115\115\105\110\103"] == nil then return {} end
  v["\112\111\114\116\114\097\105\116\065\115\112\101\099\116\082\097\116\105\111"] = lookup33[tostring(v["\112\111\114\116\114\097\105\116"])]
  if v["\112\111\114\116\114\097\105\116\065\115\112\101\099\116\082\097\116\105\111"] == nil then return {} end
  v["\104\101\097\100\101\114\065\115\112\101\099\116\082\097\116\105\111"] = (v["\112\111\114\116\114\097\105\116\065\115\112\101\099\116\082\097\116\105\111"] * 3.4482758620689657)
  if v["\104\101\097\100\101\114\065\115\112\101\099\116\082\097\116\105\111"] == nil then return {} end
  v["\116\114\097\118\101\108\101\114\080\114\101\115\101\110\116"] = choose((v["\114\101\115\099\117\101\073\100"] == 0),false,true)
  if v["\116\114\097\118\101\108\101\114\080\114\101\115\101\110\116"] == nil then return {} end
  v["\099\111\110\100\105\116\105\111\110\065\099\116\105\118\101"] = choose(((v["\115\116\097\116\117\115\066\121\116\101"] % 16) == 0),false,true)
  if v["\099\111\110\100\105\116\105\111\110\065\099\116\105\118\101"] == nil then return {} end
  v["\097\102\102\105\110\105\116\121\073\099\111\110"] = lookup34[tostring(v["\097\102\102\105\110\105\116\121"])]
  if v["\097\102\102\105\110\105\116\121\073\099\111\110"] == nil then return {} end
  v["\097\102\102\105\110\105\116\121\077\105\115\115\105\110\103"] = choose(v["\097\102\102\105\110\105\116\121\073\099\111\110"],false,true)
  if v["\097\102\102\105\110\105\116\121\077\105\115\115\105\110\103"] == nil then return {} end
  v["\115\117\112\112\111\114\116\069\109\112\116\121"] = choose(first(v["\115\117\112\112\111\114\116\049\078\097\109\101"],v["\115\117\112\112\111\114\116\050\078\097\109\101"],v["\115\117\112\112\111\114\116\051\078\097\109\101"],v["\115\117\112\112\111\114\116\052\078\097\109\101"],v["\115\117\112\112\111\114\116\053\078\097\109\101"]),false,true)
  if v["\115\117\112\112\111\114\116\069\109\112\116\121"] == nil then return {} end
  local identity = table.concat({tostring(v["characterPointer"]),tostring(v["deployment"]),tostring(v["item1Id"]),tostring(v["item2Id"]),tostring(v["item3Id"]),tostring(v["item4Id"]),tostring(v["item5Id"])}, "|")
  if identity ~= lastUiIdentity then
    v.ui = {set={["inventoryDetail"]=v["firstItemPage"],["itemSelected1"]=v["firstItemSelected1"],["itemSelected2"]=v["firstItemSelected2"],["itemSelected3"]=v["firstItemSelected3"],["itemSelected4"]=v["firstItemSelected4"],["itemSelected5"]=v["firstItemSelected5"]}}
    lastUiIdentity = identity
  end
  local u = unit
  local items=D.equipmentItems
  local chars=D.equipmentChars
  local classes=D.equipmentClasses
  local rescueSlots = {[1]=33734220,[2]=33734292,[3]=33734364,[4]=33734436,[5]=33734508,[6]=33734580,[7]=33734652,[8]=33734724,[9]=33734796,[10]=33734868,[11]=33734940,[12]=33735012,[13]=33735084,[14]=33735156,[15]=33735228,[16]=33735300,[17]=33735372,[18]=33735444,[19]=33735516,[20]=33735588,[21]=33735660,[22]=33735732,[23]=33735804,[24]=33735876,[25]=33735948,[26]=33736020,[27]=33736092,[28]=33736164,[29]=33736236,[30]=33736308,[31]=33736380,[32]=33736452,[33]=33736524,[34]=33736596,[35]=33736668,[36]=33736740,[37]=33736812,[38]=33736884,[39]=33736956,[40]=33737028,[41]=33737100,[42]=33737172,[43]=33737244,[44]=33737316,[45]=33737388,[46]=33737460,[47]=33737532,[48]=33737604,[49]=33737676,[50]=33737748,[51]=33737820,[52]=33737892,[53]=33737964,[54]=33738036,[55]=33738108,[56]=33738180,[57]=33738252,[58]=33738324,[59]=33738396,[60]=33738468,[61]=33738540,[62]=33738612,[65]=33742284,[66]=33742356,[67]=33742428,[68]=33742500,[69]=33742572,[70]=33742644,[71]=33742716,[72]=33742788,[73]=33742860,[74]=33742932,[75]=33743004,[76]=33743076,[77]=33743148,[78]=33743220,[79]=33743292,[80]=33743364,[81]=33743436,[82]=33743508,[83]=33743580,[84]=33743652,[129]=33738684,[130]=33738756,[131]=33738828,[132]=33738900,[133]=33738972,[134]=33739044,[135]=33739116,[136]=33739188,[137]=33739260,[138]=33739332,[139]=33739404,[140]=33739476,[141]=33739548,[142]=33739620,[143]=33739692,[144]=33739764,[145]=33739836,[146]=33739908,[147]=33739980,[148]=33740052,[149]=33740124,[150]=33740196,[151]=33740268,[152]=33740340,[153]=33740412,[154]=33740484,[155]=33740556,[156]=33740628,[157]=33740700,[158]=33740772,[159]=33740844,[160]=33740916,[161]=33740988,[162]=33741060,[163]=33741132,[164]=33741204,[165]=33741276,[166]=33741348,[167]=33741420,[168]=33741492,[169]=33741564,[170]=33741636,[171]=33741708,[172]=33741780,[173]=33741852,[174]=33741924,[175]=33741996,[176]=33742068,[177]=33742140,[178]=33742212,[193]=33743724,[194]=33743796,[195]=33743868,[196]=33743940,[197]=33744012}
  v.traveler="---"; local rescued=rescueSlots[v.rescueId]; if v.rescueId and v.rescueId~=0 and rescued and mem.u8(rescued+11)==v.rescueId then local passenger=chars[mem.u32(rescued)]; if passenger and passenger.name and not passenger.name:match("^Unit #") then v.traveler=passenger.name end end
  local char, cls = chars[v.characterPointer], classes[v.classPointer]
  local w, slot = nil, 0
  if char and cls then for i=0,4 do local raw=mem.u16(u+0x1E+i*2); local id=raw%256; local item=items[id]; if item and (item.r==0 or ((char.a & item.r)==item.r or (cls.a & item.r)==item.r)) then local rank=mem.u8(u+0x28+item.t); if item.t>=8 or rank>=item.n then w,slot=item,i+1; break end end end end
  v.equipmentWeapon=w and mem.u16(u+0x1E+(slot-1)*2) or 0; v.equipmentSlot=slot; v.equipmentHasWeapon=w~=nil; v.equipmentMatches=true; v.equipmentMissing=w==nil; v.equipmentId=w and (v.equipmentWeapon%256) or 0; v.equipmentName=w and w.name or "---"
  for i=1,5 do v["item"..i.."Badge"]=(slot==i) and "E" or "" end
  if w then local state=mem.u32(u+12); local rescuing=(state & 0x10)~=0; local skl=mem.u8(u+21); local spd=mem.u8(u+22); if rescuing then skl=math.floor(skl/2); spd=math.floor(spd/2) end; local con=mem.s8(u+26)+cls.con+char.con; local as=math.max(0,spd-math.max(0,w.w-con)); local luck=mem.u8(u+25); local avoid=0; local rows=mem.u32(0x0202E4DC); if rows>=0x02000000 and rows<0x02040000 then local row=mem.u32(rows+mem.u8(u+17)*4); if row>=0x02000000 and row<0x02040000 then avoid=cls.avoid[mem.u8(row+mem.u8(u+16))+1] or 0 end end; v.equipmentAtk=((w.a & 2)~=0 and mem.u8(u+0x3a) or mem.u8(u+20))+w.m; v.equipmentHit=skl*2+w.h+math.floor(luck/2); v.equipmentCrit=w.c+math.floor(skl/2)+(((char.a & 0x40)~=0) and 15 or 0); v.equipmentAS=as; v.equipmentAvoid=as*2+avoid+luck; v.weaponMight=w.m; v.weaponHit=w.h; v.weaponCrit=w.c; v.weaponWeight=w.w; v.weaponType=({"Sword","Lance","Axe","Bow","Staff","Anima","Light","Dark","Ballista","Item","Dragon"})[w.t+1] or "---"; v.weaponRank=w.n>=251 and "S" or w.n>=181 and "A" or w.n>=121 and "B" or w.n>=71 and "C" or w.n>=31 and "D" or w.n>0 and "E" or "---"; local range=w.g; v.equipmentRange=range==16 and "1–Mag/2" or ((range>>4)==(range&15) and tostring(range&15) or tostring(range>>4).."–"..tostring(range&15)) else v.equipmentAtk="---"; v.equipmentHit="---"; v.equipmentCrit="---"; v.equipmentAS="---"; v.equipmentAvoid="---"; v.equipmentRange="---" end
  local spriteClass=mapMeta.classes[v.classPointer];local spriteFaction=(v.deployment>>6);v.mapSprite=spriteClass and spriteClass.mapSprites[(spriteFaction==1 and 2 or spriteFaction>=2 and 3 or 1)] or ""
  v.aid=math.max(0,((classes[v.classPointer].a & 1)~=0) and (((chars[v.characterPointer].a | classes[v.classPointer].a) & 0x4000)~=0 and 20 or 25)-v.con or v.con-1)
  local fc,fk,fi=D.forecastChars,D.forecastClasses,D.forecastItems
  local show=v.forecastActive; v.forecastActive=false
  local a=33793260; local d=a+128
  if show and mem.u8(a+11)==v.deployment and fc[mem.u32(a)] and fc[mem.u32(d)] and fk[mem.u32(a+4)] and fk[mem.u32(d+4)] and mem.u8(a+18)>0 and mem.u8(d+18)>0 then
    for i=1,2 do local u=i==1 and a or d; local other=i==1 and d or a; local prefix=i==1 and "forecastactor" or "forecasttarget"; local c,k=fc[mem.u32(u)],fk[mem.u32(u+4)]; local item=fi[mem.u16(u+0x4A)%256]; local can=mem.u8(u+0x52)~=0; local speed=mem.s16(u+0x5E); local count=(speed>=mem.s16(other+0x5E)+4 and 2 or 1)*((mem.u32(u+0x4C) & 0x20)~=0 and 2 or 1); local damage=math.max(0,mem.s16(u+0x5A)-mem.s16(other+0x5C)); v[prefix.."Name"]=c.name; v[prefix.."Class"]=k.name; v[prefix.."Portrait"]=c.portrait~="" and c.portrait or k.portrait; v[prefix.."Hp"]=mem.u8(u+0x72); v[prefix.."MaxHp"]=mem.u8(u+18); v[prefix.."Weapon"]=item and item.name or "---"; v[prefix.."Icon"]=item and item.icon or ""; v[prefix.."Damage"]=can and (tostring(damage)..(count>1 and " x"..count or "")) or "---"; v[prefix.."Hit"]=can and mem.s16(u+0x64) or "---"; v[prefix.."Crit"]=can and mem.s16(u+0x6A) or "---"; v[prefix.."AS"]=speed end
    local sides={}; for i=1,2 do local u=i==1 and a or d; local other=i==1 and d or a; local prefix=i==1 and "forecastactor" or "forecasttarget"; local weapon=mem.u16(u+0x4A); if weapon==0 then v[prefix.."Weapon"]="No weapon"; v[prefix.."Icon"]="" end; local attrs=mem.u32(u+0x4C); local item=fi[weapon%256]; local speed=mem.s16(u+0x5E); local count=(speed>=mem.s16(other+0x5E)+4 and 2 or 1)*((attrs & 0x20)~=0 and 2 or 1); local can=mem.u8(u+0x52)~=0; local tri=mem.s8(u+0x54); if tri==0 then tri=mem.s8(u+0x53) end; v[prefix.."Level"]=mem.u8(u+8); v[prefix.."Uses"]=weapon~=0 and ((attrs & 8)~=0 and "--" or tostring(weapon>>8).."/"..tostring(item and item.maxUses or 0)) or "--"; v[prefix.."Mt"]=can and math.max(0,mem.s16(u+0x5A)-mem.s16(other+0x5C)) or "---"; v[prefix.."Multiplier"]=can and count>1 and "×"..count or ""; v[prefix.."HasMulti"]=can and count>1; v[prefix.."Triangle"]=tri>0 and "↑" or tri<0 and "↓" or ""; v[prefix.."Advantage"]=tri>0; v[prefix.."Disadvantage"]=tri<0; sides[i]={hp=mem.u8(u+0x72),max=mem.u8(u+18),speed=speed,can=can,hit=mem.s16(u+0x64),damage=math.max(0,mem.s16(u+0x5A)-mem.s16(other+0x5C)),brave=(attrs & 0x20)~=0,uses=weapon>>8,unbreakable=(attrs & 8)~=0,drain=weapon%256==17 or weapon%256==70} end
    local totals={}; for i=1,2 do local s=sides[i]; local count=(s.speed>=sides[3-i].speed+4 and 2 or 1)*(s.brave and 2 or 1); totals[i]=(s.can and s.hit>0) and math.max(0,s.damage)*math.min(count,s.unbreakable and count or math.max(0,s.uses)) or 0 end; local hp={}; for i=1,2 do local s=sides[i]; hp[i]=math.max(0,math.min(s.max,s.hp+(s.drain and math.min(sides[3-i].hp,totals[i]) or 0)-totals[3-i])) end
    for i=1,2 do local prefix=i==1 and "forecastactor" or "forecasttarget"; local s=sides[i]; local loss=math.max(0,s.hp-hp[i]); v[prefix.."AfterHp"]=hp[i]; v[prefix.."HpLoss"]=loss; v[prefix.."HasLoss"]=loss>0; v[prefix.."HpRemainWidth"]=tostring(math.min(s.max,hp[i])/math.max(1,s.max)*100).."%"; v[prefix.."HpLossWidth"]=tostring(loss/math.max(1,s.max)*100).."%" end
    v.forecastActive=true
  end
  v.ui=v.ui or {};v.ui.set=v.ui.set or {};v.ui.set.companionView=v.forecastActive and "battle" or "companion";if v.forecastActive then v.ui.set.mainTab="Units";v.ui.set.navUnits=true;v.ui.set.navMap=false end
  applyMap(v,v.unitLocked and unit or nil)
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
  applyModSkills(v,unit)
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

local remasterGrowthUpdate=update
function update()
  local v=remasterGrowthUpdate()
  local cp=tonumber(v.characterPointer) or 0
  local kp=tonumber(v.classPointer) or 0
  local c=D.growthCharacters[cp]
  local k=D.growthClasses[kp]
  v.growthPresent=v.unitPresent==true and c~=nil and k~=nil
  v.growthMissing=not v.growthPresent
  v.growthRadar=""
  if not v.growthPresent then return v end
  local promoted=(((D.chars[cp] and D.chars[cp].attributes or 0)|k.attributes)&0x100)~=0
  v.growthTier=promoted and "Đã chuyển chức nghiệp" or "Chưa chuyển chức nghiệp"
  if not (ui and ui.growthPopup==true) then return v end
  v.growthRadar=c.radar
  v.growthUnitName=v.unitName;v.growthClassName=v.className
  v.growthPortrait=v.portrait;v.growthLevel=v.level;v.growthPowerLabel="Str"
  v.growthBonus="Tỷ lệ tăng chỉ số của nhân vật"
  v.growthCalculationNote="Tỷ lệ cơ bản từ ROM, chưa tính bonus skill/vật phẩm."
  local cap=mem.u8(0x08b2a63c+mem.u8(kp+4))
  v.growthLevelCap=cap;v.growthExpLevel=(v.level or 0)+(promoted and 20 or 0)
  v.growthLevelsLeft=math.max(0,cap-(v.level or 0))
  local allowed=(v.deployment or 255)<64 and (v.exp or 255)~=255 and (v.level or cap)<cap
  v.growthExpNeeded=allowed and tostring(100-v.exp) or "---"
  v.growthExpText=allowed and (tostring(v.exp).." / 100 EXP") or "Không thể nhận EXP"
  v.growthExpProgress=allowed and v.exp or 0
  local keys={"Hp","Str","Mag","Skill","Spd","Luck","Def","Res"}
  local values={v.maxHp,v.str,v.mag,v.skill,v.spd,v.luck,v.def,v.res}
  for n,key in ipairs(keys) do
    v["growth"..key]=c.rates[n]
    v["growth"..key.."Current"]=values[n]
    v["growth"..key.."Cap"]=k.caps[n]
  end
  v.growthPower=v.growthStr;v.growthPowerCurrent=v.growthStrCurrent;v.growthPowerCap=v.growthStrCap
  return v
end

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

local fe6SupportById={}
for _,character in pairs(D.chars)do fe6SupportById[character.id]=character end
local fe6SupportUpdate=update
function update()
  local v=fe6SupportUpdate()
  applyFeSupportBindings(v,v.unitPresent and D.slots[v.deployment]or nil,tonumber(v.characterPointer)or 0,fe6SupportById)
  return v
end

-- Read-only Thumb-1 evaluator for the ROM's EXP routine. Writes stay in a
-- private shadow table; no game RAM write API is used. Unsupported code fails.
local function modThumbStart(entry,args,initial,options)
  options=options or {}
  local r={};for n=0,15 do r[n]=0 end
  for n=4,12 do if options.registers and options.registers[n]then r[n]=options.registers[n]&0xffffffff end end
  for n=1,#args do r[n-1]=args[n] end
  r[13]=0x03007e00;r[14]=0x01000001
  local pc=entry & 0xfffffffe;local shadow={};for a,v in pairs(initial or {})do shadow[a]=v end
  local N,Z,C,V=false,false,false,false
  local function byte(a)
    if a>=0x02000000 and a<0x02040000 or a>=0x03000000 and a<0x03008000 then
      if shadow[a]~=nil then return shadow[a]end
      if options.strictStack and a>=0x03007000 and a<0x03007f00 then error(string.format("Unknown caller stack byte: %08X at %08X",a,pc))end
      return options.ramByte and options.ramByte(a)or mem.u8(a)
    end
    if a>=0x08000000 and a<0x0a000000 then return mem.u8(a)end
    error(string.format("EXP read outside supported memory: %08X at %08X",a,pc))
  end
  local function read(a,n)
    if n>1 and a%n~=0 then
      local aligned=read(a&(~(n-1)),n);local shift=(a&(n-1))*8
      return ((aligned>>shift)|(aligned<<(32-shift)))&0xffffffff
    end
    if a>=0x08000000 and a+n<=0x0a000000 then
      if n==2 and a%2==0 then return mem.u16(a)end
      if n==4 and a%4==0 then return mem.u32(a)end
    end
    if n==1 then return byte(a)end
    if n==2 then return byte(a)|(byte(a+1)<<8)end
    return byte(a)|(byte(a+1)<<8)|(byte(a+2)<<16)|(byte(a+3)<<24)
  end
  local function write(a,value,n)
    if n>1 then a=a&(~(n-1))end
    if not(a>=0x02000000 and a+n<=0x02040000 or a>=0x03000000 and a+n<=0x03008000)then error("EXP write outside private RAM shadow")end
    for i=0,n-1 do shadow[a+i]=(value>>(i*8))&255 end
  end
  local function signed(v)return v>=0x80000000 and v-0x100000000 or v end
  local function nz(value)value=value&0xffffffff;N=(value&0x80000000)~=0;Z=value==0;return value end
  local function add(a,b,carry)local full=a+b+(carry or 0);C=full>0xffffffff;local s=signed(a)+signed(b)+(carry or 0);V=s>0x7fffffff or s< -0x80000000;return nz(full)end
  local function sub(a,b,borrow)local full=a-b-(borrow or 0);C=full>=0;local s=signed(a)-signed(b)-(borrow or 0);V=s>0x7fffffff or s< -0x80000000;return nz(full)end
  local function shift(a,n,kind)
    if n==0 then return nz(a) end
    if kind==0 then C=n<=32 and ((a>>(32-n))&1)~=0 or false;return nz(n>=32 and 0 or a<<n)
    elseif kind==1 then C=n<=32 and ((a>>(n-1))&1)~=0 or false;return nz(n>=32 and 0 or a>>n)
    elseif kind==2 then C=n>=32 and (a&0x80000000)~=0 or ((a>>(n-1))&1)~=0;return nz(n>=32 and (signed(a)<0 and 0xffffffff or 0) or math.floor(signed(a)/(2^n)))
    else n=n%32;if n==0 then C=(a&0x80000000)~=0;return nz(a)end;local v=((a>>n)|(a<<(32-n)))&0xffffffff;C=(v&0x80000000)~=0;return nz(v)end
  end
  local function value(n)return n==15 and pc+4 or r[n]end
  local function branch(target)
    if (target&1)==0 then
      -- FE8's interworking veneers contain only LDR ip,[pc]; BX ip.
      -- Resolve this exact trampoline; arbitrary ARM code still fails closed.
      if read(target,4)==0xe59fc000 and read(target+4,4)==0xe12fff1c then return branch(read(target+8,4))end
      error(string.format("EXP ARM branch is not supported: %08X at %08X",target,pc))
    end
    return target&0xfffffffe
  end
  local steps=0
  return function(slice)
  for _=1,slice or 6000 do
    if pc==0x01000000 then return true,r[0],shadow,steps end
    if options.beforeEntry and options.beforeEntry[pc]then options.beforeEntry[pc](r,read,write)end
    steps=steps+1
    if steps>(options.maxSteps or 6000)then error("EXP evaluation limit reached")end
    local op=read(pc,2);local nextpc=pc+2;local d=op&7;local s=(op>>3)&7
    if (op&0xf800)==0x1800 then local b=(op&0x400)~=0 and ((op>>6)&7) or r[(op>>6)&7];r[d]=(op&0x200)~=0 and sub(r[s],b) or add(r[s],b)
    elseif (op&0xe000)==0 then local kind=(op>>11)&3;local n=(op>>6)&31;if kind>0 and n==0 then n=32 end;r[d]=shift(r[s],n,kind)
    elseif (op&0xe000)==0x2000 then local k=(op>>11)&3;d=(op>>8)&7;local b=op&255;if k==0 then r[d]=nz(b)elseif k==1 then sub(r[d],b)elseif k==2 then r[d]=add(r[d],b)else r[d]=sub(r[d],b)end
    elseif (op&0xfc00)==0x4000 then local k=(op>>6)&15;local a,b=r[d],r[s];if k==0 then r[d]=nz(a&b)elseif k==1 then r[d]=nz(a~b)elseif k==2 or k==3 or k==4 then r[d]=shift(a,b&255,k-2)elseif k==5 then r[d]=add(a,b,C and 1 or 0)elseif k==6 then r[d]=sub(a,b,C and 0 or 1)elseif k==7 then r[d]=shift(a,b&255,3)elseif k==8 then nz(a&b)elseif k==9 then r[d]=sub(0,b)elseif k==10 then sub(a,b)elseif k==11 then add(a,b)elseif k==12 then r[d]=nz(a|b)elseif k==13 then r[d]=nz(a*b)elseif k==14 then r[d]=nz(a&(~b))else r[d]=nz(~b)end
    elseif (op&0xfc00)==0x4400 then local k=(op>>8)&3;d=(op&7)+((op>>4)&8);s=(op>>3)&15;if k==0 then local v=(value(d)+value(s))&0xffffffff;if d==15 then nextpc=v&0xfffffffe else r[d]=v end elseif k==1 then sub(value(d),value(s))elseif k==2 then if d==15 then nextpc=value(s)&0xfffffffe else r[d]=value(s)end else nextpc=branch(value(s))end
    elseif (op&0xf800)==0x4800 then r[(op>>8)&7]=read(((pc+4)&0xfffffffc)+(op&255)*4,4)
    elseif (op&0xf000)==0x5000 then local k=(op>>9)&7;local a=(r[s]+r[(op>>6)&7])&0xffffffff;if k==0 then write(a,r[d],4)elseif k==1 then write(a,r[d],2)elseif k==2 then write(a,r[d],1)elseif k==3 then local v=read(a,1);r[d]=(v>=128 and v-256 or v)&0xffffffff elseif k==4 then r[d]=read(a,4)elseif k==5 then r[d]=read(a,2)elseif k==6 then r[d]=read(a,1)else local n=(a&1)~=0 and 1 or 2;local v=read(a,n);local sign=n==1 and 128 or 32768;local wrap=n==1 and 256 or 65536;r[d]=(v>=sign and v-wrap or v)&0xffffffff end
    elseif (op&0xe000)==0x6000 then local n=(op&0x1000)~=0 and 1 or 4;local a=r[s]+((op>>6)&31)*n;if(op&0x800)~=0 then r[d]=read(a,n)else write(a,r[d],n)end
    elseif (op&0xf000)==0x8000 then local a=r[s]+((op>>6)&31)*2;if(op&0x800)~=0 then r[d]=read(a,2)else write(a,r[d],2)end
    elseif (op&0xf000)==0x9000 then d=(op>>8)&7;local a=r[13]+(op&255)*4;if(op&0x800)~=0 then r[d]=read(a,4)else write(a,r[d],4)end
    elseif (op&0xf000)==0xa000 then r[(op>>8)&7]=((op&0x800)~=0 and r[13] or ((pc+4)&0xfffffffc))+(op&255)*4
    elseif (op&0xff00)==0xb000 then r[13]=r[13]+((op&0x80)~=0 and -1 or 1)*(op&127)*4
    elseif (op&0xf600)==0xb400 then local pop=(op&0x800)~=0;local list={};for n=0,7 do if(op&(1<<n))~=0 then list[#list+1]=n end end;if(op&0x100)~=0 then list[#list+1]=pop and 15 or 14 end;if #list==0 then error("Unsupported empty Thumb stack list")end;if pop then for _,n in ipairs(list)do local v=read(r[13]&0xfffffffc,4);r[13]=r[13]+4;if n==15 then nextpc=branch(v)else r[n]=v end end else r[13]=r[13]-#list*4;for i,n in ipairs(list)do write(r[13]+(i-1)*4,r[n],4)end end
    elseif (op&0xf000)==0xc000 then local base=(op>>8)&7;if(op&255)==0 then error("Unsupported empty Thumb register list")end;local a=r[base];local load=(op&0x800)~=0;for n=0,7 do if(op&(1<<n))~=0 then if load then r[n]=read(a&0xfffffffc,4)else write(a,r[n],4)end;a=a+4 end end;if not(load and (op&(1<<base))~=0)then r[base]=a end
    elseif (op&0xff00)==0xdf00 then
      local swi=op&255
      if swi~=6 and swi~=7 then error(string.format("Unsupported EXP software interrupt: %04X at %08X",op,pc))end
      local a,b=signed(r[0]),signed(r[1]);if swi==7 then a,b=b,a end
      if b==0 then error("EXP BIOS division by zero")end
      local q=math.abs(a)//math.abs(b);if (a<0)~=(b<0)then q=-q end
      r[0]=q&0xffffffff;r[1]=(a-q*b)&0xffffffff;r[3]=math.abs(q)&0xffffffff
    elseif (op&0xf000)==0xd000 then local k=(op>>8)&15;if k>=14 then error(string.format("Unsupported EXP software interrupt: %04X at %08X",op,pc))end;local cond={Z,not Z,C,not C,N,not N,V,not V,C and not Z,(not C)or Z,N==V,N~=V,(not Z)and(N==V),Z or(N~=V)};if cond[k+1]then local off=op&255;if off>=128 then off=off-256 end;nextpc=pc+4+off*2 end
    elseif (op&0xf800)==0xe000 then local off=op&2047;if off>=1024 then off=off-2048 end;nextpc=pc+4+off*2
    elseif (op&0xf800)==0xf000 then local off=op&2047;if off>=1024 then off=off-2048 end;r[14]=(pc+4+off*4096)&0xffffffff
    elseif (op&0xf800)==0xf800 then nextpc=(r[14]+(op&2047)*2)&0xfffffffe;r[14]=(pc+2)|1
    else error(string.format("Unsupported EXP instruction: %04X at %08X",op,pc))end
    pc=nextpc
  end
  return false,nil,nil,steps
  end
end
local function modThumbCall(entry,args,initial)
  local done,result=modThumbStart(entry,args,initial)(6001)
  if not done then error("EXP evaluation limit reached")end
  return result
end
local function modCaptureRam()
  local chunks={}
  for n=0,3 do chunks[n]=mem.read(0x02000000+n*65536,65536)end
  local iwram=mem.read(0x03000000,32768)
  return function(a)
    if a>=0x03000000 then return string.byte(iwram,a-0x03000000+1)end
    local offset=a-0x02000000
    return string.byte(chunks[offset//65536],offset%65536+1)
  end
end
local function modExpQueryStart(kill,ramByte)
  local actor,target=0x0203a4ec,0x0203a56c
  -- These cards describe EXP if the unit survives, never the selected
  -- fight's hidden hit/miss/death outcome from the simulation buffers.
  local initial={[actor+0x13]=math.max(1,ramByte(actor+0x72)),[actor+0x7c]=1,[target+0x13]=kill and 0 or math.max(1,ramByte(target+0x13)),[0x0203a4d4]=1,[0x0203a4d5]=0}
  local phases={{0x0802c740,{target}},{0x0802c6ec,{target}},{0x0802b92c,{}}}
  local stage,run=1,nil
  local function begin(shadow)
    return modThumbStart(phases[stage][1],phases[stage][2],shadow,{ramByte=ramByte,strictStack=true,maxSteps=200000,registers={[4]=target,[5]=actor}})
  end
  run=begin(initial)
  return function()
    local done,_,shadow=run(2048)
    if not done then return false end
    if stage<#phases then stage=stage+1;run=begin(shadow);return false end
    return true,{gain=shadow[actor+0x6e]or ramByte(actor+0x6e),leveled=(shadow[actor+8]or ramByte(actor+8))~=ramByte(actor+8)}
  end
end

-- Private experimental adapter. Requires fe6-exp-shadow.lua in the same chunk.
-- The result is conditional on gaining a level, never an EXP/hit/miss result.
-- Validated against one real level-up on Thor. Other encounters remain experimental.
local function modLevelPredictionStart(sharedRam,profileOptions)
  local actor,target=0x0203a4ec,0x0203a56c
  local config=mem.u16(0x0203a4d4)
  if config~=1 and config~=2 then error(string.format("Unverified battle configuration: %04X",config))end
  -- A job spans emulator frames. Freeze its entire RAM baseline once;
  -- live stack/global reads between slices can corrupt the private CPU.
  local ramByte=sharedRam or modCaptureRam()
  local function input(a,n)
    n=n or 1;local v=0;for k=0,n-1 do v=v|(((a+k>=0x08000000 and mem.u8(a+k))or ramByte(a+k))<<(k*8))end;return v
  end
  local initial={[0x0203a4d4]=1,[0x0203a4d5]=0}
  for _,bu in ipairs({actor,target})do
    for n=0,127 do initial[bu+n]=input(bu+n)end
    -- Forecast simulation has already changed HP and weapon durability.
    -- Rewind these private copies to their pre-combat values.
    initial[bu+19]=input(bu+0x72)
    -- Do not re-enable a defender's weapon when the forecast disabled its
    -- counterattack (for example, an axe against a javelin at range two).
    -- Only restore durability for a weapon that is allowed to participate.
    local canUseWeapon=input(bu+0x52)~=0
    initial[bu+0x48]=canUseWeapon and input(bu+0x4a)or 0
    initial[bu+0x49]=canUseWeapon and input(bu+0x4b)or 0
    for n=0x73,0x7d do initial[bu+n]=0 end
  end
  for n=0,5 do initial[0x03000000+n]=input(0x03000000+n)end
  local unitLookup=mem.u32(0x08019440)
  local actorUnit=input(unitLookup+input(actor+11)*4,4)
  local targetUnit=input(unitLookup+input(target+11)*4,4)
  -- Match the ROM's post-calculation call order, including restoring rune
  -- visibility, target equipment and the EXP routine before level-up.
  local phases={
    {entry=0x0802eb10,args={},limit=200000},
    {entry=profileOptions and profileOptions.scriptedBattle and input(0x0203a970,4)~=0 and 0x0802cf4c or 0x0802aed0,args={},limit=1000000},
    {entry=0x0802eb50,args={},limit=200000},
    {entry=0x0802c740,args={target},limit=100000},
    {entry=0x0802c6ec,args={target},limit=100000},
    {entry=0x0802b92c,args={},limit=200000}
  }
  local stage,previousSteps=1,0
  local function begin(shadow)
    local phase=phases[stage]
    local options={maxSteps=phase.limit,ramByte=ramByte,strictStack=true,registers={[4]=target,[5]=actor,[6]=targetUnit,[7]=targetUnit}}
    if stage==6 then
      options.registers[6]=actorUnit
      -- Hypothetical level-up only. The actual fight's hit/miss and EXP
      -- outcome are not exposed. No combat, skill or RNG call is skipped.
      options.beforeEntry={
      [0x0802b92c]=function(registers,read,write)
        -- Conditional results assume the actor survives. Restore only this
        -- private post-combat HP after every combat/RNG call has completed;
        -- otherwise a simulated death silently bypasses the level-up hook.
        if read(actor+19,1)==0 then write(actor+19,1,1)end
      end,
      [0x0802ba28]=function(registers,read,write)
        if registers[0]==actor and read(actor+9,1)<100 then write(actor+9,100,1)end
      end}
    end
    return modThumbStart(phase.entry,phase.args,shadow,options)
  end
  local run=begin(initial)
  local function progress(steps)
    if stage==1 then return 0 end
    if stage==2 then return 5+math.min(64,math.floor(steps*64/50000))end
    if stage<6 then return 69+(stage-2)*2 end
    return 76+math.min(23,math.floor(steps*23/40000))
  end
  return function()
    local remaining=2048
    while remaining>0 do
      local done,_,shadow,steps=run(remaining)
      remaining=remaining-(steps-previousSteps);previousSteps=steps
      if not done then return false,nil,progress(steps)end
      if stage==#phases then
        local result={}
        for n,offset in ipairs({0x73,0x74,0x7a,0x75,0x76,0x79,0x77,0x78})do result[n]=shadow[actor+offset]or input(actor+offset)end
        return true,result,100
      end
      stage=stage+1;previousSteps=0;run=begin(shadow)
    end
    return false,nil,progress(previousSteps)
  end
end

local modAnalysisUpdate=update
local modRngAnchor=nil
local modAnalysisCache={key=nil}
local modAnalysisTick=0
function update()
  modAnalysisTick=modAnalysisTick+1
  local v=modAnalysisUpdate()
  local key=string.format("%04X %04X %04X",mem.u16(0x03000000),mem.u16(0x03000002),mem.u16(0x03000004))
  if not modRngAnchor then modRngAnchor=key end
  if ui and (ui.rngAck==true or ui.predictionPopup==true) then
    modRngAnchor=key
    if ui.rngAck==true then v.ui=v.ui or {};v.ui.set=v.ui.set or {};v.ui.set.rngAck=false end
  end
  v.rngStateChanged=key~=modRngAnchor;v.rngStateKey=key
  v.analysisPresent=v.forecastActive==true
  v.analysisMissing=not v.analysisPresent
  v.analysisReady=false;v.analysisFailed=false
  v.predictionAvailable=false;v.predictionComplete=false;v.predictionProgress=0
  v.predictionBusy=false
  if not v.analysisPresent then modAnalysisCache={key=nil};return v end
  local actor,target=0x0203a4ec,0x0203a56c
  local bytes={}
  for n=0,127 do bytes[#bytes+1]=string.char(mem.u8(actor+n));bytes[#bytes+1]=string.char(mem.u8(target+n))end
  local signature=table.concat(bytes)
  signature=signature..key
  -- Learned skills and nearby units may change without changing the two
  -- battle buffers (for example after loading a different save state).
  signature=signature..mem.read(0x03004e50,4)..mem.read(0x0203a958,0x20)..mem.read(0x0203a4d4,0x18)..mem.read(0x0202be4c,0x2688)..mem.read(0x0203e884,0x470)
  -- EXP also depends on chapter mode/flags and BmSt.gameStateBits.
  -- Exclude the PlaySt clocks and BmSt cursor/camera/frame counters: those
  -- advance while a forecast is unchanged and would continually restart jobs.
  signature=signature..mem.read(0x0202bcfe,0x0e)..string.char(mem.u8(0x0202bcb4))
  if modAnalysisCache.key~=signature then
    local ram=modCaptureRam()
    modAnalysisCache={key=signature,ramByte=ram,query=modExpQueryStart(false,ram),queryStage=1}
  end
  local c=modAnalysisCache
  if c.query then
    local ok,done,result=pcall(c.query)
    if not ok then c.ok=false;c.query=nil;c.predictionError=tostring(done)
    elseif done then
      if c.queryStage==1 then
        c.damageResult=result;c.damage=result.gain;c.queryStage=2;c.query=modExpQueryStart(true,c.ramByte)
      else
        c.killResult=result;c.kill=result.gain;c.query=nil;c.ok=true
      end
    end
  end
  if c.query then
    v.predictionBusy=true;v.predictionProgress=c.queryStage==1 and 1 or 3
    v.analysisPredictionContext="Đang tính EXP nếu nhân vật còn sống…"
    return v
  end
  c.age=(c.age or 0)+1
  v.analysisReady=c.ok;v.analysisFailed=not c.ok
  if not c.ok then v.analysisPredictionError=c.predictionError end
  if c.ok then
    v.analysisDamageExp=c.damage;v.analysisKillExp=c.kill
    local exp=mem.u8(actor+9)
    v.analysisCurrentExp=exp
    v.predictionDamageEligible=c.damageResult.leveled==true
    v.predictionKillEligible=c.killResult.leveled==true
    v.analysisExpSummary=string.format("Hiện tại %d/100 EXP · Gây sát thương: %d/100 · Hạ đối thủ: %d/100",exp,exp+c.damage,exp+c.kill)
    v.analysisLevelSummary=(exp+c.damage>=100 and "Gây sát thương: đủ EXP lên cấp." or "Gây sát thương: chưa đủ EXP lên cấp.").." "..(exp+c.kill>=100 and "Hạ đối thủ: đủ EXP lên cấp." or "Hạ đối thủ: chưa đủ EXP lên cấp.")
    v.growthUnitName=v.unitName;v.growthPortrait=v.portrait;v.growthLevel=mem.u8(actor+8)
    v.growthExpText=tostring(exp).." / 100 EXP";v.growthPowerLabel="Str"
    v.rngExpHit=c.damage;v.rngExpKill=c.kill;v.rngSeed="RNG "..key
    local keys={"Hp","Power","Mag","Skill","Spd","Luck","Def","Res"}
    local offsets={18,20,0x3a,21,22,25,23,24}
    for n,k in ipairs(keys)do v["growth"..k.."Current"]=mem.u8(actor+offsets[n]);v["rng"..k.."Gain"]=0 end
    local kp=mem.u32(actor+4)
    local cap=mem.u8(0x08b2a63c+mem.u8(kp+4))
    local eligible=c.damageResult.leveled or c.killResult.leveled
    v.predictionComplete=not eligible
    v.analysisPredictionContext=eligible and "Đang phân tích chỉ số nếu lên cấp…" or "Trận này chưa đủ EXP để lên cấp"
    if eligible then
      v.predictionProgress=5
      v.predictionBusy=not c.gains and not c.predictionFailed
      if not c.prediction and not c.predictionFailed then
        -- Warm the result while the forecast is visible. A closed popup
        -- waits for a stable forecast before allocating its RAM snapshot.
        if c.age<2 and not(ui and ui.predictionPopup==true)then return v end
        local ok,job=pcall(modLevelPredictionStart,c.ramByte)
        if ok then c.prediction=job;return v else c.predictionFailed=true;c.predictionError=tostring(job) end
      end
      if c.prediction and not c.gains then
        c.workTicks=(c.workTicks or 0)+1
        local ok,done,gains,progress=pcall(c.prediction)
        if ok then c.progress=progress or c.progress or 0 end
        if not ok then c.predictionFailed=true;c.predictionError=tostring(done);c.prediction=nil elseif done then c.gains=gains end
      end
      v.analysisPredictionTicks=c.workTicks or 0
      v.predictionProgress=5+math.floor((c.progress or 0)*94/100)
      if c.gains then
        v.analysisPredictionContext="Dự đoán chỉ số nếu đủ EXP lên cấp"
        v.predictionAvailable=true;v.predictionComplete=true
        for n,k in ipairs(keys)do v["rng"..k.."Gain"]=c.gains[n] end
      elseif c.predictionFailed then v.predictionBusy=false;v.analysisPredictionContext="Chưa hỗ trợ dự đoán tình huống này";v.analysisPredictionError=c.predictionError end
    end
  end
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
