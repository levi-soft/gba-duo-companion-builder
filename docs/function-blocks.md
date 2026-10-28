# Reusable native companion blocks

Builder and Studio share portable constructors for a character card and a
stat table. They only produce native layout nodes; they do not access a ROM,
execute Lua, discover fields or bundle artwork. All fields and labels are
explicit. Colors and fonts inherit the companion theme.

Browser preparation code can use `CompanionBlocks.characterCard(options)` and
`CompanionBlocks.statsTable(options)`. Both website and Plus runner load the
generated `site/function-blocks.js` before the build core runs. Existing curated
profiles are unchanged. Node authors can import the same functions directly
from `ui/function-blocks.js`.

```js
const card = CompanionBlocks.characterCard({
  id: 'pilot-card', nameField: 'pilot', levelField: 'rank',
  levelLabel: 'Rank', portrait: '$avatar',
  currentHpField: 'ammo', maximumHpField: 'capacity', hpLabel: 'Ammo'
});
const stats = CompanionBlocks.statsTable({
  id: 'pilot-stats', title: 'Status',
  rows: [{label: 'Energy', field: 'energy'}, {label: 'Credits', field: 'credits'}]
});
```

Use a unique deterministic ID prefix per block. A card requires only its name
field; omit portrait, level or current/maximum fields when not available.
Portraits can be `$field` bindings or local `asset:...` sources. Stat tables
accept 1–24 labeled scalar fields and preserve caller order. Field type/scope
and asset presence must be checked by the author against that reader. Studio
performs those checks when inserting through its form.

The nodes remain ordinary editable native widgets. Put them in a prepared
project layout and package through the normal profile producer or custom
`CompanionBuild.buildProject` API. The constructors have no runtime state and
do not change the input options, existing reader modules or project data.

Stat rows may use `labelField` instead of `label`, for example
`{labelField:'powerName',field:'power'}`. This emits an ordinary text binding
for a label that changes with the selected subject. Studio validates that the
label field is available in the chosen scope. Literal labels still reject
binding syntax; label values are supplied by the reader without translation.

## Source synchronization

Keep `ui/function-blocks.js` byte-identical to Studio's
`src/lib/studio/function-blocks.js`. Both repositories retain their own copy so
each can build independently. After an intentional shared change, synchronize
both copies and run both verification suites. `build-authored-sources.mjs`
regenerates the classic browser wrapper from the authored ES module. Tests
compare generated browser output with the portable constructors and check
determinism, IDs and rejected paths. The real-pack preservation checks remain
private.
