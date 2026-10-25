# Shared companion UI source

- `theme.layout.json`: the common widget tree used by all profiles.
- `theme.css`: the common stylesheet, in cascade order.
- `theme-factory.js`: profile extensions for FE6 Remastered Mag/skills/leadership and FE8 native abilities.

Edit these authored files, then run `node scripts/build-ui-theme.mjs`.
The generated browser/distribution entry is `site/theme.js`; do not edit its
serialized layout or CSS directly. Profile metadata and extension payloads remain
in `site/profiles/<profile>/template.js`.

Keep ROM-derived data and images out of this directory. UI assets and their
license notices remain in `site/ui-source` and `site/resources.js`.

The audit removed 87 byte-identical top-level selector rules, keeping their last
occurrence. Earlier identical declarations are dominated by the same later rule.
Differing historical overrides retain their cascade order; do not remove them
merely because they share a selector.
