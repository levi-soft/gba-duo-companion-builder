# Sacred Echoes companion 1.0.0

> Release status: finalized as companion **1.0.0** in Builder **1.1.5** by the maintainer. The notes below retain the earlier development evidence and version history; earlier pending/local-only status is superseded. Validation limits remain applicable. See [current release scope](RELEASE-1.1.5.md).


## 0.1.2: preserve the eighth engine category

The previous reduction to seven visible rank rows was premature. This ROM's
definitions retain type 4 as `Dragonstone`, replacing retail FE8's Staff category.
The class table currently has zero proficiency there, but that is not a reason
to delete the engine slot. The companion now keeps all eight rows and aliases the
fifth byte (`unit + 0x2C`) to explicit Dragonstone bindings, showing `---` at zero.
It retains the ROM's native rank icon. Black/White/Dark Magic stay separate.

Supply pages and usable ranks are separate contracts: its native category lookup
at `08098014` reads the page table at `A188C0`. The exact ROM's Dragonstone item
`AA` uses special type 11 (`Terror`), which must not be misrepresented as a
player's ninth proficiency byte. No rank is inferred from a Supply tab icon.

Validation for 0.1.2: 94 automated checks and 11 Android host render cases pass,
including lit/unlit RNG pixels. Native private-RAM fixtures verify Dragonstone
raw value 71 displays C, zero displays `---`, and a changed seed lights the
indicator. A real user battle also changed `7212 E1E1 9C94` to `AB52 258F 4C9F`;
the live bridge reported `rngStateChanged=true` and the Thor screenshot showed
the green LED. No RNG logic change was required. The LED compares against its
acknowledged baseline; it is not a continuously-on emulator health indicator.

## 0.1.1: Talk UI and weapon categories

The 0.1.0 reader correctly returned live `Alm -> Kliff` Talk data, but the English
FE8 layout did not include its badge/detail page. Sacred Echoes now composes the
same Talk sprite, action and detail component as Storge. Storge's complete
layout/CSS/data remain byte-identical after extracting that shared composition.

The 0.1.1 rank-column reduction is superseded by 0.1.2 above. Heal is type 6
(White Magic). Item/equipment type names follow the ROM. Builder remains 1.1.0
and the APK is unchanged.

Development profile for the user's exact English ROM: `BE8E / 13F15F23`,
21,295,968 bytes, SHA-256
`5dd078efcce43a7602cd4c7844a7330e57fafa71080587bbbf83813cba815ef9`.
Finalized in Builder 1.1.5. No APK change is part of this release. Companion
versions remain independent.

## Implementation

The profile inherits the accepted English FE8 layout, seven-stat Growth and
Analysis, generic focus-unit controls and Preparations readers. Shared FE8 map,
forecast and equipment bodies are composed as modules; their retail wrappers
preserve previous behavior. No palette experiment is restored.

