# Active Context

Last updated: 2026-11-24
Current branch: jetbrains-host
Current phase: act

## Now
- 0034 on `jetbrains-host`: all steps verified but T-035; G4 review NOT READY (`2da335c`), fix round per the plan handoff.
- Other work waits: CI on PR #3, Gregor's practice checks (17 §5 for 0033, 16 §4.1 for 0032), AC-017 on `tip-splitter` for 0027, Gregor's checklist ([docs/release-checklist.md](../docs/release-checklist.md)), then a fresh `/sdd-compile` per spec.
- 0021–0024 are implemented; their specs stay In Progress in `active/`.

## Active Spec
- [0036](../.specs/active/0036-jetbrains-marketplace-release.md) / [plan](../.specs/active/0036-jetbrains-marketplace-release.plan.md): release 0034+0035, G0 first.
- [0035](../.specs/active/0035-send-and-copy-for-each-assistant-in-jetbrains.md) / [plan](../.specs/active/0035-send-and-copy-for-each-assistant-in-jetbrains.plan.md): Send to three CLI agents in JetBrains (PD-112), T-016…T-022, T-024 built (CI pending); next T-023 (K-1), T-014, T-015.
- [0034](../.specs/active/0034-studio-for-jetbrains-ides.md) / [plan](../.specs/active/0034-studio-for-jetbrains-ides.plan.md): JetBrains IDEs, T-001…T-042 verified except T-035, G4 fix round open; baseline `3bc615c`.
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
- Completed 2026-11-20: [0029](../.specs/done/0029-onboarding-before-setup.md), [0030](../.specs/done/0030-clarified-step-quiet-attach-tip.md), [0031](../.specs/done/0031-send-on-follow-up-lines.md); plans in `plan-archive/`; 0031: T-003 (preview), AC-009 (Gregor), CI on PR #2 open.
- Completed 2026-11-20: [0032](../.specs/done/0032-release-polish.md), [0033](../.specs/done/0033-start-via-lifecycle-plan-attachment-prompt-layout.md); plans in `plan-archive/`.

## Changed Recently
- 0035 review 20 (2026-11-23): B-1…B-4, S-1…S-6 built (PD-110, Gregor decided OP-003/004/013/016), S-7 prepared; Kotlin only locally compiled, CI open.
- 0035 (2026-11-24): `Failed` is logged with its reason (idea.log, Output tab); `ide-tests` also run on IDEA 2026.3; Rider 263.330 shows `Failed`, cause open.
- 0022 AC-030, AC-031 (2026-11-24, Gregor's Rider test): below 900 px a tab click shows the list; back link on the title edge; step line starts at the number column.

## Decisions in Flight
- 0034: the orchestrator's proxy decisions await Gregor — list in the plan's *Session handoff*.
- `AGENTS.md` stays above its 200-line target: the template body alone is 200 lines; further eviction would edit template wiring, Gregor's call.

## Blockers / Questions
- 0034: `AGENTS.md` at 14991/15000 bytes (boundary detail moved to `core.md`; proxy decision, Gregor confirms); no other model family for the compile here (Claude only).
- Gregor's manual checks stay in the specs: 0025 AC-022 real window, AC-023, AC-024; 0026 AC-017, AC-019; 0028 AC-015; 0029 AC-014; 0030 AC-013; 0031 AC-009; 0032 practice check (16 §4.1); 0033 practice check (17 §5); 0027 AC-016, AC-017, AC-020.

## Next
1. 0034: G4 fix round (plan handoff), all-green CI at one head, fresh `/sdd-compile`, then Gregor's AC-040…AC-042 with the CI ZIP.
2. 0033: Gregor's practice check on `C:\projects\test` (Ready → Set active → T-001, new VSIX), then a fresh `/sdd-compile` and CI.
3. 0032: compile READY at 3e09514; CI on PR #3, VSIX to Gregor for 16 §4.1, then the release checklist.
4. Finish 0027 (spec and plan are in `.specs/active/`, the plan's handoff names the next step).
5. 0029 and 0030: CI on PR #2, then Gregor's AC-014 and AC-013; the other specs' CI items run on the same PR.
6. 0031: AC-009 Gregor; CI on PR #2

## Validation
- 0035 T-013 (sandbox): node + webview, check-types, eslint, guards 68/68 green; 0034 at `2da335c`: scripts 5/5; CI `verify`, `plugin`, no-JCEF green at `3f4221a`. Windows at 4304f86: unit 3900/8 + 35 timing, npm test 34+1+1+1.
