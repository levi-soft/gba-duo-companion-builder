# The Four Kings companion 1.0.0

Companion **1.0.0** is included in the repaired **Builder 1.2.0** release of 2026-10-31. See [current release changes and known limits](RELEASE-1.2.0.md) and the [unchanged-APK repair scope](OFFICIAL-30-COMPANION-FIX-2026-10-30.vi.md). The older development checks below are historical evidence; they do not establish full Android acceptance.

## Pre-release validation record

Development profile for the user's exact local ROM: **BE8E / 0DDE5BEB**, 29,587,472 bytes, SHA-256 `d6eccc87a5837ee38d024808fc86956024d0fa54ddfe30fe3e8ab6744a5c565d`. Builder remains 1.1.5. No APK change, public release or new-ROM download is part of this work.

## Implementation

The profile uses the accepted English FE8 native layout with Units, Map, Talk and Growth. **Conditional Battle Analysis is explicitly unavailable for this exact ROM revision.** Game text, portraits, map sprites, items, growth diagrams and lookup data are generated locally; public sources contain no ROM-derived asset set. The output uses the existing GBA Duo companion format, rather than an editor or Plus-only widget. Exact game code and CRC32 are both enforced.

The active native stat-screen page was traced through its dispatcher, page table and literal call: 0x0808790C -> 0x08205B24 -> 0x08B48890, then 0x08B491FE / literal 0x08B493B8 -> skill getter 0x08B4ED44. The older 0x08BAD890 copy also exists but is not selected by this page. Skill descriptions/icons are read at 0xB4FD00 / 0xB4FF00. The getter rebuilds six slots in private RAM (buffer 0x02026B90, cache 0x02026BB0). Actual saved-map replay returned Supply for Walter/Lionel, and Steal plus Locktouch for Zachary. Class level caps come from the table at 0xB2C020. The support table differs from retail and is read from ROM.

Range overlays still use base movement and weapon ranges; custom weapon locks and range-changing skills are not all modeled. No different zero-growth, reverse-recruitment or weapon-reversal patch is implicitly supported.

## Native prediction limitation

The native forecast-generation path reaches a malformed active skill hook: at CPU address 0x08B5E8F2, an LDR loads the literal at 0x08B5E934. This exact ROM stores 0x000000C1 there, where the following code expects an item-table address. The next access for item 9 is to protected BIOS address 0x0000020C at 0x08B5E8FA. The strict frozen RAM/ROM interpreter refuses that read. This is not an unsupported Thumb opcode.

The companion does not replace that literal, skip the hook, assume a BIOS/open-bus byte, or manufacture EXP/stat gains. Its Analysis module reports the unavailable status and reason, clears results, and retains ordinary RNG observation. A 20-update full generated-runtime fixture confirms the gate while Walter's native Supply skill still resolves. The game ROM itself is unchanged.

## Validation, 2026-10-29

- The real website builder produced a local ZIP and editable project: 255 character records, 127 class records, 1037 image operations, 28 Lua files, 11,142,997 ZIP bytes. The private input ROM's SHA-256 stayed unchanged.
- The exact ROM booted in the pinned local romdev/mGBA lab and reached its opening map through ordinary input. Its screenshot and EWRAM/IWRAM snapshots are private.
- The actual generated Lua ran for eight updates against those captured memories; Walter's name, class and ten raw numeric fields matched the ROM/RAM independently.
- 3 allied selections were replayed from the same captured RAM with private cursor fixtures, across Units/Map and invalid-selection clearing (18 additional updates). The harness checks that companion reads never change RAM. These are isolated fixtures, not a physical input acceptance check.
- Focused public tests cover wrong-ROM refusal, altered affinity tables, native chapter prefixes, dynamic avatar names and six-skill selection clearing.

Private reproducible evidence: `reports/fe-expansion-2026-10-29/classic-runtime-verification.json` and the private expansion workspace's `build/the-four-kings/` and `classic-builds/the-four-kings/`. Generated packages, images, ROMs and snapshots are ignored/private.

The full campaign, every battle/EXP/level-up/RNG option, live Preparations, physical Android rendering and touch/gamepad acceptance are **not validated by these checks**. The specific frozen Analysis fixtures do not establish every prediction path. This remains a development companion 0.1.0.

## Audit follow-up

Opening conditional Analysis outside a forecast now shows its explicit unavailable reason. Closing the popup clears that error state. This improves the existing gate; it does not enable unsupported prediction.

## Credits

The Four Kings and its game content belong to their authors and contributors. See the [author's project and credits](https://feuniverse.us/t/fe8-complete-fire-emblem-the-four-kings-4-11-24-update-now-with-weapon-reversal/7030). Pointer-discovery references include the [FEBuilderGBA engine definitions](https://github.com/FEBuilderGBA/FEBuilderGBA/tree/master/FEBuilderGBA); addresses were checked against this local ROM rather than trusted across revisions.
