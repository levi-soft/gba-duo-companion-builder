# English Preparations selection audit

All five experimental English companions remain version **0.1.0**.

| Profile | Preparations reader |
| --- | --- |
| FE7 English | Existing inherited FE7 reader; regression checked |
| FE8 Europe | Existing inherited FE8 reader; regression checked |
| FE6 T-EN | Added native FE6 roster and stat-screen selection |
| Project Ember | Inherits native FE6 selection |
| Project Ember Reverse Recruitment | Inherits Project Ember selection |

The native FE6 contract is shared through `game.preparations`, with addresses in
each base profile and unit validation through the existing FE6 memory adapter.
The adapter preserves FE6's 16-bit state and HP offset. No APK change is needed.

Native FE6 uses AtMenu process `0x08678E38`, roster `0x0200E6D4`, selected index
at process +0x30, roster count at +0x2D and active selection at +0x29. The
Preparations flag is bit 0x10 at `0x0202AA5C`. Stat-screen process `0x08677680`
uses the unit pointer at `0x02003114`. These contracts were checked against all
three exact ROMs and the primary fireemblem6j source. Unlike FE7/FE8, native FE6
does not store a 32-bit roster count at roster +0x100.

The reader permits living benched units, follows roster selection and gives the
stat screen priority. Invalid indexes/pointers, an inactive selection, or a
missing unit clear unit information rather than falling back to the map cursor.
Preparations does not apply stale map terrain bonuses or display a tactical map.

## Verification boundary

- Reader tests cover five profiles and their selection/invalid-state transitions.
- Full runtime fixtures cover 70 updates using ROM tables and captured unit RAM,
  with synthetic Preparations processes and no valid map. FE7's second unit is
  a cloned Lyn slot with different HP, not a captured second party member.
- The existing native Lua harness on Thor passed 90 updates across 15 scenarios
  (first unit, second unit, invalid selection for each profile), without RAM
  writes. Maximum measured update: 0.351 ms / 10,400 instructions.
- Ten Android host rendering cases passed: Units and Growth for each profile.
  These use fixture values, not a live Preparations session.

The user has not reached Preparations in these games. Actual Pick Units behavior
on the running games remains to be accepted when they reach that screen. These
tests establish the implemented reader and UI behavior, not full-game validation.
