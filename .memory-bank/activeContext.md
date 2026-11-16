# Active Context

Last updated: 2026-11-16
Current branch: main
Current phase: act

## Now
Spec 0005 (studio shell & navigation) is built (plan Done, T-001...T-009, plus 0001 T-013 for AC-024). It awaits the host suite on CI, Gregor's manual checks and `/sdd-compile` in a fresh session. Specs 0001...0004 are built too and wait for the same.

## Active Spec
- Spec 0001: [spec](../.specs/active/0001-workspace-discovery-project-recognition.md) / [plan](../.specs/active/0001-workspace-discovery-project-recognition.plan.md) (Done, 12 of 12 steps; open evidence AC-009, AC-022 in the plan).
- Spec 0002: [spec](../.specs/active/0002-spec-repository-parser.md) / [plan](../.specs/active/0002-spec-repository-parser.plan.md) (Done, T-001...T-011 ticked; spec revised 2026-11-16 after `/sdd-compile`; AC-022 `built`, `verified` after the host suite).
- Spec 0004: [spec](../.specs/active/0004-runtime-persistence-event-model.md) / [plan](../.specs/active/0004-runtime-persistence-event-model.plan.md) (Done, T-001...T-009 ticked; AC-020 accepted 2026-11-16).
- Spec 0003: [spec](../.specs/active/0003-spec-lifecycle-readiness-model.md) / [plan](../.specs/active/0003-spec-lifecycle-readiness-model.plan.md) (Done, 9 of 9 steps; T-009 after `/sdd-compile`: no history entry for a gap at the first derivation, PD-023).
- Spec 0007: [spec](../.specs/active/0007-spec-board-spec-detail.md) / [plan](../.specs/active/0007-spec-board-spec-detail.plan.md) (In Progress; moved backlog → active 2026-11-16).
- Spec 0005: [spec](../.specs/active/0005-studio-shell-navigation.md) / [plan](../.specs/active/0005-studio-shell-navigation.plan.md) (Done, T-001...T-009 ticked; spec `In Progress` until `/sdd-compile`).
- Current task: none open; 0001...0005 all steps ticked.
- Acceptance criteria in focus: 0001 AC-024; 0005 AC-001...AC-029.

## Changed Recently
- Spec 0005 stage 4 (T-008, T-009): panel host with CSP, serializer, commands, test-mode probe, Activity Bar tree, Rescan command, host smoke `src/test/shell.smoke.test.ts` (not run here); architecture snapshot, Memory Bank and README synced; 860 unit tests green.
- Spec 0005 stage 3 (T-005...T-007): `src/core/shell` (panel-state derivation, tree model, shell service with selection, memory, rows, navigation request, Retry, Rescan); 846 unit tests green.
- Spec 0005 stage 2 (T-002...T-004): React 19 webview in `src/webview` (client, navigation, panel states, areas, Spec Explorer, notice), second esbuild target, webview vitest project, bundle-in-jsdom test; 740 unit tests green.
- Spec 0005 stage 1 (T-001): `src/shared/protocol` (envelope, messages, areas, texts) and `src/core/shell/messageRouter.ts`; 0001 T-013 (AC-024 `onDidUpdate`, `remembered`, `failure`); 681 unit tests green.
- Spec 0005 started and revised (Gregor): OP-002, OP-004...OP-009 resolved in the spec (placeholder wording, S7, S8/S9 texts, notice, Reload, Rescan command AC-029); spec 0001 revised (AC-024 `onDidUpdate`, `remembered`, `failure`; plan step T-013).
- Spec 0002 revised after `/sdd-compile` (Gregor): AC-022 same-project re-report triggers no re-read, AC-008 three-dot range; plan extended T-010/T-011 (tests only, code unchanged); AC-022 row back to `built` until `npm test` ran.

## Decisions in Flight
- 0002: symbolic links not followed (A-006 confirmed).
- Spec 0001 open points OP-006...OP-012 (non-blocking).
- `AGENTS.md` is over its 200-line target: one eviction proposal is due at the next natural edit.

## Blockers / Questions
- None.

## Next
1. Gregor/CI: `npm test` host suite (0001...0005 smoke tests); manual checks 0001 AC-009 (reload), AC-022 (Restricted Mode); 0005 AC-019 (themes), AC-022 (focus), AC-023 (High Contrast), AC-024, AC-009.
2. `/sdd-compile` for 0001, 0002 (again), 0003, 0004 and 0005 in a fresh session (another model family), then `/sdd-lifecycle` to done.
3. Gregor re-measures AC-018 on a real project (OP-001).

## Validation
- Done: eslint, both tsc, `test:unit` (860 tests), `compile` green. 0002 AC-022: `built`, decided by the host smoke on CI. Pending: `npm test` on CI or Windows, manual AC-009 and AC-022. Known issues: none.
