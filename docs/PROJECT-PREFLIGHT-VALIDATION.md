# Custom-project preflight validation, 2026-10-28

Scope: make the generic Studio-project path reviewable before packaging.
Automatic profiles and the Plus runner retain their existing build flow.

- Added `CompanionBuild.inspectProject`, backed by the same prepared-input and
  data-catalog validation as `buildProject`. It reports exact ROM identity,
  companion metadata, canvas, reader kind and input file/asset/field counts.
  It does not compile, package, extract images, load fonts or execute Lua.
- The website checks a custom ROM/project pair after selection and keeps Build
  disabled until it passes. Sample-only projects are identified and remain
  packageable. A block-configuration library JSON receives a specific message
  explaining how to turn it into a full Studio project.
- Input errors include common Vietnamese/English repair instructions. A valid
  ROM's actual identity remains visible on project-validation failure. Language
  changes preserve and re-render the current result instead of resetting it.
- Selection generations ignore late results from older file reads. Replacing
  a file clears the previous result and revokes its download URLs. Packaging
  uses the checked byte/project snapshot and validates it again. In-flight
  cancellation or a changed selection cannot publish the old build result.
- Six additional automated tests cover inspection summaries/no compiler/ZIP,
  wrong input type, pending/valid/error button states, language changes,
  out-of-order reads, checked-input reuse and stale-download cleanup. Existing
  rejection cases now exercise both preflight and packaging, including malformed
  root data/layout, oversized metadata and missing/mismatched reader inputs.
- `npm run check` passes: **126 tests**, distribution generation, release-policy
  validation and website asset fingerprints. Existing profile/runtime tests pass.
  The generated local artifact/catalog still uses Builder **1.1.5**.
- UI event-handler tests use a mocked DOM and synthetic TEST ROM/project data.
  They are not real-browser layout/visual or device acceptance checks. There was
  no real-game import or RAM read in this step. Studio source was not changed.
- Added Vietnamese custom-project instructions. No dependencies, public game
  profiles, commits, uploads or GitHub releases were added.

## Follow-up: configure native templates using the existing reader

- Added an optional website template stage after a successful exact-ROM/project
  check. The default retains the existing Studio interface. Character card,
  stat table and combined templates use the shared native constructors with
  explicit root-scope field choices and Vietnamese/English labels.
- Card level/image/bar settings are optional; a bar requires distinct numeric
  fields, and image bindings require string fields. Tables allow 1–24 ordered
  scalar rows. Missing controls and stat-row numbers are identified in localized
  messages. Zero, false and declared placeholders are not replaced by guesses.
- Source inputs stay unchanged. New outputs replace the layout while preserving
  reader modules, native values, CSS, resources, sample data, canvas and ROM
  declarations. File maps are copied without recloning immutable base64 strings
  on each edit. Packaging still validates and clones the configured project.
- Recipe edits invalidate existing downloads and use the cached checked source
  and ROM. Source replacement resets configuration, ignores late file reads and
  keeps the input guard. Language changes retain chosen fields and literal
  labels. In-flight build/cancellation disables/restores the configuration.
- Five helper/packaging tests cover field catalogs, declarations, preservation,
  malformed choices, actual format-2 ZIP/reader bytes and 60 generated templates.
  Six DOM/event-model tests exercise templates, localized missing controls,
  row labels/order/removal/limits, source races, download revocation, cached
  inputs, actual packaging and cancellation with a language change.
- `npm run check` passes **137 tests**, distribution generation, policy checks
  and asset fingerprints. The local catalog/artifact remains Builder **1.1.5**.
  Evidence: `reports/project-templates-check.log`.
- A real connected Chrome tab loaded the local Vietnamese website successfully.
  The extension rejected synthetic-file selection because file-URL access was
  not enabled. The tab was closed; no extension permissions were changed.
  Template interactions and ZIP production have automated DOM-model coverage,
  not completed browser acceptance. No Android or real-game test is claimed.
- The generated browser fixture is synthetic `TEST` data in ignored `reports/`,
  outside the distributed website. Curated profiles, Plus runner behavior and
  public game-support claims are unchanged. No dependencies, version bumps,
  commits, uploads or releases were added.

## Follow-up: preserve Studio canvas/grid through native packages

- Real cross-repository tests found that reopening otherwise valid packages
  reset the Studio design canvas to its legacy default. Builder now writes
  the original dimensions/grid into version-1 editor metadata even when the
  layout has no font/skin/state-style compilation. Matching runtime layout/CSS
  snapshots remain in that metadata; native manifest behavior is unchanged.
