-- Pending FE8-style chapter Talk: prepared event records, live flags and units.
return function(D)
  local config = D.talkConfig
  local names = {}
  for _, character in pairs(D.chars) do
    names[character.id] = character.name
  end
  local function flagSet(flag)
    if flag == 0 or flag == 100 then
      return false
    end
    local index = flag < 100 and flag - 1 or flag - 101
    local base = flag < 100 and config.temporaryFlags or config.permanentFlags
    return (mem.u8(base + math.floor(index / 8)) & (1 << (index % 8))) ~= 0
  end
  local function target(unit)
    local character = unit and D.chars[mem.u32(unit)]
    if not character then
      return 0
    end
    local events = D.talkEvents[mem.u8(config.chapter) + 1] or {}
    for _, event in ipairs(events) do
      local condition = event.conditionType or 0
      local allowed = condition ~= 1 and condition ~= 2
        and (condition ~= 3 or flagSet(event.conditionFlag))
      if (event.from == character.id or event.anySource) and allowed and not flagSet(event.flag) then
        for id = 1, 0xbf do
          local other = D.slots[id]
          if other then
            local record = D.chars[mem.u32(other)]
            if record and record.id == event.to and (mem.u32(other + 12) & 0x1000c) == 0 then
              return event.to
            end
          end
        end
      end
    end
    return 0
  end
  return function(v, unit)
    local id = target(unit)
    v.talkTargetId = id
    v.talkAvailable = id ~= 0
    v.talkTargetName = names[id] or "---"
    v.talkPrompt = id ~= 0 and ("Talk to " .. v.talkTargetName .. ".") or "No available conversation."
  end
end
