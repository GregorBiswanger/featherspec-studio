# Active Context

Last updated: 2026-11-16
Current branch: main
Current phase: act

## Now
Spec 0001 (workspace discovery) is fully implemented; waiting for the pre-done gates and `/sdd-compile`.

## Active Spec
- Spec: [0001-workspace-discovery-project-recognition.md](../.specs/active/0001-workspace-discovery-project-recognition.md) (In Progress, active)
- Plan: [0001-workspace-discovery-project-recognition.plan.md](../.specs/active/0001-workspace-discovery-project-recognition.plan.md) (Done, 9 of 9 steps ticked)
- Current task: none; all steps ticked.
- Acceptance criteria in focus: AC-009, AC-013, AC-019, AC-022 (built, decided at the pre-done gate).

## Changed Recently
- `/sdd-plan` 0002: [plan](../.specs/backlog/0002-spec-repository-parser.plan.md) written (9 steps, 5 stages; Not started); spec revised for PD-043 (AC-023, modification time as file fact) and A-006 (symbolic links not followed, OP-005).
- Spec 0001 implemented (T-001…T-009): core in `src/core/{ports,discovery}`, adapters in `src/adapters/{node,vscode}`, composition in `src/extension.ts`, fixtures in `test/fixtures/`, `.github/workflows/ci.yml`, README, `architecture:` snapshot.
- Checks: `npx eslint src --max-warnings 0`, `npx tsc --noEmit`, `npm run test:unit` (106 tests), `npm run compile` green; `npm test` not run here (VS Code download blocked).
- `/sdd-plan` 0001: spec revised for OP-005 (activation by `workspaceContains:AGENTS.md` + `.specs`, no `onStartupFinished`; Gregor 2026-11-16).
- `/sdd-setup`: Memory Bank seeded, architecture snapshot and preferences written in `AGENTS.md`.

## Decisions in Flight
- 0002 plan open decisions: 0001 feed via `StatusBarPort` decorator (no 0001 change) vs. an `onDidReport` event on 0001's controller; A-006 / OP-005.
- Spec 0001 open points OP-004, OP-006…OP-012 (non-blocking).
- `AGENTS.md` is 213 lines (target 200): one eviction proposal is due at the next natural edit.

## Blockers / Questions
- None.

## Next
1. Gregor/CI: `npm test` smoke suite (also proves the `workspaceContains:.specs` directory assumption); manual checks AC-009 (reload) and AC-022 (Restricted Mode).
2. `/sdd-compile` in a fresh session (another model family), then `/sdd-lifecycle` → done.
3. Gregor reviews the 0002 plan; T-001 only on an explicit start signal.

## Validation
- Done: eslint, tsc, `test:unit` (106 tests) and `compile` green. Pending: `npm test` on CI or Windows, manual AC-009 and AC-022. Known issues: none.
