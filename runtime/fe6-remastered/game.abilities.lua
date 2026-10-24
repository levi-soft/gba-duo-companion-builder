-- Remaster talk, leadership, Mag and learned skills.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D)
  local modTalkSlots = D.modTalkSlots
  local modTalkNames = D.modTalkNames
  -- Matches this ROM's GetTalkee: pending chapter talk, with target on field.
  local function modTalkTarget(unit)
    if not unit or mem.u32(unit) == 0 then
      return 0
    end
    local chapter = mem.u8(0x0202BCFE)
    if chapter == 0x7f then
      return 0
    end
    local eventId = mem.u8(0x088B0890 + chapter * 0x94 + 0x74)
    local group = mem.u32(0x091FD800 + eventId * 4)
    if group < 0x08000000 or group >= 0x0A000000 then
      return 0
    end
    local events = mem.u32(group + 4)
    if events < 0x08000000 or events >= 0x0A000000 then
      return 0
    end
    local pid = mem.u8(mem.u32(unit) + 4)
    local function flagSet(flag)
      if flag == 0 or flag == 100 then
        return false
      end
      local index = flag < 100 and flag - 1 or flag - 101
      local base = flag < 100 and 0x03005270 or 0x03005250
      return (mem.u8(base + math.floor(index / 8)) & (1 << (index % 8))) ~= 0
    end
    for n = 0, 255 do
      local p = events + n * 16
      local flag = mem.u8(p + 2)
      if flag == 0 then
        return 0
      end
      if mem.u8(p + 8) == pid and not flagSet(flag) then
        local target = mem.u8(p + 9)
        for id, u in pairs(modTalkSlots) do
          if
            id <= 0xbf
            and mem.u32(u) ~= 0
            and (mem.u32(u + 12) & 0x1000c) == 0
            and mem.u8(mem.u32(u) + 4) == target
          then
            return target
          end
        end
      end
    end
    return 0
  end

  local modSkillData = D.modSkillData
  local function applyModSkills(v, unit)
    v.talkTargetId = modTalkTarget(unit)
    v.talkAvailable = v.talkTargetId ~= 0
    v.talkTargetName = modTalkNames[v.talkTargetId] or "---"
    v.talkPrompt = v.talkAvailable and ("Nói chuyện với " .. v.talkTargetName .. ".")
      or "Hiện không có nhân vật để nói chuyện."
    v.powerLabel = "Str"
    v.mag = unit and mem.u32(unit) ~= 0 and mem.u8(unit + 0x3a) or "---"
    v.leadStars = 0
    v.leadershipStars = {}
    v.leadershipVisible = false
    if unit and mem.u32(unit) ~= 0 then
      local pid = mem.u8(mem.u32(unit) + 4)
      for n = 0, 255 do
        local p = 0x09897810 + n * 2
        local id = mem.u8(p)
        if id == 0 then
          break
        end
        if id == pid then
          v.leadStars = mem.u8(p + 1)
          break
        end
      end
      v.leadershipVisible = v.leadStars > 0
      for n = 1, v.leadStars do
        v.leadershipStars[n] = { index = n, left = tostring((n - 1) * 14) .. "px" }
      end
    end
    local ids = {}
    if unit and mem.u32(unit) ~= 0 and mem.u32(unit + 4) ~= 0 then
      if mem.u32(0x02026BB0) == unit then
        for n = 0, 5 do
          local id = mem.u8(0x02026B90 + n)
          if id == 0 then
            break
          end
          ids[#ids + 1] = id
        end
      else
        local pid = mem.u8(mem.u32(unit) + 4)
        local cid = mem.u8(mem.u32(unit + 4) + 4)
        local function add(id)
          if id ~= 0 and id ~= 255 then
            ids[#ids + 1] = id
          end
        end
        add(mem.u8(0x08B2F7DC + pid))
        add(mem.u8(0x08B2F6DC + cid))
        if pid <= 0x46 then
          for n = 1, 4 do
            add(mem.u8(0x0203E884 + pid * 16 + n))
          end
        end
      end
    end
    for n = 1, 6 do
      local id = ids[n] or 0
      local s = modSkillData[id]
      local key = "skill" .. n
      v[key .. "Id"] = id
      v[key .. "Present"] = s ~= nil
      v[key .. "Missing"] = s == nil
      v[key .. "Icon"] = s and s.icon or ""
      v[key .. "Name"] = s and s.name or "---"
      v[key .. "Description"] = s and s.description or ""
    end
  end

  return { apply = applyModSkills }
end
