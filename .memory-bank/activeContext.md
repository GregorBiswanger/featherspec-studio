# Active Context

Last updated: 2026-11-16
Current branch: main
Current phase: act

## Now
All seven active specs (0001...0007) are implemented: every plan is Done with every step ticked and a recorded `Verified:` result. They await the host suite on CI, Gregor's manual checks and a second `/sdd-compile` in a fresh session. No spec is `Implemented` yet; all stay `In Progress` until that compile and `/sdd-lifecycle`.

## Active Spec
- Spec 0001: [spec](../.specs/active/0001-workspace-discovery-project-recognition.md) / [plan](../.specs/active/0001-workspace-discovery-project-recognition.plan.md) (Done, 13 of 13 steps; open evidence AC-009, AC-022 in the plan).
- Spec 0002: [spec](../.specs/active/0002-spec-repository-parser.md) / [plan](../.specs/active/0002-spec-repository-parser.plan.md) (Done, 11 of 11; AC-022 `built`, `verified` after the host suite).
- Spec 0003: [spec](../.specs/active/0003-spec-lifecycle-readiness-model.md) / [plan](../.specs/active/0003-spec-lifecycle-readiness-model.plan.md) (Done, 10 of 10; T-009: no history entry for a gap, PD-023).
- Spec 0004: [spec](../.specs/active/0004-runtime-persistence-event-model.md) / [plan](../.specs/active/0004-runtime-persistence-event-model.plan.md) (Done, 10 of 10; AC-020 accepted 2026-11-16).
- Spec 0005: [spec](../.specs/active/0005-studio-shell-navigation.md) / [plan](../.specs/active/0005-studio-shell-navigation.plan.md) (Done, 10 of 10; T-010 selection foreground and High Contrast borders).
- Spec 0006: [spec](../.specs/active/0006-mission-control-dashboard.md) / [plan](../.specs/active/0006-mission-control-dashboard.plan.md) (Done, 9 of 9; T-009 header time, A-013).
- Spec 0007: [spec](../.specs/active/0007-spec-board-spec-detail.md) / [plan](../.specs/active/0007-spec-board-spec-detail.plan.md) (Done, 14 of 14; T-004, T-006, T-007 ticked late with re-run results; T-011...T-014 after `/sdd-compile` and the first visual check).
- Spec 0013: [spec](../.specs/active/0013-studio-visual-design.md) / [plan](../.specs/active/0013-studio-visual-design.plan.md) (In Progress, started 2026-11-16).
- Current task: 0013 T-005 (stages 1–2 of 5 done: tokens, chips, rule sentences, Mission Control).
- Acceptance criteria in focus: manual 0007 AC-017 (Tab onto Move to), AC-018, AC-026; 0006 AC-021, AC-022.

## Changed Recently
- Spec 0013 (Studio visual design): plan approved by Gregor 2026-11-16, pair moved backlog → active; T-001, T-002 done (`--fs-*` colour aliases, `src/webview/ui/StateChip.tsx`, `RuleText.tsx`; `derivedLabel` → `derivedRule`, readiness → `{ id, reason }`); T-003, T-004 Mission Control tiles, distribution bar, header wording, attention rows, side-by-side panels (layout-order test updated, see plan T-004 Notes).
- 0007 T-011...T-014: the Move to button is a Tab stop of the board's current card (AC-017, spec revised); timing test for the detail view (AC-019); each ID once in requirements, criteria and stages (AC-009, spec revised, `src/core/board/idText.ts`); Overview header lines on one row (three CSS rules). Looks beyond that stay with backlog spec 0013.
- 0007 T-004, T-006, T-007 were unticked although Done; ticked 2026-11-16 with re-run results (no red run recorded, none claimed).
- 0006 T-009: the header time is the last model update, not the panel-open time (`SpecRepository.readAt()`, `ShellModelSource.updatedAt()`, A-013); `npm run compile` joined the quality gates for wiring steps.
- 0005 T-010, 0003 T-009, 0002 T-010/T-011 after earlier `/sdd-compile` runs (selection colours, gap baseline PD-023, AC-022 and AC-008 wording).
- 0007 T-001...T-010 and 0006 T-001...T-008: board, detail, Mission Control; `AGENTS.md` snapshot, `systemPatterns.md`, `techContext.md` and README synced.

## Decisions in Flight
- 0002: symbolic links not followed (A-006 confirmed).
- Spec 0001 open points OP-006...OP-012 (non-blocking).
- `AGENTS.md` is over its 200-line target: one eviction proposal is due at the next natural edit.

## Blockers / Questions
- None.

## Next
0. Implement 0013 T-001...T-010 (whole plan approved).
1. Gregor/CI: `npm test` host suite (smoke tests of 0001...0007; 0002 AC-022 is decided there).
2. Gregor, manual: 0007 AC-017 (keyboard-only, Tab onto Move to), AC-018 (screen reader), AC-026 and AC-004's two-line limit in Light, Dark and High Contrast; 0006 AC-021, AC-022, the layout; 0001 AC-009 (reload), AC-022 (Restricted Mode); 0005 AC-019, AC-022, AC-023, AC-024, AC-009; one look at the 0007 Overview header.
3. A second `/sdd-compile` for 0001...0007 in a fresh session (another model family), then `/sdd-lifecycle` to done.
4. Gregor re-measures 0001 AC-018 (OP-001) and 0006 AC-016, AC-024 (OP-12) on a real project.

## Validation
- Done: eslint, both `tsc`, `npm run test:unit` (89 files, 1296 tests), `npm run compile` green. Pending: `npm test` on CI or Windows, the manual checks above. Known issues: none.
