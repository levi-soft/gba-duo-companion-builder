-- Author font icons: Text/ParseDefinitions.txt, Pokemblem commit 46eb3c06cbc5811206a0980c82bf7451fcfb1e50.
-- Convert display strings only; cached ROM tables and game values stay intact.
local icons={
  ["ޅ"]="[Lock]",["ᢰ"]="[Water]",["ᢱ"]="[Bug]",["ᢲ"]="[Dragon]",
  ["ᢳ"]="[Electric]",["ᢴ"]="[Fighting]",["ᢵ"]="[Fire]",["ᢶ"]="[Ghost]",
  ["ᢷ"]="[Grass]",["ᢸ"]="[Ground]",["ᢹ"]="[Ice]",["ᢺ"]="[Normal]",
  ["ᢾ"]="[Poison]",["ᢿ"]="[Psychic]",["ᣀ"]="[Rock]",["ᣁ"]="[Flying]",["ᣂ"]="[Steel]"
}
local fields={}
for n=1,6 do
  for _,prefix in ipairs({"nativeSkill","skill"})do
    fields[#fields+1]=prefix..n.."Name"
    fields[#fields+1]=prefix..n.."Description"
  end
end
for n=1,5 do
  for _,suffix in ipairs({"Name","Description","Stats"})do fields[#fields+1]="pokeMove"..n..suffix end
  fields[#fields+1]="item"..n.."Description"
end
local function readable(value)
  if value=="" then return value end
  for icon,label in pairs(icons)do
    if value:find(icon,1,true) then
      value=value:gsub("()"..icon.."()",function(first,after)
        local left=first>1 and not value:sub(first-1,first-1):match("%s") and " " or ""
        local right=after<=#value and not value:sub(after,after):match("%s") and " " or ""
        return left..label..right
      end)
    end
  end
  return value
end
return function(v)
  for _,key in ipairs(fields)do
    if type(v[key])=="string" then v[key]=readable(v[key]) end
  end
  return v
end
