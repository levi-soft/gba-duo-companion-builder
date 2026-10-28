# Companion Builder 1.1.5 — fifteen companions at 1.0.0

For the later same-version Studio/custom-project improvements, see the
[2026-10-28 authoring update](AUTHORING-UPDATE-2026-10-28.md). The profile-release
validation below describes the original 2026-10-26 batch.

Builder 1.1.5 adds five finalized English profiles to the website, offline kit and
GBA Duo Plus automatic companion catalogue. All fifteen companions are now
version 1.0.0. The ten previously published exact ROM identities remain supported.
This is an explicitly approved release batch; future profile additions and fixes
do not automatically increment the Builder version.

## New companions

| Companion | Game code | CRC32 | Version | Profile features |
|---|---|---|---|---|
| Storge | `BE8E` | `079106D8` | 1.0.0 | English UI, extended classes, compact-font text, Talk |
| The Hag in White | `BE8E` | `7479D7E2` | 1.0.0 | Separate Str/Mag, eight-stat Growth/Analysis, native skills, Talk |
| Sacred Echoes | `BE8E` | `13F15F23` | 1.0.0 | Native equipment/spells, HP spell costs, two-AS doubling, growth modes, Talk, eight engine weapon categories |
| Vision Quest | `BE8E` | `2BCFEC83` | 1.0.0 | Six native skill slots, Talk, ROM chapter labels and side-chapter prefixes |
| The Last Promise | `AE7E` | `D1C6E5D5` | 1.0.0 | Relocated FE7 tables, Talk, Preparations, class-specific level caps of 20/30 |

All five inherit the existing English Units, Map, Forecast, Growth and conditional
Analysis UI. Map navigation is described by the pack-owned cursor contract;
it requires GBA Duo Plus 0.1.7-plus.4 or newer. No APK change is part of this release.
Other patches, translations or ROM revisions require their own exact profiles.

## Shared fixes and organization

- Shared FE8 battle, equipment and map readers are reusable modules, with native
  query/skill and base/split-growth helpers. Profile entry points retain their own
  addresses and rules rather than expanding a monolithic shared script.
- Analysis work is split into bounded updates. Errors, pending work and unsupported
  paths remain visible instead of blocking an update indefinitely.
- Talk uses chapter event conditions and flags. The English sprite/detail extension
  preserves the existing common Growth/Analysis widgets.
- Growth and EXP readers respect profile modes and class level caps. The Last
  Promise's mounted Aid follows its native FE7 getter.
- The RNG indicator follows actual seed changes. Sacred Echoes deliberately removes
  movement-arrow RNG consumption; the companion does not invent changes when the
  game's seed remains unchanged.
- Website assets use content fingerprints; Plus receives the same compiler,
  preparers and runtime in an immutable SHA-256-addressed Builder bundle.

## Verification and limits

The release gate passed all **99 automated tests** and end-to-end builds for all
**five new exact ROMs from the generated 1.1.5 distribution bundle**. All 129
published tool files were compared byte-for-byte with that verified bundle;
catalogue versions, ZIP structure and SHA-256 checks passed. Prepared packs and
their build provenance are retained privately.

The release is finalized by the maintainer. Version 1.0.0 does not mean every
chapter, weapon, skill, growth mode or physical input path has been tested.
Per-profile development reports retain the live captures, native routine comparisons,
Preparations fixtures, read-only Lua harness results and Android host render scope:

- [Storge](STORGE-DEVELOPMENT.md)
- [The Hag in White](HAG-IN-WHITE-DEVELOPMENT.md)
- [Sacred Echoes](SACRED-ECHOES-DEVELOPMENT.md)
- [Vision Quest](VISION-QUEST-DEVELOPMENT.md)
- [The Last Promise](THE-LAST-PROMISE-DEVELOPMENT.md)

Battle Analysis reports conditional damage/defeat EXP and hypothetical level-up
gains, rather than predicting the selected attack's hidden hit/miss/critical result.
Native queries execute on private copied RAM and do not advance the running game's
RNG. Map overlays use base movement/weapon ranges and do not promise all skill,
terrain or temporary modifier effects. Some Preparations coverage is fixture-based;
complete-campaign accuracy and official-app acceptance remain unverified.

## Install and distribution

Build from the exact supported ROM on the website or use a compatible Plus release's
**Find and create companion** action. Existing installed packs are not silently
rewritten: rebuild, save the game, then import/assign the new ZIP and reopen it.

Share the source, website or authored Builder bundle. No ROM-derived Local ZIP,
project, save, snapshot, extracted portrait or text table is attached to this release.

## Credits

Thank you to **khumam and the GBA Duo contributors** for the original emulator,
dual-screen companion concept, format and runtime. GBA Duo Plus and Studio are
independent extensions maintained by **levi-soft**.

The new profiles credit **knabepicer and the Storge contributors**, **SaintRubenio
and The Hag in White contributors**, **HyperGammaSpaces and the Sacred Echoes
contributors**, **Pandan and friends / Pushwall for Vision Quest**, and **Blazer
and The Last Promise contributors**. Their full original hack, art, music, writing,
map and engine contributor lists remain authoritative; see [complete credits](../CREDITS.md).

Thanks also to FEBuilderGBA, FireEmblemUniverse, Skill System, translation authors,
mGBA/endrift, Lua, Inter and JSZip contributors. Original notices are retained.
Nintendo and Intelligent Systems retain their rights to Fire Emblem. This is an
independent tool and is not an official or endorsed product.
