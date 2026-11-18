# Plan — Layout and Signal Polish

**Spec:** [0022-layout-and-signal-polish.md](0022-layout-and-signal-polish.md)
**Status:** In Progress
**Last updated:** 2026-11-18
**Current step:** T-014

## Approach

The frame comes first, because every row and width rule rests on it: one scrollbar per region and the
list-or-detail switch below 900 px replace 0019's drawer (T-001), then the remembered width (pure arithmetic in
`shared/protocol/layout.ts`, memory in the shell service) and the divider (T-002, T-003). Two single sources
follow, independent of each other: the state table and the problem sentence (T-004 ‖ T-005). The Overview rows
are cut only once their Copies have their final looks and the state icon exists (T-006 → T-007, the riskiest:
container queries plus a subgrid that puts the row button's sibling Copy on the last line). Then the signals in
the webview and the tree (T-008 → T-010), and the docs, §5 notes and the test-title audit last (T-011). Layout is
decided here by stylesheet tests and component tests with stubbed sizes (jsdom computes none); the look is the
orchestrator's preview harness (guideline 12), best at the ends of stages 1 and 3. Files this task did not create
are deleted only where a step's **Deletes:** line names them, confirmed at the start of each stage (0020's
practice). Test review once per stage from the tests named in `Do:` (`AGENTS.md` *TDD*). Memory Bank touched in
T-011 only: `techContext.md`, `systemPatterns.md`, `activeContext.md`.

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` ·
2 `npx tsc --noEmit` · 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (steps
touching wiring, adapters, `extension.ts`, `package.json` or the bundle) · `npm run compile-tests` where a host
test changes · pre-done gate `npm test` on Windows and CI (host smoke cannot run here; PLAN-NOTE).

## Research

**Checkpoint digest (2026-11-18, `/sdd-plan` Mode A under Gregor's delegation).** No question only Gregor can
answer: every open choice is decided by the spec, PD-068…PD-075 (newest wins) and `.claude/rules/ux-guidelines.md`
1–12, recorded as proxies P-1…P-22 below. Gregor reads this plan and replies with changes or approval.

**Survey (code at `a5264df`).**
- Frame: `App.tsx` `Frame` renders `main` (`overflow: auto`, `padding: 12px 16px`) with `RestrictedNote`,
  `NoticeBar`, then `.area-frame` (`.area-content` `overflow: auto` + `SidePanel`) or `PanelStateView`. Side panel
  `flex: 0 0 400px`, own `overflow-y: auto`; `.spec-detail` also sets `overflow-y: auto` (overridden inside the side
  panel). Drawer: `@media (max-width: 899px) .side-panel` absolute; `DRAWER_QUERY` (`shared/protocol/layout.ts`),
  `useDrawer()` (`detail/drawer.ts`) feeds `data-drawer` on `.columns` (`SpecBoard.tsx`, plus `scrollIntoView` on
  focus, 0019 T-009) and on `.overview` (`Overview.tsx`, PD-066, 0019 T-010, T-014).
- Close: `CloseButton` in `SpecDetail`'s title row and in `SidePanel`'s fallback; Escape via `DetailFrame`;
  `focusAfterClose(stem)` (opener, else the spec's card or row in `.area-content`); unmount runs `rescueFocus`.
- Memory: `parseUiMemory` (`core/shell/uiMemory.ts`) drops all for one bad part (spec §9); the Board's Done choice
  uses its own key `featherspec-studio.board` `{v: 1, done}` (`adapters/vscode/uiMemory.ts`, `extension.ts`).
  Requests reach `ShellService.handlers` through `messageRouter` and `studioPanel.ts`; `isShellView` tolerates
  extra fields; `PROTOCOL_VERSION` 4.
- States: tree `STATE_ICONS` (`core/shell/specTree.ts`); webview `PATHS` (`board/icons.tsx`, the Blocked glyph is
  a circle with a bar, not a slash); CSS `[data-board-state="…"] { --fs-tint }` used by `.state-chip` and
  `.column-heading .icon`; `data-board-state` on columns, cards, chips and Overview rows (`Drill.tsx`).
- Problems: reasons emitted in `core/specs/{files,readProject,parseSpec,parsePlan,returnNote}.ts` and
  `core/lifecycle/entryContext.ts`; shown raw by `core/board/detail.ts` (`DiagnosticLine`), `cards.ts`
  (`projectFindings` → banner and Overview lines), `core/overview/problems.ts` (row `status` = reasons) and the
  tree tooltip. `readSnapshot` serializes `read.diagnostics` whole (0016 AC-003), so no field may be added there.
  Return notes are `.memory-bank/activeContext.NNNN-T-n.md`; folder keys have no `.md`.
- Overview row: `li.ov-row-item` = `Drill` button `.ov-row` (number, title, `ov-status`, warning, `StepText`) +
  sibling `CopyButton` (0017 P-5); the same `.ov-row` class serves Activity rows. Wide rules unscoped, two-line rules
  in `@media (max-width: 720px)` with `overflow-wrap: anywhere` (the cause of n16/g03: `anywhere` lets min-content
  shrink to one letter). `webview/testing/css.ts` parses `@media` and `@supports`, not `@container`.
- Copy: one `CopyButton` (`.copy-button`, primary colours, `min-width: 14ch`), name `<label>: <line>` from
  `NEXT_STEP_COPY_LABEL`/`COPIED_LABEL`/`COPY_FAILED_LABEL`; callers NextStep, Card, SpecRow, Now (empty Up next),
  Overview and SpecBoard (zero specs). `.restricted-note button`, `.notice button` share the primary rule with
  `.panel-state button` (0014 AC-001 keeps the panel-state part).
- Tree: description `<State> · <short>`, label cut at 24 (`cutAt`), group key `upNext`; host smoke "AC-019"
  expects `['0001 Restaurant-Rechnung mit…', 'Review · /sdd-compile']`; with the budget it becomes
  `['0001 Restaurant-Rec…', '/sdd-compile']` (32 − 5 − 12 = 15). `GROUP_LABELS`, `UP_NEXT_HEADING`,
  `NOTHING_UP_NEXT_TEXT`, `UP_NEXT_SET_LABEL` are the only `up next` texts in `src` and `package.json`.
- jsdom 31.0.1 (probed 2026-11-18): `PointerEvent` exists; `setPointerCapture`, `ResizeObserver`, `matchMedia` do
  not; `scrollTop` is stored; `clientWidth` is 0; `<wbr>` adds nothing to `textContent`. React 19.3.1 renders
  `inert` as a boolean attribute (`@types/react` has `inert?: boolean`).
- No `Deprecated` candidate: 0005, 0007, 0013, 0016–0020 keep their other criteria; §5 rows become inline notes.
  0021 (planned after 0022) also amends some statements; its notes go above 0022's (OP-003).

**Sources (retrieved 2026-11-18).**
- [APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) — focusable `separator` with
  `aria-valuenow`/`min`/`max` and `aria-controls` (required), `aria-label` without a visible label; Left/Right move a
  vertical splitter, Home/End optional (smallest/largest primary pane), Enter collapses (0022 A-012 resets instead).
- [MDN overflow-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-wrap) — `break-word` breaks an
  unbreakable word only when it overflows and, unlike `anywhere`, adds no soft wrap to the min-content size (P-11).
- [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_size_and_style_queries)
  — `container-type: inline-size`, named `@container name (width …)`; rules style descendants, not the container (P-13).
- [web.dev Baseline 2023](https://web.dev/blog/baseline2023) — size container queries Chrome 105, subgrid Chrome 117;
  VS Code 1.146 ([notes](https://code.visualstudio.com/updates/v1_146), Nov 2026) ships a far newer Chromium.
- [CSS Grid 2 §9 Subgrids](https://www.w3.org/TR/css-grid-2/#subgrid-listing) — a subgrid inherits the parent's line
  names, including the implicit ones of `grid-template-areas`, so its children can be placed by the parent's area names;
  [MDN Subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid) — gaps pass into the subgrid.
- [MDN `<wbr>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/wbr) — a break opportunity
  only, empty element, no hyphen (P-11).
- [MDN setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) — capture
  until `releasePointerCapture` or `pointerup`; `lostpointercapture` ends the drag (P-8).
