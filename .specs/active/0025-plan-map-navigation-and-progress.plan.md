# Plan — Plan Map Navigation and Progress Clarity

**Spec:** [0025-plan-map-navigation-and-progress.md](0025-plan-map-navigation-and-progress.md)
**Status:** In Progress
**Last updated:** 2026-11-19
**Current step:** T-014 (orchestrator's preview; T-001…T-013 and T-015 are done)

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
- [x] **Verified (T-005):** 2026-11-19. Red: `npx vitest run src/core/shell/shellService.navigation.test.ts src/shared/protocol/messages.test.ts` 7 failed (no shellEvent/panelReady, version 8). Green: same files plus src/core/shell, src/shared/protocol, src/adapters, src/webview, tsc ×2 clean. Full chain at the end of stage 2.
- **Notes:** Proxy decisions: a spec target aims by exactly one of `step`, `ways` or `heading` (new, for the tree's spec-alone case: heading focus); a plain spec target (Overview drill) carries no focus. `shellEvent()` replaces `view()` in the panel's push; `open()` and `panelGone()` drop a pending focus. The client snapshot keeps the last focus (`focus`, same object until the host sends another). `v:` literals in tests moved 8 to 9, 'other version' literals 9 to 10.

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
- [x] **Verified (T-006):** 2026-11-19. Red: `npx vitest run src/webview/areas/planMap/PlanMap.target.test.tsx` 7 failed (a focus changed nothing). Green: src/webview/areas/planMap and src/adapters/node/webviewCss.test.ts 161 passed; tsc ×2 clean. Full chain at the end of stage 2.
- **Notes:** AC-006 (b) ways targets are applied in T-010 (the ways block does not exist as a controlled component yet). `target.ts` keeps the last applied n at module level (so a remount of the map, another area and back, or a model update never re-applies); a target for a spec that is not shown stays in the client snapshot and applies on the first render that shows it (risk accepted: a later manual selection of that spec would also apply it once). Reduced motion: the global `* { transition: none !important }` rule covers the highlight (the CSS guard forbids map rules inside media queries).

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
- [x] **Verified (T-007):** 2026-11-19. Red: StepLink stub (FileLink) failed the AC-001 and AC-004 tests (2 failed). Green: src/webview 672 passed, tsc ×2 clean. Stage 2 gate chain (2026-11-19): eslint, tsc ×2, test:unit (3342 + 26 timing), compile, compile-tests all green.
- **Notes:** FileLink got an optional `activate` (tooltip, onPlain): plain click, Enter and Space call it; Ctrl or Cmd opens the file (keyboard with a modifier is handled on keydown, a mouse click by `detail > 0`, so a browser-synthesised click is not counted twice). `StepLink` reads the selection from the shell for the navigation target; the name in the tooltip is the chip name (chips) or `<ID> <title>` (Progress). Progress gets `mapable` from SpecDetail (plan is a plan and state is not Done). Retargeted by title: 0023 AC-004 chip tests (tooltip U-02; open request now with Ctrl via new `ctrlClick` test helper).

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
- [x] **Verified (T-008):** 2026-11-19. Red: `npx vitest run src/core/board/stepLinks.test.ts` 4 failed against the stub (Not implemented, no `step`/`link`). Green: src/core, src/shared, src/webview and webviewCss.test.ts passed; eslint, tsc ×2 clean. Full chain at the end of stage 3.
- **Notes:** `StepLinkView {id, open}` and `splitAtId` live in `shared/protocol/stepView.ts` (guard `isStepLinkView`); `NextStepLineView.step?` links the ID in the line's intent (the prompt line stays plain), `OverviewRow.link?` the ID in `step.short` (guard: only with a step). `stepView()` and `nextStep()` untouched (baseline tests green). `StepLink` takes an optional `spec` (the row's spec, so another spec's row selects it by the navigate target); `StepText` takes an optional `link`. `SpecRow` renders the step text as a sibling after the row button; the retargeted 0018 AC-006 tests now read the step text beside the button (accessible name of the row button no longer holds the step text; Copy stays the next Tab stop after the link). Navigating leaves the Overview at once (the client switches the area), so tests use one activation per mount. CSS: `.ov-row-item > .step-text` (grid area step, `pointer-events: none`, link `auto`, 12 px left inset in the narrow layout); the selected-row colour follows with `.ov-row[aria-current] + .step-text`.

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
- [x] **Verified (T-009):** 2026-11-19. Red: `npx vitest run src/webview/areas/planMap/PlanMap.header.test.tsx` 5 failed against the `place="map"` stub (header showed no next step). Green: src/webview, header0025.test.ts and webviewCss.test.ts passed; eslint, tsc ×2 clean. Full chain at the end of stage 3.
- **Notes:** `mapShows()` in `areas/planMap/shows.ts` (used by `PlanMap` and `SidePanel`). `SpecDetail` takes `withNextStep` (false exactly while area is `planMap` and `mapShows`). The webview may not import `core` (lint boundary), so the "each fixture spec" part is split: `core/board/header0025.test.ts` proves the detail's first line equals `nextStep()`'s on the three fixtures and the all-ticked splitter plan gives `/sdd-compile`; `PlanMap.header.test.tsx` renders static views (one line, two lines, tips, verify, Problem mark, narrow, no plan). `NextStep`'s `place` prop is accepted and read in T-010 (U-06 for `detail` only; no U-06 exists yet). Retargeted by title: 0023 AC-010 (PlanMap.test, primaryButtons.test): the one primary now sits in the map header, the side panel has none; the map's secondary Copies are 4 (the header's second line). New primaryButtons AC-010 tests: one primary with a line (with and without Send), none while quiet.

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
- [x] **Verified (T-010):** 2026-11-19. Red: stub `ParallelHint` (renders nothing) failed the two SpecDetail AC-016 tests; ways target tests failed before `Ways` took a target. Green: src/webview, src/shared, webviewCss.test.ts, parallel0025.test.ts passed; eslint, tsc ×2 clean. Stage 3 gate chain (2026-11-19): eslint, tsc ×2, test:unit (3382 + 26 timing), compile, compile-tests all green.
- **Notes:** `NextStepView.parallel?: {stage}` set while a stage of the plan view has ways (so never under a return note); guard accepts only a positive integer `stage`. `ParallelHint` (button `file-link` in `p.parallel-hint`) sits in line 1's `li` after the coach line (tips off: after the Copy/Send action), `place="map"` never renders it. Ways target: `Stages` passes `{n}` to the `Ways` of the current stage; `Ways` opens, scrolls, focuses its toggle and sets `data-highlight` (1500 ms; CSS rule shared with the card). Without a ways block the heading takes focus. Retargeted by title: 0023 AC-010/AC-015 and 0024 AC-002/AC-003 bundle tests over the fixtures (`webviewBundle.test.ts`): below the header no primary and no Send control, the header holds at most one primary and one Send control (0025 AC-010).

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
- [x] **Verified (T-011):** 2026-11-19. Red: `npx vitest run src/webview/areas/planMap/StepCard.test.tsx` 5 failed against the old card (no Verified, Reported, state word, Copy prompt, tooltip); core rows were added before their test and are asserted by `cardRows0025.test.ts` (8 passed). Green: src/webview, src/core, src/shared, webviewCss.test.ts and webviewBundle.test.ts passed; eslint, tsc ×2 clean. Full chain at the end of stage 4.
- **Notes:** `PlanStepView` gains `verified`, `reported` (both `{short, full}`), `copy` and `covers[].state`; `CRITERION_CELL` is exported from `situation.ts` and shared with the card rows. `verified` only for a done step, `reported` only for a returned step with a parsed note; placeholder values (`—`) give no row. `copy` is `nextStep()`'s first line while it is `Implement <ID> of …` and no note lies. Row order in the card: Verified, returned line, Reported, Files, Covers (each ID followed by its word), then in the expanded part Open in plan, Copy prompt (secondary, roving tab stop like the links), Do, Verify. The toggle is a flex row so the title clamps to two lines (`-webkit-line-clamp: 2`) beside the ID; the card tooltip is `<ID> <title>`. `CardLinks` gained `copyResult`, `onCopy`. New file `StepCard.test.tsx` (none existed).

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
- [x] **Verified (T-012):** 2026-11-19. Red: `npx vitest run src/core/shell/showInPlanMap0025.test.ts` 5 failed (no `map` in contextValue, no `mapStep`, `showInPlanMap` stub threw Not implemented). Green: src/core/shell, src/adapters/vscode passed; eslint, tsc ×2 clean; `npm run compile` green. Host smoke (`shell.smoke.test.ts`) written, run by the orchestrator in T-015. Stage 4 gate chain (2026-11-19): eslint, tsc ×2, test:unit (3405 + 26 timing), compile, compile-tests all green.
- **Notes:** `ShellService` gained a public `navigate(request)` (the handler's function; `treeActions.test.ts` got `navigate` in its fake). `SpecRowModel.mapStep` is the first plan step ID named by a line of the spec's next step (intent plus prompt, `stepLinkOf`); `contextValue` names `map` for a spec that is not Done with a parsed plan (an unreadable plan is not map-able). `showInPlanMap` opens a closed panel, navigates `planMap` with `step` (none: `heading`), then `panel.show({ preserveFocus: false })`. Retargeted by title: 0018 AC-001, 0020 AC-011, AC-008 (manifest) and 0020 AC-006 (contextValue `spec step plan map`).

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
- [x] **Verified (T-013):** 2026-11-19. Tests only, written after the code they check (all green at the first run): `npx vitest run --project timing-webview src/webview/areas/planMap/PlanMap0025.timing.test.tsx` 2 passed; `npx vitest run src/core/board/noWrite.test.ts src/core/copyNextStep/noWrite.test.ts src/webview/userLanguage.test.tsx` passed; eslint, tsc ×2 clean. Negative controls are in the files (timing: no update keeps the old state; noWrite: a forbidden call pattern; userLanguage: the forbidden words). Full chain at the end of stage 5.
- **Notes:** Freshness is asserted for the header's next step and percentage (`BUDGET_MS.uiFreshness`); the returned-work sentence is not in the header (it sits in the Plan section, Progress and stage rows), its freshness is covered by 0023 AC-012's timing. Restricted Mode and a reader window: no host API of the new paths can differ there, shown by the static source scan (no file API, no configuration update, no process) plus the temp-copy tests; the host smoke test of T-012 runs in the orchestrator's host.

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
- [ ] **Verified (T-014):** — (open: the preview harness is the orchestrator's; nothing to build here)
- **Notes:** The built webview (`dist/webview`) carries stages 1 to 5; run `/home/claude/orch/preview/run.sh` on `fs110-parallel-synthetic` (each variant), `fs-partial-return` and `studio-0015`, record screenshots and the verdict here, then tick. Items to look at: cut text in the header next step, card rows (the title now clamps to two lines beside the ID in a flex toggle), percentages, U-05, U-06, U-08; the motifs without colour; the highlight in each theme; a `‖` neighbour's height next to an expanded card; the 1000 px map showing the header's next step; an Overview row's step text beside the row button (narrow layout keeps a 12 px inset).

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
- [x] **Verified (T-015):** 2026-11-19. Gates in order, zero warnings: `npx eslint src --max-warnings 0`, `npx tsc --noEmit`, `npx tsc --noEmit -p src/webview`, `npm run test:unit` (3416 + 28 timing passed), `npm run compile`, `npm run compile-tests`. Red first for AC-021: the checklist-order test in `docsScan.test.ts` failed until its list took the 0025 section, and `activeContext.md` limits failed until Changed Recently held three lines. `npm test` (Windows, CI) and the host smoke test: the orchestrator's run, result to be recorded here.
- **Notes:** §4's notes: one "*Amended by 0025 (PD-082): …*" under each named statement of 0023, 0019, 0021, 0017, 0022, 0024, 0020, 0018, 0015, 0016, 0005, 0006 and 0013 (test-audit notes on each AC listed in §4's last row); no PD row edited. `.claude/rules/ux-guidelines.md` 5 and 11 read as §4 says; `docs/product/ux-guidelines.md` rows `5 (2026-11-19)` and `11 (2026-11-19)`; README *Plan map* section, CHANGELOG `[0.1.0]` and the checklist section 0025 (AC-022…AC-024) written; `docsScan.test.ts` "0025 AC-021 …". AC-023: recorded in the checklist and spec (run 2026-11-19 by 13, tasks 1–3; K-1 became AC-027, the rest is AC-024). Title audit (Baseline `b8e41c7`, 3169 titles, 5 missing): `manifest.test.ts` "AC-008 (0020): the context menu offers Open Spec, Open Plan only … in this order; groups get no entry" → head title now "AC-008 (0020), 0025 AC-005: the context menu offers Show in Plan Map first for a row that names map, Open Spec, …" (statement changed by §4 row 17); `specTree.test.ts` "the figures show steps and criteria joined by a dot, the contextValue names step and plan" → "… names step, plan and map (0025)" (contextValue gained `map`); `PlanMap.test.tsx` "the map renders no primary button, with the ways open" → "… no primary button below its header, with the ways open" (§4 row 8); `PlanSection.test.tsx` "activating a chip sends the open request for the plan at the heading line of its step; a not-found chip is no button" → "activating a chip with Ctrl sends the open request …" and "0025 AC-001: a plain activation of a chip sends one navigation request …" (§4 row 1); `primaryButtons.test.tsx` "with a selected spec the view has one primary button, the first line of the side panel, and the map holds only secondary and icon Copies" → "… the first line of the map header (0025 AC-010) …" (§4 row 8). `/sdd-architecture-update` entries: `AGENTS.md` shared line (step look, percentages) and snapshot date, `.architecture/core.md` (planMap, shell, board), `.architecture/webview.md` (areas, `ui/`, Overview row), Memory Bank `techContext.md` Test line and `activeContext.md` (Changed Recently kept at three lines; the 0024 fix-round line left it, its detail is in 0024's plan).

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-006, T-007 | PlanMap.tsx:Stages, StepLink.tsx | PlanMap.target.test.tsx, StepLink.test.tsx, PlanSection.test.tsx | verified |
| AC-002 | T-007 | StepLink.tsx, FileLink.tsx | StepLink.test.tsx | verified |
| AC-003 | T-006, T-007 | PlanMap.tsx:Stages, Progress.tsx | PlanMap.target.test.tsx, SpecDetail.test.tsx | verified |
| AC-004 | T-007 | StepLink.tsx, planMapTexts.ts:stepLinkTooltip | StepLink.test.tsx | verified |
| AC-005 | T-012 | package.json, specTree.ts:contextValueOf/mapStepOf, treeActions.ts:showInPlanMap, extension.ts | showInPlanMap0025.test.ts, manifest.test.ts, shell.smoke.test.ts (host) | verified |
| AC-006 | T-005, T-006 | shellService.ts:shellEvent, target.ts, PlanMap.tsx | shellService.navigation.test.ts, PlanMap.target.test.tsx (ways part too) | verified |
| AC-007 | T-011 | planMap.ts:stepView, StepCard.tsx | cardRows0025.test.ts, StepCard.test.tsx | verified |
| AC-008 | T-011 | planMap.ts:copyOf, StepCard.tsx | cardRows0025.test.ts, StepCard.test.tsx | verified |
| AC-009 | T-009 | areas/planMap/shows.ts, PlanMap.tsx:Header, SpecDetail.tsx | PlanMap.header.test.tsx, header0025.test.ts | verified |
| AC-010 | T-004, T-009, T-011 | SendButton.tsx, NextStep.tsx, shows.ts, StepCard.tsx (card Copies secondary) | primaryButtons.test.tsx, StepCard.test.tsx | verified |
| AC-011 | T-013 | areas/planMap/PlanMap.tsx:Header | PlanMap0025.timing.test.tsx | verified |
| AC-012 | T-001 | shared/protocol/percent.ts | percent.test.ts | verified |
| AC-013 | T-001 | texts.ts, ProgressBar.tsx, figures.ts | progress0025.test.ts, ProgressBar.test.tsx | verified |
| AC-014 | T-002 | shared/protocol/stepLook.ts, board/icons.tsx:StepIcon | stepLook.test.ts, icons.test.tsx, PlanSection.test.tsx, PlanMap.test.tsx | verified |
| AC-015 | T-003 | core/planMap/returnedWork.ts | returnedWork.test.ts, PlanSection/SpecDetail/PlanMap tests | verified |
| AC-016 | T-010 | detail/ParallelHint.tsx, Ways.tsx, detail.ts:parallel | SpecDetail.test.tsx, parallel0025.test.ts, PlanMap.target.test.tsx, webviewCss.test.ts | verified |
| AC-017 | T-006, T-011 | main.css:.step-card[data-highlight], .plan-group, .step-card-title | webviewCss.test.ts, StepCard.test.tsx | verified |
| AC-018 | T-013 | stepLinks.ts, ParallelHint.tsx, treeActions.ts | copyNextStep/noWrite.test.ts, board/noWrite.test.ts | verified |
| AC-019 | T-013 (each step asserts its texts literally) | planMapTexts.ts | userLanguage.test.tsx | verified |
| AC-020 | T-015 | spec §4 notes in 0005, 0006, 0013, 0015…0024 | the retargeted tests, audit in T-015 Notes | verified |
| AC-021 | T-015 | README.md, CHANGELOG.md, docs/, .claude/rules/ux-guidelines.md | docsScan.test.ts | verified |
| AC-022 | T-014 | — | manual: orchestrator, preview harness, then Gregor | open |
| AC-023 | T-015 (record) | docs/release-checklist.md | manual: Gregor, click test 2026-11-19 (13), tasks 1–3 | built |
| AC-024 | T-015 (checklist) | docs/release-checklist.md | manual: Gregor on `tip-splitter`, before the spec closes | built |
| AC-025 | T-003 | core/planMap/returnedWork.ts | returnedWork.test.ts | verified |
| AC-026 | T-004 | returnedWork.ts:integrateIsQuiet, SendButton.tsx | quiet0025.test.ts, primaryButtons.test.tsx, SendButton.test.tsx | verified |
| AC-027 | T-008 | core/board/stepLinks.ts, NextStep.tsx, SpecRow.tsx, StepText.tsx | stepLinks.test.ts, Overview.stepLinks.test.tsx, SpecDetail.test.tsx, webviewCss.test.ts | verified |

## Session handoff

- **Done so far:** T-001…T-013 and T-015 built, verified and committed (one commit per step; stage gate chains green for stages 1 to 4; the final chain after T-015 green, 2026-11-19). Spec and plan are in `active/`, Baseline `b8e41c7`.
- **Next action:** T-014 (preview at two widths and three themes: the orchestrator, Notes of T-014 list what to look at), then `npm test` on Windows and CI (host smoke `AC-005 (0025)` in `shell.smoke.test.ts`), then Gregor's AC-023/AC-024 checks. Then `/sdd-compile`.
- **Open decisions:** none. Proxies recorded in the Notes of T-003, T-005, T-006, T-007, T-008 (step text beside the row button: the row button's accessible name no longer holds it), T-009 (core/webview split of the header test), T-012 (`ShellService.navigate` made public).
- **Where things are:** `core/board/stepLinks.ts`, `core/planMap/{returnedWork,stageLines}.ts`, `shared/protocol/{percent,stepLook}.ts`, `webview/ui/StepLink.tsx`, `webview/detail/ParallelHint.tsx`, `webview/areas/planMap/{target,shows}.ts`; the tree command in `core/shell/{specTree,treeActions}.ts` and `package.json`.
- **Baseline:** `b8e41c7`
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
