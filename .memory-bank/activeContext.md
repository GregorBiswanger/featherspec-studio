# Active Context

Last updated: 2026-11-16
Current branch: main
Current phase: act

## Now
Implementing spec 0001 (workspace discovery), whole plan, stage by stage.

## Active Spec
- Spec: [0001-workspace-discovery-project-recognition.md](../.specs/active/0001-workspace-discovery-project-recognition.md) (In Progress, active)
- Plan: [0001-workspace-discovery-project-recognition.plan.md](../.specs/active/0001-workspace-discovery-project-recognition.plan.md) (In Progress, 9 steps, 5 stages; approved 2026-11-16)
- Current task: T-003 (T-001, T-002 done)
- Acceptance criteria in focus: AC-001…AC-004, AC-006

## Changed Recently
- Stage 1 (T-001, T-002): `npm run test:unit` exists (Vitest 5.1, vite 8.3); core verdicts, version line, `discoverWorkspace` and fixtures in `test/fixtures/`; 33 tests green.
- `/sdd-plan` 0001: plan written; spec revised for OP-005 (activation by `workspaceContains:AGENTS.md` + `.specs`, no `onStartupFinished`; Gregor 2026-11-16).
- `/sdd-setup`: Memory Bank seeded, architecture snapshot and preferences written in `AGENTS.md`.

## Decisions in Flight
- Vitest + vite approved as devDependencies for T-001 (Gregor, 2026-11-16).
- Spec 0001 open points OP-004, OP-006…OP-012 (non-blocking).

## Blockers / Questions
- None.

## Next
1. T-001, then through the plan (start signal given 2026-11-16: backlog → active done).
2. T-001 introduces `npm run test:unit` (see the plan).

## Validation
- Done: stage 1, `eslint`, `tsc` and `test:unit` (33 tests) green. Pending: stages 2–5. Known issues: none.
