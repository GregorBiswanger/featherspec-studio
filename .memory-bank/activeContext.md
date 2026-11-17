# Active Context

Last updated: 2026-11-17
Current branch: main
Current phase: idle

## Now
Release preparation for 0.1.0: all 13 specs are `Implemented` in `.specs/done/`; waiting for Gregor's pre-release checklist and his Go for the Marketplace.

## Active Spec
- None. Completed: 0001…0013 in [.specs/done/](../.specs/done/), plans frozen in [.specs/plan-archive/](../.specs/plan-archive/) (e.g. [0010 spec](../.specs/done/0010-first-agent-provider-copilot.md) / [plan](../.specs/plan-archive/0010-first-agent-provider-copilot.2026-11-17.plan.md), [0012 spec](../.specs/done/0012-live-agent-activity-monitoring.md) / [plan](../.specs/plan-archive/0012-live-agent-activity-monitoring.2026-11-17.plan.md)).
- 0010's done move rests on the Windows host suite at the merged head (plain and with `FEATHERSPEC_COPILOT_SMOKE=1`).

## Changed Recently
- Release metadata: `package.json` 0.1.0 with publisher (placeholder), icon `media/icon.png`, repository, license, categories, keywords; `.vscodeignore` keeps the VSIX to dist, media (without screenshots), README, CHANGELOG, LICENSE; `vsc-extension-quickstart.md` removed.
- Docs: Marketplace [README](../README.md) with `media/screenshots/`, [CHANGELOG](../CHANGELOG.md) 0.1.0, [release checklist](../docs/release-checklist.md).
- `AGENTS.md` snapshot compacted (229 → 215 lines); module detail in `.architecture/{core,adapters,webview}.md`.
- Timing tests in `*.timing.test.*`, run after the rest of `npm run test:unit` in one worker (see `techContext.md`).
- 0012 follow-up: Agent Center fallback reason is a sentence ("the run history of this project is not open"); host smoke renamed to AC-012/AC-013.
- Link fixes in the archived plans of 0006 and 0008.

## Decisions in Flight
- `AGENTS.md` stays 15 lines over its 200-line target: the FeatherSpec 1.10.0 template body alone is 200 lines; the rest is project preferences and the snapshot. Further eviction would edit template wiring — Gregor's call.
- Publisher ID `GregorBiswanger` is a placeholder (first checklist item).

## Blockers / Questions
- None.

## Next
1. Orchestrator/Gregor: Windows host suite at the release head (`npm test`, plain and Copilot opt-in).
2. Gregor: work through [docs/release-checklist.md](../docs/release-checklist.md) (publisher, icon, screenshots pushed, manual passes).
3. Gregor: Go → `npx @vscode/vsce publish`.

## Validation
- See the last gate run in the release-preparation session: eslint, both `tsc`, `npm run test:unit`, `npm run compile`, `npm run compile-tests`, `npm run package`. Pending: host suite on Windows, the checklist.