Exact contracts were checked against the ROM and
[HyperGammaSpaces' original source and contributor credits](https://github.com/HyperGammaSpaces/SacredEchoes).

| Contract | ROM offset / native entry |
| --- | --- |
| Characters, classes, items | `803D30`, `807110`, `809B10` |
| Portraits | `1094E64` (pointer at `5524`) |
| Text, sprites, icons | `15D48C`, `8AF880`, `5926F4` |
| Item / weapon-rank palettes | `FCA21C`, bank 0 / bank 1 |
| Chapters, event groups | `8B0890`, `8B363C` |
| Learned-spell getter / buffer | `08B4B72C` / `0202B6D0` |
| Spell HP costs / class level caps | `B4B124` / `B4EAA4` |
| Native range mask getter | `08B47B54` |
| Equipped weapon getter | `08016B28` |

Sacred Echoes uses one shared Str/Mag value, not Hag's split stats or Skill
System. Class commands/traits replace retail FE8 skills. A Spells button reuses
the inherited detail panel and lists spells returned by the ROM, with HP costs.
Class level caps and the 52-HP cap replace retail trainee assumptions. Chapter
headers show the ROM's location names.

Unit summaries use native stat/equipment getters, including weight and equipped
accessory effects. Map weapons include native learned-spell, usability and range
queries, class bow bonuses and equipment bonuses. Bounded native jobs share a
private shadow between phases and run in small slices without requiring Lua's
unavailable coroutine library. While ranges initialize, incomplete danger unions
are withheld and the UI displays a progress label. The jobs never write game RAM.

Forecast uses two-AS doubling, minimum damage 1, per-strike spell HP costs and
Pact. HP bars remain a conditional ordinary-hit estimate, not a revelation of
actual RNG hits/criticals or every special boss effect. Damage EXP is calculated
through the ROM with the explicit assumption that regular hits connect and the
foe survives; defeat EXP is the total. This matters because the ROM scales
non-kill EXP by damage, unlike the base profile's boolean dealt-damage flag.

Analysis executes the patched battle and level-up routines on a frozen private
RAM/RNG snapshot. The exact non-drain protected-store path of DrainEffectFix
leaves r3=4 and attempts a BIOS write. The adapter verifies the opcodes, skips only
the dead read/arithmetic/ignored store and resumes before the class check. Valid
battle-buffer writes and every combat/RNG call remain intact. Other unsupported
instructions still fail closed.

## Validation boundary

- Builder extraction: 255 character records, 127 class records, 763 images.
- Native Lua on Thor: 600 updates across Units/Map/Growth, actual Forecast,
  near-level and normal near-level. The captured Alm fight yields damage/defeat
  EXP 9/30. Near-level prediction completes. Worst observed update was about
  4 ms and 431,000 charged instructions.
- Preparations: 14 fixture updates / 11 selection and lifecycle transitions,
  including Alm, Gray and invalid selections. These are fixtures, not a live
  Preparations playthrough.
- Additional native fixtures cover those three Preparations states, a mage's
  four learned spells and an archer's 1-3 range, including complete danger maps.
  Every run reports unchanged source RAM.
- Shared-module regression: all returned fields match the previous runtime in
  106 updates each for FE6 Remastered, FE8 Vietnamese, FE8 Europe, FE8 US and Void.
- All 93 public automated checks pass. Eight Android host render checks pass
  for Units, Map, Growth, Forecast, Analysis, a class-trait detail and two
  Preparations selections; the main screens were visually inspected. Palette
  indices were checked against the author's original weapon-rank artwork.
- The delivered ZIP was built using the actual Builder 1.4.0 distribution bundle.
  All 951 referenced assets exist. The PC and Thor ZIP SHA-256 values match.

Full story, every accessory/spell/boss combination and live visual/input
acceptance remain unverified.

## Live RNG target comparison (2026-10-26)

The user reproduced Alm versus target A, target B, then A again. All three
captures retained primary seed `6362 8087 3B4E`, Alm level 1 / 70 EXP, and normal
random growths (the fixed-growth event flag was unset). Each unmodified capture
was then replayed in a separate native Lua process with an empty analysis cache.

| Capture | Target HP | NextRN_100 calls before level-up | Seed at level-up | Gains: HP, Str, Skill, Spd, Luck, Def, Res |
| --- | --- | --- | --- | --- |
| A | 8 | 3 | `F65F 1362 4D86` | `1,0,1,1,1,0,0` |
| B | 26 | 9 | `43F8 E58D 19AE` | `1,1,0,1,0,0,0` |
| A again | 8 | 3 | `F65F 1362 4D86` | `1,0,1,1,1,0,0` |

Every replay matched the live gains exactly and reported unchanged source RAM.
The differing post-combat seeds explain the target-dependent predictions; they
are not evidence of retained target caches or fixed per-enemy growths. The
observed cursor/target changes did not advance the live primary seed. This does
not establish that every possible movement-arrow operation leaves RNG unchanged.
The indicator compares the primary seed with its acknowledged baseline; opening
Analysis acknowledges that baseline. No runtime change or version bump resulted
from this diagnosis. Private evidence is under
`.studio-runtime/sacred-echoes/rng-target/live-audit/`.

The movement-specific cause was subsequently found in the author's
`Engine_Hacks/NewFixes.event`: "Remove arrow wiggling advancing RN" writes
`SHORT $2000 $0` at ROM offset `0x1A774`. The exact local ROM hash above contains
bytes `00 20 00 00` there. Disabling movement-arrow RNG consumption is therefore
an intentional ROM patch, independent of the current growth mode. The companion
must not invent seed changes for cursor movement.

The author's `StartingOptionsMenu.c` also provides Normal, Fixed, 0% and 100%
growth choices through the new-game difficulty/options flow, rather than a
normal in-map growth setting. The captured save had Fixed, 0% and 100% flags
unset. These source findings and exact-ROM checks require no pack/APK change.
