-- One bounded native queue over immutable RAM, with observed read dependencies.
local start=pack.require("features.thumb").start
local capture=pack.require("game.snapshot")
return function(config)
  local cache,queue,index,queueTail={}, {},1,0
  local frameRam,frameBus,dependencies,addresses=nil,nil,{},nil
  local frameBusReady=false
  local cacheCount,serial,cacheLimit=0,0,config.maxCacheEntries or 128
  local dependencyGeneration=0
  local interrupted=false
  local recoveryMode,safeTask=nil,false
  local trackRevision=config.trackRevision~=false
  assert(cacheLimit>=1 and cacheLimit%1==0,"Invalid native Map cache limit")
  assert(not config.compactReads or not trackRevision,"Compact native Map queries must disable aggregate revisions")
  local function read(task,address)
    local value=task.shadow[address]
    if value~=nil then return value end
    value=task.ram(address);task.reads[address]=value;return value
  end
  local function remove(task)
    if cache[task.key]~=task then return end
    cache[task.key]=nil;cacheCount=cacheCount-1
    if task.done and trackRevision then
      for address in pairs(task.reads)do
        local count=dependencies[address]-1
        if count==0 then dependencies[address]=nil;addresses=nil;dependencyGeneration=dependencyGeneration+1
        else dependencies[address]=count end
      end
    end
    task.ram,task.shadow,task.run,task.spans,task.transform,task.value,task.initialize=nil,nil,nil,nil,nil,nil,nil
  end
  local function prune()
    if cacheCount<=cacheLimit then return end
    local unused={}
    for _,task in pairs(cache)do if task.done and not task.needed then unused[#unused+1]=task end end
    table.sort(unused,function(a,b)return a.serial<b.serial end)
    -- Keep current requests even above the history limit. Collect/sort only
    -- once, rather than rescanning the entire cache for every retired entry.
    for n=1,math.min(#unused,cacheCount-cacheLimit)do remove(unused[n])end
  end
  local function currentBus()
    if not frameBusReady then
      frameBusReady=true;frameBus=mem.busContext and mem.busContext() or nil
    end
    return frameBus
  end
  local function busIdentity(context)
    if not context then return "no-bus-context" end
    return tostring(context.version)..":"..tostring(context.platform)..":"..tostring(context.biosPrefetch)
  end
  local function initialize(task)
    if not frameRam then currentBus();frameRam=capture()end
    task.ram=frameRam;task.bus=frameBus;task.capturedBusIdentity=busIdentity(frameBus)
    local shadow={}
    if config.cache then for n=0,3 do shadow[config.cache+n]=0 end end
    task.shadow=shadow
    if task.initialize then
      local callback=task.initialize;task.initialize=nil
      callback(shadow,function(address)return read(task,address)end)
    end
  end
  local function valid(task)
    if task.capturedBusIdentity~=busIdentity(currentBus())then return false end
    if task.spans then
      for _,span in ipairs(task.spans)do
        if mem.read(span.address,#span.bytes)~=span.bytes then return false end
      end
      return true
    end
    for address,value in pairs(task.reads)do if mem.u8(address)~=value then return false end end
    return true
  end
  local function compact(task)
    -- Private grid jobs do not use the aggregate Map revision. Keep only exact
    -- observed spans so many current enemies do not retain large Lua hash maps.
    local sorted={};for address in pairs(task.reads)do sorted[#sorted+1]=address end;table.sort(sorted)
    local spans,bytes,first,previous={}, {},nil,nil
    local function finish()
      if first then spans[#spans+1]={address=first,bytes=table.concat(bytes)}end
    end
    for _,address in ipairs(sorted)do
      if first and(address~=previous+1 or #bytes>=4096)then finish();bytes={};first=nil end
      if not first then first=address end
      bytes[#bytes+1]=string.char(task.reads[address]);previous=address
    end
    finish();task.spans=spans;task.reads=nil
  end
  local query={}
  function query.begin()
    frameRam,frameBus=nil,nil
    frameBusReady=false
    for _,task in pairs(cache)do task.needed=false end
  end
  function query.request(key,phases,options)
    local task=cache[key]
    if task and task.done and not valid(task)then remove(task);task=nil end
    if not task then
      task={key=key,phases=phases,phase=1,values={},reads={},needed=true,
        initialize=options and options.initialize}
      if not config.deferCapture then
        safeTask=true;initialize(task);safeTask=false
      end
      cache[key]=task;queueTail=queueTail+1;queue[queueTail]=task
      cacheCount=cacheCount+1
    end
    serial=serial+1;task.serial=serial;task.needed=true
    return task.done and task.values or nil
  end
  function query.ready()
    for _,task in pairs(cache)do if task.needed and not task.done then return false end end
    return true
  end
  function query.step(budget)
    local used=0
    while used<budget and index<=queueTail do
      local task=queue[index]
      if cache[task.key]~=task or not task.needed then
        remove(task)
        queue[index]=nil;index=index+1
      else
        -- These operations mutate only this pending task's private state.
        -- Completed cache entries and aggregate dependencies are untouched.
        safeTask=true
        -- Waiting Poke jobs keep recipes only. Capture once they actually run;
        -- multiple jobs starting in this update still share the frozen frame.
        if not task.ram then initialize(task)end
        local phase=task.phases[task.phase]
        if not task.nativeDone then
          if not task.run then
            local args=type(phase.args)=="function" and phase.args(function(address)return read(task,address)end,task.shadow)or phase.args
            task.run=start(phase.entry,args,task.shadow,{
              strictStack=true,maxSteps=config.maxSteps or 8192,allowArm=config.allowArm,
              busContext=task.bus,beforeEntry=config.beforeEntry,
              ramByte=function(address)
                local value=task.ram(address);task.reads[address]=value;return value
              end,
            });task.spent=0
          end
          local done,value,shadow,total,bus=task.run(budget-used)
          used=used+(total-task.spent);task.spent=total
          if not done then safeTask=false;break end
          task.shadow=shadow;task.bus=bus or task.bus
          task.nativeDone=true;task.run=nil;task.value=value
        end
        local value=task.value
        if phase.transform then
          -- Output bytes share the native work allowance instead of adding an
          -- unbounded grid-copy burst to the native function's final tick.
          if not task.transform then task.transform=phase.transform(value,task.shadow,function(address)return read(task,address)end)end
          if used>=budget then safeTask=false;break end
          local done,projected,spent=task.transform(budget-used)
          assert(type(spent)=="number" and spent%1==0 and spent>=0 and spent<=budget-used
            and(done or spent>0),"Invalid native Map projection work count")
          used=used+spent
          if not done then safeTask=false;break end
          value=projected
        end
        if phase.after then value=phase.after(value,task.shadow,function(address)return read(task,address)end)end
        task.values[phase.key]=value
        task.phase=task.phase+1;task.nativeDone=false;task.transform=nil;task.value=nil
        if task.phase>#task.phases then
          if config.compactReads then compact(task)end
          safeTask=false -- Validation and global commit must always reset fully.
          if valid(task)then
            task.done=true
            if trackRevision then
              for address in pairs(task.reads)do
                if not dependencies[address]then addresses=nil;dependencyGeneration=dependencyGeneration+1 end
                dependencies[address]=(dependencies[address] or 0)+1
              end
            end
            task.ram,task.shadow=nil,nil
          else remove(task)end
          queue[index]=nil;index=index+1
        end
        safeTask=false
      end
    end
    if index>queueTail then queue,index,queueTail={},1,0 end
    prune()
    return used
  end
  function query.revision()
    assert(trackRevision,"Native Map aggregate revision tracking is disabled")
    if not addresses then
      addresses={};for address in pairs(dependencies)do addresses[#addresses+1]=address end
      table.sort(addresses)
    end
    local values={};for n,address in ipairs(addresses)do values[n]=string.char(mem.u8(address))end
    return busIdentity(currentBus()).."|"..dependencyGeneration.."|"..table.concat(values)
  end
  local function reset()
    -- Drop references before allocating replacements; cleanup may itself be
    -- interrupted by a host budget or allocation error. Keep the marker until
    -- the complete reset finishes so the next entry retries cleanup first.
    cache,queue,dependencies,addresses,frameRam,frameBus=nil,nil,nil,nil,nil,nil
    cacheCount,serial,index,queueTail=0,0,1,0;frameBusReady=false
    dependencyGeneration=dependencyGeneration+1
    cache,queue,dependencies={},{},{}
    interrupted,recoveryMode,safeTask=false,nil,false
  end
  local function resetPending()
    -- Idempotent cleanup: an interrupted scan can restart before any API runs.
    -- No pending task has registered aggregate dependencies in the safe phase.
    queue,frameRam,frameBus=nil,nil,nil
    index,queueTail,frameBusReady=1,0,false
    local count=0
    for key,task in pairs(cache)do
      if not task.done then cache[key]=nil
      else count=count+1 end
    end
    cacheCount=count
    dependencyGeneration=dependencyGeneration+1
    queue={}
    interrupted,recoveryMode,safeTask=false,nil,false
  end
  local function recover()
    if recoveryMode=="pending" then resetPending()else reset()end
  end
  local function protected(fn)
    return function(...)
      if interrupted then recover()end
      interrupted,recoveryMode,safeTask=true,"full",false
      local result=table.pack(pcall(fn,...))
      if not result[1]then
        local message=tostring(result[2])
        local budget=message:find("script exceeded its per-tick time limit",1,true)
          or message:find("script exceeded its per-tick instruction budget",1,true)
        recoveryMode=config.preserveCompletedOnBudgetError and safeTask and budget and "pending" or "full"
        safeTask=false
        recover();error(result[2],0)
      end
      interrupted,recoveryMode,safeTask=false,nil,false
      return table.unpack(result,2,result.n)
    end
  end
  -- A Lua exception can interrupt an opcode, initializer, projection, cache
  -- validation or dependency update. No pending private state is resumable.
  -- Only opted-in, budget-interrupted private work can retain completed entries.
  for name,fn in pairs(query)do query[name]=protected(fn)end
  return query
end
