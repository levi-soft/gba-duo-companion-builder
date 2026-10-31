# Dark Lord and the Maiden of Light companion 1.0.0

Companion **1.0.0** is included in the repaired **Builder 1.2.0** release of 2026-10-31. See [current release changes and known limits](RELEASE-1.2.0.md) and the [unchanged-APK repair scope](OFFICIAL-30-COMPANION-FIX-2026-10-30.vi.md). The older development checks below are historical evidence; they do not establish full Android acceptance.

## Pre-release validation record

Development profile for the user's exact local ROM: **AE7E / C99A6D26**, 24,393,296 bytes, SHA-256 `80c7c32f2e4b5a2bd65fb8318bbafaf0aeda994f2d47f8b3bceadabff58b2c75`. Builder remains 1.1.5. No APK change, public release or new-ROM download is part of this work.

## Implementation

The profile uses the accepted English FE7 native layout with Units, Map, Talk, Growth and conditional Battle Analysis. Game text, portraits, map sprites, items, growth diagrams and lookup data are generated locally; public sources contain no ROM-derived asset set. The output uses the existing GBA Duo companion format, rather than an editor or Plus-only widget. Exact game code and CRC32 are both enforced.

This is an FE7 profile. Its character table is 0xBDCE18, class table 0xDF8000, chapter table 0xC9A200 and event groups 0xC9C9C8. Character records 2 and 45 use text ID 0x4DD, whose raw entry 0x8202BC18 addresses a player name in RAM at 0x0202BC18. The producer stores a bounded recipe rather than treating RAM as ROM text. The runtime reads at most 16 bytes and updates the unit, map, growth and support references; actual replay reads Mark. A synthetic rename/empty-name case is covered too.

There are 69 usable chapter records in the retained table; slot 69 has been overwritten and is excluded through this profile's chapterCount option. All prior FE7 profiles retain their default count. The author's modified effectiveness and class caps are game mechanics, not a claim that every battle prediction has been validated.

## Validation, 2026-10-29

- The real website builder produced a local ZIP and editable project: 253 character records, 110 class records, 893 image operations, 28 Lua files, 10,888,696 ZIP bytes. The private input ROM's SHA-256 stayed unchanged.
- The exact ROM booted in the pinned local romdev/mGBA lab and reached its opening map through ordinary input. Its screenshot and EWRAM/IWRAM snapshots are private.
- The actual generated Lua ran for eight updates against those captured memories; Orion's name, class and ten raw numeric fields matched the ROM/RAM independently.
- 4 allied selections were replayed from the same captured RAM with private cursor fixtures, across Units/Map and invalid-selection clearing (24 additional updates). The harness checks that companion reads never change RAM. These are isolated fixtures, not a physical input acceptance check.
- Focused public tests cover wrong-ROM refusal, altered affinity tables, native chapter prefixes, dynamic avatar names and six-skill selection clearing.

Private reproducible evidence: `reports/fe-expansion-2026-10-29/classic-runtime-verification.json` and the private expansion workspace's `build/dark-lord-maiden-of-light/` and `classic-builds/dark-lord-maiden-of-light/`. Generated packages, images, ROMs and snapshots are ignored/private.

The full campaign, every battle/EXP/level-up/RNG option, live Preparations, physical Android rendering and touch/gamepad acceptance are **not validated by these checks**. The specific frozen Analysis fixtures do not establish every prediction path. This remains a development companion 0.1.0.

## Audit follow-up

An independent audit reproduced a cached avatar placeholder in earned support cards: the actual Lynn record's sixth partner is avatar ID2. The owned support reader now refreshes RAM-backed partner names before binding those cards. The exact-ROM isolated replay resolves the card and the live name to the same value; a regression covers initialization, renaming and an empty-name fallback without RAM writes.

Talk also retains character references so a RAM-backed target name can refresh. This is a preventive correction: this exact prepared event set has no Talk target ID2 or45, so an active avatar-target Talk failure was not reproduced. A synthetic rename/flag lifecycle verifies that path without claiming a campaign event exists.

Native HP-drain controls confirm this FE7 ROM uses IDs 17/70, matching its existing formatter; ID 71 does not drain. HP bars sum the displayed normal hits; misses, critical/proc results, attack order and other effects can change the actual result.

HP caps were checked through both native stat-cap routines and the active level-up caller. Correct-ABI frozen calls at 0x08029660 allow player HP39/59 to gain one point and stop HP growth at60. This remains true even though class records contain HP40. NPC/enemy records decline level-up. Maintenance and battle-clamp limits of60/120 are distinct evidence and are not substituted for the active level-up path. These fixtures do not prove every class, skill or mode.

## Conditional Analysis checks

Two isolated forecast fixtures use actual opening-map unit records and this ROM's own native BattleGenerateSimulation routine (0x080283A4), run on frozen RAM with an adjacent hypothetical actor position. The native code rebuilds the battle records; companion foreground-process state is a fixture. Normal EXP and an actor at 99 EXP both run for 400 generated-companion updates. The read-only harness reports conditional damage/defeat EXP **11/80**; the near-level fixture completes its stat prediction.

The near-level generated pack also ran for 400 updates through the existing standalone native Lua audit on Thor: **READONLY 1**, no failed tick, maximum 5.163 ms and 404,400 Lua instructions per tick. This is an Android execution/performance check of frozen private files, not a live game save, app assignment, rendered companion, or campaign acceptance result.

## Credits

Dark Lord and the Maiden of Light and its game content belong to their authors and contributors. See the [author's project and credits](https://feuniverse.us/t/fire-emblem-dark-lord-and-the-maiden-of-light/6463/1). Pointer-discovery references include the [FEBuilderGBA engine definitions](https://github.com/FEBuilderGBA/FEBuilderGBA/tree/master/FEBuilderGBA); addresses were checked against this local ROM rather than trusted across revisions.
