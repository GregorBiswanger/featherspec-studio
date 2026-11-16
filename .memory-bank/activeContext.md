# Active Context

Last updated: 2026-11-16
Current branch: main
Current phase: act

## Now
Spec 0001 (workspace discovery): the delta after the first `/sdd-compile` (NOT READY, unverified) is implemented (T-010…T-012). Waiting for the open evidence (host suite, AC-009, AC-022), then `/sdd-compile` again.

## Active Spec
- Spec: [0001-workspace-discovery-project-recognition.md](../.specs/active/0001-workspace-discovery-project-recognition.md) (In Progress, active)
- Plan: [0001-workspace-discovery-project-recognition.plan.md](../.specs/active/0001-workspace-discovery-project-recognition.plan.md) (Done, 12 of 12 steps ticked; T-010…T-012 appended 2026-11-16)
- Current task: none; all steps ticked.
- Spec 0004: [spec](../.specs/active/0004-runtime-persistence-event-model.md) / [plan](../.specs/active/0004-runtime-persistence-event-model.plan.md) (branch `spec-0004`, all steps ticked; `/sdd-compile` pending, AC-020 needs Gregor).
- Acceptance criteria in focus: AC-009, AC-013, AC-019, AC-022 (built, open evidence in the plan's *Open evidence* section).

## Changed Recently
- Spec 0001 changed after `/sdd-compile` (Gregor): AC-016/AC-017 revised (hint only for folders without a marker; read error names the path that failed; OP-004 resolved), version line must start the line (spec §15, named by tests), new AC-023 + A-006 (`onDidChangeActiveProject` on the discovery controller, for 0002 and 0004). Plan extended T-010…T-012. 122 unit tests.
- `/sdd-plan` 0002: [plan](../.specs/backlog/0002-spec-repository-parser.plan.md) written (9 steps, 5 stages; Not started); spec revised for PD-043 (AC-023, modification time as file fact) and A-006 (symbolic links not followed, OP-005).
- Spec 0001 implemented (T-001…T-009): core in `src/core/{ports,discovery}`, adapters in `src/adapters/{node,vscode}`, composition in `src/extension.ts`, fixtures in `test/fixtures/`, `.github/workflows/ci.yml`, README, `architecture:` snapshot.
- Checks: `npx eslint src --max-warnings 0`, `npx tsc --noEmit`, `npm run test:unit` (106 tests), `npm run compile` green; `npm test` not run here (VS Code download blocked).
- `/sdd-plan` 0001: spec revised for OP-005 (activation by `workspaceContains:AGENTS.md` + `.specs`, no `onStartupFinished`; Gregor 2026-11-16).
- Spec 0004 (runtime persistence) built on branch `spec-0004`: T-001…T-008 in [plan](../.specs/active/0004-runtime-persistence-event-model.plan.md); `src/core/runtime`, `src/adapters/node/fileRuntimeMedium.ts`, `docs/runtime-data.md`; 258 unit tests green, host smoke pending (CI).

## Decisions in Flight
- 0002 plan open decision 'feed via `StatusBarPort` decorator vs. an event on 0001's controller' is answered: use `onDidChangeActiveProject` (0001 AC-023). The 0002 plan is not edited here; its owner session adapts it.
- Spec 0001 open points OP-006…OP-012 (non-blocking); OP-004 resolved.
- `AGENTS.md` is 213 lines (target 200): one eviction proposal is due at the next natural edit.

## Blockers / Questions
- None.

## Next
1. Gregor/CI (open evidence in the 0001 plan): `npm test` smoke suite (also proves the `workspaceContains:.specs` directory assumption); manual checks AC-009 (reload) and AC-022 (Restricted Mode).
2. `/sdd-compile` in a fresh session (another model family), then `/sdd-lifecycle` → done.
3. Gregor reviews the 0002 plan; T-001 only on an explicit start signal.
4. Spec 0004: Gregor reads `docs/runtime-data.md` (AC-020, closes T-008); `npm test` on CI/Windows; then `/sdd-compile` in a fresh session.

## Validation
- Done: eslint, tsc, `test:unit` (122 tests) and `compile` green. Pending: `npm test` on CI or Windows, manual AC-009 and AC-022. Known issues: none.
