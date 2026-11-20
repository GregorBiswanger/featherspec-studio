# Active Context

Last updated: 2026-11-20
Current branch: ux-round-3
Current phase: act

## Now
- Round 3 on `ux-round-3`: 0026 (Send defaults and wording) is Implemented 2026-11-19; its plan is archived.
- 0029 (onboarding before setup) is Implemented 2026-11-20; its plan is archived.
- 0021–0024 are implemented; their specs stay In Progress in `active/`.
- Waits for: Gregor's AC-017 on `tip-splitter` for 0027 (C-2 not needed, PD-091), CI at the round-3 PR, Gregor's checklist ([docs/release-checklist.md](../docs/release-checklist.md)), then a fresh `/sdd-compile` per spec.

## Active Spec
- [0032](../.specs/active/0032-release-polish.md) / [plan](../.specs/active/0032-release-polish.plan.md): release polish (PD-093…PD-095), T-001…T-004 built; T-005 preview and T-006 evidence are the orchestrator's.
- [0027](../.specs/active/0027-attach-spec-when-sending.md) / [plan](../.specs/active/0027-attach-spec-when-sending.plan.md): Send attaches the spec for Copilot and Claude Code in every version (PD-091), T-001…T-011 verified; AC-016, AC-017, AC-020 are Gregor's or the orchestrator's.
- [0024](../.specs/active/0024-send-next-step-to-assistant.md) / [plan](../.specs/active/0024-send-next-step-to-assistant.plan.md): Send to Copilot / Claude Code, T-001…T-022 verified; AC-016…AC-019 are Gregor's; OP-004 closed by PD-078.
- [0023](../.specs/active/0023-plan-map-stages-parallel-work.md) / [plan](../.specs/active/0023-plan-map-stages-parallel-work.plan.md): Plan map, T-001…T-017; AC-018 real window, AC-019, AC-020 are Gregor's.
- [0022](../.specs/active/0022-layout-and-signal-polish.md) / [plan](../.specs/active/0022-layout-and-signal-polish.plan.md): layout and signals, T-001…T-022; AC-020, AC-021 are Gregor's.
- [0021](../.specs/active/0021-next-step-intent-and-guidance.md) / [plan](../.specs/active/0021-next-step-intent-and-guidance.plan.md): intent and guidance, T-001…T-016; AC-022 real window, AC-023…AC-025 are Gregor's.
- [0020](../.specs/active/0020-native-spec-tree.md) / [plan](../.specs/active/0020-native-spec-tree.plan.md): native Specs tree, T-001…T-025; AC-022 on `tip-splitter` is Gregor's.
- [0019](../.specs/active/0019-detail-situation-picture.md) / [plan](../.specs/active/0019-detail-situation-picture.plan.md): detail as side panel, T-001…T-016; AC-022 round 2 real window.
- [0018](../.specs/active/0018-overview-and-compact-board.md) / [plan](../.specs/active/0018-overview-and-compact-board.plan.md): Overview and compact Board, T-001…T-014; AC-031 parts are Gregor's.
- [0017](../.specs/active/0017-next-step-everywhere.md) / [plan](../.specs/active/0017-next-step-everywhere.plan.md): next step everywhere, T-001…T-012; AC-026 is Gregor's.
- [0016](../.specs/active/0016-honest-signals.md) / [plan](../.specs/active/0016-honest-signals.plan.md): honest signals, T-001…T-013; AC-025 Hands-On is Gregor's.
- [0015](../.specs/active/0015-focus-on-visibility.md) / [plan](../.specs/active/0015-focus-on-visibility.plan.md): focus on visibility, T-001…T-020; M-1 (AC-030) is Gregor's.
- [0014](../.specs/active/0014-setup-featherspec-from-studio.md) / [plan](../.specs/active/0014-setup-featherspec-from-studio.plan.md): setup from the Studio; M-2 with the button is Gregor's.
- Completed: 0001…0007, 0013 in `done/`; 0008…0012 are Deprecated (successor 0015); plans frozen in `plan-archive/`.
- Completed 2026-11-19: [0025](../.specs/done/0025-plan-map-navigation-and-progress.md) ([plan](../.specs/plan-archive/0025-plan-map-navigation-and-progress.2026-11-19.plan.md)) and [0028](../.specs/done/0028-plan-state-aware-next-step.md) ([plan](../.specs/plan-archive/0028-plan-state-aware-next-step.2026-11-19.plan.md)).
- Completed 2026-11-19: [0026](../.specs/done/0026-send-defaults-and-wording.md) ([plan](../.specs/plan-archive/0026-send-defaults-and-wording.2026-11-19.plan.md)).
- Completed 2026-11-20: [0031](../.specs/done/0031-send-on-follow-up-lines.md) ([plan](../.specs/plan-archive/0031-send-on-follow-up-lines.2026-11-20.plan.md)); T-003 (preview, orchestrator), AC-009 (Gregor) and CI on PR #2 are open.
- Completed 2026-11-20: [0030](../.specs/done/0030-clarified-step-quiet-attach-tip.md) ([plan](../.specs/plan-archive/0030-clarified-step-quiet-attach-tip.2026-11-20.plan.md)); AC-013 (Gregor) and CI on PR #2 are open.
- Completed 2026-11-20: [0029](../.specs/done/0029-onboarding-before-setup.md) ([plan](../.specs/plan-archive/0029-onboarding-before-setup.2026-11-20.plan.md)); AC-014 (Gregor) and CI on PR #2 are open.

## Changed Recently
- 0030 (PD-092): a hand-over of `/sdd-clarify` plus a changed spec file makes the Backlog next step `Write the plan`; no attachment line; coach reads `Tip: Use …`. 0031: each follow-up line (NS-9, NS-5, NS-6) has its own secondary Send, Tip and attachment (`FOLLOW_UP_CASE`).
- 0027 (PD-082, PD-083, PD-089), built 2026-11-19, not closed: Send attaches the spec in every version (Claude Code `@<path>`, Copilot `attachFiles`; PD-091 dropped the gate and C-2) and the line under the button was replaced by 0030 with Send's name and tooltip. Closing waits for AC-017, AC-020.
- 0025, 0026, 0028 (Implemented 2026-11-19): Plan map links, header next step and percentages; Send opens a new chat, Now stops at five rows, three radio ways; a finished plan is Review. Windows `npm test` passed at 7ea11f3 (0025).

## Decisions in Flight
- `AGENTS.md` stays above its 200-line target: the template body alone is 200 lines; further eviction would edit template wiring, Gregor's call.
- Publisher ID `GregorBiswanger` is confirmed (2026-11-17).

## Blockers / Questions
- Gregor's manual checks stay in the specs: 0025 AC-022 real window, AC-023, AC-024; 0026 AC-017, AC-019; 0028 AC-015; 0029 AC-014; 0030 AC-013; 0031 AC-009; 0027 AC-016, AC-017, AC-020.

## Next
1. Finish 0027 (spec and plan are in `.specs/active/`, the plan's handoff names the next step).
2. 0029 and 0030: CI on PR #2, then Gregor's AC-014 and AC-013; the other specs' CI items run on the same PR.
3. 0031: T-003 preview (orchestrator) → record in spec §12; AC-009 Gregor; CI on PR #2

## Validation
- Windows at 3773816: unit 3831/8 + 35 timing, npm test 34+1+1+1
