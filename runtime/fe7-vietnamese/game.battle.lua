-- Battle Forecast records and displayed combat values.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local profile = pack.require("game.profile")

return function(D)
  local fc, fk, fi = D.forecastChars, D.forecastClasses, D.forecastItems
  return function(v)
    -- Immutable fc, fk, fi metadata is initialized once above update().
    local show = v.forecastActive
    v.forecastActive = false
    local a = profile.battleActor
    local d = profile.battleTarget
    if
      show
      and mem.u8(a + 11) == v.deployment
      and fc[mem.u32(a)]
      and fc[mem.u32(d)]
      and fk[mem.u32(a + 4)]
      and fk[mem.u32(d + 4)]
      and mem.u8(a + 18) > 0
      and mem.u8(d + 18) > 0
    then
      for i = 1, 2 do
        local u = i == 1 and a or d
        local other = i == 1 and d or a
        local prefix = i == 1 and "forecastactor" or "forecasttarget"
        local c, k = fc[mem.u32(u)], fk[mem.u32(u + 4)]
        local item = fi[mem.u16(u + 0x4A) % 256]
        local can = mem.u8(u + 0x52) ~= 0
        local speed = mem.s16(u + 0x5E)
        local count = (speed >= mem.s16(other + 0x5E) + 4 and 2 or 1)
          * ((mem.u32(u + 0x4C) & 0x20) ~= 0 and 2 or 1)
        local damage = math.max(0, mem.s16(u + 0x5A) - mem.s16(other + 0x5C))
        v[prefix .. "Name"] = c.name
        v[prefix .. "Class"] = k.name
        v[prefix .. "Portrait"] = c.portrait ~= "" and c.portrait or k.portrait
        v[prefix .. "Hp"] = mem.u8(u + 0x72)
        v[prefix .. "MaxHp"] = mem.u8(u + 18)
        v[prefix .. "Weapon"] = item and item.name or "---"
        v[prefix .. "Icon"] = item and item.icon or ""
        v[prefix .. "Damage"] = can and (tostring(damage) .. (count > 1 and " x" .. count or "")) or "---"
        v[prefix .. "Hit"] = can and mem.s16(u + 0x64) or "---"
        v[prefix .. "Crit"] = can and mem.s16(u + 0x6A) or "---"
        v[prefix .. "AS"] = speed
      end
      local sides = {}
      for i = 1, 2 do
        local u = i == 1 and a or d
        local other = i == 1 and d or a
        local prefix = i == 1 and "forecastactor" or "forecasttarget"
        local weapon = mem.u16(u + 0x4A)
        if weapon == 0 then
          v[prefix .. "Weapon"] = "No weapon"
          v[prefix .. "Icon"] = ""
        end
        local attrs = mem.u32(u + 0x4C)
        local item = fi[weapon % 256]
        local speed = mem.s16(u + 0x5E)
        local count = (speed >= mem.s16(other + 0x5E) + 4 and 2 or 1) * ((attrs & 0x20) ~= 0 and 2 or 1)
        local can = mem.u8(u + 0x52) ~= 0
        local tri = mem.s8(u + 0x54)
        if tri == 0 then
          tri = mem.s8(u + 0x53)
        end
        v[prefix .. "Level"] = mem.u8(u + 8)
        v[prefix .. "Uses"] = weapon ~= 0
            and ((attrs & 8) ~= 0 and "--" or tostring(weapon >> 8) .. "/" .. tostring(
              item and item.maxUses or 0
            ))
          or "--"
        v[prefix .. "Mt"] = can and math.max(0, mem.s16(u + 0x5A) - mem.s16(other + 0x5C)) or "---"
        v[prefix .. "Multiplier"] = can and count > 1 and "×" .. count or ""
        v[prefix .. "HasMulti"] = can and count > 1
        v[prefix .. "Triangle"] = tri > 0 and "↑" or tri < 0 and "↓" or ""
        v[prefix .. "Advantage"] = tri > 0
        v[prefix .. "Disadvantage"] = tri < 0
        sides[i] = {
          hp = mem.u8(u + 0x72),
          max = mem.u8(u + 18),
          speed = speed,
          can = can,
          hit = mem.s16(u + 0x64),
          damage = math.max(0, mem.s16(u + 0x5A) - mem.s16(other + 0x5C)),
          brave = (attrs & 0x20) ~= 0,
          uses = weapon >> 8,
          unbreakable = (attrs & 8) ~= 0,
          drain = weapon % 256 == 17 or weapon % 256 == 70,
        }
      end
      local totals = {}
      for i = 1, 2 do
        local s = sides[i]
        local count = (s.speed >= sides[3 - i].speed + 4 and 2 or 1) * (s.brave and 2 or 1)
        totals[i] = (s.can and s.hit > 0)
            and math.max(0, s.damage) * math.min(count, s.unbreakable and count or math.max(0, s.uses))
          or 0
      end
      local hp = {}
      for i = 1, 2 do
        local s = sides[i]
        hp[i] = math.max(
          0,
          math.min(s.max, s.hp + (s.drain and math.min(sides[3 - i].hp, totals[i]) or 0) - totals[3 - i])
        )
      end
      for i = 1, 2 do
        local prefix = i == 1 and "forecastactor" or "forecasttarget"
        local s = sides[i]
        local loss = math.max(0, s.hp - hp[i])
        v[prefix .. "AfterHp"] = hp[i]
        v[prefix .. "HpLoss"] = loss
        v[prefix .. "HasLoss"] = loss > 0
        v[prefix .. "HpRemainWidth"] = tostring(math.min(s.max, hp[i]) / math.max(1, s.max) * 100) .. "%"
        v[prefix .. "HpLossWidth"] = tostring(loss / math.max(1, s.max) * 100) .. "%"
      end
      v.forecastActive = true
    end

    return v
  end
end
