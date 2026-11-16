# System Patterns

## Architectural style

See the `architecture:` snapshot in `AGENTS.md` — the only home of structure facts. This file
holds the *why*: decisions and patterns.

## Key decisions

- Layered split: a thin HTTP layer over a pure calculation core, so the fairness rules can be
  unit-tested without a server · 2026-09-19 · source: `/sdd-setup` · provenance: human (sdd-setup)
- Standard library only — `node:http` instead of a framework, `node:test` instead of a test
  library — to keep a tiny service dependency-free and free of a build step · 2026-09-19 ·
  source: `/sdd-setup` · provenance: human (sdd-setup)
- ESM via `"type": "module"`; no CommonJS · 2026-09-19 · source: `/sdd-setup` ·
  provenance: human (sdd-setup)
- No persistence: each request is answered from its own input alone · 2026-09-19 ·
  source: `/sdd-setup` · provenance: human (sdd-setup)

## Patterns

- **Pure core, impure edge:** `src/split.js` performs no I/O and knows nothing about HTTP;
  `src/server.js` parses and validates input, calls the core, and formats the response.
- **Test-first:** new behaviour starts as a failing test against a `Not implemented` stub;
  the working mode is recorded in *Style & Output Preferences* in `AGENTS.md`.
- **Money rounding is a rule, not an afterthought:** per-person amounts must sum back to the
  billed total including tip — the deciding tests live with the core. Now visible in the code,
  so the *why* moved to the knowledge record `arch-cents-001` below.

## Knowledge records

> *Observation* = what the code does, with a path to check it. *Reason* = why it was built that
> way. `decided` = a trusted source says so, and the source is named. `unknown` = nobody wrote it
> down; a normal, permanent state, not a defect. `candidates` = explanations found somewhere that
> prove nothing. `conflict` = two trusted sources disagree, and neither was chosen.

### All money is computed in integer cents; no amount is ever held as a fractional number

```yaml
fs-knowledge:
  id: arch-cents-001
  evidence: [src/split.js, src/split.js:decimalToFraction, src/split.js:divideRoundHalfUp]
  rationale:
    state: decided
    statement: 'Binary floating point cannot keep a cent-exact sum: the tip must round once and the
      per-person amounts must add back to bill plus tip with no cent lost or invented.'
    provenance:
      type: human
      role: product owner
      origin: stated
      confirmedAt: 2026-09-19
```

### The service answers with cent-exact JSON numbers, never with formatted strings

```yaml
fs-knowledge:
  id: arch-json-numbers-001
  evidence: [src/server.js:handleSplit, src/split.js:fromCents]
  rationale:
    state: decided
    statement: 'Every input rule is judged on the numeric value received, so the answer is
      symmetric: 16.5 and "16.50" are the same amount, and a string would invent a formatting
      contract the service does not own.'
    provenance:
      type: human
      role: product owner
      origin: suggested
      confirmedAt: 2026-09-19
```
