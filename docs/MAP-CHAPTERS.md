# Map chapter header audit

The eight companion profiles share chapter-header formatting through
`runtime/shared/presentation.chapter.lua`. Existing nonempty names are preserved.
Blank, whitespace-only or missing text falls back to a chapter label instead of
an empty header. FE7 keeps its prepared full titles; FE8 keeps its numbered title
format. The FE6 Remastered Vietnamese profile uses its existing FE8-based reader.

Native FE6 T-EN, Project Ember and Reverse Recruitment have blank main-story title
text records in these exact ROMs. FE6's graphical title path and its independent
chapter display number/gaiden bit are documented in the primary decompilation:
[title graphics](https://github.com/FireEmblemUniverse/fireemblem6j/blob/main/src/chapter_title.c),
[ChapterInfo fields](https://github.com/FireEmblemUniverse/fireemblem6j/blob/main/include/unknown_types.h),
[internal map IDs](https://github.com/FireEmblemUniverse/fireemblem6j/blob/main/include/constants/chapters.h).

`site/fe6-rom.js` now prepares a label from record +0x3E: the upper seven bits are
the display number, bit zero marks a gaiden chapter. Thus internal map 0x1A is
Ch. 10 and map 0x25 is Ch. 20x, not chapters 26 and 37. Native tutorial, final,
link-arena and trial map IDs receive their appropriate labels. Existing text names,
including the different trial names in Reverse Recruitment, remain ROM-derived.
The English profiles also load `site/profiles/fe6-english/chapter-titles.js`: a
verified transcription indexed by graphical title ID (+0x0E). All 44 decompressed
title graphics were compared across FE6 T-EN and both Ember ROMs and match. The
main-story names were checked against those graphics. For example the generated
header is `Ch. 1: Dawn of Destiny`, not merely `Ch. 1`. Alternate-route names use
their distinct graphic IDs. Nonempty ROM text takes precedence, preserving the
different Trial Map names in Reverse Recruitment. Link Arena's `NO DATA` graphic
does not become a chapter name.

This is preparation logic in the builder, not an after-export ZIP edit. The
exact-ROM producers pass the shared name metadata to `FE6RomPrep.prepare`. Missing
name metadata fails before extraction instead of quietly generating numbers-only
packs. An end-to-end check loads the generated builder distribution ZIP, supplies
the experimental profiles, builds from each actual local ROM through
`CompanionBuild.build`, then reads chapter names from the emitted ZIP's Lua data.
Those three ZIPs are retained byte-for-byte as emitted by the builder.

The public catalogue remains the three stable Vietnamese profiles; the five
English profiles remain development profiles. This change does not promote or
publish them automatically.

## Checks and limits

- All 512 prepared chapter records across the eight profiles yield nonempty headers.
- Captured-RAM fixtures pass 216 updates covering current maps, alternate IDs,
  gaiden chapters, trial maps and an unknown ID. All outputs outside `mapChapter`
  are identical to the previously delivered packs; fixture RAM remains unchanged.
- The native Lua harness on Thor passes 48 updates with valid map headers across
  all eight profiles, without RAM writes. These are replayed captures, not live
  navigation through every chapter.
- Automated unit checks cover empty/missing titles, numbering and gaiden flags.
- Eight Android host render cases pass, one Map header per profile. The FE6
  T-EN and FE8 Vietnamese renders were also visually inspected. These renders
  use captured fixture values, not a live game session.

The three Vietnamese companions stay 1.0.0; the five English companions stay
experimental 0.1.0. Builder stays 1.0.0. No APK change is required for this fix;
existing cursor metadata and Preparations support are retained. Live acceptance
of these newly packaged headers remains pending.
