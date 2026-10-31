import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {luaFactory} from '../scripts/runtime-validation-engine.mjs';
const files={fe7:'runtime/fe7-vietnamese/game.map.lua',fe8:'runtime/shared/game.fe8-map.lua',remastered:'runtime/fe6-remastered/game.map.lua'};
const picks=fs.readFileSync('runtime/shared/presentation.map-picks.lua','utf8');
const chapter=fs.readFileSync('runtime/shared/presentation.chapter.lua','utf8');
const adapter=fs.readFileSync('runtime/fe6-english/game.memory.lua','utf8');
async function run(body,{fe6=false,explicitMemory=false,family='fe7',byteReference=false}={}){
 let source=fs.readFileSync(files[family],'utf8');
 if(byteReference)source=source.replace(/for n = 0, 71, 4 do\s+local word = mem\.u32\(unit\.u \+ n\)\s+parts\[#parts \+ 1\] = string\.char\(word[^\n]+\)\s+end/,
  'for n = 0, 71 do parts[#parts + 1] = string.char(mem.u8(unit.u + n)) end');
 source=source.replace('local parts = {','__inDangerKey = true; local parts = {')
  .replace('local key = table.concat(parts)','local key = table.concat(parts); __inDangerKey = false; __lastDangerKey = key');
 const e=await luaFactory().createEngine();try{return await e.doString(`
 ui={mainTab='Map',mapDangerEnabled=true};actions={};local bytes={};local byteReads,wordReads,chars=0,0,0
 local function put(a,v,n)for j=0,(n or 4)-1 do bytes[a+j]=(v>>(j*8))&255 end end
 local function get(a,n)local v=0;for j=0,n-1 do v=v|((bytes[a+j]or 0)<<(j*8))end;return v end
 local slots={[1]=0x02020000,[129]=0x02020048}
 local function inUnits(a)return a>=slots[1]and a<slots[129]+72 end
 local function keyCaller()return __inDangerKey==true end
 mem={u8=function(a)if inUnits(a)and keyCaller()then byteReads=byteReads+1 end;return get(a,1)end,
  u16=function(a)return get(a,2)end,u32=function(a)if inUnits(a)and keyCaller()then wordReads=wordReads+1 end;return get(a,4)end,
  s8=function(a)local v=get(a,1);return v>=128 and v-256 or v end}
 local originalChar=string.char;string.char=function(...)if __inDangerKey then chars=chars+1 end;return originalChar(...)end
 local p={mapWidth=0x02000010,mapHeight=0x02000012,terrainRows=0x02000020,unitRows=0x02000024,
  cursorX=0x02000030,cursorY=0x02000032,chapter=0x02000034,turn=0x02000036,battleActor=0x02030000,battleTarget=0x02030100}
 put(p.mapWidth,10,2);put(p.mapHeight,8,2);put(p.cursorX,1,2);put(p.cursorY,1,2);put(p.terrainRows,0x02000400);put(p.unitRows,0x02000600)
 for y=0,7 do put(0x02000400+y*4,0x02001000+y*10);put(0x02000600+y*4,0x02002000+y*10)
  for x=0,9 do put(0x02001000+y*10+x,1,1)end end
 local costs,zero={},{};for n=1,65 do costs[n]=1;zero[n]=0 end
 local c={[0x08001000]={name='Unit',portrait='',attributes=0}}
 local k={[0x08002000]={name='Class',portrait='',attributes=0,move=2,movementCosts={costs,costs,costs},defense=zero,avoid=zero,resistance=zero}}
 local D={chars=c,classes=k,fe8Chapters={},slots=slots,validSlots={[slots[1]]=1,[slots[129]]=129},mapRecipe={},mapWeapons={[1]={a=1,r=0,t=0,rank=1,range=0x11,name='Spear',icon='',maxUses=20}},
  mapMeta={chars=c,classes=k,chapters={},terrains={'Void','Plain'},defaultClass=0x08002000,ballistaCosts=costs}}
 for id,u in pairs(slots)do
  for n=0,71 do put(u+n,(n*131+13)%256,1)end
  put(u,0x08001000);put(u+4,0x08002000);put(u+11,id,1);put(u+12,0,${fe6?2:4})
  put(u+${fe6?14:16},id==1 and 1 or 4,1);put(u+${fe6?15:17},id==1 and 1 or 4,1)
  put(u+${fe6?16:18},20,1);put(u+${fe6?17:19},20,1);put(u+${fe6?26:29},0,1);put(u+${fe6?46:48},0,1)
  for n=0,4 do put(u+${fe6?28:30}+n*2,n==0 and 0x1401 or 0,2)end;put(u+${fe6?38:40},1,1)
  for _,off in ipairs({52,56,60,64})do put(u+off,({0x7FFFFFFF,0x80000000,0xFFFFFFFF,0x01020304})[(off-52)//4+1])end
  put(0x02002000+(id==1 and 1 or 4)*10+(id==1 and 1 or 4),id,1)
 end
 pack={require=function(n)if n=='game.profile'then return p end;if n=='presentation.chapter'then return(function()${chapter}\nend)()end
  if n=='presentation.map-picks'then return(function()${picks}\nend)()end;error(n)end}
 local memory=${fe6?`(function()${adapter}\nend)()(D)`:explicitMemory?'mem':'nil'}
 local read=memory or mem
 local map=(function()${source}\nend)()(D,memory,function()return 1 end);map.config.respectAiHold=false
 local function expectedKey()
  local parts={'10',':','8',':',tostring(get(p.chapter,1)),':',tostring(get(0x0202BC0D,1)),'true','false'}
  for y=0,7 do for x=0,9 do parts[#parts+1]=originalChar(get(0x02001000+y*10+x,1),get(0x02002000+y*10+x,1))end end
  for id=1,255 do local u=slots[id]
   if u and c[read.u32(u)]and k[read.u32(u+4)]and read.u8(u+19)>0 and(read.u32(u+12)&0x1000c)==0 then
    parts[#parts+1]=originalChar(id);for n=0,71 do parts[#parts+1]=originalChar(read.u8(u+n))end
   end
  end
  return table.concat(parts)
 end
 local function tick()
  byteReads,wordReads,chars=0,0,0;local v={};map.apply(v,nil,false)
  local counts={bytes=byteReads,words=wordReads,chars=chars}
  assert(__lastDangerKey==expectedKey(),'Danger key no longer matches the original byte sequence')
  return {v=v,counts=counts,key=__lastDangerKey}
 end
 ${body}`);}finally{e.global.close();}}

for(const family of Object.keys(files))test(family+' raw Danger key keeps all72bytes but uses18alignedword reads per live unit',async()=>{
 const r=await run('local a=tick();local b=tick();return {a=a.counts,b=b.counts,ready=b.v.mapDangerReady,danger=b.v.mapDangerCount}',{family});
 assert.deepEqual(r.a,{bytes:0,words:36,chars:118});assert.deepEqual(r.b,r.a);
 assert.equal(r.ready,true);assert(r.danger>0);
});

for(const family of Object.keys(files))test(family+' high-bit words and a mutation of any byte preserve the exact original binary key and invalidate it',async()=>{
 const r=await run(`local first=tick();local changed=0
  for offset=0,71 do
   local address=slots[129]+offset;local old=get(address,1);put(address,old~1,1)
   local current=tick();assert(current.key~=first.key,'byte mutation did not invalidate '..offset);changed=changed+1
   put(address,old,1);assert(tick().key==first.key)
  end
  return {changed=changed}`,{family});
 assert.equal(r.changed,72);
});

test('explicit read adapters retain byte-accurate key semantics, including native FE6 offset remapping',async()=>{
 const r=await run('local a=tick();local b=tick();return {a=a.counts,b=b.counts,ready=b.v.mapDangerReady}',{fe6:true});
 assert.equal(r.a.bytes,144);assert.equal(r.a.words,0);assert.equal(r.b.bytes,144);assert.equal(r.ready,true);
});

for(const family of Object.keys(files))test(family+' word batching and the original byte loop publish identical full Map outputs across live changes',async()=>{
 const body=`local rows={tick().v,tick().v}
  put(slots[129]+19,7,1);rows[#rows+1]=tick().v
  put(slots[129]+12,0x200);rows[#rows+1]=tick().v
  put(0x02001000+1*10+2,2,1);rows[#rows+1]=tick().v
  put(slots[129]+12,0);put(slots[129]+30,0,2);rows[#rows+1]=tick().v
  return rows`;
 assert.deepEqual(await run(body,{family}),await run(body,{family,byteReference:true}));
});
