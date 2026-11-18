# Active Context

Last updated: 2026-11-17
Current branch: main
Current phase: act

## Now
0015 (Focus the Studio on visibility: no agent runs, a named next step) is implemented, T-001…T-015 and the compile fixes T-016…T-020 verified on `main`; spec stays `In Progress` until Gregor's M-1 and a fresh `/sdd-compile`. [spec](../.specs/active/0015-focus-on-visibility.md) / [plan](../.specs/active/0015-focus-on-visibility.plan.md). Also open: 0014 (Set up FeatherSpec from the Studio), `In Progress` in `active/` until Gregor has tried the button (M-2), then `/sdd-compile` again. Release preparation waits for Gregor's checklist.

## Active Spec
- [0015 spec](../.specs/active/0015-focus-on-visibility.md) / [plan](../.specs/active/0015-focus-on-visibility.plan.md), In Progress, all steps verified (T-016…T-020: fixes from the compile of 2026-11-17).
- [0014 spec](../.specs/active/0014-setup-featherspec-from-studio.md) / [plan](../.specs/active/0014-setup-featherspec-from-studio.plan.md), In Progress.
- [0016 spec](../.specs/active/0016-honest-signals.md) / [plan](../.specs/active/0016-honest-signals.plan.md), In Progress, 10 steps, started 2026-11-17 (Baseline 3cdab90); T-001…T-006 verified. Planned: 0017…0020 in backlog/, specified, unplanned.
- Completed: 0001…0007 and 0013 in [.specs/done/](../.specs/done/) (amended by 0015); 0008…0012 in done/ are Deprecated with a successor link to 0015. Plans frozen in [.specs/plan-archive/](../.specs/plan-archive/).

## Changed Recently
- 0015 compile fixes (T-016…T-020): store opener `createProjectStoreOpener` with 0004 AC-009 tests; board filter and sort tests restored; "Move Spec to…" Copy says Copied / Could not copy (core `createMoveResultPresenter`); ADR-001 §14 note; AC-021 exceptions add AC-025 (OP-008); brief mission, CHANGELOG 0.1.0, systemPatterns, design brief; audit completed.
- 0015 (PD-055, PD-056): Studio starts no agent. Removed: providers, orchestrator, agent start, Agent Center, run commands and settings, `@github/copilot-sdk`. Added: Next step with Copy in the spec detail, Ready → Active shows the next step, the store keeps only the spec status history, earlier run data is removed at every activation, scan tests for sources, bundle and product docs. Tag `archive/agent-runs-2026-11-17` keeps the old state.
- PD-054 (Gregor): the panel navigation shows an icon per area, the editor tab shows the logo mark.
- 0014: Studio can set up a folder from the latest GitHub release (the one write and network exception, PD-049).

## Decisions in Flight
- `AGENTS.md` stays 15 lines over its 200-line target: the FeatherSpec 1.10.0 template body alone is 200 lines; the rest is project preferences and the snapshot. Further eviction would edit template wiring — Gregor's call.
- Publisher ID `GregorBiswanger` is confirmed: it is Gregor's existing Marketplace publisher (2026-11-17).

## Blockers / Questions
- None.

## Next
1. Gregor: AC-030 / M-1 on `tip-splitter` (release checklist), `npm test` on Windows and CI at the fix head (product code changed in T-016, T-018; pre-done gate, AC-027); then `/sdd-compile` for 0015 in a fresh session.
2. Gregor: 0014 M-2 with the button, then `/sdd-compile` for 0014.
3. Gregor: work through [docs/release-checklist.md](../docs/release-checklist.md), then Go.
4. Gregor (or delegate): review the 0016 plan (proxy readings Q-1…Q-12 in its Research), commit it, then the start signal for T-001.

## Validation
- 0015: gates 1–5 and compile-tests green in the agent sandbox after T-020 (1688 passed + 3 skipped, 12 timing); `npm test` green on Gregor's Windows at `c4f7a5d`, not yet at the fix head.
