# FE8 English USA/Australia — 0.1.0

> Release status: finalized as companion **1.0.0** in public Builder **1.1.0**. The notes below preserve the earlier 0.1.0 development evidence and its historical registration/version status. See [current release scope](RELEASE-1.1.0.md).


Exact ROM: **BE8E / A47246AE**, 16 MiB, read through the user's enabled Studio
connection on Thor. This is an independent development profile, not the previously
accepted FE8 Europe build (BE8P / B3005195). Version stays **0.1.0** until accepted
and finalized by the user.

## Organization and builder

- `site/profiles/fe8-english/profile.json`, `template.js` and `prepare.js` declare
  the exact ROM, original English text/table addresses and the shared English UI.
  Preparation calls the existing FE8 builder reader and compiler; it does not use
  text/artwork from the Vietnamese ROM or patch the exported ZIP afterwards.
- Runtime inherits `fe8-europe`, including its English entry point, common FE8
  gameplay readers, ability UI, Map chapter formatter, Growth/Analysis and Forecast
  popup lifecycle. Only `game.profile.lua` and `game.execution.lua` are overridden
  with US contracts. There is no duplicated UI or battle algorithm.
- The emitted manifest carries the inherited `fe8-us` cursor preset. No APK change
  is needed. Older verified US host profiles also recognize this exact ROM.
- The stable public catalogue remains three Vietnamese profiles. English profiles
  remain experimental and are built through the same builder with their development
  profile registration; this change does not automatically publish a new catalogue.

## Evidence and limits

The captured Forecast resolves Eirika / Lord in Prologue: The Fall of Renais.
Eight 64-byte routine windows and seven 128-byte process-script windows match the
previously verified US engine base. The full 256-entry unit lookup table matches;
the active unit pointer and Forecast process are present in captured RAM. These
checks establish the selected contracts, not every possible engine path.

Captured-RAM execution passes actual Forecast, near-level EXP 99, and a synthetic
normal-battle variant. All three complete; conditional damage EXP is 10 and defeat
EXP is 32 for this encounter. Near-level variants produce conditional stat gains.
These are isolated CPU/RAM copies, not a natural level-up or a change to the game.

Units, Map with the chapter name, Growth and English Analysis are checked. Replayed
Forecast entry/exit clears Growth/Analysis while stable frames permit normal popup
interaction. This models the transition after B; live B-button acceptance still
belongs to the import/device test.

Preparations has six-profile reader regression coverage and a full-runtime fixture
with Seth/Eirika, benched-unit state, invalid selections and stat-screen priority.
Native fixtures also cover those selections without a valid map. The user has not
yet accepted live Pick Units behavior for this profile.

The Thor native Lua harness passes **336 updates**: 318 current/near-level/normal
Forecast and UI updates plus 18 Preparations updates. RAM remains unchanged. The
runtime remains within the existing instruction/time budgets on these fixtures.

Six Android host render cases pass: Units, Map, Growth, Analysis, Preparations
Seth and Preparations Eirika. Analysis and Map were visually inspected. The final
ZIP is rebuilt through the generated builder distribution and every entry matches
the tested ZIP byte-for-byte. The eight earlier runtime graphs and cursor
contracts are unchanged apart from the inherited English entry-point comment.

More chapters, enemies, weapons, difficulty modes, support navigation and natural
level-ups require live coverage before 1.0.0. No full-game prediction accuracy is
claimed. ROM captures and Local ZIP assets stay private.

## Private pack

Pack ID `fe8-english-local-cache`, version **0.1.0**. Import the Local ZIP for this
exact ROM and reopen the game. The profile source and builder logic can be shared;
the generated pack contains ROM-derived assets and text and must stay private.
