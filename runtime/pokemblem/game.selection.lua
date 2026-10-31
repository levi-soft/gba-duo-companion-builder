-- Companion-only selection for free movement. Never writes game RAM or input.
local selectMapUnit = pack.require("game.companion-selection")
return function(D, profile, unit, v, preparationsActive)
  unit = selectMapUnit(D, profile, unit, v, preparationsActive)
  if v.companionPicked then return unit end
  if preparationsActive or v.unitLocked or v.forecastActive then return unit end
  local width,height=mem.u16(profile.mapWidth),mem.u16(profile.mapHeight)
  local cx,cy=mem.u16(profile.cursorX),mem.u16(profile.cursorY)
  local rows=mem.u32(profile.unitRows)
  if width==0 or height==0 or width>512 or height>512
    or rows<0x02000000 or rows+height*4>0x02040000 then return unit end
  local function visible(id)
    if type(id)~="number" or id%1~=0 or id<1 or id>255 then return nil end
    local candidate=D.slots[id]
    if not candidate or candidate<0x02000000 or candidate+72>0x02040000 then return nil end
    local character,class=mem.u32(candidate),mem.u32(candidate+4)
    if not D.chars[character] or not D.classes[class] or mem.u8(candidate+19)==0
      or (mem.u32(candidate+12)&0x1020C)~=0 then return nil end
    local x,y=mem.u8(candidate+16),mem.u8(candidate+17)
    if x>=width or y>=height then return nil end
    local row=mem.u32(rows+y*4)
    if row<0x02000000 or row+width>0x02040000 or mem.u8(row+x)~=id then return nil end
    return candidate
  end
  -- Avatar classes have a placeholder name in this exact ROM; they are not
  -- creatures. Show a visible party member while the avatar moves freely.
  local class=unit and D.classes[mem.u32(unit+4)]
  if unit and mem.u8(unit+11)<64 and class and class.name=="--" then
    local freeMovement=(mem.u8(0x030017A7)&1)~=0
    if not freeMovement and profile.processPool then
      for n=0,63 do
        local proc=profile.processPool+n*108
        local script,pc=mem.u32(proc),mem.u32(proc+4)
        if (script==0x0969B044 or script==0x0969B004 or script==0x0969B024)
          and pc>=script+8 and pc<script+0x600 then
          freeMovement=true
          break
        end
      end
    end
    -- A tactical cursor on the avatar must retain that native unit after a
    -- companion pick's one-shot context clears during cursor navigation.
    if not freeMovement then return unit end
    for id=1,63 do
      local candidate=visible(id)
      local species=candidate and D.classes[mem.u32(candidate+4)]
      if candidate and species.name~="--" then v.partyFocus=true;return candidate end
    end
  end
  return unit
end
