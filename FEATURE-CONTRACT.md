# Public scope — Builder 1.1.0

| Profile | Game code | CRC32 | Companion |
|---|---|---|---|
| FE7 Vietnamese | `AE7E` | `32CD990D` | 1.0.0 |
| FE6 Vietnamese | `BE8E` | `BD53D5F3` | 1.0.0 |
| FE8 Vietnamese | `BE8E` | `3CD932D7` | 1.0.0 |
| FE7 English | `AE7E` | `2A524221` | 1.0.0 |
| FE8 Europe | `BE8P` | `B3005195` | 1.0.0 |
| FE8 English - USA/Australia | `BE8E` | `A47246AE` | 1.0.0 |
| FE6 T-EN | `AFEJ` | `197DE10B` | 1.0.0 |
| Project Ember | `AFEJ` | `636F7B05` | 1.0.0 |
| Project Ember Reverse Recruitment | `AFEJ` | `29BC2257` | 1.0.0 |
| Void's Blitzarre Adventure | `BE8E` | `9D22107C` | 1.0.0 |

English profiles are finalized at companion 1.0.0. See [current release evidence and limits](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/RELEASE-1.1.0.md). Void supports six skill slots and pending Talk; its Map range overlays do not include range-changing skills. The older sections below preserve the Vietnamese profiles' development evidence and do not establish complete-game accuracy for the seven English profiles.

# Shared companion contract

## Stable 1.0.0

Builder and all three Vietnamese companions start at 1.0.0. The audit fixes map memory bounds, invalid unit fallback, fog marker disclosure, duplicate FE6 stat IDs and native CSS parsing. Readable Lua remains organized by profile and shared module; UI sources are in ui/. See the [audit](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/STABLE-1.0.0-AUDIT.md) and [version policy](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/VERSIONING.md).

Historical validation records follow.

## Item-description layout in builder 0.9.9

The shared item panel reserves the remaining 60% of its height for non-weapon
descriptions instead of a fixed 50%. Description and item-type/rank text retain
their natural height, with explicit line spacing and no flex shrinking. Long
descriptions scroll vertically inside that panel instead of losing their tail.
The change is shared by all five inventory slots and all three profiles.

The companion CSS/layout is the only rendering change; the Plus application,
Lua modules, ROM-derived strings and game data are unchanged. An isolated test
using the current Plus Android renderer reproduced the old clipping with long
Vietnamese text. The new layout retained more than 100 pixels of measured text
height and successfully scrolled to the final Staff/Rank line. Both before/after
render cases passed; this host-renderer check is separate from live Thor visual
acceptance. Rebuild/import the companion to update an existing installed pack.

## Preparations selection in builder 0.9.8

FE7 companion 0.7.16, FE6 Remastered 0.4.17 and FE8 0.6.8 read the highlighted
player unit from the Preparations roster, Items screen or active stat screen.
Units not selected for deployment remain inspectable. Invalid/empty selections
clear unit information; stale map cursors and Forecast data are not used.

