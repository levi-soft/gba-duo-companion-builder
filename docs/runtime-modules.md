# Readable Lua runtime modules

[Tiếng Việt](runtime-modules.vi.md)

The builder separates authored game logic from the tables generated from a player's ROM. The FE7 Vietnamese, FE6 Remastered and FE8 Vietnamese profiles use the same packaging contract, while keeping their game-specific formulas and memory layouts separate.

## Where to edit

`runtime/<profile>/` contains readable authored Lua. `runtime/shared/` contains helpers and presentation code that are actually shared. Each profile's `main.lua` shows the update stages in order: read the game, apply the relevant features, then prepare presentation values. Modules receive explicit dependencies; module factories keep their private counters and caches inside that Lua state. They do not repeatedly replace an earlier `update()` function.

The modules are named by purpose:

| Module | Responsibility |
| --- | --- |
| `game.profile.lua` | Named addresses and supported game layout |
| `game.preparations.lua` (shared) | Selected roster/item/stat-screen unit during Preparations, with profile-specific addresses and slot validation |
| `game.units.lua` | Resolve the selected or locked unit and coordinate reading |
| `game.items.lua` | Equipped item, rescue and combat values |
| `game.battle.lua` | Battle Forecast fields |
| `game.map.lua` | Map state, roster and movement/danger ranges |
| `game.bindings.lua` | Existing game-to-display field formulas and guards |
| `features.growth.lua` | Growth and caps, where used by the profile |
| `features.analysis.lua`, `features.exp.lua`, `features.level_prediction.lua` | Conditional EXP and level analysis |
| `presentation.*.lua` | Default, inventory, Growth and prediction presentation |
| `data.rom_tables.lua` | Locally generated ROM data, not authored game logic |

The exact module set differs by profile. FE6 Remastered retains its separate Mag and skill logic. An algorithm is shared only when it was already equivalent; the refactor does not replace mod formulas with FE7 formulas.

Preparations selection is kept separate from map selection: `game.units` calls
the shared reader, accepts living player units that are not deployed yet, and
passes the context to map/default presentation. Invalid selection clears the
unit instead of falling back to a stale map cursor. The reader performs no RAM
writes and does not enable Forecast or map-navigation actions in Preparations.

## Generated files and native loading

Run `node scripts/build-runtime-modules.mjs` after editing authored Lua. This creates `site/runtime-modules.js` and refreshes the small profile entry-point files. The JavaScript registry is a distribution artifact; edit the Lua sources instead of editing escaped Lua inside that registry or `template.js`.

During local ROM preparation, `CompanionRuntime.install()` packages the authored modules and writes `data.rom_tables.lua` from the existing serialized ROM data. It preserves string contents and numeric/string key types. Generated data is formatted separately so the entry point is readable. The pack manifest points to `main.lua`.

GBA Duo's native loader uses flat dotted names. For example:

```lua
local profile = pack.require("game.profile")
local read = pack.require("game.units")(D, map, values, abilities)
```

These load **`game.profile.lua` and `game.units.lua` at the ZIP root**, rather than files inside a `game/` directory. `pack.require` caches returned modules within a Lua state; a factory is called to construct the stateful reader. Generated packs remain ordinary format-2 companion packs. No new emulator API is required.

## Checks

```sh
npm ci
node scripts/build-runtime-modules.mjs
npm run build
npm test
```

Wasmoon is a pinned development dependency used only by Node tests. Its WASM engine is not included in the website or the downloadable builder bundle. Tests exercise module state isolation, native-compatible module lookup, binary memory reads, and long traces without leaking returned values onto the Lua host stack.

Exact-ROM characterization uses **private local fixtures**, not data committed to this repository:

```sh
node scripts/runtime-validation.mjs reports/local-runtime-config.json --baseline
node scripts/runtime-validation.mjs reports/local-runtime-config.json
```

The config resolves paths relative to its own directory. A minimal shape is shown below; replace every placeholder with files on your own machine. Add an entry for each supported profile. A `candidate` project can be supplied to test the entire new ROM-preparation output; otherwise the current packager is applied to the baseline's unchanged generated data. Add `zip` to verify the compiled ZIP manifest and every Lua file against that project, then execute the Lua read from the ZIP itself.

```json
{
  "moduleScripts": ["../site/runtime-modules.js", "../site/runtime-packager.js"],
  "report": "local-runtime-results.json",
  "profiles": [{
    "id": "fe7-vietnamese",
    "project": "local/old-project.json",
    "candidate": "local/new-project.json",
    "zip": "local/new-companion.zip",
    "rom": "local/your-rom.gba",
    "capture": "local/your-ram-capture.json",
    "cases": [{
      "name": "forecast-and-navigation",
      "steps": [
        {"ticks": 100, "ui": {"mainTab": "Units", "predictionPopup": true}},
        {"ticks": 3, "ui": {"mainTab": "Map"}},
        {"ticks": 3, "ui": {"mainTab": "Units", "growthPopup": true}}
      ]
    }]
  }]
}
```

RAM captures use `{ "ranges": [{ "address": 33554432, "base64": "..." }] }`, optionally under a `result` property. Raw binary ranges can instead be configured as `ranges: [{address, file}]`. Steps can include `patches: [{address, bytes}]` to change isolated fixture RAM, `focusUnit` to invoke the map action, and `expect: {field: value}` to ensure a case reached the intended state. `requiredCalls: ["focusUnit:1"]` on a case checks that the expected input action actually happened.

Keep ROMs, captures, old/new prepared projects, generated assets and full output reports private. The ignored `reports/` directory is suitable for local configs and evidence. The harness operates on copied buffers and supplies no game-memory write API.

## Evidence and limits

The local characterization covers all three profiles. For each profile it compares every returned field and the action/log trace across a 106-tick sequence with near-level EXP, completed analysis, a map focus action and Units/Map/Growth changes; a separate nine-tick sequence leaves and re-enters Forecast. It explicitly checks level-analysis availability/completion, actual focus input, Forecast transitions and unchanged fixture RAM: **345 compared ticks in total**.

This establishes behavior equivalence for those captured states. It is not a guarantee for every chapter, skill or item combination. The offline Lua engine does not establish Android instruction-budget usage, frame timing, cache pressure or the final rendered layout; those require separate native/device checks. This change improves code organization, not a claimed runtime speedup.

### Isolated native validation on Thor (2026-10-24)

The ARM native Lua harness on Thor also ran the frozen and modular packs against the same copied ROM/RAM fixtures. It used the native `pack.require` loader and script budgets, in a separate process from the running emulator. No APK, game state or save was changed.

All three profiles passed four cases (completed near-level analysis, Units, Map and Growth), each for both old and new code: **24 successful runs / 708 update calls**. The final returned values matched for every old/new pair; analysis availability and completion were asserted, and the harness reported unchanged fixture RAM in every run.

| Modular profile | Slowest observed update | Highest charged update budget |
| --- | ---: | ---: |
| FE7 Vietnamese | 2.803 ms | 189,600 |
| FE6 Remastered | 5.845 ms | 397,786 |
| FE8 Vietnamese | 3.089 ms | 377,186 |

No load or update budget error occurred. These are observations from isolated captured-state tests, not an FPS benchmark or proof of the Android companion's final rendered UI. Native input dispatch, live gameplay and rendering acceptance remain separate checks.
