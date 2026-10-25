# FE6 T-EN development — 0.1.0

> Release status: finalized as companion **1.0.0** in public Builder **1.1.0**. The notes below preserve the earlier 0.1.0 development evidence and its historical registration/version status. See [current release scope](RELEASE-1.1.0.md).


This development companion targets **AFEJ / CRC32 197DE10B**, 8,612,264 bytes.
The ROM identity and map/Forecast RAM were read through Studio Connection on
Thor. Other English patches are rejected even when their game code is AFEJ.
Version stays **0.1.0** until the development scope is accepted and stable.

## Structure

The template inherits the common English widget tree, CSS, Growth/Analysis
popups and radar. It does not fork the Vietnamese layouts. Game names and item
descriptions come from the selected ROM; the patch's individual glyph map is
authored separately in `encoding.js`. Remaining original encoded records are
decoded as Shift-JIS rather than being treated as malformed UTF-8.

`site/profiles/fe6-english/prepare.js` extracts FE6's 48-byte character, 72-byte
class and 32-byte item records. Generated ROM tables and artwork are local only.
Its Lua runtime separates profile addresses, scalar-memory adaptation, unit
selection, unit presentation, inventory, support, terrain, Growth, EXP and
conditional level prediction. Shared rank/range rules have one owner.

Only map and Forecast display use the local `game.memory` adapter to reuse the
existing FE7 presentation readers. Native FE6 readers and calculations use raw
memory addresses. FE6 state is 16-bit; battle records are 124 bytes apart. The
adapter must not expand state into x/y bytes or mix the adjacent battle records.
FE6's rank thresholds, +30 critical class bonus, ten support partners and support
thresholds 61/121/201 are separate from FE7/FE8. FE6 has no Afa/Metis growth bonus.

EXP runs `BattleApplyExpGains` at `0802503C`. Conditional level prediction first
runs `BattleUnwind` at `08024AB4`, then EXP/level-up at `08025104`. The shared
bounded Thumb evaluator writes only to a private shadow over a frozen RAM copy.
It preserves forecast-disabled counterattacks, battle flag bits, combat RNG
order and native stat caps. Survival and reaching 100 EXP are explicit
conditions of the displayed level prediction; the game receives neither change.
Unsupported instructions fail closed through the existing unavailable UI.

Primary references used to check structures and individual routines:
[FE6 decompilation](https://github.com/FireEmblemUniverse/fireemblem6j), especially
[`unit.h`](https://github.com/FireEmblemUniverse/fireemblem6j/blob/main/include/unit.h),
[`battle.c`](https://github.com/FireEmblemUniverse/fireemblem6j/blob/main/src/battle.c),
[`support.h`](https://github.com/FireEmblemUniverse/fireemblem6j/blob/main/include/support.h),
and [FEBuilderGBA's FE6 address map](https://github.com/FEBuilderGBA/FEBuilderGBA/blob/master/FEBuilderGBA/bin/Debug/config/data/asmmap_FE6.en.txt).
Addresses were also checked against the actual supported ROM and captured RAM.

## Validation and limits

- Automated tests cover exact-patch rejection, inherited English UI, native
  unit/battle offsets, support partners 8–10 and thresholds, inventory ranks and
  critical bonus, EXP/level entry points and private conditional hooks.
- Captured map resolves Roy/Lord, 18/18 HP, Rapier, English item description and
  character Growth. Native Lua checks exercise Units, Map, Growth and Analysis.
- Captured Forecast resolves Lance and conditional EXP **10 damage / 30 defeat**.
  A separate isolated RAM variant sets EXP to 90; its conditional gains are
  HP +1, Str +1, Skill +1. That variant is a test, not a natural game level-up.
- Native checks run 24 map/UI updates and 200 Forecast updates, with unchanged
  fixture RAM and the existing 25 ms / 1M instruction update limits. Exact timing
  and instruction measurements are stored with the private audit reports.
- Four Android host-render cases check Units, Map, Growth and Battle Analysis
  with the prepared ZIP and existing Plus renderer. They do not replace live
  import/render acceptance on Thor.
- Existing Vietnamese profiles retain identical outputs over 345 captured
  updates. Accepted FE7 English retains identical outputs over 12 updates;
  FE8 Europe retains identical outputs over 12 map and 100 Forecast updates.

Preparations selection now uses the native FE6 roster and stat-screen reader;
see [the English Preparations audit](ENGLISH-PREPARATIONS.md) for fixture evidence
and the outstanding live Pick Units check. Verified enemy-action process
ownership is still pending. Full equipment/support modifiers,
promotion, more weapon and combat paths, live support navigation and natural
level-ups require further checks before 1.0.0. No full-game prediction accuracy
percentage is established. These limitations must not be described as validated
features merely because the common UI is inherited.

## Distribution

Forecast popup dismissal is checked and shared across the six profiles; see
[the popup lifecycle audit](FORECAST-POPUPS.md) for evidence and device-test limits.

Private pack ID: `fe6-english-local-cache`, version **0.1.0**. Import the Local ZIP
manually during development. It contains ROM-derived images/text and must stay
private. Source, tests and authored templates contain no ROM or prepared tables.

The public builder remains 1.0.0 and advertises only the three stable Vietnamese
profiles. This experimental profile is not wired into public Find/create or the
supported-games catalogue. Public registration follows the existing
[profile-set version policy](VERSIONING.md).

Live import testing found that tapping a unit in Map did not move the game
cursor on Plus 0.1.7-plus.3. The pack already queued `input.focusUnit`, but that
host release had no FE6 whitelist/profile. The separate Plus development fix
adds the exact FE6 identity and native unit layout to the existing D-pad
navigator. This interaction requires that updated host; changing only a
companion ZIP cannot enable it in the old APK. The companion itself remains
0.1.0. On 2026-10-25 the user installed Plus
`0.1.7-plus.3-fe6-test.1` on Thor and confirmed that tapping a unit in the Map
tab moves the main game cursor. This confirms the reported interaction after
the host fix; it does not establish coverage of every faction, busy state,
camera-scroll case or the remaining FE6 development scope.
