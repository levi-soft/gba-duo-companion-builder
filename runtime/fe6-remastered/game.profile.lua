-- Exact ROM memory contract used by unit, map and forecast readers.
-- Game-owned lookup tables are prepared separately in data.rom_tables.lua.
return {
  processPool = 0x02024E68,
  playerProcess = 0x0859AAD8,
  forecastProcess = 0x0859E520,
  enemyProcess = 0x085A8024,
  activeUnit = 0x03004E50,
  phase = 0x0202BCFF,
  playerPcStart = 0x0859AB60,
  playerPcEnd = 0x0859AC00,
  enemyPcStart = 0x085A802C,
  enemyPcEnd = 0x085A808C,
  cursorX = 0x0202BCC4,
  cursorY = 0x0202BCC6,
  mapWidth = 0x0202E4D4,
  mapHeight = 0x0202E4D6,
  unitRows = 0x0202E4D8,
  terrainRows = 0x0202E4DC,
  chapter = 0x0202BCFE,
  turn = 0x0202BD00,
  battleActor = 0x0203A4EC,
  battleTarget = 0x0203A56C,
}
