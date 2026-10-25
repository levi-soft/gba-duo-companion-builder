# FE8 English USA/Australia

Development profile **BE8E / A47246AE**, version **0.1.0**.

Inherits `fe8-europe` through `scripts/build-runtime-modules.mjs`. That parent
supplies the English entry point and shared FE8 gameplay/presentation modules.
This directory overrides only the US RAM/process contract (`game.profile.lua`)
and US private-execution entries (`game.execution.lua`). Layout, English strings,
abilities, chapter formatting, Growth/Analysis and popup lifecycle stay shared.

The builder producer lives in `site/profiles/fe8-english`; the cursor contract
uses the existing `fe8-us` preset. See `docs/FE8-ENGLISH-DEVELOPMENT.md` for the
captured-RAM/native/render evidence and pending live acceptance.
