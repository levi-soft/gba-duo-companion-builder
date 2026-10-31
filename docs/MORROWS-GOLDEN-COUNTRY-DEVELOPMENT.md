# The Morrow's Golden Country companion 1.0.0

Companion **1.0.0** is included in the repaired **Builder 1.2.0** release of 2026-10-31. See [current release changes and known limits](RELEASE-1.2.0.md) and the [unchanged-APK repair scope](OFFICIAL-30-COMPANION-FIX-2026-10-30.vi.md). The older development checks below are historical evidence; they do not establish full Android acceptance.

## Pre-release validation record

Development profile, not a stable release. Builder remains 1.1.5. No APK change is required.

Exact local ROM: `BE8E / 20287E1B`, 28710960 bytes, SHA-256 `e9d4b88d3bcbf8e41f1feb93416e35995c540bd195813bad207223e2502a8838`. Other patches/regions require separate profiles. Wrong code or checksum is rejected before extraction.

## ROM contracts

| Data | ROM offset / CPU entry |
|---|---|
| characters | `803D30` |
| classes | `807110` |
| items | `17A5990` |
| portraits | `CBA3FC` |
| sprites | `8AF880` |
| icons | `E5BE5C` |
| iconPalettes | `5996F4` |
| text | `B2A610` |
| chapters | `8B0890` |
| Classes retained | 127 |
| Level caps | `17A4504` |
| Native skill-list entry | `97BECE4` |

The table locations are confirmed by native pointer literals and matching record IDs. The skill-list routine executes against private shadow RAM, never the running game. English shared layouts, exact-ROM tables, real portrait/map-sprite/item/skill extraction and native format 2 ZIP packaging are reused.

## Growth and custom mechanics

Separate Str/Mag are read from the native unit record. Base Mag growth and class Mag cap are traced to `17A4584` and `17A4784`. Active native growth getters disable the class-growth addition. The profile overrides the legacy FE6-specific cap address and uses this ROM's own cap table.

Native level-up execution confirms the player HP ceiling is 80, including classes whose record HP byte differs. The red-faction maintenance/battle clamp is 120; this does not make enemy units eligible for EXP. Other core caps use class records, separate Mag data and Luck 30.

The native EXP comparison adds 20 when the combined character/class promoted attribute is set. This effective EXP level is separate from the visible level.

RAM-backed character names use bounded 16-byte EWRAM recipes. They refresh before Units, Map, Growth, Forecast and support readers; blank RAM uses the neutral Avatar fallback. Synthetic rename fixtures verify refresh and clearing; this does not establish that every such character is selectable in the opening map.

## Verification and limits

A private build through the real site builder produced the companion ZIP and editable JSON. Fresh private mGBA/romdev opening-map RAM was captured and compared with the generated Lua. Native skill lists and Units/Growth/Map updates were exercised on that capture. A separate native empty-cursor capture also cleared unit details. Additional multi-unit cursor selection and invalid-position fixtures use copies of captured RAM; those transitions are not new in-game observations. Inputs/captures and generated resources remain in the private workspace.

Native EXP/level-up prediction is explicitly unavailable in 0.1.0; this avoids presenting stock predictions for unverified custom mechanics. Live forecast fields remain available, but inherited derived combat/range formulas do not establish every custom skill, PCC or move interaction.

Combat arts, free movement, staff/convoy reworks, personalized support bonuses and growth settings need further mode-specific checks. Base movement/weapon range overlays exclude range-changing skills. Public current symbols are reference material; pointers were independently matched to this exact ROM.

This does not establish a full campaign, every game mode, every skill/item combination, physical Android rendering, or physical Thor input. No public release or version promotion is part of this development step.

## Credits

Game artwork, writing, music and engine modifications belong to the hack's creators and credited contributors. See [the author's project](https://feuniverse.us/t/fe8-fire-emblem-the-morrows-golden-country-complete/16284) and [author buildfiles](https://github.com/Retina1/TMGC_Buildfiles). The public adapter stores instructions and authored code; game-derived resources are extracted locally from the user's ROM and are not included in the repository.
