# Plan — Plan Map: Stages, Parallel Work, Workers

**Spec:** [0023-plan-map-stages-parallel-work.md](0023-plan-map-stages-parallel-work.md)
**Status:** Done
**Last updated:** 2026-11-18
**Current step:** none

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
  Files by `PathText`, Covers by `FileLink`, M-09; expanded Do, Verify and `Open in plan`. Expansion per card occurrence
  (stage, ID, nth time in the stage; T-010) in `PlanMap`, reset by `key={detail.key}` and on mount (every showing). CSS: group `display: flex; flex-wrap: wrap`,
  card `flex: 1 1 200px; min-width: 200px; max-width: 360px`; no `@media`; theme variables only (0013 guard).
- P-17 Keys: one tab stop (roving tabindex); grid = card rows in DOM order (a group, or a card of its own); Up/Down →
  `moveFocus(rows, key, 'left' | 'right')`, Left/Right → `'up' | 'down'` (rows as 0007's columns); only the tab-stop
  card's links take `tabIndex 0`; Enter and Space are the button's own.
- P-18 Ways UI: `areas/planMap/Ways.tsx`, a disclosure `Ways to run stage <n>` (chevron) after the current stage's
  cards, collapsed on every showing; prompts in `code` with `PathText command`; Copy prompt `look="secondary"`; M-10
  and start lines with `look="icon"`.
- P-19 Live updates: expansion by card occurrence and the ways state by stage number survive a detail update; focus stays on
  the same card, else `fallbackFocus` over the card rows, else the map heading; a focused way, Copy or start line that
  goes hands it to the heading (AC-012, PD-077; T-010, T-011).
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
5. T-009 → T-010 → T-011 → T-012 → T-013 → T-014 → T-015 → T-016 → T-017 — the fix round after the compile (S78):
   D1–D3, the not-found chip, the test gaps, housekeeping, evidence and docs

No parallel stage: T-001 and T-002 share `src/core/planMap/planMap.ts` and its test, T-003 builds on both; the webview
steps share `main.css` (the Studio's one stylesheet, 0013), `planMapTexts.ts` and `areas/planMap/PlanMap.tsx`, and
T-005's M-03 focus needs T-004's map heading. T-005 ‖ T-006 would need their CSS in separate files and the texts
table complete before both; at eight medium steps that buys less than it costs. Preview harness (guideline 12,
orchestrator) at the ends of stages 2 and 3; AC-018 screenshots recorded here. Stage 5 runs in sequence as well: its steps
share `PlanMap.tsx`, the map's test files and this plan.

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
- [x] **Verified (T-003):** 2026-11-18 · `npx vitest run --project node src/core/board src/core/planMap src/core/copyNextStep/noWrite.test.ts src/shared/protocol` and `npx vitest run --project timing-node src/core/board/boardService.timing.test.ts`: red first (guards and `buildPlanSpecs` stubs: 4 of 4 guard tests, the board service and detail tests failed with `Not implemented`), then green (390 of 390 in board and copyNextStep, timing 4 of 4); gates 1–4 green, `npm run test:unit` 2700 passed + 3 skipped (+16 timing)
- **Notes:** `PROTOCOL_VERSION` is 6; the six `v: 5` literals are `v: 6` and the "another version" literals `v: 7`. `BoardView.planSpecs` is required (strict guard), so the three literal board views in tests carry `planSpecs: []`. `core/shell/specTree.ts` exports `STATE_GROUP`, `GROUP_ORDER` and `compareRows` (P-11). The AC-012 timing test was written with the stubs in place and ran green once they were filled (the stub made every board build fail); its control is the first assertion (T-003 not returned before the note).

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
- [x] **Verified (T-004):** 2026-11-18 · `npx vitest run --project webview src/webview` and `npx vitest run --project node src/shared/protocol src/adapters/vscode/manifest.test.ts src/core/shell` red first (new tests against the code without the third area: `PlanMap.test.tsx` 13 of 13 failed, plus the retitled area, navigation, manifest and memory tests), then green (webview 492 of 492); gates 1–5 green, `npm run compile-tests` green; `npm run test:unit` 2715 passed + 3 skipped (+16 timing)
- **Notes:** Retitled instead of deleted (the *Deletes* line's tests keep their body, with three areas): `messages.test.ts` describe "0020 AC-016: two areas" → "0023 AC-006: three areas" and its first test; `SidePanel.test.tsx` "0020: the panel has no area without a side panel; …" → "0023 AC-007: the navigation offers Overview, Board and Plan map, and the panel stands beside each of them"; `manifest.test.ts` "… (Overview and Board) …" → "… (Overview, Board and Plan map) …"; also `App.test.tsx` "0020 AC-016: lists exactly Overview and Board, in this order" → "0023 AC-006: lists exactly Overview, Board and Plan map, in this order" and `webviewBundle.test.ts` "… the two areas …" → "… the three areas …" (T-008's audit lists them). The below-900 px and divider tests of `ListOrDetail.test.tsx` live in `PlanMap.test.tsx` "0023 AC-007" (the frame is the same; the map needs the area and a detail event). `DetailAreaId` (`'overview' | 'board'`) types the back button and `BACK_LABELS`; the map's heading focus is `areas/planMap/focus.ts` (`requestMapFocus`, `takePendingMapFocus`). The map shows only its header and the state list so far: stage rows and cards are T-006, ways T-007. `src/test/shell.smoke.test.ts` AC-005 runs `openPlanMap` (CI only).

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
- [x] **Verified (T-005):** 2026-11-18 · `npx vitest run --project webview src/webview/detail src/webview/ui` and `npx vitest run --project node src/adapters/node/webviewBundle.test.ts` red first (`PlanSection.test.tsx`: 11 of 13 failed against the code without the section), then green (webview 505 of 505, bundle 36 of 36 against the freshly compiled bundle); gates 1–5 green; `npm run test:unit` 2729 passed + 3 skipped (+16 timing)
- **Notes:** `StepChip` renders the three chip kinds (link, struck link, plain `span` for a step not in the plan) and is shared with the tab's finished stages in T-006; the symbols, words and `chipName` are in `planMapTexts.ts` (`STEP_LOOKS`, `stepLook`). `SpecDetail` takes `onOpenMap`: the side panel passes it outside the tab only, and `SpecDetail` shows the section only when it is given, so the tab's side panel shows the Steps row again (P-13). The 0019 AC-010 word budget on `studio-0015` (Review, section shown) passes with the section.

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
- [x] **Verified (T-006):** 2026-11-18 · `npx vitest run --project webview src/webview/areas/planMap` and `npx vitest run --project node src/adapters/node/webviewCss.test.ts` (new tests of `PlanMap.test.tsx` "0023 AC-008", `Keyboard.test.tsx` "0023 AC-011" and the CSS block written with the stubs absent, then green: 27 and 91 tests passed); gates 1–4: `tsc --noEmit`, `npm run lint`, `npm run compile`, `npm run test:unit` 2746 passed + 3 skipped (+16 timing)
- **Notes:** `StageRow` renders a finished stage as `StepChip`s and an unfinished one as cards per group (`.plan-group` is the flex row, `→` is a `.plan-arrow` between groups); `PlanMap` holds the expansion (a set of step IDs, reset by `key` on the spec) and the tab stop. The key grid is the card rows in DOM order (each group, the loose row, or each card of a plan without stages) and reuses `moveFocus` of the Board with the axes swapped (Up/Down between rows, Left/Right within a row). Only the tab-stop card's Covers links take `tabIndex 0` (`FileLink` got an optional `tabIndex`); the `Open in plan` link lives in the collapsed panel (`hidden`), so it is out of the tab order until the card is expanded. A modified arrow key (Shift, Alt, Ctrl, Meta) is left alone. Focus fallback after a live update is T-007.
  *Added in T-017 (compile S78): no red run existed for this step's tests (they were written with the components). The negative control is the mutants now: 27 mutants of T-006's code, 9 survived (M64, M65, M66, M67, M72, M74, M76, M79, M108). M64, M65, M66, M67, M72, M79 (T-014) and M108 (T-015) die; M74 and M76 stay a note (P-27); D2 (an ID twice) was found by the compile's probe and is T-010.*

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
- [x] **Verified (T-007):** 2026-11-18 · `npx vitest run --project webview src/webview` and `npx vitest run --project node src/adapters/node/webviewBundle.test.ts` (new: `PlanMap.test.tsx` "0023 AC-009", "0023 AC-010", "0023 AC-012" 11 tests, `primaryButtons.test.tsx` "0023 AC-010", `userLanguage.test.tsx` "0023 AC-015", `webviewBundle.test.ts` "0023 AC-010, AC-015" 13 tests over the 11 swept fixtures); gates 1–5: eslint `--max-warnings 0`, `tsc --noEmit`, `tsc --noEmit -p src/webview`, `npm run test:unit` 2775 passed + 3 skipped (+16 timing), `npm run compile`. The tests were written after the components, so they were green on first run; a red run against the stub was not done for this step (see Notes).
- **Notes:** `Ways.tsx` renders the disclosure (collapsed, local state of the stage row, so it survives a model update and resets with another spec) and uses `CopyButton` (`secondary` for the three prompts, `icon` for the start lines, so label, name and 2 s feedback are 0021's and 0022's). The prompts and start lines come from the view (`PlanWaysView`), the lead texts (M-08, M-10) and the heading from `planMapTexts.ts`. The wrapping of prompts uses `PathText command` with `overflow-wrap: break-word`: 0022 AC-002 allows `anywhere` only on step text. Focus after a live update (AC-012): `Stages` remembers the last focused card; when it is gone after an update and the focus left the map's cards, `fallbackFocus` of the Board picks the card at its place, else the map heading. The P-21 sweep renders the Plan map for every spec of the 11 swept fixtures; it scopes the word check to `[data-plan-map]` because the side panel's status tooltip carries a rule ID in the shared `detailView` sample (an existing sample, not the map).
  *Added in T-017 (compile S78): no red run existed for this step either ("a red run against the stub was not done", above). The negative control is the mutants now: 13 mutants of T-007's code, 2 survived (M105, M107, both the 0022 AC-015 break of prompts); both die since T-015. D3 sat in the focus fallback that these tests never tried; T-011 adds the tests (red first) and PD-077's code.*

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
- [x] **Verified (T-008):** 2026-11-18 · `npx vitest run --project node src/adapters/node/docsScan.test.ts` red first against the docs of `6346495` (17 failed: the README, CHANGELOG, checklist, guideline, the §4 note counts and the retitled README test), then green (130 passed); `grep -c "Amended by 0023 (PD-069)"` per spec: 0005 4, 0013 1, 0015 4, 0016 1, 0017 1, 0018 3, 0019 12, 0020 7, 0021 5, 0022 8, ADR-001 1 (≥ its §4 rows); the audit above: 7 absent, each listed; gates 1–5 and `npm run compile-tests`: `eslint src --max-warnings 0`, `tsc --noEmit`, `tsc --noEmit -p src/webview`, `npm run test:unit` 2792 passed + 3 skipped (+16 timing), `npm run compile`, `npm run compile-tests`
- **Notes:** §4 notes written by `/tmp/amend-0023/amend.py` (throwaway), each directly under its statement and after the notes of 0021 and 0022; no PD row edited (`product-decisions.md` untouched). 0013 AC-016's test audit and the other audits (0015 AC-027, 0016 AC-023, 0017 AC-024, 0018 AC-030, 0019 AC-023, 0020 AC-021, 0021 AC-020, 0022 AC-017) carry the AC-016 note. The architecture update ran with the plan's approval as the confirmation (the entries are exactly the ones named in *Do*): `AGENTS.md` snapshot and `last reconciled` (0023), `.architecture/{core,webview,adapters}.md`. Memory Bank: `techContext.md` one test line, `systemPatterns.md` one dated entry, `activeContext.md`. The checklist section `## Plan map (0023)` stands before `## Go` and the order test lists it. The 0015 M-1 line now says the panel shows "Overview, Board and Plan map". Open: AC-018 (the orchestrator's preview harness), AC-019's build part and AC-020 (Gregor), `npm test` on Windows and CI, a fresh `/sdd-compile`; 0024 is not built.

## Fix round after the compile (S78, `/home/claude/orch/compile/0023.md`; Gregor: "Fix the findings of the 0023 compile")

Proxy decisions of this round (Gregor delegated; P-25 …), recorded here and in the step Notes.
- P-25 D3 (b) is PD-077: a focused card hands the focus to the card now at its place, and only a way, a Copy, a start
  line or an empty place hands it to the map's heading. AC-012 is revised to say so (T-011), 0019 AC-020 is unchanged.
- P-26 M22 (a stage of only not-found IDs): *finished* needs at least one found step (P-5, unchanged): a stage with
  nothing found has no step that could be done, so it is not shown as done. Pinned by a test (T-013).
- P-27 M74 (loose cards as one card row) and M76 (Alt+arrow): note only. §5.3 calls the loose row one row ("a parallel
  group's cards or a card of its own") and the spec says nothing about Alt+arrow; the tests are not touched for them.
- P-28 F1 (a not-found ID of an unfinished stage is a disclosure with an empty panel, guideline 2): rendered as the
  chip P-5 asked for, outside the card grid (T-012). F3 (a swept fixture with an open `‖` stage) is not part of this
  round: the harness (AC-018) counted the Copies on `par-open`, and the unit tests render the ways from a sample view.

### T-009 — The ways wait for a spec without a return note, Ready included

- **Covers:** AC-009 (D1, §5.4)
- **Do:** `src/core/planMap/planMap.ts`: the ways condition adds `spec.returnNoteKeys.length === 0`. Test first,
  `planMap.test.ts` "0023 AC-009": a Ready spec with a `‖` stage and a return note (`.memory-bank/activeContext.0001-T-009.md`)
  offers no way; the same Ready spec without the note still offers them (negative control).
- **Verify:** `npx vitest run --project node src/core/planMap` red on a scratch copy of the head, then green; gates 1–4
- [x] **Verified (T-009):** 2026-11-18 · `npx vitest run --project node src/core/planMap` red first on a scratch copy of `be84438` (`git archive`, the new test only: "a Ready spec with a return note offers no way" failed, `expected [[1, [...3], []]] to deeply equal []`), then green 37 of 37; gates 1–4 green, `npm run test:unit` 2793 passed + 3 skipped (+16 timing)
- **Notes:** The ways condition now reads `!context.noteLies` beside the case of `nextStep()`: for an Active spec a note already turned the case into NS-6-returned, for a Ready spec the case stays NS-7 with a note, which the check closes. The existing Ready test keeps its assertions and shares the fixture builder (`readyParallelModel`) with the new one; the negative control is the same Ready spec without the note, which still offers one way block.

### T-010 — Cards, grid, tab stop and expansion go by occurrence, not by step ID

- **Covers:** AC-011, AC-008 (D2, F5; §7 "an ID twice")
- **Do:** `PlanMap.tsx`, `StageRow.tsx`, `StepCard.tsx`: a card is addressed by its stage number and its place (`data-step-card`
  stays the step ID, a new `data-card-at="<stage>.<n>"` addresses the occurrence); the grid, the tab stop, the arrow keys, the
  expansion and the focus fallback use that address. Tests first: `Keyboard.test.tsx` "0023 AC-011" with an ID in two
  unfinished stages (one tab stop; the arrows start from the card that holds the focus; the stop follows the second
  card); `PlanMap.test.tsx` "0023 AC-008" (expanding one card of an ID that stands twice expands only it).
- **Verify:** `npx vitest run --project webview src/webview/areas/planMap` red on a scratch copy of the head, then green; gates 1–4
- [x] **Verified (T-010):** 2026-11-18 · `npx vitest run --project webview src/webview/areas/planMap` red first on a scratch copy of `d228cb8` (the three new tests only: `Keyboard.test.tsx` "…the arrows start from the card that holds the focus…" failed with `expected [-1, +0, +0, -1] to deeply equal [-1, -1, +0, -1]`, two tab stops; `PlanMap.test.tsx` "an ID that stands in two stages is two cards…" failed with `expected ['true','true'] to deeply equal ['false','true']`; the first Keyboard test of the pair, one tab stop at the start, was already green), then green (webview 538 of 538); gates 1–4 green, `npm run test:unit` 2796 passed + 3 skipped (+16 timing)
- **Notes:** A card is addressed by `<stage>|<ID>|<n>` (n = the nth time that ID stands in that stage; the loose row uses `loose`), built by the new `areas/planMap/cardKeys.ts` for the grid (`cardRowsOf`), the stage rows and the loose row. `data-card-key` carries it; `data-step-card` and `data-card-toggle` stay the step ID (the existing tests and the sweeps read them). Expansion, tab stop, arrow keys and the focus fallback use the key, so a live update that drops another card keeps the focus and the expansion on the same step. P-17 and P-19 now read "per occurrence".

### T-011 — Focus stays in the map: a removed way, Copy or start line hands it to the heading (PD-077)

- **Covers:** AC-012 (D3, PD-077)
- **Do:** `PlanMap.tsx` (`Stages` and the map root): focus is tracked anywhere inside `[data-plan-map]` (card heads, links,
  the ways toggle, Copies, start lines); when the focused element is gone after an update, a card hands the focus to the
  card now at its place (PD-077, as P-19 does), anything else to the map's heading. Spec: AC-012 revised to PD-077 with an
  amendment note `*Amended by PD-077 …*` under it. Tests first, `PlanMap.test.tsx` "0023 AC-012": the compile's repro (open
  the ways, focus a start-line Copy, send the detail with the step returned: the ways block is gone and the heading holds
  the focus), the same for a way's Copy and the ways toggle; the card test (b) is kept as it is.
- **Verify:** `npx vitest run --project webview src/webview/areas/planMap` red on a scratch copy of the head, then green; gates 1–4
- [x] **Verified (T-011):** 2026-11-18 · `npx vitest run --project webview src/webview/areas/planMap` red first on a scratch copy of `241b190` (the four new tests: the three PD-077 tests failed with `expected <body> to be <h2 tabindex="-1" data-map-heading>` — the compile's repro with a start-line Copy, a way's Copy and the ways toggle, and a start line that goes while the ways block stays; the control "a focused Copy that still exists keeps the focus…" was green on both sides), then green (webview 542 of 542); gates 1–4 green, `npm run test:unit` 2800 passed + 3 skipped (+16 timing). Spec: AC-012 revised to PD-077 with the amendment note under it
- **Notes:** `Stages` now remembers the last focused element of the whole stage area, not only of a card (`hadFocus = { card? }`; the card key only when the element sits in a card). After a plan update, when the focus is no longer inside the area: a card whose key leaves gets the card at its place (`fallbackFocus`, PD-077 and P-19, unchanged); anything else, or no card left, gets the map's heading. The header's own controls (heading, Open plan) are not removed by an update. The existing test "a focused card that leaves hands the focus to the card at its place, else to the heading of the map" already pinned (b) and keeps its title and body. P-19 reads: "expansion and the ways state survive; focus as PD-077".

### T-012 — A step the plan does not know is a chip, not a card

- **Covers:** AC-008, AC-004 (F1, P-5; guideline 2)
- **Do:** `StageRow.tsx`, `PlanMap.tsx` (`gridOf`): in an unfinished stage a `notFound` step renders as `StepChip` (plain
  `span`, M-01 `?` and `not in the steps`), and it is not in the card grid or a card row. Test first, `PlanMap.test.tsx`
  "0023 AC-008": a stage with a not-found ID among cards has no card for it and no disclosure; the arrows skip it.
- **Verify:** `npx vitest run --project webview src/webview/areas/planMap` red on a scratch copy of the head, then green; gates 1–4
- [x] **Verified (T-012):** 2026-11-18 · `npx vitest run --project webview src/webview/areas/planMap` red first on a scratch copy of `ea45cd9` (the new test "a step the plan does not know is a plain chip, not a card…" failed with `expected ['T-003','T-099','T-004'] to deeply equal ['T-003','T-004']`), then green (webview 543 of 543); gates 1–4 green, `npm run test:unit` 2801 passed + 3 skipped (+16 timing)
- **Notes:** Outside the compile's order list (F1, guideline 2, P-5 "a chip only"): an unfinished stage renders a `notFound` step as `StepChip` (the same plain `span` the finished stages and the Plan section use) inside its group row, and `cardRowsOf` leaves it out of the arrow grid. No card means no disclosure with an empty panel. The Plan section and the finished stages are unchanged. Layout of the chip beside cards is the flex row's own (no new CSS); the real-window check (AC-018) can look at it.

### T-013 — Core test gaps: M01, M02, M17, M21, M22, M24

- **Covers:** AC-001, AC-002, AC-008, AC-012 (compile survivors)
- **Do:** `planMap.test.ts` only: "0023 AC-001" (M01 `‖` wins over `→` between two IDs; M02 IDs with no mark between them are
  two groups), "0023 AC-002" (M17 a note on another step: no step is *next* while a note lies), "0023 AC-012" (M21 m counts
  returned and unfinished steps, not done ones; M24 the notes of another spec are not this spec's), "0023 AC-008"
  (M22 P-26: a stage of only not-found IDs is not finished). No code change; each test is shown red on a scratch copy
  with its mutant (`/tmp/c0023s78/tools/mutants.py` definitions), green on the head.
- **Verify:** `npx vitest run --project node src/core/planMap`; the six mutants red, one by one on a scratch copy; gates 1–4
- [x] **Verified (T-013):** 2026-11-18 · `npx vitest run --project node src/core/planMap` green 43 of 43 on the head; each of the six new tests shown red against its mutant on a scratch copy of the working tree (`/tmp/c0023s78/tools/mutants.py` definitions applied one at a time, restored after): M01 killed by "where ‖ and → both stand between two IDs the pair is parallel", M02 by "IDs with no mark between them are not a parallel group", M17 by "a note for another step leaves the open step open too", M21 by "m counts the returned and the unfinished steps…", M22 by "a stage whose IDs the plan does not know is not finished", M24 by "only the notes of this spec count" (each `1 failed | 802 passed`); gates 1–4 green, `npm run test:unit` 2807 passed + 3 skipped (+16 timing)
- **Notes:** Tests only, no code change. Proxy P-26 (M22): *finished* keeps P-5's rule "at least one found step and all found steps done or dropped"; a stage of only not-found IDs has no step that could be done, so it is not shown as done (the spec's §5.1/§7 are silent). M01 needs both marks between two IDs (`T-004 → ‖ T-005`): §5.1 and P-4 say `‖` wins. The M22 test sits in the AC-001 describe beside the other stage-view checks; its title names P-26.

### T-014 — Webview test gaps: M64, M65, M66, M67, M72, M79, M90

- **Covers:** AC-011, AC-008, AC-012, AC-004 (compile survivors)
- **Do:** tests only. `Keyboard.test.tsx` (M64 the card that is expanded and not the stop keeps `Open in plan` out of the
  tab order; M72 an arrow is `preventDefault`ed); `PlanMap.test.tsx` (M65 the state word of a card for assistive
  technology; M66 a dropped ID on a card is struck; M67 the full blocked reason as the card's tooltip; M79 the
  expansion resets with another spec when selection and detail arrive in one render, order-independent);
  `PlanSection.test.tsx` (M90 M-04 after a `mixed` stage). M74 and M76: note only (P-27).
- **Verify:** `npx vitest run --project webview src/webview`; the seven mutants red on a scratch copy; gates 1–4
- [x] **Verified (T-014):** 2026-11-18 · `npx vitest run --project webview src/webview/areas/planMap src/webview/detail` green 194 + 51 (planMap) on the head; each new test shown red against its mutant on a scratch copy of the working tree (compile mutant definitions, one at a time, restored after): M64 and M109 killed by "a card that is expanded keeps its links reachable only while it holds the tab stop" (now expands T-002; `1 failed | 232 passed`), M65 by "a card says its state in words for assistive technology…", M66 by "a dropped step keeps its card with the ID struck through…", M67 by "a blocked card shows the short reason and carries the full reason as its tooltip…", M72 by "an arrow key is handled by the grid: its default… is prevented", M79 by "the expansion and the ways state reset with another spec, also when its selection and detail arrive in one render" (both events dispatched in one `act`, so the order of the two renders no longer matters), M90 by "M-04 also follows a mixed stage…"; gates 1–4 green, `npm run test:unit` 2813 passed + 3 skipped (+16 timing)
- **Notes:** Tests only. The title of the M64 test is kept (no title is lost for the audit) and the test now does what the title says: it expands the card that is not the stop. M72's mutant text was re-cut for the T-010 code (`moveFocus(grid, key, direction)`). M74 (loose cards as one card row) and M76 (Alt+arrow moves focus): note only (P-27): §5.3 defines a card row as "a parallel group's cards or a card of its own" and the M-07 row is one row; the spec says nothing of Alt, and the existing test pins that Shift leaves the key alone.

### T-015 — The map breaks long prompts and Files as 0022 AC-015 says: M105, M107, M108

- **Covers:** AC-008, AC-009 (0022 AC-015 as §4 amends it)
- **Do:** tests only. `PlanMap.test.tsx` (a way's prompt and a start line carry a `<wbr>` through `PathText`; a card's
  Files too); `webviewCss.test.ts` (`.plan-way-prompt code` and `.plan-start-lines code` wrap with `overflow-wrap`, never
  `white-space: nowrap`).
- **Verify:** `npx vitest run --project webview src/webview/areas/planMap` and `npx vitest run --project node src/adapters/node/webviewCss.test.ts`; the three mutants red on a scratch copy; gates 1–4
- [x] **Verified (T-015):** 2026-11-18 · `npx vitest run --project webview src/webview/areas/planMap` green 53 and `npx vitest run --project node src/adapters/node/webviewCss.test.ts` green 92 on the head; each new test red against its mutant on a scratch copy of the working tree: M105 (way prompts `white-space: nowrap` instead of `overflow-wrap`) killed by the CSS test "0022 AC-015 as §4 amends it: ways, start lines and card lines break…", M107 (prompt without `PathText`) by "a way's prompt and a start line may break after a path separator…", M108 (Files without `PathText`) by "the Files of a card may break after a path separator…" (each `1 failed | 91–234 passed`); gates 1–4 green, `npm run test:unit` 2816 passed + 3 skipped (+16 timing)
- **Notes:** Tests only. The CSS test reads the rules of `.plan-way-prompt code`, `.plan-start-lines code` and `.step-card-line` and finds no `white-space: nowrap` or `pre` in the way, start-line, stage, group and card rules; `.plan-parallel` (the short label "⇉ can run in parallel") is deliberately outside it. The DOM tests assert the text stays whole (`<wbr>` adds none) and that `<wbr>` is present.

### T-016 — Housekeeping of the tests and texts: the comment, the `any`, the dead constant

- **Covers:** — (rule check of the compile; `AGENTS.md` *Comments*, *TypeScript*; M54)
- **Do:** remove the comment at `Keyboard.test.tsx:49`; `src/shared/protocol/planMap.test.ts:26-27` types the edited view
  without `any`; `PLAN_MAP_COMMAND_TITLE` is asserted against `package.json` in `manifest.test.ts` (the title the user sees
  stays one text, so the constant is kept and pinned).
- **Verify:** `npx vitest run --project node src/adapters/vscode/manifest.test.ts src/shared/protocol`; M54 red on a scratch copy; gates 1–4
- [x] **Verified (T-016):** 2026-11-18 · `npx vitest run --project node src/adapters/vscode/manifest.test.ts src/shared/protocol` green 168 of 168; M54 (`PLAN_MAP_COMMAND_TITLE` changed to another text) shown red on a scratch copy: `1 failed | 29 passed` in `manifest.test.ts`, green on the head; the comment line of `Keyboard.test.tsx` and the two `any` of `shared/protocol/planMap.test.ts` are gone (a grep over the planMap files, tests included, finds no `any` type and no comment); gates 1–4 green, `npm run test:unit` 2816 passed + 3 skipped (+16 timing)
- **Notes:** The constant is kept and pinned, not dropped: the title is a text the user sees, so it lives in the text module (guideline 10) and `manifest.test.ts` 0018 AC-001 now asserts `package.json`'s title against it. In `planMap.test.ts` (shared/protocol) the helper `edit` takes a path and a value (`edit('stages.0.groups.1.sep', '‖')`) and walks `Record<string, unknown>`; all 20 refusals and the accepted control stay, with the same values.

### T-017 — Evidence, notes and docs of the fix round

- **Covers:** AC-016, AC-018 (records only)
- **Do:** this plan: the manual evidence of the orchestrator's harness (`/home/claude/orch/compile/0023-preview.md`) under AC-018,
  Windows at `c9845e1` under AC-016, the Baseline note, the T-006 and T-007 notes (no red run existed; the mutants are the
  negative control now), traceability and handoff; `.memory-bank/activeContext.md` (*Now*, *Changed Recently*, *Validation*);
  `CHANGELOG.md` (the side panel beside the Plan map from 900 px).
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts`; the final gates 1–5 and `npm run compile-tests`
- [x] **Verified (T-017):** 2026-11-18 · `npx vitest run --project node src/adapters/node/docsScan.test.ts` green 130 of 130 (docs scan unchanged, CHANGELOG line extended); the title audit re-run with the compile's scanner: Baseline 2697 → head 2882 titles, the same 7 absent, 0 decreased; final gates `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile && npm run compile-tests` green: `npm run test:unit` 2816 passed + 3 skipped (+16 timing); `git status` clean after the commit
- **Notes:** Done in this step: the harness evidence under AC-018 (*Manual checks recorded*, from `compile/0023-preview.md`), Windows at `c9845e1` under AC-016, the Baseline note, the T-006 and T-007 notes, traceability rows and handoff, `.memory-bank/activeContext.md` (*Now*, *Active Spec*, *Changed Recently* down to six bullets, *Next*, *Validation*), the CHANGELOG line. Open and kept open: AC-016 (CI at the PR, Windows at the fix head), AC-018's real window, AC-019, AC-020.

## Test-title audit

Method (0021's): the string literals of `describe`, `it`, `test` and `suite` (with `.each`, `.skip`, `.only`) in every
`.ts` and `.tsx` under `src`, Baseline `8ce8cb7` (`src` is identical to `0f3f48a`, the move commit the first run named) by `git show` against the
head of T-008; titles compared as a multiset (`/tmp/audit-0023/titles.py`, throwaway). Result: Baseline 2672 titles,
head 2829, **7 absent**, 164 added, none decreased by count. Each absent title is a statement §4 changes; the first
six are retitled in place, their body kept with three areas, the seventh is a title of the README test.

| Absent at the head | Statement changed (§4) | Head title |
| --- | --- | --- |
| `messages.test.ts` describe "0020 AC-016: two areas" | 0020 AC-016 (0005 AC-004, AC-005) | describe "0023 AC-006: three areas" |
| `messages.test.ts` "0020 AC-016: lists exactly Overview and Board, in this order, and no area specExplorer" | 0020 AC-016 | "0023 AC-006: lists exactly Overview, Board and Plan map, in this order, and no area specExplorer" |
| `SidePanel.test.tsx` "0020: the panel has no area without a side panel; the navigation offers only Overview and Board, and both show it" | 0019 §3, 0020 §4.5 | "0023 AC-007: the navigation offers Overview, Board and Plan map, and the panel stands beside each of them" |
| `manifest.test.ts` "AC-001, AC-005 (0005): contributes the Open command and one command per area (Overview and Board) with their titles" | 0005 AC-001, AC-005, 0018 AC-001 | the same title with "(Overview, Board and Plan map)" |
| `App.test.tsx` "0020 AC-016: lists exactly Overview and Board, in this order" | 0020 AC-016 | "0023 AC-006: lists exactly Overview, Board and Plan map, in this order" |
| `webviewBundle.test.ts` "starts without a runtime error, renders the frame with the two areas and the loading state, and says hello" | 0020 AC-016 | the same title with "the three areas" |
| `docsScan.test.ts` "the README names the two tabs, and says Focus on Specs View …" | 0020 §1, README | "the README names the three tabs, and says Focus on Specs View …" |

Re-run at the fix head (T-017, compile S78's scanner `/tmp/c0023s78/tools/titles.js`, built on the TypeScript compiler API and
counting `context`, `specify` and template titles too): Baseline 2697 titles (2689 distinct) → head 2882 (2873 distinct),
**the same 7 absent**, 0 decreased, 191 added. The fix round removed and retitled no test: the M64 test keeps its title and
now expands the card.

Titles kept with changed literals (not absent): `detail.test.ts` "AC-003: the view carries the rule and lines of
nextStep …" (Integrate), `nextStep.test.ts` "the guide of each case …", `PanelStateView.test.tsx` AC-018.

## Manual checks recorded

**AC-018, the harness part.** `manual: orchestrator (Gregor's delegate) 2026-11-18, harness r4check at c9845e1` (PASS). The
orchestrator's note `compile/0023-preview.md`, verbatim below; shots and `report-a/b.json` in `preview/r4-0023/` (96 shots, 2
per view, 48 views). The harness ran at `c9845e1`, the head before this fix round; the fix round changes the keys,
the focus, the not-found chip and tests, so Gregor's real-window check is the next look at the layout.

> Harness /home/claude/orch/preview (real core at c9845e1), script r4check.mts, shots + report-a/b.json in
> /home/claude/orch/preview/r4-0023/ (96 shots: 2 per view, 48 views). Projects: `fs110-parallel-synthetic` (as committed: T-004 returned
> blocked -> spec Blocked), `studio-0015`, and two copies of fs110-parallel-synthetic: `par-open` (plan In Progress, no
> return notes: stage 2 `‖` current, the three ways with prompts and start lines) and `par-returned` (both steps returned
> done: "Integrate the returned steps"). Dark, Light, High Contrast; Studio panel 1600 (side panel default 640), 1600 with
> the divider dragged so the map is 348 px (less than two cards), 1000 (side panel 400), 800 (below 900 px). Per view:
> the Plan section in the side panel (Overview selection) and the Plan map tab with the spec chosen and the ways opened;
> a Tab walk of 40 stops from the tab bar.
>
> **AC-018 — PASS (delegate)**
> - No ID, title, prompt, start line, stage heading, closing line or chip row cut in the Plan section or the map
>   (scrollWidth <= clientWidth) in all 48 views; no `break-all`; the page never scrolls.
> - `‖` cards: side by side in one row at 1600 (map 928 px, cards 360) and 1000 (map 568, cards 275); at map 348 px they
>   wrap to two rows of 338 px, uncut, no card wider than its group.
> - Below 900 px the map shows alone (no side panel, no divider); the Overview selection shows the detail alone with
>   `Back to Overview`.
> - Every Copy fully visible (none clipped by its scroller) and reached by Tab in view: par-open 12–14 Copy stops
>   (`Copy prompt: Implement the whole stage 2 of … in sequence` / `with subagents` / start lines), par-returned the
>   `/sdd-plan` Integrate prompt; at most two filled buttons in Dark and Light (the detail's first-line Copy and the
>   Now row's; the map uses secondary and icon Copies only).
> - Integrate: par-returned shows `Integrate the returned steps` with `/sdd-plan <spec>` in the detail; the stage row says
>   `All steps returned: the next step integrates them.`; the Blocked fixture shows `Find out what blocks` and no ways.
>
> **Observations for Gregor's real-window check (not fails)**
> - The `next` chip glyph `◐` renders narrow in the harness's headless font; check it reads as "next" in VS Code's font.
> - Progress keeps `Next open step: T-003` while both stage-2 steps are returned (unticked until the integrate run);
>   consistent with the plan file, worth a look for wording.
> - Long ways text: the open stage's "Ways to run stage 2" body is long at 1000 px (scrolls inside the map).
>
> **Open**
> - AC-019 (build part) and AC-020: Gregor on a re-cut tip-splitter with Claude Code and Copilot.
> - CI at the PR. Windows at c9845e1: unit 2788 passed, 7 skipped, +16 timing; npm test 31+1+1+1 (green).

**AC-018, the harness recheck after the fix round.** `manual: orchestrator (Gregor's delegate) 2026-11-18, harness recheck at d756fa9`
(PASS), from `compile/0023-preview.md`, section "Recheck at d756fa9 (after the fix round T-009…T-017)": the same matrix plus `par-odd`
(a copy of `par-open` whose stage 2 names a missing `T-099` and whose stage 3 repeats `T-003`): 60 views, 120 shots in
`preview/r4-0023-fix/`, all pass (nothing cut or clipped, no break-all, the page never scrolls, the groups never overflow, every Tab
stop in view, at most two filled buttons in Dark and Light). The not-found ID is a chip `? T-099` beside the stage-2 cards (F1, T-012),
top-aligned and not a card; the repeated `T-003` is its own card in stage 3.

Windows at d756fa9: unit 2812 passed, 7 skipped, +16 timing; `npm test` 31+1+1+1.

**Still open (Gregor):** AC-018 in a real window (also the three observations above), AC-019's build part, AC-020 on a
re-cut `tip-splitter` with both assistants.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-013 | `src/core/planMap/planMap.ts`, `src/shared/protocol/planMap.ts`, `planMapTexts.ts` | `planMap.test.ts` (0023 AC-001), `src/shared/protocol/planMap.test.ts` | verified |
| AC-002 | T-001, T-002, T-013 | `src/core/planMap/planMap.ts` | `planMap.test.ts` (0023 AC-002) | verified |
| AC-003 | T-003, T-005 | `src/core/board/detail.ts`, `src/core/board/boardService.ts`, `src/webview/detail/PlanSection.tsx`, `src/webview/ui/StepChip.tsx` | `planMap.test.ts`, `detail.test.ts`, `boardService.test.ts`, `PlanSection.test.tsx`, `SpecDetail.test.tsx` (0023 AC-003) | verified |
| AC-004 | T-005, T-014 | `src/webview/detail/PlanSection.tsx`, `src/webview/ui/StepChip.tsx` | `PlanSection.test.tsx` (0023 AC-004) | verified |
| AC-005 | T-005 | `src/webview/detail/PlanSection.tsx`, `src/webview/areas/planMap/focus.ts` | `PlanSection.test.tsx` (0023 AC-005) | verified |
| AC-006 | T-004, T-016 | `src/shared/protocol/areas.ts`, `src/adapters/vscode/commands.ts`, `package.json`, `src/webview/areas/registry.tsx`, `src/webview/board/icons.tsx` | `messages.test.ts`, `App.test.tsx`, `shellService.navigation.test.ts` (0023 AC-006), `manifest.test.ts` | verified |
| AC-007 | T-004 | `src/webview/App.tsx`, `src/webview/areas/planMap/PlanMap.tsx`, `src/core/planMap/planSpecs.ts` | `PlanMap.test.tsx` (0023 AC-007), `SidePanel.test.tsx` | verified |
| AC-008 | T-004, T-006, T-010, T-012, T-013, T-014, T-015 | `src/webview/areas/planMap/{PlanMap,StageRow,StepCard}.tsx`, `src/webview/areas/planMap/cardKeys.ts`, `src/shared/protocol/planMapTexts.ts`, `src/webview/main.css` | `PlanMap.test.tsx` (0023 AC-008), `webviewCss.test.ts` (0023 AC-008, AC-011) | verified |
| AC-009 | T-002, T-007, T-009 | `src/core/planMap/planMap.ts`, `src/webview/areas/planMap/Ways.tsx` | `planMap.test.ts`, `PlanMap.test.tsx` (0023 AC-009) | verified |
| AC-010 | T-007 | `src/webview/areas/planMap/Ways.tsx`, `src/webview/ui/CopyButton.tsx` | `PlanMap.test.tsx` (0023 AC-010), `primaryButtons.test.tsx`, `webviewBundle.test.ts` (0023 AC-010, AC-015) | verified |
| AC-011 | T-006, T-010, T-014 | `src/webview/areas/planMap/PlanMap.tsx`, `src/webview/ui/FileLink.tsx`, `src/webview/areas/planMap/cardKeys.ts` | `Keyboard.test.tsx` (0023 AC-011), `webviewCss.test.ts` | verified |
| AC-012 | T-001, T-003, T-007, T-011, T-013 | `src/core/planMap/planMap.ts`, `src/core/board/boardService.ts`, `src/webview/areas/planMap/PlanMap.tsx` | `planMap.test.ts`, `boardService.timing.test.ts`, `PlanMap.test.tsx` (0023 AC-012) | verified |
| AC-013 | T-002 | `src/core/board/nextStep.ts`, `src/shared/protocol/nextStepTexts.ts` | `nextStep.test.ts`, `stepTips.test.ts` (0023 AC-013) | verified |
| AC-014 | T-003 | `src/core/planMap/planMap.ts` | `noWrite.test.ts`, `planMap.test.ts` (0023 AC-014) | verified |
| AC-015 | T-007 | `src/shared/protocol/planMapTexts.ts`, `src/shared/protocol/nextStepTexts.ts` | `userLanguage.test.tsx` (0023 AC-015), `webviewBundle.test.ts` | verified |
| AC-016 | T-008, T-017 | `/tmp/audit-0023/titles.py` (throwaway), this plan's *Test-title audit* | the audit: 7 absent titles, every one listed; `npm run test:unit` green; `npm test` on Windows and CI open | open: unit and the audit verified; Windows at `c9845e1` (before the fix round): unit 2788 passed, 7 skipped, +16 timing, `npm test` 31+1+1+1 green; Windows at the fix head `d756fa9`: unit 2812 passed, 7 skipped, +16 timing, `npm test` 31+1+1+1 (*Manual checks recorded*); CI at the PR open |
| AC-017 | T-008 | `README.md`, `CHANGELOG.md`, `docs/release-checklist.md`, `.claude/rules/ux-guidelines.md`, `docs/product/ux-guidelines.md`, §4 notes in 0005, 0013, 0015–0022 and ADR-001 | `docsScan.test.ts` (product docs after 0023) | verified |
| AC-018 | T-008, T-017 | `docs/release-checklist.md` (Plan map (0023)) | manual: orchestrator (Gregor's delegate) 2026-11-18, harness r4check at c9845e1 (PASS, *Manual checks recorded*); then the recheck at d756fa9 (PASS, 60 views incl. `par-odd`); then Gregor in a real window | open (Gregor) |
| AC-019 | T-008 | `docs/release-checklist.md` (Plan map (0023)) | manual: Gregor; draft part answered by PD-076 (*Research*), build part open | open |
| AC-020 | T-008 | `docs/release-checklist.md` (Plan map (0023)) | manual: Gregor with two assistants on a re-cut `tip-splitter` | open |

## Session handoff

- **Done so far:** T-001…T-008 verified 2026-11-18, one commit per step; the compile S78 found D1…D3 and test gaps; the fix
  round T-009…T-017 (stage 5) is verified, one commit per step: D1 (the ways need no return note, Ready included), D2
  (cards, grid, tab stop and expansion by occurrence), D3 (PD-077: a removed way, Copy or start line hands the focus to the
  heading; AC-012 revised), F1 (a not-found ID is a chip), the survivors M01, M02, M17, M21, M22, M24, M64…M67, M72, M79, M90,
  M105, M107, M108 and M54 closed, the comment, the `any` and the dead constant gone, the evidence recorded. The plan is Done;
  the spec stays In Progress until AC-016 (CI), AC-018 (real window), AC-019 and AC-020 are checked and a fresh `/sdd-compile`
  reads READY.
- **Next action:** CI at the PR (AC-016; Windows and the harness recheck at the fix head `d756fa9` are recorded); then Gregor: AC-018 in a real window, AC-019 (build part) and AC-020 on a re-cut `tip-splitter`;
  then `/sdd-compile` in a fresh session. 0024 (planned, `eac4559`) waits for this fix and is not built.
- **Open decisions:** none for Gregor beyond the manual checks; proxies P-1…P-28 above and those in the step Notes (M74 and
  M76 are notes only, F3 is not done: P-27, P-28).
- **Baseline:** 8ce8cb7 (head before the first step commit, 2026-11-18; `src` identical to `0f3f48a`, the move commit)
- **Environment:** `npm test` (host smoke, including `src/test/shell.smoke.test.ts`) only on Windows and CI; layout
  checks in the orchestrator's harness.
