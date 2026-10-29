-- Companion-only selection for free movement. Never writes game RAM or input.
return function(D, profile, unit, v, preparationsActive)
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
  local context=tostring(mem.u8(profile.chapter))..":"..tostring(mem.u16(profile.turn))..":"..tostring(cx)..":"..tostring(cy)
  if ui and ui.mapPickedContext==context then
    local picked=visible(tonumber(ui.mapPickedId))
    if picked then v.companionPicked=true;return picked end
  end
  -- Avatar classes have a placeholder name in this exact ROM; they are not
  -- creatures. Show a visible party member while the avatar moves freely.
  local class=unit and D.classes[mem.u32(unit+4)]
  if unit and mem.u8(unit+11)<64 and class and class.name=="--" then
    for id=1,63 do
      local candidate=visible(id)
      local species=candidate and D.classes[mem.u32(candidate+4)]
      if candidate and species.name~="--" then v.partyFocus=true;return candidate end
    end
  end
  return unit
end
