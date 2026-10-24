# GBA Duo Companion Builder

[Tiếng Việt](README.vi.md)

Create a companion from a supported ROM on your own device. The website builds a ZIP for manual import; GBA Duo Plus can use the same builder bundle to create, install and assign the companion inside the emulator.

**Website:** [levi-soft.github.io/gba-duo-companion-builder](https://levi-soft.github.io/gba-duo-companion-builder/)

This project is maintained by [levi-soft](https://github.com/levi-soft). Automatic discovery/build/install is a **GBA Duo Plus extension**, not an official GBA Duo feature. The standard manual ZIP workflow remains available. If official GBA Duo later provides the complete feature, Plus can replace its provider integration while preserving this public catalog and pack format.

## Use the website

1. Open the website in a current Chrome or Edge browser.
2. Choose English or Vietnamese, then select your `.gba` file or a ZIP containing exactly one `.gba`.
3. Select **Build companion** and wait for local generation.
4. Download the Local ZIP, save your game/state, then import and assign the ZIP in GBA Duo Plus. The optional project JSON opens in [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio).

The website downloads its HTML, JavaScript and authored UI resources. ROM processing happens locally: ROM bytes, extracted artwork and game text are not uploaded. The ROM itself is not changed. Generated files contain assets from your ROM and should remain private; share this builder website instead.

## Exact profiles in builder 0.9.7

| Profile | Game code | ROM CRC32 | Companion version |
| --- | --- | --- | --- |
| FE7 Vietnamese | AE7E | 32CD990D | 0.7.15 |
| FE6 Vietnamese Remastered, built on FE8 | BE8E | BD53D5F3 | 0.4.16 |
| FE8 Vietnamese | BE8E | 3CD932D7 | 0.6.7 |

Other revisions are rejected. The FE6 profile is not original FE6. This is a profile-driven builder; it does not discover arbitrary game memory layouts automatically. See the website's [feature contract](site/FEATURE-CONTRACT.md) for prediction scope, device evidence and limitations.

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

`site/` is the static website. The build generates `site/catalog.json` and `site/releases/builder-0.9.7.zip` deterministically from the files in `site/`. It does not read a ROM, regenerate the private companion projects or change the frozen 0.9.6 kit source.

Tests cover catalog hashes and exact profile identities, local-only assets, empty public game-data templates, shared generation, actual format-2 ZIP output from a synthetic producer, cancellation and bounded native streaming. They do not replace real-browser file-selection tests or real-device Plus acceptance. The source profile evidence is documented separately in `site/FEATURE-CONTRACT.md`.

The readable Lua sources are in `runtime/<profile>/` and `runtime/shared/`. Start with the profile's `main.lua`, not the generated JavaScript registry. See [Lua runtime organization and validation](docs/runtime-modules.md) for module responsibilities, native filenames and private regression checks. Both `npm test` and `npm run build` regenerate the registry from these sources.

## Publish on GitHub Pages

Build and test, then publish the **contents** of `site/` at the root of the `gh-pages` branch. In repository Settings → Pages, select **Deploy from a branch**, branch `gh-pages`, folder `/ (root)`. `.nojekyll` is already included. Keep `main` as the source branch. This route does not require a token with GitHub Actions workflow scope.

An optional Actions deployment example is in [docs/examples/pages.yml](docs/examples/pages.yml). To adopt it, use a credential allowed to create workflows, copy it to `.github/workflows/pages.yml` and select GitHub Actions as the Pages publishing source. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Origin and credits

Thank you to **[khumam](https://github.com/khumam)**, creator of **[GBA Duo](https://github.com/khumam/gba-duo)**, for the emulator, dual-screen companion concept and companion format that made this project possible. [GBA Duo Plus](https://github.com/levi-soft/gba-duo-plus) extends that upstream work. [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio) provides visual companion authoring and the compiler used here.

The initial website/profile source comes only from the audited **0.9.6 Public Kit**; [SOURCE.json](SOURCE.json) records its checksum. No ROM, extracted portrait/sprite set, game text table, save or prepared Local ZIP is included in this repository. Fire Emblem and its game assets belong to their respective rights holders; this tool is independent and does not grant redistribution rights for ROMs or generated game assets.

Source is [GPL v3](LICENSE). See [CREDITS.md](CREDITS.md), `site/THIRD-PARTY`, `site/JSZIP-LICENSE.md` and `site/ui-source/ICON-LICENSE.txt` for component notices.
