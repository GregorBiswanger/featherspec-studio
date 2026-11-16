# Active Context

Last updated: 2026-11-16
Current branch: main
Current phase: plan

## Now
Plan for spec 0001 (workspace discovery) is written and awaits Gregor's review.

## Active Spec
- Spec: [0001-workspace-discovery-project-recognition.md](../.specs/backlog/0001-workspace-discovery-project-recognition.md) (Draft, backlog)
- Plan: [0001-workspace-discovery-project-recognition.plan.md](../.specs/backlog/0001-workspace-discovery-project-recognition.plan.md) (Not started, 9 steps, 5 stages; approved 2026-11-16)
- Current task: T-001 (after the start signal)
- Acceptance criteria in focus: AC-001…AC-004, AC-006

## Changed Recently
- `/sdd-plan` 0001: plan written; spec revised for OP-005 (activation by `workspaceContains:AGENTS.md` + `.specs`, no `onStartupFinished`; Gregor 2026-11-16).
- `/sdd-setup`: Memory Bank seeded, architecture snapshot and preferences written in `AGENTS.md`.

## Decisions in Flight
- Vitest + vite approved as devDependencies for T-001 (Gregor, 2026-11-16).
- Spec 0001 open points OP-004, OP-006…OP-012 (non-blocking).

## Blockers / Questions
- None.

## Next
1. Gregor reviews the plan; on the start signal: backlog → active (`/sdd-lifecycle`), then T-001.
2. T-001 introduces `npm run test:unit` (see the plan).

## Validation
- Done: nothing implemented yet. Pending: `test:unit` script (T-001). Known issues: none.
