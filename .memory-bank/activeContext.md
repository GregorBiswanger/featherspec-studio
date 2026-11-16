# Active Context

Last updated: 2026-11-16
Current branch: main
Current phase: act

## Now
Spec 0002 (spec repository & parser): stage 1 (T-001) built; stage 2 (T-002 ‖ T-004) is with other agents, waiting for Gregor. Spec 0001 (workspace discovery): the delta after the first `/sdd-compile` (NOT READY, unverified) is implemented (T-010…T-012). Waiting for the open evidence (host suite, AC-009, AC-022), then `/sdd-compile` again.

## Active Spec
- Spec: [0001-workspace-discovery-project-recognition.md](../.specs/active/0001-workspace-discovery-project-recognition.md) (In Progress, active)
- Plan: [0001-workspace-discovery-project-recognition.plan.md](../.specs/active/0001-workspace-discovery-project-recognition.plan.md) (Done, 12 of 12 steps ticked; T-010…T-012 appended 2026-11-16)
- Current task: none; all steps ticked.
- Spec: [0002-spec-repository-parser.md](../.specs/active/0002-spec-repository-parser.md) (In Progress, active)
- Plan: [0002-spec-repository-parser.plan.md](../.specs/active/0002-spec-repository-parser.plan.md) (In Progress, 1 of 9 steps ticked)
- Current task: stage 2 T-002 ‖ T-004 (parallel workers, other agents).
- Acceptance criteria in focus: AC-009, AC-013, AC-019, AC-022 (built, open evidence in the plan's *Open evidence* section).

## Changed Recently
- Spec 0001 changed after `/sdd-compile` (Gregor): AC-016/AC-017 revised (hint only for folders without a marker; read error names the path that failed; OP-004 resolved), version line must start the line (spec §15, named by tests), new AC-023 + A-006 (`onDidChangeActiveProject` on the discovery controller, for 0002 and 0004). Plan extended T-010…T-012. 122 unit tests.
- Spec 0002 started (Gregor approved the plan 2026-11-16): moved to `active/`; T-001 done: `src/core/ports/specSource.ts`, `src/adapters/node/nodeSpecSource.ts`, `src/core/specs/{files,text,diagnostics,fieldValue}.ts`, fixtures `fs180-*`, `fs170-brownfield-mixed`, `fs-broken`; 137 unit tests green. Plan T-008 text adjusted to `onDidChangeActiveProject`.
- Spec 0001 implemented (T-001…T-009): core in `src/core/{ports,discovery}`, adapters in `src/adapters/{node,vscode}`, composition in `src/extension.ts`, fixtures in `test/fixtures/`, `.github/workflows/ci.yml`, README, `architecture:` snapshot.
- Checks: `npx eslint src --max-warnings 0`, `npx tsc --noEmit`, `npm run test:unit` (106 tests), `npm run compile` green; `npm test` not run here (VS Code download blocked).
- `/sdd-plan` 0001: spec revised for OP-005 (activation by `workspaceContains:AGENTS.md` + `.specs`, no `onStartupFinished`; Gregor 2026-11-16).
- `/sdd-setup`: Memory Bank seeded, architecture snapshot and preferences written in `AGENTS.md`.

## Decisions in Flight
- 0002: feed via `onDidChangeActiveProject` (answered, plan adapted); symbolic links not followed (A-006 confirmed); parallel stages run with other agents.
- Spec 0001 open points OP-006…OP-012 (non-blocking); OP-004 resolved.
- `AGENTS.md` is 213 lines (target 200): one eviction proposal is due at the next natural edit.

## Blockers / Questions
- None.

## Next
1. Gregor/CI (open evidence in the 0001 plan): `npm test` smoke suite (also proves the `workspaceContains:.specs` directory assumption); manual checks AC-009 (reload) and AC-022 (Restricted Mode).
2. `/sdd-compile` in a fresh session (another model family), then `/sdd-lifecycle` → done.
3. 0002: Gregor starts the stage 2 workers (T-002, T-004) and says when they are back; then the main session integrates, and stage 3 (T-003 ‖ T-005) follows.

## Validation
- Done: eslint, tsc, `test:unit` (122 tests) and `compile` green. Pending: `npm test` on CI or Windows, manual AC-009 and AC-022. Known issues: none.
