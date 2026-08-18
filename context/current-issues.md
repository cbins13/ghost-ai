# Current Issues

None open.

## Recently resolved

- **Design agent produced no canvas output** (run `run_06g1592qa2q38cu4o721lav701`, Aug 18 2026).
  Symptom: the run completed "successfully" with `applied: 0` after logging
  `Design agent plan rejected validation`; nothing appeared on the canvas.
  Cause: `z.discriminatedUnion` in the plan schema serializes to JSON Schema
  `anyOf`, which Gemini's structured output does not enforce — the model ignored
  the schema and emitted its own action vocabulary. Fixed in
  `src/trigger/design-agent.ts` by replacing the union with one dense array per
  action kind. See the progress tracker for the full write-up.
