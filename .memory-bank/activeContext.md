# Active Context

Last updated: 2026-11-17
Current branch: main
Current phase: idle

## Now
Release preparation for 0.1.0: all 13 specs are `Implemented` in `.specs/done/`; waiting for Gregor's pre-release checklist and his Go for the Marketplace.

## Active Spec
- None. Completed: 0001…0013 in [.specs/done/](../.specs/done/), plans frozen in [.specs/plan-archive/](../.specs/plan-archive/) (e.g. [0010 spec](../.specs/done/0010-first-agent-provider-copilot.md) / [plan](../.specs/plan-archive/0010-first-agent-provider-copilot.2026-11-17.plan.md), [0012 spec](../.specs/done/0012-live-agent-activity-monitoring.md) / [plan](../.specs/plan-archive/0012-live-agent-activity-monitoring.2026-11-17.plan.md)).
- 0010 is proven by the Windows host suite with `FEATHERSPEC_COPILOT_SMOKE=1` (dev build and unpacked VSIX).

## Changed Recently
- PD-048 (Gregor, first local test of the VSIX): the Activity Bar icon is the FeatherSpec logo mark in one colour (`media/studio.svg`, traced from `featherspec-logo.png`); every tree entry has its own product icon (`AREA_ICONS` in `src/core/shell/treeModel.ts`; spec 0005 AC-003, §9).
- Found on the Windows machine and the hosted Windows runner after all specs were done, fixed test-first:
  - 0010: an approved write produced no `file.changed`. CLI 1.0.87 sends no `fileEdits`; `file.changed` is now derived from the approved `write` request and its successful tool, `session.info` ignored, `fileChanges` `derived` (spec 0010 §7, AC-012; fixture `recorded-approved-write-2026-11-17.jsonl`).
  - 0004: events that arrive while a write of their run is in flight go out in one append (10,000 events took >10 s on NTFS); `dispose()` drains every write it started and a closed store refuses writes; the file medium retries `EPERM`/`EBUSY`/`EACCES` (about 0.5 s at most). Contract suite also runs against a 4 ms-slow medium.
  - Tests: no-write tests close their store before removing the history folder; timing projects have a 120 s framework limit (budgets unchanged); the Copilot smoke cleanup never replaces the test's error; the shell suite lets the first webview of the window load before its open/close tests; the negative activation control names its activation event.
- CI: a failed run uploads the VS Code logs; `publish.yml` publishes by hand through Trusted Publishing (no token; PATs end 2026-12-01).
- Release metadata, README with `media/screenshots/`, CHANGELOG 0.1.0, [release checklist](../docs/release-checklist.md); `AGENTS.md` snapshot compacted (229 → 215 lines), module detail in `.architecture/`.

## Decisions in Flight
- `AGENTS.md` stays 15 lines over its 200-line target: the FeatherSpec 1.10.0 template body alone is 200 lines; the rest is project preferences and the snapshot. Further eviction would edit template wiring — Gregor's call.
- Publisher ID `GregorBiswanger` is a placeholder (first checklist item).

## Blockers / Questions
- None.

## Next
1. Gregor: work through [docs/release-checklist.md](../docs/release-checklist.md) (publisher ID, icon, repository visibility, Trusted Publishing policy, manual passes).
2. Gregor: Go → `gh workflow run publish.yml -f confirm=publish`.

## Validation
- Green 2026-11-17 on the Windows machine (Node 26, NTFS) at the release head: `npm run test:unit` (2,154 + 11 timing), `npm test` (29 + 1 + 1 passing, 3 opt-in pending), the host suite with `FEATHERSPEC_COPILOT_SMOKE=1` (32 passing, real Copilot run with an approved write), and the same opt-in suite against the unpacked `featherspec-studio-0.1.0.vsix` (11 files, ~291 KB).
- CI (ubuntu-latest, windows-latest): see the Actions tab; windows-latest had a webview-load flake in the shell suite before the warm-up.
- Pending: the checklist.
