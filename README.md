# GBA Duo Companion Builder

**Builder 1.2.0** adds fifteen released companions, bringing the catalogue to **30 profiles at companion 1.0.0**. The new batch includes stat-screen unit tracking, RNG/Map selection fixes and ROM-specific readers. The previous fifteen readers are unchanged. See the [release notes and exact-ROM list](docs/RELEASE-1.2.0.md) for the ten gated Analysis paths, Pokemblem limits and validation scope.

[Tiếng Việt](README.vi.md)

Create a companion from a supported ROM on your own device. The website builds a ZIP for manual import; GBA Duo Plus can use the same builder bundle to create, install and assign the companion inside the emulator.

**Website:** [levi-soft.github.io/gba-duo-companion-builder](https://levi-soft.github.io/gba-duo-companion-builder/)

**Emulator downloads:** [GBA Duo Plus](https://levi-soft.github.io/gba-duo-plus/) ·
[GBA Duo Plus SS for phones, tablets and foldables](https://levi-soft.github.io/gba-duo-plus/single-screen/)

This project is maintained by [levi-soft](https://github.com/levi-soft). Automatic discovery/build/install is a **GBA Duo Plus extension**, not an official GBA Duo feature. The standard manual ZIP workflow remains available. If official GBA Duo later provides the complete feature, Plus can replace its provider integration while preserving this public catalog and pack format.

## Previous release: Builder 1.1.5 — fifteen companions at 1.0.0

The **2026-10-28 authoring update** keeps Builder **1.1.5** and all companion
versions. It adds exact-ROM packaging for edited Studio projects, selectable
reader-based templates and shared reference diagnostics. See the
[update notes and verification scope](docs/AUTHORING-UPDATE-2026-10-28.md).

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

## Use the website

Have an edited Studio project or a companion for another game? The optional
**Use my Studio project** flow packages it against its exact local ROM without
adding a curated profile. See [custom projects and author API](docs/custom-projects.md)
for requirements and generation limits.

That flow can also keep your Studio interface or create a character card,
stat table, or both from your existing reader fields. Labels can be entered
in Vietnamese; missing or incompatible choices block packaging. It does not
create a reader for an unknown game. See the [Vietnamese workflow](docs/custom-projects.vi.md).

Authors can also reuse [character-card and stat-table constructors](docs/function-blocks.md)
with their own reader fields, independently of the curated game profiles.

The separate [Supported games page](https://levi-soft.github.io/gba-duo-companion-builder/supported-games.html)
lists the profiles, companion versions and exact ROM details in English or Vietnamese.
It reads the same `site/profiles.js` registry as the builder, so adding a profile
also updates the list without editing the ROM-selection screen.

1. Open the website in a current Chrome or Edge browser.
2. Choose English or Vietnamese, then select your `.gba` file or a ZIP containing exactly one `.gba`.
3. Select **Build companion** and wait for local generation.
4. Download the Local ZIP, save your game/state, then import and assign the ZIP in GBA Duo Plus. The optional project JSON opens in [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio).

The website downloads its HTML, JavaScript and authored UI resources. ROM processing happens locally: ROM bytes, extracted artwork and game text are not uploaded. The ROM itself is not changed. Generated files contain assets from your ROM and should remain private; share this builder website instead.

### Website-only updates

Run `npm run build:site` and `npm test` for public metadata, static supported-game
content and navigation changes. This does not rebuild the verified offline ZIP or
change `catalog.json`. Publish only the changed website files to `gh-pages`, keeping
the existing catalog and immutable release artifacts. The normal `npm run build`
also refreshes this content when preparing a complete Builder distribution.

[Google Search Console setup in Vietnamese](https://github.com/levi-soft/gba-duo-plus/blob/main/docs/SEARCH-CONSOLE.vi.md)
explains ownership verification, sitemaps and indexing requests for both websites.

## Preparations fix in 0.9.8

All three companions now follow the selected unit in the Preparations roster,
Items and stat screens, including units not deployed yet. The shared reader is
kept in an authored Lua module with per-profile addresses. Rebuild/import your
companion to receive the fix; existing installed packs are not changed silently.
See [validation and limits](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/site/FEATURE-CONTRACT.md).

## Item-description fix in 0.9.9

Long item descriptions keep their natural line height and scroll inside the shared
information panel instead of being compressed or clipped. Rebuild/import your
companion to receive the updated layout. No Plus APK update is required.

## Supported ROMs

The fifteen exact identities are listed above and on the [supported-games page](https://levi-soft.github.io/gba-duo-companion-builder/supported-games.html). Other ROM revisions require their own profile.

## GBA Duo Plus integration

The public [catalog](https://levi-soft.github.io/gba-duo-companion-builder/catalog.json) declares exact ROM matches and a versioned offline builder bundle with its size and SHA-256. A compatible Plus version downloads that bundle, checks it, serves the ROM through a private local route and installs the generated ZIP through its local companion flow. Manual import remains separate; automatic creation must not silently replace the user's chosen custom pack.

The browser and Plus use **the same `builder-core.js`, preparation profiles, UI resources, compiler and ZIP writer**. Plus receives only a builder recipe and authored UI code from GitHub. It obtains game artwork/text from the user's ROM locally. Once cached, the companion can run without an internet connection. Integration requires a Plus version implementing [runner protocol 1](docs/PLUS-PROTOCOL.md); older releases can still use manual import.

## Build and test

Requires Node.js 20 or newer. `npm ci` installs the pinned development-only Lua test engine. It is not shipped to the website or Plus.

```sh
npm ci
npm run build
npm test
```

`site/` is the static website. The build generates `site/catalog.json` and a content-addressed `site/releases/builder-1.2.0-<sha256>.zip` deterministically from the files in `site/`. It does not read a ROM, regenerate the private companion projects or change the frozen 0.9.6 kit source.

Tests cover catalog hashes and exact profile identities, local-only assets, empty public game-data templates, shared generation, actual format-2 ZIP output from a synthetic producer, cancellation and bounded native streaming. They do not replace real-browser file-selection tests or real-device Plus acceptance. The source profile evidence is documented separately in `site/FEATURE-CONTRACT.md`.

The readable Lua sources are in `runtime/<profile>/` and `runtime/shared/`. Start with the profile's `main.lua`, not the generated JavaScript registry. See [Lua runtime organization and validation](docs/runtime-modules.md) for module responsibilities, native filenames and private regression checks. Both `npm test` and `npm run build` regenerate the registry from these sources.

## Publish on GitHub Pages

Build and test, then publish the **contents** of `site/` at the root of the `gh-pages` branch. In repository Settings → Pages, select **Deploy from a branch**, branch `gh-pages`, folder `/ (root)`. `.nojekyll` is already included. Keep `main` as the source branch. This route does not require a token with GitHub Actions workflow scope.

An optional Actions deployment example is in [docs/examples/pages.yml](docs/examples/pages.yml). To adopt it, use a credential allowed to create workflows, copy it to `.github/workflows/pages.yml` and select GitHub Actions as the Pages publishing source. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Origin and credits

Thank you to **[khumam](https://github.com/khumam)**, creator of **[GBA Duo](https://github.com/khumam/gba-duo)**, for the emulator, dual-screen companion concept and companion format that made this project possible. [GBA Duo Plus](https://github.com/levi-soft/gba-duo-plus) extends that upstream work. [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio) provides visual companion authoring and the compiler used here.

The initial website/profile source comes only from the audited **0.9.6 Public Kit**; [SOURCE.json](SOURCE.json) records its checksum. No ROM, extracted portrait/sprite set, game text table, save or prepared Local ZIP is included in this repository. Fire Emblem and its game assets belong to their respective rights holders; this tool is independent and does not grant redistribution rights for ROMs or generated game assets.

Source is [GPL v3](LICENSE). See [CREDITS.md](CREDITS.md), `site/THIRD-PARTY`, `site/JSZIP-LICENSE.md` and `site/ui-source/ICON-LICENSE.txt` for component notices.