The implementation is authored in `runtime/shared/game.preparations.lua`.
Game addresses live in each `game.profile.lua`; unit orchestration and map/default
presentation call the module without replacing the entry-point update pipeline.
FE8 layouts were checked against the
[preparation structs](https://github.com/FireEmblemUniverse/fireemblem8u/blob/master/include/prepscreen.h)
and [selection reader](https://github.com/FireEmblemUniverse/fireemblem8u/blob/master/src/prep_unitselect.c).
FE7 addresses were checked in the supported ROM and a live Preparations capture.

Evidence: all 26 automated tests pass, including 36 isolated selection/lifecycle
cases across the three profiles. Full-runtime fixtures cover roster changes,
benched units with no map coordinates, stat-screen priority and clearing invalid
selections on all three profiles. The existing 345-tick map/Forecast regression
trace remains identical to the frozen baseline. All three packs were rebuilt
from the supported ROMs with no changed prepared image assets.

On Thor's isolated native Lua harness, all three profiles passed six updates
each against copied Preparations fixtures, without RAM writes. Maximum measured
update time was 0.322 ms and maximum instruction count 8,600 in those runs.
These are short fixture measurements, not sustained frame-time guarantees.
The real FE7 capture now resolves Lyn, level 7, HP 20, where the old code returned
no unit. The modified packs have not yet been visually accepted in a live game;
FE6/FE8 Preparations navigation still needs direct device acceptance.

Rebuild/import companions to receive this fix; installing a new builder does
not silently modify companions already installed or selected by the user.

FE6 Vietnamese, FE7 Vietnamese and FE8 Vietnamese are profiles of one kit, not separate UI products.

- Units, Map, Battle Forecast, Growth and Analysis come from one common theme.
- Analysis, its close/open controls, RNG indicator, dynamic +N values, blinking, computation progress and confidence presentation are shared.
- Profile extensions add only ROM-specific capabilities and data, such as separate Mag, skill slots, leadership and Talk. They must not contain copies of common popups or controls.
- A new shared feature must be implemented and checked for all three profiles. ROM adapters may use different algorithms, but cannot silently claim capabilities or precision they do not have.
- Computation progress is an estimate; 100% means computation finished, not 100% prediction accuracy.
- Confidence percentages require representative independent validation. The UI displays the state of the current calculation, not a confidence percentage. Validation scope is documented separately; no overall 95% or 100% accuracy claim is made.

## Current evidence and limits

One real FE6 level-up on Thor matched all eight gains. The current evaluator also matched an independent mGBA execution of this exact ROM in 1,700 scoped cases: 200 RNG variations of two captured forecasts, 400 synthetic growth/cap cases, and 1,100 roster/skill/weapon cases. No unsupported paths remained in these groups. These are fixture variations, not 1,700 independent real battles. The requested 95% overall accuracy target is not established.

The earlier 30 unsupported javelin paths were traced to missing caller register context and are now covered. CPU conformance checks matched mGBA in 2,436 cases. Separate Paragon and Blossom checks confirm conditional EXP follows the complete ROM modifier path. These results do not prove every mod skill, action, weapon slot, or future ROM version.

The FE6 evaluator freezes its RAM baseline and performs bounded cooperative work. It does not write game RAM or simplify combat by omitting skill, counterattack or RNG processing. Unsupported execution reports unavailable instead of fabricating a result.

The shared UI and data contract are automated checks; the final status-row layout still needs visual acceptance on the device.

FE8 Vietnamese (3CD932D7) uses the common Analysis and Growth UI without separate Mag. Its ROM adapter routes scripted tutorial battles through the scripted unwind function. Scoped mGBA comparisons matched 400/400 RNG variations across old/current tutorial captures, a normal-battle variant, and a Metis Tome variant. These include synthetic RAM variants. A real Thor level-up comparison is recorded under 0.9.5 below; these results do not establish full-game accuracy.

## Support fixes in 0.9.1

All three profiles use the same earned-support rules, compiled into their individual runtimes. Support counts use byte +0x15, ranks begin at 81/161/241 points, all seven partner records are examined, and earned partners are compacted into five UI cards. Name, portrait, rank, unknown-state and empty-state bindings are reset together on selection changes. Unranked partners stay hidden.

The actual FE7 ROM rank routine and the identical FE6-mod/FE8 support routines were checked before sharing these rules. Isolated support tests passed 2,598 FE7, 3,016 FE6-mod and 1,828 FE8 cases (7,442 total). Nine additional native Lua executions of exported packs checked hidden/earned support states and late partner records on captured RAM with synthetic support values. These tests did not write the running game's RAM and do not substitute for naturally earned support conversations throughout each game.

The public website and Plus runner use one shared generation core, profile templates and compiler. The public distribution is rebuilt and verified with `npm run build` and `npm test`; it does not require private authoring files.

## Analysis fixes in 0.9.2

FE7 now presents hypothetical level-up gains when conditional damage or kill EXP is sufficient, independently of the hidden simulated hit/miss outcome. Combat and RNG consumption still run normally before level-up rolls. No-EXP maps do not produce a hypothetical level-up, and actual simulated earned EXP is not exposed by the popup bindings.

FE6-mod and FE8 now include chapter mode/state flags and BmSt game-state flags in their Analysis cache key. Clocks, camera and frame counters are excluded so normal frame updates do not restart a calculation. An isolated FE8 regression at 69 EXP now changes cached kill EXP from 32 to 30 after a mode change, matching a fresh calculation and correctly removing level-up availability. Exported-runtime regressions also cover the EXP-state and no-EXP-map flags on both FE6-mod and FE8. These are synthetic captured-RAM tests, not an overall accuracy guarantee or device UI acceptance.

## Conditional Analysis in 0.9.3

All three profiles label the EXP cards as conditional damage and conditional defeat EXP. The level-up heading names the qualifying condition: damage, defeating the opponent, or either. The unit is assumed to survive. A calculation being available means at least one EXP condition could reach the next level; it does not announce that the next attack hits, misses, crits, defeats the opponent or that the actor survives. Defeat EXP is the total, not an addition to damage EXP. Actual earned EXP, round outcomes and actual level-up flags are not bound into this popup.

The shared FE6/FE8 hypothetical level-up engine restores a private post-combat HP of one only if the actor was defeated in simulation, after combat RN consumption. This prevents simulated death from bypassing the conditional level-up roll. The game's RAM and normal combat sequence remain untouched. Post-level gains remain a conditional estimate based on a copied RN stream, not a statement that those combat conditions will occur. Unsupported calculations still report unavailable.

The regression suite checks conditional labels and availability across miss, normal-hit, critical-hit and lethal-counter inputs for each exact profile, as well as the cache and no-EXP-map regressions. These fixture variations are not additional real battles, a general accuracy guarantee or visual acceptance of the popup.

## State handling in 0.9.4

FE7 scripted battles that the adapter does not support now show the unsupported state and its reason instead of waiting indefinitely. Failure states take priority over pending or stale completion flags in the shared presentation. Failed calculations show no level-up result and no completed progress. Returning to a supported forecast clears the error. FE6/FE8 query and prediction failures use the same presentation rules.

The lifecycle checks exercise supported-to-scripted-to-supported FE7 forecasts, empty/restored selected units, closed/reopened forecasts and isolated EXP/job/constructor failures. Native runtime, packaging and lifecycle checks do not establish full-game accuracy or acceptance on every display. Device verification of the current popup and alternate resolutions remains separate from these isolated-harness checks.

## Faction sprite palettes in 0.9.5

FE6 Remastered and FE8 preparation now translate deployment faction order (player blue, ally green, enemy red) to ROM palette-bank order (blue, red, green). Previously the ally/enemy images were swapped. FE7 already used the correct palette order. The preparation checks independently decode the produced PNG pixels and compare all distinct class sprites against their ROM tile indices and the expected palette bank for each of the three factions. Palette decoding occurs during local preparation; it adds no per-frame image processing during gameplay.

On Thor, Franz went from level 2 at 79 EXP to level 3. All seven stat gains matched the prediction captured before confirming combat: HP 0, Str +1, Skill +1, Spd +1, Lck +1, Def 0 and Res 0. Actual earned EXP was 33, matching the conditional defeat-EXP card. The damage-EXP card was 10. This is one verified real battle, not a general accuracy percentage.

## Forecast navigation in 0.9.6

The shared presentation now switches to Units only when entering a new Forecast. Later updates leave mainTab and the navigation-button selection unchanged so the user can choose Map while keeping Forecast open. FE6 and FE8 previously forced Units on every update; FE7 already suppressed those repeated writes. Tests cover all three exported runtimes and leaving/re-entering Forecast. This does not alter combat, EXP, RNG consumption or game inputs.
