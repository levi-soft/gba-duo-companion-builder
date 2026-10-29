# Changelog

## 1.2.0 — thirty companions at 1.0.0 (2026-10-29)

- Finalize the fifteen new exact-ROM companions at 1.0.0, alongside the fifteen existing releases.
- Include the audited native stat-screen selection, RNG, Map pick, split-stat, skill and Pokemblem fixes described below. Existing released readers remain unchanged.
- Preserve ten explicit Analysis gates and Pokemblem's companion-only selection/range limits. Release numbering does not expand their verified scope.
- Verification: 193 Builder tests, 69 Android host tests, 211 visible units with 14,733 field comparisons, 241 reachable widget callbacks, 15 Studio roundtrips and 2,780 standalone native Lua updates on Thor.
- Add Windows/Linux Node 22/24 CI. See [release notes](docs/RELEASE-1.2.0.md).

## Development batch — fifteen new 0.1.x companions (2026-10-29)

- Add 15 exact-ROM profiles, retaining Builder 1.1.5 and the 15 published companion 1.0.0 versions.
- Extract each ROM locally, keep native-compatible packs, preserve the existing 15 runtime bundles, and validate real opening-map RAM.
- Handle split Str/Mag, native skill/cap tables, RAM-backed avatar names, Leadership and hack-specific Growth. Pokemblem has read-only party selection and bounded 240×247 combination charts.
- Test conditional Analysis in five ROMs; fail closed for unverified protected-BIOS paths and custom mechanics in the other 10. No ROM crash claim or dummy prediction.
- Follow-up selection/RNG audit: fix RNG tracking before the first forecast in Dark Lord and enable the indicator independently of unverified Analysis in Bells, Cerulean, Pokemblem, Morrow and Sun. These six companions are 0.1.1; the other nine remain 0.1.0.
- Keep Dark Lord's Map pick invalidation when a new unit or inventory refreshes; the inherited inventory reset previously discarded that action for one update.
- Label Pokemblem's Map roster with each slot's current species, matching its unit card, while retaining avatar names and deployment IDs.
- Final audit: follow the native stat-screen unit when R / Down changes selection without moving the map cursor. Fourteen affected profiles are 0.1.2; Pokemblem retains its distinct 0.1.1 selection. Preparations keeps its original player-only rules and published readers remain unchanged.
- Verify actual Plus cursor navigation against running ROMs (29 arrivals, 14 native selection/preview locks), plus native-renderer Map taps and RNG LEDs for all 15. Pokemblem keeps companion-only selection.
- See [full scope](docs/FE-EXPANSION-2026-10-29.vi.md). This is local development, not a stable or online release.

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
