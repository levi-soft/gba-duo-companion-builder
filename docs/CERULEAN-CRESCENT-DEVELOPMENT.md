# Cerulean Crescent companion 1.0.0

Released version: **1.0.0**, built with **Builder 1.2.0**. Feature verification is incomplete: ten new profiles have no working Analysis, five have limited conditional tests, and full companion-app acceptance is pending. See the [verification correction](ANALYSIS-GAPS-1.2.0.vi.md) and [release notes](RELEASE-1.2.0.md).

## Pre-release validation record

Development profile, not a stable release. Builder remains 1.1.5. No APK change is required.

Exact local ROM: `BE8E / DC071CC2`, 32800556 bytes, SHA-256 `3ff3772a4b94a73a6fd649a131147425484dddfcf7ea19bb25f175bd45e7be72`. Other patches/regions require separate profiles. Wrong code or checksum is rejected before extraction.

## ROM contracts

| Data | ROM offset / CPU entry |
|---|---|
| characters | `803D30` |
| classes | `125C970` |
| items | `1262770` |
| portraits | `101ABD4` |
| sprites | `1048524` |
| icons | `1010A70` |
| iconPalettes | `5996F4` |
| text | `1C8C2F4` |
| chapters | `8B0890` |
| Classes retained | 254 |
| Level caps | `B2C020` |
| Native skill-list entry | `8B408F8` |

The table locations are confirmed by native pointer literals and matching record IDs. The skill-list routine executes against private shadow RAM, never the running game. English shared layouts, exact-ROM tables, real portrait/map-sprite/item/skill extraction and native format 2 ZIP packaging are reused.

## Growth and custom mechanics

Seven base character growths use the exact ROM data. Class-specific level caps come from the installed cap table, including the normal cap 30. Promotions retain the visible level; the native EXP comparison adds 3 for promoted character/class attributes. Growth-mode settings and item/skill modifiers are not silently treated as retail Metis bonuses.

Native level-up execution confirms the HP ceiling is 80, including classes whose record HP byte differs. Other core caps use class records and Luck is 30. Character/class identity, zero values and class-indexed cap mapping are tested.

RAM-backed character names use bounded 16-byte EWRAM recipes. They refresh before Units, Map, Growth, Forecast and support readers; blank RAM uses the neutral Avatar fallback. Synthetic rename fixtures verify refresh and clearing; this does not establish that every such character is selectable in the opening map.

Affinity bonus fields read the exact-ROM table reached by the native support routine, with row-ID validation.

## Verification and limits

A private build through the real site builder produced the companion ZIP and editable JSON. Fresh private mGBA/romdev opening-map RAM was captured and compared with the generated Lua. Native skill lists and Units/Growth/Map updates were exercised on that capture. A separate native empty-cursor capture also cleared unit details. Additional multi-unit cursor selection and invalid-position fixtures use copies of captured RAM; those transitions are not new in-game observations. Inputs/captures and generated resources remain in the private workspace.

Native EXP/level-up prediction is explicitly unavailable in 0.1.0; this avoids presenting stock predictions for unverified custom mechanics. Live forecast fields remain available, but inherited derived combat/range formulas do not establish every custom skill, PCC or move interaction.

Growth modifiers, optional capture mode, self-repairing weapons and range-changing skills require additional mode-specific verification. Base movement/weapon range overlays do not include every skill effect.

This does not establish a full campaign, every game mode, every skill/item combination, physical Android rendering, or physical Thor input. No public release or version promotion is part of this development step.

## Credits

Game artwork, writing, music and engine modifications belong to the hack's creators and credited contributors. See [the author's project](https://feuniverse.us/t/fe8-cerulean-crescent-31-chapters-complete-2-0-update-release-the-birds/13666). The public adapter stores instructions and authored code; game-derived resources are extracted locally from the user's ROM and are not included in the repository.
