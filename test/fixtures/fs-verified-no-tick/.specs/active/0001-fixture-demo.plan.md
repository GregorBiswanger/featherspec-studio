# Plan — Fixture demo

**Spec:** [0001-fixture-demo.md](0001-fixture-demo.md)
**Status:** In Progress
**Last updated:** 2026-11-19
**Current step:** T-003

## Approach

Small synthetic plan for Studio tests (12 A-3).

**Quality gates:** `npm run lint` · `npm test`

## Research

- None needed.

## Stages

1. T-001 → T-002
2. T-003 → T-004
3. T-005 — docs sync

No parallel stage: every step builds on the one before.

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

### T-003 — Add

- **Covers:** AC-001
- **Do:** add.
- **Verify:** `npm test`
- [ ] **Verified (T-003):** 2026-11-19 · `npm test` green
- **Notes:** —

### T-004 — Subtract

- **Covers:** AC-002
- **Do:** subtract.
- **Verify:** `npm test`
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Docs sync

- **Covers:** AC-001
- **Do:** docs sync.
- **Verify:** `npm test`
- [ ] **Verified (T-005):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | `src/s1.ts` | `src/s1.test.ts` | built |
| AC-002 | T-002 | — | — | open |

## Session handoff

- **Done so far:** T-001, T-002.
