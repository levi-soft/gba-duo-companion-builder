-- Request bounded follow-up snapshots through the official UI-state contract.
-- No timers, private host APIs, game input, RAM writes, or error suppression.
local MAX_PULSES, PULSE_LIMIT = 512, 2147483647
local WORK_KEYS = { companionWorkPulse = true, companionWorkPending = true,
  companionWorkNext = true, companionWorkNeedsContinue = true }

local function nextPulse(value)
  return (value + 1) % PULSE_LIMIT
end

-- Keep script-returned object/list actions in order. Remove only this helper's
-- reserved work-state keys, so reusing a values/action table cannot grow its queue.
local function withoutWorkState(value)
  if type(value) ~= "table" then return value end
  if value[1] ~= nil then
    local result = {}
    for _, action in ipairs(value) do
      local clean = withoutWorkState(action)
      if clean ~= nil then result[#result + 1] = clean end
    end
    return #result > 0 and result or nil
  end
  local result, removed = {}, false
  for key, child in pairs(value) do
    if key == "set" and type(child) == "table" then
      local set = {}
      for name, item in pairs(child) do
        if WORK_KEYS[name] then removed = true else set[name] = item end
      end
      if next(set) ~= nil then result.set = set end
    else result[key] = child end
  end
  if removed and next(result) == nil then return nil end
  return result
end

local function appendWorkState(v, changes)
  local action = { set = changes }
  if v.ui == nil then v.ui = action
  elseif type(v.ui) == "table" and v.ui[1] == nil then
    v.ui.set = v.ui.set or {}
    for key, value in pairs(changes) do v.ui.set[key] = value end
  elseif type(v.ui) == "table" then v.ui[#v.ui + 1] = action
  else v.ui = { v.ui, action } end
end

local function publish(v, state, automatic)
  local changes = {}
  if automatic ~= nil then changes.companionWorkPulse = automatic end
  local function set(key, value) if state[key] ~= value then changes[key] = value end end
  if v.companionWorkPending then
    -- Official replaces all snapshot bindings after an uncaught script error.
    -- UI state survives; a static resume control can still use these fields.
    set("companionWorkPending", true)
    set("companionWorkNext", v.companionWorkNext)
    set("companionWorkNeedsContinue", v.companionWorkNeedsContinue)
  elseif state.companionWorkPending == true or state.companionWorkNeedsContinue == true then
    -- Clear prior work once. An untouched idle pack emits no UI changes.
    set("companionWorkPending", false)
    set("companionWorkNeedsContinue", false)
  end
  if next(changes) ~= nil then appendWorkState(v, changes) end
end

local function hasError(value)
  return value ~= nil and value ~= false and value ~= ""
end

return function()
  local lastContext, lastObserved, lastIssued, used
  used = 0
  return function(v)
    local state = type(ui) == "table" and ui or {}
    local observed = tonumber(state.companionWorkPulse) or 0
    if observed % 1 ~= 0 or observed < 0 or observed >= PULSE_LIMIT then observed = 0 end
    v.ui = withoutWorkState(v.ui)

    local popup = state.growthPopup == true or state.predictionPopup == true
    local growth = v.unitPresent == true and popup and v.nativeGrowthPending == true
      and not hasError(v.nativeGrowthError)
    local movement = v.unitPresent == true and v.nativeMovePending == true
      and not hasError(v.nativeMoveError)
    -- Classic tile caches can yield before any Map cells/targets are ready.
    -- Continue only while that unfinished map is the visible requested tab.
    local render = state.mainTab == "Map" and v.mapRenderPending == true
    local map = v.mapPresent == true and (v.mapNativeRangesBusy == true or v.mapRangesBusy == true
      or v.mapDangerEnabled == true and v.mapDangerReady == false)
      and v.mapRangesUnavailable ~= true and not hasError(v.mapRangesError) and not hasError(v.mapNativeRangesError)
    local prediction = state.predictionPopup == true and v.predictionBusy == true
      and v.predictionComplete ~= true and v.predictionAvailable ~= true
      and v.analysisFailed ~= true and not hasError(v.analysisPredictionError)
    local pending = growth or movement or render or map or prediction
    v.companionWorkPending = pending
    v.companionWorkNeedsContinue = false

    if not pending then
      lastContext, lastIssued, used = nil, nil, 0
      lastObserved = observed
      v.companionWorkNext = nextPulse(observed)
      publish(v, state)
      return v
    end

    -- Use stable ownership/screen identity, not progress, a localized label or
    -- a live RNG counter: changing those each tick must not reset the bound.
    local context = table.concat({ tostring(v.deployment), tostring(v.characterPointer), tostring(v.classPointer),
      tostring(v.mapPickContext), tostring(v.forecastActive), tostring(state.mainTab),
      tostring(state.growthPopup == true), tostring(state.predictionPopup == true),
      tostring(state.mapDangerEnabled == true) }, "|")
    if context ~= lastContext then
      lastContext, lastIssued, used = context, nil, 0
    elseif observed ~= lastObserved and observed ~= lastIssued then
      -- A new UI value that is not our outstanding acknowledgement is a tap.
      used = 0
    end
    lastObserved = observed

    local automatic
    if used < MAX_PULSES then
      automatic = nextPulse(observed)
      lastIssued, used = automatic, used + 1
      -- If the requested next snapshot fails before reaching this presenter,
      -- the last visible manual binding must still change the acknowledged UI.
      v.companionWorkNext = nextPulse(automatic)
    else
      v.companionWorkNeedsContinue = true
      local manual = nextPulse(lastIssued or observed)
      if manual == observed then manual = nextPulse(manual) end
      v.companionWorkNext = manual
    end
    publish(v, state, automatic)
    return v
  end
end
