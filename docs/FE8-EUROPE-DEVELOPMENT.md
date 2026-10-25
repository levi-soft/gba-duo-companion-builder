# FE8 Europe development — 0.1.0

Exact supported development ROM: **BE8P / B3005195**, 32 MiB, identified through
the read-only Studio connection on Thor. The companion uses English text from
the European cartridge's English table and the shared English UI. It remains
**0.1.0** until its release scope and validation are complete.

## Inheritance and region boundary

- Shared layout/CSS, Growth/Analysis popups and radar come from `ui/`, including
  FE8's native ability panel. No second popup tree is maintained.
- English presentation for FE7 USA and FE8 Europe now shares
  `runtime/shared/presentation.english.lua`. ROM names/descriptions and numeric
  calculation results are excluded from translation.
- `site/profiles/fe8-europe/prepare.js` contains the European table/graphics
  addresses. The common FE8 preparation reader keeps the Vietnamese defaults.
- `runtime/fe8-europe/game.profile.lua` supplies European selection, Forecast and
  Preparations process pointers, including the distinct IWRAM active-unit pointer.
- `runtime/fe8-europe/game.execution.lua` supplies the individual European EXP,
  battle and level-up entry points and unit lookup table. The shared FE8 jobs
  accept this contract and retain their original USA defaults when it is absent.
  A single constant ROM offset is not used.

The execution entries were matched individually against code from the actual
ROMs (unique masked 64-byte matches); process scripts used unique 128-byte
command-pattern matches. These patterns are identification evidence, not proof
that every battle path is equivalent. The development tests also execute the
European routines, rather than merely testing the address declarations.

## Current evidence

- 49 automated tests pass, including exact-region rejection, inherited English
  UI, routing of normal/scripted battle jobs to EU entry points/hooks, and 12
  synthetic Preparations transitions using the European process contract.
- Copied live map RAM resolves Eirika / Lord, inventory descriptions, chapter,
  tactical map, native abilities and Growth data. Four native Lua runs passed
  24 updates without changing fixture RAM.
- The live Forecast capture produces conditional EXP 10 for damage and 32 total
  for defeat. A separate copied-RAM variant sets EXP to 90 to exercise a level-up;
  the European scripted/normal job routing completes and yields conditional stat
  gains. The game itself was not given EXP or modified by this test.
- Two additional native Lua runs passed 200 Forecast updates total, actual and
  near-level variant, with read-only RAM checks. Maximum measured update time in
  these runs was 2.458 ms and maximum instruction count 355,586, within the
  existing 25 ms / 1M per-call limits. These are fixture measurements.
- Four Android host-render checks pass for Units, Map, Growth and Analysis. The
  Analysis render uses the copied-RAM near-level variant; it is not a real level-up.
  No Plus source, APK or installed game data was changed for these render tests.
- Existing Vietnamese profiles retain identical outputs across 345 captured
  updates. Accepted FE7 English output remains identical over 12 map/UI updates.

Live import/render acceptance, natural level-ups, more weapons/enemies, difficulty
modes, support/skills and real Preparations navigation need separate checks before
1.0.0. No full-game prediction-accuracy percentage is established. Unsupported
CPU paths continue to report unavailable rather than inventing a result.

## Distribution

The private Local ZIP is built from the player's own ROM, with version **0.1.0**
and ID `fe8-europe-local-cache`. It is imported manually during development.
It must not be published with its extracted game assets/text. The public builder
catalogue continues to advertise the three stable Vietnamese profiles only;
adding this profile publicly requires the existing profile-set version policy.
