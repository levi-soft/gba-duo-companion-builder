# The Dark Amulet companion 1.0.0

Released version: **1.0.0**, built with **Builder 1.2.0**. Feature verification is incomplete: ten new profiles have no working Analysis, five have limited conditional tests, and full companion-app acceptance is pending. See the [verification correction](ANALYSIS-GAPS-1.2.0.vi.md) and [release notes](RELEASE-1.2.0.md).

## Pre-release validation record

Exact local ROM: **BE8E / 8537CE2A**, 21502412 bytes, SHA-256 `c991eb748142492bf0257a25a83578e9fd17a38011aa35811fb897a9e7bbd71a`.

Uses the accepted English eight-stat companion layout, locally extracted graphics/text, exact ROM matching, and the FE8 shared runtime. Tables are traced from native pointer literals; this is not compatibility inferred from the header alone.

Development status: ROM extraction, Lua, runtime and device checks are tracked separately. No stable release or full-campaign acceptance is claimed. Base growth rates exclude custom skill/item modifiers. Tactical range overlays use base movement/weapon range and do not include range-changing skills.

Author/source: https://feuniverse.us/t/fe8-complete-the-dark-amulet-v1-6-08-08-2024/24299

ROMs, extracted graphics, text tables, prepared projects, ZIPs and emulator captures remain in the private workspace. The public adapter contains authored code and metadata only.

Active stat-cap hook and eight-getter level-up dispatch confirm separate Str/Mag. Mag at unit +0x3A, character growth table 0xB2A740, class Mag table 0xB2A940, class level caps 0xB2A63C; Luck comparison uses 40. These are exact-ROM contracts, not inferred from bundled unused routines.

The active player level-up caller at `0x0802BA28` caps HP at60 independently of the class record's unused HP byte. Growth uses60, including classes with raw HP caps1/70/80. Unit-maintenance clamps are a separate contract and were not substituted for actual level-up evidence.

Conditional Analysis is disabled for this exact revision because a native hook accesses protected BIOS state outside the frozen interpreter's verified contract. Opening its popup explains the limitation before combat; it never fabricates EXP or a completed prediction.
