# Iron Emblem companion 1.0.0

Released version: **1.0.0**, built with **Builder 1.2.0**. Feature verification is incomplete: ten new profiles have no working Analysis, five have limited conditional tests, and full companion-app acceptance is pending. See the [verification correction](ANALYSIS-GAPS-1.2.0.vi.md) and [release notes](RELEASE-1.2.0.md).

## Pre-release validation record

Development profile for the user's exact local ROM: **BE8E / 141FF3AA**, 18,033,892 bytes, SHA-256 `56d8afff53a08eeb7bdc891ac2bcb168cc6d1fdd656a41283c90a55b74b7458c`. Builder remains 1.1.5. No APK change, public release or new-ROM download is part of this work.

## Implementation

The profile uses the accepted English FE8 native layout with Units, Map, Talk, Growth and conditional Battle Analysis. Game text, portraits, map sprites, items, growth diagrams and lookup data are generated locally; public sources contain no ROM-derived asset set. The output uses the existing GBA Duo companion format, rather than an editor or Plus-only widget. Exact game code and CRC32 are both enforced.

The opening map, Commander and three other allied slots were replayed from an isolated emulator session. Stock native FE8 unit-slot, player, forecast and enemy process spans were compared with the exact USA base, as were the selected combat/EXP/level-up entry spans. This is structural evidence, not a full proof of every native callee.

Iron Emblem deliberately ends an in-progress campaign on a mid-map reset. Testing used a disposable private ROM/session and never loaded, reset or changed the user's saves. Reverse recruitment and other patches need their own identities.

## Validation, 2026-10-29

- The real website builder produced a local ZIP and editable project: 255 character records, 127 class records, 714 image operations, 31 Lua files, 9,763,224 ZIP bytes. The private input ROM's SHA-256 stayed unchanged.
- The exact ROM booted in the pinned local romdev/mGBA lab and reached its opening map through ordinary input. Its screenshot and EWRAM/IWRAM snapshots are private.
- The actual generated Lua ran for eight updates against those captured memories; Commander's name, class and ten raw numeric fields matched the ROM/RAM independently.
- 4 allied selections were replayed from the same captured RAM with private cursor fixtures, across Units/Map and invalid-selection clearing (24 additional updates). The harness checks that companion reads never change RAM. These are isolated fixtures, not a physical input acceptance check.
- Focused public tests cover wrong-ROM refusal, altered affinity tables, native chapter prefixes, dynamic avatar names and six-skill selection clearing.

Private reproducible evidence: `reports/fe-expansion-2026-10-29/classic-runtime-verification.json` and the private expansion workspace's `build/iron-emblem/` and `classic-builds/iron-emblem/`. Generated packages, images, ROMs and snapshots are ignored/private.

The full campaign, every battle/EXP/level-up/RNG option, live Preparations, physical Android rendering and touch/gamepad acceptance are **not validated by these checks**. The specific frozen Analysis fixtures do not establish every prediction path. This remains a development companion 0.1.0.

## Conditional Analysis checks

Two isolated forecast fixtures use actual opening-map unit records and this ROM's own native BattleGenerateSimulation routine (0x0802A318), run on frozen RAM with an adjacent hypothetical actor position. The native code rebuilds the battle records; companion foreground-process state is a fixture. Normal EXP and an actor at 99 EXP both run for 400 generated-companion updates. The read-only harness reports conditional damage/defeat EXP **9/64**; the near-level fixture completes its stat prediction.

The near-level generated pack also ran for 400 updates through the existing standalone native Lua audit on Thor: **READONLY 1**, no failed tick, maximum 3.529 ms and 361,186 Lua instructions per tick. This is an Android execution/performance check of frozen private files, not a live game save, app assignment, rendered companion, or campaign acceptance result.

## Audit follow-up

Native ability cards now read this exact ROM's active class bounds instead of retail IDs. Sure Shot, Great Shield and Slayer have impossible lower/upper bounds and remain absent. Pierce retains classes 35–36. The active Pick hook at 0x08170DB8 uses the bounded class list 13/23, rather than retail 51. Critical bonus remains 15. Isolated native controls confirm disabled/active proc cases and the displayed cards; these checks do not validate every campaign mechanic.

HP drain follows native weapon effect 2: item IDs 17/71 drain, while 70 does not. A wounded nonlethal native hit replay agrees with the corrected forecast. HP bars sum the displayed normal hits; misses, critical/proc results, attack order and other effects can change the actual result.

## Credits

Iron Emblem and its game content belong to their authors and contributors. See the [author's project and credits](https://feuniverse.us/t/fe8-complete-iron-emblem-v1-3-1-1-full-length-rr-out/12539). Pointer-discovery references include the [FEBuilderGBA engine definitions](https://github.com/FEBuilderGBA/FEBuilderGBA/tree/master/FEBuilderGBA); addresses were checked against this local ROM rather than trusted across revisions.
