# Companion Builder 1.2.0 — thirty companions at 1.0.0

Released again on **2026-10-31** at the maintainer's request after the shared
30-profile repair. Builder is **1.2.0** and every companion profile is **1.0.0**.
This replaces the withdrawn 2026-10-29 release. The [withdrawn release record](RELEASE-1.2.0-WITHDRAWN.md)
is retained as history; its missing-Analysis table does not describe this build.

The release contains the authored Builder, exact-ROM profiles and source code.
Create the companion locally from your matching ROM using the website, offline
kit or a compatible Plus catalogue flow. Save the game, rebuild, then import and
assign the new ZIP. Already installed packs are not updated silently.

## Changes

- Add fifteen exact-ROM profiles and retain the previous fifteen, all at 1.0.0.
- Replace the ten originally missing Analysis implementations with bounded ROM
  execution on copied RAM; preserve conditional EXP and hypothetical level-up
  semantics, unsupported-path reporting and independent RNG observation.
- Use the existing Plus native D-pad focus route for roster and Map taps. Packs
  use format 2 and do not need game-write permission or an updated Plus APK.
  Normal taps no longer show a status line above the chapter or move the Map.
- Keep static Growth PNGs and show signed live growth bonuses in the left-hand
  rate table, for example `60% (+1%)`; no separate dynamic radar is required.
- Repair unit/context selection, paused continuation, shared Map work and
  invalidation. Hidden Units/Growth views avoid redundant Map geometry work;
  bounded caches preserve the live RAM inputs used to invalidate results.
- Keep skill slots in one row and constrain Pokemblem descriptions to their
  card. Long descriptions have a separate scrolling region.

## New exact-ROM companions

| Companion | Game code | CRC32 | Version |
|---|---|---|---|
| Fire Emblem: Andaron Saga | `BE8E` | `A3B9CD19` | 1.0.0 |
| Bells of Byelen | `BE8E` | `48B996CD` | 1.0.0 |
| Cerulean Crescent | `BE8E` | `DC071CC2` | 1.0.0 |
| Fire Emblem: Dark Lord and the Maiden of Light | `AE7E` | `C99A6D26` | 1.0.0 |
| Fire Emblem: Dream of Five - Definitive Edition | `BE8E` | `B313A6F5` | 1.0.0 |
| Fire Emblem: Eligor's Spear | `BE8E` | `6E5FE3B0` | 1.0.0 |
| Fire Emblem: Iron Emblem | `BE8E` | `141FF3AA` | 1.0.0 |
| Fire Emblem: Justice & Pride | `BE8E` | `AC23B461` | 1.0.0 |
| Pokemblem | `BE8E` | `10BDF112` | 1.0.0 |
| Fire Emblem: The Dark Amulet | `BE8E` | `8537CE2A` | 1.0.0 |
| Fire Emblem: The Four Kings | `BE8E` | `0DDE5BEB` | 1.0.0 |
| Fire Emblem: The Lonely Mirror | `BE8E` | `A74E93C7` | 1.0.0 |
| The Morrow's Golden Country | `BE8E` | `20287E1B` | 1.0.0 |
| Fire Emblem: The Shadow of Dawn | `BE8E` | `EB38F5F7` | 1.0.0 |
| The Sun God’s Wrath | `BE8E` | `566D7A9E` | 1.0.0 |

Other revisions, translations or patches need their own profiles. The full
thirty-profile list is available on the [supported-games page](https://levi-soft.github.io/gba-duo-companion-builder/supported-games.html).

## Verification and remaining limits

The repaired runtime passed **578 automated source tests**, a thirty-pack ZIP,
Lua/layout/asset audit and a thirty-profile binding to the existing native
navigator JVM checks. These checks do not establish all thirty Android flows.

The latest unchanged-APK test used **GBA Duo Plus 0.1.8-plus.4 on AYN Thor** with
**Packs can change games off**, using Dark Lord and the Maiden of Light. Two
native traces checked roster/Map input, actual cursor and camera arrival, no
automatic A confirmation, unchanged unit coordinates/HP/items, and removal of
the chapter status line. The user's current SRAM and native state were preserved
and restored. Earlier modified-host results are historical evidence only.

Known open issues are retained explicitly:

- **25 ms update timeout:** earlier bounded observations still recorded Map and
  Danger timeout episodes. Work reduction is included, but the deadline issue
  remains open. The latest status-line test did not repeat the four 20-second
  health observations, and no sustained frame-time guarantee is made.
- **Storge allies 85–99:** the existing Plus native focus API excludes these
  live green deployment IDs. Use the game D-pad for them; the companion does not
  write RAM to bypass the host limit.
- **Stock GBA Duo v0.1.8:** it lacks `input.focusUnit`. Pack loading and data
  display do not establish native cursor control on that host.
- **ANDROID-BLANK-01:** an earlier stock-host blank-data/unknown-script-error
  observation remains unresolved. A recovery probe did not establish its cause.
- All-thirty physical Android acceptance, complete campaigns, every skill/item,
  mode and device layout remain unverified. The Pokemblem long-description
  layout was viewed, but manual scrolling beyond the visible region was not
  separately accepted. A 1.0.0 version is not a claim of complete feature QA.

The maintainer has requested public release with these known limits. This does
not relabel the earlier private test gate as full Android acceptance. See the
[current repair report](OFFICIAL-30-COMPANION-FIX-2026-10-30.vi.md) and the
[historical modified-host report](FULL-FE-RECHECK-2026-10-30.vi.md).

## Distribution and credits

Download **GBA-Duo-Companion-Builder-1.2.0.zip** and **SHA256SUMS.txt** from this
release. The website and Plus catalogue use the same SHA-256-addressed bundle;
older published bundle paths remain available. Existing Plus and Studio APKs
are unchanged by this release.

The public files contain authored code/UI and licensed resources. ROMs, SRAM,
native states, captures, private device reports, prepared projects, extracted
game assets and ROM-derived Local companion ZIPs are not release attachments.

Thanks to **khumam and the GBA Duo contributors**, **levi-soft**, the original
hack/translation authors and their art, music, writing, map and engine
contributors, FEBuilderGBA, FireEmblemUniverse, Skill System, mGBA/endrift, Lua,
Inter and JSZip. See [complete credits and project sources](../CREDITS.md).
Original notices remain authoritative. Nintendo and Intelligent Systems retain
their respective rights; this is an independent, unofficial tool.
