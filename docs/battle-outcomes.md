# Verify a prediction against a real battle

`replay-evidence.mjs` checks companion output on frozen RAM. It is not an
independent oracle for the game's EXP/growth formulas. Use the outcome runner
to compare a prediction recorded **before combat** with the actual map-unit
record captured **after combat**:

```sh
node scripts/check-battle-outcome.mjs /private/battle-case.json
```

The runner does not execute the companion or infer stats from its display.
It reads the captured RAM using an explicit, verified per-ROM unit layout.
Supply a local ROM; its actual game code/CRC32 must match the case/evidence.
Store the ROM, evidence, case, observed prediction and report privately.

## Capture procedure

1. Use an exact supported ROM. Open one Forecast/Analysis, wait for the result,
   record the prediction/seed and capture RAM. Verify that its unit identity,
   level, EXP and base stats agree with that capture.
2. Fix the expected EXP branch and final stats before reading the outcome.
   For a conditional EXP display, record whether the selected expectation is
   damage, kill or no-damage. Do not derive the expected values from the result.
3. Confirm that same combat without changing weapon, opponent or RNG. Return to
   map and capture again before another action. Loading another state invalidates
   this pair, even when it appears to contain the same unit.
4. Put both captures into a `gba-duo-ram-evidence` document with distinct labels.
   Provide actual map-unit addresses for the actor and target, not the temporary
   battle-unit copies (those may already contain simulated values in Forecast).
5. Run the oracle. A valid mismatching case produces a report and exit code 1;
   malformed or ambiguous cases fail before comparison.

## Case shape

The following is a synthetic layout example, not a memory map for any game:

```json
{
  "rom": "my-game.gba",
  "evidence": "battle.ram-evidence.json",
  "match": {"gameCode": "TEST", "crc32": "12345678"},
  "before": "Before",
  "after": "After",
  "expPerLevel": 100,
  "unit": {
    "address": 33554432,
    "fields": {
      "characterPointer": {"offset": 0, "type": "u32"},
      "classPointer": {"offset": 4, "type": "u32"},
      "deployment": {"offset": 11, "type": "u8"},
      "level": {"offset": 8, "type": "u8"},
      "exp": {"offset": 9, "type": "u8"},
      "hp": {"offset": 19, "type": "u8"},
      "maxHp": {"offset": 18, "type": "u8"},
      "power": {"offset": 20, "type": "u8"}
    }
  },
  "expected": {
    "expGain": 8,
    "before": {"level": 7, "exp": 97, "maxHp": 23, "power": 14},
    "stats": {"maxHp": 23, "power": 15}
  },
  "report": "outcome-report.json"
}
```

The six required named fields are characterPointer, classPointer, deployment,
level, exp and hp. Add the actual persistent stat fields for that ROM, including
separate magic where appropriate. Use **maximum HP**, not current combat HP,
when checking an HP growth prediction. Types are u8/u16/u32/s8/s16/s32.

Add `target` with the same `{address, fields}` structure and
`expected.condition` to assert `kill`, `damage` or `no-damage`. A target is
defeated when its final HP is zero (a cleared dead slot is accepted); a living
target must retain its identity. Damage means final HP decreased while alive.
Add `guards: [{name, address, type, value}]` for a chapter or other stable
context field that must agree in both samples.

## Limits and interpretation

- Intended for one ordinary combat, a surviving actor, no class change and at
  most one level-up. EXP sentinels/cap behavior, promotions, chained battles,
  revived/reused slots and ambiguous save-state branches are rejected.
- Inferring the damage branch from final HP is unsuitable when the target
  heals/drains during combat. Use separately observed battle events for those
  mechanics; do not relabel a failed comparison as a pass.
- Identity, samples, exact-ROM filter and read bounds are validated. Frame
  order catches a visible rewind but cannot prove no reload or other input
  occurred: preserve the operator's procedure/recording in the private case.
- Reports include actual raw-unit values, expected values, each check and
  SHA-256 for ROM, evidence, case configuration and oracle source.
- Correctness is established per recorded case. Do not extrapolate one random
  growth case to Fixed/0%/100%, other RNG styles, hacks or ROM revisions.
