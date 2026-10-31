# The Sun God’s Wrath companion 1.0.0

Companion **1.0.0** is included in the repaired **Builder 1.2.0** release of 2026-10-31. See [current release changes and known limits](RELEASE-1.2.0.md) and the [unchanged-APK repair scope](OFFICIAL-30-COMPANION-FIX-2026-10-30.vi.md). The older development checks below are historical evidence; they do not establish full Android acceptance.

## Pre-release validation record

Development profile, not a stable release. Builder remains 1.1.5. No APK change is required.

Exact local ROM: `BE8E / 566D7A9E`, 33007144 bytes, SHA-256 `1f3701cb24416a72591aa166c01bbf6ef12cda945836c37c2661b5b849f3a705`. Other patches/regions require separate profiles. Wrong code or checksum is rejected before extraction.

## ROM contracts

| Data | ROM offset / CPU entry |
|---|---|
| characters | `803D30` |
| classes | `1EC9CBC` |
| items | `1ECF474` |
| portraits | `F01A1C` |
| sprites | `11DBFD0` |
| icons | `1004944` |
| iconPalettes | `5996F4` |
| text | `1DD8BE0` |
| chapters | `8B0890` |
| Classes retained | 255 |
| Level caps | `1EC9BBC` |
| Native skill-list entry | `9EFB87C` |

The table locations are confirmed by native pointer literals and matching record IDs. The skill-list routine executes against private shadow RAM, never the running game. English shared layouts, exact-ROM tables, real portrait/map-sprite/item/skill extraction and native format 2 ZIP packaging are reused.

## Growth and custom mechanics

Seven core growths use character offsets 1C..22. Active level-up dispatch reaches the Con and Mov getters reading character offsets 23 and24; these are displayed separately below the seven-axis chart. The exact-ROM cap table is 30. No assumption is made about a standard 0xEF fixed-growth flag or about other fatigue/100% ROM variants.

Native level-up execution confirms the player HP ceiling is 60, including classes whose record HP byte differs. The red-faction maintenance/battle clamp is 120; this does not make enemy units eligible for EXP. Other core caps use class records and Luck 30.

Affinity bonus fields read the exact-ROM table reached by the native support routine, with row-ID validation.

## Verification and limits

A private build through the real site builder produced the companion ZIP and editable JSON. Fresh private mGBA/romdev opening-map RAM was captured and compared with the generated Lua. Native skill lists and Units/Growth/Map updates were exercised on that capture. A separate native empty-cursor capture also cleared unit details. Additional multi-unit cursor selection and invalid-position fixtures use copies of captured RAM; those transitions are not new in-game observations. Inputs/captures and generated resources remain in the private workspace.

Native EXP/level-up prediction is explicitly unavailable in 0.1.0; this avoids presenting stock predictions for unverified custom mechanics. Live forecast fields remain available, but inherited derived combat/range formulas do not establish every custom skill, PCC or move interaction.

PCC, weapon-rank bonuses, fatigue variants, leadership effects, special status duration and growth-mode modifiers need custom verification. Range overlays use base movement/weapons only.

This does not establish a full campaign, every game mode, every skill/item combination, physical Android rendering, or physical Thor input. No public release or version promotion is part of this development step.

## Credits

Game artwork, writing, music and engine modifications belong to the hack's creators and credited contributors. See [the author's project](https://feuniverse.us/t/fe8-complete-the-sun-gods-wrath-final-release-27-chapters-no-fatigue-100-growth-now-added-5-22-2022/6207). The public adapter stores instructions and authored code; game-derived resources are extracted locally from the user's ROM and are not included in the repository.
