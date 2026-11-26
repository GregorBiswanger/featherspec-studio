# Active Context

Last updated: 2026-11-26
Current branch: jetbrains-host
Current phase: act

## Now
- 0034 and 0035 on `jetbrains-host` at `6b75ef0`: every step ticked except 0035 T-001 (probe never run) and T-015 (partial); G4 fix round closed; CI run 45728313993 green on every functional job, red only the PD-111 trend timings (Windows 2025.3, macOS). Gregor's Rider and VS Code hands-on 2026-11-26: works.
- Other work waits: CI on PR #3, Gregor's practice checks (17 §5 for 0033, 16 §4.1 for 0032), AC-017 on `tip-splitter` for 0027, Gregor's checklist ([docs/release-checklist.md](../docs/release-checklist.md)), then a fresh `/sdd-compile` per spec.
- 0014–0017, 0020–0024, 0027 are implemented; their specs stay In Progress in `active/` until Gregor's manual checks are recorded (briefs 2026-11-26: traceability normalised, CI 45728313993 at `6b75ef0` recorded; open `manual:` rows per plan).

## Active Spec
- [0036](../.specs/active/0036-jetbrains-marketplace-release.md) / [plan](../.specs/active/0036-jetbrains-marketplace-release.plan.md): T-001…T-005, T-007 ticked; T-006 waits on gate 4 (Blockers); G0 first.
- [0035](../.specs/active/0035-send-and-copy-for-each-assistant-in-jetbrains.md) / [plan](../.specs/active/0035-send-and-copy-for-each-assistant-in-jetbrains.plan.md): Send to three CLI agents (PD-112), T-014, T-016…T-024 ticked; T-023 closed by decision (markers `K-1 pending`); AC-027, AC-053 partial (plan handoff).
- [0034](../.specs/active/0034-studio-for-jetbrains-ides.md) / [plan](../.specs/active/0034-studio-for-jetbrains-ides.plan.md): JetBrains IDEs, T-001…T-042 ticked, G4 fix round closed; open: AC-007, AC-020, AC-028 (trend timings Windows 2025.3, macOS) and Gregor's AC-040 (partial), AC-041, AC-042; baseline `3bc615c`.
- [0027](../.specs/active/0027-attach-spec-when-sending.md) / [plan](../.specs/active/0027-attach-spec-when-sending.plan.md): Send attaches the spec for Copilot and Claude Code in every version (PD-091), T-001…T-011 verified; AC-016, AC-017, AC-020 are Gregor's or the orchestrator's.
- [0024](../.specs/active/0024-send-next-step-to-assistant.md) / [plan](../.specs/active/0024-send-next-step-to-assistant.plan.md): Send to Copilot / Claude Code, T-001…T-022 verified; AC-016…AC-019 are Gregor's; OP-004 closed by PD-078.
- [0023](../.specs/active/0023-plan-map-stages-parallel-work.md) / [plan](../.specs/active/0023-plan-map-stages-parallel-work.plan.md): Plan map, T-001…T-017; AC-018 real window, AC-019, AC-020 are Gregor's.
- [0022](../.specs/active/0022-layout-and-signal-polish.md) / [plan](../.specs/active/0022-layout-and-signal-polish.plan.md): layout and signals, T-001…T-022; AC-020, AC-021 are Gregor's.
- [0021](../.specs/active/0021-next-step-intent-and-guidance.md) / [plan](../.specs/active/0021-next-step-intent-and-guidance.plan.md): intent and guidance, T-001…T-016; AC-022 real window, AC-023…AC-025 are Gregor's.
- [0020](../.specs/active/0020-native-spec-tree.md) / [plan](../.specs/active/0020-native-spec-tree.plan.md): native Specs tree, T-001…T-025; AC-022 on `tip-splitter` is Gregor's.
- [0017](../.specs/active/0017-next-step-everywhere.md) / [plan](../.specs/active/0017-next-step-everywhere.plan.md): next step everywhere, T-001…T-012; AC-026 is Gregor's.
- [0016](../.specs/active/0016-honest-signals.md) / [plan](../.specs/active/0016-honest-signals.plan.md): honest signals, T-001…T-013; AC-025 Hands-On is Gregor's.
- [0015](../.specs/active/0015-focus-on-visibility.md) / [plan](../.specs/active/0015-focus-on-visibility.plan.md): focus on visibility, T-001…T-020; M-1 (AC-030) is Gregor's.
- [0014](../.specs/active/0014-setup-featherspec-from-studio.md) / [plan](../.specs/active/0014-setup-featherspec-from-studio.plan.md): setup from the Studio; M-2 with the button is Gregor's.
- Completed: 0001…0007, 0013 in `done/`; 0008…0012 are Deprecated (successor 0015); plans frozen in `plan-archive/`.
- Completed 2026-11-26: [0018](../.specs/done/0018-overview-and-compact-board.md) ([plan](../.specs/plan-archive/0018-overview-and-compact-board.2026-11-26.plan.md)), [0019](../.specs/done/0019-detail-situation-picture.md) ([plan](../.specs/plan-archive/0019-detail-situation-picture.2026-11-26.plan.md)); READY at `6b75ef0`.
- Completed 2026-11-19: 0025, 0026, 0028 (`done/`, plans in `plan-archive/`).
- Completed 2026-11-20: [0029](../.specs/done/0029-onboarding-before-setup.md), [0030](../.specs/done/0030-clarified-step-quiet-attach-tip.md), [0031](../.specs/done/0031-send-on-follow-up-lines.md); plans in `plan-archive/`.
- Completed 2026-11-20: [0032](../.specs/done/0032-release-polish.md), [0033](../.specs/done/0033-start-via-lifecycle-plan-attachment-prompt-layout.md); plans in `plan-archive/`; CI on PR #2 open.

