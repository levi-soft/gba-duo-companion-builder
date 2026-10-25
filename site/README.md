# Fire Emblem Companion Builder 0.9.8

[Tiếng Việt](README.vi.md)

One offline kit for three exact Vietnamese ROMs. English is the default interface language; Vietnamese is available. The kit reads your local ROM, selects its profile by CRC32 and builds a companion ZIP. It uploads nothing and does not modify the ROM.

| Profile | Game code / CRC32 | Companion |
| --- | --- | --- |
| FE6 Vietnamese Remastered, built on FE8 | BE8E / BD53D5F3 | 0.4.18 |
| FE7 Vietnamese | AE7E / 32CD990D | 0.7.17 |
| FE8 Vietnamese | BE8E / 3CD932D7 | 0.6.9 |

Other ROM revisions are rejected. The FE6 profile is not original FE6.

## Build and install

1. Extract the complete kit and open `index.html` in Chrome or Edge.
2. Choose a supported `.gba` file, or a ZIP containing exactly one `.gba`.
3. Select **Build companion** and wait for local preparation.
4. Download the **Local ZIP**. Save your game/state, import the ZIP into GBA Duo Plus, assign it to the same ROM and reopen the game.
5. Optionally download the project JSON and open it in [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio).

No account, network access, paid service, model or emulator installation is needed to build. ROMs must be at most 32 MiB; compressed input is limited to 64 MiB. Keep the complete directory structure when extracting the kit.

## Shared features

Units, Map, Battle Forecast, Growth, RNG indicator and Analysis share one design. Growth opens by touching the portrait. Analysis opens from Battle Forecast. Result states distinguish waiting, calculating, finished and unsupported situations. Computation progress reaches 100% only when calculation completes; it is not a prediction accuracy percentage. Gains use dynamic +N values.

The FE6 profile adds separate Mag, skills, leadership and Talk. FE8 adds native class abilities and Metis Tome growth bonus handling. FE8 scripted tutorial battles follow their separate ROM execution path. The adapters deliberately report unsupported execution instead of inventing results.

Analysis displays conditional damage/kill EXP and hypothetical level-up gains. It does not display the selected fight's hidden hit/miss or actual earned EXP. FE6/FE8 execute ROM routines against frozen private RAM; game memory and RNG are not changed. FE7 uses its separately validated simulation. See [FEATURE-CONTRACT.md](FEATURE-CONTRACT.md) for evidence and limits. Full-game accuracy and all-device visual acceptance are not established.

## Public kit and local output

This kit contains authored UI resources, licensed fonts, readers and code. It contains no ROM, extracted character artwork, game text tables, save or prepared companion. Game-owned text and artwork are decoded only after you supply the exact ROM. The generated Local ZIP/project contains those assets and is intended for your own use, not redistribution.

Images are prepared once and cached in the Local ZIP. Gameplay does not repeatedly decode portraits or sprites. Common layout/CSS lives in `theme.js`; profile extensions add only game-specific controls. Shared compiler source and UI source are included. The kit does not automatically discover layouts for unknown games.

Generated ZIPs use companion APIs available in GBA Duo. Plus is the primary device test target; official-app acceptance of these new profiles remains unverified. Cursor navigation needs emulator support. No APK change is required for this kit update.

[GBA Duo Plus](https://github.com/levi-soft/gba-duo-plus) ? [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio)

## Licensing

The tool license is in `LICENSE`; font, icon and dependency notices are in `THIRD-PARTY` and `JSZIP-LICENSE.md`. Fire Emblem belongs to its respective rights holders. No rights to redistribute game assets or translations are granted by this tool.
