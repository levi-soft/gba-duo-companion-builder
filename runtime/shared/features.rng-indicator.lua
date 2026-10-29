-- Observes the game-owned RN seed; independent of prediction support and selection.
return function()
  local anchor=nil
  return function(v)
    local key=string.format("%04X %04X %04X",mem.u16(0x03000000),mem.u16(0x03000002),mem.u16(0x03000004))
    anchor=anchor or key
    if ui and (ui.rngAck==true or ui.predictionPopup==true) then
      anchor=key
      if ui.rngAck==true then
        v.ui=v.ui or {};v.ui.set=v.ui.set or {};v.ui.set.rngAck=false
      end
    end
    v.rngStateKey=key
    v.rngStateTracking=true
    v.rngStateChanged=key~=anchor
    v.rngLedFlash=v.rngStateChanged
    v.rngStateText=v.rngStateChanged and "RNG changed since the last recorded state" or "RNG unchanged since the last recorded state"
    return v
  end
end
