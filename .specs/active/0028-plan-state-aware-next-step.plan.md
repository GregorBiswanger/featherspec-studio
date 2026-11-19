# Plan — Plan-State-Aware Next Step

**Spec:** [0028-plan-state-aware-next-step.md](0028-plan-state-aware-next-step.md)
**Status:** In Progress
**Last updated:** 2026-11-19
**Current step:** T-008 (the orchestrator's preview; T-009 is done)

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
- [x] **Verified (T-001):** 2026-11-19 · `npx vitest run --project node src/core/board/nextStepBaseline.test.ts` 4 passed on the Baseline code (snapshots written there with `FEATHERSPEC_WRITE_BASELINE=1`); negative control: `fs-version-1100.json` state edited to `Review` gave red (`expected { state: 'Active' … } to deeply equal { state: 'Review' … }`), restored, green; eslint, tsc ×2 clean.
- **Notes:** Baseline = `f9cadb4` (the lifecycle move, so 0028's own pair equals in the repo copy `test/fixtures/repo-f9cadb4/.specs`; 45 snapshot files in `test/fixtures/next-step-baseline/`). Case fixtures in `src/core/board/testing/caseFixtures.ts` (`CASE_FIXTURES`, builder `splitterFiles`). Exceptions go into `EXCEPTIONS` of `nextStepBaseline.test.ts`; a stale-exception control is in place.

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
- [x] **Verified (T-002):** 2026-11-19 · `npx vitest run --project node src/core/board/finishedPlan0028.test.ts`: red first with `finishedPlan` removed from `decide()` (5 failed: the four AC-001 fixtures and the example; the AC-002 texts were red on the old effect and then before `STEP_GUIDES` changed), then 14 passed; `npm run test:unit` 3170 passed, 4 skipped; the one other red, `problems.test.ts` AC-005, is the other session's `0025` spec linking a plan not yet written (not this change); eslint, tsc ×2 clean.
- **Notes:** Tests of §10 handled. Replaced by §6.1 (renamed or retargeted, statement replaced: a plan with every step ticked or struck read as Resume, 0021 AC-005): `nextStep.test.ts` "0021 AC-005 … no step list, all steps ticked or struck, and an unreadable plan read as Resume" is now "… no step list, all steps struck, and an unreadable plan read as Resume" (its `allDone` fixture T-001 ticked + T-002 struck is finished, so Review; AC-002 covers struck-only); "0021 AC-001 … the guide of each case" keeps its title, §7's effect and then for `NS-6-resume`. *Fixture only* (title and assertions kept, a struck-only plan instead of the one ticked step): "NS-6 resume: case, intent and prompt of every line, literally" (0021 AC-001), "NS-6 resume: short intent, command short form …" (0021 AC-006), "with two Active specs …" (0021 AC-003), "without a note NS-6 is as 0021 AC-003 and AC-005 say …" (0023 AC-013); in `detail.test.ts` `FILES` got an open step T-003 (four tests, titles unchanged). Snapshot exceptions: `nextStepBaseline.test.ts` `EXCEPTIONS` (four finished-plan fixtures, all fields) and `RESUME_TEXTS` (tips of NS-6-resume under §7); a stale-exception control exists. AC-003's four states are asserted in `finishedPlan0028.test.ts`, their equality to the snapshot by the Baseline test.

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
- [x] **Verified (T-003):** 2026-11-19 · `npx vitest run --project node src/core/specs/version.test.ts src/core/board/nextStep.test.ts`: red first (21 failed: variant A where Report first is expected, `levelsOnImplement is not a function`), then green; `fiveFixtures.test.ts` red with the sign switched off (11 failed over both files), green with it; `npm run test:unit` 3223 passed, 4 skipped, timing green; eslint, tsc ×2 clean.
- **Notes:** `reportSign(plan, open)` and `NS-6-report` as planned; `levelsOnImplement()` and `LEVELLING_SINCE` in `version.ts`. Tests added in `nextStep.test.ts` (AC-004, AC-005 as snapshot equality, AC-009), `version.test.ts`, new `src/core/board/fiveFixtures.test.ts` (four fixtures; `fs-verified-no-tick` joins in T-004). Existing tests extended for the new case, not weakened: `stepTips.test.ts` `COACH` and `NAMED_COACH` gain `NS-6-report`; 0021 AC-001's guide record gains it; `sendView.test.ts` "there are twelve step cases …" is now "there are thirteen step cases …" (count 13; title replaced for the new case). Baseline `EXCEPTIONS` gain `fs-version-missing`, `fs-version-1100`, `case-ac004-report-first` (Report first, STEP_FIELDS).

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
- [x] **Verified (T-004):** 2026-11-19 · `npx vitest run --project node src/core/board/nextStep.test.ts src/core/board/stepTips.test.ts`: red first (14 failed: no guard, one session reason, `stepTips` ignoring the context), then green; `npm run test:unit` 3245 passed, 4 skipped, timing 18 passed; eslint, tsc ×2 clean.
- **Notes:** `stepTips(case, settings, closing, { version, reason })` (fourth parameter optional, so existing calls and tests stand); `NextStep` carries `reason?` only for the guard; `verifiedWithoutTick()` beside `reportSign()`; texts `verifiedWithoutTickReason()` and `SAME_OR_NEW_REASON_LEVELLED` in `nextStepTexts.ts`, each reason once. §7's 1.11.0 reason opens `Current or new chat:` literally (the coach line still says `same chat or new chat` until 0026, OP-006). The snapshot helper now passes version and reason to `stepTips`, so the session reason is part of the AC-010 comparison; exceptions for `fs-verified-no-tick`, `case-ac004-verified-no-tick` (guard), `fs-version-1110`, `fs-partial-return` (tips: reason). `fiveFixtures.test.ts` has all five fixtures. Fixed one own test: the AC-001 negative control now unticks T-006 with `—` (a filled Verified line would be the guard).

### T-005 — NS-7 starts with Implement

- **Covers:** AC-016
- **Do:** `startLine()` → `Implement <ID> of <plan>`; without an open step NS-7 returns `/sdd-plan <spec>` with case
  `NS-6-resume` (rule stays `NS-7`), so its intent, coach, effect and then are AC-002's. `START_PLAN_INTENT` and
  `shortForm()`'s `Start` and bare-`Implement` branches go (idle). Tests: `nextStep.test.ts` "0028 AC-016 …" (with step:
  every field but the line equal to the T-001 snapshot; without: AC-002's texts; a sweep of every `caseFixtures` and
  fixture result: no line starts with `Start ` or equals `Implement <plan path>`). Replace the 14 tests §10 names (list
  in `Notes:`); `planMap.test.ts` stays green (ways for NS-7 unchanged).
- **Verify:** `npm run test:unit` — red first (`Start T-001 of …`), then green.
- [x] **Verified (T-005):** 2026-11-19 · `npx vitest run --project node`: red first (16 failed with the production change in: `Start T-001 of …` where `Implement T-001 of …` is expected and the Ready no-step line), then the replaced tests and the new "0028 AC-016 …" tests green; `npm run test:unit` 3250 passed, 4 skipped, timing 18 passed; eslint, tsc ×2 clean.
- **Notes:** `startLine()`, `START_PLAN_INTENT`, `shortForm()`'s `Start` and bare-`Implement` branches removed (idle; `startIntent(id, title)` takes an ID now). Replaced tests (statement: NS-7's `Start <ID> of <plan path>` / `Implement <plan path>`, 0015 §6.1, 0017 §6.1, 0021 §6.1 and §6.3; titles kept unless named): `nextStep.test.ts` "NS-7 negative control: a Ready spec without an open step reads Implement <plan path>" is now "… reads /sdd-plan <spec path>"; "shortForm cuts a command at its name, a start at its id, an implement of a step at its id, a plan implement at its verb (control: other text stays)" is now "shortForm cuts a command at its name and an implement of a step at its id (control: other text stays)"; the rows "NS-7 step", "NS-7 no step", "NS-7" (0021 AC-001, AC-002, AC-006, 0017 AC-001) take the new lines; `cards.test.ts` "a Ready card carries the short form and the full first line with the plan path" and `copyNextStep.test.ts` (two) and `statusEntry.test.ts` (one) take `Implement T-003`, `/sdd-plan <spec>` and `Ready · Resume · /sdd-plan`. `SpecBoard.test.tsx` (webview) keeps its own sample `StepView` with `Start T-003`: it tests the component with given data, not the rule. Baseline `EXCEPTIONS` gain `fs110-ready-synthetic` and the three `ac016` cases (NS-7). The repository copy has no exception. `planMap.test.ts` stays green.

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
- [x] **Verified (T-006):** 2026-11-19 · `npx vitest run src/core/board/surfaces0028.test.ts src/adapters/node/surfaces0028.bundle.test.ts src/core/planMap/planMap0028.test.ts`: 15 passed (7 + 3 + 5); every file carries negative controls (plan Not started with an open step is Active with ways; struck-only plan still renders `Let the agent report where the plan stands`); eslint, tsc ×2 clean. Tests only, immediately green by design (the code of T-002…T-005 holds), so no red run; the controls prove the checks can fail.
- **Notes:** Surfaces covered in `surfaces0028.test.ts`: detail, Board card and column, Overview Now row and order, tree row (state, description, tooltip), badge (1), status bar text and tooltip (`$(checklist) 0001 · Review · /sdd-compile`, the AC-006 example with an Active `0002` beside), and the quick pick's source `situation().steps` (descriptions `Review · Verify · /sdd-compile`, `Active · Continue · Implement T-001`): the pick itself opens only when no spec is Review, Active or Blocked, so an Active or Review spec shows there only as a step of the situation. The tree row's description is the short form without the intent (0020 AC-004). Bundle test mounts Board with detail, Overview and Plan map in jsdom. `TipSplitterOptions` gained `stages`.

