# Plan — Plan-State-Aware Next Step

**Spec:** [0028-plan-state-aware-next-step.md](0028-plan-state-aware-next-step.md)
**Status:** In Progress
**Last updated:** 2026-11-19
**Current step:** T-001

## Approach

Three pure rules land in the core, the surfaces follow because they already read `LifecycleEntry.state` and `nextStep()`.
First the Baseline is frozen as data (T-001): every "deep-equal to the commit on which this spec's implementation starts"
criterion (AC-003, AC-005, AC-010, AC-016) compares against snapshots written before any rule changes, so no later step can
move the yardstick. Then the riskiest rule, *finished plan → Review* (T-002: `finishedPlan()` in `decide()`), because it
changes a state on every surface and the status history; then *Report first* with the version switch (T-003:
`reportSign()` beside `openStep()`, `levelsOnImplement()` beside `compareVersions()`), *Verified without tick* and the
version-dependent session reason (T-004: the only change to `stepTips()`'s inputs), and NS-7's start prompt (T-005).
Stage 3 proves the surfaces and the live switches; stage 4 is the preview, §5's notes, docs, the title audit and the gates.
No new module, no new dependency, no new component (so no stub component; new tests go red on their assertions, 0028 §10).
Memory Bank touched in T-009 only: `techContext.md`, `activeContext.md`; `systemPatterns.md` gets no entry (no new pattern).

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` · 2 `npx tsc --noEmit`
· 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (T-009 only: docs scans and bundle
test) · pre-done `npm test` on Windows and CI, run by the orchestrator (cannot run here).

## Research

**Checkpoint digest (2026-11-19, Mode A; answered from the standing answer `PLAN-R3.md`, Gregor not reachable).**
The spec touches existing code, so a checkpoint applies; every answer comes from the binding sources:
- OP-002 resolved by `docs/ux-audit/13-clicktest-results.md` ("0028: no change from the test"; points 1–8 unanswered, so
  the proxies stand; AC-014 not run, its tasks go to AC-015 / 12 F-3). Written into the spec before this plan.
- OP-005 resolved: `496f9fe` gave `fs-version-missing` a `.claude/commands/sdd-plan.md`, so it reads as legacy (checked:
  `classifyFolder` legacy rule, fixture tree). Written into the spec.
- OP-006 (new, proxy): 0028 lands before 0026, so AC-020's "0026 §7 reason" is today's one `sameOrNew` reason until 0026
  rewrites it; the 1.11.0 reason is §7's literally. Written into the spec.
- PD-084…PD-089 (newest wins): only PD-087 bears on 0028 and is in the spec already; PD-086 keeps `Report` as a short
  intent. Cross-spec D-1 and D-4 are in the spec (§6.1, §6.5). 12 D1-1…D1-6 map to §6.4, §6.3 (1), §6.6, §7, AC-021.
- No survey finding contradicts the spec. No `done/` spec becomes a `Deprecated` candidate: 0003 and 0013 get §5 notes.
- Risk outside the repo: FeatherSpec 1.11.0 is unreleased (12 C-1…C-6 open; the public release page could not confirm a
  tag from here). The switch's bound rests on `orch/featherspec-1.11.0/REPORT.md` §2 (*Level first*, `AGENTS.md`
  "Before a session's first step", stamp `1.11.0`). A-011 says what moves if the release differs: only the constant of T-003.

**Survey (code at `8a64ff7`; `npm run test:unit` 3,154 passed + 3 skipped, timing 18 passed, run 2026-11-19).**
- State: `decide()` (`src/core/lifecycle/deriveLifecycle.ts`) gives S-REVIEW only for `active` + `In Progress` +
  `planStatus === 'Done'`; Blocked (`context.blocked`: plan `Blocked` or a BLOCKED note) and contradictions come first.
  `EntryContext` has `siblingPlan`, `siblingPlanReadable`, `planStatus`. Every surface reads `entry.state`: `badgeOf()`
  (`core/shell/specTree.ts`, Review + Blocked), Now order (`core/overview/rows.ts` `inOrder`), Board columns, status bar.
  History: `core/lifecycle/flow.ts`, `statusHistory.ts` (Active ↔ Review in flow already exists for plan `Done`).
- Next step: `nextStep()` (`core/board/nextStep.ts`); Active cases in order returned → no plan → `NS-6-resume` (no
  `openStep()`) → `NS-6-open` (variant A: continue line, then `NS6_REPORT_INTENT`). `openStep()` counts
  `ticked !== true` as open. `startLine()` gives `Start <ID> of <plan>` / `Implement <plan>`; `shortForm()` has `Start`
  and bare `Implement` branches. NS-7's intent `startIntent()` (`START_PLAN_INTENT` without an open step).
- Texts: `src/shared/protocol/nextStepTexts.ts` holds `StepCase`, `STEP_GUIDES` (exhaustive record: short, session,
  model, effect, then), the intents, `SESSION_REASONS` (`sameOrNew`: `Same chat or new chat: … let the agent report
  first.`). `stepTips(case, settings, closing)` (`core/board/stepTips.ts`) builds coach and paragraph 1 = effect + then;
  callers `core/board/detail.ts` `nextStepView()` and `core/overview/rows.ts` `rowOf()`, both with the model at hand.
  `sendViewOf()` keys on `STEP_GUIDES[case].session` (`any` → current chat with Copilot). Plan map `waysCase`
  (`core/planMap/planMap.ts:199`) offers ways only for `NS-6-open` and `NS-7`, so a new case gets none by itself (AC-007).
- Plan facts: `ParsedPlan.currentStep` is a `HeaderField`; `PlanStep` has `id`, `ticked: boolean | 'undetermined'`,
  `struck`, `verified: FieldValue` (`placeholder` = `—`, `_none_`, `_none yet_`; `empty`; `absent`).
- Version: `ProjectRead.version` (string; `unknown` without a line, `discoverWorkspace.ts`), `parseSemanticVersion()`,
  `compareVersions()` (`core/specs/version.ts`; pre-release below release). `discoveryController.sameActive()` compares
  `version`, so an `AGENTS.md` change re-reads the project (PD-033). Test helpers pass a constant: `readFixture()` and
  `readMemory()` (`core/lifecycle/testing/projects.ts`) use `VERSION = '1.10.0'`; the five `fs-*` fixtures need their own
  `AGENTS.md` value (`discovery/versionLine.ts` `readVersionLine()`), added as an optional parameter in T-001.
- Fixtures: `fs-version-missing` (no line, legacy marker), `fs-version-1100`, `fs-version-1110` (`Current step: T-004`,
  open T-003), `fs-verified-no-tick` (1.11.0, T-003 `Verified` filled, untouched box), `fs-partial-return` (1.11.0, note
  for T-005). Host smoke copies only named fixtures (`.vscode-test.mjs`), so new fixture folders do not reach `npm test`.
  Every plan in this repo's `active/` says `Done`: AC-010's repo part has no exception at `8a64ff7`.
- Tests the change replaces (spec §10, scratch run): 9 by §6.1, 14 by §6.5 (`nextStep.test.ts` 10, `copyNextStep.test.ts`
  2, `statusEntry.test.ts`, `cards.test.ts`); *fixture only* ones keep title and assertions and get an open step.
- [Semantic Versioning 2.0.0, §11](https://semver.org/) — a pre-release has lower precedence than its release
  (`1.0.0-rc.1 < 1.0.0`), build metadata is ignored; settles `1.11.0-rc.1` as old (AC-009) and that
  `compareVersions()` needs no change. Retrieved 2026-11-19.
- `orch/featherspec-1.11.0/REPORT.md` §2 (local, the 1.11.0 branch report) — *Prompts* `Implement <ID> of <plan path>` is
  the start signal; *Level first* and the `AGENTS.md` gate; stamp `1.11.0`. Read 2026-11-19.

## Stages

1. T-001 → T-002 → T-003 — Baseline frozen; a finished plan is Review; Report first by the sign below 1.11.0
2. T-004 → T-005 — *Verified without tick* and the version-dependent reason; NS-7 starts with `Implement <ID>`
3. T-006 ‖ T-007 — independent: surface sweep and live switches (separate test files, no production file); run in sequence
4. T-008 → T-009 — preview evidence; §5 notes, docs, title audit, Memory Bank and final gates

Parallel: stage 3 (runs in sequence, `PLAN-R3.md`). Stages 1 and 2 share `nextStep.ts` and `nextStepTexts.ts`: no `‖`.

## Steps

### T-001 — Freeze the Baseline as snapshots

- **Covers:** AC-010, AC-003, AC-005, AC-016 (their "as at the commit on which implementation starts" part)
- **Do:** `readFixture(name, version?)` / `readMemory(files, version?)` take an optional version (default `VERSION`);
  `fixtureVersion(name)` reads `AGENTS.md` with `readVersionLine()`. New `src/core/board/testing/caseFixtures.ts`: the
  memory fixtures of AC-001 (tip-splitter, T-001…T-006 in three stages), AC-003, AC-004, AC-005 (one per `Current step`
  value), AC-016. New `src/core/board/testing/nextStepSnapshot.ts`: per spec `{ state, rule, persistence, nextStep,
  stepView, tips }` (tips with default settings). `test/fixtures/repo-<Baseline>/.specs` from `git archive <Baseline> .specs`.
  Snapshots `test/fixtures/next-step-baseline/<name>.json` for every fixture project, the repo copy and `caseFixtures`,
  written once by a script under `src/core/board/testing/`; `nextStepBaseline.test.ts` "0028 AC-010 …" compares head to
  snapshot with an exception list that is empty here.
- **Verify:** `npx vitest run --project node src/core/board/nextStepBaseline.test.ts` green on the Baseline; negative
  control: one snapshot value edited by hand gives red, then restored.
- [ ] **Verified (T-001):** —
- **Notes:** —

### T-002 — A finished plan is Review

- **Covers:** AC-001, AC-002, AC-003
- **Do:** pure `finishedPlan(plan)` in `deriveLifecycle.ts` (readable, ≥ 1 step `ticked === true`, each step ticked or
  struck); `decide()` S-REVIEW reads `planStatus === 'Done' || finishedPlan(...)` after Blocked and contradictions.
  `STEP_GUIDES['NS-6-resume']` effect and then from §7. Tests: `deriveLifecycle.test.ts` "0028 AC-001 …" (plan `In
  Progress`, `Not started`, no status, ± DONE note: Review, S-REVIEW, derived; entry, `nextStep()` and the detail's
  next-step view deep-equal to plan `Done`, for each `featherspec-studio.assistant` value), "0028 AC-002 …" (struck-only,
  no step, unreadable: Active + §7 texts; one undetermined tick: variant A), "0028 AC-003 …" (Blocked plan, BLOCKED
  note, `Draft` in `active/`, `backlog/`: equal to the T-001 snapshot). Retitle or retarget the 9 tests §10 names (list
  in `Notes:`); *fixture only* tests get an open step. Snapshot exceptions: only AC-010's kinds, each named in the list
  (this repo's copy has none; fixtures as found).
- **Verify:** `npm run test:unit` — red first on the new assertions (state `Active`, old texts), then green.
- [ ] **Verified (T-002):** —
- **Notes:** —

### T-003 — Report first by the sign, below 1.11.0

- **Covers:** AC-004, AC-005, AC-009, AC-021 (`fs-version-missing`, `fs-version-1100`, `fs-version-1110`, `fs-partial-return`)
- **Do:** `levelsOnImplement(version)` in `core/specs/version.ts` (`LEVELLING_SINCE = '1.11.0'`; unparsable, `unknown`,
  pre-release of 1.11.0 → false). `reportSign(plan, open)` beside `openStep()` (`/\bT-\d+\b/` tokens of a `value`
  `Current step` equal to step IDs; one names an unfinished step; none is the open one). New `StepCase` `NS-6-report`:
  `STEP_GUIDES` entry (`Report`, `any`, `fast`, §7 effect and then), intent `NS6_REPORT_FIRST_INTENT`; `nextStep()` Active
  order of §6.3: returned → no plan → no open step → (sign and old version) → variant A; line 1 `/sdd-plan <spec>`, line 2
  `Implement <ID> of <plan>` under `continueIntent()`. Tests in `nextStep.test.ts`: "0028 AC-004 …" (literal lines, short
  form `Report · /sdd-plan`, coach, toggletip paragraph 1), "0028 AC-005 …" (each `Current step` value deep-equal to
  its snapshot), "0028 AC-009 …" (version table); `version.test.ts` for `levelsOnImplement`; `fiveFixtures.test.ts`
  "0028 AC-021 …" `nextStep()` and status bar (`statusEntry`) for four fixtures.
- **Verify:** `npm run test:unit` — red first (variant A where Report first is expected), then green.
- [ ] **Verified (T-003):** —
- **Notes:** —

### T-004 — Verified without tick and the session reason by version

- **Covers:** AC-017, AC-018, AC-020, AC-021 (`fs-verified-no-tick`), AC-009 (the session-reason exception)
- **Do:** guard `verifiedWithoutTick(plan)` beside `reportSign()` (first step in plan order, not struck, `ticked !== true`,
  `verified.state === 'value'`); §6.3 (4) before the sign, after returned work, in every version; the `NS-6-report` result
  carries `reason: '<ID> has a Verified line but no tick.'`. `stepTips()` takes the next step's `reason` (prefixed to
  paragraph 1 with one space) and the project version (`SESSION_REASONS` gains the §7 1.11.0 text; `sameOrNew` picks by
  `levelsOnImplement`); callers `detail.ts`, `rows.ts` pass `model.project.version`. Tests: `nextStep.test.ts` "0028
  AC-017 …" (every AC-009 version, ± sign, placeholders `—`, empty, absent give no guard), "0028 AC-018 …" (the four
  `fs-partial-return` variants deep-equal but the reason); `stepTips.test.ts` "0028 AC-020 …" (versions both ways, each
  reason once in the text modules); `fiveFixtures.test.ts` gains `fs-verified-no-tick`.
- **Verify:** `npm run test:unit` — red first (no guard, one reason), then green.
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — NS-7 starts with Implement

- **Covers:** AC-016
- **Do:** `startLine()` → `Implement <ID> of <plan>`; without an open step NS-7 returns `/sdd-plan <spec>` with case
  `NS-6-resume` (rule stays `NS-7`), so its intent, coach, effect and then are AC-002's. `START_PLAN_INTENT` and
  `shortForm()`'s `Start` and bare-`Implement` branches go (idle). Tests: `nextStep.test.ts` "0028 AC-016 …" (with step:
  every field but the line equal to the T-001 snapshot; without: AC-002's texts; a sweep of every `caseFixtures` and
  fixture result: no line starts with `Start ` or equals `Implement <plan path>`). Replace the 14 tests §10 names (list
  in `Notes:`); `planMap.test.ts` stays green (ways for NS-7 unchanged).
- **Verify:** `npm run test:unit` — red first (`Start T-001 of …`), then green.
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Every surface shows Review and Report first

- **Covers:** AC-006, AC-007
- **Files:** `src/core/board/surfaces0028.test.ts`, `src/adapters/node/surfaces0028.bundle.test.ts`, `src/core/planMap/planMap0028.test.ts`
- **Do:** tests only (the surfaces read state and `nextStep()`): for AC-001's and AC-004's fixtures the detail, Board card
  and column, Now row and order, tree row (group, icon, description, tooltip), badge, status bar (text, tooltip), quick
  pick; rendered with the bundle in jsdom, no text contains `Let the agent report where the plan stands`; the status bar
  example of AC-006 literally. Plan map: no `Ways to run stage <n>`, *next* on the open step; with `Current step` on it,
  0023 AC-009's disclosure. Immediately green: each file gets a negative control (plan `Not started` with an open step
  → Active, ways shown).
- **Verify:** `npx vitest run src/core/board/surfaces0028.test.ts src/adapters/node/surfaces0028.bundle.test.ts src/core/planMap/planMap0028.test.ts`
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — Plan and version changes show within 500 ms

- **Covers:** AC-008, AC-019
- **Files:** `src/core/board/planState0028.timing.test.ts`, `src/core/shell/version0028.timing.test.ts`
- **Do:** tests only, on the board and shell worlds with `BUDGET_MS.uiFreshness`: the last open step ticked, a tick
  removed, `Current step` edited → detail, Overview, Board within 500 ms, selection and area kept, one history entry *in
  flow* on Active ↔ Review; `FeatherSpecVersion:` 1.10.0 → 1.11.0, back, `next`, removed → detail, Overview, tree, status
  bar switch AC-004's fixture between Report first and variant A. Negative control: a change that switches nothing adds
  no history entry.
- **Verify:** `npx vitest run --project timing-node src/core/board/planState0028.timing.test.ts src/core/shell/version0028.timing.test.ts`
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — Preview at two widths and three themes

- **Covers:** AC-013
- **Do:** the orchestrator's harness (`/home/claude/orch/preview/run.sh`) on AC-001's and AC-004's fixtures: detail and
  first Now row, Dark, Light, High Contrast, 1600 px and 1000 px, side panel open; screenshots linked in `Notes:`.
- **Verify:** manual: the orchestrator looks for cut intents, prompts or coach lines and for AC-004's line 1 wrapping
  inside a word; layout is not decided by jsdom (no layout engine).
- [ ] **Verified (T-008):** —
- **Notes:** —

### T-009 — Notes, docs, title audit and final gates

- **Covers:** AC-010, AC-011, AC-012, AC-015 (into the checklist), and re-proves AC-001…AC-010, AC-016…AC-021
- **Do:** §5's notes under each named statement (0003, 0013, 0015, 0017, 0021, 0023, 0026, the test-audit ACs); no PD row.
  `README.md` (*How board states are derived* Review line, the Next step paragraph), `CHANGELOG.md` (0.1.0 *Added*),
  `docs/release-checklist.md` section 0028 with AC-013…AC-015 (AC-014 as closed by OP-002). Title audit by 0021's method
  (`describe`/`it`/`test` literals under `src`, Baseline by `git archive`): every missing title in `Notes:` with the
  statement it replaced. Snapshot exceptions of AC-010 in `nextStepBaseline.test.ts` final. Docs scans (`docsScan.test.ts`)
  green. Memory Bank: `techContext.md` *Test* line for 0028 (snapshots, `caseFixtures`, `fiveFixtures`);
  `activeContext.md`. No `architecture:` entry changes (no module added, moved or removed).
- **Verify:** quality gates 1–5 in order, zero warnings; `npm test` on Windows and CI by the orchestrator, result here.
- [ ] **Verified (T-009):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-002 | — | — | open |
| AC-002 | T-002, T-005 | — | — | open |
| AC-003 | T-001, T-002 | — | — | open |
| AC-004 | T-003 | — | — | open |
| AC-005 | T-001, T-003 | — | — | open |
| AC-006 | T-006 | — | — | open |
| AC-007 | T-006 | — | — | open |
| AC-008 | T-007 | — | — | open |
| AC-009 | T-003, T-004 | — | — | open |
| AC-010 | T-001, T-009 | — | — | open |
| AC-011 | T-009 | — | — | open |
| AC-012 | T-002, T-005, T-009 | — | — | open |
| AC-013 | T-008 | — | manual: orchestrator, preview harness | open |
| AC-014 | — | — | manual: not run, closed by OP-002 (13); tasks in AC-015 | open |
| AC-015 | T-009 (checklist) | — | manual: Gregor on `tip-splitter`, before the spec closes | open |
| AC-016 | T-001, T-005 | — | — | open |
| AC-017 | T-004 | — | — | open |
| AC-018 | T-004 | — | — | open |
| AC-019 | T-007 | — | — | open |
| AC-020 | T-004 | — | — | open |
| AC-021 | T-003, T-004 | — | — | open |

## Session handoff

- **Done so far:** plan written; spec OP-002, OP-005 resolved and OP-006 added (2026-11-19).
- **Next action:** review the plan; on the start signal move the pair to `active/` (`/sdd-lifecycle`), set the
  Baseline, then T-001.
- **Open decisions:** — (FeatherSpec 1.11.0 release pending, A-011 bounds the risk to T-003's constant)
- **Baseline:** `8174c51` (head before the first step commit)
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
