# Dream of Five - Definitive Edition companion 1.0.0

Released version: **1.0.0**, built with **Builder 1.2.0**. Feature verification is incomplete: ten new profiles have no working Analysis, five have limited conditional tests, and full companion-app acceptance is pending. See the [verification correction](ANALYSIS-GAPS-1.2.0.vi.md) and [release notes](RELEASE-1.2.0.md).

## Pre-release validation record

Development profile for the user's exact local ROM: **BE8E / B313A6F5**, 30,972,940 bytes, SHA-256 `38301aebf52754fd8a4e14949069f91d55c602790203ede1c08def0ee5e62fe0`. Builder remains 1.1.5. No APK change, public release or new-ROM download is part of this work.

## Implementation

The profile uses the accepted English FE8 native layout with Units, Map, Talk, Growth and conditional Battle Analysis. Game text, portraits, map sprites, items, growth diagrams and lookup data are generated locally; public sources contain no ROM-derived asset set. The output uses the existing GBA Duo companion format, rather than an editor or Plus-only widget. Exact game code and CRC32 are both enforced.

This is the FE8 Definitive Edition, not the older FE7 hack. Relocated text (0x1031DFC), portraits (0x1B49874), sprites (0x10F084C), items (0x1B00150), icons (0x14381A4) and event groups (0x14CFFC8) are read from the exact ROM. Its modified affinity bonuses are read from the native support table. Native prefixes such as P and C1 are retained from the ROM text rather than inferred from chapter indices.

Colorblind variants and other patches are not matched by this profile.

## Validation, 2026-10-29

- The real website builder produced a local ZIP and editable project: 255 character records, 127 class records, 858 image operations, 31 Lua files, 14,674,004 ZIP bytes. The private input ROM's SHA-256 stayed unchanged.
- The exact ROM booted in the pinned local romdev/mGBA lab and reached its opening map through ordinary input. Its screenshot and EWRAM/IWRAM snapshots are private.
- The actual generated Lua ran for eight updates against those captured memories; Garath's name, class and ten raw numeric fields matched the ROM/RAM independently.
- 3 allied selections were replayed from the same captured RAM with private cursor fixtures, across Units/Map and invalid-selection clearing (18 additional updates). The harness checks that companion reads never change RAM. These are isolated fixtures, not a physical input acceptance check.
- Focused public tests cover wrong-ROM refusal, altered affinity tables, native chapter prefixes, dynamic avatar names and six-skill selection clearing.

Private reproducible evidence: `reports/fe-expansion-2026-10-29/classic-runtime-verification.json` and the private expansion workspace's `build/dream-of-five/` and `classic-builds/dream-of-five/`. Generated packages, images, ROMs and snapshots are ignored/private.

The full campaign, every battle/EXP/level-up/RNG option, live Preparations, physical Android rendering and touch/gamepad acceptance are **not validated by these checks**. The specific frozen Analysis fixtures do not establish every prediction path. This remains a development companion 0.1.0.

## Conditional Analysis checks

Two isolated forecast fixtures use actual opening-map unit records and this ROM's own native BattleGenerateSimulation routine (0x0802A318), run on frozen RAM with an adjacent hypothetical actor position. The native code rebuilds the battle records; companion foreground-process state is a fixture. Normal EXP and an actor at 99 EXP both run for 400 generated-companion updates. The read-only harness reports conditional damage/defeat EXP **0/5**; the near-level fixture completes its stat prediction.

The near-level generated pack also ran for 400 updates through the existing standalone native Lua audit on Thor: **READONLY 1**, no failed tick, maximum 3.544 ms and 368,786 Lua instructions per tick. This is an Android execution/performance check of frozen private files, not a live game save, app assignment, rendered companion, or campaign acceptance result.

## Audit follow-up

Native ability cards use the active class ranges: Sure Shot/Pierce/Slayer 74–75 and Great Shield 109–110. The critical bonus is 20. Native execution confirms the positive/negative class controls, the actual critical amount and threefold Slayer weapon might. These are frozen native fixtures, not a full campaign or rendered-device acceptance result.

HP drain follows native weapon effect 2: item IDs 17/71 drain, while 70 does not. A wounded nonlethal native hit replay agrees with the corrected forecast. HP bars sum the displayed normal hits; misses, critical/proc results, attack order and other effects can change the actual result.

## Credits

Dream of Five - Definitive Edition and its game content belong to their authors and contributors. See the [author's project and credits](https://feuniverse.us/t/fe8-complete-fe-dream-of-five-definitive-edition/21043). Pointer-discovery references include the [FEBuilderGBA engine definitions](https://github.com/FEBuilderGBA/FEBuilderGBA/tree/master/FEBuilderGBA); addresses were checked against this local ROM rather than trusted across revisions.
