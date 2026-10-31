# Andaron Saga companion 1.0.0

Companion **1.0.0** is included in the repaired **Builder 1.2.0** release of 2026-10-31. See [current release changes and known limits](RELEASE-1.2.0.md) and the [unchanged-APK repair scope](OFFICIAL-30-COMPANION-FIX-2026-10-30.vi.md). The older development checks below are historical evidence; they do not establish full Android acceptance.

## Pre-release validation record

Exact local ROM: **BE8E / A3B9CD19**, 28995224 bytes, SHA-256 `1417bc065ebb372c635ba710bb73080a51de2161840c893f69ff14c59fed0133`.

Uses the accepted English eight-stat companion layout, locally extracted graphics/text, exact ROM matching, and the FE8 shared runtime. Tables are traced from native pointer literals; this is not compatibility inferred from the header alone.

Development status: ROM extraction, Lua, runtime and device checks are tracked separately. No stable release or full-campaign acceptance is claimed. Base growth rates exclude custom skill/item modifiers. Tactical range overlays use base movement/weapon range and do not include range-changing skills.

Author/source: https://www.youtube.com/watch?v=UEcbKgp5ggQ

ROMs, extracted graphics, text tables, prepared projects, ZIPs and emulator captures remain in the private workspace. The public adapter contains authored code and metadata only.

Active stat-cap hook and eight-getter level-up dispatch confirm separate Str/Mag. Mag at unit +0x3A, character growth table 0xB2C124, class Mag table 0xB2C324, class level caps 0xB2C020; Luck comparison uses 40. These are exact-ROM contracts, not inferred from bundled unused routines.

HP caps follow class records as confirmed through the active level-up path. Leadership is read from the native character/star table at ROM `0x1AE392C`; Jakka2 and Baudimon3 were compared with the original stat screen. The opening map title explicitly uses Ch.1 rather than inferring chapter numbers from retail slots.

Conditional Analysis is disabled for this exact revision because a native hook accesses protected BIOS state outside the frozen interpreter's verified contract. Opening its popup explains the limitation before combat; it never fabricates EXP or a completed prediction.
