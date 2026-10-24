-- Generated declarative field bindings; nil guards preserve the original contract.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

return function(D, values, state)
  local truth, choose, all, any, first = values.truth, values.choose, values.all, values.any, values.first
  local lookup1 = D.lookup1
  local lookup2 = D.lookup2
  local lookup3 = D.lookup3
  local lookup4 = D.lookup4
  local lookup5 = D.lookup5
  local lookup6 = D.lookup6
  local lookup7 = D.lookup7
  local lookup8 = D.lookup8
  local lookup9 = D.lookup9
  local lookup10 = D.lookup10
  local lookup11 = D.lookup11
  local lookup12 = D.lookup12
  local lookup13 = D.lookup13
  local lookup14 = D.lookup14
  local lookup15 = D.lookup15
  local lookup16 = D.lookup16
  local lookup17 = D.lookup17
  local lookup18 = D.lookup18
  local lookup19 = D.lookup19
  local lookup20 = D.lookup20
  local lookup21 = D.lookup21
  local lookup22 = D.lookup22
  local lookup23 = D.lookup23
  local lookup24 = D.lookup24
  local lookup25 = D.lookup25
  local lookup26 = D.lookup26
  local lookup27 = D.lookup27
  local lookup28 = D.lookup28
  local lookup29 = D.lookup29
  local lookup30 = D.lookup30
  local lookup31 = D.lookup31
  local lookup32 = D.lookup32
  local lookup33 = D.lookup33
  local lookup34 = D.lookup34
  local lookup35 = D.lookup35
  return function(v, unit)
    v["className"] = lookup1[tostring(v["classPointer"])]
    if v["className"] == nil then
      return {}
    end
    v["affinity"] = lookup2[tostring(v["characterPointer"])]
    if v["affinity"] == nil then
      return {}
    end
    v["portrait"] = first(lookup3[tostring(v["characterPointer"])], lookup4[tostring(v["classPointer"])])
    if v["portrait"] == nil then
      return {}
    end
    v["mapSprite"] = lookup5[tostring(((v["classPointer"] * 4) + math.floor(v["deployment"] / 64)))]
    if v["mapSprite"] == nil then
      return {}
    end
    v["move"] = (lookup6[tostring(v["classPointer"])] + v["movBonus"])
    if v["move"] == nil then
      return {}
    end
    v["con"] = (
      lookup7[tostring(v["classPointer"])]
      + lookup8[tostring(v["characterPointer"])]
      + v["conBonus"]
    )
    if v["con"] == nil then
      return {}
    end
    v["aid"] = 0
    if v["aid"] == nil then
      return {}
    end
    v["traveler"] = "---"
    if v["traveler"] == nil then
      return {}
    end
    v["condition"] = lookup9[tostring((v["statusByte"] % 16))]
    if v["condition"] == nil then
      return {}
    end
    v["conditionTurns"] = math.floor(v["statusByte"] / 16)
    if v["conditionTurns"] == nil then
      return {}
    end
    v["unitName"] = lookup10[tostring(v["characterPointer"])]
    if v["unitName"] == nil then
      return {}
    end
    v["expDisplay"] = lookup11[tostring(v["exp"])]
    if v["expDisplay"] == nil then
      return {}
    end
    v["rankSword"] = choose(
      (v["rankSwordRaw"] >= 251),
      "S",
      choose(
        (v["rankSwordRaw"] >= 181),
        "A",
        choose(
          (v["rankSwordRaw"] >= 121),
          "B",
          choose(
            (v["rankSwordRaw"] >= 71),
            "C",
            choose((v["rankSwordRaw"] >= 31), "D", choose((v["rankSwordRaw"] >= 1), "E", "---"))
          )
        )
      )
    )
    if v["rankSword"] == nil then
      return {}
    end
    v["rankSwordProgress"] = choose(
      (v["rankSwordRaw"] >= 251),
      1,
      choose(
        (v["rankSwordRaw"] >= 181),
        (v["rankSwordRaw"] - 181),
        choose(
          (v["rankSwordRaw"] >= 121),
          (v["rankSwordRaw"] - 121),
          choose(
            (v["rankSwordRaw"] >= 71),
            (v["rankSwordRaw"] - 71),
            choose(
              (v["rankSwordRaw"] >= 31),
              (v["rankSwordRaw"] - 31),
              choose((v["rankSwordRaw"] >= 1), (v["rankSwordRaw"] - 1), 0)
            )
          )
        )
      )
    )
    if v["rankSwordProgress"] == nil then
      return {}
    end
    v["rankSwordProgressMax"] = choose(
      (v["rankSwordRaw"] >= 251),
      1,
      choose(
        (v["rankSwordRaw"] >= 181),
        70,
        choose(
          (v["rankSwordRaw"] >= 121),
          60,
          choose(
            (v["rankSwordRaw"] >= 71),
            50,
            choose((v["rankSwordRaw"] >= 31), 40, choose((v["rankSwordRaw"] >= 1), 30, 1))
          )
        )
      )
    )
    if v["rankSwordProgressMax"] == nil then
      return {}
    end
    v["rankLance"] = choose(
      (v["rankLanceRaw"] >= 251),
      "S",
      choose(
        (v["rankLanceRaw"] >= 181),
        "A",
        choose(
          (v["rankLanceRaw"] >= 121),
          "B",
          choose(
            (v["rankLanceRaw"] >= 71),
            "C",
            choose((v["rankLanceRaw"] >= 31), "D", choose((v["rankLanceRaw"] >= 1), "E", "---"))
          )
        )
      )
    )
    if v["rankLance"] == nil then
      return {}
    end
    v["rankLanceProgress"] = choose(
      (v["rankLanceRaw"] >= 251),
      1,
      choose(
        (v["rankLanceRaw"] >= 181),
        (v["rankLanceRaw"] - 181),
        choose(
          (v["rankLanceRaw"] >= 121),
          (v["rankLanceRaw"] - 121),
          choose(
            (v["rankLanceRaw"] >= 71),
            (v["rankLanceRaw"] - 71),
            choose(
              (v["rankLanceRaw"] >= 31),
              (v["rankLanceRaw"] - 31),
              choose((v["rankLanceRaw"] >= 1), (v["rankLanceRaw"] - 1), 0)
            )
          )
        )
      )
    )
    if v["rankLanceProgress"] == nil then
      return {}
    end
    v["rankLanceProgressMax"] = choose(
      (v["rankLanceRaw"] >= 251),
      1,
      choose(
        (v["rankLanceRaw"] >= 181),
        70,
        choose(
          (v["rankLanceRaw"] >= 121),
          60,
          choose(
            (v["rankLanceRaw"] >= 71),
            50,
            choose((v["rankLanceRaw"] >= 31), 40, choose((v["rankLanceRaw"] >= 1), 30, 1))
          )
        )
      )
    )
    if v["rankLanceProgressMax"] == nil then
      return {}
    end
    v["rankAxe"] = choose(
      (v["rankAxeRaw"] >= 251),
      "S",
      choose(
        (v["rankAxeRaw"] >= 181),
        "A",
        choose(
          (v["rankAxeRaw"] >= 121),
          "B",
          choose(
            (v["rankAxeRaw"] >= 71),
            "C",
            choose((v["rankAxeRaw"] >= 31), "D", choose((v["rankAxeRaw"] >= 1), "E", "---"))
          )
        )
      )
    )
    if v["rankAxe"] == nil then
      return {}
    end
    v["rankAxeProgress"] = choose(
      (v["rankAxeRaw"] >= 251),
      1,
      choose(
        (v["rankAxeRaw"] >= 181),
        (v["rankAxeRaw"] - 181),
        choose(
          (v["rankAxeRaw"] >= 121),
          (v["rankAxeRaw"] - 121),
          choose(
            (v["rankAxeRaw"] >= 71),
            (v["rankAxeRaw"] - 71),
            choose(
              (v["rankAxeRaw"] >= 31),
              (v["rankAxeRaw"] - 31),
              choose((v["rankAxeRaw"] >= 1), (v["rankAxeRaw"] - 1), 0)
            )
          )
        )
      )
    )
    if v["rankAxeProgress"] == nil then
      return {}
    end
    v["rankAxeProgressMax"] = choose(
      (v["rankAxeRaw"] >= 251),
      1,
      choose(
        (v["rankAxeRaw"] >= 181),
        70,
        choose(
          (v["rankAxeRaw"] >= 121),
          60,
          choose(
            (v["rankAxeRaw"] >= 71),
            50,
            choose((v["rankAxeRaw"] >= 31), 40, choose((v["rankAxeRaw"] >= 1), 30, 1))
          )
        )
      )
    )
    if v["rankAxeProgressMax"] == nil then
      return {}
    end
    v["rankBow"] = choose(
      (v["rankBowRaw"] >= 251),
      "S",
      choose(
        (v["rankBowRaw"] >= 181),
        "A",
        choose(
          (v["rankBowRaw"] >= 121),
          "B",
          choose(
            (v["rankBowRaw"] >= 71),
            "C",
            choose((v["rankBowRaw"] >= 31), "D", choose((v["rankBowRaw"] >= 1), "E", "---"))
          )
        )
      )
    )
    if v["rankBow"] == nil then
      return {}
    end
    v["rankBowProgress"] = choose(
      (v["rankBowRaw"] >= 251),
      1,
      choose(
        (v["rankBowRaw"] >= 181),
        (v["rankBowRaw"] - 181),
        choose(
          (v["rankBowRaw"] >= 121),
          (v["rankBowRaw"] - 121),
          choose(
            (v["rankBowRaw"] >= 71),
            (v["rankBowRaw"] - 71),
            choose(
              (v["rankBowRaw"] >= 31),
              (v["rankBowRaw"] - 31),
              choose((v["rankBowRaw"] >= 1), (v["rankBowRaw"] - 1), 0)
            )
          )
        )
      )
    )
    if v["rankBowProgress"] == nil then
      return {}
    end
    v["rankBowProgressMax"] = choose(
      (v["rankBowRaw"] >= 251),
      1,
      choose(
        (v["rankBowRaw"] >= 181),
        70,
        choose(
          (v["rankBowRaw"] >= 121),
          60,
          choose(
            (v["rankBowRaw"] >= 71),
            50,
            choose((v["rankBowRaw"] >= 31), 40, choose((v["rankBowRaw"] >= 1), 30, 1))
          )
        )
      )
    )
    if v["rankBowProgressMax"] == nil then
      return {}
    end
    v["rankStaff"] = choose(
      (v["rankStaffRaw"] >= 251),
      "S",
      choose(
        (v["rankStaffRaw"] >= 181),
        "A",
        choose(
          (v["rankStaffRaw"] >= 121),
          "B",
          choose(
            (v["rankStaffRaw"] >= 71),
            "C",
            choose((v["rankStaffRaw"] >= 31), "D", choose((v["rankStaffRaw"] >= 1), "E", "---"))
          )
        )
      )
    )
    if v["rankStaff"] == nil then
      return {}
    end
    v["rankStaffProgress"] = choose(
      (v["rankStaffRaw"] >= 251),
      1,
      choose(
        (v["rankStaffRaw"] >= 181),
        (v["rankStaffRaw"] - 181),
        choose(
          (v["rankStaffRaw"] >= 121),
          (v["rankStaffRaw"] - 121),
          choose(
            (v["rankStaffRaw"] >= 71),
            (v["rankStaffRaw"] - 71),
            choose(
              (v["rankStaffRaw"] >= 31),
              (v["rankStaffRaw"] - 31),
              choose((v["rankStaffRaw"] >= 1), (v["rankStaffRaw"] - 1), 0)
            )
          )
        )
      )
    )
    if v["rankStaffProgress"] == nil then
      return {}
    end
    v["rankStaffProgressMax"] = choose(
      (v["rankStaffRaw"] >= 251),
      1,
      choose(
        (v["rankStaffRaw"] >= 181),
        70,
        choose(
          (v["rankStaffRaw"] >= 121),
          60,
          choose(
            (v["rankStaffRaw"] >= 71),
            50,
            choose((v["rankStaffRaw"] >= 31), 40, choose((v["rankStaffRaw"] >= 1), 30, 1))
          )
        )
      )
    )
    if v["rankStaffProgressMax"] == nil then
      return {}
    end
    v["rankAnima"] = choose(
      (v["rankAnimaRaw"] >= 251),
      "S",
      choose(
        (v["rankAnimaRaw"] >= 181),
        "A",
        choose(
          (v["rankAnimaRaw"] >= 121),
          "B",
          choose(
            (v["rankAnimaRaw"] >= 71),
            "C",
            choose((v["rankAnimaRaw"] >= 31), "D", choose((v["rankAnimaRaw"] >= 1), "E", "---"))
          )
        )
      )
    )
    if v["rankAnima"] == nil then
      return {}
    end
    v["rankAnimaProgress"] = choose(
      (v["rankAnimaRaw"] >= 251),
      1,
      choose(
        (v["rankAnimaRaw"] >= 181),
        (v["rankAnimaRaw"] - 181),
        choose(
          (v["rankAnimaRaw"] >= 121),
          (v["rankAnimaRaw"] - 121),
          choose(
            (v["rankAnimaRaw"] >= 71),
            (v["rankAnimaRaw"] - 71),
            choose(
              (v["rankAnimaRaw"] >= 31),
              (v["rankAnimaRaw"] - 31),
              choose((v["rankAnimaRaw"] >= 1), (v["rankAnimaRaw"] - 1), 0)
            )
          )
        )
      )
    )
    if v["rankAnimaProgress"] == nil then
      return {}
    end
    v["rankAnimaProgressMax"] = choose(
      (v["rankAnimaRaw"] >= 251),
      1,
      choose(
        (v["rankAnimaRaw"] >= 181),
        70,
        choose(
          (v["rankAnimaRaw"] >= 121),
          60,
          choose(
            (v["rankAnimaRaw"] >= 71),
            50,
            choose((v["rankAnimaRaw"] >= 31), 40, choose((v["rankAnimaRaw"] >= 1), 30, 1))
          )
        )
      )
    )
    if v["rankAnimaProgressMax"] == nil then
      return {}
    end
    v["rankLight"] = choose(
      (v["rankLightRaw"] >= 251),
      "S",
      choose(
        (v["rankLightRaw"] >= 181),
        "A",
        choose(
          (v["rankLightRaw"] >= 121),
          "B",
          choose(
            (v["rankLightRaw"] >= 71),
            "C",
            choose((v["rankLightRaw"] >= 31), "D", choose((v["rankLightRaw"] >= 1), "E", "---"))
          )
        )
      )
    )
    if v["rankLight"] == nil then
      return {}
    end
    v["rankLightProgress"] = choose(
      (v["rankLightRaw"] >= 251),
      1,
      choose(
        (v["rankLightRaw"] >= 181),
        (v["rankLightRaw"] - 181),
        choose(
          (v["rankLightRaw"] >= 121),
          (v["rankLightRaw"] - 121),
          choose(
            (v["rankLightRaw"] >= 71),
            (v["rankLightRaw"] - 71),
            choose(
              (v["rankLightRaw"] >= 31),
              (v["rankLightRaw"] - 31),
              choose((v["rankLightRaw"] >= 1), (v["rankLightRaw"] - 1), 0)
            )
          )
        )
      )
    )
    if v["rankLightProgress"] == nil then
      return {}
    end
    v["rankLightProgressMax"] = choose(
      (v["rankLightRaw"] >= 251),
      1,
      choose(
        (v["rankLightRaw"] >= 181),
        70,
        choose(
          (v["rankLightRaw"] >= 121),
          60,
          choose(
            (v["rankLightRaw"] >= 71),
            50,
            choose((v["rankLightRaw"] >= 31), 40, choose((v["rankLightRaw"] >= 1), 30, 1))
          )
        )
      )
    )
    if v["rankLightProgressMax"] == nil then
      return {}
    end
    v["rankDark"] = choose(
      (v["rankDarkRaw"] >= 251),
      "S",
      choose(
        (v["rankDarkRaw"] >= 181),
        "A",
        choose(
          (v["rankDarkRaw"] >= 121),
          "B",
          choose(
            (v["rankDarkRaw"] >= 71),
            "C",
            choose((v["rankDarkRaw"] >= 31), "D", choose((v["rankDarkRaw"] >= 1), "E", "---"))
          )
        )
      )
    )
    if v["rankDark"] == nil then
      return {}
    end
    v["rankDarkProgress"] = choose(
      (v["rankDarkRaw"] >= 251),
      1,
      choose(
        (v["rankDarkRaw"] >= 181),
        (v["rankDarkRaw"] - 181),
        choose(
          (v["rankDarkRaw"] >= 121),
          (v["rankDarkRaw"] - 121),
          choose(
            (v["rankDarkRaw"] >= 71),
            (v["rankDarkRaw"] - 71),
            choose(
              (v["rankDarkRaw"] >= 31),
              (v["rankDarkRaw"] - 31),
              choose((v["rankDarkRaw"] >= 1), (v["rankDarkRaw"] - 1), 0)
            )
          )
        )
      )
    )
    if v["rankDarkProgress"] == nil then
      return {}
    end
    v["rankDarkProgressMax"] = choose(
      (v["rankDarkRaw"] >= 251),
      1,
      choose(
        (v["rankDarkRaw"] >= 181),
        70,
        choose(
          (v["rankDarkRaw"] >= 121),
          60,
          choose(
            (v["rankDarkRaw"] >= 71),
            50,
            choose((v["rankDarkRaw"] >= 31), 40, choose((v["rankDarkRaw"] >= 1), 30, 1))
          )
        )
      )
    )
    if v["rankDarkProgressMax"] == nil then
      return {}
    end
    v["powerLabel"] = lookup12[tostring(v["classPointer"])]
    if v["powerLabel"] == nil then
      return {}
    end
    v["support1Name"] = ""
    if v["support1Name"] == nil then
      return {}
    end
    v["support1Portrait"] = ""
    if v["support1Portrait"] == nil then
      return {}
    end
    v["support1Rank"] = choose(
      (v["support1Exp"] >= 241),
      "A",
      choose((v["support1Exp"] >= 161), "B", choose((v["support1Exp"] >= 81), "C", "---"))
    )
    if v["support1Rank"] == nil then
      return {}
    end
    v["support2Name"] = ""
    if v["support2Name"] == nil then
      return {}
    end
    v["support2Portrait"] = ""
    if v["support2Portrait"] == nil then
      return {}
    end
    v["support2Rank"] = choose(
      (v["support2Exp"] >= 241),
      "A",
      choose((v["support2Exp"] >= 161), "B", choose((v["support2Exp"] >= 81), "C", "---"))
    )
    if v["support2Rank"] == nil then
      return {}
    end
    v["support3Name"] = ""
    if v["support3Name"] == nil then
      return {}
    end
    v["support3Portrait"] = ""
    if v["support3Portrait"] == nil then
      return {}
    end
    v["support3Rank"] = choose(
      (v["support3Exp"] >= 241),
      "A",
      choose((v["support3Exp"] >= 161), "B", choose((v["support3Exp"] >= 81), "C", "---"))
    )
    if v["support3Rank"] == nil then
      return {}
    end
    v["support4Name"] = ""
    if v["support4Name"] == nil then
      return {}
    end
    v["support4Portrait"] = ""
    if v["support4Portrait"] == nil then
      return {}
    end
    v["support4Rank"] = choose(
      (v["support4Exp"] >= 241),
      "A",
      choose((v["support4Exp"] >= 161), "B", choose((v["support4Exp"] >= 81), "C", "---"))
    )
    if v["support4Rank"] == nil then
      return {}
    end
    v["support5Name"] = ""
    if v["support5Name"] == nil then
      return {}
    end
    v["support5Portrait"] = ""
    if v["support5Portrait"] == nil then
      return {}
    end
    v["support5Rank"] = choose(
      (v["support5Exp"] >= 241),
      "A",
      choose((v["support5Exp"] >= 161), "B", choose((v["support5Exp"] >= 81), "C", "---"))
    )
    if v["support5Rank"] == nil then
      return {}
    end
    v["item1Id"] = (v["item1"] % 256)
    if v["item1Id"] == nil then
      return {}
    end
    v["item1Name"] = lookup13[tostring(v["item1Id"])]
    if v["item1Name"] == nil then
      return {}
    end
    v["item1Icon"] = lookup14[tostring(v["item1Id"])]
    if v["item1Icon"] == nil then
      return {}
    end
    v["item1Uses"] = math.floor(v["item1"] / 256)
    if v["item1Uses"] == nil then
      return {}
    end
    v["item1MaxUses"] = lookup15[tostring(v["item1Id"])]
    if v["item1MaxUses"] == nil then
      return {}
    end
    v["item1Unbreakable"] = lookup16[tostring(v["item1Id"])]
    if v["item1Unbreakable"] == nil then
      return {}
    end
    v["item1UsesDisplay"] = choose(v["item1Unbreakable"], "\226\136\158", v["item1Uses"])
    if v["item1UsesDisplay"] == nil then
      return {}
    end
    v["item1MaxDisplay"] = choose(v["item1Unbreakable"], "\226\136\158", v["item1MaxUses"])
    if v["item1MaxDisplay"] == nil then
      return {}
    end
    v["item2Id"] = (v["item2"] % 256)
    if v["item2Id"] == nil then
      return {}
    end
    v["item2Name"] = lookup13[tostring(v["item2Id"])]
    if v["item2Name"] == nil then
      return {}
    end
    v["item2Icon"] = lookup14[tostring(v["item2Id"])]
    if v["item2Icon"] == nil then
      return {}
    end
    v["item2Uses"] = math.floor(v["item2"] / 256)
    if v["item2Uses"] == nil then
      return {}
    end
    v["item2MaxUses"] = lookup15[tostring(v["item2Id"])]
    if v["item2MaxUses"] == nil then
      return {}
    end
    v["item2Unbreakable"] = lookup16[tostring(v["item2Id"])]
    if v["item2Unbreakable"] == nil then
      return {}
    end
    v["item2UsesDisplay"] = choose(v["item2Unbreakable"], "\226\136\158", v["item2Uses"])
    if v["item2UsesDisplay"] == nil then
      return {}
    end
    v["item2MaxDisplay"] = choose(v["item2Unbreakable"], "\226\136\158", v["item2MaxUses"])
    if v["item2MaxDisplay"] == nil then
      return {}
    end
    v["item3Id"] = (v["item3"] % 256)
    if v["item3Id"] == nil then
      return {}
    end
    v["item3Name"] = lookup13[tostring(v["item3Id"])]
    if v["item3Name"] == nil then
      return {}
    end
    v["item3Icon"] = lookup14[tostring(v["item3Id"])]
    if v["item3Icon"] == nil then
      return {}
    end
    v["item3Uses"] = math.floor(v["item3"] / 256)
    if v["item3Uses"] == nil then
      return {}
    end
    v["item3MaxUses"] = lookup15[tostring(v["item3Id"])]
    if v["item3MaxUses"] == nil then
      return {}
    end
    v["item3Unbreakable"] = lookup16[tostring(v["item3Id"])]
    if v["item3Unbreakable"] == nil then
      return {}
    end
    v["item3UsesDisplay"] = choose(v["item3Unbreakable"], "\226\136\158", v["item3Uses"])
    if v["item3UsesDisplay"] == nil then
      return {}
    end
    v["item3MaxDisplay"] = choose(v["item3Unbreakable"], "\226\136\158", v["item3MaxUses"])
    if v["item3MaxDisplay"] == nil then
      return {}
    end
    v["item4Id"] = (v["item4"] % 256)
    if v["item4Id"] == nil then
      return {}
    end
    v["item4Name"] = lookup13[tostring(v["item4Id"])]
    if v["item4Name"] == nil then
      return {}
    end
    v["item4Icon"] = lookup14[tostring(v["item4Id"])]
    if v["item4Icon"] == nil then
      return {}
    end
    v["item4Uses"] = math.floor(v["item4"] / 256)
    if v["item4Uses"] == nil then
      return {}
    end
    v["item4MaxUses"] = lookup15[tostring(v["item4Id"])]
    if v["item4MaxUses"] == nil then
      return {}
    end
    v["item4Unbreakable"] = lookup16[tostring(v["item4Id"])]
    if v["item4Unbreakable"] == nil then
      return {}
    end
    v["item4UsesDisplay"] = choose(v["item4Unbreakable"], "\226\136\158", v["item4Uses"])
    if v["item4UsesDisplay"] == nil then
      return {}
    end
    v["item4MaxDisplay"] = choose(v["item4Unbreakable"], "\226\136\158", v["item4MaxUses"])
    if v["item4MaxDisplay"] == nil then
      return {}
    end
    v["item5Id"] = (v["item5"] % 256)
    if v["item5Id"] == nil then
      return {}
    end
    v["item5Name"] = lookup13[tostring(v["item5Id"])]
    if v["item5Name"] == nil then
      return {}
    end
    v["item5Icon"] = lookup14[tostring(v["item5Id"])]
    if v["item5Icon"] == nil then
      return {}
    end
    v["item5Uses"] = math.floor(v["item5"] / 256)
    if v["item5Uses"] == nil then
      return {}
    end
    v["item5MaxUses"] = lookup15[tostring(v["item5Id"])]
    if v["item5MaxUses"] == nil then
      return {}
    end
    v["item5Unbreakable"] = lookup16[tostring(v["item5Id"])]
    if v["item5Unbreakable"] == nil then
      return {}
    end
    v["item5UsesDisplay"] = choose(v["item5Unbreakable"], "\226\136\158", v["item5Uses"])
    if v["item5UsesDisplay"] == nil then
      return {}
    end
    v["item5MaxDisplay"] = choose(v["item5Unbreakable"], "\226\136\158", v["item5MaxUses"])
    if v["item5MaxDisplay"] == nil then
      return {}
    end
    v["firstItemSlot"] = choose(
      (v["item1Id"] >= 1),
      1,
      choose(
        (v["item2Id"] >= 1),
        2,
        choose((v["item3Id"] >= 1), 3, choose((v["item4Id"] >= 1), 4, choose((v["item5Id"] >= 1), 5, 0)))
      )
    )
    if v["firstItemSlot"] == nil then
      return {}
    end
    v["lastItemSlot"] = choose(
      (v["item5Id"] >= 1),
      5,
      choose(
        (v["item4Id"] >= 1),
        4,
        choose((v["item3Id"] >= 1), 3, choose((v["item2Id"] >= 1), 2, choose((v["item1Id"] >= 1), 1, 0)))
      )
    )
    if v["lastItemSlot"] == nil then
      return {}
    end
    v["unitDropsItem"] = ((math.floor(v["unitState"] / 4096) % 2) == 1)
    if v["unitDropsItem"] == nil then
      return {}
    end
    v["item1Droppable"] = all(v["unitDropsItem"], (v["lastItemSlot"] == 1))
    if v["item1Droppable"] == nil then
      return {}
    end
    v["item2Droppable"] = all(v["unitDropsItem"], (v["lastItemSlot"] == 2))
    if v["item2Droppable"] == nil then
      return {}
    end
    v["item3Droppable"] = all(v["unitDropsItem"], (v["lastItemSlot"] == 3))
    if v["item3Droppable"] == nil then
      return {}
    end
    v["item4Droppable"] = all(v["unitDropsItem"], (v["lastItemSlot"] == 4))
    if v["item4Droppable"] == nil then
      return {}
    end
    v["item5Droppable"] = all(v["unitDropsItem"], (v["lastItemSlot"] == 5))
    if v["item5Droppable"] == nil then
      return {}
    end
    v["firstItemPage"] = lookup17[tostring(v["firstItemSlot"])]
    if v["firstItemPage"] == nil then
      return {}
    end
    v["item1Description"] = lookup18[tostring(v["item1Id"])]
    if v["item1Description"] == nil then
      return {}
    end
    v["item1Might"] = lookup19[tostring(v["item1Id"])]
    if v["item1Might"] == nil then
      return {}
    end
    v["item1Hit"] = lookup20[tostring(v["item1Id"])]
    if v["item1Hit"] == nil then
      return {}
    end
    v["item1Crit"] = lookup21[tostring(v["item1Id"])]
    if v["item1Crit"] == nil then
      return {}
    end
    v["item1Weight"] = lookup22[tostring(v["item1Id"])]
    if v["item1Weight"] == nil then
      return {}
    end
    v["item1Type"] = lookup23[tostring(v["item1Id"])]
    if v["item1Type"] == nil then
      return {}
    end
    v["item1Rank"] = lookup24[tostring(v["item1Id"])]
    if v["item1Rank"] == nil then
      return {}
    end
    v["item1Range"] = lookup25[tostring(v["item1Id"])]
    if v["item1Range"] == nil then
      return {}
    end
    v["item1IsWeapon"] = lookup26[tostring(v["item1Id"])]
    if v["item1IsWeapon"] == nil then
      return {}
    end
    v["item1HasRank"] = lookup26[tostring(v["item1Id"])]
    if v["item1HasRank"] == nil then
      return {}
    end
    v["firstItemSelected1"] = (v["firstItemSlot"] == 1)
    if v["firstItemSelected1"] == nil then
      return {}
    end
    v["item2Description"] = lookup18[tostring(v["item2Id"])]
    if v["item2Description"] == nil then
      return {}
    end
    v["item2Might"] = lookup19[tostring(v["item2Id"])]
    if v["item2Might"] == nil then
      return {}
    end
    v["item2Hit"] = lookup20[tostring(v["item2Id"])]
    if v["item2Hit"] == nil then
      return {}
    end
    v["item2Crit"] = lookup21[tostring(v["item2Id"])]
    if v["item2Crit"] == nil then
      return {}
    end
    v["item2Weight"] = lookup22[tostring(v["item2Id"])]
    if v["item2Weight"] == nil then
      return {}
    end
    v["item2Type"] = lookup23[tostring(v["item2Id"])]
    if v["item2Type"] == nil then
      return {}
    end
    v["item2Rank"] = lookup24[tostring(v["item2Id"])]
    if v["item2Rank"] == nil then
      return {}
    end
    v["item2Range"] = lookup25[tostring(v["item2Id"])]
    if v["item2Range"] == nil then
      return {}
    end
    v["item2IsWeapon"] = lookup26[tostring(v["item2Id"])]
    if v["item2IsWeapon"] == nil then
      return {}
    end
    v["item2HasRank"] = lookup26[tostring(v["item2Id"])]
    if v["item2HasRank"] == nil then
      return {}
    end
    v["firstItemSelected2"] = (v["firstItemSlot"] == 2)
    if v["firstItemSelected2"] == nil then
      return {}
    end
    v["item3Description"] = lookup18[tostring(v["item3Id"])]
    if v["item3Description"] == nil then
      return {}
    end
    v["item3Might"] = lookup19[tostring(v["item3Id"])]
    if v["item3Might"] == nil then
      return {}
    end
    v["item3Hit"] = lookup20[tostring(v["item3Id"])]
    if v["item3Hit"] == nil then
      return {}
    end
    v["item3Crit"] = lookup21[tostring(v["item3Id"])]
    if v["item3Crit"] == nil then
      return {}
    end
    v["item3Weight"] = lookup22[tostring(v["item3Id"])]
    if v["item3Weight"] == nil then
      return {}
    end
    v["item3Type"] = lookup23[tostring(v["item3Id"])]
    if v["item3Type"] == nil then
      return {}
    end
    v["item3Rank"] = lookup24[tostring(v["item3Id"])]
    if v["item3Rank"] == nil then
      return {}
    end
    v["item3Range"] = lookup25[tostring(v["item3Id"])]
    if v["item3Range"] == nil then
      return {}
    end
    v["item3IsWeapon"] = lookup26[tostring(v["item3Id"])]
    if v["item3IsWeapon"] == nil then
      return {}
    end
    v["item3HasRank"] = lookup26[tostring(v["item3Id"])]
    if v["item3HasRank"] == nil then
      return {}
    end
    v["firstItemSelected3"] = (v["firstItemSlot"] == 3)
    if v["firstItemSelected3"] == nil then
      return {}
    end
    v["item4Description"] = lookup18[tostring(v["item4Id"])]
    if v["item4Description"] == nil then
      return {}
    end
    v["item4Might"] = lookup19[tostring(v["item4Id"])]
    if v["item4Might"] == nil then
      return {}
    end
    v["item4Hit"] = lookup20[tostring(v["item4Id"])]
    if v["item4Hit"] == nil then
      return {}
    end
    v["item4Crit"] = lookup21[tostring(v["item4Id"])]
    if v["item4Crit"] == nil then
      return {}
    end
    v["item4Weight"] = lookup22[tostring(v["item4Id"])]
    if v["item4Weight"] == nil then
      return {}
    end
    v["item4Type"] = lookup23[tostring(v["item4Id"])]
    if v["item4Type"] == nil then
      return {}
    end
    v["item4Rank"] = lookup24[tostring(v["item4Id"])]
    if v["item4Rank"] == nil then
      return {}
    end
    v["item4Range"] = lookup25[tostring(v["item4Id"])]
    if v["item4Range"] == nil then
      return {}
    end
    v["item4IsWeapon"] = lookup26[tostring(v["item4Id"])]
    if v["item4IsWeapon"] == nil then
      return {}
    end
    v["item4HasRank"] = lookup26[tostring(v["item4Id"])]
    if v["item4HasRank"] == nil then
      return {}
    end
    v["firstItemSelected4"] = (v["firstItemSlot"] == 4)
    if v["firstItemSelected4"] == nil then
      return {}
    end
    v["item5Description"] = lookup18[tostring(v["item5Id"])]
    if v["item5Description"] == nil then
      return {}
    end
    v["item5Might"] = lookup19[tostring(v["item5Id"])]
    if v["item5Might"] == nil then
      return {}
    end
    v["item5Hit"] = lookup20[tostring(v["item5Id"])]
    if v["item5Hit"] == nil then
      return {}
    end
    v["item5Crit"] = lookup21[tostring(v["item5Id"])]
    if v["item5Crit"] == nil then
      return {}
    end
    v["item5Weight"] = lookup22[tostring(v["item5Id"])]
    if v["item5Weight"] == nil then
      return {}
    end
    v["item5Type"] = lookup23[tostring(v["item5Id"])]
    if v["item5Type"] == nil then
      return {}
    end
    v["item5Rank"] = lookup24[tostring(v["item5Id"])]
    if v["item5Rank"] == nil then
      return {}
    end
    v["item5Range"] = lookup25[tostring(v["item5Id"])]
    if v["item5Range"] == nil then
      return {}
    end
    v["item5IsWeapon"] = lookup26[tostring(v["item5Id"])]
    if v["item5IsWeapon"] == nil then
      return {}
    end
    v["item5HasRank"] = lookup26[tostring(v["item5Id"])]
    if v["item5HasRank"] == nil then
      return {}
    end
    v["firstItemSelected5"] = (v["firstItemSlot"] == 5)
    if v["firstItemSelected5"] == nil then
      return {}
    end
    v["affinityPow"] = lookup27[tostring(v["affinity"])]
    if v["affinityPow"] == nil then
      return {}
    end
    v["affinityDef"] = lookup28[tostring(v["affinity"])]
    if v["affinityDef"] == nil then
      return {}
    end
    v["affinityHit"] = lookup29[tostring(v["affinity"])]
    if v["affinityHit"] == nil then
      return {}
    end
    v["affinityAvo"] = lookup30[tostring(v["affinity"])]
    if v["affinityAvo"] == nil then
      return {}
    end
    v["affinityCrit"] = lookup31[tostring(v["affinity"])]
    if v["affinityCrit"] == nil then
      return {}
    end
    v["affinityCritAvo"] = lookup32[tostring(v["affinity"])]
    if v["affinityCritAvo"] == nil then
      return {}
    end
    v["item1IsNonWeapon"] = choose(v["item1IsWeapon"], false, true)
    if v["item1IsNonWeapon"] == nil then
      return {}
    end
    v["item2IsNonWeapon"] = choose(v["item2IsWeapon"], false, true)
    if v["item2IsNonWeapon"] == nil then
      return {}
    end
    v["item3IsNonWeapon"] = choose(v["item3IsWeapon"], false, true)
    if v["item3IsNonWeapon"] == nil then
      return {}
    end
    v["item4IsNonWeapon"] = choose(v["item4IsWeapon"], false, true)
    if v["item4IsNonWeapon"] == nil then
      return {}
    end
    v["item5IsNonWeapon"] = choose(v["item5IsWeapon"], false, true)
    if v["item5IsNonWeapon"] == nil then
      return {}
    end
    v["support1PortraitMissing"] = choose(v["support1Portrait"], false, true)
    if v["support1PortraitMissing"] == nil then
      return {}
    end
    v["support1DisplayRank"] = choose(v["support1Name"], v["support1Rank"], "---")
    if v["support1DisplayRank"] == nil then
      return {}
    end
    v["support2PortraitMissing"] = choose(v["support2Portrait"], false, true)
    if v["support2PortraitMissing"] == nil then
      return {}
    end
    v["support2DisplayRank"] = choose(v["support2Name"], v["support2Rank"], "---")
    if v["support2DisplayRank"] == nil then
      return {}
    end
    v["support3PortraitMissing"] = choose(v["support3Portrait"], false, true)
    if v["support3PortraitMissing"] == nil then
      return {}
    end
    v["support3DisplayRank"] = choose(v["support3Name"], v["support3Rank"], "---")
    if v["support3DisplayRank"] == nil then
      return {}
    end
    v["support4PortraitMissing"] = choose(v["support4Portrait"], false, true)
    if v["support4PortraitMissing"] == nil then
      return {}
    end
    v["support4DisplayRank"] = choose(v["support4Name"], v["support4Rank"], "---")
    if v["support4DisplayRank"] == nil then
      return {}
    end
    v["support5PortraitMissing"] = choose(v["support5Portrait"], false, true)
    if v["support5PortraitMissing"] == nil then
      return {}
    end
    v["support5DisplayRank"] = choose(v["support5Name"], v["support5Rank"], "---")
    if v["support5DisplayRank"] == nil then
      return {}
    end
    v["expCompact"] = lookup33[tostring(v["exp"])]
    if v["expCompact"] == nil then
      return {}
    end
    v["levelProgress"] = choose((v["exp"] == 255), 0, v["exp"])
    if v["levelProgress"] == nil then
      return {}
    end
    v["portraitMissing"] = choose(v["portrait"], false, true)
    if v["portraitMissing"] == nil then
      return {}
    end
    v["portraitAspectRatio"] = lookup34[tostring(v["portrait"])]
    if v["portraitAspectRatio"] == nil then
      return {}
    end
    v["headerAspectRatio"] = (v["portraitAspectRatio"] * 3.4482758620689657)
    if v["headerAspectRatio"] == nil then
      return {}
    end
    v["travelerPresent"] = choose((v["rescueId"] == 0), false, true)
    if v["travelerPresent"] == nil then
      return {}
    end
    v["conditionActive"] = choose(((v["statusByte"] % 16) == 0), false, true)
    if v["conditionActive"] == nil then
      return {}
    end
    v["affinityIcon"] = lookup35[tostring(v["affinity"])]
    if v["affinityIcon"] == nil then
      return {}
    end
    v["affinityMissing"] = choose(v["affinityIcon"], false, true)
    if v["affinityMissing"] == nil then
      return {}
    end
    v["supportEmpty"] = choose(
      first(v["support1Name"], v["support2Name"], v["support3Name"], v["support4Name"], v["support5Name"]),
      false,
      true
    )
    if v["supportEmpty"] == nil then
      return {}
    end
    local identity = table.concat({
      tostring(v["characterPointer"]),
      tostring(v["deployment"]),
      tostring(v["item1Id"]),
      tostring(v["item2Id"]),
      tostring(v["item3Id"]),
      tostring(v["item4Id"]),
      tostring(v["item5Id"]),
    }, "|")
    if identity ~= state.lastIdentity then
      v.ui = {
        set = {
          ["inventoryDetail"] = v["firstItemPage"],
          ["itemSelected1"] = v["firstItemSelected1"],
          ["itemSelected2"] = v["firstItemSelected2"],
          ["itemSelected3"] = v["firstItemSelected3"],
          ["itemSelected4"] = v["firstItemSelected4"],
          ["itemSelected5"] = v["firstItemSelected5"],
        },
      }
      state.lastIdentity = identity
    end

    return v
  end
end