## Changed Recently
- 2026-11-26: 0018 and 0019 moved to `done/`; traceability of 0014–0017, 0020–0024, 0027 normalised, 0022 got AC-030/AC-031, 0027 rows follow PD-091, 0030, 0033.
- 2026-11-26: 0036 T-005, T-007 built (CHANGELOG 0.2.0 Unreleased, checklist section); T-006 version and README built.

## Decisions in Flight
- 0034: the proxy decisions await Gregor (plan handoff).
- `AGENTS.md` stays above its 200-line target: the template body alone is 200 lines; further eviction would edit template wiring, Gregor's call.

## Blockers / Questions
- 0036 gate 4: `problems.test.ts` AC-005 red on spec 0038's status, not 0036; Gregor decides.
- 0034: `AGENTS.md` at 14991/15000 bytes (boundary detail moved to `core.md`; proxy decision, Gregor confirms); no other model family for the compile here (Claude only).
- Gregor's manual checks stay in the specs: 0014 AC-026; 0015 AC-030; 0016 AC-025; 0017 AC-026; 0020 AC-022; 0021 AC-022 (real window), AC-023…AC-025; 0022 AC-020, AC-021; 0023 AC-018…AC-020; 0024 AC-016…AC-019; 0027 AC-017, AC-020.
- Also Gregor's: 0025 AC-022 real window, AC-023, AC-024; 0026 AC-017, AC-019; 0028 AC-015; 0029 AC-014; 0030 AC-013; 0031 AC-009; 0032 (16 §4.1); 0033 (17 §5).

## Next
1. 0034/0035: Gregor's rest checks (AC-040 three themes and live switch, AC-041 WebStorm, AC-042 keyboard, screen reader, no JCEF; 0035 AC-027/AC-053 Junie CLI, waiting screens, Safe Mode, PATH hint, versions; Junie probe JSON), then a fresh `/sdd-compile` per spec.
2. 0033: Gregor's practice check on `C:\projects\test` (Ready → Set active → T-001, new VSIX), then a fresh `/sdd-compile` and CI.
3. 0032: compile READY at 3e09514; CI on PR #3, VSIX to Gregor for 16 §4.1, then the release checklist.
4. 0027: Gregor's AC-017 and AC-020, then `/sdd-compile`.
5. 0029 and 0030: CI on PR #2, then Gregor's AC-014 and AC-013; the other specs' CI items run on the same PR.
6. 0031: AC-009 Gregor; CI on PR #2

## Validation
- `6b75ef0` (2026-11-26): node + webview 4485/6 skipped, timing 35/35, check-types 0, eslint 0, guards 75/75; CI 45728313993 as above. Windows at 4304f86: unit 3900/8 + 35 timing, npm test 34+1+1+1.
