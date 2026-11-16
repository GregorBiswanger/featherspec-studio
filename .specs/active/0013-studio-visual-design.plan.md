# Plan — Studio Visual Design

**Spec:** [0013-studio-visual-design.md](0013-studio-visual-design.md)
**Status:** In Progress
**Last updated:** 2026-11-16
**Current step:** T-010 (awaiting Gregor's AC-017 verdict)

## Approach

Presentation only, in the existing webview: one `main.css` with a small token layer, a few shared
UI primitives (`src/webview/ui/`: state chip, rule text, progress bar, inline-text formatter) and
area-by-area restyling, each area judged by Gregor on screenshots before the next starts. The one
contract change is a reshape (no new data): `derivedLabel` → rule ID and the readiness string →
`{ id, reason }`, so every area can show the §3.5 sentence with the ID as secondary text. Order:
tokens and shared primitives first (every area builds on them), then Mission Control, Spec
Board, Spec Explorer detail, and states plus motion last. Memory Bank touched at the end:
`systemPatterns.md`, `techContext.md`, `activeContext.md`; `AGENTS.md` snapshot entries named in T-010.

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npx tsc --noEmit -p src/webview` ·
`npm run test:unit` · `npm run compile` (every step here: each one changes the bundle, and
`webviewBundle.test.ts` runs `node esbuild.js`). Pre-done, not here: `npm test` on CI, AC-017, AC-018.

**Visual check (manual, beside the gates, never instead):** `npm run compile`, then
`/home/claude/orch/preview/run.sh`; look at `/mnt/user-data/outputs/screens/<file>`. The harness lives
outside the repository and stays there.

## Research

- **Survey (2026-11-16).** UI: `src/webview` (React 19.3.1, plain CSS `src/webview/main.css`, 461 lines),
  data from `src/core/{shell,board,missionControl}` through `src/shared/protocol`. CSS guard:
  `src/adapters/node/webviewCss.test.ts` with `src/webview/testing/css.ts` (`parseRules` does not see
  `@media` context — T-001 extends it). Bundle end-to-end: `src/adapters/node/webviewBundle.test.ts` mounts
  `dist/webview/main.js` in jsdom with core-built snapshots of `test/fixtures/*`.
- **Already in the code (spec technical note corrected):** the core drops repeated leading IDs and list
  markers of requirements, criteria and stages (`src/core/board/idText.ts`, 0007 T-013). Mission Control
  already carries `derivedRule` (`StateCount`), a Total control and the diagnostics request. Section-level
  `open` targets exist (`DetailSections.*.open`).
- **Reshape (T-002), callers:** `CardView.derivedLabel`, `CardView.readiness` (`src/shared/protocol/board.ts`
  guard l.107/112), `SpecRow.derivedLabel` (`messages.ts` l.56/312), built in `src/core/board/cards.ts`
  and `src/core/shell/specRows.ts`. The 0003 lifecycle model keeps its own `derivedLabel` untouched
  (host smoke `src/test/lifecycle.smoke.test.ts` l.30 asserts it).
- **AC-016 — existing assertions this plan changes, all from §2's deltas:**
  delta 4 (sentences): `core/board/cards.test.ts` l.37–38, l.74; `core/shell/specRows.test.ts` l.46;
  `shared/protocol/messages.test.ts` l.27; `webview/board/SpecBoard.test.tsx` l.48–53, l.83–91, l.98;
  `webview/areas/areas.test.tsx` l.28, 87, 100, 158–159; `adapters/node/webviewBundle.test.ts` l.112;
  `webview/areas/missionControl/MissionControl.test.tsx` l.88–116 (derived label text).
  Delta 5 (header): `MissionControl.test.tsx` l.61–79. Delta 3 (Open file): `webview/detail/SpecDetail.test.tsx`
  l.150–158 (counts per section) and l.172–177 (the line of an item). Delta 1/2: none expected beyond these;
  any other red existing test is a stop, not an update.
- **Kept on purpose:** 0005 AC-023's visible marker `▸` on the selected row stays (not one of the five
  deltas); D-12 is fixed by fixed-width marker and no bold shift. `data-state` is taken by panel states
  (S1…S9) — state colour hooks use `data-board-state`.
- **AC-001 interpretation (assumption, Gregor may object):** own custom properties (`--fs-*`) are allowed
  only as aliases whose every definition is a `var(--vscode-*)` chain; the guard checks both the uses and
  the definitions. Inline `style` in TSX may carry only width/size, never a colour.
- **OP-1 (a)** decided by Gregor 2026-11-16, recorded in the spec: mark dragged card and the column under
  the pointer only; no verdict before the drop.
- **`/sdd-clarify` waived** by Gregor for this spec (presentation only, judged by screenshots) — one-off,
  recorded in the spec's §8.
- **Not in the harness yet (needed for AC-017):** shots at 900 px width, detail with Acceptance criteria
  collapsed, High Contrast for every area. Extending the harness is outside the repository (orchestrator).
- [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) — `charts.red/blue/yellow/green/purple`,
  `contrastBorder`, `contrastActiveBorder`, `focusBorder`, `badge.*`, `progressBar.background`,
  `textCodeBlock.background`, `textBlockQuote.*`, `textPreformat.*` all exist; retrieved 2026-11-16.
- [Webview API — theming](https://code.visualstudio.com/api/extension-guides/webview) — colours exposed as
  `--vscode-<id with dashes>`, body classes `vscode-light|dark|high-contrast`, `--vscode-editor-font-family`;
  test in all three kinds; retrieved 2026-11-16.
- [WAI-ARIA APG Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion) — header is a `button` as
  the only child of a heading, `aria-expanded`, `aria-controls` to the panel, Enter/Space toggle, Tab
  order unchanged (AC-012); retrieved 2026-11-16.
- [MDN dragleave](https://developer.mozilla.org/docs/Web/Events/dragleave) — fires when the drag leaves a
  drop target; it also fires when entering a child, so the column mark is set on `dragover` of the column
  and cleared on `drop`/`dragend` and on `dragleave` only when `relatedTarget` is outside the column
  (AC-011); retrieved 2026-11-16.
- [Accessible progressbar name](https://frontendchecklist.io/rules/accessibility/aria-progressbar-name) —
  `role="progressbar"` needs an accessible name plus `aria-valuemin/max/now` (AC-005, AC-009); retrieved 2026-11-16.

## Stages

1. T-001 → T-002 — base: tokens, full-height frame, state chip, rule sentences (look: 03 explorer list, nav)
2. T-003 → T-004 — Mission Control (look: 01-mission-control-*)
3. T-005 → T-006 — Spec Board (look: 02-spec-board-*)
4. T-007 → T-008 — Spec Explorer detail incl. safe inline Markdown (look: 04-spec-explorer-detail-0002-*)
5. T-009 → T-010 — states, Agent Center placeholder, motion; final gates and docs sync (look: all, 05–07)

No parallel stage: every stage edits `main.css` and its guard, and each area stage ends at Gregor's
screenshot verdict, which may adjust the shared tokens the next area uses.

## Steps

### T-001 — Token layer, full-height frame, state chip and the stylesheet guard

- **Covers:** AC-001, AC-003 (stylesheet half)
- **Do:** `main.css`: `--fs-*` aliases (state colours of §3.1, spacing, radius) defined only from `--vscode-*`;
  `.studio` as a full-height flex column, `main` with its own scroll, so an area can fill the height; HC
  border fallbacks on chips/tiles/cards/sections. `src/webview/ui/StateChip.tsx` (icon from
  `board/icons.tsx` + state name, `data-board-state`, tint on icon and border only). Extend
  `src/webview/testing/css.ts` to keep `@media` context; extend `webviewCss.test.ts`: every colour-bearing
  declaration resolves to `--vscode-*`/`currentColor`/`transparent`/`inherit`, every `--fs-*` definition is a
  `--vscode-*` chain, fonts only the two variables, no `@font-face`/`@import`, no outline removal; a Node
  test scans `src/webview/**/*.tsx` inline `style` for colour keys. Component test for StateChip
  (icon `aria-hidden`, text, colour hook). Use StateChip in the Explorer list rows.
- **Verify:** quality gates; manual beside them: preview, `03-spec-explorer-list-{dark,light}` — chips
  readable, no layout break in any area.
- [x] **Verified (T-001):** 2026-11-16 — red: `webviewCss.test.ts` 4 failing (no `--fs-*` definitions, no state mapping, no chip rules, no full-height frame), `StateChip.test.tsx` 7 failing (`Not implemented`); green: eslint, both `tsc`, `npm run test:unit` 88 files / 1285 tests, `npm run compile`. Looked at `03-spec-explorer-list-{dark,light,hc}`: two-line rows, number and title on one baseline, chips readable in all three, HC tabs boxed; MC and board unchanged, no break.
- **Notes:** `--fs-*` holds colour aliases only (Gregor 2026-11-16: every alias resolves only to `--vscode-*`), so spacing and radius stay plain lengths, no tokens. Area `h1` kept in the DOM, visually hidden (the nav already names the area, D-13). The AC-001 colour check was green on the old stylesheet too; its negative control is the residue/chain control test.

### T-002 — Rule sentences: reshape derived rule and readiness, show sentence + ID

- **Covers:** AC-010 (list rows, cards' marker text, Mission Control tiles' text source), AC-016 (delta-4 updates)
- **Do:** `CardView.derivedLabel` → `derivedRule: DerivedRule | undefined`, `CardView.readiness` →
  `{ id, reason } | undefined`, `SpecRow.derivedLabel` → `derivedRule` (guards in `board.ts`, `messages.ts`;
  builders `core/board/cards.ts`, `core/shell/specRows.ts` from the lifecycle entry's rule). Sentences of
  §3.5 in `src/shared/protocol/texts.ts` (`DERIVED_SENTENCES`); `mcDerived` uses them.
  `src/webview/ui/RuleText.tsx`: sentence primary, ID in `.rule-id` secondary. Used in list rows and on
  cards (marker line) now; tiles and Overview use it in T-003/T-008. Update the assertions listed in
  *Research* (delta 4), each in the same change set.
- **Verify:** quality gates (new RuleText test red first; the updated assertions red on the old shape, then green).
- [x] **Verified (T-002):** 2026-11-16 — red: 13 tests (new `RuleText.test.tsx` 2 on `Not implemented`/empty sentences; guard tests in `boardFilter.test.ts` and `messages.test.ts`; the delta-4 assertions of *Research* failing on the old `derivedLabel`/string shape); green: eslint, both `tsc`, `npm run test:unit` 89 files / 1287 tests, `npm run compile`. Looked at `03-spec-explorer-list-*`, `04-*-light` list and `02-spec-board-dark`: sentence primary, rule ID small and monospaced after it, row heights even; the card marker line wraps (card layout is T-006).
- **Notes:** also updated, same delta 4 (the shape change, not named in *Research*): the card literal in `shared/protocol/boardFilter.test.ts` l.94 and the two test builders `core/board/testing/cards.ts`, `webview/board/testing/views.ts`. New `isDerivedRule` in `shared/protocol/missionControl.ts` serves both guards.

### T-003 — Mission Control: stat tiles, distribution bar, progress

- **Covers:** AC-004, AC-005, AC-003 (tiles, Total)
- **Do:** `SpecFigures.tsx` → six tile buttons in board order (count, state name, StateChip icon, RuleText
  for Ready/Review/Blocked when the view carries the rule, Deprecated sub-count on Done) sending today's
  `stateRequest`; Total control kept; a segmented distribution bar
  (a labelled group of segments, each `aria-label="<state>: <count> of <total>"`, width = count ÷ total via
  inline `width` only); progress figure with `MC_FORMULA` as secondary line and `title`. CSS for tiles/bar.
  Tests in `MissionControl.test.tsx`: tile order and request, segment shares within 1 pp and names (the
  5/7 example), no segment for 0, formula visible and as tooltip, tiles are Tab stops.
- **Verify:** quality gates; manual: `01-mission-control-{dark,light}` — tiles and bar scan at a glance.
- [x] **Verified (T-003):** 2026-11-16 — red: 5 new tests in `MissionControl.test.tsx` (no `.mc-tile`, no `.mc-distribution`, no `title`/`.mc-formula`; the Tab-stop test was vacuously green until it asserted six tiles); green: eslint, both `tsc`, `npm run test:unit` 89 files / 1292 tests, `npm run compile`. Looked at `01-mission-control-{dark,light,hc}`: six tiles with tinted top edge and icon, zero counts dimmed, sentences wrap inside the tile, bar 5/1/7 in grey/purple/yellow; removed a max-width that left an unexplained right gap.
- **Notes:** the 0006 texts `[data-state-count]` row strings stay as T-002 left them (name, count, sentence inside one tile button). `Drill` gained optional `className` and `state` props.

### T-004 — Mission Control: header line, attention rows, side-by-side panels

- **Covers:** AC-006, AC-007, AC-003 (attention rows), AC-016 (delta 5)
- **Do:** `texts.ts` `mcDiagnostics(n, m)` → "`<n> project-level diagnostics · <m> specs with diagnostics`"
  (singular for 1); `Header.tsx` one quiet line. `Attention.tsx` rows: number chip, title, each reason as
  text with an icon (tint on icon only — fixes D-6). `RunSection.tsx` and `Activity.tsx` in a two-column
  grid under the attention list, stacked by `@media (max-width: 720px)`; empty states with icon + 0006's
  sentence. Update `MissionControl.test.tsx` l.61–79 (named in *Research*).
- **Verify:** quality gates; manual: `01-mission-control-{dark,light}` and HC — header and cards agree.
- [x] **Verified (T-004):** 2026-11-16 — red: 6 tests (the two updated header assertions, the new AC-006 one, three AC-007/§3.2 tests in `Sections.test.tsx`), then the layout-order test in `Drilldown.test.tsx` once attention moved above runs; green: eslint, both `tsc`, `npm run test:unit` 89 files / 1296 tests, `npm run compile`. Looked at `01-mission-control-{dark,light,hc}` and `08-narrow-mission-control-dark`: header one line with `·` separators, "0 project-level diagnostics · 8 specs with diagnostics" agrees with the cards; attention rows with number, title, tinted icon + reason right-aligned; runs and activity side by side, equal height; fixed reason/title vertical misalignment.
- **Notes:** **deviation, for Gregor:** the 0006 layout-order assertion in `webview/areas/missionControl/Drilldown.test.tsx` ("in the order of the layout", AC-022) was not named in *Research*; §3.2 moves Agent runs below Needs attention ("This order replaces 0006 §9's layout guidance"), so only the position of `running`/`run:*` in the expected list moved; DOM order still equals visual order. Separators ` — `, `, `, ` · ` stay in the DOM (0006 texts) but are visually hidden (`.mc-sep`). New `SpecLabel.tsx`; `icons.tsx` gained `Glyph` (failed, interrupted, waiting, empty).

### T-005 — Spec Board: full-height columns, sticky headers, drag marks

- **Covers:** AC-008, AC-011
- **Do:** `main.css`: drop `max-height: 70vh`; board fills the area (`.board` flex column, `.columns`
  `flex: 1; min-height: 0`, `grid-auto-flow: column`, `minmax(240px, 1fr)`, `overflow-x: auto`); column
  header `position: sticky` with StateChip icon, name, count badge (`--vscode-badge-*`); card list
  `overflow-y: auto`. `Column.tsx`/`SpecBoard.tsx`: `overKey` state set on the column's `dragover`, cleared on
  `drop`, `dragend` and on `dragleave` to outside; `data-drop-target="true"` on that column, lifted style on
  `data-dragging`. Tests in `Keyboard.test.tsx` (MouseEvents, per systemPatterns) and the CSS guard
  (no height/max-height on `.column`, sticky header, scrolling list, 240 px minimum).
- **Verify:** quality gates; manual: `02-spec-board-{dark,light,hc}` — no cut-off card, columns full height.
- [x] **Verified (T-005):** 2026-11-16 — red: 4 tests (2 CSS guard tests in `webviewCss.test.ts`: `max-height` on `.column`, no sticky header/`minmax(240px`/drag styles; 2 drag-mark tests in `Keyboard.test.tsx`: no `data-drop-target`); the dragend and no-drag tests were green before (controls); green: eslint, both `tsc`, `npm run test:unit` 89 files / 1302 tests, `npm run compile`. Looked at `02-spec-board-{dark,light,hc}` and `02-spec-board-drag-{dark,light}`: columns fill the height and scroll inside, no card cut at a page edge, count badges in the headers, filter bar on one row; drag shows the lifted card and the Ready column in the drop colour.
- **Notes:** at 1400 px six 240 px columns (1480 px with gaps) do not fit: the Blocked column is partly behind the horizontal scroll — A-004's "fit 1400 px" does not hold with AC-008's 240 px; for Gregor. `color-scheme` per theme class so native checkboxes, select and scrollbars follow the theme. Harness: drag shot added (outside the repo).

### T-006 — Spec Board: card layout with progress bars and corner "Move to…"

- **Covers:** AC-009, AC-010 (card), AC-003 (Move to…)
- **Do:** `Card.tsx` in AC-009's DOM order: number chip + title; one StateChip, then RuleText or
  Deprecated marker as secondary text; summary (two lines); blocked lines and readiness (reason primary,
  `R-n` secondary); `src/webview/ui/ProgressBar.tsx` (`role="progressbar"`, name, min/max/now, figure text)
  for tasks and criteria, or the "not available" text alone; diagnostics badge, run status, last change at
  the bottom; `MoveMenu` button small in the top-right corner, tab stop rule of 0007 AC-017 unchanged.
  Tests in `SpecBoard.test.tsx` (order, exactly one state chip, progressbar values, not available) — the
  0007 content assertions stay green.
- **Verify:** quality gates; manual: `02-spec-board-{dark,light,hc}` — cards dense, state readable.
- [x] **Verified (T-006):** 2026-11-16 — red: 5 tests (`ProgressBar.test.tsx` 2 on `Not implemented`; 3 card-layout tests in `SpecBoard.test.tsx`: no `.state-chip`/progressbar/`.card-state`); the "not available" test was green before (control); 0007 content assertions stayed green; green: eslint, both `tsc`, `npm run test:unit` 90 files / 1308 tests, `npm run compile`. Looked at `02-spec-board-{dark,light,hc}`: one chip per card, sentence and readiness as small secondary text, two progress rows, footer with diagnostics/run/last change; fixed a 2-line title clamp that cut titles (float spacer keeps the first line clear of "Move to…") and an invisible progress track in Light.
- **Notes:** `ProgressBar` landed here as planned; texts `TASKS_PROGRESS_LABEL`/`CRITERIA_PROGRESS_LABEL` (accessible names) added to `shared/protocol/texts.ts`. Blocked lines got a red Blocked icon, text stays foreground.

### T-007 — Safe inline Markdown and tidying in the detail view

- **Covers:** AC-014, AC-015
- **Do:** `src/webview/ui/inlineText.ts`: pure tokenizer for `**b**`, `__b__`, `*i*`, `_i_`, `` `code` ``,
  `[text](target)` → tokens; everything else literal text; `tidy`: drop `> ` (as quote), a list marker
  where the item is a list item, a repeated leading own ID; requirement cells split on ` | ` → first
  primary, rest secondary joined by ` · `. `InlineText.tsx` renders tokens as React elements only.
  Applied to every file text in `SpecDetail.tsx` (header values incl. the Plan link, requirements,
  criteria + Given/When/Then as a quote, stages, step titles, Verified text with a ticked/unticked/
  undetermined icon + label). Tests: `inlineText.test.ts` (each form, nesting limits, unmatched markers
  literal, `<img src=x onerror=alert(1)>` and `<b>` literal, no element created); a Node test that no file
  under `src/webview` contains `dangerouslySetInnerHTML` or `innerHTML`; fixture
  `test/fixtures/studio-0002/` (copy of this repo's spec 0002 + plan + minimal `AGENTS.md`) built with
  `buildDetail` and mounted in `webviewBundle.test.ts`: no `**AC-`, no `` ` ``, no `> `, each ID once.
- **Verify:** quality gates; manual: `04-spec-explorer-detail-0002-{dark,light}` — no raw Markdown.
- [x] **Verified (T-007):** 2026-11-16 — red: `inlineFormat.test.ts` and `InlineText.test.tsx` 16 failing on `Not implemented`, the fixture test in `webviewBundle.test.ts` failing on raw `**`; the innerHTML scan was green at once, negative control: a temporary file with `innerHTML` turned it red, removed; green: eslint, both `tsc`, `npm run test:unit` 92 files / 1326 tests, `npm run compile`. Looked at `09-tall-detail-0002-dark` and `04-*-{dark,light,hc}`: code as chips, bold, Given/When/Then as a quote block, requirement cells as muted secondary text, each ID once, step tick icons; Open file buttons still per item (T-008).
- **Notes:** the pure module is `src/webview/ui/inlineFormat.ts` (not `inlineText.ts`): beside `InlineText.tsx` the two names collide on case-insensitive file systems (esbuild already resolved the wrong one). The innerHTML scan lives in the Node test `webviewCss.test.ts` (the webview tsconfig has no Node types). The fixture check ignores `<code>` content, which may hold markers literally (`` `**Plan:**` ``). Stages are not re-tidied in the webview: the core already drops their list marker (`idText.ts`), and 0007's stage assertion keeps its literal "1. ". Plan link shows text plus target as AC-015 says; for `[x](x)` both are the same file name — visible duplicate, for Gregor.

### T-008 — Detail sections: collapse, one Open file per section, header, two panes

- **Covers:** AC-012, AC-013, AC-010 (Overview), AC-003 (toggles, Open file, related links), AC-016 (delta 3)
- **Do:** `DetailSection.tsx`: heading holds a toggle button (`aria-expanded`, `aria-controls`), "Open
  file" in the heading row (target without line); memory per section name in
  `src/webview/detail/sectionMemory.ts` (module state, panel lifetime, all start expanded). Remove per-item
  and per-diagnostic buttons; Related artifacts: the file name is the button. Detail header: number chip,
  title, StateChip, Open file. Overview: aligned grid, derived rule and readiness via RuleText. Explorer: two
  panes with own scroll, stacked under 640 px. Update `SpecDetail.test.tsx` l.150–158 and l.172–177
  (named in *Research*); new tests: toggle + `aria-expanded`, state survives another selection, counts per
  AC-013, no line sent.
- **Verify:** quality gates; manual: `04-spec-explorer-detail-0002-*` — short, calm, sections foldable.
- [x] **Verified (T-008):** 2026-11-16 — red: `SpecDetail.test.tsx` all 28 (stub `resetSectionMemory` throws in `afterEach`; then the six new tests and the two delta-3 assertions on the old buttons); green: eslint, both `tsc`, `npm run test:unit` 92 files / 1332 tests, `npm run compile`. Looked at `04-spec-explorer-detail-0002-{dark,light,hc}`, `04b-*-criteria-collapsed-*` and `08-narrow-detail-0002-*`: two panes with own scroll, chevron toggles, one Open file per heading row, Overview as one aligned grid with chip and sentence, no per-item buttons; dropped the bullets of plan steps (tick icon carries the state).
- **Notes:** the detail header's Open file opens the spec (as the Overview one does). `OpenButton` no longer passes a line (A-006). The Overview keeps `dl.detail-header` (0007 test) inside a `.detail-grid` wrapper with `display: contents`, so header lines and the new State row share one label column. `STATE_LABEL` text added. `h2` keeps the number for assistive technology (`.sr-number`), the visible number is the chip.

### T-009 — Empty, placeholder and panel-level states; motion

- **Covers:** AC-002, AC-003 (whole list), §3.6
- **Do:** `PanelStateView.tsx`, `Placeholder.tsx`, area empty states (board, Mission Control, Explorer):
  centred, icon, one sentence, action where one exists; texts unchanged (0005/0006/0007 own them).
  Transitions ≤ 150 ms for hover, selection, collapse; one `@media (prefers-reduced-motion: reduce)`
  block setting transitions to none. CSS guard for AC-002; one test walking every AC-003 control with
  Tab and checking it is reachable and that the focus rule reaches it.
- **Verify:** quality gates; manual: `05-agent-center-dark`, `06-*`, `07-*`.
- [x] **Verified (T-009):** 2026-11-16 — red: `src/webview/states.test.tsx` 6 failing (no icon in panel states, placeholder, empty board/MC/Explorer) and the AC-002 guard (no transition, no reduced-motion block); the AC-003 guard was green at once, negative control: a temporary `.mc-tile:focus { outline }` turned it red, removed; then 0005's AC-030 test went red (its "last matching rule" met the `*` reduced-motion rule) — fixed by placing that block first with `!important`, test unchanged; green: eslint, both `tsc`, `npm run test:unit` 93 files / 1340 tests, `npm run compile`. Looked at `05-agent-center-*`, `06-*`, `07-*` in Dark, Light and HC: centred card, icon, sentence, primary plus secondary action.
- **Notes:** new `src/webview/ui/EmptyState.tsx`; `icons.tsx` gained `folder`, `info`. The second panel-state action is styled as a secondary button. Transitions 120 ms on hover colours and the section chevron.

### T-010 — Final gates, docs sync, screenshots for Gregor

- **Covers:** AC-001…AC-016 (re-proved by the gates), AC-017 (verdict recorded here), AC-018 (listed as pre-done manual)
- **Do:** run every gate; dependencies unchanged (`git diff package.json package-lock.json` empty). Docs:
  README §Mission Control and §Spec Board (look, collapsible detail, one Open file per section);
  `AGENTS.md` snapshot — exactly two entries change: `src/webview` gains "shared UI primitives in
  src/webview/ui (state chip, rule text, progress bar, inline text formatter)" and "(specs 0005, 0007, 0006,
  0013)"; `src/shared/protocol` gains "0013" in its spec list. `systemPatterns.md`: `--fs-*` alias rule,
  inline formatter (tokens to React elements, no HTML), drag marks without verdict (OP-1 (a)).
  `techContext.md`: manual checks AC-017, AC-018 and the preview harness note. `activeContext.md`. Hand the
  full AC-017 shot list to Gregor; record his verdict below.
- **Verify:** quality gates; manual: AC-017 — Gregor's verdict on the full screenshot set (no command can
  judge looks).
- [ ] **Verified (T-010):** — (gates done 2026-11-16: eslint `--max-warnings 0`, `tsc --noEmit` both, `npm run test:unit` 93 files / 1340 tests, `npm run compile` green; `git diff e78fa54 -- package.json package-lock.json` empty. Open: Gregor's AC-017 verdict on the shot set below — no command can judge looks.)
- **Notes:** docs synced (README §Mission Control and §Spec Board, `AGENTS.md` snapshot: exactly the two entries of `Do:`, `systemPatterns.md` three records, `techContext.md` 0013 test line and manual checks). Shot set for AC-017 in `/mnt/user-data/outputs/screens/` (33 files): `01-mission-control-*`, `02-spec-board-*`, `02-spec-board-drag-{dark,light}`, `03-spec-explorer-list-*`, `04-spec-explorer-detail-0002-*`, `04b-*-criteria-collapsed-*`, `05-agent-center-*`, `06-panel-state-no-folder-*`, `07-panel-state-not-a-project-*` (each dark, light, hc at 1400×900), `08-narrow-{mission-control,spec-board,detail-0002}-{dark,light}` (900 px), `09-tall-detail-0002-dark`. Known weak points for the verdict: at 1400 px the sixth board column sits partly behind the horizontal scroll (AC-008's 240 px vs A-004); the Plan line shows `[x](x)` as the same file name twice (AC-015 literal); cards are tall (about 230 px) at 240 px width.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-010 | `src/webview/main.css` (`--fs-*`, `[data-board-state]`), `src/webview/testing/css.ts:declarations` | `src/adapters/node/webviewCss.test.ts` (0013 AC-001 block) | verified |
| AC-002 | T-009 | `src/webview/main.css` (transitions, reduced-motion block) | `webviewCss.test.ts` (AC-002) | verified |
| AC-003 | T-001, T-003, T-004, T-006, T-008, T-009 | `main.css` (`button:focus-visible`), controls as native buttons | `webviewCss.test.ts` (AC-003), `MissionControl.test.tsx` (AC-003), `SpecDetail.test.tsx` (AC-003), `Keyboard.test.tsx` (0007 AC-017) | verified |
| AC-004 | T-003 | `src/webview/areas/missionControl/SpecFigures.tsx`, `Drill.tsx` | `MissionControl.test.tsx` (0013 AC-004 tests) | verified |
| AC-005 | T-003 | `SpecFigures.tsx` (`.mc-distribution`, `[data-progress]`), `missionControl/texts.ts:mcSegment` | `MissionControl.test.tsx` (0013 AC-005 tests) | verified |
| AC-006 | T-004 | `missionControl/texts.ts:mcDiagnostics`, `Header.tsx` | `MissionControl.test.tsx` (0013 AC-006) | verified |
| AC-007 | T-004 | `Attention.tsx`, `RunSection.tsx`, `Activity.tsx`, `SpecLabel.tsx`, `board/icons.tsx:Glyph` | `Sections.test.tsx` (0013 AC-007) | verified |
| AC-008 | T-005 | `src/webview/main.css` (`.columns`, `.column`, `.column-heading`, `.column-cards`) | `webviewCss.test.ts` (AC-008) | verified |
| AC-009 | T-006 | `src/webview/board/Card.tsx`, `src/webview/ui/ProgressBar.tsx` | `SpecBoard.test.tsx` (0013 AC-009), `ProgressBar.test.tsx` | verified |
| AC-010 | T-002, T-006, T-008 | `src/webview/ui/RuleText.tsx`, `src/shared/protocol/texts.ts:DERIVED_SENTENCES`, `src/core/board/cards.ts`, `src/core/shell/specRows.ts`, `board/Card.tsx`, `detail/SpecDetail.tsx` | `RuleText.test.tsx`, `areas.test.tsx` (AC-007 row), `SpecBoard.test.tsx` (0013 AC-010), `SpecDetail.test.tsx` (0013 AC-010) | verified |
| AC-011 | T-005 | `src/webview/areas/SpecBoard.tsx` (`overState`, `onDragLeave`), `board/Column.tsx` | `Keyboard.test.tsx` (0013 AC-011), `webviewCss.test.ts` (AC-011) | verified |
| AC-012 | T-008 | `src/webview/detail/DetailSection.tsx`, `sectionMemory.ts` | `SpecDetail.test.tsx` (0013 AC-012) | verified |
| AC-013 | T-008 | `DetailSection.tsx:OpenButton`, `SpecDetail.tsx` (related links) | `SpecDetail.test.tsx` (AC-010 Open file block, 0013 AC-013) | verified |
| AC-014 | T-007 | `src/webview/ui/inlineFormat.ts:tokenize`, `InlineText.tsx` | `inlineFormat.test.ts`, `InlineText.test.tsx`, `webviewCss.test.ts` (innerHTML scan), `webviewBundle.test.ts` (studio-0002) | verified |
| AC-015 | T-007 | `inlineFormat.ts:tidy`, `splitCells`, `SpecDetail.tsx`, `test/fixtures/studio-0002/` | `inlineFormat.test.ts`, `webviewBundle.test.ts` (studio-0002) | verified |
| AC-016 | T-002, T-004, T-008, T-010 | updated assertions named in T-002, T-004 (incl. the layout-order deviation), T-008 Verified/Notes | `npm run test:unit` (93 files, 1340 tests) | verified |
| AC-017 | T-010 | — | manual: Gregor, screenshots | open |
| AC-018 | T-010 (listed) | — | manual: Gregor, real VS Code | open |

## Session handoff

- **Done so far:** plan approved by Gregor 2026-11-16 (whole plan; `--fs-*` aliases accepted under AC-001 if every alias resolves only to `--vscode-*`); pair moved to `active/`. T-001…T-009 ticked; T-010 gates and docs done, its tick waits for Gregor's AC-017 verdict.
- **Next action:** Gregor looks at the shot set (T-010 Notes) and gives the AC-017 verdict; record it in T-010 `Verified:`, tick, set `Status: Done`; then `/sdd-compile` in a fresh session. AC-018 (real VS Code, live theme switch) is the pre-done manual check.
- **Open decisions:** for Gregor: the 0006 layout-order assertion changed per §3.2 (T-004 Notes); the 1400 px board overflow (T-005 Notes); the duplicated Plan link target (T-007 Notes). The harness now covers 900 px, collapsed detail, drag and HC of every area (outside the repo).
- **Baseline:** e78fa54
- **Environment:** `npm test` cannot run here (VS Code download blocked); CI runs it.
