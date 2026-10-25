# Companion Builder 1.1.0 — ten profiles, companions 1.0.0

This release adds seven English profiles to the public website and Plus automatic
creation. FE7 US, FE8 Europe, FE8 US, FE6 T-EN, Project Ember, Project Ember Reverse
Recruitment and Void's Blitzarre Adventure are finalized as companion **1.0.0**
at the maintainer's request. The three Vietnamese companions retain **1.0.0**.
The separate builder advances to **1.1.0** because the public profile set expands
from three to ten. Existing builder releases and tags remain immutable.

## Shared features

- Exact game-code/CRC32 selection; local ROM text/art extraction, ZIP generation
  and the same build core for the website and Plus. No ROM is uploaded or changed.
- Inherited English UI, Growth and conditional Battle Analysis for English games.
- Preparations unit selection, including benched units, stat-screen priority and
  invalid-selection clearing. Actual device coverage differs between profiles.
- Analysis/Growth close when Forecast ends, including the transition caused by B.
- Map names and chapter labels, including FE6 graphical chapter-title metadata.
- Pack-owned cursor metadata for Plus 0.1.7-plus.4. Legacy hosts retain their
  existing exact-ROM profiles but may not navigate newer hacks.
- Void's six skill slots, ROM-derived descriptions/icons and Talk badge/detail.
  Talk checks direction, event flags and target presence against its native getter.
- FE8 map work shares terrain/occupancy reads and avoids per-cell lookup allocation.

## Scope and validation

The release gate includes 81 automated builder tests and end-to-end production
builds from the generated distribution for all ten exact local ROMs. The public
registry, website dependencies and Plus runner declare the same profiles. Earlier
development evidence is retained in each profile's development document.

The production builds also caught and fixed an identity-ordering issue in generic
Vietnamese templates: the core now binds the verified ROM identity before
preparation installs cursor metadata. Shared source templates remain unmodified.

Captured old/new runtime outputs of the nine pre-Void profiles are identical on
their regression fixtures. Void has 336 native Lua replay updates, 750 additional
updates on the reported flicker state, nine host-render scenarios, and native
Talk-getter parity on captured units and a chapter-1 positive fixture. The user
confirmed that continuous flicker stopped after reimporting the optimized pack.
Live monitoring still observed two isolated timeout ticks in 134 snapshots; Plus
0.1.7-plus.4 therefore retains the last complete view on failed ticks, marks it
stale and preserves error diagnostics. Limits are unchanged.

This version finalization is not a claim of complete-game prediction accuracy.
Battle Analysis is conditional and does not predict whether an attack hits,
misses or crits. More weapons, skills, difficulty modes and natural level-ups need
coverage. Preparations coverage includes synthetic RAM fixtures; it does not mean
every profile's live Pick Units screen has been accepted.

**Void Map range overlays use base movement and weapon ranges. Range-changing
skills, movement rallies and skill-specific terrain effects are not included.**
Its UI base-stat card does not claim every temporary skill modifier. Forecast
combat values come from native battle data. These limits also appear in its pack
and profile documentation. Other exact patches require their own verification.

## Distribution and credits

Share the website, source or authored Builder bundle. Generated Local ZIPs and
projects contain assets from the user's ROM and stay private; no ROM-derived
pack is attached to the GitHub release.

Thank you to **khumam and the GBA Duo contributors** for the original application,
dual-screen companion concept, format and runtime. GBA Duo Plus and Studio are
independent extensions maintained by **levi-soft**.
Thanks to FireEmblemUniverse/fireemblem6j, FEBuilderGBA, Project Ember contributors,
the FEU Chapter Creation Blitz/Void and Skill System contributors, translation
authors, mGBA/endrift, Lua, Inter and JSZip authors. Original notices are retained;
see [complete credits](../CREDITS.md). Nintendo and Intelligent Systems retain
their rights to Fire Emblem. This project is independent and not endorsed.
