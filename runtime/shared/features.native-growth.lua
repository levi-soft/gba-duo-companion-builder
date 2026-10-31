-- Incremental exact-ROM growth getters on a frozen, private RAM snapshot.
-- A completed set is published atomically; an in-flight refresh never replaces
-- a valid set for the same identity or leaks that set into another identity.
return function(D)
  local start=pack.require("features.thumb").start
  local capture=pack.require("game.snapshot")
  local execution=D.execution or {}
  local recipe=assert(execution.nativeGrowth,"Missing native growth recipe")
  local getters=assert(recipe.getters,"Missing native growth getters")
  assert(#getters>0 and #getters<=12,"Invalid native growth axis count")
  local slice=execution.cpuStepsPerTick or 512
  assert(slice>=128 and slice<=2048 and slice%1==0,"Invalid native growth slice")
  local budgetRetries=recipe.budgetRetries
  if budgetRetries==nil then budgetRetries=2 end
  assert(math.type(budgetRetries)=="integer" and budgetRetries>=0 and budgetRetries<=2,"Invalid native growth retry allowance")
  local seen={}
  for _,getter in ipairs(getters)do
    assert(type(getter.key)=="string" and not seen[getter.key]
      and type(getter.label)=="string" and type(getter.currentField)=="string"
      and math.type(getter.entry)=="integer" and getter.entry>=0x08000000
      and getter.entry<0x0A000000,"Invalid native growth getter")
    seen[getter.key]=true
  end
  local capProbe=recipe.capProbe
  if capProbe then
    assert(math.type(capProbe.entry)=="integer" and capProbe.entry>=0x08000000
      and capProbe.entry<0x0A000000 and type(capProbe.fields)=="table"
      and #capProbe.fields>0 and #capProbe.fields<=8,"Invalid native cap probe")
    for _,field in ipairs(capProbe.fields)do
      assert(seen[field.key] and math.type(field.offset)=="integer"
        and field.offset>=0 and field.offset<0x48 and math.type(field.gainOffset)=="integer"
        and field.gainOffset>=0x73 and field.gainOffset<0x7E,"Invalid native cap field")
    end
  end
  local cache,tick,wasVisible={},0,false
  local function signature(unit)
    -- Keep only confirmed unit/chapter/bus identity here. Other RAM inputs are
    -- validated from the bytes actually read by the native getter/cap routines;
    -- an unrelated timer in a large memory block must not starve a job.
    local context=mem.busContext and mem.busContext() or nil
    local bus=context and string.format("bus1:%08X",context.biosPrefetch) or ""
    return mem.read(unit,0x48)..mem.read(0x0202BCFE,2)..bus
  end
  local function matches(dependencies)
    for address,value in pairs(dependencies or {})do
      if mem.u8(address)~=value then return false end
    end
    return true
  end
  local function queue(unit,key)
    cache.unit,cache.key,cache.pending,cache.needsBegin=unit,key,true,true
    cache.job,cache.ram,cache.recordedRam,cache.context,cache.originalContext=nil,nil,nil,nil,nil
    cache.nextDependencies,cache.error=nil,nil
    cache.errorDependencies=nil
    cache.retries,cache.slice,cache.restartPending=0,slice,false
  end
  local function restart()
    cache.index,cache.context=1,cache.originalContext
    cache.nextRates,cache.nextCaps,cache.shadow,cache.job={},{},{},nil
    cache.restartPending=false
    cache.started=tick
  end
  local function begin(v,unit,key)
    local ram,context=capture()
    cache.key,cache.pending,cache.error=key,true,nil
    cache.needsBegin=false
    cache.ram,cache.originalContext,cache.unit=ram,context,unit
    local dependencies={}
    cache.nextDependencies=dependencies
    cache.recordedRam=function(address)
      local value=ram(address);dependencies[address]=value;return value
    end
    restart()
  end
  local function finish()
    if not matches(cache.nextDependencies)then queue(cache.unit,cache.key);return end
    -- One pointer publishes the complete rates/caps/dependencies together.
    -- Keep the frozen input until the protected advance returns successfully:
    -- a budget interruption in finish must be able to restart the whole chain.
    cache.valid={rates=cache.nextRates,caps=cache.nextCaps,dependencies=cache.nextDependencies,completed=tick}
    cache.pending=false
  end
  local function releaseWork()
    cache.ram,cache.recordedRam,cache.context,cache.originalContext,cache.shadow,cache.job=nil,nil,nil,nil,nil,nil
    cache.nextRates,cache.nextCaps,cache.nextDependencies=nil,nil,nil
  end
  local function failed(message,previousValid)
    message=tostring(message)
    cache.valid=previousValid
    cache.job,cache.shadow,cache.nextRates,cache.nextCaps=nil,nil,nil,nil
    local transient=message:find("script exceeded its per-tick time limit",1,true)
      or message:find("script exceeded its per-tick instruction budget",1,true)
    if transient and type(cache.ram)=="function" and type(cache.recordedRam)=="function"
      and cache.nextDependencies and (cache.retries or 0)<budgetRetries then
      cache.retries=(cache.retries or 0)+1
      cache.slice=math.max(128,math.floor((cache.slice or slice)/2))
      -- Rebuild every native call next update, using the SAME captured RAM and
      -- ORIGINAL bus context. Never resume a partial CPU or private shadow.
      cache.pending,cache.restartPending,cache.error=true,true,nil
    else
      cache.errorDependencies=cache.nextDependencies or previousValid and previousValid.dependencies or {}
      releaseWork()
      cache.pending,cache.restartPending,cache.error=false,false,message
    end
  end
  local function advance()
    if cache.index>#getters then
      local probe=0x0203FE00
      if not cache.job then
        -- Correct native ABI: r0=unchanged persistent Unit*, r1=a PRIVATE
        -- BattleUnit copy. Maximum positive signed gains expose its ceiling.
        for n=0,127 do cache.shadow[probe+n]=0 end
        for n=0,0x47 do cache.shadow[probe+n]=cache.ram(cache.unit+n)end
        for _,field in ipairs(capProbe.fields)do
          assert(cache.ram(cache.unit+field.offset)<=127,"Native cap input exceeds signed stat storage")
          cache.shadow[probe+field.gainOffset]=127
        end
        cache.job=start(capProbe.entry,{cache.unit,probe},cache.shadow,{
          maxSteps=capProbe.maxSteps or 200000,strictStack=true,
          ramByte=cache.recordedRam,busContext=cache.context,beforeEntry=execution.beforeEntry,
        })
      end
      local done,_,shadow=cache.job(cache.slice or slice)
      if not matches(cache.nextDependencies)then queue(cache.unit,cache.key);return end
      if not done then return end
      for _,field in ipairs(capProbe.fields)do
        local gain=shadow[probe+field.gainOffset]
        assert(gain~=nil,"Native cap probe returned no field")
        if gain>=128 then gain=gain-256 end
        local cap=cache.ram(cache.unit+field.offset)+gain
        assert(cap>=0 and cap<=127,"Native cap exceeds verified signed storage")
        cache.nextCaps[field.key]=cap
      end
      finish()
      return
    end
    local getter=getters[cache.index]
    if not cache.job then
      cache.job=start(getter.entry,{cache.unit},cache.shadow,{
        maxSteps=recipe.maxSteps or 200000,strictStack=true,
        ramByte=cache.recordedRam,busContext=cache.context,beforeEntry=execution.beforeEntry,
      })
    end
    local done,value,shadow,_,context=cache.job(cache.slice or slice)
    if not matches(cache.nextDependencies)then queue(cache.unit,cache.key);return end
    if not done then return end
    assert(math.type(value)=="integer","Native growth returned no integer")
    -- Getters return C int, including negative modifiers; do not clamp it.
    if value>=0x80000000 then value=value-0x100000000 end
    cache.nextRates[cache.index]=value
    cache.context,cache.shadow,cache.job=context,shadow,nil
    cache.index=cache.index+1
    if cache.index>#getters and not capProbe then finish()end
  end
  return function(v)
    tick=tick+1
    local deployment=tonumber(v.deployment) or 0
    local unit=D.slots and D.slots[deployment]
    local identity=table.concat({tostring(v.characterPointer),tostring(v.classPointer),
      tostring(deployment),tostring(v.chapterId or mem.u8(0x0202BCFE))},":")
    if not v.unitPresent or not unit then
      cache={}
    elseif cache.identity~=identity then
      cache={identity=identity}
    end
    local visible=ui and (ui.growthPopup==true or ui.predictionPopup==true)
    if v.unitPresent and unit then
      local key=signature(unit)
      local invalid=cache.pending and not cache.needsBegin and not matches(cache.nextDependencies)
        or not cache.pending and not matches(cache.valid and cache.valid.dependencies)
        or not cache.pending and cache.valid
        and tick-cache.valid.completed>=(recipe.refreshTicks or 120)
      if cache.error then
        -- Failed calls have dependencies too. Watch the failed path rather than
        -- repeatedly comparing its older valid vector or leaving the error stuck.
        invalid=not matches(cache.errorDependencies) or visible and not wasVisible
      end
      if cache.key~=key or invalid then
        queue(unit,key)
      end
      if visible and cache.pending then
        local previousValid=cache.valid
        local ok,message=pcall(function()
          if cache.needsBegin then begin(v,unit,key)
          elseif cache.restartPending then restart()end
          advance()
        end)
        if not ok then
          failed(message,previousValid)
        elseif not cache.pending then
          releaseWork()
        end
      end
    end
    wasVisible=visible==true
    local valid=cache.valid
    v.nativeGrowthReady=valid~=nil
    v.nativeGrowthPending=cache.pending==true
    v.nativeGrowthError=cache.error
    v.growthRadarPending=v.nativeGrowthPending
    v.growthRatesStale=valid~=nil and (cache.pending==true or cache.error~=nil)
    v.growthRadarRates,v.growthRadarAxes,v.growthRadarCurrent={},{},{}
    for n,getter in ipairs(getters)do
      local rate=valid and valid.rates[n] or "---"
      v["growth"..getter.key]=rate
      v["growth"..getter.key.."Current"]=v[getter.currentField]
      if getter.key=="Power" then
        v.growthStr=rate;v.growthStrCurrent=v[getter.currentField]
      elseif getter.key=="Str" then
        v.growthPower=rate;v.growthPowerCurrent=v[getter.currentField]
      end
      if valid and getter.radar~=false then
        v.growthRadarRates[#v.growthRadarRates+1]=rate
        v.growthRadarAxes[#v.growthRadarAxes+1]=getter.label
        v.growthRadarCurrent[#v.growthRadarCurrent+1]=v[getter.currentField] or 0
      end
    end
    if capProbe then
      for _,field in ipairs(capProbe.fields)do
        v["growth"..field.key.."Cap"]=valid and valid.caps[field.key] or "---"
        if field.key=="Power" then v.growthStrCap=v.growthPowerCap end
      end
    end
    -- Keep the ROM's existing base PNG while native effective rates refresh.
    -- Effective numbers remain available for Analysis and the Growth table;
    -- image rendering does not require any private host API.
    local cp=tonumber(v.characterPointer)
    local c=cp and ((D.growthCharacters and D.growthCharacters[cp]) or (D.chars and D.chars[cp]))
    local radar=c and (c.radar or c.radars and c.radars[1]) or v.growthRadar
    v.growthRadar=v.unitPresent and type(radar)=="string" and radar:sub(1,6)=="asset:" and radar or ""
    v.growthRadarUnavailable=v.unitPresent and v.growthRadar=="" or false
    if cache.error then
      v.growthCalculationNote="Current growth failed: "..cache.error
    elseif cache.pending then
      v.growthCalculationNote=valid and "Refreshing current growth; showing last valid rates."
        or "Reading current growth from this ROM."
    else
      v.growthCalculationNote="Growth rates include active bonuses. Analysis follows the current growth mode."
    end
    return v
  end
end
