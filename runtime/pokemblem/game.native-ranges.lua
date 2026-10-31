-- Exact Pokemblem native movement and complete attack generation on private RAM.
-- The initializer and origin clear reproduce the native range caller's ABI.
-- The Map owner prevalidates every live range row before creating a query.
local function ram(address,length)
  return address>=0x02000000 and address+length<=0x02040000
    or address>=0x03000000 and address+length<=0x03008000
end
local function word(read,address)
  return read(address)|(read(address+1)<<8)|(read(address+2)<<16)|(read(address+3)<<24)
end
local function extract(read,width,height)
  local section,x,y,rows,row,bytes,result=1,0,0,nil,nil,{},{}
  return function(budget)
    local used=0
    while used<budget and section<=2 do
      if not rows then
        rows=word(read,section==1 and 0x0202E4E0 or 0x0202E4E4)
        assert(ram(rows,height*4),"Invalid Pokemblem native grid table")
      end
      if x==0 then row=word(read,rows+y*4);assert(ram(row,width),"Invalid Pokemblem native grid row")end
      bytes[#bytes+1]=string.char(read(row+x));x=x+1;used=used+1
      if x==width then
        x=0;y=y+1
        if y==height then
          result[section==1 and "movement" or "attack"]=table.concat(bytes)
          section=section+1;x=0;y=0;rows=nil;bytes={}
        end
      end
    end
    return section>2,result,used
  end
end
return function(D,query)
  return function(unit,width,height)
    local phases={
      {entry=0x0801A38C,args={unit},key="movement",after=function(value,shadow,read)
        local x,y=read(unit+16),read(unit+17)
        assert(x<width and y<height,"Pokemblem range origin left the map")
        local rows=word(read,0x0202E4D8);assert(ram(rows,height*4),"Invalid Pokemblem unit table")
        local row=word(read,rows+y*4);assert(ram(row,width),"Invalid Pokemblem unit row")
        shadow[row+x]=0 -- Native caller removes only this origin before attack generation.
        return value
      end},
      {entry=0x080197E4,key="fill",args=function(read)return {word(read,0x0202E4E4),0}end},
      {entry=0x0801B998,key="working",args=function(read)return {word(read,0x0202E4E4)}end},
      {entry=0x0801ACBC,args={unit},key="grids",transform=function(_,shadow,read)return extract(read,width,height)end},
    }
    local value=query.request("ranges:"..unit..":"..width..":"..height,phases,{initialize=function(shadow,read)
      assert(ram(unit,0x48) and D.slots[read(unit+11)]==unit,"Invalid Pokemblem range unit")
      assert((read(0x0202E4D4)|(read(0x0202E4D5)<<8))==width,"Pokemblem range width changed")
      assert((read(0x0202E4D6)|(read(0x0202E4D7)<<8))==height,"Pokemblem range height changed")
      for n=0,3 do shadow[0x03004E50+n]=(unit>>(n*8))&255 end
    end})
    return value and value.grids
  end
end
