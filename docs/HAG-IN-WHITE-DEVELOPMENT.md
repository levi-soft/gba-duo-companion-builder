# The Hag in White companion 1.0.0

> Release status: finalized as companion **1.0.0** in Builder **1.1.5** by the maintainer. The notes below retain the earlier development evidence and version history; earlier pending/local-only status is superseded. Validation limits remain applicable. See [current release scope](RELEASE-1.1.5.md).


English profile for one exact ROM, finalized in Builder 1.1.5. No APK change is
part of this release.

## 0.1.1: Analysis time-budget fix

The first live user test exposed `script exceeded its per-tick time limit` during
level prediction for Phobos at 97 EXP. Conditional EXP still completed (10/53),
but the interrupted prediction was retained as unsupported. The earlier native
harness tests did not reproduce the application's concurrent emulator/UI load.

Hag now schedules EXP and level prediction in 512-instruction CPU slices instead
of 2,048. Total native instruction limits, ROM execution order and outcomes stay
unchanged. Only this profile opts into the smaller slices. It also permits two
restarts for transient per-tick time/instruction failures, reducing slices to
256 then 128. Restarts use the same frozen RAM/RNG and run the complete native
calculation again; unsupported instructions and other errors do not retry.

The exact failing capture completes with the smaller slices in 132 prediction
updates. Conditional EXP and all eight stat gains match the previous complete
offline execution. Synthetic CPU tests verify equal execution across slice sizes,
bounded retry behavior and unchanged failure handling for unsupported routines.
Live acceptance after importing the replacement ZIP is still pending.

## Identity and provenance

- Game code `BE8E`, CRC32 `7479D7E2`, 30,010,328 bytes.
- SHA-256 `f872a29874271d62e2c620036dde44cc9862928afa3a2a5b3738f4f388c45387`.
- [SaintRubenio's project and full contributor credits](https://feuniverse.us/t/the-hag-in-white-complete/31606).
- FEBuilderGBA and the existing Skill System references were checked against
  the user's ROM and captured RAM, not assumed interchangeable with Void.

ROMs, memory captures, screenshots, prepared text/artwork, project JSON and
playable ZIPs remain private. The public template contains no extracted assets.

## Shared implementation

The profile inherits the accepted eight-stat/six-skill UI from FE6 Remastered,
localized in English. The runtime inherits English FE8 map/unit/Preparations and
Analysis modules. Small adapters add separate Mag, native skills and split
Growth. FE8 support/pulse fields and eight-stat Growth are composed from shared
modules; their previous implementations are preserved without duplication.

| Contract | Address / file offset |
| --- | --- |
| Characters / classes / items | `0x803D30` / `0x807110` / `0x809B10` |
| Portraits / map sprites | `0x1A6FCCC` / `0x1307218` |
| Item icons / palettes | `0x5926F4` / `0x5996F4` |
| Text / chapters | `0x181EBFC` / `0x8B0890` |
| Event-group table | `0x140008C` |
| Skill getter | `0x08B606C8` |
| Skill descriptions / icons | `0xB61898` / `0xB61A98` |
| Skill cache / output buffer | `0x02026BB0` / `0x02026B90` |
| Separate Mag in unit | `+0x3A` |
| Character / class Mag tables | `0xB2A740` / `0xB2A940` |
| Class level caps | `0x08B2A63C` |

The skill getter runs on shadow RAM, invalidating its private cache before
execution. It retains native personal/class/learned/generic/faction rules. It
does not write the game's buffer or reuse another ROM's skill table addresses.
All 17 living units in the captured scene were checked. Examples: Kyra has
Outdoorswoman, Supply and Story Boon; Apate has Renewal and Crit Boost.

Fifty-three compact font glyph records match the verified Storge font. Their
decoder is shared in `site/latin-text.js`, preserving compact lettering and Latin
accents such as Begoña, López and Órlaith.

The preparation hook creates eight-stat charts and removes the unused seven-stat
intermediate charts. Growth remains the existing base-rate contract: skill/item
bonuses are explicitly excluded in the displayed note. Str/Mag caps and all eight
Analysis rows remain separate. Equipment calculations use the Mag field for
magical weapons and this ROM's single-Speed avoid formula; they remain base
equipment summaries, not a simulation against an arbitrary opponent.

Talk uses the relocated native event-group table, completion/required flags and
source rules. Unused chapter records pointing at ordinary event scripts are not
treated as conversation lists. The two captured Prologue conversations agree
with the ROM's native availability routine. Base Map overlays do not apply
range-changing skills; the Map page states that limit.

## Verification boundary

- Exact-ROM Builder output: 255 characters, 127 classes, 1,040 extracted images.
- Offline captured-RAM tests cover Units, Map, eight-stat Growth, actual Forecast,
  near-level execution and popup closure when Forecast exits. The Phobos fight
  yields conditional damage/defeat EXP 10/30; the hypothetical 99-EXP fixture
  completes its native eight-stat level-up calculation.
- Preparations: 14 updates / 11 transitions, including Kyra, Apate, benched units,
  item/stat selection and invalid/dead units. These are fixtures, not a live
  Preparations playthrough.
- Native Lua harness on Thor: 336 updates across Units, Map, Growth, three
  Analysis scenarios and three Preparations scenarios. Worst observed update in
  that run was approximately 5.1 ms, below 380,000 counted instructions. Every
  scenario reports unchanged source RAM.
- Eight Android host render tests cover Units, Map, Growth, Analysis, Forecast,
  skill details and two Preparations selections. The main screens and skill
  details were visually inspected.
- All 88 public automated tests pass, including a regression for zero-growth
  charts whose filenames can coincide with intermediate seven-stat diagrams.
- Shared-module regression: 106 updates per old/new version for FE6 Remastered,
  FE8 Vietnamese, FE8 Europe, FE8 US and Void return identical values.

These checks do not establish full-story/postgame coverage, every skill/combat
combination, all mode settings or live visual/input acceptance.
