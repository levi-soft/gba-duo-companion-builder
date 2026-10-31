-- Verified native totals for new opt-in readers, including stat/prep menus.
local profile=pack.require("game.profile")
return function(D)
  local lastIdentity,lastMove
  return function(v)
    if D.nativeMovementVerified~=true or not D.mapMoveForUnit then return v end
    local unit=v.unitPresent and D.slots[v.deployment]
    if not unit then
      lastIdentity,lastMove=nil,nil
      v.nativeMovePending=false;v.nativeMoveStale=false;v.nativeMoveTotal=nil
      if v.unitPresent then v.move="---" end
      return v
    end
    local identity=table.concat({tostring(unit),tostring(v.characterPointer),tostring(v.classPointer),
      tostring(profile.chapter and mem.u8(profile.chapter) or 0)},":")
    if identity~=lastIdentity then lastIdentity,lastMove=identity,nil end
    local move=D.mapMoveForUnit(unit)
    v.nativeMovePending=type(move)~="number"
    if not v.nativeMovePending then lastMove=move end
    v.nativeMoveStale=v.nativeMovePending and lastMove~=nil
    v.nativeMoveTotal=lastMove;v.move=lastMove or "---"
    return v
  end
end
