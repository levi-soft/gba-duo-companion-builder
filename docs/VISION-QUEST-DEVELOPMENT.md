# Vision Quest companion 1.0.0

> Release status: finalized as companion **1.0.0** in Builder **1.1.5** by the maintainer. The notes below retain the earlier development evidence and version history; earlier pending/local-only status is superseded. Validation limits remain applicable. See [current release scope](RELEASE-1.1.5.md).


Development profile for the user's exact English ROM: `BE8E / 2BCFEC83`,
28,947,180 bytes, SHA-256
`7ceeadbdf0607fa7b702b73a3657b1ad316c263b06ba245fe699d5404c2935e2`.
Finalized in Builder 1.1.5. No APK change is part of this release.

## Implementation

The profile inherits the accepted English seven-stat/six-skill FE8 layout,
including Talk, Units, Map, Growth, conditional Analysis, Preparations and the
generic FE8 cursor contract. Str/Mag share one engine stat; this ROM does not use
Hag's split Str/Mag layout. Lua inherits the common FE8 readers and overrides only
skill-list evaluation, class level caps and execution budgets. No shared UI
palette or existing profile behavior is changed.

| Contract | ROM offset / native entry |
| --- | --- |
| Characters, classes, items | `803D30`, `807110`, `809B10` |
| Portraits, map sprites, text | `1B2CF20`, `8AF880`, `1024D7C` |
| Item icons / palettes, unit-slot table | `5926F4`, `5996F4`, `59A5D0` |
| Chapters / chapter event groups | `8B0890`, `14AB47C` |
| Custom chapter-prefix table | `1B99920` (pointer at `16A484`) |
| Native skill getter / private buffer / cache | `08B4A68C`, `02026B90`, `02026BB0` |
| Skill descriptions / icons / class level caps | `B2B420`, `B4B5FC`, `B2B620` |
| Level-up redirect | `0802BA28` -> `08B48F60` |

Compact Latin glyphs are decoded with the shared decoder already used by Storge
and Hag. This is required for names such as Axe Mercenary and Sword Cavalier.
Chapter names and displayed prefixes are both read from the ROM. Slot 0 is
`1-1`, not retail FE8's Prologue, and slot 63 is `1-7x`; no sequential-number
guess is used. The Talk event-group relocation is confirmed by the literal at
`080346DC`, rather than the empty retail table at `8B363C`.

The native skill getter rebuilds personal, class and learned skills on isolated
RAM and returns up to six icons with ROM descriptions. Analysis executes this
ROM's combat, EXP and level-up routines on frozen private RAM/RNG copies. It
remains a conditional prediction, not a promise of a hit, critical or survival.
Map range overlays retain the inherited visible limitation: base movement and
weapon ranges, excluding range-changing skills. Growth charts show base ROM
growths with an explicit note that skill/item modifiers are not included.

## Validation

- Exact ROM identity matches the live Studio session and the user's local ROM.
- The delivered ZIP is built from the actual Builder 1.5.0 distribution bundle;
  every prepared file and the layout match the audited source build.
- Extraction: 255 character records, 127 class records, 1,071 generated images.
- Native Lua on Thor: 474 updates across Units, Map, Growth, actual Forecast and
  two near-level cases. Storch's captured fight returns damage/defeat EXP 10/30;
  both near-level predictions complete without errors.
- Preparations: 14 fixture updates covering 11 selection/lifecycle transitions,
  including invalid, dead and missing selections. These are isolated fixtures,
  not a live Preparations playthrough.
- Another 56 native updates cover five player units, an invalid selection and a
  positive Talk case. Storch reads Charisma/Shove; Esfir reads
  Pass/Shove/Steal/Cunning; Lera correctly labels the shared power stat Mag.
- The prepared Talk records and conditions match the native game routines for
  343 records across 51 nonempty chapter slots. Future chapter bytes are changed
  only in private fixtures; the running game/save is untouched.
- All 96 public automated checks pass. Nine Android host render checks pass for
  Units, Map, Growth, Forecast, Analysis, skill detail, positive Talk detail and
  two Preparations selections. The rendered main screens were visually inspected.
- All 13 previous profile runtimes are byte-identical to the previously audited
  Builder 1.4.0 bundle. GBA Duo Plus has no source changes.

The full campaign, every skill/item/enemy combination, live Preparations and
physical touch/gamepad acceptance still need user playtesting. Generated game
assets, snapshots, ROMs and project files remain private.

## Credits

Vision Quest is by Pandan and friends, with the v3 update by Pushwall. All ROM
artwork, writing, music, maps, events and Skill System contributions belong to
their respective authors. See the [original project and complete credits](https://feuniverse.us/t/fe8-complete-fire-emblem-vision-quest-v3-by-pushwall-1-oct-22/3815).
The public builder contains only authored adapters and UI resources; ROM-derived
assets are extracted locally from the user's ROM.
