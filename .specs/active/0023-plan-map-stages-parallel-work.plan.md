# Plan — Plan Map: Stages, Parallel Work, Workers

**Spec:** [0023-plan-map-stages-parallel-work.md](0023-plan-map-stages-parallel-work.md)
**Status:** In Progress
**Last updated:** 2026-11-18
**Current step:** T-003

## Approach

One pure projection first: `src/core/planMap/` turns the parsed sibling plan, the spec's return notes and 0019's
`openStep()` into one `PlanView` (stage rows, groups, step states, count, closing line), with no change to the parser
(T-001). Returned work then becomes NS-6's first case, "Integrate the returned steps", in 0021's one `STEP_GUIDES`
table, so cards, rows, tree and status bar follow it (guideline 1); the ways to run the current stage are added to the
same projection, because their condition is that case (T-002). The view travels in the detail it belongs to
(`SpecDetailView.plan`) and the Plan map's spec list in the board view, so side panel and tab read one source and need
no new event (T-003). The webview follows: the third tab with its command, states and layout (T-004, the riskiest:
0019 and 0022's frame, focus and 900 px rules get a third area), the Plan section in the side panel (T-005), stage rows
and step cards with their keys (T-006), the ways with their Copies, live updates and the sweeps (T-007). §4 notes,
docs, the test-title audit, architecture and Memory Bank close the plan (T-008). What 0024 needs is kept open, not
built: the new case carries session `sameOrNew` (0024 AC-004 "each NS-6 case"), the side panel beside the map keeps the
detail's first-line primary Copy (0024's split-button place) and the map's Copies use `ui/CopyButton.tsx` looks
`secondary` and `icon` only. Test review once per stage from the tests named in `Do:` (`AGENTS.md` *TDD*). No file this
task did not create is deleted; every replaced test is named on its step's **Deletes:** line. Memory Bank touched in
T-008 only: `techContext.md`, `systemPatterns.md`, `activeContext.md`.

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` ·
2 `npx tsc --noEmit` · 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (steps
touching wiring, adapters, `extension.ts`, `package.json` or the bundle) · `npm run compile-tests` where a host test
changes · pre-done gate `npm test` on Windows and CI (cannot run here, PLAN-NOTE).

## Research

**Checkpoint digest (2026-11-18, `/sdd-plan` Mode A under Gregor's delegation).** No question only Gregor can answer:
every open choice is decided by the spec, PD-068…PD-076 (newest wins) and `.claude/rules/ux-guidelines.md` 1–12,
recorded as proxies P-1…P-24. PD-076 (click test 0023/0024 passed) is newer than the spec's last revision: spec revised
in place, open points only (P-1). Gregor reads this plan and replies with changes or approval.

**AC-019, draft part (PD-076, 2026-11-18).** Gregor on the HTML drafts (`/home/claude/orch/clicktest2/project`, Plan map
tab with stages, cards, ways, returned workers; Plan section in the side panel): "ich finde es super so". E-8's three
prompts, E-9's two places, E-10's collapsed ways and §6's texts stand as drawn. The part on the build stays (T-008).

**Survey (code at `196cf72`, 0021 and 0022 built).**
- Parser (`core/specs/parsePlan.ts`): `stages { present, stages: PlanStage[] { number, raw, line, stepIds, kind },
  closing? { raw, line, parallel } }`; `raw` keeps `1. ` and continuation lines joined by `\n`; head split by the
  private `STAGE_DELIMITER` `/\s[—–-]\s/`; `kind` from `‖`/`→` anywhere in the head. `PlanStep { id, title, line
  (heading), struck, ticked: boolean | 'undetermined', coveredCriteria, files, doText, verify }` (`planSteps.ts`). No
  module reads `stages` today.
- Return notes: `ReturnNoteEntry { stepId, parsed?: { status, blockedOn } }`, joined to `SpecEntry.returnNoteKeys` by
  number (`readProject.ts`); a BLOCKED note makes the entry Blocked (`lifecycle/entryContext.ts`); Review needs plan
  `Done`. For a spec not in `done/`, `entry.plan` is the sibling plan key (`lifecycle/verification.ts:planInUse`).
- Next step: `nextStep()` (`core/board/nextStep.ts`) → `{ rule, case, lines: [{ text, intent }] }`; `case 'Active'`
  checks `entry.plan === undefined` (NS-6-plan), then `openStep()` (NS-6-open / NS-6-resume). `STEP_GUIDES:
  Record<StepCase, StepGuide>` and the intents in `shared/protocol/nextStepTexts.ts`; `stepTips()` composes the coach
  line. Tests that pin every case: `nextStep.test.ts` "the guide of each case …" (`toEqual` of the whole table),
  `stepTips.test.ts` coach tables and `it.each(Object.keys(STEP_GUIDES))`.
- Detail: `buildDetail()` (`core/board/detail.ts`) → `SpecDetailView` (no `plan` key; guard `isDetailView` ignores
  unknown keys); `progressOf()` gives `steps { done, total, next? }` from `taskProgress()` and `openStep()`; the
  webview order is Header, NextStep, Problems, Progress, Files, Format notes, History (`detail/SpecDetail.tsx`); the
  Steps row lives in `detail/Progress.tsx`. `core/board/detail.test.ts` "AC-003: the view carries the rule and lines of
  nextStep …" uses an Active spec with a DONE note and expects NS-6-resume today (its literal changes in T-002).
- Board service (`core/board/boardService.ts`) emits `board` and `detail` (serialized de-dupe); `studioPanel.ts`
  pushes both on hello and change; webview `client.ts` keeps `board`, `detail`, `copyResult`, `fileResult` in one
  snapshot, `useBoard()` exposes them. `PROTOCOL_VERSION` 5 (`envelope.ts`); literal `v: 5` in six test files, "another
  version" `v: 6` in `messages.test.ts`, `PanelStateView.test.tsx`, `client.test.ts`.
- Areas: `AREA_IDS ['overview', 'board']`, `AREAS` (title, purpose) in `shared/protocol/areas.ts`; `AREA_COMMANDS:
  Record<AreaId, string>` (`adapters/vscode/commands.ts`, registered by `extension.ts` over `AREA_IDS`); manifest
  commands `featherspec-studio.openOverview`, `.openBoard`; `AREA_PATHS` hand-drawn 16×16 paths (`board/icons.tsx`, no
  icon font); `BACK_LABELS: Record<AreaId, string>` (`texts.ts`); `parseUiMemory` accepts any `AreaId`; `navigate { area, target: { kind: 'spec', stem, path? } }` selects
  the spec, then switches area (`shellService.ts`). `App.tsx`: side panel only for `overview`/`board`; below 900 px
  (`NARROW_QUERY`) the detail alone with `BackButton`; `focusAfterClose(stem)` finds `[data-spec-stem]` in
  `.area-content`; `requestHeadingFocus` pends a heading focus by stem (`detail/focus.ts`).
- Building blocks: `ui/CopyButton.tsx` (looks primary, secondary, icon; name `Copy prompt: <line>`; one shared
  `copyResult`), `ui/FileLink.tsx` (name = children, tooltip/description `reason` then `Open <file> at line <n>`),
  `ui/PathText.tsx` (`path` and `command`), `ui/InlineText.tsx`, `Glyph kind="chevron"`, `board/focusModel.ts`
  (`moveFocus(grid, key, dir)`, `fallbackFocus`; roving tab stop in `areas/SpecBoard.tsx`), `plainShort()` and the
  private `plain()` (`core/board/shortTitle.ts`), `taskProgress()`, `titleOf()`, 0020's `STATE_GROUP` (private in
  `core/shell/specTree.ts`), `PLAN_UNREADABLE_SENTENCE` (X-14) and `stepsDoneText`, `NO_STEPS_TEXT` (`texts.ts`).
- Fixtures: `fs110-parallel-synthetic` (plan `Blocked`, stages `T-001 → T-002`, `T-003 ‖ T-004`, `T-005`, closing
  `Parallel: …`; notes T-003 DONE, T-004 BLOCKED with `Blocked on`), `fs110-de-active-review` (plan Done, German,
  `No parallel stage:` with a continuation line), `fs110-ready-synthetic` (Ready, one stage), `studio-0015` (Review,
  5 stages, one `‖`), `fs170-brownfield-mixed` 0006 (plan Done, no `## Stages`). Memory sources take bytes (an
  unreadable note) (`core/specs/testing/memorySpecSource.ts`).
