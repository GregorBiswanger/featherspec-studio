# Plan — Parallel demo

**Spec:** [0001-parallel-demo.md](0001-parallel-demo.md)
**Status:** Blocked
**Last updated:** 2026-11-10
**Current step:** T-003 ‖ T-004

## Approach

Two independent modules joined by one entry point.

**Quality gates:** `npm run lint` · `npm test`

## Research

- None needed.

## Stages

1. T-001 → T-002 — shared types, then the entry point
2. T-003 ‖ T-004 — add and subtract: separate modules and tests
3. T-005 — docs sync

Parallel: stage 2 (add vs. subtract: separate files).

## Steps

### T-001 — Shared types

- **Covers:** AC-001
- **Do:** types.
- **Verify:** `npm test`
- [x] **Verified (T-001):** 2026-11-09 · `npm test` green
- **Notes:** —

### T-002 — Entry point

- **Covers:** AC-001, AC-002
- **Do:** entry.
- **Verify:** `npm test`
- [x] **Verified (T-002):** 2026-11-09 · `npm test` green
- **Notes:** —

### T-003 — Add

- **Covers:** AC-001
- **Files:** `src/add.ts`, `src/add.test.ts`
- **Do:** add.
- **Verify:** `npm test -- add`
- [ ] **Verified (T-003):** —
- **Notes:** —

### T-004 — Subtract

- **Covers:** AC-002
- **Files:** `src/subtract.ts`, `src/subtract.test.ts`
- **Do:** subtract.
- **Verify:** `npm test -- subtract`
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Docs sync

- **Covers:** AC-001, AC-002
- **Do:** docs.
- **Verify:** `npm test`
- [ ] **Verified (T-005):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-003 | `src/add.ts` | `src/add.test.ts` — adds | built |
| AC-002 | T-002, T-004 | — | — | open |
| AC-003 | T-005 | `README.md` | manual: read by the product owner, 2026-11-10 | verified |

## Session handoff

- **Done so far:** T-001, T-002.
- **Next action:** T-003 ‖ T-004 with other agents.
- **Open decisions:** —
- **Baseline:** abc1234
- **Environment:** Node 22.
