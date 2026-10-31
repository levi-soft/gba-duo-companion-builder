# Eligor's Spear companion 1.0.0

Companion **1.0.0** is included in the repaired **Builder 1.2.0** release of 2026-10-31. See [current release changes and known limits](RELEASE-1.2.0.md) and the [unchanged-APK repair scope](OFFICIAL-30-COMPANION-FIX-2026-10-30.vi.md). The older development checks below are historical evidence; they do not establish full Android acceptance.

## Pre-release validation record

Exact local ROM: **BE8E / 6E5FE3B0**, 29718176 bytes, SHA-256 `6181f0d7288012d647cd0af5a06847c7e9173ea0708916a93e3fad17cdc583b3`.

Uses the accepted English seven-stat companion layout, locally extracted graphics/text, exact ROM matching, and the FE8 shared runtime. Tables are traced from native pointer literals; this is not compatibility inferred from the header alone.

Development status: ROM extraction, Lua, runtime and device checks are tracked separately. No stable release or full-campaign acceptance is claimed. Base growth rates exclude custom skill/item modifiers. Tactical range overlays use base movement/weapon range and do not include range-changing skills.

Author/source: https://feuniverse.us/t/fe8-complete-eligors-spear-version-4-0-47-chapters/4755

ROMs, extracted graphics, text tables, prepared projects, ZIPs and emulator captures remain in the private workspace. The public adapter contains authored code and metadata only.

Audit correction: the native follow-up routine has an additional zero-terminated weapon deny table, reached through ROM literal `0x11B1D38`. Preparation reads that table and each weapon's effect byte. The opt-in battle formatter applies the rule to both sides, damage labels, multipliers and HP totals. Brave weapons still deliver their initial pair when follow-ups are denied. All 24 isolated native actor/defender controls agree with the rebuilt formatter; this is not an exhaustive combat-mechanics claim.

HP drain follows native weapon effect2 rather than retail item IDs; this revision has additional draining weapons and item70 is not one. HP bars aggregate ordinary hits, so misses, criticals, procs, round order and other special effects can change the actual outcome.

Conditional Analysis has normal and near-level native forecast fixtures plus standalone Android Lua execution. It predicts only the stated EXP/level-up conditions. Campaign-wide, every equipment combination and physical companion interaction remain unverified.
