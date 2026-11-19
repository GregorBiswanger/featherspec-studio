# Active Context

Last updated: 2026-11-19
Current branch: ux-round-3
Current phase: act

## Now
- Round 3 on `ux-round-3`: 0026 (Send defaults and wording) is built, T-001…T-011; the compile report's fixes are in (traceability, §5 notes, docs).
- 0021–0024 are implemented; their specs stay In Progress in `active/`.
- Waits for: a fresh `/sdd-compile` of 0026, CI at the PR, Gregor's checklist ([docs/release-checklist.md](../docs/release-checklist.md)).

## Active Spec
- [0026](../.specs/active/0026-send-defaults-and-wording.md) / [plan](../.specs/active/0026-send-defaults-and-wording.plan.md): Send defaults and wording, T-001…T-011 done; AC-017 (orchestrator half checked), AC-018, AC-019 are Gregor's.
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

## Changed Recently
- 0025 (PD-082), Implemented 2026-11-19: step IDs link into the Plan map (one-shot focus); `Show in Plan Map` in the tree; next step in the map header; `· 67%`; step motifs; richer cards; one returned-work statement. Windows `npm test` at 7ea11f3 passed.
- 0028 (PD-081, PD-082, PD-087): a plan with every step ticked or struck is Review; below FeatherSpec 1.11.0 the sign puts `/sdd-plan` first, and in every version a `Verified:` line without a tick does; NS-7 is `Implement <ID> of <plan>`; snapshots guard the rest. Done 2026-11-19, `READY (manual items: 1)`.
## Decisions in Flight
- `AGENTS.md` stays above its 200-line target: the template body alone is 200 lines; further eviction would edit template wiring, Gregor's call.
- Publisher ID `GregorBiswanger` is confirmed (2026-11-17).

## Blockers / Questions
- Gregor's manual checks stay in the specs: 0025 AC-022 real window, AC-023, AC-024; 0028 AC-015.

## Next
1. A fresh `/sdd-compile` of 0026, then the round-3 PR so CI runs (0021 AC-020, 0022 AC-017, 0023 AC-016, 0024 AC-014, 0025 AC-020, 0028 AC-012).
2. Gregor's AC-017, AC-018 and AC-019 for 0026.
3. Implement 0027 the same way.

## Validation
- Windows at 25c6b92: unit 3502 passed, 8 skipped, timing 28 passed; `npm test` 33+1+1+1, exit 0. CI pending on the round-3 PR.