### T-007 — Plan and version changes show within 500 ms

- **Covers:** AC-008, AC-019
- **Files:** `src/core/board/planState0028.timing.test.ts`, `src/core/shell/version0028.timing.test.ts`
- **Do:** tests only, on the board and shell worlds with `BUDGET_MS.uiFreshness`: the last open step ticked, a tick
  removed, `Current step` edited → detail, Overview, Board within 500 ms, selection and area kept, one history entry *in
  flow* on Active ↔ Review; `FeatherSpecVersion:` 1.10.0 → 1.11.0, back, `next`, removed → detail, Overview, tree, status
  bar switch AC-004's fixture between Report first and variant A. Negative control: a change that switches nothing adds
  no history entry.
- **Verify:** `npx vitest run --project timing-node src/core/board/planState0028.timing.test.ts src/core/shell/version0028.timing.test.ts`
- [x] **Verified (T-007):** 2026-11-19 · `npx vitest run --project timing-node src/core/board/planState0028.timing.test.ts src/core/shell/version0028.timing.test.ts`: 8 passed (5 + 3), each switch within 500 ms (`BUDGET_MS.uiFreshness`, best of three); `npm run test:unit` 3265 passed, 4 skipped, timing 26 passed; eslint, tsc ×2 clean.
- **Notes:** Board world: last open step ticked, a tick removed, `Current step` edited (both ways); detail, Overview and Board read after each notification, selection kept. History on the lifecycle service with a memory store: Active → Review → Active adds one `in flow` entry each; a change that switches nothing adds none. Shell world: `AGENTS.md` rewritten (both memory sources), the marker watch fired, 200 ms of the fake clock, `settle()`; detail, Overview, tree row and status bar switch between Report first and variant A for 1.10.0, 1.11.0, `next`, 1.12.0 and no line; selection and area unchanged. Tests only, green on first run, with a negative control each.

