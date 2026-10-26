# The Last Promise companion 1.0.0

> Release status: finalized as companion **1.0.0** in Builder **1.1.5** by the maintainer. The notes below retain the earlier development evidence and version history; earlier pending/local-only status is superseded. Validation limits remain applicable. See [current release scope](RELEASE-1.1.5.md).


Development profile for the user's exact English ROM: `AE7E / D1C6E5D5`,
32,505,856 bytes, SHA-256
`2d12c4fd916021db9ebc8c142546684629446f158d9db3d39809842617da52e7`.
Finalized in Builder **1.1.5**. No APK change is part of this release.

## Implementation

The profile composes the accepted English FE7 layout and shared Talk sprite/detail
component. It adds no FE8 Skill System panel or separate Magic stat. Units, Map,
Growth, conditional Analysis and Preparations inherit the existing FE7 modules.
The generic FE7 cursor contract supplies unit focusing without an APK change.

The shared FE7 preparer now accepts optional exact-ROM table addresses and an
extra-data hook. Default addresses and behavior remain unchanged. The Last
Promise overrides only relocated character/class/chapter tables, allows its
character class-card portrait and prepares Talk records plus class level caps.

| Contract | ROM offset / native entry |
| --- | --- |
| Characters, classes, chapters | `1D00000`, `1BC7000`, `1D04000` |
| Portraits, map sprites, text | `C96584`, `C99700`, `B808AC` |
| Items / icons / icon palette | `1250000`, `1055EA4`, `0CBEA4` |
| Unit slots / chapter event groups | `B92EB0`, `1474400` |
| Class level caps | `DAE800` |
| Chapter event getter / flag getter | `080315BC`, `080798F8` |
| Temporary / permanent flags | `03004AD8`, `03004AD0` |
| Native combat / EXP / level-up | `08028FB0`, `0802956C`, `08029660` |
| Native Aid getter | `08018450` |

Chapter titles include the ROM's own chapter labels, gaidens and named finales;
they are not numbered from table slots. A verified native hook at `08DAE700`
reads class-specific level caps. Most classes cap at 20, while classes such as
Mystic Sage cap at 30. Analysis and simulation use the optional class cap;
profiles without that field retain the original 20-level behavior. The Last
Promise presentation preserves that cap and provides conditional eligibility
above level 19 instead of relying on a shared 20-level fallback.

The profile also corrects inherited Aid presentation. It follows the native
mounted/gender attribute checks instead of mistaking personal constitution for
gender. Siegfried's Aid is 13, matching the native getter. This adapter is scoped
to The Last Promise and leaves existing profile behavior unchanged.

## Validation

- Live Studio identifies Siegfried and Shon and an active Battle Forecast.
- Extraction: 252 character records, 115 class records and 923 generated images.
- Native Lua on Thor: 474 updates across Units, Map, Growth, actual Forecast and
  two near-level cases, all reporting unchanged source RAM. The captured
  Siegfried fight returns conditional damage/defeat EXP 11/11.
- On isolated captures, native combat and EXP/level-up routines match the
  inherited simulator's EXP, all seven stat gains and final primary RNG seed.
  Cases cover the live fight, level 19 and levels 20/29 with a level-30 class.
- Preparations: 14 fixture updates covering 11 selection/lifecycle transitions,
  including invalid, dead and missing selections. This is not a live
  Preparations playthrough.
- Another 40 native updates cover Siegfried, Shon, an invalid selection, a
  positive Talk fixture and a level-20 Mystic Sage with cap 30 and 10 levels left.
- Talk: 136 prepared records across 25 chapter slots match the native event-list
  getter and flag checker. The positive pending Talk fixture is Siegfried to
  Kelik. Its unit/flag changes exist only in private RAM copies.
- Retail FE7 preparation data and extracted assets match the pre-change reader
  exactly. Twelve retail runtime updates across Units/Map/Growth also match the
  previous Builder bundle. Diagnostic radar bytes in that preparation comparison
  are synthetic; delivered charts are rendered from the actual distribution.
- The delivered project is built from the actual Builder distribution and its
  files/layout match the audited source build. All 99 public checks pass.
- Nine Android host render checks cover Units, Map, Growth, Forecast, Analysis,
  two Preparations selections, positive Talk and a class cap of 30. Main rendered
  screens were visually inspected. The 14 existing profile layouts, CSS and
  initial data are byte-identical to the previous bundle.

Every campaign battle, postgame class/item combination and physical touch/input
acceptance remain unverified. Private ROMs, snapshots, project JSON, extracted
assets and playable companion ZIPs are not part of the public builder.

## Credits

The Last Promise is by Blazer and the original project contributors. See the
[official project, guides and full credits](https://www.feshrine.net/thelastpromise/).
Original portraits, sprites, music, maps, writing and game modifications belong
to their respective authors. FE7 table-pointer contracts were cross-checked with
[FEBuilderGBA's source](https://github.com/FEBuilderGBA/FEBuilderGBA/blob/master/FEBuilderGBA/ROMFE7U.cs)
and the exact local ROM. The public builder ships authored adapters and UI only;
game assets are prepared locally from the user's ROM.
