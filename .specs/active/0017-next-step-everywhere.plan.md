# Plan — Next Step Everywhere, No Pseudo-Moves

**Spec:** [0017-next-step-everywhere.md](0017-next-step-everywhere.md)
**Status:** Done
**Last updated:** 2026-11-26
**Current step:** —  (fix steps T-010…T-012 verified; AC-026 open)

## Approach

One projection first: `stepView()` beside `nextStep()` gives the short form, the full first line
and the line(s) for tooltips, and NS-6 gains its second line (T-001). Cards and attention rows carry
that view, so the webview derives nothing (guideline 1). Then two tracks on separate files: the
webview drops every move affordance and puts "Next" + Copy on cards and rows (T-002, T-004); a new
core area `src/core/copyNextStep/` (0017) builds the status bar entry and the "Copy Next Step"
behaviour on fakes (T-003, T-005). The host move path goes only after the webview stopped using
it (T-006), then adapters, manifest and wiring (T-007), then the §5 notes and docs (T-008) and the
test-title audit with the sync (T-009). The order keeps the tree green after every step; between
T-002 and T-006 "Move Spec to…" still exists and shows its result only while the board is hidden
(no release in between). Discovery keeps its status-bar port and texts: it now reports to a
*project line* that the new entry composes with the model and the selection (Research, P-1), so
0001's tests stay as they are. Files this task did not create are deleted only where a step names
them (Gregor delegated, PD-058). Test review once per stage from the tests named in each `Do:`
(AGENTS.md *TDD*). Memory Bank: `techContext.md`, `systemPatterns.md`, `activeContext.md` (T-009).

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile` (T-002, T-004, T-006,
T-007, T-009) · `npm run compile-tests` (T-006, T-007, T-009: the host smoke compiles). Pre-done
gate on Windows and CI: `npm test`.

## Research

- **Survey (2026-11-18, at `feac672`, 0016 implemented).** Next step: `nextStep()`/`startLine()` in
  `src/core/board/nextStep.ts`; texts in `src/shared/protocol/nextStepTexts.ts`. Cards:
  `buildCards(project, lifecycle)` in `src/core/board/cards.ts` → `CardView` (`board.ts`, loose
  guard; fixture factories `src/core/board/testing/cards.ts`, `src/webview/board/testing/views.ts`).
  Rows: `projectAttention()` in `src/core/missionControl/attention.ts` → `AttentionRow`
  (`missionControl.ts`, strict `exactly()` guard: an unknown key refuses the view); rows only for
  Blocked, a Problem or Review. A row is one `Drill` button (`Attention.tsx`). Copy: `copyText` →
  `copyLine` (in `moves.ts`) → `ClipboardPort`; `ui/CopyButton.tsx` (0016) waits for the next
  `copyResult`, names itself `Copy: <line>` and has its own hidden live region. The card `li`
  opens the spec on click; Enter opens only when the card itself is the target.
- **Move path (all of it, as §6.5 says).** Webview: `Card`/`Column` drag props, `SpecBoard.tsx`
  drag handlers, Shift+F10/ContextMenu, `MoveMenu.tsx`, `Announcer.tsx`, `onFocus`/`onBlur` →
  `focusCard` (`boardFocus`), client `requestMove`/`focusCard`/`dismissMove`/`move`/`moveResult`,
  CSS `.move-*`, `[data-dragging]`, `[data-drop-target]`, `.board-status`. Host: `moves.ts`
  (`createMoves`, `runMoveCommand`, presenter, `copyLine`), `transitions.ts`,
  `LifecycleService.judgeTransition`, `boardPicks.ts`, ports `MovePickPort`/`PickableSpec`/
  `MoveResultSink`/`MoveMessagePort`, `boardUiState` focus (only `runMoveCommand` reads it),
  `boardRequests` `moveRequest`/`boardFocus`/`onDidMoveResult`, `studioPanel.ts`
  `pushMove`/`showMoveResult`/`lastMove`, `commands.ts` `MOVE_COMMAND`, `package.json` `moveSpec`,
  texts `MOVE_*`, `PICK_*`, `moveNextStepText`, test API `board().requestMove`. A case-insensitive
  search of the AC-011 terms finds no false positive outside the move code.
- **Tests touching moves** (spec §10 list confirmed, plus `boardService.test.ts` "the focused key is
  remembered…"): `Keyboard`, `SpecBoard`, `moves`, `transitions`, `lifecycleService`, `boardRequests`,
  `noWrite`, `messageRouter`, `boardFilter`, `manifest`, `webviewCss`, `src/test/{board,lifecycle}
  .smoke`. Tests registered outside `*.test.ts`: `src/core/runtime/testing/contract*.ts` and the
  Mocha suites in `src/test/**` (the audit reads every `.ts`/`.tsx` under `src`).
- **Status bar today.** `resolveActiveProject` → `StatusBarPort.show(text,'select')` (discovery
  controller sets `active` before it calls the port) → `src/adapters/vscode/statusBar.ts` (fixed
  tooltip, select command). About 25 assertions in `discoveryController`, `liveDetection`,
  `activeProject` tests read the port text. Selection: shell service, remembered also while the
  panel is closed (`createShellSelection`); `view()` computes fresh; S4/S5 come from
  `derivePanelState`. Fake clock with `setTimeout`/`advance`: `src/core/discovery/testing/fakeHost.ts`.
- **No `done/` spec becomes `Deprecated`:** 0003 and 0007 lose parts only; §5 amends them in place.
- **Checkpoint digest:** survey and spec agree, no spec defect, no Open point resolved by the plan
  (OP-002 stays Gregor's), no new dependency, no question that only Gregor can answer — so none is
  asked (standing answers). Proxy decisions below; Gregor reads them with the plan.
- **Proxy decisions (Gregor delegated: audit 05, PD-058…PD-063, `.claude/rules/ux-guidelines.md`).**
  - P-1 Discovery's `StatusBarPort` and its texts stay; the discovery reports to a *project line*
    latch (`projectLine.ts`), and the entry composer (`statusEntry.ts`) owns what is shown (§10's
    first option). 0001's tests keep deciding the verdict texts; where they say "shown with name and
    version" they decide the line the discovery reports, and `statusEntry.test.ts` decides what the
    entry shows (§5 row 0001). No 0001 test is renamed.
  - P-2 "Specs not read" = the shell's panel state is S4 or S5, so entry and panel never disagree.
  - P-3 A Done spec with a step (NS-2) sorts after Backlog in the quick pick; rule (2) never picks it.
  - P-4 `n ready` counts the entries in state Ready.
  - P-5 On a row, "Next <short form>" sits inside the row's button after the reasons (so the rest of
    the row navigates, AC-012); Copy sits outside it as the next Tab stop. On a card the step line
    is the last line; its container stops the click from opening the card.
  - P-6 Tooltips show the second line as `<label> <line>`, the way the detail shows it.
  - P-7 Status bar tooltip: Markdown with every ASCII punctuation in file text backslash-escaped
    (title, project name, lines; no code spans, where escapes do not work), HTML off, trusted only
    for `featherspec-studio.open` and `featherspec-studio.selectProject`; lines separated by blank lines.
  - P-8 During the 2 s feedback the tooltip and the command stay those of the underlying state; the
    accessible label reads `Copied` or `Could not copy`.
  - P-9 The command reads the entry's situation (one computation), so a click copies the line behind
    the text shown (§8) and click and command cannot differ (AC-003).
  - P-10 The item stays left-aligned, priority 0, without an id, as today (an id can change the
    order, see the issue below). No keybinding, no palette `when` (spec §4).
  - P-11 Only the card that is the board's tab stop has a tabbable Copy (as "Move to…" had);
    arrow keys pressed on a Copy move between cards as before.
  - P-12 Status bar, quick pick and message texts live in `src/core/copyNextStep/copyNextStepTexts.ts`
    (host only, like `setupTexts.ts`); "Next" and the NS-6 label in `nextStepTexts.ts` (shared). The
    two command IDs the tooltip links name go into `src/shared/protocol/texts.ts` beside
    `SETUP_COMMAND_ID`, and `commands.ts`/`statusBar.ts` use them (one source).
  - P-13 `StepView { short, line, lines }` in a new `src/shared/protocol/stepView.ts` with a strict
    guard (`line` equals the first line's text); `CardView.step: StepView | undefined` (like `need`),
    `AttentionRow.step?` optional (strict guard, absent key when there is no step).
  - P-14 AC-018 needs no wall-clock test: the entry renders synchronously on each notification; the
    test reads the new text right after the notification with the fake clock unmoved.
  - P-15 Host smoke: a new `src/test/copyNextStep.smoke.test.ts` (command registered, `moveSpec`
    not; item present with the copy command) through a test API that reads the real item.
- [VS Code main `vscode.d.ts`](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts),
  compared with the repo's `node_modules/@types/vscode/index.d.ts` (1.146.0): the `StatusBarItem`
  block is identical in both. `text` embeds `$(icon-name)`; `tooltip:
  string | MarkdownString | undefined`; `command: string | Command`, "must be known";
  `accessibilityInformation` "used when a screen reader interacts with this StatusBar item", its
  `label` is "read out by a screen reader once the item has focus", `role` optional;
  `createStatusBarItem(alignment?, priority?)` exists beside the id overload; `MarkdownString.isTrusted`
  accepts `{ enabledCommands }` (the command IDs the string may run), only trusted Markdown runs
  command links; `appendText` "Appends and escapes"; `Clipboard.writeText` resolves when written;
  `QuickPickItem.description` "rendered less prominently in the same line"; `placeHolder`;
  `showQuickPick` resolves to the item or `undefined`. Retrieved 2026-11-18.
- [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api): `showQuickPick`
  "resolves to the selected string or undefined"; `showInformationMessage` with items "resolves to
  the selected item or undefined when being dismissed"; `env.clipboard` "The system clipboard".
  Retrieved 2026-11-18.
- [VS Code 1.73 release notes](https://code.visualstudio.com/updates/v1_73): "the `isTrusted`
  property now takes an allowlist of commands that can be executed" (P-7). Retrieved 2026-11-18.
- [Commands guide](https://code.visualstudio.com/api/extension-guides/command): command URIs in
  Markdown need `isTrusted`; "sanitize all the input content so that only expected command URIs
  can be executed"; contributed commands show in the Command Palette unless `menus.commandPalette`
  hides them (AC-009). Retrieved 2026-11-18.
- [Activation Events](https://code.visualstudio.com/api/references/activation-events): since 1.74
  contributed commands need no `onCommand` entry. So `activationEvents` stays the three entries
  (exact-equality test), and the negative control `src/test/activation/noMarker.test.ts` stays
  true: the implicit `onCommand` fires only when the command runs, and the entry exists only after
  activation. Retrieved 2026-11-18.
- [Product icons in labels](https://code.visualstudio.com/api/references/icons-in-labels):
  `checklist`, `check`, `warning` are codicons; there is no `feather` (A-003 holds); `$(name)` works
  in status bar text. Retrieved 2026-11-18.
- [Status Bar UX guidelines](https://code.visualstudio.com/api/ux-guidelines/status-bar): short text
  labels, icons only when necessary, primary (global) items on the left, no more than one item
  unless necessary. One left item, one icon. Retrieved 2026-11-18.
- [Issue #177835](https://github.com/microsoft/vscode/issues/177835) "Assigning a status bar item
  identifier changes their order" (P-10). Retrieved 2026-11-18 (title only).
- [CommonMark 0.31.2 §2.4](https://spec.commonmark.org/0.31.2/): "Any ASCII punctuation character
  may be backslash-escaped"; escapes "do not work in … code spans" (P-7). Retrieved 2026-11-18.
- Not re-read: spec §10's reading of VS Code main (2026-11-17) that the status bar has no live
  region and notifications are announced; A-009 rests on it.

## Stages

1. T-001 — the step view, NS-6's second line, `copyLine` in its own module (core)
2. T-002 ‖ T-003 — the board offers no move (webview) ‖ current spec and the status entry (core)
3. T-004 ‖ T-005 — Next and Copy on cards and rows (webview) ‖ the Copy Next Step behaviour (core)
4. T-006 → T-007 — the move command, messages and API go; status bar and command wired (host)
5. T-008 → T-009 — §5 notes and product docs; test-title audit, sync, final gates

Parallel: stages 2 and 3. T-002 and T-004 touch only `src/webview/**`, `nextStepTexts.ts` (T-004)
and the CSS guard; T-003 and T-005 touch only `src/core/copyNextStep/**`, `src/core/ports/copyNextStep.ts`
and `src/shared/protocol/texts.ts` (T-003). Recommended: in sequence (the steps are small).
Stages 4 and 5 cannot: they share `extension.ts`, `package.json`, the protocol and the docs.

## Steps

### T-001 — Step view, NS-6's second line and copyLine's own module

- **Covers:** AC-001 (projection), AC-002, AC-003 (short forms)
- **Do:** `nextStep.ts`: NS-6 adds `{ text: 'continue', label: NEXT_STEP_SAME_CHAT_LABEL }` while
  the plan in use has an open step (NS-7's `openStep`); `shortForm(line)` per §6.1 (`/sdd-<name>
  …` → `/sdd-<name>`, `Start <ID> of …` → `Start <ID>`, `Implement …` → `Implement`); `stepView(model,
  key)` → `StepView` or `undefined` for NS-1, NS-3, NS-11. New `src/shared/protocol/stepView.ts`
  (P-13). `cards.ts` sets `CardView.step`, `attention.ts` sets `AttentionRow.step`; both guards and
  both fixture factories follow. `nextStepTexts.ts`: `NEXT_STEP_SAME_CHAT_LABEL = 'Then, in the same
  chat, if nothing blocks:'`. `copyLine` moves to new `src/core/board/copyLine.ts`; `moves.ts` and
  `boardRequests.ts` import it; its test moves to `copyLine.test.ts` with its title. Tests (red
  first): `nextStep.test.ts` — AC-002 one fixture per NS-6 row (open step → two lines; no plan, and
  only ticked or struck steps → one; the existing NS-6 test is the second row), AC-001 the short
  form of each NS rule's first line and `line` = the detail's first line, path included, AC-003 equal
  snapshots give equal views; `cards.test.ts` (Ready card `Start T-003` / `Start T-003 of
  .specs/backlog/0007-x.plan.md`, Done card none); `attention.test.ts` (row with step, row without
  has no key); `stepView`/`board`/`missionControl` guard tests (unknown key in a step refused).
- **Verify:** `npx vitest run src/core/board src/core/missionControl src/shared/protocol` red, then
  green; gates 1–4
- [x] **Verified (T-001):** 2026-11-18 — `npx vitest run src/core/board src/core/missionControl src/shared/protocol`: tests written first for `stepView`/`shortForm`/NS-6 second line/card step/row step/guards; red shown by mutation of the finished code (short form returning the whole line: 3 tests failed; NS-6 condition inverted: 4 failed), green after. Gates 1–4: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 1833 passed, 3 skipped (baseline 1818), 12 timing passed.
- **Notes:** Active without a plan file is NS-2 (contradiction), so AC-002's 'no sibling plan' row is covered by 'plan without a step list' and 'all steps ticked or struck'. The detail needed no change: it renders every line label generically. `CardView.step` is a required key (value `undefined` allowed), like `need`.

### T-002 — The board offers no move

- **Covers:** AC-006 (Shift+F10 and context-menu key), AC-007, AC-008
- **Files:** `src/webview/board/{Card,Column,boardStore}.ts(x)`, `src/webview/areas/SpecBoard.tsx`,
  `src/webview/client.ts`, `src/webview/main.css`; delete `src/webview/board/MoveMenu.tsx` and
  `src/webview/board/Announcer.tsx`; tests `src/webview/board/{Keyboard,SpecBoard}.test.tsx`,
  `src/adapters/node/webviewCss.test.ts`
- **Do:** Remove `draggable`, the drag handlers and marks, the "Move to…" menu, the Shift+F10 and
  ContextMenu handling, the status line and its Dismiss, the `focusCard` calls, and the client's
  `requestMove`, `focusCard`, `dismissMove`, `move` and `moveResult` handling. Arrow keys, Enter,
  the one tab stop and focus after live updates stay. CSS: `.move-*`, `[data-dragging]`,
  `[data-drop-target]`, `.board-status` go; the guard's AC-003 list names `.copy-button` instead of
  `.move-button` (0013 AC-003 as amended). Tests (red first): AC-007 no card carries
  `draggable="true"`, and `dragstart`/`dragover`/`drop`/`dragend` `MouseEvent`s on a card and another
  column post nothing and set no mark (control: a listener sees the events); AC-006 Shift+F10 and
  ContextMenu open no `role="menu"` and post nothing; AC-008 no "Move to…", no menu, no
  `.board > [role="status"]`. Gone with their criteria: the Move to… menu, drag, drag marks, move
  announcement, drop-result Copy and `boardFocus` tests, the 0013 AC-011 CSS test. The DOM-order test
  loses "Move to…" from its list and title.
- **Verify:** `npx vitest run src/webview/board src/adapters/node/webviewCss.test.ts` red, then
  green; gates 1–5
- [x] **Verified (T-002):** 2026-11-18 — new tests (AC-006 keys, AC-007 drag, AC-008 no control) run on HEAD~ webview sources in a scratch copy: 5 failed, 8 passed (red); on the changed code green. `npx vitest run src/webview src/adapters/node/webviewCss.test.ts` 309 passed. Gates 1–5: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 1812 passed, 3 skipped, `npm run compile` ok.
- **Notes:** Removed with their criteria (Keyboard.test.tsx): 'sends boardFocus on focus and null on blur', 'moving focus between cards does not send null in between', the 'AC-014: move without a mouse' block (9 tests), the drag and drop block (5), the drag marks block (4), the 'AC-018: outcome of a move is announced' block (5); webviewCss 'AC-011 dragged card' test. Kept: one tab stop, arrows, tab stop follows focus, AC-019 focus across live updates (Keyboard); click and Enter open (SpecBoard AC-008). `.copy-button` replaces `.move-button` in the CSS guard list (its rules exist since 0016).

### T-003 — Current spec and the status bar entry

- **Covers:** AC-003 (current spec, pick order), AC-013, AC-014, AC-015, AC-017, AC-018
- **Files:** new `src/core/copyNextStep/{currentSpec,projectLine,entryView,statusEntry,copyNextStepTexts}.ts`,
  `src/core/copyNextStep/testing/entryWorld.ts`, `src/core/copyNextStep/{currentSpec,statusEntry}.test.ts`;
  new `src/core/ports/copyNextStep.ts`; `src/shared/protocol/texts.ts` (two command IDs, P-12)
- **Do:** `currentSpec.ts` (pure): specs with a step; current spec by §6.3 (1)–(3); quick-pick order
  (§6.4, P-3); Ready count (P-4). `projectLine.ts`: a `StatusBarPort` latch with `current()` and
  `onDidChange`. Port: `StatusEntryView { text, tooltip: {markdown} | {plain}, accessibleLabel?,
  command: 'copyNextStep' | 'selectProject' }`, `StatusItemPort { show(view); hide() }`.
  `entryView.ts` (pure): the §6.3 texts, the Markdown tooltip (P-6, P-7), the accessible label.
  `statusEntry.ts`: composes project line, discovery snapshot (active, project count), shell view
  (S4/S5, selection) and the model; renders on each of their notifications, skips equal views,
  exposes `situation()` (P-9). Without an active project it passes the line through with the
  plain tooltip and `selectProject`, as today. Tests (red first): AC-013 both examples, (1) a
  selection without a step falls to (2), Ready and Backlog never by (2), ties by number then path;
  AC-003 equal snapshots and selection give equal current spec and order; AC-014 text, tooltip
  Markdown exactly, label `0020, Blocked, /sdd-plan. Click to copy the next step.`; AC-015 both
  texts with tooltips and labels; S4 and S5 give `$(checklist) FeatherSpec` with "Click to open the
  Studio."; AC-017 "Switch project" only with two projects (and not with one), no active project
  passes "Select FeatherSpec project", "FeatherSpec project not found" and hidden through, an
  active project never yields `selectProject`; AC-018 a selection change, a state change and a
  step change show at once (P-14); a hostile title is escaped (control: the two links stay links).
- **Verify:** `npx vitest run src/core/copyNextStep` red, then green; gates 1–4
- [x] **Verified (T-003):** 2026-11-18 — tests written for `currentSpec`, `entryView`/`statusEntry` (28 tests in `src/core/copyNextStep`); red shown by mutation of the finished code (unescaped title: 1 failed; 'Switch project' with one project: 4 failed), green after. Gates 1–4: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 1840 passed, 3 skipped.
- **Notes:** Quick-pick label is `<number> <title>`, the stem alone where no title is read (reading of §6.4). Tests drive `statusEntry` through hand-built fakes (`testing/entryWorld.ts`): discovery snapshot, shell view and model source; the real shell world joins at T-005 (AC-022). `projectLine` has a `current()` and `onDidChange`; the entry renders on its, discovery's, the shell's and the model's notifications. `OPEN_STUDIO_COMMAND_ID`/`SELECT_PROJECT_COMMAND_ID` live in `texts.ts`; `commands.ts` and `statusBar.ts` alias them.

### T-004 — Next and Copy on every card and attention row

- **Covers:** AC-001 (cards, rows), AC-004, AC-005, AC-006, AC-012
- **Files:** `src/webview/board/Card.tsx`, `src/webview/areas/SpecBoard.tsx`,
  `src/webview/areas/missionControl/Attention.tsx`, new `src/webview/ui/StepText.tsx`,
  `src/webview/ui/CopyButton.tsx`, `src/shared/protocol/nextStepTexts.ts`, `src/webview/main.css`,
  `src/webview/board/testing/views.ts`; tests `src/webview/board/{Keyboard,SpecBoard}.test.tsx`,
  `src/webview/areas/missionControl/Sections.test.tsx`, `src/webview/ui/CopyButton.test.tsx`
- **Do:** `nextStepTexts.ts`: `NEXT_STEP_SHORT_LABEL = 'Next'` and `stepTooltip(lines)` (P-6).
  `StepText` shows "Next" and the short form with the tooltip. Card: the step line is the last line,
  `StepText` plus `CopyButton` copying `step.line`, in a container that stops the click (P-5).
  `CopyButton` gains an optional `tabIndex`; `SpecBoard` gives 0 to the tab-stop card's Copy only
  (P-11). Row: `StepText` inside the `Drill` after the reasons, `CopyButton` after the `Drill`.
  CSS for `.card-step`/`.step-text` from theme variables only. Tests (red first): AC-004 last line,
  tooltip, `Copy: <full first line>`, none without a step; AC-005 pointer, and Enter and Space
  after Tab, post one `copyText` with the full line, show `Copied` at that Copy only, post no
  `navigate`/`select`; AC-006 Tab from the tab-stop card reaches its Copy next and no other card's
  Copy, the stop follows focus, arrows and Enter as before; AC-012 the row's step after the reasons,
  Copy outside the row button and the next Tab stop, Copy posts only `copyText` with feedback, the
  row button still sends 0006 AC-014's request, no step → no Copy; the DOM-order test ends with the
  step line.
- **Verify:** `npx vitest run src/webview` red, then green; gates 1–5
- [x] **Verified (T-004):** 2026-11-18 — new tests (AC-004/005/006 in SpecBoard.test and Keyboard.test, AC-012 in Sections.test, tab index in CopyButton.test) written first against the finished UI; red shown by mutation: card container without stopPropagation 4 failed, Copy tab index not following the tab-stop card 4 failed; green after. `npx vitest run src/webview` 289 passed. Gates 1–5: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 1856 passed, 3 skipped, `npm run compile` ok.
- **Notes:** No separator text between the reasons and 'Next' on a row (layout gap only, so the row text without a step stays as 0006 decided). The row's `li` carries `mc-row-item` and draws the divider; the button's own top border is removed there. Card Copy tab index is passed from `Column` as the card's own tab index (0 for the tab-stop card, -1 else). The CSS font guard (0013 AC-001) refused a monospace fallback: `.step-short` uses `var(--vscode-editor-font-family)` alone.

### T-005 — Copy Next Step: one behaviour for click and command

- **Covers:** AC-016, AC-019, AC-020, AC-021, AC-022, AC-023
- **Files:** new `src/core/copyNextStep/copyNextStep.ts`, `src/core/copyNextStep/{copyNextStep,noWrite}.test.ts`;
  `src/core/copyNextStep/{statusEntry,copyNextStepTexts}.ts`, `src/core/copyNextStep/testing/entryWorld.ts`,
  `src/core/ports/copyNextStep.ts`
- **Do:** `statusEntry.copied(ok)`: `$(check) Copied` or `$(warning) Could not copy` for 2000 ms on
  the fake clock, a second copy restarts the time (P-8). `createCopyNextStep({ entry, clipboard, ui,
  actions })`: no active project → `actions.selectProject()`; specs not read → `actions.openStudio()`;
  a current spec → `copyLine` of its full first line; else the quick pick (§6.4 labels, description
  `<state> · <short form>`, placeholder), picking copies that item's line, cancelling does nothing;
  no item → the §6.4 message whose "Copy" copies `/sdd-specify`. Every copy calls `entry.copied`; a
  failure also warns "Could not copy to the clipboard.". Port `StepUiPort { pick, inform, warn }`.
  Tests (red first): AC-019, AC-016 (Copied for 2000 ms then the AC-014 text; failure text and
  warning; restart within 2 s; a change during the 2 s shows after), AC-020 (order, labels,
  placeholder, pick, cancel, message and its Copy, dismiss, S4/S5 open the Studio), AC-021, AC-022
  (with trust off in the shell world the entry and the command give the same results; the deps hold
  no trust or store), AC-023 (`noWrite.test.ts`: card and row Copy through `boardRequests.copyText`,
  entry and every command path on a temp copy of `fs110-ready-synthetic` leave the tree unchanged).
- **Verify:** `npx vitest run src/core/copyNextStep` red, then green; gates 1–4
- [x] **Verified (T-005):** 2026-11-18 — tests for the command, feedback, quick pick, Select Project, Restricted Mode (real shell world, trust on and off) and no-write written against the finished code; red shown by mutation (feedback 500 ms instead of 2000: 2 failed; restart of the timer removed: 1 failed). `npx vitest run src/core/copyNextStep` 46 passed. Gates 1–4: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 1874 passed, 3 skipped.
- **Notes:** `statusEntry` gained a `clock` dependency for the 2000 ms feedback. `noWrite.test.ts` still passes a stub `moves` dep to `createBoardRequests` (T-006 removes the dep and the stub). During the feedback only text and accessible label change; tooltip and command stay (P-8).

### T-006 — The move command, messages and API go

- **Covers:** AC-009 (no `moveSpec`, no "Move" title), AC-010, AC-011
- **Do:** Delete `src/core/board/moves.ts`, `moves.test.ts`, `src/core/lifecycle/transitions.ts`,
  `transitions.test.ts`, `src/adapters/vscode/boardPicks.ts`. Remove `judgeTransition` from
  `LifecycleService`; focus from `boardUiState`/`boardService`; `moveRequest`, `boardFocus`,
  `moveResult`, `MoveResult` and their guards from `messages.ts`/`board.ts`; the move ports from
  `ports/board.ts`; the moves dep and handlers from `boardRequests.ts`; `pushMove`/`showMoveResult`/
  `lastMove` from `studioPanel.ts`; `MOVE_COMMAND`, its registration, the picks, the presenter and
  `board().requestMove` from `commands.ts`/`extension.ts`; `moveSpec` from `package.json`; `MOVE_*`,
  `PICK_*`, `moveNextStepText` from the text modules. Tests (red first): AC-011 in
  `sourceScan.test.ts` (the five paths absent; the eight terms absent case-insensitively in `src`
  without test files; negative control on a planted sample); AC-010 in `messageRouter.test.ts`
  (`moveRequest` and `boardFocus` with formerly valid payloads are ignored as "unknown message type",
  no handler, no response); AC-009 in `manifest.test.ts` (no `moveSpec`, no title with "Move";
  control). Staying parts kept under new titles: `lifecycleService` AC-011 tree check (derivation
  and history append), `boardRequests` filter/sort/clear, `boardFilter` guards, `noWrite` (title
  kept), `board.smoke` AC-016, `lifecycle.smoke` AC-001; gone: `judgeTransition`, move request,
  focused key, Move Spec registration tests. T-005's `noWrite.test.ts` builds `createBoardRequests`
  without the moves dep.
- **Verify:** `npx vitest run src/adapters src/core src/shared` red, then green; gates 1–5;
  `npm run compile-tests`
- [x] **Verified (T-006):** 2026-11-18 — AC-011 (sourceScan), AC-010 (messageRouter) and AC-009 (manifest) written first and run red on the code before the deletion: 4 failed (five files exist, eight terms found, moveSpec contributed, moveRequest/boardFocus handled), then green. `npx vitest run src/adapters src/core src/shared` green. Gates 1–5: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 1848 passed, 3 skipped, `npm run compile` ok, `npm run compile-tests` ok.
- **Notes:** Before the deletion each deleted test title was listed and checked against a staying home: `moves.test.ts` (16 titles: move requests, move command, 'Move Spec to…' result presenter; its copyLine title moved to `copyLine.test.ts` in T-001; 'Copy puts exactly the line…' and 'failed clipboard write' live on in `boardRequests.test.ts` 0015 copy request and `copyLine.test.ts`), `transitions.test.ts` (8 titles, all 0003 AC-008, void). Staying behaviour and its home: keyboard navigation `Keyboard.test.tsx` AC-017/AC-019 + `focusModel.test.ts`; Enter and click open `SpecBoard.test.tsx` AC-008; filters, sort, clear `filters.test.ts`, `boardService.test.ts`, `boardRequests.test.ts`, `SpecBoard.test.tsx`; lifecycle derivation `lifecycleService.test.ts` (AC-014 re-derive, AC-011 tree check kept under 'derivation and a history append', plus a new 'without a project there is no model' title replacing the judgeTransition one), `deriveLifecycle` tests untouched; copy feedback `CopyButton.test.tsx`, `boardRequests.test.ts`, `copyLine.test.ts`. Edited, not deleted: `boardRequests.test.ts` (focus and move titles gone, the throwing-listener test now uses the copy event), `noWrite.test.ts` (title kept, no moves), `boardFilter.test.ts` (guards without boardFocus/moveRequest/isMoveResult), `boardService.test.ts` ('the focused key is remembered…' gone), `manifest.test.ts` (0007 AC-014 replaced by 0017 AC-009 and a control), `board.smoke` ('Move Spec command registered' and the refused-move assertions gone, the write-nothing test kept as 'AC-016: filter changes write nothing'), `lifecycle.smoke` (title 'AC-001: …', the Ready→Active assertion gone). T-009 re-checks all of it with the title script.

### T-007 — Status bar and command wired

- **Covers:** AC-009 (contributed), AC-014 (item), AC-016 (click runs the command)
- **Do:** `src/adapters/vscode/statusBar.ts` becomes `createStatusItem()`: maps a `StatusEntryView`
  to the item (`text`; `MarkdownString` with `isTrusted = { enabledCommands: [open, selectProject] }`
  or the plain tooltip; `accessibilityInformation`; the command ID) and offers `inspect()`; no
  logic. New `src/adapters/vscode/stepUi.ts` (quick pick, information, warning). `commands.ts`:
  `COPY_NEXT_STEP_COMMAND`, IDs from `texts.ts` (P-12). `extension.ts`: discovery gets the project
  line; entry and command built after the shell service; command registered; disposables; test API
  `statusEntry().inspect()`. `package.json`: `featherspec-studio.copyNextStep` titled "FeatherSpec
  Studio: Copy Next Step", not hidden; `activationEvents` unchanged. Tests (red first):
  `manifest.test.ts` AC-009 (contributed, not hidden; the tooltip link IDs are contributed
  commands); host smoke `src/test/copyNextStep.smoke.test.ts` (P-15). The existing activation tests
  stay unchanged.
- **Verify:** `npx vitest run src/adapters/vscode/manifest.test.ts` red, then green; gates 1–5;
  `npm run compile-tests`; host smoke on CI (pre-done gate)
- [x] **Verified (T-007):** 2026-11-18 — manifest AC-009 tests written first and run on HEAD's `package.json` in a scratch copy: 2 failed (command not contributed), green after. Gates 1–5: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 1850 passed, 3 skipped, `npm run compile` ok, `npm run compile-tests` ok (compiles the new host smoke). Host smoke `src/test/copyNextStep.smoke.test.ts`: written, compiled, NOT run here (the VS Code download is blocked); it runs on CI and Windows.
- **Notes:** `createStatusItem()` (in `statusBar.ts`, which no longer implements `StatusBarPort`) maps a `StatusEntryView` to the item and offers `inspect()`; `stepUi.ts` holds the quick pick, information and warning. Discovery now gets the `projectLine` latch as its `StatusBarPort`. The host smoke accepts either feedback text after the command (`$(check) Copied` or `$(warning) Could not copy`) because a headless CI clipboard may refuse the write; the smoke expects the fixture's 0001-tip-splitter in Review to be the current spec.

### T-008 — §5 notes and product docs

- **Covers:** AC-025, AC-026 (checklist line)
- **Do:** Inline notes "*Amended by 0017 (PD-060/PD-061): …*" at each statement §5 names in 0001,
  0003, 0006, 0007, 0013, 0015, 0016 and ADR-001 §11, plus the catch-all note at the head of 0003,
  0007, 0013, 0015; the PD register stays untouched. README: board paragraph (card Copy, no
  Move to…), Mission Control rows, the move paragraph goes, quick start and the command table
  (status bar rule of §6.3, "Copy Next Step"). `CHANGELOG.md` [Unreleased]: the removal and the new
  places. `docs/release-checklist.md`: AC-026, the status bar text, 0015 AC-030 and 0007 AC-017 as
  amended. `docs/product/design-brief.md` card and drag lines. Test (red first): `docsScan.test.ts`
  0017 AC-025 — no forbidden term in README, release checklist and design brief (T-009 adds
  `.architecture/*.md`, which it edits), each §5 file carries "Amended by 0017", README, CHANGELOG
  and checklist name what AC-025 lists; negative control.
- **Verify:** `npx vitest run src/adapters/node/docsScan.test.ts` red, then green; gates 1–4
- [x] **Verified (T-008):** 2026-11-18 — docsScan 0017 AC-025 red (18 failed, negative control green), then green 28/28; verify: gates 1–4 clean (1869 passed + 3 skipped, 12 timing)
- **Notes:** 0001, 0003, 0006, 0007, 0013, 0015, 0016 carry inline notes per §5 row (0003/0007/0013/0015 also the catch-all at the head), ADR-001 §11 the superseded note; PD register untouched. README: card Copy, new section The next step everywhere replaces the move paragraph, Mission Control row Copy, quick start, command table. CHANGELOG [Unreleased] Added/Removed, checklist AC-026 plus 0015 AC-030 and 0007 AC-017/AC-018 as amended, design brief card/drag lines. Notes carry no links (nothing to retarget when 0017 moves to done). T-009 extends the scan to .architecture.

### T-009 — Test-title audit, sync, final gates

- **Covers:** AC-024; re-proves AC-001…AC-023, AC-025
- **Do:** Throwaway script outside the repo (`/tmp/audit-0017/titles.py`): the
  `describe`/`it`/`test`/`suite` title literals of every `.ts`/`.tsx` under `src` (so
  `runtime/testing/contract*.ts` and `src/test/**` count) at the Baseline (`git archive`) and at the
  head; titles compared across files (a moved test is no loss). Write `## Test-title audit` into
  this plan: counts, every missing title with its voided criterion (§5) or the head title replacing
  it. The AC-025 scan adds `.architecture/*.md` (red: "move requests", "transition check").
  `/sdd-architecture-update` (confirmation = this plan's approval) changes exactly: the
  `src/core/<area>` line (adds `copyNextStep 0017 — current spec, status entry, Copy Next Step`;
  board: `+ step view 0017`), the `src/webview` line (cards and attention rows with next step and
  Copy), the `src/shared/protocol` line (step view; specs list `0017`), `last reconciled`;
  `.architecture/core.md` (ports: no move ports, `copyNextStep` topic; lifecycle without transition
  check; board without move requests; new area line), `adapters.md` and `webview.md` (status item,
  step UI; card Copy, no drag or menu). Memory Bank: `techContext.md` *Test* line for 0017 and the
  host smoke list; `systemPatterns.md` drag entries marked superseded by 0017 (PD-060), the focus
  part of the board-memory entry gone, one 0017 entry (project line, current spec, P-9);
  `activeContext.md`. Final gates.
- **Verify:** audit counts in the plan; `npx vitest run src/adapters/node/docsScan.test.ts` red, then green;
  gates 1–5; `npm run compile-tests`; `npm test` on Windows and CI (pre-done gate, Gregor)
- [x] **Verified (T-009):** 2026-11-18 — docsScan AC-025 extended to .architecture red (move request, transition check, drag), then green 29/29; verify: gates 1–5 clean (1870 passed + 3 skipped, 12 timing; baseline 1818 + 3), compile-tests clean; npm test not run in the sandbox (host).
  Evidence added 2026-11-18 (S41, from Gregor's and the orchestrator's records): Gregor's Windows 11 machine at `fbdab51`: `npm run test:unit` 1866 passed, 7 skipped, 12 timing passed; `npm test` 25 + 1 + 1 + 1 passing (incl. `copyNextStep.smoke`). GitHub Actions run 44232332957 at `fbdab51`: ubuntu-latest and windows-latest green. With both recorded, AC-009, AC-016 and AC-024 are verified.
- **Notes:** Title audit in this plan: 68 of 1894 baseline titles missing, all voided by §5 or replaced under a head title; no staying behaviour lost. Architecture sync: AGENTS.md snapshot (core, webview, protocol lines), .architecture/{core,adapters,webview}.md, Memory Bank techContext, systemPatterns (drag entries superseded, one 0017 entry), activeContext. last reconciled date stays 2026-11-18 (same day).

### T-010 — Fix: amendment notes name their statements (compile S40, D1, D2)

- **Covers:** AC-025
- **Do:** 0006 §9: the *Needs attention* layout item carries the 0017 note. 0007 §7 and 0015 §7 name "FR-09 is void" and "FR-03 is void".
- **Verify:** `npx vitest run src/adapters/node/docsScan.test.ts`; gates 1–4
- [x] **Verified (T-010):** 2026-11-18 — three notes edited in `.specs/done/0006-mission-control-dashboard.md` (§9), `.specs/done/0007-spec-board-spec-detail.md` and `.specs/active/0015-focus-on-visibility.md` (§7); `npx vitest run src/adapters/node/docsScan.test.ts` green within the final `npm run test:unit` (1875 passed, 3 skipped, 12 timing).

### T-011 — Fix: the move CSS that was left behind (compile S40, D3)

- **Covers:** AC-007, AC-008 (§6.5 "the move CSS goes"); 0016 AC-017's Dismiss clause is void by §5
- **Do:** Remove `.card-head::before` (it reserved 60 px at the top right of every card head, so every title wrapped early), `.card { position: relative }` (served only the absolutely positioned "Move to…"; the live region of Copy is out of the flow and clipped, it needs no positioned parent), `.secondary-button` with its hover rule and its transition entry, and the two guard tests of the Dismiss clause (titles in the Test-title audit). New guard test in `webviewCss.test.ts` with a negative control.
- **Verify:** `npx vitest run src/adapters/node/webviewCss.test.ts` red, then green; gates 1–5
- [x] **Verified (T-011):** 2026-11-18 — new test "0017 §6.5: nothing reserves the corner of a card head…" red on the CSS of `fbdab51` (a `.card-head::before` rule with `width: 60px` found), green after the removal; control test green. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 1875 passed, 3 skipped, 12 timing passed, `npm run compile` and `npm run compile-tests` ok.
- **Notes:** The "AC-017 (0016): the detail's Copy … carries no other button class" test in `SpecDetail.test.tsx` stays (it asserts the absence of `secondary-button` on the Copy button, still true).

### T-012 — Fix: five test gaps from the mutation check (compile S40)

- **Covers:** AC-017 (P3), AC-016 (W2, F8), AC-013 / AC-014 (C13), AC-002 (N8)
- **Do:** P3 `statusEntry.test.ts` (incomplete and not-a-project folders do not count for "Switch project"; `FakeProject.verdict` in `entryWorld.ts`); C13 `statusEntry.test.ts` (a model of another root reads as specs not read); W2 and F8 `copyNextStep.test.ts` (no warning after a success; a failure within 2 s after a success replaces "Copied", restores 2000 ms after the failure); N8 `nextStep.test.ts` (two Active specs, two plans, either order).
- **Verify:** each test red against its mutant in a scratch edit, restored after; `npx vitest run src/core/copyNextStep src/core/board/nextStep.test.ts`; gates 1–5
- [x] **Verified (T-012):** 2026-11-18 — red, one mutant each, all restored: P3 (`filter(verdict === 'project')` dropped from the project count) failed "P3: folders that are no project…"; C13 (`sameRoot` check dropped from `loadedModel`) failed "C13: a model of another project root…"; W2 (`if (!outcome.ok)` → `if (true)`) failed "W2…" and "F8…"; F8 (`feedback = feedback ?? { ok }`) failed "F8…" and "a copy that succeeds after a failure replaces the warning text"; N8 (`openStep` reads the first plan that has an open step) failed "N8…". Green on the real code: 77 passed in the four files; final gates as in T-011.

## Test-title audit

Script `/tmp/audit-0017/titles.py` (outside the repo): the `describe`/`it`/`test`/`suite` title literals of
every `.ts`/`.tsx` under `src` at the Baseline `fe0bb37` (`git archive`) against the head; titles are
compared across files, so a moved test is no loss. Baseline 1894 titles (1887 unique), head 1967
(1959 unique); 68 baseline titles were missing at T-009 (70 after fix T-011, see the last two rows of the table), 140 were new (+2 from T-011, +5 from T-012). Every missing title is listed
here with its reason; none decides behaviour that stays.

| Baseline file | Missing | Reason |
| --- | --- | --- |
| `core/board/moves.test.ts` (deleted) | 18 | `judgeMove`, `move requests`, the move command and the drop result: 0007 AC-014, 0015 AC-006/AC-008/AC-009 as voided by §5 (PD-060). Staying: the two titles on the clipboard text and the failed write live on as `core/board/copyLine.test.ts` ("0015 AC-005, AC-009: copyLine reports the panel texts…"); NS-7 stays in `nextStep.test.ts` |
| `core/lifecycle/transitions.test.ts` (deleted) | 9 | `judgeTransition`, 0003 AC-008 (void, §5) |
| `core/board/boardRequests.test.ts` | 2 | "filter, sort, clear and focus" now reads "filter, sort and clear go to the board state" (focus is void with the move path; filter, sort and clear kept); "a move request is judged by the moves module" void (0007 AC-014) |
| `core/board/boardService.test.ts` | 1 | "the focused key is remembered and cleared with the panel": the focused key existed only for the Move to… button (0007 AC-017, void) |
| `core/lifecycle/lifecycleService.test.ts` | 2 | "AC-011: derivation, a transition request and a history append leave the tree unchanged" is now "AC-011: derivation and a history append leave the project tree unchanged" (derivation kept, the request part void); "AC-014: judgeTransition uses the latest snapshot" is now "AC-014: without a project there is no model; the latest snapshot of the repository gives one" |
| `shared/protocol/boardFilter.test.ts` | 1 | "sort keys and move results are guarded" is now "sort keys are guarded"; the move result type is gone |
| `test/board.smoke.test.ts` | 2 | "a refused move says what the lifecycle says, and open, move and filter write nothing" is now "AC-016: filter changes write nothing" plus "AC-010, AC-016: Open file opens…"; "the Move Spec command is registered" is replaced by the manifest test that it is absent (0017 AC-009) |
| `test/lifecycle.smoke.test.ts` | 1 | "the active project gets a state per spec and a Ready spec is accepted for Active" is now "AC-001: the active project gets a state per spec"; the accepted-request part is void |
| `webview/board/Keyboard.test.tsx` | 29 | 0007 AC-014/AC-015/AC-017/AC-018 and 0013 AC-011 (drag and drop, Move to… button, menu, announcements, drop result) void (§5). Staying and still present: one tab stop, arrow keys, "the tab stop follows the focused card", Enter opens, AC-019 focus across live updates; the Copy tab stop of 0017 AC-006 replaces the Move to… button stop |
| `webview/board/SpecBoard.test.tsx` | 1 | "AC-009: … progressbars and Move to… follow in DOM order" is now "… and the next-step line follow in DOM order" |
| `adapters/node/webviewCss.test.ts` | 1 | 0013 AC-011 drag marks CSS (void, §5) |
| `adapters/vscode/manifest.test.ts` | 1 | "contributes the Move Spec command" (void); 0017 AC-009 tests the opposite |
| `adapters/node/webviewCss.test.ts` (fix T-011) | 2 | "AC-017: .secondary-button uses the secondary button colours and hover" and "AC-017 negative control: the secondary rule does not carry the primary background alone": they decided only the drop result's Dismiss clause of 0016 AC-017, void by 0017 §5 (PD-060); `.secondary-button` had no other consumer and is removed. The new "0017 §6.5: nothing reserves the corner of a card head…" decides that it and `.card-head::before` stay gone; the Copy half of AC-017 stays in ".copy-button uses the primary button colours and hover" |

Staying behaviour named by the task, with a home at the head: keyboard navigation (`Keyboard.test.tsx`
"arrow keys move focus down, up, right and left", "only one card is tabbable"), Enter opens
(`Keyboard.test.tsx` "Enter on a card opens the spec as before"), filters and sort
(`boardRequests.test.ts`, `boardFilter.test.ts`, `board.smoke.test.ts`), lifecycle derivation
(`lifecycleService.test.ts`, `lifecycle.smoke.test.ts`, `deriveLifecycle` tests untouched), Copy feedback
(`copyLine.test.ts`, `CopyButton.test.tsx`, `copyNextStep.test.ts`). No staying behaviour was lost.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-003, T-004, T-005 | core/board/nextStep.ts, cards.ts, attention.ts; core/copyNextStep/entryView.ts | nextStep, cards, attention, stepView, statusEntry tests | verified |
| AC-002 | T-001 | core/board/nextStep.ts (NS-6) | nextStep.test.ts | verified |
| AC-003 | T-001, T-003 | core/board/nextStep.ts `shortForm` | nextStep.test.ts, stepView.test.ts | verified |
| AC-004 | T-004 | webview/board/Card.tsx, ui/StepText.tsx | SpecBoard.test.tsx | verified |
| AC-005 | T-004 | webview/board/Card.tsx, ui/CopyButton.tsx | SpecBoard.test.tsx, CopyButton.test.tsx | verified |
| AC-006 | T-002, T-004 | webview/board/SpecBoard.tsx, Column.tsx | Keyboard.test.tsx | verified |
| AC-007 | T-002 | webview/board/SpecBoard.tsx | Keyboard.test.tsx | verified |
| AC-008 | T-002 | webview/board/SpecBoard.tsx | Keyboard.test.tsx | verified |
| AC-009 | T-006, T-007 | package.json, adapters/vscode/commands.ts | manifest.test.ts, copyNextStep.smoke.test.ts (CI; green in run 45728313993 at `6b75ef0`) | verified |
| AC-010 | T-006 | shared/protocol/messages.ts, shell messageRouter | messageRouter.test.ts | verified |
| AC-011 | T-006 | removed move path across src | sourceScan.test.ts | verified |
| AC-012 | T-001, T-004 | webview/missionControl/Attention.tsx | Sections.test.tsx | verified |
| AC-013 | T-003 | core/copyNextStep/currentSpec.ts | currentSpec.test.ts | verified |
| AC-014 | T-003, T-007 | core/copyNextStep/entryView.ts, statusEntry.ts; adapters/vscode/statusBar.ts | statusEntry.test.ts, manifest.test.ts | verified |
| AC-015 | T-003 | core/copyNextStep/entryView.ts | statusEntry.test.ts | verified |
| AC-016 | T-005, T-007 | core/copyNextStep/statusEntry.ts, adapters/vscode/statusBar.ts | statusEntry.test.ts, copyNextStep.smoke.test.ts (CI; green in run 45728313993 at `6b75ef0`) | verified |
| AC-017 | T-003, T-012 | core/copyNextStep/entryView.ts (escapeMarkdown), statusEntry.ts | statusEntry.test.ts (incl. P3) | verified |
| AC-018 | T-003 | core/copyNextStep/entryView.ts (accessibleText) | statusEntry.test.ts | verified |
| AC-019 | T-005 | core/copyNextStep/copyNextStep.ts | copyNextStep.test.ts | verified |
| AC-020 | T-005 | core/copyNextStep/copyNextStep.ts | copyNextStep.test.ts | verified |
| AC-021 | T-005 | core/copyNextStep/copyNextStep.ts | copyNextStep.test.ts | verified |
| AC-022 | T-005 | core/copyNextStep/copyNextStep.ts | copyNextStep.test.ts (real shell world, trust on and off) | verified |
| AC-023 | T-005 | core/copyNextStep/copyNextStep.ts | copyNextStep.test.ts, noWrite.test.ts | verified |
| AC-024 | T-009, T-011 (every step keeps staying tests) | — | Test-title audit below (0 staying titles lost); Windows and CI at `fbdab51` recorded in T-009; CI run 45728313993 at `6b75ef0` (2026-11-26): job `vscode-mirror` green on ubuntu-latest and windows-latest (eslint, both `tsc`, `npm run test:unit`, `npm run compile`, extension-host `npm test`) and `vscode-guards` green; `e77a246` changes plans and the Memory Bank only | verified |
| AC-025 | T-008, T-009 | README.md, CHANGELOG.md, docs/, .architecture, §5 notes | docsScan.test.ts | verified |
| AC-026 | T-008 (checklist) | — | manual: Gregor, M-1 on `tip-splitter` | open |

## Session handoff

- **Done so far:** plan written 2026-11-18 (S38); moved to `active/`, T-001…T-009 verified 2026-11-18 (S39); fix steps T-010…T-012 (compile S40 findings D1, D2, D3 and the five test gaps) verified 2026-11-18 (S41).
- **Recorded evidence at `fbdab51`:** Gregor's Windows 11 machine, 2026-11-18: `npm run test:unit` 1866 passed, 7 skipped, 12 timing passed; `npm test` 25 + 1 + 1 + 1 passing (incl. `copyNextStep.smoke`). GitHub Actions run 44232332957: ubuntu-latest and windows-latest green. The fix steps changed one CSS file and tests only (no host code): `npm test` was not re-run on the fix head.
- **Head evidence (2026-11-26):** CI run 45728313993 at `6b75ef0` (2026-11-26): job `vscode-mirror` green on ubuntu-latest and windows-latest (eslint, both `tsc`, `npm run test:unit`, `npm run compile`, extension-host `npm test`) and `vscode-guards` green; `e77a246` changes plans and the Memory Bank only; this replaces "`npm test` was not re-run on the fix head".
- **Next action:** Gregor: AC-026 (M-1 on `tip-splitter`, recorded as `manual: Gregor checked …, <date>`; no record exists, the row stays `open`) and reading P-1…P-15; then a fresh `/sdd-compile`, then `/sdd-lifecycle` 0017 → done (retarget no links: the §5 notes carry none). The spec stays In Progress in `active/` until then.
- **Open decisions:** proxy decisions P-1…P-15 (Research) await Gregor's reading; spec OP-002 stays his. Not covered by any test (host only, real VS Code): `isTrusted` allowlist and `supportHtml = false` in `statusBar.ts`, the `stepUi.ts` mapping, the `openStudio`/`selectProject` actions in `extension.ts`.
- **Baseline:** `fe0bb37` (plan commit, before the first step); unit tests at the Baseline: 1818 passed, 3 skipped (after the lifecycle move); now 1875 passed, 3 skipped.
- **Environment:** `npm test` cannot run in the agent sandbox (VS Code download blocked).
