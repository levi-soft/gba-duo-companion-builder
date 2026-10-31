import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProject} from '../scripts/runtime-validation-engine.mjs';

const encode=source=>Buffer.from(source).toString('base64');

test('native range recipes project only private bytes and extract compact grids after bounded ARM phases',async()=>{
  const ew=Buffer.alloc(0x40000);ew[0x10]=3;ew[0x20]=5;
  const files={
    'main.lua':encode(`
      local query=pack.require('features.native-map-query')({allowArm=true,maxSteps=50000})
      local phases={
        {entry=1,key='movement',args=function(read,shadow)
          assert(shadow[0x02000030]==99);return {read(0x02000020)}
        end,after=function(value,shadow,read)
          assert(value==8 or value==9);shadow[0x02000030]=read(0x02000010)+5;return value
        end},
        {entry=2,key='grids',args=function(read)return {read(0x02000030)}end,
          after=function(_,shadow,read)return {movement=string.char(read(0x02000041))}end}
      }
      function update()
        query.begin()
        local value=query.request('range',phases,{initialize=function(shadow,read)
          initializations=(initializations or 0)+1
          shadow[0x02000030]=99;shadow[0x02000040]=read(0x02000010)
        end})
        local used=query.step(2)
        return {byte=value and value.grids.movement:byte(1),used=used,starts=starts or 0,
          initializations=initializations,ready=query.ready()}
      end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.thumb.lua':encode(`return {start=function(entry,args,shadow,options)
      assert(options.allowArm==true and options.maxSteps==50000 and options.strictStack==true)
      starts=(starts or 0)+1
      return function(budget)
        assert(budget==2)
        if entry==1 then return true,shadow[0x02000040]+args[1],shadow,2,options.busContext end
        assert(entry==2);shadow[0x02000041]=args[1]
        return true,0,shadow,2,options.busContext
      end
    end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
    {expect:{byte:undefined,used:2,starts:1,initializations:1,ready:false}},
    {expect:{byte:undefined,used:2,starts:2,initializations:1,ready:true}},
    {expect:{byte:8,used:0,starts:2,initializations:1,ready:true}},
    {patches:[{address:0x02000041,bytes:[123]}],expect:{byte:8,used:0,starts:2}},
    {patches:[{address:0x02000010,bytes:[4]}],expect:{byte:undefined,used:2,starts:3,initializations:2,ready:false}},
    {expect:{byte:undefined,used:2,starts:4,initializations:2,ready:true}},
    {expect:{byte:9,used:0,starts:4,initializations:2,ready:true}}
  ]});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('Pokemblem private ranges for injected legacy UI picks retain pending, fog and mode guards',async()=>{
  const ew=Buffer.alloc(0x40000),iw=Buffer.alloc(0x8000),base=0x02000000;
  const put=(address,value)=>ew.writeUInt32LE(value,address-base);
  const units={2:0x02001000,129:0x02001100,130:0x02001200};
  ew.writeUInt16LE(3,0x2E4D4);ew.writeUInt16LE(1,0x2E4D6);ew.writeUInt16LE(1,0x2BCF8);
  for(const [global,table,row]of [[0x0202E4D8,0x02002000,0x02002020],[0x0202E4DC,0x02002100,0x02002120],[0x0202E4E0,0x03001000,0x03001010],[0x0202E4E4,0x03001100,0x03001110]]){
    put(global,table);if(table<0x03000000)put(table,row);else iw.writeUInt32LE(row,table-0x03000000);
  }
  ew.set([2,129,130],0x2020);ew.set([1,1,1],0x2120);
  for(const [idText,unit]of Object.entries(units)){
    const id=Number(idText);put(unit,0x08001000);put(unit+4,0x08002000);
    ew[unit-base+11]=id;ew[unit-base+16]=id===2?0:id===129?1:2;ew[unit-base+18]=20;ew[unit-base+19]=20;
  }
  put(0x02024E68,0x0859AAD8);put(0x02024E6C,0x0859AB58);
  const files={
    'main.lua':encode(`
      local character={name='Fixture',portrait='',attributes=0}
      local class={name='Species',portrait='',mapSprites={'','',''},attributes=0,move=6,movementCosts={{1},{1},{1}}}
      local chars,classes={[0x08001000]=character},{[0x08002000]=class}
      local D={chars=chars,classes=classes,slots={[2]=${units[2]},[129]=${units[129]},[130]=${units[130]}},
        mapMeta={chars=chars,classes=classes,ballistaCosts={1}},mapWeapons={},fe8Chapters={}}
      local map=pack.require('game.map')(D)
      function update()
        work=0;local v={unitPresent=true,deployment=2};map.apply(v,nil,false)
        assert(work<=512,'Header and private range jobs must share one slice')
        v.nativeWork=work;return v
      end
    `),
    'game.profile.lua':encode('return {mapWidth=0x0202E4D4,mapHeight=0x0202E4D6,unitRows=0x0202E4D8,terrainRows=0x0202E4DC,cursorX=0x0202BCC4,cursorY=0x0202BCC6,chapter=0x0202BCFE,turn=0x0202BCF8}'),
    ...Object.fromEntries(['game.map','game.native-ranges'].map(name=>[name+'.lua',encode(fs.readFileSync('runtime/pokemblem/'+name+'.lua','utf8'))])),
    ...Object.fromEntries(['game.fe8-map','features.native-map-query','game.snapshot','presentation.chapter','presentation.map-picks'].map(name=>[name+'.lua',encode(fs.readFileSync('runtime/shared/'+name+'.lua','utf8'))])),
    // This isolated private-range fixture has no verified live-cursor contract.
    // Keep the real action dependency, fail closed if its legacy focus step is
    // reached, and leave physical tap acceptance to the dedicated action tests.
    'game.cursor-focus.lua':encode(fs.readFileSync('runtime/shared/game.cursor-focus.lua','utf8')),
    'game.cursor-profile.lua':encode('return {version=0,kind="unsupported"}'),
    'features.thumb.lua':encode(`return {start=function(entry,args,shadow,options)
      assert(options.allowArm==true and options.maxSteps==2000000)
      local total=0
      local function read(a)return shadow[a]~=nil and shadow[a]or options.ramByte(a)end
      local function word(a)return read(a)|(read(a+1)<<8)|(read(a+2)<<16)|(read(a+3)<<24)end
      return function(budget)
        local used=math.min(600-total,budget);work=work+used;total=total+used
        if total<600 then return false,nil,shadow,total,options.busContext end
        local unit=args[1]
        if entry==0x08019224 then return true,6,shadow,total,options.busContext end
        if entry==0x0801A38C then
          assert(word(0x03004E50)==unit,'Movement costs require the chosen private active unit')
          local id=options.ramByte(unit+11)
          local values=id==2 and {0,1,255}or id==129 and {1,0,1}or {255,1,0}
          for n,value in ipairs(values)do shadow[0x0300100F+n]=value end
        elseif entry==0x080197E4 then
          assert(unit==0x03001100 and args[2]==0);for n=0,2 do shadow[0x03001110+n]=0 end
        elseif entry==0x0801B998 then assert(unit==0x03001100)
        else
          assert(entry==0x0801ACBC and word(0x03004E50)==unit)
          local origin=0x02002020+options.ramByte(unit+16)
          assert(shadow[origin]==0,'Native caller clears only this origin before complete attack generation')
          local id=options.ramByte(unit+11);local flag=options.ramByte(0x02000080)
          local values=id==2 and {1,1,1}or id==129 and {0,1,1}or {flag==0 and 1 or 0,1,0}
          for n,value in ipairs(values)do shadow[0x0300110F+n]=value end
        end
        return true,0,shadow,total,options.busContext
      end
    end}`)
  };
  const picked={mainTab:'Map',mapPickedId:130,mapPickedContext:'0:1:0:0',mapDangerEnabled:true};
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:base,bytes:ew},{address:0x03000000,bytes:iw}],steps:[
    {ui:{...picked,mapDangerEnabled:false},expect:{mapDangerEnabled:false,mapDangerDisabled:true,mapDangerReady:true}},
    {ui:picked,expect:{mapNativeRangesBusy:true,mapRangesNative:false,mapDangerReady:false,mapMoveCount:0,mapDangerCount:0}},
    {ui:picked,ticks:24,expect:{mapRangesNative:true,mapRangesSource:'private',mapRangesUnitId:130,mapMoveCount:2,mapAttackCount:1,mapDangerReady:true,mapDangerSource:'private',mapDangerCount:3,mapNativeRangesBusy:false}},
    {ui:picked,patches:[{address:units[129]+19,bytes:[0]}],expect:{mapDangerCount:2,mapDangerReady:true}},
    {ui:picked,patches:[{address:0x02000080,bytes:[1]}],expect:{mapNativeRangesBusy:true,mapDangerReady:false,mapMoveCount:0,mapDangerCount:0}},
    {ui:picked,ticks:12,expect:{mapMoveCount:2,mapAttackCount:0,mapDangerCount:1,mapDangerReady:true,mapNativeRangesBusy:false}},
    {ui:picked,patches:[{address:units[130]+12,bytes:[0,2,0,0]}],expect:{mapRangesNative:false,mapMoveCount:0,mapAttackCount:0,mapDangerCount:0,mapDangerReady:true,mapNativeRangesBusy:false}},
    {ui:picked,patches:[{address:0x030017A7,bytes:[1]}],expect:{mapRangesUnavailable:true,mapRangesNative:false,mapDangerDisabled:true,mapDangerReady:false,mapNativeRangesBusy:false}},
    {ui:picked,patches:[{address:0x030017A7,bytes:[0]},{address:0x0202BCFD,bytes:[1]},{address:units[130]+12,bytes:[0,0,0,0]}],expect:{mapRangesUnavailable:false,mapDangerSource:'private',mapDangerCount:1,mapDangerReady:true,mapDangerDisabled:false}},
    {ui:picked,patches:[{address:0x02024E6C,bytes:[0,0,0,0]},{address:0x02024E68+0x28,bytes:[1]},{address:0x0202BCFF,bytes:[0x80]}],focusUnit:130,expect:{mapRangesSource:'private',mapRangesUnitId:130,mapDangerSource:'private',mapDangerCount:1,mapDangerReady:true}},
    {ui:picked,patches:[{address:0x0202E4E4,bytes:[0,0,0,0]}],expect:{mapRangesSource:'',mapMoveCount:0,mapAttackCount:0,mapDangerCount:0,mapNativeRangesBusy:true}},
    {ui:picked,patches:[{address:0x0202E4E4,bytes:[0,17,0,3]}],expect:{mapRangesSource:'private',mapRangesUnitId:130,mapDangerCount:1,mapNativeRangesBusy:false}}
  ]});
  assert.ok(run.values.every(value=>value.nativeWork<=512));
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('large cached native Danger unions stay bounded, publish only complete results and refresh changed sources',async()=>{
  const ew=Buffer.alloc(0x40000),slots={};
  for(const [global,table,rows]of [[0x0202E4E0,0x02003000,0x02004000],[0x0202E4E4,0x02003100,0x02005000]]){
    ew.writeUInt32LE(table,global-0x02000000);
    for(let y=0;y<64;y++)ew.writeUInt32LE(rows+y*64,table-0x02000000+y*4);
  }
  for(let n=1;n<=50;n++){
    const unit=0x02010000+(n-1)*72,id=128+n;slots[id]=unit;
    ew[unit-0x02000000+11]=id;ew[unit-0x02000000+19]=20;
    ew[unit-0x02000000+16]=n-1;
  }
  const files={
    'main.lua':encode(`
      local slots={${Object.entries(slots).map(([id,unit])=>'['+id+']='+unit).join(',')}}
      ui={mapDangerEnabled=true}
      local empty=string.rep(string.char(0),4096);local sources={}
      for id,unit in pairs(slots)do
        local n=id-128;sources[unit]={movement=empty,attack=string.rep(string.char(0),n-1)..string.char(1)..string.rep(string.char(0),4096-n)}
      end
      local map=pack.require('game.map')({slots=slots,sources=sources})
      local maximum,firstReady,last=0,nil,nil
      local function tick()
        local count=0;debug.sethook(function()count=count+100 end,'',100)
        local v={};map.apply(v,nil,false);debug.sethook();maximum=math.max(maximum,count)
        if not v.mapDangerReady then assert(v.mapDangerCount==0 and v.mapNativeRangesBusy)end
        last=v;return v
      end
      for n=1,202 do if tick().mapDangerReady and not firstReady then firstReady=n end end
      assert(last.mapDangerReady and last.mapDangerCount==50 and last.mapCells[1].danger)
      sources[slots[129]].attack=string.rep(string.char(0),4095)..string.char(1)
      local afterChange=tick();assert(not afterChange.mapDangerReady and afterChange.mapDangerCount==0)
      for n=1,202 do tick()end
      function update()return {maximum=maximum,firstReady=firstReady,ready=last.mapDangerReady,
        danger=last.mapDangerCount,first=last.mapCells[1].danger,last=last.mapCells[4096].danger}end
    `),
    'game.map.lua':encode(fs.readFileSync('runtime/pokemblem/game.map.lua','utf8')),
    'features.native-map-query.lua':encode('return function()return {request=function()error("No native CPU job in cached-union control")end,begin=function()end,step=function(budget)assert(budget==512)end}end'),
    'game.native-ranges.lua':encode('return function(D)return function(unit)return D.sources[unit]end end'),
    'game.fe8-map.lua':encode(`return function(D)return {config={},meta={classes={}},apply=function(v)
      v.mapPresent=true;v.mapWidth=64;v.mapHeight=64;v.mapRoster={};v.mapCells={}
      for id in pairs(D.slots)do v.mapRoster[#v.mapRoster+1]={id=id,member=true}end
      for n=1,4096 do v.mapCells[n]={}end
    end}end`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[{ui:{mapDangerEnabled:true}}]});
  const value=run.values[0];assert.ok(value.maximum<350000,JSON.stringify(value));
  assert.ok(value.firstReady>0&&value.firstReady<=202);assert.equal(value.ready,true);
  assert.equal(value.danger,50);assert.equal(value.first,false);assert.equal(value.last,true);
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('compact native query dependencies preserve exact observed-byte invalidation without aggregate revision',async()=>{
  const ew=Buffer.alloc(0x40000);ew[0x10]=2;ew[0x12]=3;
  const files={
    'main.lua':encode(`
      local q=pack.require('features.native-map-query')({compactReads=true,trackRevision=false})
      assert(not pcall(q.revision),'A caller must not silently cache an unavailable aggregate revision')
      function update()
        q.begin();local value=q.request('unit',{{entry=1,args={},key='sum'}});q.step(512)
        return {sum=value and value.sum,starts=starts or 0}
      end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.thumb.lua':encode(`return {start=function(entry,args,shadow,options)
      starts=(starts or 0)+1;return function()
        return true,options.ramByte(0x02000010)+options.ramByte(0x02000012),shadow,1,options.busContext
      end
    end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
    {ticks:2,expect:{sum:5,starts:1}},
    {patches:[{address:0x02000011,bytes:[99]}],expect:{sum:5,starts:1}},
    {patches:[{address:0x02000012,bytes:[4]}],expect:{sum:undefined,starts:2}},
    {expect:{sum:6,starts:2}}
  ]});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('fifty current large native dependency sets retain compact records within the Lua heap',async()=>{
  const files={
    'main.lua':encode(`
      local q=pack.require('features.native-map-query')({compactReads=true,trackRevision=false})
      collectgarbage('collect');local before=collectgarbage('count')
      q.begin();for n=1,50 do q.request('enemy:'..n,{{entry=1,args={},key='value'}})end;q.step(512)
      q.begin();for n=1,50 do assert(q.request('enemy:'..n,{{entry=1,args={},key='value'}}).value==0)end;q.step(512)
      collectgarbage('collect');local growth=collectgarbage('count')-before
      function update()return {kibGrowth=growth,ready=q.ready()}end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    // Memory shape only: 8174 addresses is measured from the native64x64
    // recipe. This mock deliberately makes no native-step timing claim.
    'features.thumb.lua':encode(`return {start=function(entry,args,shadow,options)return function()
      for n=0,8173 do options.ramByte(0x02008000+n)end
      return true,0,shadow,1,options.busContext
    end end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000)},{address:0x03000000,bytes:Buffer.alloc(0x8000)}]});
  assert.equal(run.values[0].ready,true);assert.ok(run.values[0].kibGrowth<2048,JSON.stringify(run.values[0]));
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('native output continuations share the work slice and release cancelled or completed private jobs',async()=>{
  const ew=Buffer.alloc(0x40000);ew.set(Buffer.from('ABCDEFGHIJ'),0x20);
  const files={
    'main.lua':encode(`
      local q=pack.require('features.native-map-query')({compactReads=true,trackRevision=false})
      local pending=setmetatable({},{__mode='k'});local finished,starts=0,0
      local phase={entry=1,args={},key='bytes',transform=function(value,shadow,read)
        assert(value==7);local bytes={};local buffer=string.rep('private',10000)
        local run=function(budget)
          assert(#buffer==70000);local used=0
          while used<budget and #bytes<10 do bytes[#bytes+1]=string.char(read(0x0200001F+#bytes+1));used=used+1 end
          return #bytes==10,table.concat(bytes),used
        end
        pending[run]=true;return run
      end,after=function(value)finished=finished+1;return value end}
      function update()
        q.begin();local value=q.request(ui.key or 'first',{phase});local used=q.step(4)
        collectgarbage('collect');local retained=0;for _ in pairs(pending)do retained=retained+1 end
        return {value=value and value.bytes,used=used,ready=q.ready(),finished=finished,retained=retained,starts=cpuStarts or 0}
      end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(fs.readFileSync('runtime/shared/game.snapshot.lua','utf8')),
    'features.thumb.lua':encode('return {start=function(entry,args,shadow,options)cpuStarts=(cpuStarts or 0)+1;return function()return true,7,shadow,2,options.busContext end end}')
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
    {ui:{key:'abandoned'},expect:{used:4,ready:false,finished:0,retained:1,starts:1}},
    {ui:{key:'final'},expect:{used:4,ready:false,finished:0,retained:1,starts:2}},
    {ui:{key:'final'},expect:{used:4,ready:false,finished:0,retained:1,starts:2}},
    {ui:{key:'final'},expect:{used:4,ready:true,finished:1,retained:0,starts:2}},
    {ui:{key:'final'},expect:{value:'ABCDEFGHIJ',used:0,ready:true,finished:1,retained:0,starts:2}}
  ]});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('deferred native jobs capture and initialize at execution, rejecting stale active inputs and cancelling unopened work',async()=>{
  const ew=Buffer.alloc(0x40000);ew[0x10]=3;ew[0x20]=1;
  const actualSnapshot=fs.readFileSync('runtime/shared/game.snapshot.lua','utf8');
  const files={
    'main.lua':encode(`
      mem.busContext=function()return {version=1,platform='gba',biosPrefetch=mem.u8(0x02000020)}end
      local q=pack.require('features.native-map-query')({deferCapture=true,compactReads=true,trackRevision=false})
      local initialized={}
      local function request(id)
        return q.request('job:'..id,{{entry=1,args={id},key='value'}},{initialize=function(shadow,read)
          initialized[id]=(initialized[id]or 0)+1;shadow[0x02004000]=read(0x02000010)
        end})
      end
      function update()
        q.begin();local first,second=request(1),request(2);if ui.cancelled then request(3)end
        local before=captureCount or 0;local used=q.step(512)
        collectgarbage('collect');local retained=0;for _ in pairs(snapshotReads)do retained=retained+1 end
        return {first=first and first.value,second=second and second.value,before=before,captures=captureCount or 0,
          firstInit=initialized[1]or 0,secondInit=initialized[2]or 0,cancelledInit=initialized[3]or 0,
          starts=cpuStarts or 0,ready=q.ready(),used=used,retained=retained}
      end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(`local actual=(function()${actualSnapshot}\nend)()
      snapshotReads=setmetatable({},{__mode='k'});captureCount=0
      return function()captureCount=captureCount+1;local read=actual();snapshotReads[read]=true;return read end`),
    'features.thumb.lua':encode(`return {start=function(entry,args,shadow,options)
      assert(args[1]~=3,'Cancelled queued work must not initialize or execute')
      cpuStarts=(cpuStarts or 0)+1;local total=0;local limit=args[1]==1 and 600 or 1
      return function(budget)
        total=math.min(limit,total+budget)
        return total==limit,shadow[0x02004000]+options.busContext.biosPrefetch*10,shadow,total,options.busContext
      end
    end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:ew},{address:0x03000000,bytes:Buffer.alloc(0x8000)}],steps:[
    {ui:{cancelled:true},expect:{before:0,captures:1,firstInit:1,secondInit:0,cancelledInit:0,starts:1,ready:false,used:512,retained:1}},
    {patches:[{address:0x02000010,bytes:[4]},{address:0x02000020,bytes:[2]}],expect:{first:undefined,second:undefined,before:1,captures:2,firstInit:1,secondInit:1,cancelledInit:0,starts:2,ready:true,used:89,retained:1}},
    {expect:{first:undefined,second:24,before:2,captures:3,firstInit:2,secondInit:1,cancelledInit:0,starts:3,ready:false,used:512,retained:1}},
    {expect:{first:undefined,second:24,before:3,captures:3,firstInit:2,secondInit:1,cancelledInit:0,starts:3,ready:true,used:88,retained:0}},
    {expect:{first:24,second:24,before:3,captures:3,firstInit:2,secondInit:1,cancelledInit:0,starts:3,ready:true,used:0,retained:0}}
  ]});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});

test('fifty needed unfinished deferred jobs retain one real snapshot and same-frame starts share their capture',async()=>{
  const actualSnapshot=fs.readFileSync('runtime/shared/game.snapshot.lua','utf8');
  const files={
    'main.lua':encode(`
      local q=pack.require('features.native-map-query')({deferCapture=true,compactReads=true,trackRevision=false,maxSteps=2000000})
      collectgarbage('collect');local before=collectgarbage('count')
      for tick=1,50 do
        q.begin();for n=1,tick do q.request('enemy:'..n,{{entry=1,args={n},key='value'}})end;q.step(512)
      end
      collectgarbage('collect');local growth=collectgarbage('count')-before
      local capturesBefore=captureCount;local retainedBefore=0;for _ in pairs(snapshotReads)do retainedBefore=retainedBefore+1 end
      local pending=not q.ready()
      fastFinish=true;q.begin();for n=1,50 do q.request('enemy:'..n,{{entry=1,args={n},key='value'}})end;q.step(512)
      local capturesAfter=captureCount;local ready=q.ready()
      q.begin();for n=1,50 do assert(q.request('enemy:'..n,{{entry=1,args={n},key='value'}}).value==0)end;q.step(512)
      collectgarbage('collect');local retainedAfter=0;for _ in pairs(snapshotReads)do retainedAfter=retainedAfter+1 end
      function update()return {kibGrowth=growth,capturesBefore=capturesBefore,retainedBefore=retainedBefore,pending=pending,
        capturesAfter=capturesAfter,retainedAfter=retainedAfter,ready=ready,starts=cpuStarts}end
    `),
    'features.native-map-query.lua':encode(fs.readFileSync('runtime/shared/features.native-map-query.lua','utf8')),
    'game.snapshot.lua':encode(`local actual=(function()${actualSnapshot}\nend)()
      snapshotReads=setmetatable({},{__mode='k'});captureCount=0
      return function()captureCount=captureCount+1;local read=actual();snapshotReads[read]=true;return read end`),
    // Snapshot retention only; the finite mock does not model native CPU cost.
    'features.thumb.lua':encode(`return {start=function(entry,args,shadow,options)
      cpuStarts=(cpuStarts or 0)+1;local total=0
      return function(budget)
        total=total+(fastFinish and 1 or budget);assert(total<=2000000)
        options.ramByte(0x02008000)
        return fastFinish or total>=200000,0,shadow,total,options.busContext
      end
    end}`)
  };
  const run=await executeProject({manifest:{script:'main.lua'},files},{ranges:[{address:0x02000000,bytes:Buffer.alloc(0x40000)},{address:0x03000000,bytes:Buffer.alloc(0x8000)}]});
  const v=run.values[0];assert.ok(v.kibGrowth<1024,JSON.stringify(v));
  assert.deepEqual({...v,kibGrowth:undefined},{kibGrowth:undefined,capturesBefore:1,retainedBefore:1,pending:true,capturesAfter:2,retainedAfter:0,ready:true,starts:50});
  assert.equal(run.readOnly,true);assert.deepEqual(run.calls,[]);
});
