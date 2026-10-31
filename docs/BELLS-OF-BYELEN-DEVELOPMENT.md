# Bells of Byelen companion 1.0.0

Companion **1.0.0** is included in the repaired **Builder 1.2.0** release of 2026-10-31. See [current release changes and known limits](RELEASE-1.2.0.md) and the [unchanged-APK repair scope](OFFICIAL-30-COMPANION-FIX-2026-10-30.vi.md). The older development checks below are historical evidence; they do not establish full Android acceptance.

## Pre-release validation record

Development profile, not a stable release. Builder remains 1.1.5. No APK change is required.

Exact local ROM: `BE8E / 48B996CD`, 25525808 bytes, SHA-256 `a07a97a9afb0ed7afa4917b17f8d2ee74939b2163e274c22639e6c00d6fb3ef4`. Other patches/regions require separate profiles. Wrong code or checksum is rejected before extraction.

## ROM contracts

| Data | ROM offset / CPU entry |
|---|---|
| characters | `803D30` |
| classes | `1114B80` |
| items | `1118F28` |
| portraits | `1000000` |
| sprites | `8AF880` |
| icons | `1766B94` |
| iconPalettes | `5996F4` |
| text | `1003800` |
| chapters | `8B0890` |
| Classes retained | 131 |
| Level caps | `1114AEC` |
| Native skill-list entry | `97D9BD0` |

The table locations are confirmed by native pointer literals and matching record IDs. The skill-list routine executes against private shadow RAM, never the running game. English shared layouts, exact-ROM tables, real portrait/map-sprite/item/skill extraction and native format 2 ZIP packaging are reused.

## Growth and custom mechanics

Seven core growths come from the character record. Mov and Build use the active level-up tables at ROM offsets `181E97C` and `181EA7C`; they are displayed separately below the seven-axis chart. Scroll/accessory modifiers are not applied. This ROM has a rewritten level-up function and must not inherit a retail or standard SkillSystem fixed-growth flag.

The active custom level-up prechecks the class stat ceilings before generating gains. Luck is 20 in this exact ROM. Separate bounded calls to maintenance and battle-cap routines are not treated as proof of the entire custom level-up flow.

The native EXP comparison adds 20 when the combined character/class promoted attribute is set. This effective EXP level is separate from the visible level.

## Verification and limits

A private build through the real site builder produced the companion ZIP and editable JSON. Fresh private mGBA/romdev opening-map RAM was captured and compared with the generated Lua. Native skill lists and Units/Growth/Map updates were exercised on that capture. A separate native empty-cursor capture also cleared unit details. Additional multi-unit cursor selection and invalid-position fixtures use copies of captured RAM; those transitions are not new in-game observations. Inputs/captures and generated resources remain in the private workspace.

Native EXP/level-up prediction is explicitly unavailable in 0.1.0; this avoids presenting stock predictions for unverified custom mechanics. Live forecast fields remain available, but inherited derived combat/range formulas do not establish every custom skill, PCC or move interaction.

PCC, fatigue, movement/leadership stars, dismount, equipped accessory calculations and custom support bonuses are not implemented. Retail affinity/support bonus cards are suppressed. Tactical ranges only include base movement and weapon data.

This does not establish a full campaign, every game mode, every skill/item combination, physical Android rendering, or physical Thor input. No public release or version promotion is part of this development step.

## Credits

Game artwork, writing, music and engine modifications belong to the hack's creators and credited contributors. See [the author's project](https://feuniverse.us/t/fe8-complete-bells-of-byelen-24-chapters/17648) and [author buildfiles](https://github.com/legendofloog/Teleshack-II). The public adapter stores instructions and authored code; game-derived resources are extracted locally from the user's ROM and are not included in the repository.
