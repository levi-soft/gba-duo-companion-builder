# Authoring update — Builder 1.1.5 / Studio 0.3.0-beta.1

This update makes editing an existing companion and packaging it again easier.
Both tool versions and all fifteen curated companion versions stay unchanged.
The original 1.1.5 profile release remains documented in
[its release notes](RELEASE-1.1.5.md).

## Workflow

1. Open a companion ZIP in [Studio](https://github.com/levi-soft/gba-duo-studio).
   Use guided wording/color/asset edits or connect the existing reader's fields.
2. Save the Studio project, then choose that JSON and its exact ROM in Builder's
   optional custom-project section. Keep the authored interface by default, or
   choose a character card/stat table using available fields and editable labels.
3. Review the component/property/file diagnostics, build locally and import the
   resulting ZIP in the emulator. Reopen the generated ZIP in Studio to continue
   editing; reader files, resources, sample data and canvas/grid settings remain.

Guides: [English custom-project/API workflow](custom-projects.md),
[Vietnamese walkthrough](custom-projects.vi.md), [author blocks](function-blocks.md),
[RAM evidence/replay](ram-evidence.md), [battle outcome comparison](battle-outcomes.md).

Builder requires a working reader prepared by the author. It does not search
RAM addresses or infer a game's rules. Conditional or Lua-supplied data needs
runtime evidence; a successful ZIP build alone is not that evidence. Projects
that require Studio's computed/graphics/pulse generator should export ZIP from
Studio directly.

## Verification

- Builder: **150 tests**, authored-source/distribution generation, policy and
  content fingerprints. Curated profile generation and Plus's automatic runner
  retain their existing contracts.
- Studio: **244 tests**, zero Svelte errors/warnings, production build and
  **7 cross-repository interop checks**.
- Chrome: **2 complete Vietnamese authoring workflows**, at desktop and phone
  viewports, including actual image/TTF decoding, Undo/Redo, packaging through
  the Builder website, project reload and re-export. The phone viewport is not
  a physical Android test.
- Android: Plus **0.1.8-plus.4** on AYN Thor, exact FE7 Vietnamese
  `AE7E / 32CD990D`. The edited PNG and TTF-assigned Vietnamese heading render;
  portraits/HP and Str/Mag labels are present. Ten current-unit fields matched
  RAM for Lyn and Lucius in their respective checked sessions. This does not
  establish every font, game, page, device size or complete campaign behavior.

The device test caught a damaged PNG fixture that Chrome still decoded. Studio
now checks PNG structure/chunk checksums before applying an asset, in addition
to browser decoding. New asset selection supports PNG/JPEG/WebP/still GIF and
TTF/OTF; imported browser-only formats are retained and flagged at references.
The preview does not execute the ROM or the companion's Lua.

Development dependencies pass the moderate audit threshold. Existing low-level
build-chain findings and Studio's main-page chunk-size warning remain recorded
in its trial notes. No ROM, local companion ZIP, device capture, private font or
save is part of the public tool source/bundle.

## Distribution

Use the updated website or the refreshed 1.1.5 Builder kit. The website and Plus
catalogue identify the tool bundle by SHA-256, so a same-version update has a new
immutable artifact path while previously published artifact paths remain valid.
Existing installed companions are not rewritten automatically.
