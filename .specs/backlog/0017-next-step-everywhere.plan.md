# Plan — Next Step Everywhere, No Pseudo-Moves

**Spec:** [0017-next-step-everywhere.md](0017-next-step-everywhere.md)
**Status:** Not started
**Last updated:** 2026-11-18
**Current step:** T-001

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
- [ ] **Verified (T-001):** —
- **Notes:** —

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
- [ ] **Verified (T-002):** —
- **Notes:** —

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
- [ ] **Verified (T-003):** —
- **Notes:** —

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
- [ ] **Verified (T-004):** —
- **Notes:** —

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
- [ ] **Verified (T-005):** —
- **Notes:** —

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
- [ ] **Verified (T-006):** —
- **Notes:** —

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
- [ ] **Verified (T-007):** —
- **Notes:** —

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
- [ ] **Verified (T-008):** —
- **Notes:** —

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
- [ ] **Verified (T-009):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-003, T-004, T-005 | — | — | open |
| AC-002 | T-001 | — | — | open |
| AC-003 | T-001, T-003 | — | — | open |
| AC-004 | T-004 | — | — | open |
| AC-005 | T-004 | — | — | open |
| AC-006 | T-002, T-004 | — | — | open |
| AC-007 | T-002 | — | — | open |
| AC-008 | T-002 | — | — | open |
| AC-009 | T-006, T-007 | — | — | open |
| AC-010 | T-006 | — | — | open |
| AC-011 | T-006 | — | — | open |
| AC-012 | T-001, T-004 | — | — | open |
| AC-013 | T-003 | — | — | open |
| AC-014 | T-003, T-007 | — | — | open |
| AC-015 | T-003 | — | — | open |
| AC-016 | T-005, T-007 | — | — | open |
| AC-017 | T-003 | — | — | open |
| AC-018 | T-003 | — | — | open |
| AC-019 | T-005 | — | — | open |
| AC-020 | T-005 | — | — | open |
| AC-021 | T-005 | — | — | open |
| AC-022 | T-005 | — | — | open |
| AC-023 | T-005 | — | — | open |
| AC-024 | T-009 (every step keeps staying tests) | — | — | open |
| AC-025 | T-008, T-009 | — | — | open |
| AC-026 | T-008 (checklist) | — | manual: Gregor, M-1 on `tip-splitter` | open |

## Session handoff

- **Done so far:** plan written 2026-11-18 (S38), not reviewed yet.
- **Next action:** Gregor reads the plan; on the start signal `/sdd-lifecycle` moves the pair to
  `active/`, then T-001.
- **Open decisions:** proxy decisions P-1…P-15 (Research) await Gregor's reading; spec OP-002 stays his.
- **Baseline:** _(commit hash before the first step commit; set when work starts)_
- **Environment:** `npm test` cannot run in the agent sandbox (VS Code download blocked).
