# Void's Blitzarre Adventure — 0.1.0

> Release status: finalized as companion **1.0.0** in public Builder **1.1.0**. The notes below preserve the earlier 0.1.0 development evidence and its historical registration/version status. See [current release scope](RELEASE-1.1.0.md).


Exact experimental ROM: **BE8E / 9D22107C**, 18,641,452 bytes. Read from the
user's enabled Studio connection. This profile is independent of the original
FE8 US profile; it does not match other patches or releases by title alone.

## Builder and organization

The profile inherits the English FE8 UI, unit readers, Map, Growth, Analysis,
Preparations and Forecast popup lifecycle. Its authored overrides are
`runtime/voids-blitzarre/game.abilities.lua` and `game.execution.lua`.
The six-slot skill panel extends the existing ability component rather than
duplicating the shared layout. It retains the original combined Str/Mag model.

`site/profiles/voids-blitzarre/prepare.js` extracts skill names, descriptions and
16×16 icons from the user's ROM before the common builder serializes Lua tables.
The same builder produces the complete format-2 ZIP. No output ZIP is patched.
Chapter labels are separated from the ROM's own numbered titles: the hack's
chapter order differs from FE8, so chapter 11 is identified from its native
`11: Factory Gold` title rather than its table index. Prologue is shown once.

Skill reading matches this ROM's native getter: personal skill, class skill,
then four learned BWL skills for character IDs up to 0x46, or the class level
list for generic characters. Six slots are cleared on identity changes or
invalid selection. Unknown skill IDs remain visible as a fallback label.

Talk reuses the Remastered sprite badge/detail component with English prompts.
The builder extracts 49 chapter Talk records from this exact ROM; the shared
`game.talk.lua` reader checks live temporary/permanent event flags, direction and
target field presence. It matches the native GetTalkee binary at 08B57094. The
current prologue has no Talk records. Native-getter parity covers all 16 units
in captured RAM and a private chapter-1 Void-to-Anna fixture; this does not claim
that a conversation was performed in the running game.

The manifest uses the inherited `fe8-us` cursor contract. No APK change or
application installation is required. Version remains **0.1.0** pending live
acceptance and finalization. The public catalogue still lists only the three
stable Vietnamese profiles; this development profile requires private
registration with the builder. Builder version remains **1.0.0**.

## Exact-ROM execution

The hack patches combat and level-up routines, so its original FE8 identity
alone is insufficient evidence of compatibility. The skill getter, description
getter, icon reader and stat-screen binaries were matched to the original
[CCB source](https://github.com/FireEmblemUniverse/CCB_Round1).

Its NosferaFix contains a non-drain path with r3=4 which attempts a byte store
to BIOS address 9. mGBA ignores that store. The private bounded Thumb evaluator
normally rejects all such addresses. A profile-local hook eliminates only the
three dead instructions at 08B5A7EE–08B5A7F2 when r3=4 and six opcode guards
match. r2 is overwritten before use and the intervening comparison replaces
the arithmetic flags. Valid RAM drain paths execute unchanged. Combat, skill
and RNG routines are still executed; unsupported code continues to fail closed.
The shared evaluator accepts guarded ROM redirects without broadening its
memory permissions. The hook is copied to every prediction phase and combined
with the existing conditional EXP hooks.

## Validation and remaining limits

Captured Forecast resolves Void / Lord, Aether, Shove, Bond and
**Prologue: IT BEGINS**. Conditional damage/defeat EXP is **10 / 28** for this
encounter. Captured and EXP-99 private copies, including a normal-battle variant,
complete without errors. Near-level copies produce Skill +1, Spd +1, Res +1.
They do not alter game RAM or establish natural level-up accuracy across the hack.

Preparations coverage includes Void/Tim selection, invalid and dead units,
benched coordinates, stat-screen priority and returning from the selection
screen. These are replay fixtures; live Pick Units acceptance is still pending.
The Thor native Lua replay covers 336 updates with unchanged fixture RAM.
Host rendering covers Units, Map, Growth, Analysis, two preparation selections,
skill details, a six-slot fixture and the Talk badge/detail. This is host renderer validation, not a
claim that the user has tested those interactions in the game.

After the initial import, live Studio data exposed intermittent 25-ms script
timeouts in Map/Units, which caused blank companion snapshots and visible
flicker. The shared FE8 map now reads every terrain/occupancy cell once, shares
those rows with connectivity and tactical ranges, reuses a single immutable tile
lookup and avoids temporary neighbour arrays. No time limit was raised and no
errors were hidden. Old/new captured outputs of all nine earlier companions are
identical. A replay of the reported free-cursor state covers 750 new-version
native updates, including Danger mode; ordinary tick instructions drop from
99,000 to 76,600. Full-emulator live verification after reimport is still needed:
native Lua replay does not include UI/core contention.

**Map range overlays currently use base movement and weapon ranges. They do not
include range-changing skills, movement rallies or skill-specific terrain
effects.** The Map page states this limitation. Map positions, roster, chapter
title and victory condition use the actual ROM/RAM. The UI stat card displays
the inherited base unit statistics; it does not claim every temporary skill
modifier. Native Forecast combat values are read from the game's battle data.
No separate Mag stat is invented. No scroll items were found in this exact
ROM's item table under the native scroll attribute/pointer contract.

Prediction coverage is limited to tested paths. Other skills, enemies, weapons,
chapters, difficulties and natural level-ups need live validation before 1.0.0.
ROM captures, extracted text/images and generated Local ZIPs remain private.

## Credits

[Void's Blitzarre Adventure / FEU Chapter Creation Blitz contributors](https://feuniverse.us/t/feu-chapter-creation-blitz-voids-blitzarre-adventure/2629)
created the hack. The original CCB repository and its Skill System source retain
their contributor credits. FEBuilderGBA supplied address-map references, checked
against this ROM. Original emulator/companion provenance and third-party notices
remain in [CREDITS.md](../CREDITS.md).
