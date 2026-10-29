-- Match verified GetUnitAid (08018450): mounted/gender attributes, not base Con.
return function(D)
  return function(v)
    if v.unitPresent then
      local c=D.mapMeta.chars[v.characterPointer]
      local k=D.mapMeta.classes[v.classPointer]
      local attributes=c.attributes | k.attributes
      if (attributes & 1)==0 then
        v.aid=v.con-1
      else
        v.aid=((attributes & 0x4000)~=0 and 20 or 25)-v.con
      end
    end
    return v
  end
end
