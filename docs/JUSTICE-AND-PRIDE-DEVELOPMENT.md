# Justice & Pride companion 1.0.0

Released version: **1.0.0**, built with **Builder 1.2.0**. Feature verification is incomplete: ten new profiles have no working Analysis, five have limited conditional tests, and full companion-app acceptance is pending. See the [verification correction](ANALYSIS-GAPS-1.2.0.vi.md) and [release notes](RELEASE-1.2.0.md).

## Pre-release validation record

Exact local ROM: **BE8E / AC23B461**, 26189708 bytes, SHA-256 `c04d069c6dcaf9c461b281df91f474ee146ff7da8808431fbeb2823a9357dac5`.

Uses the accepted English seven-stat companion layout, locally extracted graphics/text, exact ROM matching, and the FE8 shared runtime. Tables are traced from native pointer literals; this is not compatibility inferred from the header alone.

Development status: ROM extraction, Lua, runtime and device checks are tracked separately. No stable release or full-campaign acceptance is claimed. Base growth rates exclude custom skill/item modifiers. Tactical range overlays use base movement/weapon range and do not include range-changing skills.

Author/source: https://feuniverse.us/t/fire-emblem-justice-pride-full-length-fe8-hack/5922

ROMs, extracted graphics, text tables, prepared projects, ZIPs and emulator captures remain in the private workspace. The public adapter contains authored code and metadata only.

The active level-up path uses class-specific HP caps, including unusual values; Growth retains those native values instead of substituting the retail60 cap. Empty portraits are accepted only for fully null portrait-table entries; invalid nonzero pointers remain build errors.

Conditional Analysis is disabled for this exact revision because a native hook accesses protected BIOS state outside the frozen interpreter's verified contract. Opening its popup explains the limitation before combat; it never fabricates EXP or a completed prediction.