### T-008 — Preview at two widths and three themes

- **Covers:** AC-013
- **Do:** the orchestrator's harness (`/home/claude/orch/preview/run.sh`) on AC-001's and AC-004's fixtures: detail and
  first Now row, Dark, Light, High Contrast, 1600 px and 1000 px, side panel open; screenshots linked in `Notes:`.
- **Verify:** manual: the orchestrator looks for cut intents, prompts or coach lines and for AC-004's line 1 wrapping
  inside a word; layout is not decided by jsdom (no layout engine).
- [ ] **Verified (T-008):** —
- **Notes:** Not run here: manual by the orchestrator. Projects for the harness are written by `/tmp/mkfix.mts` from `CASE_FIXTURES`: `/tmp/fs-0028-review` (AC-001, `ac001-plan-in-progress`, Review) and `/tmp/fs-0028-report` (AC-004, `ac004-report-first`, version 1.10.0, Report first); add them as scenarios to `host.mts`. Look for cut intents, prompts or coach lines and for line 1 `Let the agent report first — the plan and the ticks may differ` wrapping inside a word.

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
- [x] **Verified (T-009):** 2026-11-19 · `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile && npm run compile-tests`: all clean; `npm run test:unit` 3268 passed, 4 skipped, timing 26 passed, one red outside this change: `problems.test.ts` AC-005 ("this repository's own .specs/ carry no Problem") names `0027-attach-spec-when-sending.md`, whose plan link points to a plan that another session has not written yet (it was `0025` earlier in the run and went green when that plan landed); `docsScan.test.ts` 170 passed with the new 0028 AC-011 block. `npm test` (host, Windows and CI) is the orchestrator's, not run here.
- **Notes:** §5 notes (`*Amended by 0028 …*`) are in 0003, 0013, 0015, 0016–0024 (test audit ACs; 0017, 0021, 0023 also per statement), 0026 (reason, AC-002); no PD row changed. README (*How board states are derived*, the Next step paragraph), CHANGELOG 0.1.0 *Added*, `docs/release-checklist.md` section 0028 with AC-013…AC-015 (AC-014 as closed by OP-002). Title audit (0021's method: `describe`/`it`/`test` literals under `src`, Baseline `f9cadb4` by `git archive`): four titles missing at the head, all replaced: (1) `nextStep.test.ts` "NS-7 negative control: a Ready spec without an open step reads Implement <plan path>" → "… reads /sdd-plan <spec path>" (0015 §6.1 row NS-7, 0028 §6.5); (2) "no step list, all steps ticked or struck, and an unreadable plan read as Resume" → "no step list, all steps struck, and an unreadable plan read as Resume" (0021 §6.2 "Plan without open step", 0028 §6.1); (3) "shortForm cuts a command at its name, a start at its id, an implement of a step at its id, a plan implement at its verb (control: other text stays)" → "shortForm cuts a command at its name and an implement of a step at its id (control: other text stays)" (0017 §6.1, 0021 §6.3, 0028 §6.5); (4) `sendView.test.ts` "there are twelve step cases, and no offer gives no send view" → "there are thirteen step cases, …" (the case `NS-6-report`). The Baseline `EXCEPTIONS` list holds only the kinds of AC-010 (finished plan, NS-7's line, the sign, the guard) and the repository copy has none; `RESUME_TEXTS` masks the tips of NS-6-resume (AC-002's texts). `techContext.md` *Test* line and `activeContext.md` updated; no `architecture:` entry changes. Compile fix after `/sdd-compile` 0028 (F1, F3, D1): `tipsWiring0028.test.ts` decides the version and reason wiring in `detail.ts` and `rows.ts` through `buildDetail` and the Overview Now row (`fs-verified-no-tick` about[0] starts with the reason; `fs-version-1110` and a 1.10.0 open-step project about[1] is the matching session reason; a 1.11.0 control); hand-made mutants M6 (`rows.ts` passes `{}`) and M7 (`detail.ts` drops `reason`, or `version`) now fail 3 and 1 or 2 tests and are reverted. `docsScan.test.ts` 0028 AC-011 gains an assertion that README and the first CHANGELOG release do not scope the Verified-without-tick guard to versions below 1.11.0, and its tautological negative control is replaced by one that runs the scope check on old and right wording. README, CHANGELOG and `activeContext.md` were fixed by the orchestrator. T-008 stays open.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-002 | `src/core/lifecycle/deriveLifecycle.ts:finishedPlan` | `src/core/board/finishedPlan0028.test.ts` "0028 AC-001 …" | verified |
| AC-002 | T-002, T-005 | `src/core/board/nextStep.ts:nextStep`, `src/shared/protocol/nextStepTexts.ts:STEP_GUIDES` | `finishedPlan0028.test.ts` "0028 AC-002 …"; `nextStep.test.ts` "0028 AC-016 …" | verified |
| AC-003 | T-001, T-002 | `deriveLifecycle.ts:decide` (order unchanged) | `finishedPlan0028.test.ts` "0028 AC-003 …"; `nextStepBaseline.test.ts` | verified |
| AC-004 | T-003 | `nextStep.ts:reportSign`, `nextStepTexts.ts:NS-6-report` | `nextStep.test.ts` "0028 AC-004 …" | verified |
| AC-005 | T-001, T-003 | `nextStep.ts:reportSign` | `nextStep.test.ts` "0028 AC-005 …" | verified |
| AC-006 | T-006 | (tests only) | `surfaces0028.test.ts`, `src/adapters/node/surfaces0028.bundle.test.ts` | verified |
| AC-007 | T-006 | (tests only; `planMap.ts:waysCase` unchanged) | `src/core/planMap/planMap0028.test.ts` | verified |
| AC-008 | T-007 | (tests only) | `planState0028.timing.test.ts` | verified |
| AC-009 | T-003, T-004 | `src/core/specs/version.ts:levelsOnImplement` | `nextStep.test.ts` "0028 AC-009 …"; `version.test.ts` | verified |
| AC-010 | T-001, T-009 | `src/core/board/testing/nextStepSnapshot.ts`, `test/fixtures/next-step-baseline/` | `nextStepBaseline.test.ts` "0028 AC-010 …" | verified |
| AC-011 | T-009 | `README.md`, `CHANGELOG.md`, `docs/release-checklist.md`, the §5 notes | `src/adapters/node/docsScan.test.ts` "0028 AC-011 …" | verified |
| AC-012 | T-002, T-005, T-009 | (title audit in T-009 Notes) | `npm run test:unit`; `npm test` is the orchestrator's | built |
| AC-013 | T-008 | — | manual: orchestrator, preview harness | open |
| AC-014 | — | — | manual: not run, closed by OP-002 (13); tasks in AC-015 | open |
| AC-015 | T-009 (checklist) | — | manual: Gregor on `tip-splitter`, before the spec closes | open |
| AC-016 | T-001, T-005 | `nextStep.ts:nextStep` (Ready case) | `nextStep.test.ts` "0028 AC-016 …" | verified |
| AC-017 | T-004 | `nextStep.ts:verifiedWithoutTick` | `nextStep.test.ts` "0028 AC-017 …" | verified |
| AC-018 | T-004 | `nextStep.ts:nextStep` (returned work first) | `nextStep.test.ts` "0028 AC-018 …" | verified |
| AC-019 | T-007 | (tests only) | `src/core/shell/version0028.timing.test.ts` | verified |
| AC-020 | T-004 | `src/core/board/stepTips.ts:stepTips`, `nextStepTexts.ts:SAME_OR_NEW_REASON_LEVELLED` | `stepTips.test.ts` "0028 AC-020 …" | verified |
| AC-021 | T-003, T-004 | `nextStep.ts`, `fixtureVersion()` in `lifecycle/testing/projects.ts` | `src/core/board/fiveFixtures.test.ts` "0028 AC-021 …" | verified |

## Session handoff

- **Done so far:** T-001…T-007 and T-009 verified and committed on `ux-round-3` (2026-11-19); all production code, the Baseline snapshots, the tests of AC-001…AC-012, AC-016…AC-021, the §5 notes, README, CHANGELOG, checklist, title audit and Memory Bank.
- **Next action:** T-008, the orchestrator's preview (AC-013; projects `/tmp/fs-0028-review`, `/tmp/fs-0028-report`, see its Notes); then `npm test` on Windows and CI (AC-012); AC-015 is Gregor's. Then `/sdd-compile` in a new session, never here. The plan stays `In Progress` until T-008 is ticked.
- **Open decisions:** — (FeatherSpec 1.11.0 release pending, A-011 bounds the risk to `LEVELLING_SINCE` in `version.ts`). `problems.test.ts` AC-005 is red while another session's spec links a plan not yet written (0027 at the end of this run).
- **Baseline:** `f9cadb4` (the lifecycle move of the pair; its `.specs` is `test/fixtures/repo-f9cadb4/.specs`).
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
