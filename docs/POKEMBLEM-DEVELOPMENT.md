# Pokemblem companion 1.0.0

Released at **1.0.0** with **Builder 1.2.0**, as explicitly finalized by the maintainer. See [release notes](RELEASE-1.2.0.md) for current scope and retained limitations.

## Pre-release validation record

Development profile, not a stable release. Builder remains 1.1.5. No APK change is required.

Exact local ROM: `BE8E / 10BDF112`, 30367372 bytes, SHA-256 `408ac8f99ba9cd0b87f9b27b75bdb9bd03413eca357b04d5ed9161564d407c3c`. Other patches/regions require separate profiles. Wrong code or checksum is rejected before extraction.

## ROM contracts

| Data | ROM offset / CPU entry |
|---|---|
| characters | `803D30` |
| classes | `13098AC` |
| items | `1314CDC` |
| portraits | `118FC60` |
| sprites | `139163C` |
| icons | `12ACCFC` |
| iconPalettes | `5996F4` |
| text | `B2A73C` |
| chapters | `13043DC` |
| Classes retained | 254 |
| Level caps | `13093B0` |
| Native skill-list entry | `964CF40` |

The table locations are confirmed by native pointer literals and matching record IDs. The skill-list routine executes against private shadow RAM, never the running game. English shared layouts, exact-ROM tables, real portrait/map-sprite/item/skill extraction and native format 2 ZIP packaging are reused.

## Growth and custom mechanics

All eight active growth getters add character and class/species growths. The builder prepares 1,634 deduplicated complete vectors for the possible character/species combinations. Charts use the same accepted eight-axis design at 240x247 pixels so ZIP and raw files remain bounded and the editable JSON stays below Builder's 64MiB source-input limit for roundtripping through its website. Studio itself accepts larger ZIPs. The Mag character/class tables are `130F154` and `130F354`. The class-cap table contains 100, but this does not establish the current gym-dependent EXP cap.

HP and core stat caps use the native species records. Mag cap reads the class split table, while Luck cap reads the separate species cap table at ROM 13094B0, field +3. These are base caps; optional cap randomization and modifiers are not included.

Five native move IDs at unit offsets 28..2C replace the inherited FE weapon-rank bars. Buttons show locally extracted move names, base stats and descriptions in the existing detail pane. The exact native move reader reaches these bytes with its move mode enabled; they are not interpreted as weapon experience.

The author's custom font markers `[PI]`/`[SI]` (UTF-8 U+18BB/U+18BC) are rendered as `Physical:`/`Special:`. The exact ROM has 132 affected description text IDs. Ordinary accented letters and compact species letters are preserved by this profile-only decoder.

Held accessories use item bit 15 as an equipped flag. That flag is excluded from the displayed uses count, so a held Berry encoded as 8A6C displays 10/10 and an H badge. Accessory item encoding and the ordinary-item control are tested independently of game writes.

## Verification and limits

A private build through the real site builder produced the companion ZIP and editable JSON. Fresh private mGBA/romdev opening-map RAM was captured and compared with the generated Lua. Native skill lists and Units/Growth/Map updates were exercised on that capture. Additional cursor selection/empty-state fixtures use copies of captured RAM; they are not new in-game observations. Inputs/captures and generated resources remain in the private workspace.

Native EXP/level-up prediction is explicitly unavailable in 0.1.0; this avoids presenting stock predictions for unverified custom mechanics. Live forecast fields remain available, but inherited derived combat/range formulas do not establish every custom skill, PCC or move interaction.

Full learnable-move lists, capture, held-item effects, gym-specific EXP restrictions and alternate growth settings are not implemented. The five currently stored moves are displayed. Species names are decoded from compact UTF-8 modifier/small-cap letters. Storage names P-01 etc are not shown as species. Native battle/preparation selections take priority; outside those modes, a valid companion-map selection can select the displayed unit without moving the game cursor. When the avatar is selected, the first visible party creature is shown. Game cursor input is disabled for this profile until its free-movement and battle gates are verified.

This does not establish a full campaign, every game mode, every skill/item combination, physical Android rendering, or physical Thor input. No public release or version promotion is part of this development step.

The editable JSON remains below Builder's 64MiB input limit. All 1,634 combined growth images are 240x247. Exact final byte counts and SHA-256 hashes are recorded with the private delivery; retaining UI icons and fallback charts is included in those measurements.

## Credits

Game artwork, writing, music and engine modifications belong to the hack's creators and credited contributors. See [the author's project](https://feuniverse.us/t/pokemblem-complete-v1-24/8875) and [author buildfiles](https://github.com/Veslyquix/Pokemblem). The public adapter stores instructions and authored code; game-derived resources are extracted locally from the user's ROM and are not included in the repository.
