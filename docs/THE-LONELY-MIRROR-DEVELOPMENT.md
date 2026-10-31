# The Lonely Mirror companion 1.0.0

Companion **1.0.0** is included in the repaired **Builder 1.2.0** release of 2026-10-31. See [current release changes and known limits](RELEASE-1.2.0.md) and the [unchanged-APK repair scope](OFFICIAL-30-COMPANION-FIX-2026-10-30.vi.md). The older development checks below are historical evidence; they do not establish full Android acceptance.

## Pre-release validation record

Development profile for the user's exact local ROM: **BE8E / A74E93C7**, 27,440,500 bytes, SHA-256 `d141f92a80d5a6d88f7e0f5c81a8bfdcc61e515f08b4cd4578447303e3ca1c88`. Builder remains 1.1.5. No APK change, public release or new-ROM download is part of this work.

## Implementation

The profile uses the accepted English FE8 native layout with Units, Map, Talk, Growth and conditional Battle Analysis. Game text, portraits, map sprites, items, growth diagrams and lookup data are generated locally; public sources contain no ROM-derived asset set. The output uses the existing GBA Duo companion format, rather than an editor or Plus-only widget. Exact game code and CRC32 are both enforced.

Relocated portraits (0x1A11C80), sprites (0x11DE368), items (0x125D334), icons (0x1001800), text (0x104DC88) and event groups (0x1001400) are read from this exact ROM. Names are keyed by actual character-data pointers, so another release's character-ID mapping is not reused.

For chapter records that contain only a title and no textual display number, the companion displays a generic Chapter label with the actual title instead of guessing a retail slot number. Route-specific later chapters, every class skill and old save compatibility remain outside this opening-map check.

## Validation, 2026-10-29

- The real website builder produced a local ZIP and editable project: 255 character records, 127 class records, 933 image operations, 31 Lua files, 16,592,678 ZIP bytes. The private input ROM's SHA-256 stayed unchanged.
- The exact ROM booted in the pinned local romdev/mGBA lab and reached its opening map through ordinary input. Its screenshot and EWRAM/IWRAM snapshots are private.
- The actual generated Lua ran for eight updates against those captured memories; Leah's name, class and ten raw numeric fields matched the ROM/RAM independently.
- 1 allied selections were replayed from the same captured RAM with private cursor fixtures, across Units/Map and invalid-selection clearing (6 additional updates). The harness checks that companion reads never change RAM. These are isolated fixtures, not a physical input acceptance check.
- Focused public tests cover wrong-ROM refusal, altered affinity tables, native chapter prefixes, dynamic avatar names and six-skill selection clearing.

Private reproducible evidence: `reports/fe-expansion-2026-10-29/classic-runtime-verification.json` and the private expansion workspace's `build/the-lonely-mirror/` and `classic-builds/the-lonely-mirror/`. Generated packages, images, ROMs and snapshots are ignored/private.

The full campaign, every battle/EXP/level-up/RNG option, live Preparations, physical Android rendering and touch/gamepad acceptance are **not validated by these checks**. The specific frozen Analysis fixtures do not establish every prediction path. This remains a development companion 0.1.0.

## Conditional Analysis checks

Two isolated forecast fixtures use actual opening-map unit records and this ROM's own native BattleGenerateSimulation routine (0x0802A318), run on frozen RAM with an adjacent hypothetical actor position. The native code rebuilds the battle records; companion foreground-process state is a fixture. Normal EXP and an actor at 99 EXP both run for 400 generated-companion updates. The read-only harness reports conditional damage/defeat EXP **11/80**; the near-level fixture completes its stat prediction.

The near-level generated pack also ran for 400 updates through the existing standalone native Lua audit on Thor: **READONLY 1**, no failed tick, maximum 3.936 ms and 372,386 Lua instructions per tick. This is an Android execution/performance check of frozen private files, not a live game save, app assignment, rendered companion, or campaign acceptance result.

## Audit follow-up

The active native ability ranges differ from retail: Sure Shot 29–30, Pierce 34–36 and Slayer 60. Pierce uses Skill%, and Great Shield uses the attacker's Defense%, rather than level. Native activation controls exercise both 100% and 0% operands; the actual critical bonus remains 15 and Slayer multiplies weapon might by 3.

Battle forecast now opts into the native follow-up restrictions. A bounded zero-terminated item list is read through ROM 0x15E210→0x1845C3C; item weapon effects come from the exact item records. Twenty-nine native/control cases cover all eleven denied IDs on either side, permitted/denied brave weapons, weaponBefore effect 3 and the target AS >250 guard. A denied brave weapon still has its initial pair, displaying ×2 instead of the old ×4. The separate conditional Analysis validation remains limited to the documented fixtures.

Native weapon effect 2 also identifies HP drain correctly for IDs 17/71/217/242; ID 70 does not drain. Wounded nonlethal native hits agree with the corrected forecast for every drain entry. HP bars sum the displayed normal hits; misses, critical/proc results, attack order and other effects can change the actual result.

## Credits

The Lonely Mirror and its game content belong to their authors and contributors. See the [author's project and credits](https://feuniverse.us/t/fire-emblem-the-lonely-mirror-full-game/5712). Pointer-discovery references include the [FEBuilderGBA engine definitions](https://github.com/FEBuilderGBA/FEBuilderGBA/tree/master/FEBuilderGBA); addresses were checked against this local ROM rather than trusted across revisions.
