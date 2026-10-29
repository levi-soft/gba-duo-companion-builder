-- Exact-ROM move slots and equipped accessory flags; presentation is read-only.
return function(D)
  return function(v)
    local unit=v.unitPresent and D.slots[v.deployment] or nil
    for n=1,5 do
      local id=unit and mem.u8(unit+0x27+n) or 0
      local move=id~=0 and D.forecastItems[id] or nil
      local key="pokeMove"..n
      v[key.."Id"]=id;v[key.."Present"]=move~=nil
      v[key.."Name"]=move and move.name or "---"
      v[key.."Description"]=move and move.description or "No move in this slot."
      v[key.."Stats"]=move and ("Might "..move.might.." | Hit "..move.hit.." | Weight "..move.weight) or ""
      local raw=unit and mem.u16(unit+0x1C+n*2) or 0
      local item=D.forecastItems[raw&255]
      local accessory=item and (item.attributes&0x00400000)~=0 or false
      local held=accessory and (raw&0x8000)~=0
      local inventory="item"..n
      v[inventory.."AccessoryEquipped"]=held
      v[inventory.."HasRank"]=false;v[inventory.."Rank"]=""
      if accessory then
        local uses=(raw>>8)&0x7F
        v[inventory.."Uses"]=uses
        v[inventory.."UsesDisplay"]=(item.attributes&8)~=0 and "--" or uses
        v[inventory.."Badge"]=held and "H" or ""
        v[inventory.."Description"]=item.description..(held and " Held accessory." or "")
      end
    end
    -- These bytes store five move IDs; FE weapon-rank letters are meaningless.
    for _,key in ipairs({"Sword","Lance","Axe","Bow","Staff","Anima","Light","Dark"})do
      v["rank"..key]="---";v["rank"..key.."Progress"]=0;v["rank"..key.."ProgressMax"]=1
    end
    return v
  end
end