- Studio's importer restores bounded valid optional dimensions/grid settings
  only when metadata matches the runtime files. Legacy/stale/invalid optional
  settings keep their fallback behavior. Repeated-cycle tests exercise both
  actual repositories, authored conditional styles and later Studio edits.
- One additional Builder regression test checks the metadata/runtime snapshot
  and unchanged source/native manifest. `npm run check` passes **138 tests**,
  distribution, release-policy and fingerprint generation. Evidence:
  `reports/editor-roundtrip-check.log`. The separate Studio integration gate
  passes four tests; Studio's standalone gate passes 211 tests and build.
- A private exact-ROM device pack was prepared through both tools with 869
  retained reader/resource files. Its assigned Thor data matched ten raw RAM
  fields for each of two selected units; portraits, names, HP and Mag/Str labels
  were visually inspected. The user restored a map state before the second
  verification after an idle-timeout/intro interruption; sleep/resume behavior
  and that interruption's cause are not established. No new game profiles or
  general runtime guarantees are inferred. Private ROM/capture/pack files are
  excluded from the public website and source.
- Builder remains **1.1.5**; no dependencies, commits or releases were added.

## Follow-up: explain dependencies before custom export

- Custom input reports now include localized dependency diagnostics with
  component ID/layout location, property and missing field/file path. Native
  bindings, actions, all page/tab branches, representative list scopes,
  CSS URLs and skin file references are inspected without running Lua.
- Missing direct local assets block custom packaging before compilation/ZIP.
  Unknown Lua fields, sample image paths, empty list scopes and conditional
  image/style assets remain nonblocking. Skin files are required by compilation
  even on hidden components. CSS comments/strings and literal action JSON do
  not create false bindings. Remote URLs are never fetched by this pass.
- Reports retain counts and display at most 100 issues, errors first. Template
  edits rerun the report, permit repairing an old layout in the output copy and
  invalidate downloads. The ROM/source and original interface remain intact.
  Prepared-project diagnostics do not validate asset decoding or Lua behavior.
- Eight diagnostic/API tests include native scopes, zero/false, nested/empty
  lists, declared fields, conditional/dynamic assets, CSS tokens, pre-ZIP
  rejection, count truncation, traversal bounds and 80 deterministic generated
  file sets checking monotonicity and source immutability. Two DOM/event-model
  tests cover localized blocking, template repair, cached inputs, download
  revocation and warning-only actual ZIP production. They are not rendered
  browser or accessibility acceptance checks.
- `npm run check` passes **148 tests**, distribution generation, release policy
  and fingerprints. Evidence: `reports/dependency-diagnostics-check.log`.
  Studio's cross-repository `npm run test:builder` passes **4 tests**;
  evidence: `.studio-runtime/dependency-diagnostics-interop.log` in Studio.
- A read-only check of the previous private device project's source reports
  zero errors/notes and a complete traversal. No new Android interaction, game
  execution or runtime compatibility claim is made. No game material was copied
  into the public source/distribution.
- Builder remains **1.1.5**, Studio remains **0.3.0-beta.1**. Studio production
  code, curated generation and the Plus automatic runner were not changed by
  this follow-up. No dependencies, version bumps, commits or releases added.

## Follow-up: use the same dependency rules in Studio

- Extracted the dependency checker into readable `ui/project-diagnostics.js`,
  mirrored in Studio. The authored-source build embeds it in `builder-core.js`;
  the standalone API/runner still needs no new runtime script or sibling repo.
  A regression test checks the generated embedded source. Rules and severity
  behavior from the preceding follow-up are retained.
- Studio now shows the same component/property/path issues and can navigate to
  the relevant inspector or CSS/Lua source without applying other file drafts.
  Optional cross-repository tests check source mirror consistency and compare
  actual preflight reports, blocked packaging and repaired-source packaging.
- Builder `npm run check` passes **149 tests** plus distribution/policy and
  fingerprint generation; evidence: `reports/shared-diagnostics-check.log`.
  Studio's standalone gate passes **219 tests**, zero Svelte diagnostics and
  build; its optional Builder gate passes **6 tests**. These static/component
  checks do not establish browser layout or arbitrary game-reader accuracy.
- No new dependencies, private game files, device actions, version changes,
  commits, uploads or releases were introduced.
