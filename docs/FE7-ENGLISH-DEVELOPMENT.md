# FE7 English development — 0.1.0

This profile starts at **0.1.0**. It will use **1.0.0** only after its release
scope and validation are complete. The existing three Vietnamese companions
remain stable at 1.0.0.

## First milestone: inherited English UI

- Reuse `ui/theme.layout.json`, the common CSS, resources and modal controls.
- `ui/locales/en.json` supplies English Growth/Analysis labels, status messages,
  conditional EXP descriptions, progress and radar captions.
- `makeCompanionLayout(null, 'en')` creates an independent translated tree.
  The default remains Vietnamese; no Vietnamese layout or text is overwritten.
- `site/profiles/fe7-english/template.js` creates a **UI prototype** with version
  0.1.0 only when given an exact ROM identity. It is not in the public catalogue.
- `runtime/fe7-english/presentation.english.lua` localizes explicit presentation
  fields through the shared locale helper. It does not translate ROM text or
  change numerical calculation results.

## Exact ROM and initial runtime evidence

Read-only Studio inspection of Thor identified **AE7E / 2A524221**, FE7 USA,
16 MiB. The local preparation adapter locks to that identity and generates
English text/graphics from the player's own ROM. The FE7 preparation reader and
runtime modules are inherited, with an English entry point and presentation
adapter; no copy of the common layout is maintained.

On a copied real map capture, the development pack resolves Lyn / Lord, her
inventory and Growth data. Four native Lua runs on Thor passed 24 updates in
total with no RAM writes. All four used the same map capture; they do not prove
Forecast/level prediction or Preparations behavior on the USA ROM. Those need
separate captures and acceptance before the stable 1.0.0 milestone.

The three Vietnamese Lua profiles still produce identical outputs across 345
captured updates. The shared radar's Vietnamese geometry and SVG output match
the released renderer in 120 seven/eight-stat, bonus and scale cases.

Initial checks: 46 automated builder/runtime/UI tests; four Android host-render
cases (Units, Map, Growth, Analysis) with the actual prepared pack and Lyn map
capture. These render checks use the existing Plus renderer without changing or
building an APK. The generated Local ZIP is private and must not be published
with its ROM-derived images/text.

Builder 1.0.0 still advertises only the three stable Vietnamese profiles. Adding
the verified English adapter to that public catalogue will require a new builder
profile-set release under [the existing version policy](VERSIONING.md).
