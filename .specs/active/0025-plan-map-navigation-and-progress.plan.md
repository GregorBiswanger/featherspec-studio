# Plan — Plan Map Navigation and Progress Clarity

**Spec:** [0025-plan-map-navigation-and-progress.md](0025-plan-map-navigation-and-progress.md)
**Status:** In Progress
**Last updated:** 2026-11-19
**Current step:** T-001

## Approach

Figures and words first, navigation second, the new places last. Stage 1 lands the pure, widely visible texts (one
`percentOf()`, one step-look table, one returned-work statement, the quiet `Integrate`), so every later test asserts the
final wording. Stage 2 is the riskiest mechanism: a step or ways target that travels **once** from host to webview (A-011)
and the Plan map applying it, then the `StepLink` component on top. Stage 3 puts step links into Next steps and Overview
rows, the next step into the map header (D-2) and the parallel hint; stage 4 the richer cards and the tree command; stage 5
the sweeps, the preview, §4's notes, docs and the gates. Everything builds on 0028's surfaces as built: `nextStep()`,
`stepView()`, `STEP_GUIDES`, its cases (`NS-6-report` included) and its `caseFixtures`. **0028 AC-010 freezes `nextStep()`
and `stepView()` as snapshots**, so 0025 adds its data beside them (detail and row views, `PlanView`), never inside them.
New source files stay inside existing folders (no new module folder); the T-015 docs sync names the module-map entries.
Memory Bank touched in T-015 only: `techContext.md` (*Test* line), `activeContext.md`; `systemPatterns.md` gets nothing.

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` · 2 `npx tsc --noEmit`
· 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (steps touching wiring, adapters,
`package.json`, `extension.ts` or the bundle: T-005, T-012, T-015) · pre-done `npm test` on Windows and CI, run by the
orchestrator (cannot run here).

## Research

**Checkpoint digest (2026-11-19, Mode A; answered from the standing answer `PLAN-R3.md`, Gregor not reachable).**
- The spec touches existing code, so a checkpoint applies. Every answer comes from the binding sources (12, 13, PD-084…089,
  `ux-guidelines.md`, `cross-spec-r3.md`).
- OP-001's rest was decided by 12 D2-6 together with 09 G-10. Card titles show at most two lines, and `align-items: start`
  holds. Written into §5.2 and AC-017 before this plan.
- The Overview tooltip drops the space before `%` (PD-085; AC-013's example already reads `Progress 67% (2 of 3)`). Written
  into §5.4 and U-04.
- PD-085 and PD-088 are in the spec. PD-084, PD-086, PD-087 and PD-089 bear on 0028, 0026 or 0027, not on 0025.
- D-2 is applied as §5.3. 13 K-1 is AC-027. 13 confirmation points 1–8 are unanswered, so the proxies of §10 stand.
- No survey finding contradicts the spec.
- No `done/` spec becomes a `Deprecated` candidate. 0005, 0006 and 0013 get §4 notes only.
- Web lookups ran under the standing answer's go, as S95 did for 0028.
- The step list is long (15 steps for 27 criteria, as 0023 had 17). The spec covers seven rule groups that share one view
  model and one map, so it stays one spec. If it is split later, §5.4/§5.5 is the cut.

**Survey (code at `f9cadb4`, 0028 in progress in the same tree; read 2026-11-19).**
- Plan map
  - `core/planMap/planMap.ts` `planOf()` builds `PlanView`. Its `stepView()` projects `id, state, title, open, files,
    covers, doText, verify, returned`. `PlanStep.verified` and the note's `parsed.verified` are parsed but not projected.
  - Stage `returned {n,m}` and `ways` are offered only for cases `NS-6-open` and `NS-7` without a note, so 0028's
    `NS-6-report` gets none.
  - Guards in `shared/protocol/planMap.ts` use exact key sets (`keysAre`): every new field changes a guard and its test.
- Webview of the map
  - `areas/planMap/PlanMap.tsx` reads the plan from the **detail view** (`detail.plan`), so the header can render
    `detail.nextStep` with no new message.
  - `Stages` holds `expanded` as local state, and the roving tab stop lives in `stop`.
  - `StageRow` renders a finished stage as `StepChip`s. `Ways` holds its own `open` state (0026 reworks its body later).
  - `focus.ts` has the pending-heading-focus pattern (`requestMapFocus`).
  - `.plan-group` has no `align-items`.
- Side panel
  - `SidePanel` passes no `onOpenMap` in `planMap`, so `SpecDetail` drops its Plan section there (0023 §5.2).
  - `Progress` shows the Steps row only without a Plan section (`withSteps`), with the next open step as a `FileLink`.
  - `NextStep.tsx` renders line 1 with `StepAction look="primary"`, the coach line after it and line 2 secondary.
  - `App.tsx` shows the side panel beside the map only from 900 px (`NARROW_QUERY`); below that the map shows alone.
- Navigation
  - `NavigationTarget` is `{kind:'spec', stem, path?} | boardFilter`.
  - `shellService.navigate()` stores `target` in every later `ShellView` until `open()`, and no webview code reads it.
  - `ShellView` pushes are de-duplicated by JSON (`recompute`), so an unchanged view sends no message.
  - `studioPanel.ts` overrides the service's `hello` handler and pushes view, board, overview and detail. Messages sent
    before `hello` can be lost.
  - So a one-shot `focus` needs a ready signal from the panel adapter, and it needs a forced push.
  - `PROTOCOL_VERSION = 8` (`envelope.ts`).
- Progress
  - Texts are in `shared/protocol/texts.ts`: `stepsDoneText`, `criteriaVerifiedText`, `stepsText`, `criteriaShortText`.
    Callers: Progress, PlanSection, PlanMap header, Board `Card.tsx`, `specTree.ts` tooltip.
  - `ProgressBar` has `aria-valuetext` and no `title`.
  - The Overview figure is `figures.ts` `Math.floor`. Its text is `progressText()` `Progress ${p} % (…)` plus
    `FORMULA_TEXT … rounded down` (`areas/overview/texts.ts`).
  - Ten test files assert these texts (list in T-001).
- Motifs
  - `STEP_LOOKS` in `planMapTexts.ts` holds the symbols ✓ ◐ ○ ↩ ⊘ ?, which `StepChip` and `StepCard` render.
  - Glyphs are hand-drawn 16 px paths in `board/icons.tsx` (`MOTIF_PATHS`, PD-054). The pattern is
    `shared/protocol/stateLook.ts` `STATE_LOOK`.
- Overview
  - `SpecRow` renders the step text (`ui/StepText`) **inside** the row's `Drill` `<button>`, so a link there would be a
    nested interactive control.
  - The row is a CSS grid. The Drill covers `1 / -1` as a subgrid, and Copy is already a sibling placed in area `copy`.
    A sibling step text in area `step` follows the same pattern.
  - `Now.tsx` gives row 0 `copyLook 'primary'`. `SendButton` has no `look` (always primary, 0024).
  - Problems rows reuse `SpecRow`, but AC-027 names Now and Up next only.
- Tree
  - `specTree.ts` `contextValueOf()` gives `spec [step] [plan]`.
  - Menus `spec@1…@3` use `viewItem` regexes (`package.json`). `treeActions.ts` opens the panel with `shell.open({via:'start'})`
    and then `panel.show`.
- Traceability
  - `core/board/situation.ts` `criteriaOf()` reads `plan.parsed.traceability` rows with `CRITERION_CELL` and trimmed
    `State`. Card criterion states reuse that cell rule.
- 0028 surfaces
  - `nextStep()` lines and cases, and the `reason` on `NS-6-report`.
  - The Review rule (a finished plan is Review: the map stays, because Review ≠ Done).
  - `test/fixtures/next-step-baseline/*.json` snapshots `nextStep`, `stepView` and `tips` per fixture spec.
    `nextStepBaseline.test.ts` fails on any added field.
  - `src/core/board/testing/caseFixtures.ts` holds the all-ticked tip-splitter memory fixture (AC-009 uses it with plan
    `In Progress`).
- Assumption: 0028 lands as its plan says (T-001…T-009) before T-001 here. If it changes `NextStepView` or the case names,
  T-004, T-008 and T-009 read the new names. Their behaviour does not change.
- Sources
  - [vscode-codicons `mapping.json`](https://raw.githubusercontent.com/microsoft/vscode-codicons/main/src/template/mapping.json)
    — `check`, `debug-stackframe`, `circle-large-outline` (alias of `circle-large`), `reply`, `circle-slash` and
    `question` all exist. The rendered cheat sheet omits aliases, so the mapping file decides. Retrieved 2026-11-19.
  - [MDN: progressbar role](https://developer.mozilla.org/fr/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role)
    — `aria-valuetext` is the readable alternative to `aria-valuenow` when a percentage of it is not accurate. Settles
    `aria-valuetext` = visible text (PD-079). Retrieved 2026-11-19.
  - [MDN: -webkit-line-clamp](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp) — needs
    `display: -webkit-box` and `-webkit-box-orient: vertical`. It is supported where the unprefixed `line-clamp` is not
    Baseline. Settles the two-line title rule in Chromium (VS Code webview). Retrieved 2026-11-19.
  - [MDN: Element.scrollIntoView()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) — the
    defaults are `block: 'start'` and `behavior: 'auto'` (computed `scroll-behavior`). The plan uses `{ block: 'nearest' }`,
    which moves only when the card is out of view (guideline 8, keep the place). Retrieved 2026-11-19.
  - [VS Code: contribution points, menus](https://code.visualstudio.com/api/references/contribution-points) —
    `group@<number>` orders items inside a group, and a `commandPalette` entry's `when` hides a command. Settles `spec@0`
    for "first in the menu" and `when: false`. Retrieved 2026-11-19.

## Stages

1. T-001 → T-002 → T-003 → T-004 — percentages, step motifs, one returned-work statement, the quiet `Integrate`
2. T-005 → T-006 → T-007 — a target travels once; the map applies it; step links in the side panel and finished stages
3. T-008 → T-009 → T-010 — step links in Next steps and Overview rows; the map header's next step; the parallel hint
4. T-011 ‖ T-012 — independent: card rows (planMap core, card, CSS) and the tree command (manifest, tree, actions); run in sequence
5. T-013 → T-014 → T-015 — sweeps; preview; §4 notes, docs, title audit, Memory Bank and final gates

Parallel: stage 4. It runs in sequence (`PLAN-R3.md`). Stages 1–3 share text modules, `PlanMap.test.tsx`,
`SpecDetail.test.tsx` and the protocol guards, so they get no `‖`.

## Steps

### T-001 — Percentages on every progress text

- **Covers:** AC-012, AC-013
- **Do:**
  - New `src/shared/protocol/percent.ts` `percentOf(done, total)`: `floor((200·done + total) / (2·total))`, at most 99
    while done < total, `undefined` for total 0. Its stub throws `Not implemented` for the red run.
  - `stepsDoneText`, `criteriaVerifiedText`, `stepsText`, `criteriaShortText` end in ` · <p>%` (U-04).
  - `ProgressBar` sets `title` to its text.
  - `figures.ts` uses `percentOf`. `progressText()` reads `Progress <p>% (…)`, and `FORMULA_TEXT` takes U-04's formula.
  - Tests:
    - `percent.test.ts` "0025 AC-012 …" (the ten pairs).
    - `ProgressBar.test.tsx` "0025 AC-013 …" (`title` = `aria-valuetext` = text).
    - `core/board/progress0025.test.ts` "0025 AC-013 …" (the examples on `fs110-ready-synthetic` and `studio-0015`,
      3 of 7, three specs `67%`, "not available" without a number).
  - Update the literal texts in `figures`, `detail`, `specTree`, `specTreeService`, `SpecDetail`, `PlanSection`,
    `Overview`, `PlanMap`, `webviewBundle` and `SpecBoard` tests. Titles are kept, and changed statements are listed in
    `Notes:`.
- **Verify:** `npx vitest run src/shared/protocol/percent.test.ts src/webview/ui/ProgressBar.test.tsx src/core/board/progress0025.test.ts`
  red (stub, missing `title`, old texts), then `npm run test:unit` green.
- [x] **Verified (T-001):** 2026-11-19. Red: `npx vitest run src/shared/protocol/percent.test.ts src/webview/ui/ProgressBar.test.tsx` 11 failed (stub threw Not implemented; no `title`). Green: `npm run test:unit` 3289 + 26 timing passed; eslint, tsc ×2 clean.
- **Notes:** Changed statements (titles kept): the literal texts in SpecBoard, Overview, PlanMap, PlanSection and specTree tests now read U-04 (` · <p>%`, `rounded half up, at most 99% until all are done`, `Progress 25% (`). `docsScan` needs 0025 in activeContext.md, added. The tree tooltip joins the two figures as `Steps 3/7 · 43% · Criteria 28/30 · 93%` (proxy: the dot join of 0020 stays). A total of 0 carries no percent (`0 of 0 done`).

### T-002 — Codicon motifs from one step-look table

- **Covers:** AC-014
- **Do:**
  - New `src/shared/protocol/stepLook.ts` `STEP_LOOK`: state → `{ motif, colour }`, following 0022 §4.8's pattern.
    - done `check`; next `debug-stackframe` in `focusBorder`; open `circle-large-outline`; returned `reply`; returned,
      blocked `circle-slash` in Blocked's colour (`STATE_LOOK.Blocked`); not found `question`.
    - The rest use `descriptionForeground`. A dropped step gets no motif.
  - `STEP_LOOKS` keeps the words and loses the symbols.
  - `StepIcon` in `board/icons.tsx`: an inline SVG with `data-motif`, `data-tint` and `aria-hidden`, plus four new 16 px
    paths. The stub renders nothing.
  - `StepChip` and `StepCard` render `StepIcon`. Its tint comes from theme variables in `main.css`.
  - Tests:
    - `stepLook.test.ts` "0025 AC-014 …" (the table and the colour variables).
    - `icons.test.tsx` `StepIcon`.
    - `PlanSection.test.tsx` and `PlanMap.test.tsx` "0025 AC-014 …": motif per state, none of `✓ ◐ ○ ↩ ⊘`, word in the
      accessible name.
    - `webviewCss.test.ts` (theme variables only).
  - Retarget 0023's symbol assertions (titles in `Notes:`).
- **Verify:** `npm run test:unit` — red first (stub: no SVG, symbols still rendered), then green.
- [x] **Verified (T-002):** 2026-11-19. Red: vitest on PlanSection, PlanMap, icons, stepLook tests, 8 failed (chips and cards drew no SVG, symbols gone). Green: `npm run test:unit` 3294 + 26 timing passed; eslint, tsc ×2 clean.
- **Notes:** STEP_LOOKS lost its symbols and gained `key`; `stepLook()` returns `{key, word}`. Retargeted by title: 0023 AC-004 and AC-008 chip/card tests (symbol prefixes dropped from the expected strings, the aria-hidden check now reads the SVG). Codicon paths are hand-drawn 16 px approximations in the PD-054 style. `focusBorder` got a `--fs-tint` rule.

### T-003 — One statement for returned work, with the group view

- **Covers:** AC-015, AC-025
- **Do:**
  - New `src/core/planMap/returnedWork.ts` `returnedWorkOf(model, entry, spec)`.
    - U-05 parts: n = distinct step IDs of the spec's notes. Blocked IDs come in plan order (an unknown status counts as
      returned, not blocked). The clause follows `nextStep()`'s case: `NS-6-returned` → integrates, `NS-4`/`NS-4-plan` →
      finds out, otherwise none.
    - U-08: from the `‖` groups `planOf` already builds, the group holding a returned step whose member is out (neither
      ticked, struck nor returned) gives k of m, blocked IDs, then the out IDs in plan order.
  - Texts `returnedWorkText()` and `groupReturnedText()` go in `planMapTexts.ts`. `ALL_RETURNED_TEXT` and
    `stageReturnedText` go.
  - Projection:
    - `PlanView.returned?: string`.
    - `PlanStageView.returned` becomes that same string on stages holding a returned step. An ID the plan lacks is on no
      stage.
    - `StepsProgress` `steps` gains `returned?`, and loses `next` while a note lies (`situation.ts`).
    - Guards and their tests change with these fields.
  - Webview: the sentence sits under the Plan section's count, in Progress' Steps row and on each `StageRow`.
  - Tests:
    - `returnedWork.test.ts` "0025 AC-015 …", "0025 AC-025 …" (both notes, DONE only, `fs-partial-return`, BLOCKED for
      T-005, ID not in the plan, two notes for one step, unknown status).
    - `PlanSection.test.tsx`, `SpecDetail.test.tsx`, `PlanMap.test.tsx` "0025 AC-015 …": the identical sentence in all
      three places, no next open step, no M-16/M-17.
  - Replace the M-16/M-17 tests (`Notes:`).
- **Verify:** `npm run test:unit` — red first (`returnedWorkOf` stub, old M-16 texts), then green.
- [x] **Verified (T-003):** 2026-11-19. Red: `npx vitest run src/core/planMap/returnedWork.test.ts` 9 failed against the stub (returned undefined). Green: `npm run test:unit` 3307 + 26 timing passed; eslint, tsc ×2 clean. Webview tests (PlanSection, SpecDetail, PlanMap) were written after the code; their red is the removed M-16/M-17 texts they replaced.
- **Notes:** Proxy decision (newest wins): AC-015's example "DONE note only → `1 returned, waiting to be integrated…`" cannot hold on `fs110-parallel-synthetic` once AC-025 applies (T-004 of the `‖` group is out): there U-08 stands (`1 of 2 returned · T-004 not back yet`); the U-05 sentence is asserted on a generated plan without a group member out. U-08's m counts the non-struck members of the groups holding a returned step (a ticked member counts, a struck one does not). Shared stage-line parsing moved to `core/planMap/stageLines.ts` (no behaviour change). `PlanStageView.returned` is now the sentence; M-16/M-17 tests (planMap.test, PlanMap.test, userLanguage.test) retargeted by title; the detail test AC-011 expects no next open step while a note lies. K-1..K-5: K-1 is AC-027 (T-008); K-2, K-3, K-5 are 0026 (Notes only); K-4 is tooling.

### T-004 — `Integrate` is not primary while someone is out

- **Covers:** AC-026, AC-010 (the U-08 exception)
- **Do:**
  - `detail.ts` `nextStepView()` and `rows.ts` `rowOf()` set `quiet: true` while T-003 gives the group view and the case
    is `NS-6-returned`. It lives on `NextStepView` and `OverviewRow`, not on `nextStep()` or `stepView()` (0028
    snapshots). Guards change with it.
  - `SendButton` gains `look: 'primary' | 'secondary'` (default primary) for both parts.
  - `NextStep.tsx` and `SpecRow` (first Now row) pass `secondary` while `quiet`.
  - Tests:
    - `core/board/quiet0025.test.ts` "0025 AC-026 …" (`fs-partial-return` quiet; both notes not quiet).
    - `SendButton.test.tsx` secondary look.
    - `primaryButtons.test.tsx` "0025 AC-026 …": detail and first Now row with and without Send offered, no primary
      under U-08, primary again under U-05.
- **Verify:** `npm run test:unit` — red first (primary rendered under U-08), then green.
- [x] **Verified (T-004):** 2026-11-19. Red: `npx vitest run src/core/board/quiet0025.test.ts src/webview/ui/SendButton.test.tsx` 2 failed (no `quiet`, no secondary look). Green: `npm run test:unit` 3318 + 26 timing passed; eslint, tsc ×2 clean. Stage 1 gate chain (2026-11-19): eslint, tsc ×2, test:unit (3318 + 26 timing), compile, compile-tests all green.
- **Notes:** `quiet?: true` lives on `NextStepView` and `OverviewRow` (guards accept only `true`; on a row only with a step); `nextStep()` and `stepView()` unchanged. `SendButton` secondary look: main part gets `copy-secondary`, arrow part `send-arrow-secondary` (theme variables). primaryButtons test covers detail and first Now row, with and without Send, quiet and not.

### T-005 — A step or ways target travels once

- **Covers:** AC-006 (a)
- **Do:**
  - `NavigationTarget` `spec` gains `step?: string` or `ways?: true` (never both). The `shell` event payload gains
    `focus?: { n, stem, path?, step? | ways? }`, where neither field means "the map's heading". Guards change, and
    `PROTOCOL_VERSION` goes from 8 to 9.
  - `shellService`:
    - `navigate()` stores `target` without step/ways and keeps the focus pending with a counter `n`.
    - New `panelReady()` and `panelGone()`.
    - `shellEvent()` returns `{ view, focus? }`, attaching the pending focus only while ready, then dropping it. A
      navigation with a focus forces one push even when the view is unchanged.
  - `studioPanel.ts` (thin) calls `panelReady()` in `hello` and `panelGone()` on dispose, and pushes `shellEvent()`.
  - The webview `shell.tsx` keeps the last `focus` with its `n`.
  - Tests:
    - `shellService.navigation.test.ts` "0025 AC-006 (a) …" (fake panel and shell ports): exactly one message; the first
      after `hello` when the activation opened the panel; none after a model update, a reloaded panel's `hello` or an
      area change; two activations give two.
    - `messages.test.ts` (guard, version).
- **Verify:** `npx vitest run src/core/shell/shellService.navigation.test.ts src/shared/protocol/messages.test.ts` red
  (no `focus`), then `npm run test:unit` and `npm run compile` green.
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — The Plan map applies a target

- **Covers:** AC-001 (map side), AC-003 (finished stage), AC-006 (b), AC-017 (highlight), §7 rows 1–2
- **Do:**
  - New `areas/planMap/target.ts` remembers the last applied `n`. A focus applies on the first render that shows its spec,
    and waits until then.
  - `Stages`:
    - Expands the step's first card (first stage line). A finished stage holding it shows its cards (`openFinished`,
      gone on remount: another spec or a new showing).
    - Calls `scrollIntoView({ block: 'nearest' })`, focuses the card's toggle and sets `data-highlight` for 1500 ms.
      The timer clears on unmount and holds through model updates while the card exists.
    - A dropped step gets its card. A gone step focuses the heading with no highlight. A focus with neither step nor
      ways focuses the heading.
  - CSS: `.step-card[data-highlight]` outline 2 px `var(--vscode-focusBorder)` (High Contrast:
    `--vscode-contrastActiveBorder`), transition ≤ 150 ms, none under reduced motion.
  - Tests:
    - New `PlanMap.target.test.tsx` "0025 AC-006 (b) …", "0025 AC-001 …" (fake timers, stubbed `scrollIntoView`),
      "0025 AC-003 …" (finished stage), and §7 (gone step, update during the highlight).
    - `webviewCss.test.ts` "0025 AC-017 … highlight".
- **Verify:** `npx vitest run src/webview/areas/planMap/PlanMap.target.test.tsx src/adapters/node/webviewCss.test.ts` red
  (a focus changes nothing), then `npm run test:unit` green.
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — Step links in the side panel and finished stages

- **Covers:** AC-001, AC-002, AC-003, AC-004
- **Do:**
  - New `ui/StepLink.tsx`. The stub renders today's `FileLink`.
  - Behaviour:
    - Click, Enter or Space without Ctrl/Cmd sends `shell.navigate({ area: 'planMap', target: { kind: 'spec', stem,
      path?, step } })`.
    - With Ctrl or Cmd it sends 0019's open request (`onOpen(plan, line)`). Keydown Enter/Space with a modifier is
      handled and `preventDefault`ed.
    - Tooltip and description: the name, `\n`, U-02 (`stepLinkTooltip(id, mac)` in `planMapTexts.ts`). `mac` comes
      from `navigator.platform` / `userAgent` containing `Mac`, stubbed in tests. The accessible name is unchanged.
  - Placement:
    - `StepChip` uses `StepLink` (the Plan section and map show only map-able specs).
    - `Progress`' next open step uses `StepLink` while the detail's plan is a plan and the state is not Done. Otherwise
      it keeps `FileLink` (0019 AC-017).
  - Tests:
    - `StepLink.test.tsx` "0025 AC-002 …", "0025 AC-004 …" (both platforms).
    - `PlanSection.test.tsx`, `SpecDetail.test.tsx`, `PlanMap.test.tsx`, `Keyboard.test.tsx` "0025 AC-001 …",
      "0025 AC-003 …": one navigation request, no open request, selection unchanged; not map-able keeps 0019.
  - Retarget the 0019 AC-017 and 0023 AC-004 chip tests (`Notes:`).
- **Verify:** `npm run test:unit` — red first (stub opens the file), then green.
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — Step IDs in Next steps and Overview rows are links

- **Covers:** AC-027
- **Do:**
  - New `core/board/stepLinks.ts`. For a map-able spec (not Done, readable sibling plan), a line's step is the first
    `\bT-\d+\b` of its intent that is a plan step: `{ id, open }`.
  - `NextStepLineView.step?` in `detail.ts`. `OverviewRow.link?` sits beside `step`, so `StepView` and `nextStep()` stay
    byte-identical (0028 AC-010).
  - The shared `splitAtId(text, id)` sits beside `stepView.ts`.
  - Webview:
    - `NextStep.tsx` renders the ID as a `StepLink`, and `StepText` takes an optional link for the short form.
    - `SpecRow` (groups `now` and `upNext`): the step text leaves the `Drill` button as a sibling in grid area `step`
      (`.ov-row-item > .step-text`, `pointer-events: none` except on the link, so a click elsewhere still selects).
    - A link in another spec's row selects that spec (the navigate target does, PD-042).
  - Board cards, tree, quick pick and Problems rows stay plain.
  - Tests:
    - `stepLinks.test.ts` "0025 AC-027 …" (map-able or not, no-notes variant).
    - New `Overview.stepLinks.test.tsx` "0025 AC-027 …": a click on `T-003` in `Continue · Implement T-003` gives one
      navigate, no drill activation; Ctrl gives the open request; tooltip; not map-able is plain.
    - `SpecDetail.test.tsx` (intent link).
    - `webviewCss.test.ts` (row area, all three container widths).
  - Existing Board and tree tests stay green.
- **Verify:** `npm run test:unit` — red first (StepText ignores the link, ID plain), then green.
- [ ] **Verified (T-008):** —
- **Notes:** —

### T-009 — The Plan map header carries the next step

- **Covers:** AC-009, AC-010
- **Do:**
  - New `areas/planMap/shows.ts` `mapShows(detail, selection)` (plan kind `plan`, not Done, same stem and path), used by
    `PlanMap` and `SidePanel`.
  - `Header` renders `<number> <title>` with the Problem mark, then `NextStep` from `shown.nextStep`, then the count,
    `Open plan` and M-02.
    - `NextStep` gets `place: 'detail' | 'map'`; `map` never shows U-06.
    - The stub `place="map"` renders nothing.
  - `SpecDetail` gets `withNextStep={false}` exactly while `area === 'planMap'` and `mapShows`. Otherwise, as with a
    state text or a pending detail, the side panel keeps it.
  - Tests:
    - New `PlanMap.header.test.tsx` "0025 AC-009 …":
      - Each fixture spec: the header's order holds, with no U-06.
      - 0028's all-ticked tip-splitter `caseFixtures` with plan `In Progress`: the first line equals `nextStep()`'s
        (`/sdd-compile`).
      - Below 900 px (stubbed query).
      - No plan: M-13 in the map, `Write the plan` in the side panel.
    - `SidePanel.test.tsx` (no Next step section while the header shows).
    - `primaryButtons.test.tsx` "0025 AC-010 …": map with side panel, at most one primary; exactly one with a line and
      no U-08.
- **Verify:** `npm run test:unit` — red first (stub header, side panel duplicates), then green.
- [ ] **Verified (T-009):** —
- **Notes:** —

### T-010 — The parallel hint and the ways target

- **Covers:** AC-016
- **Do:**
  - `detail.ts` sets `NextStepView.parallel?: { stage }` while `planOf`'s current stage has ways.
  - New `detail/ParallelHint.tsx`. The stub renders nothing.
    - It shows U-06 after line 1's coach line (tips off: after its Copy prompt and status region) and before line 2, for
      `place="detail"` only.
    - `Ways to run it` navigates with `{ kind: 'spec', stem, path?, ways: true }`.
  - Texts `parallelHintText(n)` and `WAYS_TO_RUN_IT_LABEL` go in `planMapTexts.ts`.
  - `Ways` takes `open` from `Stages` for a ways focus (expanded, `scrollIntoView`, focus on `Ways to run stage <n>`,
    highlight as T-006).
  - Tests:
    - `ParallelHint.test.tsx` and `SpecDetail.test.tsx` "0025 AC-016 …": no-notes `Stage 2 can run in parallel · Ways to
      run it`; both notes none; tips off; no Now row, card, tree item or map header shows it.
    - `PlanMap.target.test.tsx` (ways target).
- **Verify:** `npm run test:unit` — red first (stub hint, ways closed), then green.
- [ ] **Verified (T-010):** —
- **Notes:** —

### T-011 — Richer cards

- **Covers:** AC-007, AC-008, AC-017 (card row, title), AC-010 (card Copies secondary)
- **Files:** `src/core/planMap/planMap.ts`, `src/core/planMap/cardRows0025.test.ts`, `src/shared/protocol/planMap.ts`,
  `src/shared/protocol/planMap.test.ts`, `src/shared/protocol/planMapTexts.ts`, `src/webview/areas/planMap/StepCard.tsx`,
  `src/webview/areas/planMap/StepCard.test.tsx`, `src/webview/main.css`, `src/adapters/node/webviewCss.test.ts`
- **Do:**
  - `PlanStepView` gains:
    - `verified?: { short, full }` for a done step.
    - `reported?` from its note's `Verified:`.
    - `covers[].state?`: the trimmed `State` of exactly one traceability row whose cell (`CRITERION_CELL`) is the ID and
      whose word is exactly `verified`, `built` or `open`.
    - `copy?`: `nextStep()`'s first line while it is `Implement <ID> of …` for this step and no note lies.
  - Guards change with these fields.
  - `StepCard` rows follow §5.2's order (labels `VERIFIED_LABEL`, `REPORTED_LABEL`). A secondary Copy prompt goes after
    `Open in plan` in the expanded part. The toggle gets `title` `<ID> <title>`.
  - CSS: `.plan-group { align-items: start }`, and `.step-card-title` gets `-webkit-line-clamp: 2`.
  - Tests:
    - `cardRows0025.test.ts` "0025 AC-007 …", "0025 AC-008 …" (both notes, no-notes).
    - `StepCard.test.tsx` (rows and literal texts, only T-003 copies, Copy secondary).
    - `webviewCss.test.ts` "0025 AC-017 … card row".
- **Verify:** `npx vitest run src/core/planMap/cardRows0025.test.ts src/webview/areas/planMap/StepCard.test.tsx src/adapters/node/webviewCss.test.ts`
  — red first (fields absent), then green; the gates run on the combined result before the tick.
- [ ] **Verified (T-011):** —
- **Notes:** —

### T-012 — Show in Plan Map in the tree

- **Covers:** AC-005
- **Files:** `package.json`, `src/core/shell/specTree.ts`, `src/core/shell/treeActions.ts`,
  `src/core/shell/showInPlanMap0025.test.ts`, `src/adapters/vscode/studioTree.ts`, `src/adapters/vscode/studioTree.test.ts`,
  `src/adapters/vscode/manifest.test.ts`, `src/extension.ts`, `src/test/shell.smoke.test.ts`
- **Do:**
  - Manifest: command `featherspec-studio.tree.showInPlanMap` titled U-03, `commandPalette` `when: false`, in
    `view/item/context` as `spec@0` with `viewItem =~ /\bmap\b/`.
  - `contextValueOf()` appends `map` exactly for a map-able spec.
  - `treeActions.showInPlanMap(row)`:
    - Opens a closed panel (`shell.open({ via: 'start' })`).
    - Navigates `planMap` with the first step ID a line of the spec's next step names (`stepLinks.ts`). With none it
      sends the spec alone (heading focus).
    - Then calls `panel.show({ preserveFocus: false })`.
  - Host smoke: one thin test. The command exists and runs on a fixture row, with waits up to 20 s that name what they
    wait for.
  - Tests:
    - `showInPlanMap0025.test.ts` "0025 AC-005 …" (fake panel and shell ports; contextValue table).
    - `manifest.test.ts`, `studioTree.test.ts`.
- **Verify:** `npx vitest run src/core/shell/showInPlanMap0025.test.ts src/adapters/vscode/studioTree.test.ts src/adapters/vscode/manifest.test.ts`
  — red first (no command, no `map`), then green, plus `npm run compile`; host smoke by the orchestrator in T-015.
- [ ] **Verified (T-012):** —
- **Notes:** —

### T-013 — Freshness, no writes, user language

- **Covers:** AC-011, AC-018, AC-019
- **Do:** tests only.
  - New `PlanMap0025.timing.test.tsx`: within `BUDGET_MS.uiFreshness` of the model-changed notification, the header's
    next step, every percentage and U-05/U-08 show the new state. Focus follows 0023 AC-012. The last tick makes the
    header's first line `nextStep()`'s.
  - `noWrite` tests (`core/board`, `core/copyNextStep`) "0025 AC-018 …": step links, the tree command, card Copy, the
    header and the hint link write nothing, start nothing and change no setting, also in Restricted Mode and a reader
    window.
  - `userLanguage.test.tsx` "0025 AC-019 …": the header, card rows, U-05, U-06 and U-08 contain no rule ID, `NS-`,
    `traceability`, `struck` or `stem`.
  - Each new file gets a negative control (one forbidden word or a skipped update gives red).
- **Verify:** `npx vitest run --project timing-webview src/webview/areas/planMap/PlanMap0025.timing.test.tsx` and
  `npx vitest run src/core/board/noWrite.test.ts src/core/copyNextStep/noWrite.test.ts src/webview/userLanguage.test.tsx`
  green; negative controls red, then restored.
- [ ] **Verified (T-013):** —
- **Notes:** —

### T-014 — Preview at two widths and three themes

- **Covers:** AC-022
- **Do:**
  - The orchestrator's harness (`/home/claude/orch/preview/run.sh`) runs Dark, Light and High Contrast at 1600 px and
    1000 px, with the side panel open at its default width.
  - Fixtures: `fs110-parallel-synthetic` (each variant), `fs-partial-return`, `studio-0015`.
  - Screenshots and verdict go in `Notes:`.
- **Verify:** manual: the orchestrator looks for cut text in the header next step, card rows, percentages, U-05, U-06
  and U-08. He also checks that motifs are told apart without colour, that the highlight is visible, that a `‖`
  neighbour keeps its height and that the 1000 px map shows the header's next step. jsdom has no layout engine.
- [ ] **Verified (T-014):** —
- **Notes:** —

### T-015 — §4 notes, docs, title audit and final gates

- **Covers:** AC-020, AC-021, AC-023 (record), AC-024 (into the checklist), and it re-proves AC-001…AC-019 and AC-025…AC-027
- **Do:**
  - §4's notes: "*Amended by 0025 (PD-082): …*" under each named statement. No PD row is edited.
  - `.claude/rules/ux-guidelines.md` guidelines 5 and 11 literally as §4 says.
  - `docs/product/ux-guidelines.md` rows `5 (2026-11-19)` and `11 (2026-11-19)`.
  - `README.md` *Plan map* section: `Show in Plan Map`, `Ctrl+click`, `4 of 6 done · 67%`, `Next step`. Remove any
    `<digit> %`.
  - `CHANGELOG.md` `[0.1.0]`: `Show in Plan Map`, `4 of 6 done · 67%`.
  - `docs/release-checklist.md` section 0025 with AC-022…AC-024 (AC-023 as run by 13).
  - `docsScan.test.ts` "0025 AC-021 …".
  - Title audit by 0021's method (`describe`/`it`/`test` literals under `src`, Baseline by `git archive`). Every missing
    title goes in `Notes:` with the changed statement or the head title that replaces it.
  - `/sdd-architecture-update` entries:
    - `AGENTS.md` `shared:` line: adds "step look, percentages".
    - `.architecture/core.md`:
      - The `planMap` line: the returned-work statement `returnedWork.ts`, card rows, card copy.
      - The `shell` line: the one-shot focus.
      - `board/stepLinks.ts`.
    - `.architecture/webview.md`:
      - The `ui/` line: `StepLink`, `StepIcon`.
      - The areas line: Plan map target, highlight, header next step.
      - The Overview-rows sentence: the step text is beside the row button, with a step link.
  - Memory Bank: `techContext.md` *Test* line for 0025, and `activeContext.md`.
- **Verify:** quality gates 1–5 in order, zero warnings; `npm test` on Windows and CI by the orchestrator, result here.
- [ ] **Verified (T-015):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-006, T-007 | — | — | open |
| AC-002 | T-007 | — | — | open |
| AC-003 | T-006, T-007 | — | — | open |
| AC-004 | T-007 | — | — | open |
| AC-005 | T-012 | — | — | open |
| AC-006 | T-005, T-006 | — | — | open |
| AC-007 | T-011 | — | — | open |
| AC-008 | T-011 | — | — | open |
| AC-009 | T-009 | — | — | open |
| AC-010 | T-004, T-009, T-011 | — | — | open |
| AC-011 | T-013 | — | — | open |
| AC-012 | T-001 | — | — | open |
| AC-013 | T-001 | — | — | open |
| AC-014 | T-002 | — | — | open |
| AC-015 | T-003 | — | — | open |
| AC-016 | T-010 | — | — | open |
| AC-017 | T-006, T-011 | — | — | open |
| AC-018 | T-013 | — | — | open |
| AC-019 | T-013 (each step asserts its texts literally) | — | — | open |
| AC-020 | T-015 | — | — | open |
| AC-021 | T-015 | — | — | open |
| AC-022 | T-014 | — | manual: orchestrator, preview harness, then Gregor | open |
| AC-023 | T-015 (record) | — | manual: Gregor, click test 2026-11-19 (13), tasks 1–3 | open |
| AC-024 | T-015 (checklist) | — | manual: Gregor on `tip-splitter`, before the spec closes | open |
| AC-025 | T-003 | — | — | open |
| AC-026 | T-004 | — | — | open |
| AC-027 | T-008 | — | — | open |

## Session handoff

- **Done so far:** plan written. Spec revised (2026-11-19): OP-001's rest decided (12 D2-6), Overview tooltip `%` (PD-085).
- **Next action:**
  1. Review the plan.
  2. After 0028 is done, on the start signal, move the pair to `active/` (`/sdd-lifecycle`) and set the Baseline.
  3. Then T-001.
- **Open decisions:** none. If 0028's final surfaces differ from its plan, see *Research*, assumption.
- **Baseline:** `b8e41c7` (commit before the first step commit)
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
