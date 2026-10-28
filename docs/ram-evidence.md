# Exact-ROM evidence replay

To check a recorded prediction against the game's actual post-combat unit RAM,
use the independent [battle outcome runner](battle-outcomes.md).

Studio's Device inspector can record labeled RAM states and export
`*.ram-evidence.json` (format `gba-duo-ram-evidence`, version 1). Its offline
inspector and this runner consume the same wire contract. The portable parser
in `scripts/ram-evidence.mjs` mirrors Studio's `ram-evidence.js`; only its
JSDoc type import differs. Keep their wire behavior synchronized.

Run from this checkout:

```sh
node scripts/replay-evidence.mjs /private/case/replay-config.json
```

Example private configuration (paths resolve relative to the config):

```json
{
  "evidence": "game.ram-evidence.json",
  "project": "prepared-project.json",
  "rom": "my-game.gba",
  "samples": {
    "Map": {"steps": [{"ticks": 12, "ui": {"mainTab": "Map"}, "expect": {"unitPresent": true}}]},
    "Analysis": {"steps": [{"ticks": 45, "ui": {"predictionPopup": true}, "expect": {"predictionComplete": true}}]}
  },
  "report": "replay-report.json"
}
```

Expected fields depend on the actual companion. Each named sample starts a
fresh isolated Lua state. `ui` and ordered steps exercise companion behavior
on that frozen RAM, not game input. Samples without configuration run three
ticks and produce a fingerprint only; the report's `expectedFields` states
how many semantic assertions were actually made. Tick counts are bounded to
1000 per sample. RAM patches and focus actions are rejected in this runner;
the older runtime-validation tool remains available for isolated experiments.

The runner computes the ROM's game code/CRC32 before Lua execution and checks
both the evidence and project's exact match filters. It rejects malformed,
truncated, overlapping and out-of-RAM ranges, noncanonical base64 and mixed
ROM/session/pack sets. The 8 MiB file limit holds up to 16 samples of the two
RAM regions (288 KiB each). Reports contain ROM, evidence and project SHA-256,
per-sample output hashes, semantic assertion counts and final values.

Real ROMs, prepared projects, capture data, observation packets and reports
must remain in a private workspace. Public tests use synthetic byte streams.
No test dependency was added: deterministic seeded property checks exercise
byte preservation, identity rejection, actual ROM-pointer bounds and actual
LZ77 decoding/truncation. Test seeds are fixed in the test files.

Evidence captures RAM at one frame; separately obtained companion output may
refer to an older dataFrame. Choose stable observations and record that gap.
A passing replay characterizes the captured state and specified fields. It
does not prove a whole-game playthrough, actual level-up outcome, full emulator
state restoration or graphics rendering. Preserve each hack's own growth/RNG
rules and repeat native-device validation when adding or changing profiles.
