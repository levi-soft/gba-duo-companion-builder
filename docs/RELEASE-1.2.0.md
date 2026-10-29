# Companion Builder 1.2.0 — thirty companions at 1.0.0

Builder 1.2.0 adds fifteen exact-ROM companions to the website, offline kit and
GBA Duo Plus catalogue. All thirty companion profiles are version **1.0.0**.
The maintainer explicitly finalized this release after the development audits.
The previous fifteen templates, readers and exact ROM identities remain unchanged.

## New companions

| Companion | Game code / CRC32 | Version | Analysis |
|---|---|---|---|
| Fire Emblem: Andaron Saga | `BE8E / A3B9CD19` | 1.0.0 | Unavailable |
| Bells of Byelen | `BE8E / 48B996CD` | 1.0.0 | Unavailable |
| Cerulean Crescent | `BE8E / DC071CC2` | 1.0.0 | Unavailable |
| Fire Emblem: Dark Lord and the Maiden of Light | `AE7E / C99A6D26` | 1.0.0 | Conditional-tested |
| Fire Emblem: Dream of Five - Definitive Edition | `BE8E / B313A6F5` | 1.0.0 | Conditional-tested |
| Fire Emblem: Eligor's Spear | `BE8E / 6E5FE3B0` | 1.0.0 | Conditional-tested |
| Fire Emblem: Iron Emblem | `BE8E / 141FF3AA` | 1.0.0 | Conditional-tested |
| Fire Emblem: Justice & Pride | `BE8E / AC23B461` | 1.0.0 | Unavailable |
| Pokemblem | `BE8E / 10BDF112` | 1.0.0 | Unavailable |
| Fire Emblem: The Dark Amulet | `BE8E / 8537CE2A` | 1.0.0 | Unavailable |
| Fire Emblem: The Four Kings | `BE8E / 0DDE5BEB` | 1.0.0 | Unavailable |
| Fire Emblem: The Lonely Mirror | `BE8E / A74E93C7` | 1.0.0 | Conditional-tested |
| The Morrow's Golden Country | `BE8E / 20287E1B` | 1.0.0 | Unavailable |
| Fire Emblem: The Shadow of Dawn | `BE8E / EB38F5F7` | 1.0.0 | Unavailable |
| The Sun God’s Wrath | `BE8E / 566D7A9E` | 1.0.0 | Unavailable |

Other revisions, translations and patches require their own profiles. The web
Builder and Plus use the same compiler, preparers and authored runtime. Existing
installed packs are not silently replaced: rebuild from the matching ROM, save
the game, import/assign the new ZIP and reopen the companion.

## Changes

- Follow the game-owned unit pointer when R opens the native stat screen and
  Down changes the viewed unit. Closing with B returns to the actual Map cursor.
  Preparations retains its player-only selection rules. Pokemblem uses its
  separate party/free-movement reader.
- Keep RNG observation independent of unit/Map/Growth changes and prediction
  support. Record a new reference when Analysis opens; do not modify the seed.
- Preserve Map pick invalidation when Dark Lord refreshes a unit's inventory.
  Pokemblem's Map uses the current species name while retaining deployment IDs.
- Handle ROM-specific split Str/Mag, class/cap/skill tables, avatar names,
  affinity/support data, Leadership and Growth cardinality. Pokemblem displays
  its five stored moves and separates held-accessory flags from remaining uses.
- Keep conditional EXP/level-up Analysis enabled only in the five verified
  paths below. Unsupported paths explain their gate rather than showing a
  fabricated or stale result.
- Add Windows/Linux Node 22/24 verification for the public Builder source.

## Verification

The functional candidate was audited with **193 Builder tests**, **69 Android
host tests**, **211 visible units / 14,733 raw-field comparisons**, **241 reachable
widget callbacks**, **15 Studio import/export/reimport cycles**, and **2,780
standalone native Lua updates on Thor**. Native stat-screen selection was checked
in fourteen ROMs, including real R/Down/B input and return to Map. Existing Map
navigation evidence covers 29 arrivals and fourteen selection/preview locks.

The version finalization changes release metadata, not the audited runtime logic.
The release gate rebuilds all fifteen new companions from the final public
Builder bundle, checks their exact identities/ZIP hashes and compares their Lua,
layout, assets and native cursor contracts with the audited candidate. Generated
projects, captures, device logs and game-derived assets stay in the private
verification workspace. This public repository contains the authored code,
metadata, synthetic tests and validation reports.

## Retained limits

- **Conditional Analysis:** Iron Emblem, The Lonely Mirror, Dream of Five,
  Dark Lord and the Maiden of Light, and Eligor's Spear. This models conditional
  damage/defeat EXP and hypothetical level-up gains, rather than promising the
  hidden hit/miss/critical outcome of every battle.
- **Analysis unavailable:** Andaron Saga, Bells of Byelen, Cerulean Crescent,
  Justice and Pride, Pokemblem, The Dark Amulet, The Four Kings, Morrow's Golden
  Country, Shadow of Dawn and Sun God's Wrath. Their UI reports the limitation.
- Pokemblem supports companion-only selection and stored moves. Game-cursor
  control and move-based movement/attack/threat overlays remain disabled.
- Map overlays use base movement/weapon data. Custom skills, temporary modifiers
  and alternate growth modes may require further game-specific work. Growth
  notes identify base rates and excluded modifiers.
- Host renderer tests, mGBA input, frozen-RAM replay and standalone Lua on Thor
  are distinct checks. Complete campaigns, every skill/item/mode, and physical
  companion-app input/UI acceptance for all fifteen games remain unverified.

Version 1.0.0 records the maintainer's finalized release; it does not remove these
limits. See [the detailed batch report](FE-EXPANSION-2026-10-29.vi.md) and each
profile's linked validation history for the exact supported ROM and scope.

## Distribution and credits

The GitHub download is **GBA-Duo-Companion-Builder-1.2.0.zip**, with SHA-256 checksums.
The website retains previous content-addressed bundles so cached Plus versions
can continue to use them. No APK or Studio release is required by this batch.

The public release contains the Builder and profiles that extract images/text
locally from the user's own ROM. ROMs, saves, snapshots, prepared projects and
ROM-derived Local ZIPs are not release attachments.

Thanks to **khumam and the GBA Duo contributors**, **levi-soft**, the original
hack authors and their art/music/writing/engine contributors, FEBuilderGBA,
FireEmblemUniverse, Skill System, mGBA/endrift, Lua, Inter and JSZip contributors.
See [complete credits and project sources](../CREDITS.md). Original notices remain
authoritative. Nintendo and Intelligent Systems retain their respective rights;
this independent tool is not an official or endorsed product.
