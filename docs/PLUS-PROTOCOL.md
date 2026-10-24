# Plus builder protocol 1

This is an optional **Plus provider**, separate from official GBA Duo. It is removable when upstream supplies equivalent automatic generation. Official manual ZIP import is retained.

## Catalog

`catalog.json` has `schemaVersion: 1`, `runnerProtocol: 1`, `builderVersion`, a `builder` object and exact-ROM `profiles`.

`builder` contains relative `url`, lowercase hexadecimal `sha256`, compressed `bytes`, exact `unpackedBytes` and `entrypoint: "plus-runner.html"`. Profiles contain `id`, display `name`, companion `version`, four-character `gameCode` and eight-character uppercase `crc32`. The app validates identity, safe HTTPS URLs, size bounds and hashes before loading a bundle. Hashes bind a downloaded file to the catalog, not to an independent signature; the app must trust its catalog origin.

The bundle contains the same source and compiler the website runs. It does not contain `catalog.json` or the `releases/` directory, avoiding self-referential checksums. Build uses fixed ZIP entry timestamps so identical source produces identical bundles.

## Private WebView origin

Plus serves downloaded bundle files through an app-owned HTTPS origin, currently `https://builder.gbaduo.invalid/`. It provides the selected local ROM only at `/__plus/rom.gba`. All WebView network requests outside the private bundle/local-ROM routes are denied by the native host. The runner's CSP limits connections to its own origin. No ROM upload or remote processing endpoint exists.

Before loading the entrypoint, native code installs `window.PlusBuilder` with these synchronous JavaScript-interface methods:

| Method | Purpose |
| --- | --- |
| `configuration()` | JSON: `{profileId, gameCode, crc32, romUrl:"/__plus/rom.gba"}` |
| `cancelled()` | Whether generation/streaming must stop |
| `progress(message)` | Update native progress text |
| `beginZip(size)` | Start one bounded output ZIP |
| `appendZip(base64)` | Append the next chunk, at most 48 KiB decoded / 64 KiB base64 |
| `finishZip()` | Finalize validation/installation of the completed ZIP |
| `fail(message)` | Terminate with an error and discard partial output |

`plus-runner.js` starts once at DOM ready. It validates configuration, fetches only the fixed ROM route, verifies CRC/game code/profile and invokes `CompanionBuild.build`. It renders Growth diagrams with the bundled font and shared renderer, compiles format-2 layout/CSS and streams the resulting ZIP. It checks cancellation before generation, during cooperative preparation and between output chunks.

The host owns filesystem writes, output limits, validation, pack replacement policy, assignment and cleanup. A downloaded JavaScript file never receives a generic filesystem, intent, shell or networking bridge. Installation must not silently overwrite an assigned manual/custom pack. User selection and manual import stay available.

## Website path

`app.js` invokes the same `CompanionBuild.readRom` and `CompanionBuild.build` but creates local download links instead of invoking a native bridge. The HTML includes all required profile and resource scripts using relative URLs, so it works under a GitHub Pages repository subpath. The runner is intended for Plus's private origin, not direct browser use.
