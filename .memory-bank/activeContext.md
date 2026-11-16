# Active Context

Last updated: 2026-11-16
Current branch: main
Current phase: act

## Now
Spec 0005 (studio shell & navigation) started 2026-11-16 (backlog → active), plan approved by Gregor; first 0001 T-013 (discovery update notification), then 0005 T-001...T-009.
Specs 0001 (workspace discovery), 0002 (spec repository & parser) and 0004 (runtime persistence & event model) are implemented, their plans are Done. They and 0003 await the host suite (`npm test`) on CI and `/sdd-compile` in a fresh session. Spec 0003 (lifecycle & readiness model) is built, its plan is Done (8 of 8 steps).

## Active Spec
- Spec 0001: [spec](../.specs/active/0001-workspace-discovery-project-recognition.md) / [plan](../.specs/active/0001-workspace-discovery-project-recognition.plan.md) (Done, 12 of 12 steps; open evidence AC-009, AC-022 in the plan).
- Spec 0002: [spec](../.specs/active/0002-spec-repository-parser.md) / [plan](../.specs/active/0002-spec-repository-parser.plan.md) (Done, T-001...T-011 ticked; spec revised 2026-11-16 after `/sdd-compile`; AC-022 `built`, `verified` after the host suite).
- Spec 0004: [spec](../.specs/active/0004-runtime-persistence-event-model.md) / [plan](../.specs/active/0004-runtime-persistence-event-model.plan.md) (Done, T-001...T-009 ticked; AC-020 accepted 2026-11-16).
- Spec 0003: [spec](../.specs/active/0003-spec-lifecycle-readiness-model.md) / [plan](../.specs/active/0003-spec-lifecycle-readiness-model.plan.md) (Done, 8 of 8 steps).
- Spec 0005: [spec](../.specs/active/0005-studio-shell-navigation.md) / [plan](../.specs/active/0005-studio-shell-navigation.plan.md) (In Progress, T-001...T-009 open).
- Current task: 0005 T-002 (webview toolchain and frame).
- Acceptance criteria in focus: 0001 AC-024; 0005 AC-001...AC-029.

## Changed Recently
- Spec 0005 stage 1 (T-001): `src/shared/protocol` (envelope, messages, areas, texts) and `src/core/shell/messageRouter.ts`; 0001 T-013 (AC-024 `onDidUpdate`, `remembered`, `failure`); 681 unit tests green.
- Spec 0005 started and revised (Gregor): OP-002, OP-004...OP-009 resolved in the spec (placeholder wording, S7, S8/S9 texts, notice, Reload, Rescan command AC-029); spec 0001 revised (AC-024 `onDidUpdate`, `remembered`, `failure`; plan step T-013).
- Spec 0002 revised after `/sdd-compile` (Gregor): AC-022 same-project re-report triggers no re-read, AC-008 three-dot range; plan extended T-010/T-011 (tests only, code unchanged); AC-022 row back to `built` until `npm test` ran.
- Spec 0003 started (backlog → active): built `src/core/lifecycle` (T-001...T-008): derivation, readiness, contradictions, Blocked, duplicates, Deprecated, verification, transition check, flow marker, status history, service; wired as `StudioApi.lifecycle()`; 639 unit tests green.
- Spec 0003 revised (OP-005 flow marker on collapsed jumps, OP-006 reactivated Baseline, OP-007 duplicated-stem history, new AC-026; Gregor) and planned: `.specs/active/0003-spec-lifecycle-readiness-model.plan.md`.
- Merged `spec-0004` into `main`: `src/extension.ts` wires both the spec repository (0002) and the runtime session (0004), each fed by spec 0001's `onDidChangeActiveProject`; `architecture:` snapshot in `AGENTS.md` holds both modules.

## Decisions in Flight
- 0002: symbolic links not followed (A-006 confirmed).
- Spec 0001 open points OP-006...OP-012 (non-blocking).
- `AGENTS.md` is over its 200-line target: one eviction proposal is due at the next natural edit.

## Blockers / Questions
- None.

## Next
1. Gregor/CI: `npm test` host suite (0001, 0002, 0003, 0004 smoke tests); manual checks AC-009 (reload) and AC-022 (Restricted Mode).
2. `/sdd-compile` for 0001, 0002 (again), 0003 and 0004 in a fresh session (another model family), then `/sdd-lifecycle` to done.
3. Gregor re-measures AC-018 on a real project (OP-001).

## Validation
- Done: eslint, tsc, `test:unit` (644 tests), `compile` green. 0002 AC-022: `built`, decided by the host smoke on CI. Pending: `npm test` on CI or Windows, manual AC-009 and AC-022. Known issues: none.
