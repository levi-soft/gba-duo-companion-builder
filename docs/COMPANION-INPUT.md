# Companion-owned input

Plus provides tap-scoped `input.press(buttons, frames)` for standard buttons in
any matching game. Packs outside FE can implement their own UI actions through
this API. It does not automatically discover a game's controls or cursor logic.

FE Map taps continue to use `input.focusUnit(id)`. Compatible Plus builds resolve
the navigation contract from the optional manifest `cursorNavigation` object,
bound to an exact ROM game-code/CRC match. Old packs retain the host's legacy
profiles. Older hosts ignore the metadata and retain their existing limits.

Author configurations in `runtime/cursor/profiles.json`. Presets reuse FE7,
FE8 US, FE8 Europe, native FE6 and Ember layouts. The eight profile entries choose
a preset. `scripts/cursor-profiles.mjs` resolves inheritance during the build;
`site/runtime-packager.js` inserts flat metadata into the manifest. No configuration
is injected into Lua unit/UI modules or resolved during emulated frames.

All three Vietnamese companions remain 1.0.0 and all five English companions
remain experimental 0.1.0. The builder remains 1.0.0: this change adds no new
supported-game catalogue entry. Compatible ROMs can be added through verified pack
contracts. Different navigation algorithms may still need host development.

The Plus repository's `docs/CURSOR-FOCUS.md` defines the API and contract fields.
Generic buttons and FE navigation stay separate so non-FE companions do not
inherit FE assumptions. Live acceptance of this new host path is pending.
