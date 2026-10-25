# Shared companion UI source

- `theme.layout.json`: the common widget tree used by all profiles.
- `theme.css`: the common stylesheet, in cascade order.
- `theme-factory.js`: profile extensions for FE6 Remastered Mag/skills/leadership and FE8 native abilities.
- `locales/en.json`: English authored layout/status/radar text for the FE7 English development profile.
- `radar.js`: shared radar geometry, SVG and canvas rendering; Vietnamese remains the default.

Edit these authored files, then run `node scripts/build-ui-theme.mjs`.
The generated browser/distribution entry is `site/theme.js`; do not edit its
serialized layout or CSS directly. Profile metadata and extension payloads remain
in `site/profiles/<profile>/template.js`.

English uses `makeCompanionLayout(null, 'en')`; the default call preserves the
Vietnamese tree. No second Growth/Analysis layout is maintained. The FE7 English
Lua presentation adapter translates only named UI fields, preserving ROM text
and calculations. The build also regenerates `site/radar.js` from its UI source.

Keep ROM-derived data and images out of this directory. UI assets and their
license notices remain in `site/ui-source` and `site/resources.js`.

The audit removed 87 byte-identical top-level selector rules, keeping their last
occurrence. Earlier identical declarations are dominated by the same later rule.
Differing historical overrides retain their cascade order; do not remove them
merely because they share a selector.
