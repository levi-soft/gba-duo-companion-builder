-- Exact ROM memory contract used by unit, map and forecast readers.
-- Game-owned lookup tables are prepared separately in data.rom_tables.lua.
return {
  processPool = 0x02024E28,
  playerProcess = 0x08B93374,
  forecastProcess = 0x08B96D5C,
  enemyProcess = 0x08B96F9C,
  activeUnit = 0x03004690,
  phase = 0x0202BC07,
  playerPcStart = 0x08B933EC,
  playerPcEnd = 0x08B93568,
  enemyPcStart = 0x08B96FA4,
  enemyPcEnd = 0x08B9700C,
  cursorX = 0x0202BBCC,
  cursorY = 0x0202BBCE,
  mapWidth = 0x0202E3D8,
  mapHeight = 0x0202E3DA,
  unitRows = 0x0202E3DC,
  terrainRows = 0x0202E3E0,
  chapter = 0x0202BC06,
  turn = 0x0202BC08,
  battleActor = 0x0203A3F0,
  battleTarget = 0x0203A470,
}
