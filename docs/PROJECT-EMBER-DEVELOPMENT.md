# Project Ember companions — development 0.1.0

> Release status: finalized as companion **1.0.0** in public Builder **1.1.0**. The notes below preserve the earlier 0.1.0 development evidence and its historical registration/version status. See [current release scope](RELEASE-1.1.0.md).


Two separate exact-ROM profiles are prepared from the user's ROMs on Thor:

| Variant | Game code | CRC32 | ROM bytes | Private pack ID |
| --- | --- | --- | --- | --- |
| Project Ember | AFEJ | 636F7B05 | 25,355,392 | fe6-project-ember-local-cache |
| Reverse Recruitment | AFEJ | 29BC2257 | 24,475,812 | fe6-project-ember-rr-local-cache |

Both identities and Battle Forecast states were checked through Studio
Connection. The RR ROM was first read from the user's existing ZIP on Thor;
its CRC/size then matched the live Studio identity. No ROM was downloaded.
These are compatibility identities, not a claim about the patch release number.
Both companions remain **0.1.0** pending acceptance and wider testing.

## Shared implementation and boundaries

The UI inherits the accepted English FE6 layout, CSS, fonts, radar and common
Growth/Analysis popups. Each variant has its own manifest and preparation table
contract; RR does not substitute names over the standard variant's data.
Characters, portraits, class records, growths, equipment and text are extracted
from that exact ROM. Unrecognized revisions are rejected before extraction.

`site/fe6-rom.js` owns shared native FE6 table/asset preparation. Profiles supply
their exact addresses and counts. It handles native 80-pixel-wide class cards,
including the 80x80 cards in Ember, and regular composite portraits. The glyph
decoder also skips native portrait/colour/pause commands instead of treating
them as Shift-JIS glyphs. FE6 T-EN's prepared ROM tables and artwork remain
byte-identical after these changes.

| Table, ROM offset | Standard | Reverse Recruitment |
| --- | --- | --- |
| Character 1 | 6076D0 | 6076D0 |
| Class 1 | 60A130 | 60A130 |
| Items | 1808E74 | 16411B4 |
| Text | 180A394 | 1753624 |
| Portrait 1 | 1605CF0 | 1658A34 |
| Map sprites | 173271C | DE11B8 |
| Affinity bonuses | 137DB0C | 66350C |

The inspected tables contain 226 character, 75 class and 167 nonzero item-ID
records. Their native code literals, IDs and captured character/class pointers
were checked individually. The original FE6 item-table limit of 127 is not used.

Lua inheritance follows native FE6's existing modules, then the Ember runtime
profile, then RR. The runtime registry resolves inheritance recursively and
rejects cycles. RR currently needs no duplicated Lua readers: the two inspected
builds share RAM structures, process scripts and native EXP/level entries.

The player script relocates to `087FF4B0`, with the free-cursor repeat at
`087FF520`; Forecast remains `085C83C8`. Native state is still 16-bit, unit
positions are +14/+15, HP +17 and battle records are 124 bytes apart. EXP and
conditional level jobs execute each selected ROM's own instructions over a
frozen private RAM copy, including its patched routines and RNG consumption.

Both ROMs include the FE6 droppable-item patch: native state bit `1000` marks
the last inventory item. The Ember runtime enables this existing map flag and
inventory/drop pulse bindings. Vanilla FE6 keeps the feature disabled. This
does not write drop flags or otherwise alter the game.

## Current validation

- 60 automated tests pass, including exact-variant rejection, independent pack
  identities, inherited English UI, complete Lua dependency graphs, native
  dialogue control handling and Forecast popup lifetime in all eight profiles.
- The standard live Forecast capture resolves **Roy / Lord, 21/21 HP**, Iron
  Sword and native conditional EXP **10 damage / 30 total defeat**.
- The RR capture resolves **Eliwood / Knight Lord, 39/39 HP**, Silver Sword and
  native conditional EXP **3 / 3** in that captured matchup. It is not replaced
  by the standard variant's values.
- Separate copied-RAM variants use **99 EXP** to exercise native level-up even
  when EXP gain is only 3. Those are conditional tests, not natural game level-ups.
- Native Lua sandbox checks on Thor pass 200 Forecast updates, six synthetic
  drop-state updates and six Forecast-exit updates per variant, with unchanged
  RAM and the existing budgets. In the final runs, the maximum Forecast update
  was 3.306 ms / 573,004 instructions. Measurements describe these fixtures.
- Eight Android host-render cases pass: Units, Map, Growth and Analysis for each
  variant. The near-level Analysis render is explicitly a copied-RAM scenario.
- The six earlier profiles retain identical values outside the two intentional
  popup-dismissal fields over 645 recorded updates. Original FE6 T-EN ROM tables
  and artwork are unchanged. Formatting, build and public catalogue gates pass.

The user accepted both imported variants on the device, including map cursor
movement. Natural level-ups, more weapons/chapters, difficulty modes and support
navigation still need separate checks. Preparations now inherits the native FE6
selection reader; see [the English Preparations audit](ENGLISH-PREPARATIONS.md).
Live Pick Units acceptance and verified enemy-action ownership remain pending.
No full-game prediction accuracy is claimed;
unsupported CPU paths fail closed through the shared English UI.

## Map taps and delivery

Older Plus builds do not whitelist these ROMs or the relocated player script.
The separate **0.1.7-plus.3-fe6-test.2** APK adds both exact identities to the
existing bounded D-pad navigator and retains FE6 T-EN support. Focus tests cover
all deployment banks and rejection of other ROMs. It shares the installed
test.1 signing certificate. Live Map-tap acceptance for Ember is pending.

Two private ZIPs and that APK were copied to Thor at
`Download/GBA-Duo-Companions/Project-Ember/0.1.0` and SHA-256 checked. Save the
game before updating Plus; import each matching ZIP and reopen its ROM. Test
Units, Map, Growth, Analysis, B dismissal and Map roster taps.

The public builder remains 1.0.0 with its three stable Vietnamese catalogue
entries. Neither Ember prototype is advertised by public Find/create yet.
Generated ZIPs, projects, ROMs and captures stay private; only authored source
and compatibility metadata are suitable for the source repository.

## References and credits

[Project Ember by Brunhilda and contributors](https://feuniverse.us/t/fe6-project-ember-v1-85-as-of-8-16-2021-dorothy-edition/6414)
is a gameplay/graphics overhaul of FE6. Runtime structures and text commands
were checked against [fireemblem6j](https://github.com/FireEmblemUniverse/fireemblem6j),
including [`talk.c`](https://github.com/FireEmblemUniverse/fireemblem6j/blob/main/src/talk.c),
and FEBuilderGBA's FE6 references/drop patch documentation. Original game and
hack artwork/text remains attributed to its respective authors, not this tool.
