-- Exact skillGetter contract: personal, class, then four BWL or generic level skills.
return function(D)
  local config, skills = D.skillConfig, D.skillData
  local talk = pack.require("game.talk")(D)
  return {
    apply = function(v, unit)
      talk(v, unit)
      local ids = {}
      local function add(id)
        if id ~= 0 and #ids < 6 then
          ids[#ids + 1] = id
        end
      end
      if unit and D.chars[mem.u32(unit)] and D.classes[mem.u32(unit + 4)] then
        local pid, cid = mem.u8(mem.u32(unit) + 4), mem.u8(mem.u32(unit + 4) + 4)
        add(mem.u8(config.personal + pid))
        add(mem.u8(config.classes + cid))
        if pid <= config.learnedLimit then
          for n = 1, 4 do
            add(mem.u8(config.bwl + pid * 16 + n))
          end
        else
          local list, level = mem.u32(config.level + cid * 4), mem.u8(unit + 8)
          if list >= 0x08000000 and list < 0x0A000000 then
            for n = 0, 127 do
              local required = mem.u8(list + n * 2)
              if required == 0 then
                break
              end
              if required <= level or required == 255 then
                add(mem.u8(list + n * 2 + 1))
              end
            end
          end
        end
      end
      v.nativeSkillCount = #ids
      for n = 1, 6 do
        local id, key = ids[n] or 0, "nativeSkill" .. n
        local skill = skills[id]
        v[key .. "Id"] = id
        v[key .. "Present"] = id ~= 0
        v[key .. "Icon"] = skill and skill.icon or ""
        v[key .. "Name"] = skill and skill.name or (id ~= 0 and "Skill " .. id or "")
        v[key .. "Description"] = skill and skill.description or ""
      end
    end,
  }
end
