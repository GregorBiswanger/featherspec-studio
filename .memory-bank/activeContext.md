# Active Context

Last updated: 2026-11-16
Current branch: main
Current phase: act

## Now
Specs 0001 (workspace discovery), 0002 (spec repository & parser) and 0004 (runtime persistence & event model) are implemented, their plans are Done. They await the host suite (`npm test`) on CI and `/sdd-compile` in a fresh session. Spec 0003 is in progress (plan approved by Gregor; stages 1-2 of 4 done, T-001...T-004).

## Active Spec
- Spec 0001: [spec](../.specs/active/0001-workspace-discovery-project-recognition.md) / [plan](../.specs/active/0001-workspace-discovery-project-recognition.plan.md) (Done, 12 of 12 steps; open evidence AC-009, AC-022 in the plan).
- Spec 0002: [spec](../.specs/active/0002-spec-repository-parser.md) / [plan](../.specs/active/0002-spec-repository-parser.plan.md) (Done, 9 of 9 steps).
- Spec 0004: [spec](../.specs/active/0004-runtime-persistence-event-model.md) / [plan](../.specs/active/0004-runtime-persistence-event-model.plan.md) (Done, T-001...T-009 ticked; AC-020 accepted 2026-11-16).
- Spec 0003: [spec](../.specs/active/0003-spec-lifecycle-readiness-model.md) / [plan](../.specs/active/0003-spec-lifecycle-readiness-model.plan.md) (In Progress, 8 steps, 4 stages; stage 2 `‖`).
- Current task: 0003 T-005; 0001/0002/0004 all steps ticked.
- Acceptance criteria in focus: AC-014, AC-009, AC-023, AC-016 (0003 T-005); AC-009, AC-022 (0001, open evidence in its plan).

## Changed Recently
- Spec 0003 started (backlog → active): T-001...T-004 built `src/core/lifecycle` (states, readiness, contradictions, Blocked, duplicates, Deprecated, verification status, transition check, flow marker); 599 unit tests green.
- Spec 0003 revised (OP-005 flow marker on collapsed jumps, OP-006 reactivated Baseline, OP-007 duplicated-stem history, new AC-026; Gregor) and planned: `.specs/active/0003-spec-lifecycle-readiness-model.plan.md`.
- Merged `spec-0004` into `main`: `src/extension.ts` wires both the spec repository (0002) and the runtime session (0004), each fed by spec 0001's `onDidChangeActiveProject`; `architecture:` snapshot in `AGENTS.md` holds both modules.
- Spec 0004 built: `src/core/runtime`, `src/adapters/node/fileRuntimeMedium.ts`, `docs/runtime-data.md`; T-009 after `/sdd-compile`: append-only after a kill, writes to unreadable or newer data refused.
- Spec 0002 built: `src/core/specs`, `src/adapters/vscode` spec source and file watch, active-project feed (T-001...T-009).
- Spec 0001 changed after `/sdd-compile` (Gregor): AC-016/AC-017 revised, new AC-023 (`onDidChangeActiveProject`), plan extended T-010...T-012.

## Decisions in Flight
- 0002: symbolic links not followed (A-006 confirmed).
- Spec 0001 open points OP-006...OP-012 (non-blocking).
- `AGENTS.md` is over its 200-line target: one eviction proposal is due at the next natural edit.

## Blockers / Questions
- None.

## Next
1. Gregor/CI: `npm test` host suite (0001, 0002, 0004 smoke tests); manual checks AC-009 (reload) and AC-022 (Restricted Mode).
2. `/sdd-compile` for 0001, 0002 and 0004 in a fresh session (another model family), then `/sdd-lifecycle` to done.
3. Gregor reviews the 0003 plan; on the start signal `/sdd-lifecycle` backlog → active, then T-001.
4. Gregor re-measures AC-018 on a real project (OP-001).

## Validation
- Done on the merged tree: eslint, tsc, `test:unit` (516 tests), `compile` green. Pending: `npm test` on CI or Windows, manual AC-009 and AC-022. Known issues: none.
