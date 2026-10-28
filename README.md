# Fire Emblem Companion Builder 1.1.5

The **2026-10-28 authoring update** keeps version **1.1.5**. An optional custom
project flow can package an edited Studio project, preserve its reader/interface
or create a card/stat table from existing reader fields, and show reference
diagnostics before building. See the
[update notes](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/AUTHORING-UPDATE-2026-10-28.md).

## Builder 1.1.5 — fifteen companions at 1.0.0

This release finalizes **Storge, The Hag in White, Sacred Echoes, Vision Quest and The Last Promise** at companion **1.0.0**, alongside the ten existing profiles. All five inherit the English UI with Units, Map, Talk, Growth and conditional Battle Analysis.

- **Storge:** extended class tables, compact-font text and chapter Talk events.
- **The Hag in White:** separate Str/Mag, eight-stat Growth/Analysis, native skills and bounded Analysis work.
- **Sacred Echoes:** native equipment, spells/ranges, HP spell costs, two-AS doubling, mode-aware growths and eight engine weapon categories.
- **Vision Quest:** six native skill slots, Talk and ROM chapter labels, including side chapters.
- **The Last Promise:** relocated FE7 tables, Talk, Preparations and class-specific level caps of 20 or 30.

Builder **1.1.5** is explicitly finalized for this batch. Companion versions remain independent; adding or fixing a companion does not automatically increment Builder. See [release scope, verification and remaining limits](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/RELEASE-1.1.5.md).

| Profile | Game code | CRC32 | Companion |
|---|---|---|---|
| FE7 Vietnamese | `AE7E` | `32CD990D` | 1.0.0 |
| FE6 Vietnamese | `BE8E` | `BD53D5F3` | 1.0.0 |
| FE8 Vietnamese | `BE8E` | `3CD932D7` | 1.0.0 |
| FE7 English | `AE7E` | `2A524221` | 1.0.0 |
| FE8 Europe | `BE8P` | `B3005195` | 1.0.0 |
| FE8 English - USA/Australia | `BE8E` | `A47246AE` | 1.0.0 |
| FE6 T-EN | `AFEJ` | `197DE10B` | 1.0.0 |
| Project Ember | `AFEJ` | `636F7B05` | 1.0.0 |
| Project Ember Reverse Recruitment | `AFEJ` | `29BC2257` | 1.0.0 |
| Void's Blitzarre Adventure | `BE8E` | `9D22107C` | 1.0.0 |
| Fire Emblem: Storge | `BE8E` | `079106D8` | 1.0.0 |
| The Hag in White | `BE8E` | `7479D7E2` | 1.0.0 |
| Fire Emblem: Sacred Echoes | `BE8E` | `13F15F23` | 1.0.0 |
| Fire Emblem: Vision Quest | `BE8E` | `2BCFEC83` | 1.0.0 |
| Fire Emblem: The Last Promise | `AE7E` | `D1C6E5D5` | 1.0.0 |

FE6 T-EN is original FE6; Vietnamese Remastered is an FE8-based hack. Other ROM revisions and patches need independent profiles. English profiles use English Growth/Analysis and shared UI. Void includes six skill slots and Talk; its Map range overlays still use base movement/weapon ranges and do not include range-changing skills. See [release scope and validation](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/RELEASE-1.1.5.md).

## Build and install

1. Extract the complete kit and open `index.html` in Chrome or Edge.
2. Choose a supported `.gba` file, or a ZIP containing exactly one `.gba`.
3. Select **Build companion** and wait for local preparation.
4. Download the **Local ZIP**. Save your game/state, import the ZIP into GBA Duo Plus, assign it to the same ROM and reopen the game.
5. Optionally download the project JSON and open it in [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio).

No account, network access, paid service, model or emulator installation is needed to build. ROMs must be at most 32 MiB; compressed input is limited to 64 MiB. Keep the complete directory structure when extracting the kit.

For an edited companion or another game with an existing reader, expand
**For custom companions**, choose **Use my Studio project**, and select its
`.gbastudio.json` alongside the exact matching ROM. Keep the Studio interface
or configure a reader-based template, review the input checks, then build and
import the ZIP. This does not create a reader for an unknown game. See the
[Vietnamese workflow](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/custom-projects.vi.md).

## Shared features

Units, Map, Battle Forecast, Growth, RNG indicator and Analysis share one design. Growth opens by touching the portrait. Analysis opens from Battle Forecast. Result states distinguish waiting, calculating, finished and unsupported situations. Computation progress reaches 100% only when calculation completes; it is not a prediction accuracy percentage. Gains use dynamic +N values.

The FE6 profile adds separate Mag, skills, leadership and Talk. FE8 adds native class abilities and Metis Tome growth bonus handling. FE8 scripted tutorial battles follow their separate ROM execution path. The adapters deliberately report unsupported execution instead of inventing results.

Analysis displays conditional damage/kill EXP and hypothetical level-up gains. It does not display the selected fight's hidden hit/miss or actual earned EXP. FE6/FE8 execute ROM routines against frozen private RAM; game memory and RNG are not changed. FE7 uses its separately validated simulation. See [FEATURE-CONTRACT.md](FEATURE-CONTRACT.md) for evidence and limits. Full-game accuracy and all-device visual acceptance are not established.

## Public kit and local output

This kit contains authored UI resources, licensed fonts, readers and code. It contains no ROM, extracted character artwork, game text tables, save or prepared companion. Game-owned text and artwork are decoded only after you supply the exact ROM. The generated Local ZIP/project contains those assets and is intended for your own use, not redistribution.

Images are prepared once and cached in the Local ZIP. Gameplay does not repeatedly decode portraits or sprites. Common layout/CSS lives in `theme.js`; profile extensions add only game-specific controls. Shared compiler source and UI source are included. The kit does not automatically discover layouts for unknown games.

Generated ZIPs use companion APIs available in GBA Duo. Plus is the primary device test target; official-app acceptance of these new profiles remains unverified. Cursor navigation needs emulator support. Pack-owned cursor navigation requires GBA Duo Plus 0.1.7-plus.4 or newer; older hosts may recognize only some legacy ROMs.

[GBA Duo Plus](https://github.com/levi-soft/gba-duo-plus) ? [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio)

## Licensing

The tool license is in `LICENSE`; font, icon and dependency notices are in `THIRD-PARTY` and `JSZIP-LICENSE.md`. Fire Emblem belongs to its respective rights holders. No rights to redistribute game assets or translations are granted by this tool.
