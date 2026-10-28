# Changelog

## Authoring update — 1.1.5 (2026-10-28)

- Package an edited Studio project against its exact local ROM without adding
  a curated profile or mutating the author's source/ROM.
- Keep the Studio interface, or select a character card, stat table or combined
  layout using named fields from the existing reader. Vietnamese labels work.
- Show missing local assets and binding/reference diagnostics at the exact
  component/property, with the same checker used by Studio. Flag browser-only
  SVG/web fonts in existing projects without deleting their files.
- Preserve Lua, binary resources, sample data, native settings and editor
  canvas/grid metadata across package/reopen cycles. Make identical builds
  produce identical ZIP bytes.
- Add reusable author blocks, custom-project CLI/API, and local RAM evidence
  replay/battle-outcome tools for development. These tools do not discover
  unknown game memory layouts or create a reader from a ROM alone.

Validation: 150 Builder tests and generated-distribution checks; 7 interop
checks plus 2 actual Chrome flows in the sibling Studio project. PNG/TTF and
selected-unit bindings were checked in the actual Android companion on one
exact FE7 Vietnamese ROM. See [scope and usage](docs/AUTHORING-UPDATE-2026-10-28.md).
Builder remains **1.1.5**, with the same fifteen profiles/companion versions.

## 1.1.5 profile release (2026-10-26)

Finalize Storge, The Hag in White, Sacred Echoes, Vision Quest and The Last
Promise alongside the ten existing profiles. See the original
[profile release notes](docs/RELEASE-1.1.5.md).
