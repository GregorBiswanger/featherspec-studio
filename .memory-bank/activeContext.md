# Active Context

Last updated: 2026-11-19
Current branch: ux-round-3
Current phase: act

## Now
- Round 2 (0021–0024) is implemented and fixed on `ux-round-2`; the plans are Done, the specs stay In Progress in `active/`.
- The final check of round 2 (045b354..5c70dbd) found docs only; its fixes, 0024 T-014…T-022, are done.
- Waits for: CI at the PR, Gregor's checklist ([docs/release-checklist.md](../docs/release-checklist.md)), then a fresh `/sdd-compile` per spec.

## Active Spec
- [0028](../.specs/active/0028-plan-state-aware-next-step.md) / [plan](../.specs/active/0028-plan-state-aware-next-step.plan.md): plan-state-aware next step (finished plan is Review, Report first, `Implement <ID>`), T-001…T-009 in progress; AC-013…AC-015 are the orchestrator's and Gregor's.
- [0024](../.specs/active/0024-send-next-step-to-assistant.md) / [plan](../.specs/active/0024-send-next-step-to-assistant.plan.md): Send to Copilot / Claude Code, T-001…T-022 verified; AC-016…AC-019 and OP-004 are Gregor's.
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
- Completed: 0001…0007 and 0013 in [.specs/done/](../.specs/done/); 0008…0012 there are Deprecated (successor 0015); plans frozen in [.specs/plan-archive/](../.specs/plan-archive/).

## Changed Recently
- 0028 (PD-081, PD-082, PD-087): a plan with every step ticked or struck is Review; below FeatherSpec 1.11.0 the sign puts `/sdd-plan` first, and in every version a `Verified:` line without a tick does; NS-7 is `Implement <ID> of <plan>`; snapshots guard the rest. T-008 (preview, AC-013) waits for the orchestrator.
- Final check of round 2, docs only (0024 T-014…T-022): README shots retaken plus a Plan map shot; `activeContext.md` and the `AGENTS.md` module lines shortened; CHANGELOG, README, checklist, §5 and the plans made consistent.
- 0024 fix round (compile S82, T-008…T-013): Send decides its silent copy by the effective setting; nothing runs after the 5 s fallback; focus handoff belongs to the place (`StepAction`); scan exemptions shrink to 0024's names.
## Decisions in Flight
- `AGENTS.md` stays above its 200-line target: the template body alone is 200 lines; further eviction would edit template wiring, Gregor's call.
- Publisher ID `GregorBiswanger` is confirmed (2026-11-17).

## Blockers / Questions
- OP-004 (0024, Gregor's): does Copilot's `open` replace an unsent draft in the current chat? If so, he decides whether NS-6 with Copilot defaults to a new chat. Not blocking the PR.

## Next
1. Open the PR (draft is fine) so CI runs: 0021 AC-020, 0022 AC-017, 0023 AC-016, 0024 AC-014.
2. Gregor: the release checklist in a real window with the build; record OP-004; decide the wording "same chat" / "current chat" (0024 AC-019).
3. A fresh `/sdd-compile` per spec 0014…0024, one session each; then the checklist's Go.

## Validation
- Gates green at 5c70dbd; Windows: unit 3109 passed, 7 skipped, +18 timing, `npm test` 32+1+1+1. Evidence per spec and the open manual criteria: each plan's traceability and handoff.
