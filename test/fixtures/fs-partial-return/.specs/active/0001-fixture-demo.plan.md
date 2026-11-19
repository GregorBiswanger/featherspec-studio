# Plan — Fixture demo

**Spec:** [0001-fixture-demo.md](0001-fixture-demo.md)
**Status:** In Progress
**Last updated:** 2026-11-19
**Current step:** T-004 ‖ T-005

## Approach

Small synthetic plan for Studio tests (12 A-3).

**Quality gates:** `npm run lint` · `npm test`

## Research

- None needed.

## Stages

1. T-001 → T-002 → T-003
2. T-004 ‖ T-005 — separate modules
3. T-006 — docs sync

Parallel: stage 2 (T-004 ‖ T-005: separate files).

## Steps

### T-001 — Types

- **Covers:** AC-001
- **Do:** types.
- **Verify:** `npm test`
- [x] **Verified (T-001):** 2026-11-18 · `npm test` green
- **Notes:** —

### T-002 — Entry point

- **Covers:** AC-002
- **Do:** entry point.
- **Verify:** `npm test`
- [x] **Verified (T-002):** 2026-11-18 · `npm test` green
- **Notes:** —

### T-003 — Wiring

- **Covers:** AC-001
- **Do:** wiring.
- **Verify:** `npm test`
- [x] **Verified (T-003):** 2026-11-18 · `npm test` green
- **Notes:** —

### T-004 — Add

- **Covers:** AC-002
- **Files:** `src/s4.ts`, `src/s4.test.ts`
- **Do:** add.
- **Verify:** `npm test`
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Subtract

- **Covers:** AC-001
- **Files:** `src/s5.ts`, `src/s5.test.ts`
- **Do:** subtract.
- **Verify:** `npm test`
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Docs sync

- **Covers:** AC-002
- **Do:** docs sync.
- **Verify:** `npm test`
- [ ] **Verified (T-006):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | `src/s1.ts` | `src/s1.test.ts` | built |
| AC-002 | T-002 | — | — | open |

## Session handoff

- **Done so far:** T-001, T-002.
