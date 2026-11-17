# Active Context

Last updated: 2026-11-17
Current branch: main
Current phase: act

## Now
All seven active specs (0001...0007), spec 0009 (provider port, fake provider), spec 0011 (agent orchestrator) and spec 0008 (agent start workflow) are implemented: every plan is Done with every step ticked and a recorded `Verified:` result. They await the host suite on CI, Gregor's manual checks and a second `/sdd-compile` in a fresh session. No spec is `Implemented` yet; all stay `In Progress` until that compile and `/sdd-lifecycle`.

## Active Spec
- Spec 0001: [spec](../.specs/active/0001-workspace-discovery-project-recognition.md) / [plan](../.specs/active/0001-workspace-discovery-project-recognition.plan.md) (Done, 13 of 13 steps; open evidence AC-009, AC-022 in the plan).
- Spec 0002: [spec](../.specs/active/0002-spec-repository-parser.md) / [plan](../.specs/active/0002-spec-repository-parser.plan.md) (Done, 11 of 11; AC-022 `built`, `verified` after the host suite).
- Spec 0003: [spec](../.specs/active/0003-spec-lifecycle-readiness-model.md) / [plan](../.specs/active/0003-spec-lifecycle-readiness-model.plan.md) (Done, 10 of 10; T-009: no history entry for a gap, PD-023).
- Spec 0004: [spec](../.specs/active/0004-runtime-persistence-event-model.md) / [plan](../.specs/active/0004-runtime-persistence-event-model.plan.md) (Done, 10 of 10; AC-020 accepted 2026-11-16).
- Spec 0005: [spec](../.specs/active/0005-studio-shell-navigation.md) / [plan](../.specs/active/0005-studio-shell-navigation.plan.md) (Done, 10 of 10; T-010 selection foreground and High Contrast borders).
- Spec 0006: [spec](../.specs/active/0006-mission-control-dashboard.md) / [plan](../.specs/active/0006-mission-control-dashboard.plan.md) (Done, 9 of 9; T-009 header time, A-013).
- Spec 0007: [spec](../.specs/active/0007-spec-board-spec-detail.md) / [plan](../.specs/active/0007-spec-board-spec-detail.plan.md) (Done, 14 of 14; T-004, T-006, T-007 ticked late with re-run results; T-011...T-014 after `/sdd-compile` and the first visual check).
- Spec 0013: [spec](../.specs/active/0013-studio-visual-design.md) / [plan](../.specs/active/0013-studio-visual-design.plan.md) (In Progress, started 2026-11-16).
- Spec 0009: [spec](../.specs/active/0009-agent-provider-abstraction.md) / [plan](../.specs/active/0009-agent-provider-abstraction.plan.md) (Done, 9 of 9 steps; host smoke `src/test/providers.smoke.test.ts` and the manual §21 walkthrough open; awaits `/sdd-compile`).
- Spec 0011: [spec](../.specs/active/0011-agent-orchestrator-run-lifecycle.md) / [plan](../.specs/active/0011-agent-orchestrator-run-lifecycle.plan.md) (Done, 8 of 8 steps; host smoke `src/test/orchestrator.smoke.test.ts` open on CI, M-03 wording is Gregor's; awaits `/sdd-compile`).
- Spec 0008: [spec](../.specs/active/0008-spec-activation-agent-start.md) / [plan](../.specs/active/0008-spec-activation-agent-start.plan.md) (Done, 8 of 8 steps; host smoke `src/test/agentStart.smoke.test.ts` open on CI, M-2 is Gregor's; M-1 is accepted with 0010; awaits `/sdd-compile`).
- Spec 0012: [spec](../.specs/active/0012-live-agent-activity-monitoring.md) / [plan](../.specs/active/0012-live-agent-activity-monitoring.plan.md) (Done, 9 of 9 steps; host smoke `src/test/agentCenter.smoke.test.ts` open on CI, manual AC-010 scrolling and AC-029 High Contrast passes are Gregor's; awaits `/sdd-compile`).
- Current task: 0012 done, awaits Gregor's manual passes and `/sdd-compile`; 0013 T-010 — gates and docs done; waiting for Gregor's AC-017 screenshot verdict (shot list in the plan, T-010 Notes).
- Acceptance criteria in focus: manual 0007 AC-017 (Tab onto Move to), AC-018, AC-026; 0006 AC-021, AC-022.

## Changed Recently
- Spec 0012 (Agent Center) started 2026-11-17: pair moved backlog → active, spec `In Progress`; T-001 to T-008 done: core `src/core/agentCenter` (timeline, summary, run list, selection memory, event signal, service, actions, notifier, request handlers), protocol `agentCenter.ts` and `agentCenterTexts.ts`, area `src/webview/areas/agentCenter`, `RunStatusChip`, adapters `agentCenterUi.ts` and `agentCenterMemory.ts`, `StudioApi.agentCenter()`; host smoke `src/test/agentCenter.smoke.test.ts` open on CI.
- Spec 0008 built (2026-11-17): `src/core/agentStart` (start prompt with golden file, preconditions P-1..P-8, start flow, orchestrator binding), ports `src/core/ports/agentStart.ts`, contract `src/shared/protocol/agentStart.ts`, `src/webview/agentStart` (dialog, lines), setting `featherspec-studio.defaultProvider` (default `copilot`), `StudioApi.agentStart()`; the board's Ready → Active drop now starts the workflow (end-to-end unit test with the fake provider); 0009's manifest assertion narrowed to "no default is `fake`" (0009 plan T-008 Notes); `AGENTS.md` snapshot, README, `systemPatterns.md`, `techContext.md` synced.
- Spec 0011 built (2026-11-17): `src/core/orchestrator` (run tracker, transitions, error classes, start, stop, resume, answers, timeouts, result, spec flag, palette commands `Stop Run` and `Resume Run`), UI port `src/core/ports/orchestrator.ts`, `orchestratorUi.ts` adapter, `StudioApi.orchestrator()`; 0004 `createRun` gained an optional `cause` (first status entry of a resumed run); `AGENTS.md` snapshot, README, `systemPatterns.md`, `techContext.md` synced.
- Spec 0009 built (2026-11-17): `src/core/providers` (vocabulary, registry, provider service, setup, contract suite), `src/core/ports/agentProvider.ts`, fake provider `src/adapters/providers/fake/`, settings `featherspec-studio.fakeProvider.*`, `docs/agent-provider-port.md`, `service.credentials` feeds the runtime store masking; 0004's manifest negative control now filters by prefix; the port surface is the plan's *Surface* section.
- Spec 0013 (Studio visual design): plan approved by Gregor 2026-11-16, pair moved backlog → active; T-001, T-002 done (`--fs-*` colour aliases, `src/webview/ui/StateChip.tsx`, `RuleText.tsx`; `derivedLabel` → `derivedRule`, readiness → `{ id, reason }`); T-003, T-004 Mission Control tiles, distribution bar, header wording, attention rows, side-by-side panels (layout-order test updated, see plan T-004 Notes); T-005, T-006 board full height, drag marks, card layout with progress bars; T-007, T-008 safe inline Markdown (`src/webview/ui/inlineFormat.ts`), collapsible sections, one Open file per section; T-009 state icons, motion ≤ 150 ms; T-010 README, `AGENTS.md` snapshot, `systemPatterns.md`, `techContext.md` synced.
- 0007 T-011...T-014: the Move to button is a Tab stop of the board's current card (AC-017, spec revised); timing test for the detail view (AC-019); each ID once in requirements, criteria and stages (AC-009, spec revised, `src/core/board/idText.ts`); Overview header lines on one row (three CSS rules). Looks beyond that stay with backlog spec 0013.
- 0007 T-004, T-006, T-007 were unticked although Done; ticked 2026-11-16 with re-run results (no red run recorded, none claimed).

## Decisions in Flight
- 0002: symbolic links not followed (A-006 confirmed).
- Spec 0001 open points OP-006...OP-012 (non-blocking).
- `AGENTS.md` is over its 200-line target: one eviction proposal is due at the next natural edit.

## Blockers / Questions
- None.

## Next
- Gregor: review the 0009 and 0011 tests per stage (lists in the session reports; riskiest in 0011: the event queue with the operation lock, the window-end rules, the resume checks), accept the texts of the 0011 plan *Surface* (M-03), then `/sdd-compile` 0009 and 0011 in fresh sessions; plans 0012, 0010 are written against their *Surface*; 0008 is built: review its tests per stage (riskiest: the flow's generation counter around hide, project change and Start; the start-failure watch), then M-2.
0. Gregor: AC-017 verdict on the 0013 screenshots (and the three points in the plan handoff); then tick T-010, `/sdd-compile` 0013 in a fresh session; AC-018 in real VS Code.
1. Gregor/CI: `npm test` host suite (smoke tests of 0001...0007; 0002 AC-022 is decided there).
2. Gregor, manual: 0007 AC-017 (keyboard-only, Tab onto Move to), AC-018 (screen reader), AC-026 and AC-004's two-line limit in Light, Dark and High Contrast; 0006 AC-021, AC-022, the layout; 0001 AC-009 (reload), AC-022 (Restricted Mode); 0005 AC-019, AC-022, AC-023, AC-024, AC-009; one look at the 0007 Overview header.
3. A second `/sdd-compile` for 0001...0007 in a fresh session (another model family), then `/sdd-lifecycle` to done.
4. Gregor re-measures 0001 AC-018 (OP-001) and 0006 AC-016, AC-024 (OP-12) on a real project.

## Validation
- Done: eslint, both `tsc`, `npm run test:unit` (136 files, 1723 tests), `npm run compile` green. Pending: `npm test` on CI or Windows, the manual checks above. Known issues: none.