- [VS Code Theme Color](https://code.visualstudio.com/api/references/theme-color) — `sash.hoverBorder`,
  `charts.green`/`orange`/`blue`/`red`, `problemsWarningIcon.foreground`, `button.secondaryBackground`/`Foreground`,
  `toolbar.hoverBackground`, `descriptionForeground` exist. Codicons `list-flat`, `pass`, `play`, `eye`,
  `circle-slash`, `check`, `warning` are already used by 0020's tree.

**Proxy decisions (Gregor delegated; read with the plan).**
- P-1 No spec revision: PD-073…PD-075 entered with the spec's last revision (`a5264df`); the survey contradicts no
  criterion. Only the `**Plan:**` line changes.
- P-2 Eleven steps, one spec: the two halves (signals §4.2–§4.5, §4.8; layout §4.1, §4.6, §4.7) share the Copy, the
  row and the state icon; Gregor delegated one round and 0021 waits for both. The stage ends give the stops.
- P-3 0022 before 0021, today's step texts (task constraint): the step short form is today's command short form, so
  budget step 2 never fires (§7) and is tested with a synthetic intent; the icon Copy's name and tooltip are built
  from the same constants as the text button (`Copy: <line>` today; 0021 changes the constant once). Of the coach
  line and `?` 0022 builds only their place: `.ov-row-item > .ov-coach { grid-column: 1 / -1 }` is auto-placed after
  the row's last line in every layout; the stylesheet test proves it now, 0021 renders `.ov-coach` and adds the
  component test. No 0021 text is built.
- P-4 Frame (G-1): `html, body, #root`, `main`, `.area-frame` `overflow: hidden`; `main` loses its padding;
  `.area-content` `padding: 12px 16px; overflow-y: auto` (scrollbar at the divider); `.side-panel` `overflow-y: auto`,
  no margin; `main > .restricted-note` and `main > .notice` take `margin: 8px 16px` (the Overview's own notice sits in
  the padded area content); `main > .panel-state` `min-height: 0; overflow-y: auto`;
  `.spec-detail`'s `overflow-y: auto` and the `.side-panel > .spec-detail` override go. The 16 px stay, so A-005's
  "panel − 34 px" holds.
- P-5 List or detail (G-4): `NARROW_QUERY = '(max-width: 899px)'` (was `DRAWER_QUERY`), `useNarrow()` in
  `detail/narrow.ts` (replaces `drawer.ts`). Below 900 px with a selection `.area-frame` carries
  `data-layout="detail"`: the area content stays mounted and laid out but is set aside (`position: absolute; inset: 0;
  visibility: hidden` plus `inert`), the side panel stays in the flow at full width (`flex: 1 1 auto`). Every scroll
  position of the area (content, Board columns, card lists) survives without code, and no rule lays the side panel over
  the area (AC-001). `detail/BackButton.tsx` is the detail's first line, above the title row, text X-27
  (`BACK_LABELS[area]`), sends `clearSelection` as close does; no close button then. Crossing 900 px: focus moves to
  the detail heading only when it sat inside the area content that is set aside.
- P-6 Width memory: own key `featherspec-studio.sidePanel` (`SIDE_PANEL_MEMORY_KEY`, `workspaceState`, as the Board's
  key), value `{ v: 1, fraction }`, parsed apart from `parseUiMemory` (`core/shell/sidePanelWidth.ts`); anything else
  is ignored. `ShellView.sideWidth?: number`; requests `setSideWidth { fraction }` (guard: finite, 0 < f < 1) and
  `resetSideWidth {}` (stores `undefined`, which deletes the key). `PROTOCOL_VERSION` stays 4: only additions.
- P-7 Arithmetic in `shared/protocol/layout.ts` (no DOM, node-tested): `SIDE_MIN 320`, `AREA_MIN 360`,
  `SIDE_STEP 16`, `SIDE_STEP_LARGE 64`; `clampSideWidth(w, frame) = max(320, min(w, frame − 360))`;
  `defaultSideWidth(frame) = clampSideWidth(max(400, round(0.4 × frame)), frame)`; `sideWidthOf(fraction?, frame)`.
  The frame is `.area-frame`'s width, read with `ResizeObserver` where it exists (tests stub it).
- P-8 Divider `detail/Divider.tsx`: 0 px in the flow (the side panel's 1 px left border is the line, a 4 px `::before`
  hit area as VS Code's sash); `tabIndex 0`, `role="separator"`, `aria-orientation="vertical"`, `aria-controls` = the
  side panel's `id`, `aria-valuemin` 320, `aria-valuemax` frame − 360, `aria-valuenow` width, `aria-label` X-25,
  `title` X-26. Keys per G-2 with `preventDefault`; primary-button `pointerdown` → `setPointerCapture` (guarded),
  `pointermove` → `frame.right − clientX` clamped, `pointerup`/`lostpointercapture` → end; drag end and every key change
  send the fraction, Enter and `dblclick` send `resetSideWidth`. The side panel's width is an inline `style` width (no
  colour; the 0013 guard holds), set only while side by side (below 900 px P-5's full width applies); CSS `cursor: col-resize`, `--vscode-sash-hoverBorder` on `:hover` and
  `[data-dragging]`, focus outline from the shared `:focus-visible` rule.
- P-9 State table `shared/protocol/stateLook.ts` `STATE_LOOK: Record<BoardState, { motif, colour }>` (codicon ID,
  theme colour ID; Deprecated is Done). The tree uses both IDs; the webview's `StateIcon` draws its own SVG of the
  motif (the Blocked glyph gets a diagonal slash) and sets `data-tint="<colour ID>"`; the stylesheet maps the five
  colour IDs to `--fs-tint` (`[data-tint="charts.green"] { --fs-tint: var(--vscode-charts-green); }`), so it names no
  state (AC-026) and 0013's alias and inline-style guards stay valid. `data-board-state` stays as a hook without colour.
- P-10 Problem sentence `core/lifecycle/problemSentence.ts` `problemSentence(diagnostic)`: by kind, contradiction,
  scope (spec, `.plan.md`, return note, folder) and the values our own emitters put into the reason; reasons and read
  snapshots unchanged (0016 AC-003, A-009). Fallback = the reason, asserted unused for every Problem of the nine
  baseline fixtures and the memory cases. X-10…X-24 in `shared/protocol/texts.ts`. Protocol: `DiagnosticLine.sentence?`
  and `BannerLine.sentence?` (Problems only), Overview `ProblemLine.sentence`, `OverviewRow.reasons?` (a Problems row's
  tooltip, ` · `-joined); a Problems row's `status` = sentences joined by ` · ` (PD-064 P-6).
- P-11 Paths (§4.6): `ui/PathText.tsx` — `<PathText path>` puts `<wbr>` after every `/`, `-`, `.` (detail path, card
  path, Files link names, the place of a project-level problem line); `<PathText command>` for next-step lines puts
  them only into tokens that contain `/` and do not start with `/` (the path arguments; not `/sdd-plan`, not
  `continue`). `overflow-wrap: break-word` replaces `anywhere` on these, the card head, the side panel's heading and
  Overview titles.
- P-12 Copy looks: `CopyButton` gets a required `look: 'primary' | 'secondary' | 'icon'`. Primary keeps
  `.copy-button` (0016 AC-017/AC-019 tests stay), secondary `.copy-button.copy-secondary`, icon `.copy-icon`
  (border-box 24 × 24 px, transparent, `toolbar.hoverBackground` on hover, contrast border in High Contrast; glyphs
  copy, check, warning in `board/icons.tsx`); name as today, tooltip the name, during feedback T-19. Primary only:
  `NextStep` line 1, the first Now row (`SpecRow` prop `copyLook`), both zero-spec Copies. `.restricted-note button`
  and `.notice button` (BR-03 and the Overview's own notice) get the secondary colours.
- P-13 Rows: `container: ov-list / inline-size` on every `.ov-list` of Now, Up next and Problems; three blocks
  `@container ov-list (width > 686px)`, `(420px <= width <= 686px)`, `(width < 420px)`; `li.ov-row-item` is a grid with
  named areas; `.ov-row-item > .ov-row` spans it and places its children on `subgrid` rows and columns by the parent's
  area names; the sibling Copy sits in area `copy`, painted over the button's box. `.ov-problems .ov-row-item` takes
  the two-line template from 420 px up. Activity rows keep their flex rule (`.ov-row` outside `.ov-row-item`).
- P-14 State in rows: `SpecRow` renders `StateIcon` (title = state) before `.ov-status`; where `status === state` the
  text carries `.ov-state-name` (visually hidden in the two narrower blocks only) and the icon is `aria-hidden`;
  otherwise (a need, sentences) the icon is `role="img"` with the state as `aria-label` — the name once in the row's name.
- P-15 AC-028 arithmetic: the CSS test parses `.area-content`, `.ov-panel` (padding, border), `.ov-list` (margins),
  `.ov-row-item` paddings and uses `defaultSideWidth`; 1ch = 0.6 em of 13 px (titles) and of 11 px (Copy); no scrollbar
  width (the harness at 920 px checks the real one). 920 px → side 400, area 520, list 486: two lines. Area 360 → list
  326, row content 302 ≥ number + gap + 12ch (≈ 130 px) and ≥ the primary Copy (≈ 110 px).
- P-16 Tree: description `step.short` | `<State>` | `Deprecated`; pure budget `core/shell/treeLabel.ts` (number, full
  title, description, the command short form when the description carries an intent — absent today), `cutAt` from
  `shortTitle.ts`. Group key and ID `ready` / `group:ready` (unreleased). Group hint: `GroupModel` gains `icon?`,
  `color?`, `tooltip?`, `accessibleLabel?`; n = the sum of its rows' Problems; the adapter sets them only then.
- P-17 Strips: `BoardColumn.problems?: number` on a `collapsed` or `filtered` narrow column (`core/board/filters.ts`):
  the Problems of the specs it stands for and does not show; `Column` draws the warning under the count and appends
  ` · <T-05>` to its name and title, before B-6's rule text.
- P-18 X-07 `UP_NEXT_NOTE` in `areas/overview/texts.ts`, a `p.ov-note` after the Up next heading while rows are listed.
- P-19 AC-007 scan (`sourceScan.test.ts`): every literal of `src` (no tests) and `package.json` matching /up next/i is
  one of `UP_NEXT_HEADING`, `NOTHING_UP_NEXT_TEXT`, `UP_NEXT_SET_LABEL`; negative control.
- P-20 Deletions named per step (**Deletes:**), confirmed at the start of the stage; removing a test is evidence too.
- P-21 Test-title audit by 0018–0020's method in T-011 against the Baseline; expected map below.
- P-22 Docs: README "The Specs view" (`Ready`), Overview (note, icon Copies, one primary), "The detail of a spec"
  (divider, Enter or double-click reset, remembered width, back button below 900 px); `docs/product/ux-guidelines.md`
  rows 18 and 21; release checklist items AC-019, AC-020, AC-021 (build part), AC-025; CHANGELOG `[0.1.0] - Unreleased`.
  The README screenshot stays unless the harness gives a new one (orchestrator's call).

**Expected test-title audit map (T-011 confirms it against the Baseline).** Absent at the head:
- `detail/SidePanel.test.tsx` describes "AC-005: the drawer marks the board" and "AC-005, AC-022: a card focused under
  the drawer is scrolled clear" with their tests → void (§5 0019 §6.1 drawer, AC-005 drawer part; PD-075), replaced by
  AC-029's tests.
- `adapters/node/webviewCss.test.ts`: the drawer media rule, the board drawer padding, "0019 F3 …", both "0019 PD-066 …"
  → void (same rows); "full-height frame: … main scrolls on its own", "AC-005: from the drawer width up … 400 px column
  …", "AC-005: no media rule changes … under the drawer", "0019: the one module that calls matchMedia … the drawer …",
  the 0019 describe title → retitled (G-1, G-2, AC-022, AC-023); "0018 AC-006: a spec row stays on one line …" and both
  "0018 AC-006 (V1) …" → replaced by AC-001 (§5 0018 AC-006); "§3.1: one state-colour mapping …" → replaced by AC-026
  (§5 0013 §3.1).
- `core/shell/specTree.test.ts`: the 24/25-character cut → AC-005; "the description is the state, with the short form
  …" → AC-004; group titles naming "Up next" → retitled `Ready` (§5 0020 §4.1, AC-001, AC-002); "… keeps its state word
  …" and "… with its reason, escaped" → retitled (AC-004, AC-013).
- `core/overview/problems.test.ts`, `shared/protocol/overview.test.ts`, `areas/overview/Overview.test.tsx`,
  `core/board/detail.test.ts`: titles naming "reason(s)" of a Problem → retitled "sentence(s)" (§5 0016 §6.2, 0018 O-4,
  O-5, AC-007, 0019 §6.2 row 3).

## Test-title audit

`python3 -I /tmp/audit-0022/titles.py <git archive 20a1e68> <head>` over every `describe`, `it`, `test` and `suite` literal of every `.ts` and `.tsx` under `src` (`src/test/**` and `testing/*.ts` included), 2026-11-18, T-011: baseline 2291 titles (2282 distinct), head 2494 (2484 distinct); **34 absent, 0 decreased** (the 4 `describe`/`describe`-like group titles are among the absent ones and mapped). Every absent title is a voided or retitled statement of §5 or is replaced by the head title named:

- `src/adapters/node/webviewCss.test.ts`: "0018 AC-006 (V1) control: the wide row rules sit outside every media query, so above 720 px the row stays on one line" → voided by §5 row 0018 AC-006; replaced by `0022 AC-001, AC-003, AC-027, AC-028` (container rules, subgrid, title rules)
- `src/adapters/node/webviewCss.test.ts`: "0018 AC-006 (V1): at 720 px or less a spec row wraps to two lines, number and title first, then the status, the step and Copy, with no text cut by an ellipsis" → voided by §5 row 0018 AC-006; replaced by `0022 AC-001, AC-003, AC-027, AC-028` (container rules, subgrid, title rules)
- `src/adapters/node/webviewCss.test.ts`: "0018 AC-006: a spec row stays on one line: title and status cut by an ellipsis, number, step, warning icon and Copy never cut" → voided by §5 row 0018 AC-006; replaced by `0022 AC-001, AC-003, AC-027, AC-028` (container rules, subgrid, title rules)
- `src/shared/protocol/overview.test.ts`: "0018 AC-007: Problems carry rows and lines; a line takes exactly where and reason" → retitled `0018 AC-007, 0022 AC-013: Problems carry rows and lines; a line takes exactly where, reason and sentence` (§5 0018 AC-007; PD-063 (1))
- `src/adapters/node/webviewCss.test.ts`: "0019 AC-005, AC-021: the side panel beside the area or as a drawer" → describe retitled `0019 AC-005, AC-021, 0022 AC-022, AC-023` (§5 0019 AC-005 drawer part; G-1, G-2)
- `src/adapters/node/webviewCss.test.ts`: "0019 F3: no drawer width or drawer padding is relative to the window (no vw unit), so a panel under 432 px is never overrun at its left edge" → voided with the drawer (§5 0019 §6.1 Place, §9 rows; PD-075)
- `src/adapters/node/webviewCss.test.ts`: "0019 PD-066: a marked Overview uses the two-line row layout of 0018 T-013 for every property of the 720 px rules, without a media query" → voided: PD-066 superseded by PD-075; rows follow the list width (0022 AC-001)
- `src/webview/detail/SidePanel.test.tsx`: "0019 PD-066: the Overview carries the drawer mark exactly while a spec is selected and the query matches, and follows the change event" → voided: PD-066 superseded by PD-075; replaced by `ListOrDetail.test.tsx` (AC-029)
- `src/webview/detail/SidePanel.test.tsx`: "0019 PD-066: while the Overview shows, exactly one element carries the drawer mark and no board columns are there" → voided: PD-066 superseded by PD-075; replaced by `ListOrDetail.test.tsx` (AC-029)
- `src/adapters/node/webviewCss.test.ts`: "0019 PD-066: while the drawer shows, the Overview takes the width left of the drawer: end padding of min(400px, 100%) on the marked Overview and no media rule on it" → voided: PD-066 superseded by PD-075 (no drawer padding); AC-022 and AC-001 cover the frame
- `src/adapters/node/webviewCss.test.ts`: "0019: the one module that calls matchMedia asks only the width query of the drawer, never a colour scheme" → retitled: the one module asks only `NARROW_QUERY` (0022 AC-029; `narrow.ts`)
- `src/webview/detail/SidePanel.test.tsx`: "AC-005, AC-022: a card focused under the drawer is scrolled clear" → voided (§5 0019 AC-005 drawer part, AC-022 "the drawer"); replaced by `ListOrDetail.test.tsx`
- `src/adapters/node/webviewCss.test.ts`: "AC-005: from the drawer width up the side panel is a 400 px column with its own scroll beside the area content" → retitled `AC-022, AC-023: side panel width` (§5 0019 §6.1 Place; G-1, G-2)
- `src/adapters/node/webviewCss.test.ts`: "AC-005: no media rule changes the area content, the frame or the board, so the area keeps its width under the drawer" → voided with the drawer (§5 0019 AC-005 drawer part); AC-022 describe covers the frame
- `src/webview/detail/SidePanel.test.tsx`: "AC-005: the drawer marks the board" → voided (§5 0019 §6.1 drawer, AC-005 drawer part; PD-075); replaced by AC-029's tests
- `src/adapters/node/webviewCss.test.ts`: "AC-005: the only media rule is the drawer query of the code, at 899 px, and it overlays the panel from the right edge at min(400px, 100%) of the frame" → voided with the drawer (§5 0019 AC-005 drawer part); the `NARROW_QUERY` test of `webviewCss.test.ts` replaces it
- `src/adapters/node/webviewCss.test.ts`: "AC-005: while the drawer shows, the board end padding and scroll padding equal the drawer width" → voided with the drawer (§5 0019 AC-005 drawer part, §9)
- `src/core/board/detail.test.ts`: "AC-006: a Problem carries its reason and opens at its line in its file; the format notes stay out of the Problems" → retitled `AC-006, 0022 AC-013: a Problem carries its sentence and its reason …` (§5 0019 §6.2 row 3, 0016 AC-006)
- `src/core/board/detail.test.ts`: "AC-006: the detail of 0003 of fs-broken shows the contradiction reason as its Problem" → retitled `AC-006, 0022 AC-013: the detail of 0003 of fs-broken shows the contradiction sentence …` (§5 0016 AC-006)
- `src/webview/detail/SidePanel.test.tsx`: "a browser without scrollIntoView does not break focusing a card" → voided with the drawer's `scrollIntoView` (§5 0019 AC-005 drawer part, AC-022)
- `src/core/shell/specTree.test.ts`: "a title of 24 characters is not cut; one of 25 is cut at its last space within the first 24, then …" → replaced by `treeLabel.test.ts` and `0022 AC-005` (§5 0020 §4.2 Label, A-005)
- `src/core/overview/problems.test.ts`: "an orphan return note gives a line "where" and "reason" and no row" → retitled `an orphan return note gives a line with "where", "reason" and its sentence and no row` (§5 0018 O-4)
- `src/webview/detail/SidePanel.test.tsx`: "asks the drawer query, marks the columns while a spec is selected and the panel is narrow, and follows the change event" → voided with the drawer (§5 0019 AC-005 drawer part); replaced by `ListOrDetail.test.tsx`
- `src/webview/detail/SidePanel.test.tsx`: "control: the drawer query not matching (panel from 900 px) scrolls nothing" → voided with the drawer; replaced by `ListOrDetail.test.tsx`
- `src/webview/detail/SidePanel.test.tsx`: "control: without a selection the narrow board carries no drawer mark" → voided with the drawer mark; replaced by `ListOrDetail.test.tsx`
- `src/webview/detail/SidePanel.test.tsx`: "control: without a selection there is no drawer and nothing scrolls" → voided with the drawer; replaced by `ListOrDetail.test.tsx`
- `src/webview/detail/SidePanel.test.tsx`: "focusing a card, and a control inside a card, calls scrollIntoView on the focused element with block and inline nearest" → voided (§5 0019 AC-005 drawer part, AC-022 "the drawer")
- `src/core/overview/problems.test.ts`: "fs-broken gives the rows 0002 (unreadable) and 0003 (contradiction), each with its own reason as the state text" → retitled `… each with its own sentence as the state text and its reason as the tooltip text` (§5 0018 O-5, AC-007)
- `src/adapters/node/webviewCss.test.ts`: "full-height frame: the studio is a flex column of the viewport height and main scrolls on its own" → retitled `G-1: …` frame tests (0022 AC-022; §5 0019 §6.1 Place)
- `src/core/overview/problems.test.ts`: "several Problems of one spec give one row, the reasons joined by " · " and the count of the Problems" → retitled `… the sentences joined by " · ", the reasons joined the same way …` (§5 0018 O-5, AC-007)
- `src/core/shell/specTree.test.ts`: "shows the groups that hold a spec, in the order In progress, Up next, Backlog, Done, each with its count as the description" → retitled `… In progress, Ready, Backlog, Done …` (§5 0020 §4.1, AC-001)
- `src/core/shell/specTree.test.ts`: "starts In progress, Up next and Backlog expanded and Done collapsed" → retitled `starts In progress, Ready and Backlog expanded …` (§5 0020 AC-002)
- `src/core/shell/specTree.test.ts`: "the description is the state, with the short form of the next step where there is one" → replaced by `the description is the step short form only, …` and `0022 AC-004` (§5 0020 §4.2 Description)
- `src/adapters/node/webviewCss.test.ts`: "§3.1: one state-colour mapping, each state tinting through --fs-tint from its theme variable" → replaced by `0022 AC-026` tests (`stateLook.test.ts`, `webviewCss.test.ts`; §5 0013 §3.1)

`## Docs: "Up next" left as the Overview's set` (AC-018): README lines 19 (the Overview's Up next section) and 35 (the Overview rows list); `docs/product/ux-guidelines.md` row 21 ("then up next"); `docs/release-checklist.md` lines 49 and 105 (Overview checks) and the new 0022 item that names `Ready` and `Up next` together. The tree's group renamed to `Ready` in README line 15, guidelines row 18, checklist (the 0020 item) and CHANGELOG. This implementation edits no row of `docs/product/product-decisions.md`: `git diff 20a1e68 -- docs/product/product-decisions.md` shows only PD-076, added by the orchestrator's commit `428fb19` (0024); none of this branch's 0022 commits touches the file.

## Stages

1. T-001 → T-002 → T-003 — side by side or alone: one scrollbar each, the area or the detail below 900 px, a remembered divider
2. T-004 ‖ T-005 — one source each: the state table and the problem sentence
3. T-006 → T-007 — Overview rows: one primary Copy, icon Copies, rows by the list's own width
4. T-008 → T-009 → T-010 — signals: Problems as sentences and paths that break; tree rows with the step; Ready and the hidden-Problem hints
5. T-011 — §5 notes, docs, test-title audit, architecture and Memory Bank sync, final gates
6. T-012 → T-022 — fix round after the compile of 2026-11-18 (`/home/claude/orch/compile/0022.md`, D1–D4, survivors M05, M05b, M05c, M39, M51, M55, exploratory findings, traceability and docs)

Parallel: stage 2 (T-004 touches `stateLook`, `specTree`, the webview icons, chip, column and the stylesheet; T-005
`problemSentence`, `texts.ts`, the detail, board and Overview protocols and their core projections; no shared file,
each `Verify` runs its own tests). Both are small: run them in sequence. Stages 1, 3 and 4 share `App.tsx`,
`main.css`, `webviewCss.test.ts`, `specTree.ts` or `SpecRow.tsx` within the stage, so they stay `→`.

## Steps

### T-001 — One scrollbar each; below 900 px the area or the detail alone

- **Covers:** AC-022, AC-029; AC-001 (no `data-drawer`, no side panel over the area)
- **Deletes:** `src/webview/detail/drawer.ts` (replaced by `src/webview/detail/narrow.ts`, Ask-first move); in code
  `data-drawer` on `.columns` (`areas/SpecBoard.tsx`) and `.overview` (`areas/overview/Overview.tsx`), the
  `scrollIntoView` branch of `SpecBoard.onFocus` (0019 T-009), `DRAWER_QUERY` (renamed `NARROW_QUERY`); in `main.css`
  `@media (max-width: 899px) .side-panel`, `.columns[data-drawer]`, `.overview[data-drawer]` and its four row rules
  (0019 T-010, T-014, PD-066), `.spec-detail`'s `overflow-y: auto` and `.side-panel > .spec-detail`; tests: both drawer
  describes of `detail/SidePanel.test.tsx` and the five drawer and PD-066 tests of `webviewCss.test.ts` (audit map)
- **Do:** CSS per P-4 and P-5. `App.tsx` `Frame`: `useNarrow()`; with a selection and the query matching, frame
  `data-layout="detail"`, area content `inert`, `SidePanel` with `back={shell.area}`; `SpecDetail`/`SidePanel` render
  `BackButton` (X-27, `BACK_LABELS` in `texts.ts`) in place of `CloseButton`; an effect on crossing moves focus to the
  heading only from inside the set-aside area. Tests: new `src/webview/detail/ListOrDetail.test.tsx` (stubbed
  `matchMedia` with change events): area alone without a selection; detail alone with X-27 for Overview and Board, no
  close button, no `[role="separator"]`, the area content the same node with its `scrollTop`; back and Escape send
  `clearSelection`, after the host event focus as 0019 AC-003 (opener card, Overview row); switching area keeps the
  detail and renames the back button; crossing both ways keeps the selection, focus kept in the side panel, moved to the
  heading from the area. `webviewCss.test.ts` AC-022 (root, `main`, frame `overflow: hidden`; within the frame
  `overflow-y: auto` only on `.area-content`, `.side-panel`, `.column-cards`; panel state own box; no padding, margin or
  gap at the side panel's right edge) and AC-001's part (no `data-drawer`, no `position: absolute|fixed` or `z-index` on
  `.side-panel`); the matchMedia guard retargeted to `narrow.ts`.
- **Verify:** `npx vitest run --project webview src/webview/detail` and `npx vitest run --project node src/adapters/node/webviewCss.test.ts`
  red (stub, failing rules), then green; gates 1–4
- [x] **Verified (T-001):** 2026-11-18, red first: `npx vitest run --project webview src/webview/detail/ListOrDetail.test.tsx` with `useNarrow` returning false and a throwing `BackButton` stub: 9 failed (no `data-layout`, no `inert`, no back button, focus not moved), 5 passed (the controls); `npx vitest run --project node src/adapters/node/webviewCss.test.ts`: 11 failed (the new AC-022, AC-001 and G-4 tests and the retargeted ones). Green after the code: eslint 0 warnings, `tsc --noEmit` and `tsc --noEmit -p src/webview` clean, `npm run test:unit` 2247 passed, 3 skipped (+13 timing) (Baseline 2238 + 9: -8 SidePanel drawer tests, -5 CSS tests, +14 ListOrDetail, +8 CSS).
- **Notes:** Deleted as named: `src/webview/detail/drawer.ts` (`git rm`), `DRAWER_QUERY` (now `NARROW_QUERY`, `detail/narrow.ts`), `data-drawer` on `.columns` and `.overview`, the `scrollIntoView` branch of `SpecBoard.onFocus`, in `main.css` the drawer media rule, `.columns[data-drawer]`, `.overview[data-drawer]` and its four row rules, `.spec-detail`'s `overflow-y: auto` and `.side-panel > .spec-detail`; tests: both drawer describes of `SidePanel.test.tsx` (`AC-005: the drawer marks the board` with 4 tests, `AC-005, AC-022: a card focused under the drawer is scrolled clear` with 4 tests) and five of `webviewCss.test.ts` (drawer media rule, board drawer padding, 0019 F3, both 0019 PD-066). Retitled or retargeted there: "full-height frame …" (now `0022 G-1 …`, `main` is `overflow: hidden`), "AC-005: from the drawer width up the side panel is a 400 px column …" (title without the drawer, `.area-content` is `overflow-y: auto`; T-003 replaces it), "AC-005: no media rule changes … under the drawer" (`0022 AC-001: … keeps its width and its scroll position`), the matchMedia guard (`narrow.ts`, `NARROW_QUERY`), the describe title; "AC-015: columns share the width …" reads the 16 px from `.area-content` (they moved there, G-1). Proxy decisions: the back button is plain text (no glyph in the DOM, a CSS `::before` with an empty alternative text draws the chevron), so its text is its accessible name; `main > .panel-state` takes `width: min(calc(100% - 32px), 440px)` because `main` lost its padding; focus on crossing uses `requestHeadingFocus`, which also covers a detail that has not arrived yet; the same call fires when a click selects a spec at a narrow width (same stem as `useOpenSpec`, harmless). The Overview's own notice stays in the padded area content. The scrollbar position and the look are the orchestrator's harness after stage 3 (jsdom computes none).

### T-002 — The side panel's width is remembered per workspace

- **Covers:** AC-024 (arithmetic, memory, requests)
- **Do:** `shared/protocol/layout.ts` per P-7; `core/shell/sidePanelWidth.ts` (`parseSideWidth`, `serializeSideWidth`)
  and `ShellService` deps `sideMemory`, handlers `setSideWidth`, `resetSideWidth`, `view().sideWidth` (P-6);
  `messages.ts` payloads, guards, `REQUEST_GUARDS`, `isShellView`; `adapters/vscode/uiMemory.ts`
  `SIDE_PANEL_MEMORY_KEY`, `extension.ts` wiring; `webview/client.ts` `setSideWidth(fraction)`, `resetSideWidth()`.
  Tests: new `src/shared/protocol/layout.test.ts` (1428 → 571, 900 → 400, clamps at 320 and frame − 360, a fraction of
  0.6 at 1428 → 857, 0.7 at 900 clamped to 540, validity of 0, 1, −0.1, NaN, '0.5'); new
  `src/core/shell/sidePanelWidth.test.ts` on the shell world (`testing/world.ts` gets a fake side memory) (set stores
  `{v: 1, fraction}` and shows it; reset deletes;
  each invalid stored value is ignored while the remembered area and selection still apply; nothing reaches a workspace
  folder: the port is the only writer); `messages.test.ts` (guards accept and refuse); `client.test.ts` (requests sent).
- **Verify:** `npx vitest run --project node src/shared/protocol/layout.test.ts src/core/shell/sidePanelWidth.test.ts src/shared/protocol/messages.test.ts`
  and `npx vitest run --project webview src/webview/client.test.ts` red (stub), then green; gates 1–5
- [x] **Verified (T-002):** 2026-11-18, red first with `Not implemented` stubs: `npx vitest run --project node src/shared/protocol/layout.test.ts src/core/shell/sidePanelWidth.test.ts src/shared/protocol/messages.test.ts src/core/shell/messageRouter.test.ts --project webview src/webview/client.test.ts`: 18 failed (stubs throw, guard returns false, handlers and client methods do nothing), the rest passed; green after the code: same command all passed. Gates: eslint 0 warnings, `tsc --noEmit` and `-p src/webview` clean, `npm run test:unit` 2271 passed, 3 skipped (+13 timing), `npm run compile` green (gate 5).
- **Notes:** `SIDE_PANEL_MEMORY_KEY = 'featherspec-studio.sidePanel'` (`adapters/vscode/uiMemory.ts`), `ShellServiceDeps.sideMemory` is required (the world has a second fake memory `sideMemory`); `ShellView.sideWidth?` is validated by `isShellView` (a stored fraction outside 0…1 never reaches the view); `maxSideWidth(frame)` and `isSideFraction` added to `layout.ts` for the divider (T-003). A staying test had to change: `boardFilter.test.ts` "every board request has a guard" lists the two new request types. The webview `Shell` wrapper gets `setSideWidth`/`resetSideWidth` in T-003, where they are used.

### T-003 — A divider sets the side panel's width; Enter or a double-click resets it

- **Covers:** AC-023, AC-024 (the fraction applies, clamped, whenever side by side); AC-022 re-proved
- **Deletes:** none; replaced: "AC-005: from the drawer width up the side panel is a 400 px column …" (`webviewCss.test.ts`)
- **Do:** `detail/Divider.tsx` and a `useSideWidth(frameRef)` hook (`detail/sideWidth.ts`) per P-8; `App.tsx` renders
  the divider between area content and side panel while side by side with a selection; the side panel gets an `id` and
  the width. CSS: `.side-panel` `flex: none` (width from the divider), `.divider` rules. Texts X-25, X-26 in `texts.ts`.
  Tests: new `src/webview/detail/Divider.test.tsx` (stubbed `ResizeObserver`, frame rect, `setPointerCapture`,
  `matchMedia`): one separator with role, orientation, `aria-controls` = the panel's id, min 320, max 1068, now 571 at
  1428 px, X-25, X-26; Left +16, Right −16, Shift ±64, Home 320, End 1068, each sending `setSideWidth`; Enter and
  `dblclick` send `resetSideWidth` and show 571; a drag follows the pointer within the limits and ends at `pointerup`
  and at `lostpointercapture` with one `setSideWidth`; a remembered 0.6 shows 857 at 1428 px, a remembered 0.7 shows 540
  at a frame of 900 px without a request (the fraction stays); below 900 px no divider and no inline width. `webviewCss.test.ts`: `.side-panel` sets no fixed width; divider cursor,
  `sash.hoverBorder`, no outline removed.
- **Verify:** `npx vitest run --project webview src/webview/detail/Divider.test.tsx` and `npx vitest run --project node src/adapters/node/webviewCss.test.ts`
  red, then green; gates 1–4
- [x] **Verified (T-003):** 2026-11-18, red first: `npx vitest run --project webview src/webview/detail/Divider.test.tsx`: 15 failed, 1 passed (no divider exists; the passing one is the negative case); `webviewCss.test.ts` against HEAD (scratch copy via `git archive`, new test file copied in): 2 failed (the two G-2 rules). Green: same files 72 passed. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2288 passed, 3 skipped (+13 timing), `npm run compile` green.
- **Notes:** Replaced as the plan says: "AC-005: the side panel is a 400 px column …" is now "0022 G-2: the side panel gets its width from the divider …" (no `400px` left in the stylesheet). Proxy decisions: a key or drag that leaves the width unchanged sends nothing; the displayed width is kept locally until the host echoes the fraction (`useSideWidth`: `local` state, cleared whenever the remembered fraction changes), so Enter and the double-click show 571 at once; the frame is measured with `getBoundingClientRect` in a layout effect and kept by `ResizeObserver` (window `resize` where it is missing); without a measured frame (width 0) there is no divider and no inline width; `Shell` got `setSideWidth`/`resetSideWidth`; the divider's focus outline is its own `:focus-visible` rule in the shared outline colours (a 0 px element has no box for the generic rule). The look of the 4 px hit area and the scrollbar position is the orchestrator's harness after stage 3.

### T-004 — One table gives each state its icon and colour

- **Covers:** AC-026
- **Files:** `src/shared/protocol/stateLook.ts`, `src/shared/protocol/stateLook.test.ts`, `src/core/shell/specTree.ts`,
  `src/core/shell/specTree.test.ts`, `src/webview/board/icons.tsx`, `src/webview/ui/StateChip.tsx`,
  `src/webview/ui/StateChip.test.tsx`, `src/webview/board/Column.tsx`, `src/webview/board/SpecBoard.test.tsx`,
  `src/webview/main.css`, `src/adapters/node/webviewCss.test.ts`
- **Deletes:** `STATE_ICONS` in `specTree.ts`; the six `[data-board-state="…"]` tint rules in `main.css`; test "§3.1:
  one state-colour mapping …" (replaced)
- **Do:** P-9. Tests: `stateLook.test.ts` (the table of §4.8 literally, six distinct motifs, none `warning`); tree rows
  take icon and colour from it (Active `charts.green`, Review `charts.orange`, Done `descriptionForeground`; the Problem
  override unchanged); chip and column header and strip render the motif glyph with `data-tint`; CSS: no rule whose
  selector names a state sets a colour or `--fs-tint`, each colour ID maps to its `--vscode-*` variable, chip and header
  icon use `--fs-tint`.
- **Verify:** `npx vitest run --project node src/shared/protocol/stateLook.test.ts src/core/shell/specTree.test.ts src/adapters/node/webviewCss.test.ts`
  and `npx vitest run --project webview src/webview/ui/StateChip.test.tsx src/webview/board/SpecBoard.test.tsx` red, then green; gates 1–4
- [x] **Verified (T-004):** 2026-11-18, red first: `npx vitest run --project node src/shared/protocol/stateLook.test.ts src/core/shell/specTree.test.ts src/adapters/node/webviewCss.test.ts --project webview src/webview/ui/StateChip.test.tsx src/webview/board/SpecBoard.test.tsx`: 5 files failed to load (module `stateLook` missing), no test ran. Green: all passed. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2303 passed, 3 skipped (+13 timing).
- **Notes:** Deleted as named: `STATE_ICONS` (`specTree.ts`), the six `[data-board-state="…"]` tint rules (`main.css`, now five `[data-tint="<colour ID>"]` rules), test "§3.1: one state-colour mapping …" (replaced by "0022 AC-026: each colour ID …"). `data-board-state` stays as a hook on columns, cards, chips and Overview rows and carries no colour; `data-tint` (colour ID) sits on the chip, the column and the `StateIcon` svg, which also carries `data-motif` (the table's codicon ID, so a test can tie the glyph to the table). The Blocked glyph is now a ring with a diagonal slash (the bar variant looked like a minus); `StateIcon` fills `evenodd`. The tree test "every state has its icon and colour" changed its three colour literals (Active green, Review orange, Done and Deprecated descriptionForeground), the tree's description still carries the state word until T-009.

### T-005 — Every Problem has one user sentence; the reason travels beside it

- **Covers:** AC-013 (core and protocol), AC-014
- **Files:** `src/core/lifecycle/problemSentence.ts`, `src/core/lifecycle/problemSentence.test.ts`,
  `src/shared/protocol/texts.ts`, `src/shared/protocol/detail.ts`, `src/shared/protocol/detail.test.ts`,
  `src/shared/protocol/board.ts`, `src/shared/protocol/overview.ts`, `src/shared/protocol/overview.test.ts`,
  `src/core/board/detail.ts`, `src/core/board/detail.test.ts`, `src/core/board/cards.ts`, `src/core/board/cards.test.ts`,
  `src/core/overview/problems.ts`, `src/core/overview/problems.test.ts`
- **Do:** P-10. Tests: `problemSentence.test.ts` — each of X-10…X-24 literally from `fs-broken`,
  `fs170-brownfield-mixed` and memory projects (folder/status both forms, plan, return note with its file name, folder,
  duplicate reference and number, both dangling links, three unknown statuses, orphan note); every Problem of the nine
  baseline fixtures maps without the fallback; AC-014 (each sentence with inserted paths, values and numbers as `x`
  holds none of the nine words; negative control). Detail problem lines, banner lines and Overview lines carry sentence
  and reason; a Problems row's status is the sentences, its tooltip the reasons; notes keep their reason only; protocol
  guards accept and refuse the new fields.
- **Verify:** `npx vitest run --project node src/core/lifecycle/problemSentence.test.ts src/core/board/detail.test.ts src/core/board/cards.test.ts src/core/overview/problems.test.ts src/shared/protocol/detail.test.ts src/shared/protocol/overview.test.ts`
  red (stub), then green; `src/core/specs/readBaseline.test.ts` unchanged and green; gates 1–4
- [x] **Verified (T-005):** 2026-11-18, red first: `npx vitest run --project node src/core/lifecycle/problemSentence.test.ts src/core/board/detail.test.ts src/core/board/cards.test.ts src/core/overview/problems.test.ts src/shared/protocol/detail.test.ts src/shared/protocol/overview.test.ts`: `problemSentence.test.ts` 15 failed against the throwing stub (8 passed: the baseline fixtures without a Problem and the negative control), projections 6 failed (no sentence, no reasons); the protocol guard tests against the unchanged HEAD sources (scratch copy via `git archive`): 3 failed. Green: all passed, `src/core/specs/readBaseline.test.ts` unchanged and green. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2329 passed, 3 skipped (+13 timing).
- **Notes:** `knownProblemSentence` (returns `undefined` for the fallback) is the sweep's probe, `problemSentence` = known sentence or the reason; the texts are functions and constants in `shared/protocol/texts.ts` (X-10…X-24, `*_SENTENCE`). The sentence is read from the emitters' own reason formats (regexes in `problemSentence.ts`), so reasons and read snapshots are unchanged (0016 AC-003, A-009). `ProblemLine.sentence` is required, `DiagnosticLine.sentence?` and `BannerLine.sentence?` only on Problems, `OverviewRow.reasons?` only on Problems rows; a Problems row's `status` is the sentences deduplicated and joined by ` · `. The webview still shows the reasons: the four fixtures that build a `ProblemLine` got `sentence` equal to their reason until T-008 changes what is shown. The sweep's "memory cases" are the in-test memory projects of `problemSentence.test.ts` (every X-text once) plus `fs-broken` and `fs170-brownfield-mixed` (the only two baseline fixtures with Problems).

### T-006 — At most two primary buttons; list Copies are icon buttons

- **Covers:** AC-010, AC-011, AC-012
- **Do:** P-12 in `ui/CopyButton.tsx`, `board/icons.tsx` (copy, copied glyphs), `detail/NextStep.tsx`, `board/Card.tsx`,
  `areas/overview/SpecRow.tsx`, `Now.tsx`, `Problems.tsx`, `Overview.tsx`, `areas/SpecBoard.tsx`, `main.css`. Tests:
  `CopyButton.test.tsx` (icon: pointer, Enter and Space copy the full first line; check or warning, name and T-19 in
  tooltip and live region until 2000 ms after the last activation, then restored; selects nothing; same element; tab
  index kept); new `src/webview/primaryButtons.test.tsx` (AC-011's Given: Overview 2 and Board 1 with NS-5 selected, 1 and
  0 without); `webviewCss.test.ts` (secondary colours on `.copy-secondary`, `.restricted-note button`, `.notice button`;
  `.copy-icon` fixed width and height ≥ 24 px, no outline of its own, HC border); existing Copy tests of cards and rows
  (`Keyboard.test.tsx`, `SpecBoard.test.tsx`, `Sections.test.tsx`, `Overview.test.tsx`) target `.copy-icon`, titles kept.
- **Verify:** `npx vitest run --project webview src/webview/ui/CopyButton.test.tsx src/webview/primaryButtons.test.tsx`
  and `npx vitest run --project node src/adapters/node/webviewCss.test.ts` red, then green; gates 1–4
- [x] **Verified (T-006):** Red first: `CopyButton` stub with the `look` prop rendered every Copy as a primary button, so primaryButtons.test (count 13, expected 2) and 3 CSS tests failed. Green after implementation: eslint 0 warnings, tsc and tsc -p src/webview clean, test:unit 2348 passed (3 skipped, +13 timing).
- **Notes:** No deletions on this step. Looks: NextStep line 0 primary, further lines secondary; Card, Problems and Up next rows, "Nothing up next" icon; first Now row primary via `copyLook`; zero-spec Copies primary. SpecBoard.test card Copy assertions now read aria-label. `.panel-state button` stays primary; `.restricted-note button` and `.notice button` secondary.

### T-007 — Overview rows follow the list's own width and show the state as an icon

- **Covers:** AC-001, AC-027, AC-028; AC-002 (Overview row title); AC-003 (Problems rows two lines from 420 px)
- **Deletes:** in `main.css` the `@media (max-width: 720px)` block (0018 T-013, PD-065) and the unscoped one-line row
  rules (`.ov-row { white-space: nowrap }`, `.ov-row .ov-title|.ov-status|.step-text`, `.ov-title` ellipsis), moved into
  the container blocks; tests "0018 AC-006: a spec row stays on one line …" and both "0018 AC-006 (V1) …" (replaced)
- **Do:** P-13, P-14, P-3's coach place; `webview/testing/css.ts` parses `@container` (rule field `container`).
  `SpecRow.tsx` state icon and `.ov-state-name`. Tests in `webviewCss.test.ts`: every `.ov-list` an inline-size container
  named `ov-list`; the three templates exactly at 686 px and 420 px, only inside `@container` rules; no `@media` rule
  touches an `.ov-` selector; number and title alone on the first line in two and three lines, no `nowrap` on the title;
  Problems rows two lines from 420 px, no ellipsis there; `.ov-coach` on the last line; no `anywhere` or `break-all` on
  `.ov-title`; `.ov-state-name` hidden visually inside the narrower blocks only; AC-028's arithmetic (P-15). Component
  tests in `Sections.test.tsx`: every row's state icon before its text with the state as tooltip; the accessible name
  holds the state once (name as text, a need, sentences); a need and sentences carry no hiding class.
- **Verify:** `npx vitest run --project node src/adapters/node/webviewCss.test.ts` and `npx vitest run --project webview src/webview/areas/overview`
  red, then green; gates 1–4; layout itself: the orchestrator's harness after stage 3 (jsdom computes none)
- [x] **Verified (T-007):** Red first: with the new tests and no stylesheet or component change 11 of the new webviewCss tests failed (no container, no subgrid, media block still present, no state icon); the two Sections tests failed on a missing `.ov-state-icon`. Green after: eslint 0 warnings, tsc and tsc -p src/webview clean, test:unit 2358 passed (3 skipped, +13 timing). Layout itself is for the orchestrator's harness (jsdom computes none).
- **Notes:** Deleted exactly the listed items: the `@media (max-width: 720px)` block, `.ov-row { white-space: nowrap }`, the `.ov-row .ov-number|.step-text|.ov-problem`, `.ov-row .ov-title|.ov-status|.step-text` flex rules, `.ov-row-item .copy-button`, the unscoped `.ov-title` ellipsis (kept as `.ov-spec .ov-title` for SpecLabel), and the tests "0018 AC-006: a spec row stays on one line ...", "0018 AC-006 (V1): at 720 px or less ..." and "0018 AC-006 (V1) control ...". `webview/testing/css.ts` parses `@container` (rule and declaration field `container`). Rows: li grid with named areas per block, button on subgrid, Copy in area `copy`; `.ov-state` wraps icon and text. Activity rows keep their flex `.ov-row` but wrap now (their one-line rules were among the listed ones). The coach rule is in place; its DOM is 0021's.

### T-008 — Problems read as sentences and wrap; paths break only after a separator

- **Covers:** AC-013 (webview), AC-015, AC-002 (card title and head, side panel heading, §4.6 elements), AC-003 (lines,
  banner, detail list; full text in the DOM)
- **Deletes:** `overflow-wrap: anywhere` in `.card-head`, `.card-path`, `.detail-path`
- **Do:** `detail/SpecDetail.tsx` problem list: the sentence, as the link where the finding has a file; `ui/FileLink.tsx`
  optional `reason`: tooltip and description = reason, then 0019 AC-017's text on its own line; without a file the
  reason is the tooltip. `SpecRow` tooltip = `reasons` for a Problems row; Overview and banner lines
  `<PathText path={where}/>: <sentence>` with the reason as tooltip. New `ui/PathText.tsx` (P-11) in `NextStep.tsx`, the
  detail path, `Card.tsx` path, Files links. CSS `break-word`. Tests: new `src/webview/ui/PathText.test.tsx` (a `<wbr>`
  after each `/`, `-`, `.` of a path and no other, none in `/sdd-plan` or `continue`, text content and Copy unchanged);
  `SpecDetail.test.tsx`, `Overview.test.tsx`, `SpecBoard.test.tsx` (banner) for each surface's sentence and tooltip;
  `webviewCss.test.ts` AC-002 and AC-003 (no ellipsis, clamp or `nowrap` on Problems rows, lines, banner, detail list);
  `userLanguage.test.tsx` sweeps the sentences.
- **Verify:** `npx vitest run --project webview src/webview/ui/PathText.test.tsx src/webview/detail/SpecDetail.test.tsx src/webview/areas/overview src/webview/board/SpecBoard.test.tsx src/webview/userLanguage.test.tsx`
  and `npx vitest run --project node src/adapters/node/webviewCss.test.ts` red, then green; gates 1–4
- [x] **Verified (T-008):** Red first: PathText against a `Not implemented` stub failed 5 of 5; the surface tests (SpecDetail, Overview, SpecBoard banner and card path, userLanguage, webviewCss AC-002) failed 10 before the components changed. Green after: eslint 0 warnings, tsc and tsc -p src/webview clean, test:unit 2375 passed (3 skipped, +13 timing).
- **Notes:** Deleted exactly the named `overflow-wrap: anywhere` of `.card-head`, `.card-path`, `.detail-path` (now `break-word`). New `ui/PathText.tsx` (`path` and `command` forms), `FileLink` optional `reason` (title and description = reason, newline, open text). Surfaces: detail problem list, detail path, Files link names, next-step lines, card path, banner and Overview lines, Problems row tooltip = `reasons`. `problemLineText` in `areas/overview/texts.ts` is now unused and was left (not on the Deletes line). `.step-text` keeps its `anywhere` (not named).

### T-009 — A tree row shows its step, uncut, within a label budget of 32

- **Covers:** AC-004, AC-005; AC-013 (tree tooltip `Problem: <sentence>`)
- **Deletes:** `LABEL_MAX` and the state prefix of `descriptionOf` (`specTree.ts`); test "a title of 24 characters is not
  cut; one of 25 is cut …" (replaced)
- **Do:** P-16 rows: new `core/shell/treeLabel.ts`; `specTree.ts` description, label, X-05 accessible label, tooltip with
  `problemSentence`. Tests: new `src/core/shell/treeLabel.test.ts` (room formula, a fitting title not cut, the floor of
  12, step 2 with a synthetic intent, four-digit numbers); AC-005's sweep over 0020's tree fixtures and titles of 1…80
  characters × every NS rule's short form (≤ 32 unless raised to 12; ends with the whole command short form);
  `specTree.test.ts` AC-004 (no description starts with a state and ` · `; X-05 with Deprecated and T-05) and the
  sentence in the tooltip; `src/test/shell.smoke.test.ts` AC-019 expects `['0001 Restaurant-Rec…', '/sdd-compile']`.
- **Verify:** `npx vitest run --project node src/core/shell/treeLabel.test.ts src/core/shell/specTree.test.ts` red, then
  green; gates 1–4; `npm run compile-tests` (host smoke runs at the pre-done gate)
- [x] **Verified (T-009):** Red first: `treeLabel.test.ts` failed on the missing module; the updated `specTree.test.ts` failed 6 tests on the old state prefix, the 24-character cut and the reason in the tooltip. Green after: eslint 0 warnings, tsc and tsc -p src/webview clean, test:unit 2386 passed (3 skipped, +13 timing), `npm run compile-tests` clean (host smoke runs at the pre-done gate).
- **Notes:** Deleted exactly `LABEL_MAX`, the state prefix of `descriptionOf`, and the test "a title of 24 characters is not cut; one of 25 is cut ..." (replaced by `treeLabel.test.ts` and the AC-004/AC-005 describes). New `core/shell/treeLabel.ts` (`TREE_BUDGET` 32, `TITLE_FLOOR` 12, optional `command` for a description with an intent, never given today); `treeRowAccessibleLabel` (X-05) in `shared/protocol/texts.ts`; the tooltip holds `Problem: <problemSentence>`. The AC-005 sweep runs 3 numbers x 16 short forms x 80 title lengths. Host smoke AC-019 now expects `['0001 Restaurant-Rec…', '/sdd-compile']` (compiles; it runs on Windows and CI).

### T-010 — "Up next" names one set; a group or strip says when it hides a Problem

- **Covers:** AC-006, AC-007, AC-008, AC-009
- **Deletes:** `GROUP_LABELS.upNext` and the ID `group:upNext` (renamed `ready`)
- **Do:** texts X-01, X-02, X-03, X-06, X-07; P-16 groups in `specTree.ts` and `adapters/vscode/studioTree.ts`; P-17 in
  `core/board/filters.ts`, `shared/protocol/board.ts`, `board/Column.tsx`, `main.css`; P-18 in `areas/overview/Now.tsx`.
  Tests: `specTree.test.ts` (four groups in order, `Ready`; a Problem in collapsed Done: X-02, `warning` in
  `problemsWarningIcon.foreground`, X-03 for 1 and n; without: count only, no icon or tooltip; the ID unchanged for both
  counts); `studioTree.test.ts` (group icon, tooltip, accessibility only with Problems); one model: tree `Ready` count =
  Overview `Ready` figure = Board Ready count (`specTree.test.ts`, AC-007); `sourceScan.test.ts` P-19; `filters.test.ts`
  and `SpecBoard.test.tsx` (collapsed Done and a filter-emptied column with a Problem: glyph, X-06 in title and name,
  B-6 after it; other strips as 0018 AC-014); `Sections.test.tsx` X-07 with rows, none without.
- **Verify:** `npx vitest run --project node src/core/shell/specTree.test.ts src/adapters/vscode/studioTree.test.ts src/core/board/filters.test.ts src/adapters/node/sourceScan.test.ts`
  and `npx vitest run --project webview src/webview/board/SpecBoard.test.tsx src/webview/areas/overview/Sections.test.tsx`
  red, then green; gates 1–5
- [x] **Verified (T-010):** Red first: 14 new or updated tests failed before the change (group names and IDs, Problem hint on groups, `problems` on strips, X-07 note, the tree item mapping); `sourceScan` P-19 compares file and literal, so the old `GROUP_LABELS.upNext` literal would have failed it. Green after: eslint 0 warnings, tsc and tsc -p src/webview clean, test:unit 2402 passed (3 skipped, +13 timing), `npm run compile` and `npm run compile-tests` clean.
- **Notes:** Deleted exactly `GROUP_LABELS.upNext` and the ID `group:upNext` (now `ready`, label `Ready`). `GroupModel` gains `icon`, `color`, `tooltip`, `accessibleLabel`, set only with a Problem (n = sum of the rows' Problems); `studioTree.ts` maps them. `BoardColumn.problems` on collapsed and filtered strips (`filters.ts`, guard in `board.ts`), `Column` draws `.column-problem` under the count and appends ` · <T-05>` to name and tooltip before the rule text (`withProblemCount`). `UP_NEXT_NOTE` after the Up next heading while rows are listed. New `sourceScan` block: the three literals sit in `overview/texts.ts` and `overview/requests.ts` only; negative control included.

### T-011 — §5 notes, docs, test-title audit, architecture and Memory Bank sync, final gates

- **Covers:** AC-016, AC-017, AC-018; checklist items for AC-019, AC-020, AC-021, AC-025; re-proves AC-001…AC-029
- **Do:** "*Amended by 0022 (PD-069): …*" directly under each §5 statement of 0005, 0007, 0013, 0015, 0016, 0017, 0018,
  0019, 0020 (0021's later notes go above them, OP-003); PD register unedited. README, `docs/product/ux-guidelines.md`,
  `docs/release-checklist.md`, CHANGELOG per P-22; the plan lists each "Up next" left there as the Overview's set
  (README lines 19, 35; guidelines row 21; checklist lines 48, 104) and renames the tree's (README 15, guidelines 18,
  checklist 128); checklist line 47 ("every state … reads as a word", "every reason under Problems") follows §4.8 and
  §4.5; `docs/product/design-brief.md` lines 46 and 51–52 (groups, 400 px, drawer) get a superseded-by-0022 note. `docsScan.test.ts`: a 0022 block (README names, groups, checklist items, CHANGELOG, note counts) and the
  0020 group test reads `**Ready**`. Test-title audit: throwaway `/tmp/audit-0022/titles.py` (`describe`/`it`/`test`/
  `suite` literals of every `.ts`/`.tsx` under `src`, `src/test/**` and `testing/*.ts` included; describe titles count)
  at the Baseline (`git archive`) and the head; `## Test-title audit` here lists every absent title with its §5 row or
  replacing title. `/sdd-architecture-update` (confirmation = this plan's approval) changes exactly: `last reconciled` →
  `<date> (0022)` in `AGENTS.md` and the three module maps; snapshot core line `lifecycle 0003` → `lifecycle 0003 (+
  problem sentences 0022)` and `shell 0005 (+ spec tree, tree service, tree actions 0020)` → `… tree actions 0020; tree
  label budget, side panel width 0022)`; webview line `detail as side panel in Overview and Board (0019)` → `detail as
  side panel beside Overview and Board with a divider, alone below 900 px (0019, 0022)`; shared line adds `state look,
  side panel layout` and `0022` to its list; `.architecture/core.md` (lifecycle, shell), `webview.md` (`detail/narrow.ts`,
  `Divider.tsx`, `BackButton.tsx`, `ui/PathText.tsx`, Copy looks), `adapters.md` (`SIDE_PANEL_MEMORY_KEY`). Memory Bank:
  `techContext.md` *Test* (one 0022 line; the 0019 drawer sentence corrected), `systemPatterns.md` (one 0022 entry; the
  0018 and 0019 entries' media-query and drawer clauses marked superseded), `activeContext.md`. Final gates.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green; audit counts in this
  plan; `grep -c "Amended by 0022"` per spec ≥ its §5 rows; `git diff <Baseline> -- docs/product/product-decisions.md`
  empty; gates 1–5; `npm run compile-tests`; `npm test` on Windows and CI (pre-done gate); AC-019, AC-020, AC-021, AC-025:
  `manual:` the orchestrator's harness (1600, 1000, 920, 800 px, zoom 2; Dark, Light, HC) and Gregor in a real window —
  no command sees rendered layout or VS Code's tree drawing
- [x] **Verified (T-011):** Red first: the 0022 block of `docsScan.test.ts` against the docs of HEAD (scratch copy via `git archive`) failed 18 tests; the old 0020 group test and the checklist order test failed until the README and checklist were changed. Green after: `docsScan.test.ts` 98 passed; audit counts below; `grep -c "Amended by 0022 (PD-069)"` 0005 2, 0007 1, 0013 2, 0015 1, 0016 7, 0017 2, 0018 13, 0019 12, 0020 19 (the §5 table rows, none fewer); `git diff 20a1e68 -- docs/product/product-decisions.md` holds only PD-076 of the orchestrator's `428fb19`. Final gates: eslint 0 warnings, tsc and tsc -p src/webview clean, test:unit 2418 passed (3 skipped, +13 timing), `npm run compile` and `npm run compile-tests` clean. `npm test` (host smoke) and AC-019, AC-020, AC-021, AC-025 are manual or Windows and CI: the orchestrator's harness, then Gregor.
- **Notes:** (1) §5 notes: one `*Amended by 0022 (PD-069): ...*` line under each named statement (bullet, paragraph or table), after any earlier note; the PD register is unedited here. (2) Docs: README (tree groups with Ready, the divider and its reset, the remembered width, the back button, the primary and icon Copies), ux-guidelines rows 18 and 21, release checklist (new 0022 section with AC-019, AC-020, AC-021 build part, AC-025; two Overview and tree items reworded), CHANGELOG (two bullets edited, one added), design-brief (two superseded notes); each "Up next" left is the Overview's set (listed in `## Test-title audit`). The README avoids the word "drag" because 0017's move-path scan forbids it. (3) `/sdd-architecture-update` with the plan's approval: `last reconciled` to `(0022)` in `AGENTS.md` and the three maps, the snapshot lines named in the step, plus the core, webview and adapters map lines. (4) Memory Bank: techContext (one 0022 line, 0019 drawer sentences marked superseded), systemPatterns (one 0022 entry, 0018 and 0019 clauses marked superseded), activeContext. (5) The test-title audit script is `/tmp/audit-0022/titles.py` (throwaway).

## Fix round (after the compile of 2026-11-18, head `7cb4491`)

Work order: the compile report (D1–D4, six surviving mutants, exploratory findings, intended document edits 1–7) and the
orchestrator's harness round 1 (V1 = D3). Gregor's request: append fix steps and implement them all. No spec revision: every
step restores a criterion the spec already states. Mutant checks run on a scratch copy of the working tree (`/tmp/fix0022/`),
never on the repository.

### T-012 — The webview draws the motif the state table names (D1)

- **Covers:** AC-026 (§4.8 "no surface maps a state itself", §9)
- **Deletes:** the state keys `Backlog`, `Ready`, `Active`, `Review`, `Done`, `Blocked` of `PATHS` in `src/webview/board/icons.tsx` (replaced by `MOTIF_PATHS`, keyed by motif)
- **Do:** `StateIcon` and `Glyph` with a state kind draw `MOTIF_PATHS[STATE_LOOK[state].motif]`. New `src/webview/board/icons.test.tsx`: for every state and every motif of the table, with `STATE_LOOK[state]` set to that motif, `StateIcon` and `Glyph` draw the path of the motif's own owner; every motif has its own glyph; control with the unchanged table.
- **Verify:** `npx vitest run --project webview src/webview/board/icons.test.tsx` red, then green; gates 1–4
- [x] **Verified (T-012):** 2026-11-18, red first: `npx vitest run --project webview src/webview/board/icons.test.tsx` against the unchanged `icons.tsx`: 6 failed (one per state, `Active as eye` still the play triangle), 2 passed (the motif-has-a-glyph test and the control). Green after the code: 8 passed; `npx vitest run --project webview` 430 passed; gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2426 passed, 3 skipped (+13 timing) (2418 + 8).
- **Notes:** `Glyph kind="Blocked"` (card) and `kind="Backlog"` (panel state S3) also follow the table, so there is exactly one place where a state meets its shape. `data-icon` keeps the state name.

### T-013 — A Problems row title is never cut in the wide container (D2)

- **Covers:** AC-003 (§4.1 "A Problems row cuts nothing at any width")
- **Do:** in `@container ov-list (width > 686px)` of `main.css`, `.ov-problems .ov-title` gets `overflow: visible; overflow-wrap: break-word; text-overflow: clip; white-space: normal` after the shared `.ov-row .ov-title`. New `src/webview/areas/overview/problemsCss.test.tsx`: renders the Overview with a Now row and a Problems row, matches every rule of the stylesheet against the real title element (`rulesMatching`), reduces the wide-container and unscoped rules to the effective value by specificity and order, and asserts no `nowrap`, `ellipsis` or `hidden` for the Problems title; control: the same reduction sees all three on the Now row title; the reduction helper is tested on its own.
- **Verify:** `npx vitest run --project webview src/webview/areas/overview/problemsCss.test.tsx` red, then green; gates 1–4
- [x] **Verified (T-013):** 2026-11-18, red first: the new file against the unchanged `main.css`: 1 failed (`expected 'nowrap' not to be 'nowrap'`, the wide rule `.ov-row .ov-title` reaches the Problems title), 2 passed (control and helper). Green after the rule: 3 passed; `webviewCss.test.ts` 70 passed; gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2429 passed, 3 skipped (+13 timing).
- **Notes:** The test sits in the webview project because it needs the rendered DOM; the node-side AC-003 test only looked at selectors that name `.ov-problems` or `.ov-line`, which is why D2 slipped through. The effective-value helper is a small cascade model (specificity = count of class, attribute and pseudo parts, then source order); it is enough for these rules and has its own test.

### T-014 — The Overview rows tint their state icon (D3, harness V1)

- **Covers:** AC-026 (§4.8 colour column for Overview rows), AC-019 (the harness's V1)
- **Do:** `main.css`: `.ov-state-icon .icon { color: var(--fs-tint) }`; the five `[data-tint]` rules already map the colour IDs. `webview/testing/css.ts` gets `effectiveValue` (the cascade helper of T-013, moved there). New `src/webview/areas/overview/rowTint.test.tsx`: Now, Up next and Problems rows of all six states; for each icon the effective `color` is `var(--fs-tint)` and the effective `--fs-tint` is the literal variable of §4.8 (Active `charts-green`, Review `charts-orange`, Blocked `charts-red`, Ready `charts-blue`, Backlog and Done `descriptionForeground`); control: without `data-tint` no state colour reaches the icon.
- **Verify:** `npx vitest run --project webview src/webview/areas/overview/rowTint.test.tsx` red, then green; gates 1–4
- [x] **Verified (T-014):** 2026-11-18, red first: `npx vitest run --project webview src/webview/areas/overview/rowTint.test.tsx src/webview/areas/overview/problemsCss.test.tsx` against the unchanged stylesheet: 6 failed (every state, `color` undefined), the control and the 3 T-013 tests passed. Green after the rule: 75 passed in `src/webview/areas/overview`; gates: eslint 0 warnings, both `tsc` clean (the helper takes a `{ matches }` shape, not `Element`, because `testing/css.ts` is also compiled by the root project), `npm run test:unit` 2436 passed, 3 skipped (+13 timing).
- **Notes:** the rule sits on the svg (`.icon`), where `data-tint` already sets `--fs-tint`; no new colour ID, no state name in a selector (0022 AC-026 test keeps passing). The harness round 2 repeats the look in Dark, Light and High Contrast.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-007 | `src/webview/main.css`, `src/webview/App.tsx`, `src/webview/areas/overview/SpecRow.tsx`, `src/webview/testing/css.ts` | `webviewCss.test.ts` (0022 AC-001, AC-003, AC-027, AC-028 describes), `ListOrDetail.test.tsx` | built |
| AC-002 | T-007, T-008 | `src/webview/main.css`, `src/webview/ui/PathText.tsx`, `src/webview/detail/{SpecDetail,NextStep}.tsx`, `src/webview/board/Card.tsx`, `src/webview/areas/overview/SpecRow.tsx` | `PathText.test.tsx`, `SpecDetail.test.tsx`, `SpecBoard.test.tsx`, `webviewCss.test.ts` (0022 AC-001 and AC-002) | verified |
| AC-003 | T-007, T-008 | `src/webview/main.css`, `src/webview/detail/SpecDetail.tsx`, `src/webview/board/Banner.tsx`, `src/webview/areas/overview/{Problems,SpecRow}.tsx` | `webviewCss.test.ts` (0022 AC-003), `SpecDetail.test.tsx`, `Overview.test.tsx` | verified |
| AC-004 | T-009 | `src/core/shell/specTree.ts`, `src/shared/protocol/texts.ts` (X-05) | `specTree.test.ts` (0022 AC-004) | verified |
| AC-005 | T-009 | `src/core/shell/treeLabel.ts`, `src/core/shell/specTree.ts`, `src/test/shell.smoke.test.ts` (AC-019 expectation) | `treeLabel.test.ts`, `specTree.test.ts` (0022 AC-005) | verified |
| AC-006 | T-010 | `src/core/shell/specTree.ts`, `src/adapters/vscode/studioTree.ts`, `src/shared/protocol/texts.ts` (X-01…X-03) | `specTree.test.ts`, `studioTree.test.ts` | verified |
| AC-007 | T-010 | `src/core/shell/specTree.ts`, `src/webview/areas/overview/Now.tsx` (X-07) | `specTree.test.ts` (0022 AC-007), `sourceScan.test.ts` (0022 AC-007), `Sections.test.tsx` | verified |
| AC-008 | T-010 | `src/core/board/filters.ts`, `src/shared/protocol/board.ts`, `src/webview/board/Column.tsx`, `src/webview/main.css` | `filters.test.ts`, `boardFilter.test.ts`, `SpecBoard.test.tsx` | verified |
| AC-009 | T-010 | `src/core/shell/specTree.ts`, `src/shared/protocol/texts.ts` | `specTree.test.ts` (group IDs hold neither count) | verified |
| AC-010 | T-006 | `src/webview/ui/CopyButton.tsx`, `src/webview/main.css` | `CopyButton.test.tsx`, `webviewCss.test.ts` (0022 AC-010, AC-012) | verified |
| AC-011 | T-006 | `src/webview/detail/NextStep.tsx`, `src/webview/areas/overview/{Now,Overview,SpecRow}.tsx`, `src/webview/areas/SpecBoard.tsx`, `src/webview/board/Card.tsx` | `src/webview/primaryButtons.test.tsx` | verified |
| AC-012 | T-006 | `src/webview/ui/CopyButton.tsx`, `src/webview/board/icons.tsx`, `src/webview/main.css` | `CopyButton.test.tsx`, `webviewCss.test.ts` (0022 AC-010, AC-012) | verified |
| AC-013 | T-005, T-008, T-009 | `src/core/lifecycle/problemSentence.ts`, `src/core/board/{detail,cards}.ts`, `src/core/overview/problems.ts`, `src/core/shell/specTree.ts`, `src/webview/detail/SpecDetail.tsx`, `src/webview/board/Banner.tsx`, `src/webview/areas/overview/{Problems,SpecRow}.tsx` | `problemSentence.test.ts`, `detail.test.ts`, `cards.test.ts`, `problems.test.ts`, `specTree.test.ts`, `SpecDetail.test.tsx`, `Overview.test.tsx`, `SpecBoard.test.tsx`, `userLanguage.test.tsx` | verified |
| AC-014 | T-005 | `src/core/lifecycle/problemSentence.ts`, `src/shared/protocol/texts.ts` (X-10…X-24) | `src/core/lifecycle/problemSentence.test.ts` (AC-014 describe) | verified |
| AC-015 | T-008 | `src/webview/ui/FileLink.tsx`, `src/webview/detail/SpecDetail.tsx`, `src/webview/areas/overview/SpecRow.tsx` | `SpecDetail.test.tsx`, `Overview.test.tsx` | verified |
| AC-016 | T-011 | `.specs/{done,active}/0005, 0007, 0013, 0015–0020` (the §5 notes) | `docsScan.test.ts` (0022 block: 2, 1, 2, 1, 7, 2, 13, 12, 19 notes); PD register unedited by this branch | verified |
| AC-017 | T-011 | all of `src` (no staying test weakened) | `## Test-title audit` of this plan: 34 absent, 0 decreased, each mapped; `npm run test:unit`; `npm test` on Windows and CI is the pre-done gate | verified |
| AC-018 | T-011 | `README.md`, `docs/product/ux-guidelines.md`, `docs/release-checklist.md`, `CHANGELOG.md`, `docs/product/design-brief.md` | `docsScan.test.ts` (0020 group test, 0022 block) | verified |
| AC-019 | T-011 | `docs/release-checklist.md` (Layout and signal polish (0022)) | manual: orchestrator's harness, then Gregor | open |
| AC-020 | T-011 | `docs/release-checklist.md` (Layout and signal polish (0022)) | manual: Gregor or delegate, real VS Code | open |
| AC-021 | T-011 | `docs/release-checklist.md` (build part) | manual: Gregor on `tip-splitter` (draft part done: PD-073) | open |
| AC-022 | T-001, T-003 | `src/webview/main.css` (html/body/#root, main, `.area-frame`, `.area-content`, `.side-panel`), `src/webview/App.tsx` | `src/adapters/node/webviewCss.test.ts` (0022 AC-022 describe) | verified |
| AC-023 | T-003 | `src/webview/detail/Divider.tsx`, `src/webview/detail/sideWidth.ts`, `src/webview/App.tsx` | `src/webview/detail/Divider.test.tsx` (AC-023 describes), `webviewCss.test.ts` (0022 G-2) | verified |
| AC-024 | T-002, T-003 | `src/shared/protocol/layout.ts`, `src/core/shell/sidePanelWidth.ts`, `src/core/shell/shellService.ts`, `src/webview/detail/sideWidth.ts`, `src/adapters/vscode/uiMemory.ts` | `layout.test.ts`, `sidePanelWidth.test.ts`, `messages.test.ts`, `client.test.ts`, `Divider.test.tsx` (AC-024) | verified |
| AC-025 | T-011 | `docs/release-checklist.md` (Layout and signal polish (0022)) | manual: orchestrator's harness, then Gregor | open |
| AC-026 | T-004 | `src/shared/protocol/stateLook.ts`, `src/core/shell/specTree.ts`, `src/webview/board/icons.tsx`, `src/webview/ui/StateChip.tsx`, `src/webview/board/Column.tsx`, `src/webview/main.css` (Overview rows: T-007) | `stateLook.test.ts`, `specTree.test.ts`, `StateChip.test.tsx`, `SpecBoard.test.tsx`, `webviewCss.test.ts` (0022 AC-026) | built |
| AC-027 | T-007 | `src/webview/areas/overview/SpecRow.tsx`, `src/webview/main.css` | `Sections.test.tsx`, `webviewCss.test.ts` (0022 AC-027) | verified |
| AC-028 | T-007 | `src/webview/main.css` | `webviewCss.test.ts` (0022 AC-028) | verified |
| AC-029 | T-001 | `src/webview/App.tsx`, `src/webview/detail/narrow.ts`, `src/webview/detail/BackButton.tsx`, `src/webview/detail/SidePanel.tsx`, `src/webview/detail/SpecDetail.tsx` | `src/webview/detail/ListOrDetail.test.tsx` | verified |

## Session handoff

- **Done so far:** all 11 steps (T-001…T-011) built and verified 2026-11-18 on branch `ux-round-2`; plan Done, spec stays In Progress. Gates green (eslint 0 warnings, both tsc clean, unit 2418 passed, 3 skipped, +13 timing; compile and compile-tests clean). Test-title audit: 34 absent, 0 decreased, all mapped.
- **Next action:** the orchestrator's preview harness for AC-019 and AC-025 (layout that jsdom cannot decide), `npm test` on Windows and CI (host smoke AC-019 of 0020 now expects `0001 Restaurant-Rec…` and `/sdd-compile`), Gregor's AC-020 and AC-021 on `tip-splitter`, then `/sdd-compile`.
- **Open decisions:** none; the proxy decisions P-1…P-22 stand, new ones are in the steps' `Notes:`.
- **Baseline:** `20a1e68`.
- **Environment:** host smoke runs on Windows and CI only (VS Code download blocked here); layout is checked in the orchestrator's preview harness.