- Tests that assert two areas or will change: `messages.test.ts` "0020 AC-016: two areas", `SidePanel.test.tsx` "0020:
  the panel has no area without a side panel …", `manifest.test.ts` "AC-001, AC-005 (0005): … (Overview and Board) …"
  and "0018 AC-001: contributes exactly the commands …", `App.test.tsx` PD-054 icons, `PanelStateView.test.tsx`
  (`toHaveLength(2)`), `areas.test.tsx` placeholders, `docsScan.test.ts` "the README names the two tabs, …",
  `src/test/shell.smoke.test.ts` AC-005 per-area command; `webviewBundle.test.ts` 0019 AC-010 budget (studio-0015 is
  Review: its detail will show the Plan section).
- Click-test draft vs spec: the draft marks T-004 `◐` while T-005's note lies and shows Covers as plain text; the
  spec's AC-002 (OP-006 (b)) and §5.3 win (P-2). No `done/` spec is invalidated (0005, 0006, 0007, 0013 get notes only).

**Sources.**
- [WAI-ARIA APG — Disclosure (Show/Hide) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) — the control
  is a `button` with `aria-expanded` (`aria-controls` optional); Enter and Space toggle. Settles the card and the ways
  block. Retrieved 2026-11-18.
- [WAI-ARIA APG — Developing a Keyboard Interface, roving tabindex](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
  — one element `tabindex="0"`, the rest `-1`; arrow keys move the 0 and call `focus()`, which scrolls into view.
  Settles the card grid (as the Board does). Retrieved 2026-11-18.
- [VS Code API — Activation events](https://code.visualstudio.com/api/references/activation-events) — since 1.74
  "commands contributed by your extension do not require a corresponding `onCommand` activation event"; the manifest
  (`engines.vscode ^1.146.0`) adds only the command. Retrieved 2026-11-18.
- [vscode-codicons — `type-hierarchy-sub`](https://composables.com/icons/icon-libraries/vscode-codicons/type-hierarchy-sub.md)
  — the motif exists in the codicon set; the Studio draws its own path (no icon font, 0021 A-008). Retrieved 2026-11-18.
- Repo: React 19.3.1, jsdom 31.0.1, Vitest 5.1 (`techContext.md`); `.claude/rules/parallel-work.md` for the start
  line `Implement T-00x of <plan path> as a parallel worker.` (byte for byte). Read 2026-11-18.

**Proxy decisions (Gregor delegated; P-n).**
- P-1 Spec revised (open points only, PD-076): Basis names PD-076 and that 0021, 0022 are implemented; OP-001 and
  OP-005 closed (tree entry not built); OP-003 re-checked against the code; A-012 confirmed; §3 out-of-scope line and
  §12; Plan line.
- P-2 Where the draft and the spec differ, the spec wins: no *next* marker while a note lies (the next step is then
  Integrate, guideline 1); Covers IDs are links (§5.3).
- P-3 Projection `src/core/planMap/planMap.ts`: `planOf(model, entry, spec)` → `undefined` (state Done, or no sibling
  plan) · `{ kind: 'unreadable' }` · `PlanView`. Pure; reads the sibling plan by `entry.plan`, `openStep()`,
  `taskProgress()`, `plainShort()`, `plainText()` (the private `plain()` of `shortTitle.ts`, exported) and the spec's
  notes by `stepId`. The parser stays unchanged; `STAGE_DELIMITER` is exported from `parsePlan.ts` for the split.
- P-4 Stage line: drop `^\d+\.\s+` from `raw`, split the first line at the first `STAGE_DELIMITER`; head → IDs in
  order; between two consecutive IDs `‖` if the text between holds `‖`, else `→` if it holds `→`, else none;
  description = the rest plus continuation lines joined by a space, `plainText()`, not cut. A head without an ID → no
  row; no row left → a plan without stages. *Holds `‖`* (M-04, M-06) = the parser's `kind` `parallel` or `mixed`.
  A parallel group = a maximal run joined by `‖`; groups follow each other with `→` or none.
- P-5 States, first match: dropped (struck) · returned (a note for its ID) · done (`ticked === true`) · next
  (`openStep()` while `spec.returnNoteKeys` is empty) · open. A stage ID without a step heading is *not found*: a chip
  only (no card, no link, not counted, ignored by *finished* and by a group's unfinished count). An ID twice → a chip
  each. Steps in no stage line → a loose row after the stages (M-07). Current stage = first stage line holding
  `openStep()`'s ID. *Finished* = at least one found step and all found steps done or dropped.
- P-6 Returned: `parsed === undefined` or a status other than `DONE`/`BLOCKED` → unknown; BLOCKED → reason
  `plainShort(Blocked on)` and full `plainText(…)` when it holds a value, else none. Stage counts: n = returned,
  m = returned + unfinished; M-16 for 1 ≤ n < m, M-17 for n = m.
- P-7 View (`src/shared/protocol/planMap.ts`): `PlanView { kind: 'plan'; plan: LineTarget; count?; closing?: { text,
  short, full }; staged: boolean; stages: PlanStageView[]; loose: PlanStepView[] }`; `PlanStageView { number,
  description, kind, parallel, current, finished, returned?: { n, m }, groups: Array<{ sep?: '→'; steps }>, ways? }`;
  `PlanStepView { id, state, title, open?, files: string[], covers: Array<{ id, open? }>, doText?, verify?, returned?
  }`. `closing.text` keeps Markdown for the tab's `InlineText`; `short` = `plainShort`, `full` = `plainText`. Titles,
  Do and Verify are `plainShort`; Files are the `Files:` value split at commas, code marks removed; a Covers ID links
  to its criterion line in the spec, an undefined ID has no `open`. Section and tab draw the same view.
- P-8 Texts: `src/shared/protocol/planMapTexts.ts` holds every text of §6 and §5.4 (symbols, state words, M-02…M-17,
  card labels, the ways table, `stagePrompt(way, n, plan)`, `startLine(id, plan)`, `chipName(id, title, word)`); the
  integrate texts join `nextStepTexts.ts`. Each text lands in the step that first renders or composes it.
- P-9 Integrate: `StepCase` gains `'NS-6-returned'`; `STEP_GUIDES` entry `{ short: 'Integrate', session: 'sameOrNew',
  model: 'fast', effect, then }` (§5.5); `INTEGRATE_INTENT = 'Integrate the returned steps'`; `nextStep()` checks
  `spec.returnNoteKeys.length > 0` first in `case 'Active'` and returns one line `/sdd-plan <spec key>`.
- P-10 Ways: `ways?: { stage: number; prompts: [sequence, subagents, otherAgents]; startLines: string[] }` on the
  current stage exactly when the spec is Active with case `NS-6-open` or Ready with `NS-7`, has no note, and one group
  of the stage holds ≥ 2 unfinished steps. Start lines only for Active, for the group holding the *next* step when it
  holds ≥ 2 unfinished steps, in line order. `<n>` = the stage line's number, `<plan path>` = the plan key.
- P-11 Delivery: `SpecDetailView.plan?: PlanView | { kind: 'unreadable' }` from `buildDetail()`; `BoardView.planSpecs:
  PlanSpecView[]` (`{ stem, path?, number, title, problems: Array<{ sentence, reason }> }`; specs not Done with a
  readable sibling plan; 0020's groups In progress (Active, Review, Blocked), Ready, Backlog, then by number;
  `STATE_GROUP` exported from `specTree.ts`), built with the cards. Strict guards (exact keys, as `overview.ts`).
  `PROTOCOL_VERSION` 6 once (T-003); "another version" literals move to 7. No new event and no host wiring.
- P-12 Tab: `AREA_IDS` adds `planMap` after `board`; `AREAS` title `Plan map`, purpose M-11; `AREA_COMMANDS.planMap =
  'featherspec-studio.openPlanMap'`, manifest title `FeatherSpec Studio: Open Plan Map`, no activation event (source);
  `AREA_PATHS.planMap` an own path for the motif `type-hierarchy-sub`, the icon carries `data-motif`; registry
  `planMap: PlanMap`; the remembered area is restored by `parseUiMemory` unchanged.
- P-13 Layout (A-010): in `App.tsx` the side panel shows in the tab only from 900 px; below, no side panel, no back
  button, no `inert`; the detail-alone state stays Overview's and Board's. `SidePanel` passes `planSection: false` in
  the tab, so Progress shows its Steps row there again (§4, 0019 row 4: "only while no Plan section shows").
- P-14 Tab states: the tab matches its content to the shell's selection as `SidePanel`'s `matches()` does (no
  selection → M-12 at once, so 0019's `focusAfterClose` finds the cleared spec's button by `data-spec-stem`; a detail of
  another spec → the number alone until it arrives). Spec buttons and M-03 pend a focus on the map heading
  (`areas/planMap/focus.ts`, `data-map-heading`, the pattern of `requestHeadingFocus`).
- P-15 Plan section: `detail/PlanSection.tsx` between Problems and Progress, only with `plan.kind === 'plan'` and
  `planSection`; Progress takes `withSteps: false` while it shows. Chips (`ui/StepChip.tsx`, shared with the tab's
  finished stages) are `FileLink`s with a new optional `label` (`aria-label`) = `chipName`, `reason` = the same name;
  a not-found chip is a `span`; a dropped ID sits in `<s>`. No Copy in the section.
- P-16 Cards: `areas/planMap/StepCard.tsx` = a `div` with a disclosure `button` (`aria-expanded`, `aria-controls`),
  Files by `PathText`, Covers by `FileLink`, M-09; expanded Do, Verify and `Open in plan`. Expansion per step ID in
  `PlanMap`, reset by `key={detail.key}` and on mount (every showing). CSS: group `display: flex; flex-wrap: wrap`,
  card `flex: 1 1 200px; min-width: 200px; max-width: 360px`; no `@media`; theme variables only (0013 guard).
- P-17 Keys: one tab stop (roving tabindex); grid = card rows in DOM order (a group, or a card of its own); Up/Down →
  `moveFocus(rows, key, 'left' | 'right')`, Left/Right → `'up' | 'down'` (rows as 0007's columns); only the tab-stop
  card's links take `tabIndex 0`; Enter and Space are the button's own.
- P-18 Ways UI: `areas/planMap/Ways.tsx`, a disclosure `Ways to run stage <n>` (chevron) after the current stage's
  cards, collapsed on every showing; prompts in `code` with `PathText command`; Copy prompt `look="secondary"`; M-10
  and start lines with `look="icon"`.
- P-19 Live updates: expansion by step ID and the ways state by stage number survive a detail update; focus stays on
  the same card, else `fallbackFocus` over the card rows, else the map heading (AC-012).
- P-20 Test data: `src/core/planMap/testing/plans.ts` — a fixture read into a memory map with edits (drop notes, set
  the plan status, swap a stage line) and `generatedPlan()` (single, sequential, parallel, mixed with `‖` before and
  after `→`, a struck step, an unknown ID, a step in no stage, no closing); `src/shared/protocol/testing/planSample.ts`
  for webview tests.
- P-21 Bundle sweep (`webviewBundle.test.ts`, real core, built bundle): for every swept fixture and spec the side panel
  and the Plan map tab — no rule ID or `struck`, `sibling`, `kind`, `stem`, `parsing` in text or titles, no primary
  button in the tab's `.area-content`, every Copy named `Copy prompt: …`; the 0019 AC-010 budget counts the section.
- P-22 Test-title audit in T-008 by 0021's method (`describe`/`it`/`test`/`suite` literals of every `.ts`/`.tsx` under
  `src`, Baseline by `git archive` vs head); expected map below.
- P-23 Docs and notes: README (three tabs, a Plan map paragraph: stages, cards, three ways, start lines, Integrate the
  returned steps; no "two tabs"), CHANGELOG under `## [0.1.0] - Unreleased`, checklist section `## Plan map (0023)`
  with AC-018–AC-020 after 0022's (the order test lists it; no assistant vendor name, the 0015 scan forbids it), 0015
  M-1's "Overview and Board only" reworded; guideline 4 in both guideline files; §4 notes by a throwaway script after
  any 0021 or 0022 note.
- P-24 Architecture: new `src/core/planMap/`, `src/webview/areas/planMap/`, `src/shared/protocol/planMap.ts`,
  `planMapTexts.ts` → `/sdd-architecture-update` in T-008 with the entries named there.

**Expected test-title audit map (T-008 confirms it against the Baseline).** Absent at the head, each a replaced
statement of §4: `messages.test.ts` describe "0020 AC-016: two areas" and "0020 AC-016: lists exactly Overview and
Board, in this order, and no area specExplorer" (→ 0023 AC-006); `SidePanel.test.tsx` "0020: the panel has no area
without a side panel; the navigation offers only Overview and Board, and both show it" (→ 0023 AC-007); `manifest.test.ts`
"AC-001, AC-005 (0005): contributes the Open command and one command per area (Overview and Board) with their titles"
(→ retitled for three areas); `docsScan.test.ts` "the README names the two tabs, and says Focus on Specs View …"
(→ three tabs, 0023 AC-017). Titles kept with changed literals: `detail.test.ts` "AC-003: the view carries the rule and
lines of nextStep …" (Integrate), `nextStep.test.ts` "the guide of each case …", `PanelStateView.test.tsx` AC-018.

## Stages

1. T-001 → T-002 — the plan as stages and step states; returned work leads to Integrate; the current stage's ways
2. T-003 → T-004 → T-005 — delivered: the detail and board view carry it, the Plan map tab and its states, the Plan
   section in the side panel
3. T-006 → T-007 — the map: stage rows, cards and their keys; ways, Copies, live updates and the sweeps
4. T-008 — §4 notes, docs, test-title audit, architecture and Memory Bank sync, final gates

No parallel stage: T-001 and T-002 share `src/core/planMap/planMap.ts` and its test, T-003 builds on both; the webview
steps share `main.css` (the Studio's one stylesheet, 0013), `planMapTexts.ts` and `areas/planMap/PlanMap.tsx`, and
T-005's M-03 focus needs T-004's map heading. T-005 ‖ T-006 would need their CSS in separate files and the texts
table complete before both; at eight medium steps that buys less than it costs. Preview harness (guideline 12,
orchestrator) at the ends of stages 2 and 3; AC-018 screenshots recorded here.

## Steps

### T-001 — The plan reads as stages with step states

- **Covers:** AC-001, AC-002 (the marker), AC-012 (return states and stage counts)
- **Do:** P-3…P-7, P-20. New `src/core/planMap/planMap.ts` (`planOf`), `src/core/planMap/testing/plans.ts`,
  `src/shared/protocol/planMap.ts` (types only); export `plainText` from `core/board/shortTitle.ts` and
  `STAGE_DELIMITER` from `core/specs/parsePlan.ts`. Tests, red via a `Not implemented` stub of `planOf`: new
  `src/core/planMap/planMap.test.ts` — "0023 AC-001" (AC-001's Given literally: rows `1: T-001 → T-002` ✓ ✓,
  `2: T-003 ‖ T-004` ◐ ○, `3: T-005` ○, count 2 of 5; the generated plan: separators per pair, groups, descriptions with
  a continuation line, a head without ID left out, struck → dropped, unknown ID → not found, loose step after the
  stages, an ID twice; `fs170-brownfield-mixed` 0006 without stages: one row in plan order; closing of
  `fs110-de-active-review` joined by a space, prefix kept; none without closing), "0023 AC-002" (with a note no step
  is *next*; without, the *next* ID is `openStep()`'s; an undetermined tick is open), "0023 AC-012" (DONE → returned
  done; BLOCKED with `Blocked on` → short and full, placeholder → no reason; `WIP` and an unreadable note → unknown; a
  ticked step with a note → returned; M-16/M-17 counts), and `planOf` → undefined for Done and no sibling plan,
  `unreadable` for an unreadable plan; `shortTitle.test.ts` (`plainText` keeps length, drops marks).
- **Verify:** `npx vitest run --project node src/core/planMap src/core/board/shortTitle.test.ts src/core/specs/parsePlan.test.ts`
  red (stub), then green; gates 1–4
- [x] **Verified (T-001):** 2026-11-18 · `npx vitest run --project node src/core/planMap src/core/board/shortTitle.test.ts src/core/specs/parsePlan.test.ts` red first (stub `planOf`: 24 of 24 planMap tests failed with `Not implemented`), then green 94 of 94 (24 planMap + `plainText`); gates 1–4 green, `npm run test:unit` 2663 passed + 3 skipped (+15 timing)
- **Notes:** Stage view carries `groups` only (a group is a run joined by `‖`, its `sep` is the `→` before it), so the chips' separators need no second list; a plan without a stage line has `staged: false`, `stages: []` and all steps in `loose`. A note for an ID the plan lacks leaves the stage chip *not found* (§7: in Files only). Types of the view are in `src/shared/protocol/planMap.ts` (guards in T-003).

### T-002 — Returned work leads to Integrate; the current stage offers its ways

- **Covers:** AC-013, AC-009 (conditions, prompts, start lines), AC-002 (cross-check with the next step)
- **Do:** P-9, P-10, P-8 (prompt and start-line functions, way names and effects). `nextStep.ts` (first check in
  `case 'Active'`), `nextStepTexts.ts` (case, guide, intent), `planMap.ts` (`ways` on the current stage),
  `planMapTexts.ts` (new). Tests, red via stubs: `nextStep.test.ts` new describe "0023 AC-013" (an Active spec with a
  DONE note, with an unreadable note, with a note for an ID the plan lacks, with a ticked step's note: one line
  `/sdd-plan <spec>`, intent `Integrate the returned steps`, case `NS-6-returned`; `stepShortForm` `Integrate ·
  /sdd-plan`; without a note 0021's NS-6 cases unchanged; a BLOCKED note → NS-4; plan Done + note → NS-5) and the
  `STEP_GUIDES` literal; `stepTips.test.ts` (coach `same chat or new chat · fast model`, effect and then-sentence
  literally, the case tables); `detail.test.ts` AC-003 literal (Integrate); `planMap.test.ts` "0023 AC-009" (AC-009's
  two Givens literally; Ready → ways, no start lines; Blocked, Review, a note, NS-6-resume → none; `T-002 ‖ T-003 →
  T-004` with T-002 next → start lines for both; one unfinished step left → none; no other stage carries `ways`;
  `parallel-work.md`'s start line compared byte for byte with the rule file) and "0023 AC-002" cross-check (every
  fixture and variant whose case is `NS-6-open` or `NS-7` with an ID: the *next* ID equals the ID in its first line).
- **Verify:** `npx vitest run --project node src/core/board/nextStep.test.ts src/core/board/stepTips.test.ts src/core/board/detail.test.ts src/core/planMap`
  red (stubs, failing literals), then green; gates 1–4
- [x] **Verified (T-002):** 2026-11-18 · `npx vitest run --project node src/core/board/nextStep.test.ts src/core/board/stepTips.test.ts src/core/board/detail.test.ts src/core/planMap` red first (18 failed: the `STEP_GUIDES` literal, six integrate cases, the coach and paragraphs, the NS-6 detail literals, seven ways tests against stubs), then green 362 of 362 (`src/core/planMap` and `src/core/board`); gates 1–4 green, `npm run test:unit` 2685 passed + 3 skipped (+15 timing)
- **Notes:** The integrate check is the first one in `case 'Active'`, before the no-plan case (spec §5.5 "checked before its other cases"). `ways` is computed from the finished stage views and attached to the current stage by `planOf`; its condition reads the case of `nextStep()` (NS-6-open or NS-7), so Blocked, Review and a lying note never carry it. `stagePrompt`/`startLine`/`WAYS` live in `src/shared/protocol/planMapTexts.ts` from this step (the rest of the texts land with the steps that render them, P-8).

### T-003 — The detail and the board view carry the plan

- **Covers:** AC-003 (presence rule), AC-012 (within 500 ms), AC-014
- **Do:** P-11. `detail.ts` (`plan`), `boardService.ts` or `cards.ts` (`planSpecs` with the cards), `specTree.ts`
  (export `STATE_GROUP`), guards in `shared/protocol/planMap.ts`, `detail.ts`, `board.ts`; `envelope.ts` version 6;
  view helpers (`detail/testing/views.ts`, `board/testing/views.ts`, new `shared/protocol/testing/planSample.ts`) and
  the `v:` literals. Tests: `detail.test.ts` "0023 AC-003" (plan for `fs110-parallel-synthetic` (Blocked),
  `studio-0015` (Review), `fs110-ready-synthetic` (Ready); none for a Done spec, a spec without plan, a reactivated spec
  with an archive link; `unreadable` for an unreadable plan); `boardService.test.ts` (`planSpecs` groups and order, a
  Done spec and an unreadable plan left out, a Problem's sentence; the detail's plan follows the selection);
  `boardService.timing.test.ts` "0023 AC-012" (a note that appears, changes, disappears reaches the detail's plan
  within `BUDGET_MS.uiFreshness` on 200 specs); new `src/shared/protocol/planMap.test.ts` (sample accepted; an extra
  key, a wrong state, a bad `LineTarget` refused); `src/core/copyNextStep/noWrite.test.ts` "0023 AC-014" (stage
  prompt and start-line Copy, open at a step heading, both builds leave a temp copy of `fs110-parallel-synthetic`
  unchanged); `planMap.test.ts` "0023 AC-014" (the planMap files name no trust, writer, Restricted Mode or reader;
  equal views from a trusted and a Restricted shell world; negative control).
- **Verify:** `npx vitest run --project node src/core/board src/core/planMap src/core/copyNextStep/noWrite.test.ts src/shared/protocol`
  and `npx vitest run --project timing-node src/core/board/boardService.timing.test.ts` red (stub), then green; gates
  1–4
- [ ] **Verified (T-003):** —
- **Notes:** —

### T-004 — The Plan map tab, its command and its states

- **Covers:** AC-006, AC-007, AC-008 (header)
- **Deletes:** tests `messages.test.ts` describe "0020 AC-016: two areas" with "0020 AC-016: lists exactly Overview and
  Board, …"; `SidePanel.test.tsx` "0020: the panel has no area without a side panel; …"; retitled: `manifest.test.ts`
  "AC-001, AC-005 (0005): … (Overview and Board) …" (audit map)
- **Do:** P-12, P-13, P-14. `areas.ts`, `adapters/vscode/commands.ts`, `package.json`, `board/icons.tsx`,
  `areas/registry.tsx`, `App.tsx`, `BACK_LABELS` (`texts.ts`), `BackButton.tsx` and `SidePanel.tsx` typed to Overview
  and Board (no back button in the tab; `BACK_LABELS` is a `Record<AreaId, …>` today), new `areas/planMap/PlanMap.tsx`
  (states M-12…M-15 with buttons; header: number and title with 0016's warning and 0022's sentences, count or `No steps
  in the plan`, `Open plan`, M-02 by `InlineText`) and `areas/planMap/focus.ts`, `planMapTexts.ts` (M-02, M-11…M-15,
  `Open plan`), `main.css`. Tests: `messages.test.ts` "0023 AC-006" (exactly Overview, Board, Plan map; negative
  control); `manifest.test.ts` (command and title; the exact command set); `App.test.tsx` (three items, each icon
  hidden, `data-motif="type-hierarchy-sub"`, no two paths equal); `areas.test.tsx`, `PanelStateView.test.tsx` (three
  items); `shellService.test.ts` (a remembered `planMap` area restored); new `src/webview/areas/planMap/PlanMap.test.tsx`
  "0023 AC-007" (each state's text, button order and groups, no M-15 without a button, a button selects and focuses
  the map heading, a tree selection shows the new spec, the header and its warning); `SidePanel.test.tsx` and
  `ListOrDetail.test.tsx` "0023 AC-007" (stubbed query: below 900 px the map alone, no detail, no back button; from
  900 px the side panel and divider beside it; Close or Escape there → M-12 and focus on that spec's button); host
  smoke `src/test/shell.smoke.test.ts` AC-005 (openPlanMap → `planMap`; CI only).
- **Verify:** `npx vitest run --project webview src/webview` and `npx vitest run --project node src/shared/protocol src/adapters/vscode/manifest.test.ts src/core/shell`
  red (stub), then green; gates 1–5; `npm run compile-tests`
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — The side panel shows the Plan section

- **Covers:** AC-003, AC-004, AC-005
- **Do:** P-15. New `detail/PlanSection.tsx` and `ui/StepChip.tsx`; `ui/FileLink.tsx` (`label`); `SpecDetail.tsx`
  (placement, `planSection`), `Progress.tsx` (`withSteps`), `SidePanel.tsx` (`planSection` false in the tab);
  `planMapTexts.ts` (`Plan`, M-01, M-03, M-04, M-07, `chipName`); `main.css`. Tests: new
  `src/webview/detail/PlanSection.test.tsx` — "0023 AC-003" (DOM order Next step, Problems, Plan, Progress; none
  without a plan or for `unreadable`; no Steps row and no `Next open step` while it shows; M-02 short with the full
  text as tooltip, none without closing), "0023 AC-004" (each M-01 symbol and state word; name, tooltip and
  description literally; a chip activation sends `openFile` at the step's heading line; not found is no button; M-04
  after exactly the `‖` stages; loose row M-07; a plan without stages one row without numbers; no copy button),
  "0023 AC-005" (M-03 sends one `navigate { area: 'planMap', target: spec }`, keeps the selection, focus lands on the
  map heading once it renders; in the tab the side panel has no Plan section and shows the Steps row);
  `SpecDetail.test.tsx` (order with a plan; samples without one unchanged); `webviewBundle.test.ts` 0019 AC-010 budget
  re-run (studio-0015 with the section, ≤ 300 words).
- **Verify:** `npx vitest run --project webview src/webview/detail src/webview/ui` and `npx vitest run --project node src/adapters/node/webviewBundle.test.ts`
  red (stub), then green; gates 1–4
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — The map shows stage rows and step cards, with their keys

- **Covers:** AC-008, AC-011
- **Do:** P-16, P-17. New `areas/planMap/StageRow.tsx`, `areas/planMap/StepCard.tsx`; `PlanMap.tsx` (stages, loose
  row, no-stage list, grid keys); `planMapTexts.ts` (M-05, M-06, M-09, M-16, M-17, `Files`, `Covers`, `Do`, `Verify`,
  `Open in plan`); `main.css`. Tests: `PlanMap.test.tsx` "0023 AC-008" (per stage M-05 and description, M-06 per kind
  and none for one step, M-16/M-17; cards of a group side by side in one row element, `→` between groups; a finished
  stage shows chips, no cards; card button text, `aria-expanded` toggled by pointer, Enter and Space; Files without
  code marks, Covers links, M-09 per return state, blocked reason short with full tooltip; expanded Do, Verify and
  `Open in plan` at the heading line; collapsed again after a tab switch and after another spec; no text beyond the
  short texts; a plan without stages stacks its cards, no heading, kind or ways); new
  `src/webview/areas/planMap/Keyboard.test.tsx` "0023 AC-011" (one tab stop; Up/Down to the previous or next card row
  at the same position, else its last; Left/Right within a row; ends keep focus; Tab from the focused card reaches its
  links, then the next control outside the cards); `webviewCss.test.ts` (card width 200–360 px and wrap from the
  stylesheet; no `@media` in the map's rules; theme variables; focus outline on the new controls).
- **Verify:** `npx vitest run --project webview src/webview/areas/planMap` and `npx vitest run --project node src/adapters/node/webviewCss.test.ts`
  red (stub), then green; gates 1–4
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — The current stage offers its ways; the map follows the files; the sweeps

- **Covers:** AC-009 (render), AC-010, AC-012 (keeps state), AC-015
- **Do:** P-18, P-19, P-21. New `areas/planMap/Ways.tsx`; `StageRow.tsx`, `PlanMap.tsx` (ways state, focus
  fallback); `planMapTexts.ts` (M-08, M-10, `Ways to run stage <n>`); `main.css`. Tests: `PlanMap.test.tsx` "0023
  AC-009" (collapsed on every showing; expanded M-08, the three ways in order with effect sentences and prompts
  literally; M-10 and one start line per unfinished step of the next step's group for Active; none for Ready; no other
  stage shows a way), "0023 AC-010" (each way's Copy is secondary with 0021's label, name, 2 s feedback and clipboard
  text; each start line's Copy is an icon button named `Copy prompt: <line>`; no primary button in the area),
  "0023 AC-012" (an update with a new note shows `↩`, M-09 and M-16; expanded cards, the ways block and focus kept;
  a focused card that leaves → the next by `fallbackFocus`, else the heading); `primaryButtons.test.tsx` "0023 AC-010"
  (the tab with a selected spec has one primary: the side panel's first line; without selection none);
  `userLanguage.test.tsx` "0023 AC-015" (section and map samples: no rule ID, `struck`, `sibling`, `kind`, `stem`,
  `parsing`; negative control); `webviewBundle.test.ts` "0023 AC-010, AC-015" (P-21 over the swept fixtures, negative
  control).
- **Verify:** `npx vitest run --project webview src/webview` and `npx vitest run --project node src/adapters/node/webviewBundle.test.ts`
  red (stub), then green; gates 1–5
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — §4 notes, docs, test-title audit, architecture and Memory Bank sync, final gates

- **Covers:** AC-016, AC-017; AC-018–AC-020 (manual, checklist); re-proves AC-001–AC-015 by the full gate run
- **Deletes:** test `docsScan.test.ts` "the README names the two tabs, …" (retitled for three tabs, audit map)
- **Do:** P-22, P-23, P-24. `docsScan.test.ts` new block "product docs after 0023 (AC-017)" (README: Plan map tab, the
  three ways, `Integrate the returned steps`, no "two tabs"; CHANGELOG names the Plan section and the Plan map under
  the version in preparation; checklist section with AC-018–AC-020 and no "Overview and Board only"; guideline 4 in
  `.claude/rules/ux-guidelines.md` and the Panel row in `docs/product/ux-guidelines.md`; `Amended by 0023 (PD-069)` in
  0005, 0015, 0018, 0019, 0020, 0021, 0022 and the audit specs of §4's last row; no PD row edited). Audit script
  (throwaway, `/tmp/audit-0023/`) against the Baseline (the commit before T-001's commit) and the head; `## Test-title
  audit` lists every absent title with its §4 row or head title. `/sdd-architecture-update` with this plan's approval,
  exactly: `AGENTS.md` `# last reconciled: … (0023)`; `modules` line `src/core/<area>` adds "planMap 0023 — stages,
  step and return states, the current stage's ways (one view for the Plan section and the Plan map)" and board's
  "NS-6 returned work 0023"; `src/webview` — "three tabs: Overview, Board, Plan map (`areas/planMap/`: stage rows,
  cards, ways; 0023), Plan section in the detail (0023)"; `shared` — "plan view and texts (0023)" and 0023 in the spec
  list; the three maps' lines and `last reconciled`. Memory Bank: `techContext.md` one 0023 test line,
  `systemPatterns.md` one dated 0023 entry, `activeContext.md`. The orchestrator's harness for AC-018 (screenshots
  here); AC-019's build part and AC-020 on a re-cut `tip-splitter` copy (OP-004) are Gregor's.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red (docs of the Baseline), then green;
  `grep -c "Amended by 0023 (PD-069)"` per spec ≥ its §4 rows; audit counts; gates 1–5 and `npm run compile-tests`
- [ ] **Verified (T-008):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | — | — | open |
| AC-002 | T-001, T-002 | — | — | open |
| AC-003 | T-003, T-005 | — | — | open |
| AC-004 | T-005 | — | — | open |
| AC-005 | T-005 | — | — | open |
| AC-006 | T-004 | — | — | open |
| AC-007 | T-004 | — | — | open |
| AC-008 | T-004, T-006 | — | — | open |
| AC-009 | T-002, T-007 | — | — | open |
| AC-010 | T-007 | — | — | open |
| AC-011 | T-006 | — | — | open |
| AC-012 | T-001, T-003, T-007 | — | — | open |
| AC-013 | T-002 | — | — | open |
| AC-014 | T-003 | — | — | open |
| AC-015 | T-007 | — | — | open |
| AC-016 | T-008 | — | — | open |
| AC-017 | T-008 | — | — | open |
| AC-018 | T-008 | — | manual: orchestrator's preview harness, then Gregor | open |
| AC-019 | T-008 | — | manual: Gregor; draft part answered by PD-076 (*Research*), build part open | open |
| AC-020 | T-008 | — | manual: Gregor with two assistants on a re-cut `tip-splitter` | open |

## Session handoff

- **Done so far:** plan written 2026-11-18; spec revised for PD-076 (open points only).
- **Next action:** Gregor reads the plan; on the start signal `/sdd-lifecycle` moves spec and plan to `active/`, then
  T-001.
- **Open decisions:** none for Gregor; proxies P-1…P-24 above.
- **Baseline:** 8ce8cb7 (head before the first step commit, 2026-11-18)
- **Environment:** `npm test` (host smoke, including `src/test/shell.smoke.test.ts`) only on Windows and CI; layout
  checks in the orchestrator's harness.
