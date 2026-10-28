# Package a custom companion project

The website now has an optional **Use my Studio project** path. It accepts a
prepared Studio JSON and the author's exact local ROM. It does not require an
entry in the curated supported-game registry. The ordinary automatic profile
build and Plus runner keep their existing behavior.

1. Prepare a project in Studio, with its native RAM values or existing Lua
   reader, layout, CSS, assets and sample data.
2. In Project settings, declare the ROM's game code **and CRC32**. Save the
   editable `.gbastudio.json` project. Do not guess memory addresses or widen
   compatibility to an untested ROM revision.
3. On Builder, select the ROM and enable **Use my Studio project**. Choose the
   saved JSON. Wait for the input check, review the pack/reader/resource summary,
   then keep the Studio interface or configure an optional template below.
   Build, download the ZIP and test it on the target device.

The build button stays disabled during custom-input checks and when the pair
does not match. Changing either file invalidates the previous check/downloads;
late reads from older selections are ignored. Changing website language retains
the current check and translates its status. The check displays the actual ROM
code/CRC32, pack identity, design size, reader type and file/data-field counts.
Sample-only projects show a note and remain exportable; this does not create a
reader for their game. A block-preset JSON is identified as a configuration
library and must be imported into Studio before saving a full project.

Builder compares actual ROM bytes with the project's declared identity before
compiling, then narrows the output match to that one exact ROM. It preserves
Lua entry point/modules, native values, metadata and binary assets; source
project and ROM are not mutated. Packaging does not execute custom Lua.
The result is not added to the public catalog and is not runtime verification.

Projects that need Studio's computed/graphics/pulse Lua generation must use
Studio's own **Export pack ZIP** action. Builder rejects those descriptors
instead of silently skipping their generated reader. Existing prepared Lua
and native manifest values work through this custom path. No game data is
automatically discovered or extracted for a new game.

## Optional templates from the existing reader

After the ROM/project input check, **Choose the interface** offers the existing
Studio layout (default), a character card, a stat table, or both. A card requires
only a name field; level/rank, an image-source string and a numeric current/max
bar are optional. A table accepts 1–24 scalar fields with editable labels. Labels
can be written in Vietnamese or another language, and missing rows/controls
receive a specific localized message before Build is enabled.

Choices come from root-scope sample fields, native values and explicit reader
declarations. No RAM addresses are inferred and no Lua is generated/executed.
Declared fields without sample values are not treated as observations. Lists
and their row fields remain Studio authoring tasks. Studio-generated computed,
graphics and pulse readers retain the existing export-in-Studio requirement.

New templates replace the interface only in the output copy. Reader modules,
native values, binary resources, CSS, samples, canvas and exact-ROM declarations
remain attached to the project. Game-specific CSS selectors or readers depending
on old UI states may need further Studio/device checks. Image-source strings
alone do not prove that the image resolves on the device.

Source/ROM changes reset the recipe. Configuration changes revoke earlier
downloads, without rereading the ROM; language changes retain fields and literal
labels. Configuration is disabled during packaging. The generated layout is
ordinary editable native widgets and remains usable in Studio.

The website-only `CompanionTemplates.catalog(project, language)` and
`CompanionTemplates.prepare(project, config)` helpers use `CompanionBlocks`.
`config.kind` is `existing`, `card`, `stats` or `overview`; the form creates
explicit card field/label settings and an ordered `rows` array. `existing`
returns the unchanged project; other modes return a new project preserving
reader/resources/data and replacing the layout. Use the normal `buildProject`
input/ROM validation and packaging after configuration. The Plus automatic
profile runner keeps its previous flow.

New packages retain design canvas/grid settings in version-1
`studio-design.json`. Studio restores valid settings when the generated
layout/CSS snapshot matches the runtime files. Older packs without matching
metadata keep legacy editor defaults. These are editor settings, not a change
to native RAM fields or a fixed-resolution emulator viewport. The optional
`npm run test:builder` gate in the Studio checkout exercises both actual
repositories through repeated packaging and editing cycles.

## Author API and CLI

`CompanionBuild.buildProject(romBytes, project, options)` uses the same compiler
and ZIP packager as curated builds. `options.signal` supports cancellation;
`options.onProgress` receives packaging progress. Its report marks
`source: "studio-project"` and `runtimeVerified: false`.

`CompanionBuild.inspectProject(romBytes, project)` performs the same prepared
input validation and data-catalog pass as custom packaging, without compiling,
creating a ZIP, loading fonts, extracting images or running Lua. It returns ROM
identity, pack metadata, canvas size, file/asset/Lua/data-field counts and the
reader kind (`lua`, `native` or `sample`). It throws on invalid inputs and never
changes the source/ROM. This is not full widget/CSS/Lua/runtime verification.
The report also contains `diagnostics`: error/warning/info counts, up to 100
`issues` (blocking errors first), `truncated` and `complete`. Each issue includes
a code, layout location and, when available, component ID, property, field or
file path. `CompanionBuild.projectDiagnostics(preparedProject)` runs this
read-only dependency pass without a ROM. `projectIssueText(issue, 'vi' | 'en')`
provides localized explanations. It inspects native bindings, actions, list
templates, all pages/tabs, CSS URLs and image skins; it does not parse Lua or
prove that assets decode successfully.

Missing directly referenced local assets block custom packaging before
compilation/ZIP creation. Missing sample image paths, conditional image/style
assets and fields absent from sample/declarations remain nonblocking notes;
unknown fields in Lua projects are explicitly marked for runtime checking.
Empty lists get a scope note rather than guessed missing row fields. Skins
require their exact file-map keys at compile time, even on hidden components.
Remote URLs are not fetched. The UI reruns the check after template changes,
so replacing an old interface can remove its missing references in the output
copy. The source stays unchanged. A blocked `buildProject` error includes its
`diagnostics` report as well as `romIdentity`.

When the ROM header/size is valid but project validation fails, the error's
`romIdentity` property contains the actual game code/CRC32 for comparison.

The website reuses the exact checked input snapshot for packaging, while
`buildProject` validates it again. The command-line custom builder uses the
same shared validation.

Vietnamese user instructions: [Đóng gói dự án Studio](custom-projects.vi.md).

For a private local build without the website:

```sh
node scripts/build-project.mjs /private/project.gbastudio.json /private/game.gba /private/new-pack.zip
```

The CLI refuses to replace an existing output. Inputs and generated packs stay
private. ROMs are limited to 32 MiB, source JSON to 64 MiB, individual files to
32 MiB and total embedded files to 64 MiB. Project paths, file encoding,
structural complexity and required Lua entry points are checked before export.

## Separate reader data from its presentation

A prepared project can declare `manifest.studioDataFields`, independently of
its layout, styles and Lua modules. Example:

```json
{"hp":{"kind":"number","label":"Current HP","labelVi":"HP hiện tại"},
 "maxHp":{"kind":"number","label":"Maximum HP","labelVi":"HP tối đa"},
 "party":{"kind":"list","labelVi":"Đội hình"},
 "party[].name":{"kind":"string","labelVi":"Tên nhân vật"}}
```

Kinds are number/string/boolean/list. Optional description and aliases help
Studio's named-field search. `CompanionBuild.describeDataFields(project)` derives
types from representative sample data/native value declarations and preserves
explicit author labels. Custom-project builds include this catalog in their
manifest; original reader modules and data remain unchanged. No RAM addresses
or runtime verification claims are inferred. Curated profiles keep their
current generation pipeline; older packs work in Studio using their sample
fields without requiring regeneration of the Lua reader.
