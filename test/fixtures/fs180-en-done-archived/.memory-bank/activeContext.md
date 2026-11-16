# Active Context

Last updated: 2026-09-19
Current branch: main
Current phase: idle

## Now
No active spec. The first slice is delivered; the next one is not chosen yet.

## Active Spec
- None. Pick the next slice with `/sdd-specify`.

## Changed Recently
- Spec `0001` completed: [`.specs/done/0001-split-bill-with-tip.md`](../.specs/done/0001-split-bill-with-tip.md)
  (Implemented), plan archived as
  [`0001-split-bill-with-tip.2026-09-19.plan.md`](../.specs/plan-archive/0001-split-bill-with-tip.2026-09-19.plan.md)
  — the tip-splitting HTTP service (`src/split.js`, `src/server.js`) with all 20 acceptance
  criteria verified.

## Decisions in Flight
- None. Long-lived decisions live in `systemPatterns.md` (`arch-cents-001`,
  `arch-json-numbers-001`).

## Blockers / Questions
- None.

## Next
1. Choose the next slice and run `/sdd-specify` — `.specs/backlog/` is empty.
2. Candidates deferred by spec `0001`'s *Out of scope*: tip as an absolute amount, unequal
   shares, a user interface.

## Validation
- Done: `npx eslint .` exit 0 with no output; `node --test` 37 pass / 0 fail / 0 skipped
  (2026-09-19, at the lifecycle move).
- Known issues: none. npm reports `eslint@9.39.5` as past its support window — a bump is an
  Ask-first dependency change, deliberately not made.
