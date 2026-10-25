# Forecast popup lifecycle

The shared `runtime/shared/presentation.forecast.lua` owns Growth/Analysis
popup dismissal when the game enters or leaves Battle Forecast. Each of the
six current profile entry points applies it after feature computation and
prediction presentation. English translation runs afterward where applicable.

This follows the behavior previously present inside FE7's analysis feature.
That feature now retains its navigation/calculation state, while popup lifetime
has one presentation-layer owner. Stable Forecast/map frames do not force
popup state: users can reopen Growth or Analysis and navigate Units/Map normally.
Leaving Forecast with no selected unit still dismisses the old popup.

## 2026-10-25 audit

Before the shared fix, replaying captured Forecast exit through the current
module registry produced the following results. These results describe the
checked sources, not every historical pack or APK on the user's device.

| Profile | Exit emitted Analysis dismissal before fix | After fix |
| --- | --- | --- |
| FE7 Vietnamese | Yes | Pass |
| FE6 Remastered Vietnamese | No | Pass |
| FE8 Vietnamese | No | Pass |
| FE7 English | Yes | Pass |
| FE8 Europe English | No | Pass |
| FE6 T-EN | No in the initially reported build | Pass |

Validation includes 57 automated tests, all six main entry points, popup state
across entry/exit/reopening, and a unit-absent exit. Six full runtime checks
replay captured RAM while removing/restoring the actual Forecast process.
FE7 English uses the shared-address FE7 Vietnamese Forecast RAM fixture with
the English ROM; that is not a live English B-button capture.

Native sandbox execution on Thor passes six updates per profile (36 total),
including Forecast exit, under the unchanged budgets and with unchanged RAM.
Its test-only memory read view removes the Forecast process after tick two;
it does not inject a physical button or alter the running game. In these runs
the maximum measured update was 3.988 ms / 411,586 instructions.

Across 345 Vietnamese and 300 English fixture updates, outputs outside the two
intentional popup-dismissal fields and action calls remain identical to the
comparison baselines. Vietnamese prepared artwork is unchanged. Lua formatting
and generated dependency graphs also pass their checks.

The user reported B dismissal working in Vietnamese packs and failing in FE6
T-EN. This audit reproduces and fixes the missing Forecast-exit dismissal; it
does not claim fresh physical B-button acceptance on all six ROMs. That remains
a device check after importing the updated packs.

## Delivery

Private ZIPs were copied to Thor under
`Download/GBA-Duo-Companions/Popup-Fix-2026-10-25` and checked with SHA-256.
Save the game, return to the library, import the matching replacement pack,
reopen the ROM, then open Forecast/Analysis and press B. Reenter Forecast to
check that Analysis can be opened again. The host APK does not need an update
for this Lua change.

Versions stay 1.0.0 for the three Vietnamese companions, 0.1.0 for the three
English development companions and 1.0.0 for the public builder. No new public
profile registration or deployment is performed by this local fix.
