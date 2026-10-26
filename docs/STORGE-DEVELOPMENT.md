# Storge companion 1.0.0

> Release status: finalized as companion **1.0.0** in Builder **1.1.5** by the maintainer. The notes below retain the earlier development evidence and version history; earlier pending/local-only status is superseded. Validation limits remain applicable. See [current release scope](RELEASE-1.1.5.md).


Exact English Storge profile finalized in Builder 1.1.5. Its development evidence
and remaining coverage limits are recorded below.

## Identity and sources

- Game code: `BE8E`; CRC32: `079106D8`; size: 20,034,916 bytes.
- ROM SHA-256: `2900e5a7ed8de6e80cb8b2cff32725a1fa9beb8c47b4bddf823d1edc08f794b7`.
- [knabepicer's original Storge project and contributor notices](https://feuniverse.us/t/fire-emblem-storge-complete/11711).
- [FEBuilderGBA's font/address references](https://github.com/FEBuilderGBA/FEBuilderGBA),
  checked against the local ROM rather than assumed to match.

ROM captures, extracted artwork/text, project JSON, charts and playable packs
remain private. The public source contains the reader, glyph character mapping,
authored runtime and shared UI only.

## Implementation

The profile inherits the accepted English FE8 UI and modular runtime. It uses
Units, Map with chapter names, Forecast, Growth, conditional EXP/level analysis,
Preparations selection, the RNG indicator, native FE8 abilities and Talk.
The shared `game.native-abilities` module preserves the previous FE8 implementation;
Storge composes it with `game.talk` without duplicating either implementation.
It does not inherit Void's Skill System addresses or protected-store workaround.
Storge's Talk records terminate on command 0, not completion flag 0. Repeatable
conversations, source wildcards and required-flag conditions use the native CHAR
event rules. The existing profiles retain their previous default behavior.

| ROM table | File offset |
| --- | --- |
| Characters | `0x803D30` |
| Classes, 254 valid records | `0x11C9584` |
| Items | `0x11A3AD8` |
| Portraits | `0x8ACBC4` |
| Map sprites | `0x12AC1E0` |
| Item icons | `0x12C6508` |
| Text | `0x1009948` |
| Chapters / event groups | `0x8B0890` / `0x8B363C` |
| Unit lookup | `0x59A5D0` |

FE8 preparation now accepts an optional class count, retaining the previous 128
limit by default. Storge reads through class ID 254. Its compact font codes are
decoded before shared text normalization, preserving names such as Jamakaya and
Humboldt. All 1,458 character/class/item name and description records were checked
for undecoded characters.

The FE8 process addresses and execution entry windows match the verified US
base: eight routine windows and seven process windows were checked. Storge changes
the unit lookup table: NPC slots 65–104 start at `0x02026E30`. Lua uses the ROM's
lookup directly. Navigation metadata overrides the NPC base; player/enemy banks
retain their previous addresses. Current Plus's FE-map navigation accepts NPC
targets 65–84, so the expanded NPC slots 85–104 can be inspected but cannot be
focused through that API. No APK changes were made for this profile.

## Verification and limits

- Captured map and Forecast from the exact ROM using Studio Connection.
- Builder-generated pack: 255 character records, 254 class records, 795 extracted
  images. The ROM is not included in the pack.
- Offline Lua replay: Units, Map, Growth, actual Forecast, 99-EXP fixtures and
  Forecast popup closure. Damage/defeat EXP for the captured Barbaricia fight are
  11/37; hypothetical near-level gains complete successfully.
- Preparations fixtures: 14 updates across 11 transitions, including Becker,
  Gretchen, benched units, item selection, stat-screen priority and invalid/dead
  selections. These are replayed fixtures, not a live Preparations playthrough.
- Native Lua harness on Thor: 342 updates covering Units, Map, Growth, three
  Analysis cases, three Preparations cases and the Prologue; worst observed update
  below 6.3 ms in this run.
  Harness jobs operate on captured memory copies and report unchanged RAM.
- Talk: 34 Prologue conversation conditions agree with the ROM's native
  `CheckForCharacterEvents` routine, including repeatable and required-flag cases.
  Native Prologue replay resolves Becker's available conversation to Gretchen.
- Shared changes: 106 updates per old/new version for FE8 Vietnamese, Europe, US
  and Void produce identical returned values on their captured fixtures.
- Six Android host render tests at the inherited Thor aspect ratio: Units, Map,
  Growth, Analysis, Becker and Gretchen in Preparations. The first four renders
  were visually inspected. These are host renders, not live acceptance on Thor.

All-story/NG+ coverage, all combat combinations, live B-button/menu navigation and
the user's visual acceptance remain pending. Shared Map range overlays retain
their existing base movement/weapon behavior.
