# Plan — Spec Board & Spec Detail

**Spec:** [0007-spec-board-spec-detail.md](0007-spec-board-spec-detail.md)
**Status:** Done
**Last updated:** 2026-11-16
**Current step:** T-010 done; all steps ticked, awaiting host suite on CI and `/sdd-compile`

## Approach

All board and detail logic sits in a new framework-free core module `src/core/board`: cards,
progress, latest run, filters and sorting, the board's UI state, move requests, the open-file
guard, the detail sections and one `boardService`. It is proven on fakes and fixtures. The
webview renders what the host sends. It owns only focus, keyboard movement, the "Move to…"
menu, drag & drop and announcements. The contract (view types, the board filter encoding,
messages, texts) extends 0005's `src/shared/protocol` and comes first, because both sides build
on it.

Decisions, each with a one-line why:
- **Filters and sort are kept in host memory**, per panel, not in webview state. Hiding the panel
  or rebuilding its content keeps them. Closing the panel or restarting the extension host ends
  them. So AC-023 is decided in core, and no restore flag is needed (spec §15 suggested webview
  state).
- **Native HTML5 drag & drop**, not `@dnd-kit/react` (ADR-001 §11 names it). The keyboard path is
  the "Move to…" menu anyway (WCAG 2.5.7), and there is no new dependency.
- **The description is plain text**: Markdown markers are shown as written and nothing is
  rendered. This needs no renderer and cannot inject HTML.
- **Two small additive changes below the board**: 0003's entry names its blocking conditions and
  the plan in use (A-006, spec §6.2). 0004's store notifies run changes; without this, AC-019's
  run-event notification has no source. Existing tests stay green.

Order: the contract first, then the core model (cards → figures → service → moves → detail),
then the webview, then the wiring. The webview steps need only the contract, so they may run
beside the core steps (see *Stages*). Memory Bank files touched in T-010: `systemPatterns.md`,
`techContext.md`, `activeContext.md`.

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` (from 0005 T-002) · `npm run test:unit` · `npm run compile`
(T-010). Pre-done gate on CI: `npm test` with the host smoke `src/test/board.smoke.test.ts`,
plus Gregor's manual checks (T-010).

## Research

- **Start (2026-11-16, Gregor's approval and answers; OP-010 in the spec):** the plan's additive
  changes to 0003 and 0004 are approved and are done in their own specs first (0003 T-010 with
  AC-027/AC-028, 0004 T-010 with AC-030); T-002, T-003 and T-004 below only use them. 0007 owns the
  board filter encoding. Filters stay in extension memory, no drag-and-drop library, and the
  reader-window limitation is recorded in the spec (§10, §13). Stages 4 and 5 run **in sequence**
  after the core stages (Gregor's start message).
- **0005 as built (2026-11-16, replaces the survey bullet below; where the plan assumed otherwise,
  the code wins):**
  - `ShellModelSource` (`current(): { project, lifecycle }`, `onDidChange`) is the model feed;
    the board service takes it, not the `LifecycleService`. `judgeTransition` is called as the
    pure function on that model, so a move is judged against the snapshot the board shows.
    `LifecycleService.history()` is used for the status history only.
  - `shellService.handlers` is typed as `RequestHandlers` (every request type). The board's
    requests get their own handler set, `boardService.handlers`, and the panel host merges both.
    `RequestType` is split into the shell's and the board's requests in `messages.ts`.
  - `shellService.navigate` stores `target` in the view but has no hook for a consumer. T-010 adds
    `onDidNavigate(listener)`, additively, as the plan foresaw.
  - The router writes `ignoredMessageLine(type, 'invalid payload')` for a request whose guard
    fails. That is the X-14 line; the `boardFilter` target guard therefore uses the board filter
    guard, and a bad filter drops the whole request.
  - The webview client keeps one snapshot (`view`, `state`, `area`) and handles only the `shell`
    event (with `seq`). `board`, `detail` and `moveResult` are added as events without `seq`: each
    is a full snapshot that replaces the last, and the host re-sends them on `hello`.
  - There is no `areas/registry.tsx` map of placeholders: `AREA_COMPONENTS` is a
    `Partial<Record<AreaId, ComponentType>>`, and `AREAS[].placeholder` marks the placeholder
    texts (`specBoard` flips to `false` in T-007).
- **Survey** (2026-11-16, worktree `spec-0007` at `2cf3cc8`; 0001–0004 built, 0005 planned only —
  this bullet is the original survey; the block above says what the code looks like now):
  - **0005 is not in this checkout.** Its plan supplied these extension points:
    - the area registry `src/webview/areas/registry.tsx`;
    - `useShell().navigate({ area, target })` and the `navigate` message;
    - the target `{ kind: 'boardFilter', filter: JsonValue }`, whose inside 0007 validates;
    - new message types in `src/shared/protocol/messages.ts`, all texts in
      `src/shared/protocol/texts.ts`;
    - the selection `{ stem, path? }` in `shellService`;
    - `areas/SpecExplorer.tsx`, a list that the detail view joins (PD-042).
    Main is merged before T-001. T-001 and T-010 then cut the names to the code as built.
  - **0002 (A-002 holds).** `EntryFacts.modifiedMs` exists for specs, plans and notes
    (`src/core/specs/readProject.ts`). Spec sections come as `{ heading, raw, line }`, and the
    text before the first H2 has `heading: undefined` (`parseSpec.ts`). The description is taken
    from the first section with a heading (PD-043). Criteria carry `text`, `illustration`,
    `line`, `uncertain` and `struck`, requirements carry `line`, and steps carry `struck` and
    `ticked: boolean | 'undetermined'` (`leadingIds.ts`, `planSteps.ts`).
  - **0003 (A-006 does not hold).** `LifecycleEntry` (`src/core/lifecycle/model.ts`) has the
    state, rule, persistence, `derivedLabel`, readiness, verification, diagnostics and
    `deprecated`. It names neither which S-BLOCKED condition holds (`entryContext.ts` folds it
    into `blocked: boolean`) nor the plan of §6.6: `verification.ts` `sourcePlan` is private,
    and `verification.source` is empty when the plan has no traceability rows. T-002 adds
    `blockedBy` and T-003 adds `plan`, both additive. `judgeTransition` exists, and its texts
    are 0003's (`transitions.ts`). `lifecycle.history()` returns every stem, so the detail view
    filters by stem. `HISTORY_LABEL` and `COMPILE_VERDICT_TEXT` are exported.
  - **0004 (A-001 holds; one gap).** `listRuns({ stem })` returns the runs newest created first
    as a `ReadResult`. `RunView` has `providerId`, `status`, `created`, `started`, `ended`,
    `historyIncomplete` and `historyUnreadable`. The store notifies only its own state
    (`onDidChangeState`), never a run change. T-004 adds `onDidChangeRuns`, fired after this
    window's `createRun`, `reportStatus`, `clear` and pruning. **Limitation:** a reader window
    (PD-030) gets no notification for another window's writes. It shows them at its next model
    change or rebuild.
  - **Fixtures.** `src/core/specs/testing/generateProject.ts` writes 200 specs, all in
    `active/`. This is the "one column holds most cards" shape of §12. Fixtures:
    `fs110-ready-synthetic` (Ready), `fs110-parallel-synthetic` (return notes),
    `fs110-de-active-review` (Review), `fs180-en-done-archived` (archived plans),
    `fs-broken` (unreadable), `fs170-brownfield-mixed`. `snapshotTree.ts` proves no-write, as
    0003 AC-011 does.
  - **This worktree has no `node_modules`.** `npm ci` runs before T-001. That is not an install
    of anything new.
  - **PD check.** PD-013 to PD-016, PD-018, PD-019, PD-036 and PD-039 to PD-047 are cited by the
    spec and consistent with it. No PD is newer than the spec's revision. `done/` is empty, so
    no spec is invalidated.
  - **Spec §15 points decided here:**
    - **Refusal message.** A status line at the top of the board (`role="status"`) shows the last
      move result until the next move request, "Dismiss", or leaving the area. When the command
      runs while the board is not shown, the result appears as a VS Code message instead
      (warning for a refusal, information for a hand-off).
    - **Left/Right focus.** Left and Right go to the card at the same index in the target
      column, otherwise to its last card.
    - **Focus after a live update when the card is gone.** Focus goes to the card at the same
      index in the same column, otherwise that column's last card, otherwise the first card of
      the nearest column with cards, otherwise the board container.
    - **Long columns.** Each column scrolls on its own. The focused card is scrolled into view
      with `block: 'nearest'`.
    - **Inline Markdown.** Not rendered (see *Approach*).
  - **Filter encoding v1 (OP-008 d; shared with 0006 and 0012).** The filter is
    `{ states?: BoardState[], providers?: (string | null)[], set?: { label: string, stems: string[] } }`.
    `null` in `providers` is "No run". An absent key is an unset filter. A value that fails the
    guard drops the whole target: the board keeps its filters and the router writes 0005's X-14
    line. **0006 is planned in parallel and has to use this shape.** Whichever plan merges second
    adopts the first one's encoding.
  - **The 500 ms budget (AC-019) is split.** Core: from the lifecycle or run notification to
    `onDidChangeView` in at most 200 ms on the 200-spec model (T-004). Webview: from the
    `board` message event to the updated DOM in at most 300 ms for 200 cards (T-007). The
    in-process `postMessage` hop between the two is not measured. This split is how the plan
    reads PD-047.
  - **Size.** 28 criteria on two surfaces give 10 steps, above the target of 8. The spec could
    have been two specs (board, detail). Splitting it now would cost a revision and buys nothing,
    because the shared core module serves both.
- **No new dependency.** `@dnd-kit/react` is 0.5.3 (peer react ^18 or ^19, modified
  2026-10-31). It is deliberately not taken, see *Approach*. No `@vscode/codicons` either: the
  icons are seven inline SVGs with `fill="currentColor"`. `npm view` in /tmp, 2026-11-16.
- jsdom 31.0.1 (the tarball, `npm pack` in /tmp) has no `DragEvent` and no `DataTransfer`
  (`lib/jsdom/living/events` lists neither), confirmed by
  [jsdom#2913](https://github.com/jsdom/jsdom/issues/2913). So the drag handlers keep the
  dragged key in React state, set `dataTransfer` only where it exists, and the tests dispatch a
  `MouseEvent('dragstart' | 'dragover' | 'drop')`. Retrieved 2026-11-16.
- [MDN — HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API):
  a drop target cancels `dragover` with `preventDefault()`, and `drop` fires only on drop
  targets. Retrieved 2026-11-16.
- [WAI-ARIA APG — Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/): a button
  with `aria-haspopup="menu"` and `aria-expanded`; Enter, Space or Down opens the menu and
  focuses the first item. Retrieved 2026-11-16.
- [WCAG 2.2 — Understanding 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html):
  a pop-up menu of target columns is the single-pointer alternative to dragging. Retrieved
  2026-11-16.
- Local `@types/vscode` 1.146.0: `TextDocumentShowOptions.selection` and `window.showQuickPick`
  exist, for "Open file" at a line and the command's picks. Checked 2026-11-16.

## Texts (English, PD-016; all in `src/shared/protocol/texts.ts`, asserted by kind)

| ID | Where | Text |
| --- | --- | --- |
| B-01 | column hint, empty before filtering | Backlog `No spec in the backlog.` · Ready `No spec is ready.` · Active `No spec is being implemented.` · Review `No spec awaits review.` · Done `No spec is done yet.` · Blocked `No spec is blocked.` |
| B-02 | column | `<N> hidden by filter` |
| B-03 | filter bar | `State` · `Provider` · `No run` · set chip `<label>` · `Clear filters` · sort `Number` / `Title A–Z` / `Last change (newest first)` |
| B-04 | no specs | `No specs yet. Run /sdd-specify to write the first one.` |
| B-05 | card | `No summary` · `Tasks: <t> of <n>` / `Tasks: not available` · `Criteria: <v> of <n> verified` / `Criteria: not available` · `Last change: <YYYY-MM-DD HH:mm>` / `Last change: not available` |
| B-06 | card run | `<provider> · <status>` · `<provider> · history unreadable` · `No run` · `Runs: not available` |
| B-07 | markers | 0003's `Derived (rule <id>)` · `Deprecated` · `<n> diagnostic(s)` · `Blocked: plan status Blocked` · `Blocked: return note <file name>` · Backlog `<R-id>: <0003 reason>` · `uncertain` · `struck` · `history incomplete` · `history unreadable` |
| B-08 | banner | `Project diagnostics` plus one line per diagnostic: `<file or "project">: <reason>` |
| B-09 | moves | 0003's refusal text · `Agent start is not available yet` · hand-off `Spec <number> was handed to the agent start.` · `Dismiss` · menu button `Move to…` · command `FeatherSpec: Move Spec to…` · picks `Select a spec to move` / `Move spec <number> to…` |
| B-10 | detail | no selection `Select a spec in the list to see its details.` · `No FR- requirements found` · `No plan yet` · `Priority: not available` · `Open file` · `File not found: <path>` · `Successor: <text>` / `Successor: none — behaviour removed` / `Successor: not available` · 0003's `HISTORY_LABEL` and `COMPILE_VERDICT_TEXT` · `Status history: not available` |

## Stages

1. T-001 — board contract, filters and sorting (pure)
2. T-002 → T-003 → T-004 — card model, figures and runs, board service (core)
3. T-005 → T-006 — moves, open file, detail model (core)
4. T-007 → T-008 — Spec Board area (webview)
5. T-009 — spec detail in Spec Explorer (webview)
6. T-010 — wiring, command, host smoke, docs sync and final gates

Parallel: stages 4 and 5 (webview) may run beside stages 2 and 3 (core). They need only T-001's
contract, touch only `src/webview/**`, and run only their own tests. Every shared file
(`messages.ts`, `texts.ts`, `board.ts`) is written in T-001, and T-010 joins the two lines.

## Steps

### T-001 — Board contract, filters and sorting

- **Covers:** AC-005, AC-011, AC-012, AC-013, AC-022
- **Do:**
  - `src/shared/protocol/board.ts`:
    - `BOARD_STATES` (the six columns);
    - `CardView`, with no priority field;
    - `BoardView`: columns with cards, `hidden` and `emptyBeforeFilter`, banner, filter, sort,
      the provider choices, `noSpecs`;
    - `DetailView`, with its seven sections;
    - `BoardFilter` v1 (*Research*) with `readBoardFilter(raw)`;
    - `SortKey = 'number' | 'title' | 'lastChange'`;
    - `MoveResult = none | refused { text } | handedOff { number }`.
  - `messages.ts`: the requests `boardSetFilter`, `boardSetSort`, `boardClearFilters`,
    `boardFocus { key | null }`, `moveRequest { key, target }` and `openFile { key, line? }`;
    the events `board`, `detail` and `moveResult`; one guard each. `texts.ts`: B-01 to B-10.
  - `src/core/board/filters.ts`: `arrangeBoard(cards, filter, sort)`:
    - AND across filters, OR within one;
    - a card whose runs are "not available" matches no provider value;
    - an unknown stem in a set matches nothing;
    - sort with ties by stem, then path, missing values last;
    - hidden counts per column.
  - Tests:
    - `src/shared/protocol/board.test.ts`: the guard accepts v1 and rejects other states,
      non-string stems and extra kinds.
    - `src/core/board/filters.test.ts`:
      - AC-022's G/W/T on 9 hand-built cards;
      - AC-013's three orders and ties;
      - AC-012's hidden counts;
      - AC-011: frozen inputs are left unchanged;
      - AC-005: the sort keys hold no priority.
    - A core test asserts that `BOARD_STATES` equals 0003's `LIFECYCLE_STATES`.
- **Verify:** `npm run test:unit -- src/shared src/core/board` plus the per-step gates
- [x] **Verified (T-001):** 2026-11-16 · red: `npx vitest run --project node src/shared src/core/board` 15 of 15 filter and sort cases failed with `Not implemented` (stub `arrangeBoard`); the guard and contract tests were written together with their types and passed at once, with the rejection cases as their negative controls; green: 61 of 61; gates: eslint 0 warnings, both `tsc --noEmit` clean, `npm run test:unit` 922 tests passed.
- **Notes:** Deviations: the filter encoding is in its own file `src/shared/protocol/boardFilter.ts` (0006's plan names that file), `board.ts` holds `CardView`, `BoardView`, `SortKey`, `MoveResult` and their guards; `DetailView` and the `detail` event come in T-006 (nothing consumes them earlier). `RequestType` is split (`ShellRequestType`, `BoardRequestType`); the `boardFilter` navigation target is guarded by `isBoardFilter`, so a bad filter drops the whole request (X-14 line). `studioPanel` takes optional `board` handlers (ignored until T-010). All B-texts are in `texts.ts`. Tests: `boardFilter.test.ts`, `src/core/board/filters.test.ts`.

### T-002 — Cards: content, markers, diagnostics

- **Covers:** AC-001, AC-002, AC-003, AC-004, AC-020, AC-024
- **Do:**
  - `src/core/lifecycle/entryContext.ts` and `model.ts`, additive: `LifecycleEntry.blockedBy`
    is `{ plan: boolean; returnNotes: string[] }` (the file names) for a Blocked entry and
    `undefined` otherwise. 0003's existing tests stay green.
  - `src/core/board/description.ts`: from the first section with a heading, the first block of
    text lines that is not a list, table, blockquote, code fence or heading; otherwise
    `undefined` ("No summary").
  - `src/core/board/cards.ts`: `buildCards(project, lifecycle)`, one card per entry, duplicates
    included. Each card carries:
    - the number;
    - the title, otherwise the stem with `titleIsStem`;
    - the path while the stem is duplicated;
    - the state, `derivedLabel`, `deprecated` and the diagnostic count (spec, plan and notes, as
      0003 ties them);
    - the blocked lines;
    - for Backlog, the lowest failing readiness check with its reason.
  - `buildBanner(project, lifecycle)`: project-scope diagnostics, plus every diagnostic whose
    file belongs to no entry (orphan plan, unlinked return note).
  - Tests: `src/core/board/cards.test.ts` and `description.test.ts`, on memory sources and on
    `fs110-ready-synthetic`, `fs110-parallel-synthetic`, `fs-broken` and
    `fs180-en-done-archived`:
    - AC-001's G/W/T: 9 files, two sharing a number, give 9 cards;
    - each state lands in its column;
    - AC-004's G/W/T;
    - no H2 and no paragraph both give "No summary";
    - the title falls back to the stem;
    - the blocked lines from a Blocked plan and from a note;
    - R-3 on a Backlog card;
    - the Deprecated marker;
    - a broken plan badges only its spec;
    - an orphan plan goes to the banner.
- **Verify:** `npm run test:unit -- src/core/board src/core/lifecycle` plus the per-step gates
- [x] **Verified (T-002):** 2026-11-16 · no red run: the card and description code was written beside its tests (a slip against test-first); in place of red, a negative control: with the description paragraph check, the title fallback and the diagnostic count broken on purpose, 4 of 30 tests failed, restored, 30 of 30 green (`npx vitest run --project node src/core/board`); gates: eslint 0 warnings, both `tsc --noEmit` clean, `npm run test:unit` 62 files, 936 tests passed.
- **Notes:** The 0003 part of this step (blocking conditions) was done first as 0003 T-010 (AC-027). `buildCards` leaves tasks, criteria, last change and run at their empty values until T-003. Tests: `cards.test.ts`, `description.test.ts`.

### T-003 — Progress, last change, latest run

- **Covers:** AC-006, AC-007, AC-025
- **Do:**
  - `src/core/lifecycle/verification.ts` and `model.ts`, additive: `LifecycleEntry.plan` is the
    key of the §6.6 plan (sibling, archived, or a legacy sibling), set even without
    traceability rows.
  - `src/core/board/progress.ts`:
    - tasks: ticked (`true`) and all steps of that plan, struck steps excluded; `null` when there
      is no plan or no countable step;
    - criteria: `verified` and the total of 0003's counts; `null` when the summary is
      *not available*;
    - last change: the newer `modifiedMs` of the spec and that plan, or `null`.
  - `src/core/board/runs.ts`: `latestRuns(result: ReadResult<RunView[]>)` maps a stem to its
    newest run, or `unavailable`. Duplicated stems share their runs. A `historyUnreadable` run
    shows that text in place of the status.
  - `cards.ts` carries these figures.
  - Tests: `progress.test.ts` and `runs.test.ts`:
    - "3 of 7" with one struck step and one undetermined tick;
    - no plan or no steps → `null`, never 0;
    - an archived plan for a `done/` spec;
    - no rows → `null`;
    - mtime from the plan when it is newer;
    - "No run", unavailable, unreadable, and the newest of three runs.
- **Verify:** `npm run test:unit -- src/core/board src/core/lifecycle` plus the per-step gates
- [x] **Verified (T-003):** 2026-11-16 · red: `npx vitest run --project node src/core/board/progress src/core/board/runs` 13 of 13 failed with `Not implemented` (stubs `taskProgress`, `criteriaProgress`, `lastChange`, `indexRuns`, `cardRun`); green: `npx vitest run --project node src/core/board` 43 of 43; gates: eslint 0 warnings, both `tsc --noEmit` clean, `npm run test:unit` 62 files, 949 tests passed.
- **Notes:** 0003's plan key is the `plan` field of 0003 T-010 (AC-028). `buildCards` takes an optional `RunIndex` (default: no run). The latest run of a stem is the one with the greatest `created`; the store's own order breaks ties. Tests: `progress.test.ts`, `runs.test.ts`.

### T-004 — Board service: UI state, navigation filter, live update

- **Covers:** AC-011, AC-019, AC-022, AC-023
- **Do:**
  - `src/core/runtime/runtimeStore.ts`, additive: `onDidChangeRuns(listener)` after
    `createRun`, `reportStatus`, `clear` and pruning. It is added to the contract suite
    (`testing/contractRuns.ts`), which runs on both media.
  - `src/core/board/boardUiState.ts`: filter, sort and focused key in memory. Default: no
    filter, sort by number. `applyNavigationFilter` replaces the filters. `panelClosed()` and
    a change of project root reset the filters, and `panelClosed()` also resets the sort.
  - `src/core/board/boardService.ts`: `createBoardService({ lifecycle, repository, session })`
    with:
    - `view()` and `onDidChangeView`;
    - recompute on `lifecycle.onDidChange`, on `session.onDidChangeState`, and on the current
      store's `onDidChangeRuns` (re-subscribed when the store changes);
    - `setFilter`, `setSort`, `clearFilters`, `applyNavigationFilter`, `setFocus` and
      `panelClosed`.
  - Tests: `boardService.test.ts`, on a memory source and a fake session:
    - AC-022's G/W/T through `applyNavigationFilter`;
    - AC-023: kept across view rebuilds, reset by `panelClosed`, filters cleared on a project
      change, sort kept;
    - AC-011: the lifecycle model is deep-equal before and after every filter and sort call;
    - a run notification updates the card.
    - `boardService.perf.test.ts` on `generateProject` (200 specs): lifecycle notification to
      view < 200 ms, and run notification to view < 200 ms.
- **Verify:** `npm run test:unit -- src/core/board src/core/runtime` plus the per-step gates
- [x] **Verified (T-004):** 2026-11-16 · re-run after `/sdd-compile` found the step unticked (code and tests were committed earlier; the original red run was not recorded, so no red is claimed): `npm run test:unit -- src/core/board src/core/runtime` 17 files, 200 tests passed; gates: eslint 0 warnings, both `tsc --noEmit` clean, `npm run test:unit` 86 files, 1240 tests passed.
- **Notes:** —

### T-005 — Move requests, the move command flow, open file, no writes

- **Covers:** AC-010, AC-014, AC-015, AC-016
- **Do:**
  - `src/core/ports/board.ts`:
    - `StartWorkflowPort { start({ stem, key }) }`, optional; nothing registers it before 0008;
    - `EditorPort { open(root, key, line?) → 'opened' | 'not-found' }`;
    - `MovePickPort { pickSpec(items); pickTarget(number, targets) }`;
    - `MoveResultSink { show(result) }`.
  - `src/core/board/moves.ts`:
    - `requestMove(key, target)`: the own column gives `none`. Otherwise the request goes to
      `lifecycle.judgeTransition`. A refusal carries 0003's text. An accepted request with no
      start port gives `Agent start is not available yet`. With a start port, the request is
      handed off with the stem. Nothing in the model changes.
    - `runMoveCommand()`: the spec is the focused key, else the selected spec, else
      `pickSpec`. The target comes from `pickTarget` (the five other columns). The result goes
      to the sink.
  - `src/core/board/openFile.ts`: accepts only keys of the current model (spec, plan, archived
    plan, return note) that resolve inside the root, then calls the editor. `not-found` gives
    B-10's text.
  - Tests: `moves.test.ts` and `openFile.test.ts`:
    - every refusal kind of 0003;
    - an own-column drop submits nothing;
    - AC-015 with and without a fake start port; the card stays in Ready;
    - the command's three sources in order;
    - an unknown key and a `../` key are refused;
    - not-found.
    - `noWrite.test.ts`: on a temp copy of `fs110-ready-synthetic` with the Node spec source,
      every action is run (filters, sorts, every move, the command, open file with a fake
      editor). `snapshotTree` is unchanged (AC-016).
- **Verify:** `npm run test:unit -- src/core/board` plus the per-step gates
- [x] **Verified (T-005):** 2026-11-16 · red: `npx vitest run --project node src/core/board/moves src/core/board/openFile` 29 of 29 failed with `Not implemented` (stubs `createMoves`, `createOpenFile`); green: `npx vitest run --project node src/core/board` 87 of 87 (incl. `noWrite.test.ts`: every action on a temp copy of `fs110-ready-synthetic`, `snapshotTree` equal); gates: eslint 0 warnings, both `tsc --noEmit` clean, `npm run test:unit` 68 files, 993 tests passed.
- **Notes:** Ports are in `src/core/ports/board.ts`: `StartWorkflowPort`, `EditorPort`, `MovePickPort`, `MoveResultSink` and `SelectionSource` (the selection feed the plan's T-006 named). `createMoves` takes the `ShellModelSource` and judges with the pure `judgeTransition` on that model. The command's focused key comes from the board service (`focused()`); a focused or selected key the model no longer holds falls through to the next source. Tests: `moves.test.ts`, `openFile.test.ts`, `noWrite.test.ts`.

### T-006 — Spec detail model

- **Covers:** AC-005, AC-006, AC-009, AC-010, AC-024, AC-027, AC-028
- **Do:**
  - `src/core/board/detail.ts`: `buildDetail({ selection, project, lifecycle, runs, history })`.
    - No selection, or a stem that is not in the project, gives the hint.
    - The entry is found by stem, plus the path while the stem is duplicated. A folder move
      keeps it.
    - The seven sections as in §6.4:
      - Overview: header lines, unsupported header lines, the state with its rule and marker,
        the successor, readiness for `backlog/` only, the diagnostics, "Priority: not
        available";
      - Requirements and Acceptance criteria, as delivered, with the flags;
      - Plan & tasks: stages and steps with tick and `Verified`, struck steps marked;
      - Verification: the same numbers as the card (one function);
      - Related artifacts;
      - Agent history: runs newest first with their flags, then the stem's status history
        under `HISTORY_LABEL`; *not available* for both while the store is unavailable.
    - Every item with a source carries `open: { key, line? }`, exactly where §6.4 names a file.
  - `boardService`: `detail()` and `onDidChangeDetail`, fed by a `ShellSelectionSource` port
    (selection plus change), and recomputed on the model, the runs and the selection.
  - Tests: `detail.test.ts`:
    - every section on `fs110-ready-synthetic` and `fs180-en-done-archived`;
    - no `FR-` IDs, with "Open file" on the spec;
    - AC-009's flags;
    - the `open` targets present and absent per §6.4;
    - the same criteria numbers as the card;
    - `backlog/` gets readiness, `active/` does not;
    - AC-028: a `backlog/` → `active/` move on a memory source keeps the detail;
    - store unavailable.
- **Verify:** `npm run test:unit -- src/core/board` plus the per-step gates
- [x] **Verified (T-006):** 2026-11-16 · re-run after `/sdd-compile` (original red run not recorded, none claimed): `npm run test:unit -- src/core/board` 12 files, 111 tests passed; gates: eslint 0 warnings, both `tsc --noEmit` clean, `npm run test:unit` 86 files, 1240 tests passed.
- **Notes:** AC-005 and AC-006 each by one assertion here; their main proof is T-001 and T-003.

### T-007 — Spec Board area: columns, cards, filter bar, states

- **Covers:** AC-008, AC-012, AC-018, AC-019, AC-021, AC-026
- **Files:**
  - `src/webview/areas/registry.tsx`, `src/webview/areas/SpecBoard.tsx`;
  - `src/webview/board/{Column,Card,FilterBar,Banner,icons,boardStore}.tsx`;
  - `src/webview/client.ts`, `src/webview/main.css`;
  - `src/webview/board/*.test.tsx`, `src/webview/board/testing/cards.ts`.
- **Do:**
  - Register the area.
  - `boardStore` holds the last `board` event (`client.ts` dispatches it).
  - Six columns with a heading and a count.
  - Cards show every `CardView` field as text, with a state icon and a badge icon
    (`aria-hidden`). The description is limited by `-webkit-line-clamp: 2`.
  - Filter bar: state and provider checkbox groups, the set chip, a sort `select` and
    "Clear filters". Each sends its request.
  - The banner, "No specs yet", the column hints and "N hidden by filter".
  - Click or Enter on a card → `navigate({ area: 'specExplorer', target: { kind: 'spec', stem, path? } })`.
  - Colours only from `--vscode-*` variables.
  - Tests:
    - every field and text kind renders;
    - icons sit beside text;
    - click and Enter send the navigation request;
    - the filter controls send their requests;
    - the empty states;
    - a test that `main.css` uses no colour literal;
    - render update < 300 ms after the message event, for 200 cards with 180 in one column.
- **Verify:** `npm run test:unit -- src/webview/board` plus the per-step gates
- [x] **Verified (T-007):** 2026-11-16 · re-run after `/sdd-compile` (original red run not recorded, none claimed): `npm run test:unit -- src/webview/board` 3 files, 66 tests passed; gates: eslint 0 warnings, both `tsc --noEmit` clean, `npm run test:unit` 86 files, 1240 tests passed.
- **Notes:** —

### T-008 — Keyboard, "Move to…", drag & drop, announcements

- **Covers:** AC-014, AC-017, AC-018, AC-019
- **Files:**
  - `src/webview/board/{focusModel.ts,MoveMenu.tsx,dragDrop.ts,Announcer.tsx}`;
  - `src/webview/board/{Card,Column}.tsx`, `src/webview/areas/SpecBoard.tsx`;
  - `src/webview/board/*.test.ts(x)`.
- **Do:**
  - `focusModel.ts` (pure): Up and Down within a column; Left and Right to the nearest column
    with cards, at the same index or else its last card; the fallback after an update
    (*Research*).
  - Roving `tabindex` with one tab stop on the board. `boardFocus` is sent on focus and blur.
  - `MoveMenu`: an APG menu button on each card, also opened by Shift+F10 and the ContextMenu
    key. It lists the five other columns.
  - Drag & drop: `draggable` cards, the dragged key in state, `dragover` `preventDefault` on
    the other columns. A drop on another column sends `moveRequest`. Dropping on the own column
    or outside sends nothing.
  - `Announcer`: an `aria-live="polite"` region plus the dismissible status line for
    `moveResult`.
  - Focus stays on the same key after a `board` update.
  - Tests:
    - a `focusModel` table;
    - keyboard-only: reach a card, Up, Down, Left, Right (skipping an empty column), Enter, and
      open the menu and choose a target;
    - drag through dispatched `MouseEvent`s (no `DragEvent` in jsdom);
    - the own column and outside send nothing;
    - refusal and hand-off are announced;
    - focus kept after a reorder and moved by the fallback when the card is gone.
- **Verify:** `npm run test:unit -- src/webview/board` plus the per-step gates
- [x] **Verified (T-008):** eslint, tsc (both), test:unit: 73 files, 1080 tests passed; focusModel 20 table cases red first (Not implemented stub), Keyboard.test.tsx written after the code (24 tests), negative controls by mutation: own-column drop, focus steal, no fallback, blur flag each fail a test.
- **Notes:** Drag and drop is wired in SpecBoard.tsx and Column.tsx (dragDrop.ts not split out, the state is three handlers). Focus, blur and arrow handling sit on the .columns container (bubbled focus events), so Card and Column lost the planned onKeyDown/onFocus/onBlur props. The Move to button is tabIndex -1 (one tab stop on the board); it is reached by Shift+F10, the ContextMenu key or the mouse. The status region is a single role=status, aria-live=polite element holding the text and Dismiss. Falls back to the .columns container when no card is left.

### T-009 — Spec detail in Spec Explorer

- **Covers:** AC-009, AC-010, AC-017, AC-027, AC-028
- **Files:**
  - `src/webview/areas/SpecExplorer.tsx`;
  - `src/webview/detail/{SpecDetail,DetailSection,detailStore}.tsx`;
  - `src/webview/client.ts`;
  - `src/webview/detail/*.test.tsx`.
- **Do:**
  - The detail view sits beside 0005's list and renders the seven sections from the `detail`
    event, read-only, each under a heading.
  - "Open file" is a button exactly where the view carries `open`. It sends `openFile`. A
    `not-found` answer shows B-10 in the section's status line.
  - The no-selection hint.
  - Tests:
    - every section renders;
    - a criterion shows its text, G/W/T and both flags;
    - "No `FR-` requirements found" with "Open file";
    - no button for runs, history or "No plan yet";
    - the buttons are keyboard-operable;
    - the not-found message;
    - the hint with no selection;
    - a new `detail` event after a folder move keeps the view.
- **Verify:** `npm run test:unit -- src/webview/detail` plus the per-step gates
- [x] **Verified (T-009):** eslint, tsc (both), test:unit: 74 files, 1100 tests passed; SpecDetail.test.tsx (19 tests) red first against the unchanged SpecExplorer (19 failed), then green.
- **Notes:** No detailStore.tsx: useBoard() already exposes detail, fileResult and openFile. SpecExplorer wraps the 0005 list and SpecDetail in an .explorer grid; the list and its rows are untouched. A section shows the not-found text when the file's key is the section's own open key or one of its items' keys, so Plan and Verification both show it for the plan file. Plan and Verification pass keys=[] and rely on their own open target. Runs are shown in the order the core delivers (newest created first, covered in detail.test.ts).

### T-010 — Wiring, command, host smoke; docs sync and final gates

- **Covers:** AC-008, AC-010, AC-014, AC-016; AC-001 … AC-028 re-proven by the full gate run
- **Do:**
  - Router handlers in `shellService` (0005) for the new requests.
  - The panel host posts `board`, `detail` and `moveResult`, and calls `panelClosed()` on
    dispose.
  - A `boardFilter` navigation target goes to `applyNavigationFilter`. If 0005 as built has no
    hook, add `onDidNavigate` to `shellService`, additively.
  - `package.json`: command `featherspec-studio.moveSpec`, titled `FeatherSpec: Move Spec to…`.
  - `src/adapters/vscode/editor.ts`: `workspace.fs.stat`, then `showTextDocument` with the
    selection at the line.
  - `src/adapters/vscode/boardPicks.ts`: `showQuickPick`, and `MoveResultSink` as a VS Code
    message when the board is not shown.
  - `src/extension.ts` composition, and a test-only `StudioApi.board()`.
  - Host smoke `src/test/board.smoke.test.ts`:
    - the command is registered;
    - Ready → Active on `fs110-ready-synthetic` gives `Agent start is not available yet`;
    - open file opens the spec at an AC line, and a gone file gives not-found;
    - `snapshotTree` is unchanged after open, move and filter (AC-016).
  - Docs sync:
    - `architecture:` in `AGENTS.md`, exactly these entries:
      - new module `'src/core/board — Spec Board and spec detail view models: cards, progress, latest run, filters and sorting, board UI state, move requests, open-file guard, detail sections, board service (spec 0007)'`;
      - ports line + `, board ports (start workflow, editor, move picks, move result)`;
      - lifecycle line → `'src/core/lifecycle — lifecycle model: state derivation, readiness, contradictions, blocking conditions, plan in use, verification status, transition check, flow marker, status history, lifecycle service (spec 0003)'`;
      - runtime line → `'src/core/runtime — runtime store: runs, run-change notification, events, masking, writer lock, retention, store state (spec 0004)'`;
      - 0005's webview line + `, Spec Board, spec detail (spec 0007)`;
      - 0005's shared line → `…versioned message protocol, areas, board view and filter contract, UI texts…` with `(specs 0005, 0007)`.
    - `systemPatterns.md`:
      - board UI state in host memory;
      - board logic in core, the webview renders;
      - native DnD over `@dnd-kit` (ADR-001 §11 deviation);
      - drag tests without `DragEvent`;
      - filter encoding v1;
      - the reader-window run limitation.
    - `techContext.md`:
      - the board tests and the smoke file;
      - manual checks:
        - AC-017 and AC-018 as a keyboard-only and screen-reader pass;
        - AC-026 and AC-004's two-line limit in a light, a dark and a High Contrast theme.
    - `docs/decisions/ADR-001-extension-architecture.md` §11: one amendment line (native DnD,
      2026-11-16, this plan).
    - `README.md`: board, detail and the command.
    - `activeContext.md`.
- **Verify:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile`
- [x] **Verified (T-010):** eslint, tsc (both), test:unit: 76 files, 1111 tests passed; `npm run compile` green; onDidNavigate tests red first (Not implemented stub, 3 failed), manifest test red first (1 failed); boardRequests and shellSelection tests code-first with mutation controls (not-found guard, boardFocus key).
- **Notes:** Host smoke `src/test/board.smoke.test.ts` is written but not run here (CI). It uses the active fixture `fs110-de-active-review` (0001-tip-splitter in Review): the Ready to Active hand-off check on `fs110-ready-synthetic` was not written because adding that folder to `.vscode-test.mjs` would change the folder lists of the other smoke tests; the refusal text is compared with `judgeTransition`, and the hand-off text is covered in `moves.test.ts`. The not-found answer for a file gone from disk is covered in `openFile.test.ts` only. New in core beyond the plan: `boardRequests.ts` (the six board handlers and the move/open-file result events) and `shellSelection.ts` (the shell selection as `SelectionSource`). One `createModelSource` instance is shared by the shell service and the board. `StudioApi.board()` is test only. The sink for the Move command posts to the panel when it is visible on the Spec Board and shows a VS Code message otherwise. `start` is `undefined` in the composition: every Ready to Active move is answered with "Agent start is not available yet". 0006's plan must adopt the filter shape of `src/shared/protocol/boardFilter.ts` (`states`, `providers`, `set`).

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-002 | `src/core/board/cards.ts:buildCards` | `cards.test.ts` (AC-001) | verified |
| AC-002 | T-002 | `src/core/board/cards.ts:buildCards` | `cards.test.ts` (AC-002) | verified |
| AC-003 | T-002 | `src/core/board/cards.ts:buildCards` | `cards.test.ts` (AC-003) | verified |
| AC-004 | T-002, T-007 | `src/core/board/description.ts:describeSpec` | — + manual: Gregor, two-line limit; `description.test.ts`, `cards.test.ts` (AC-004) | built |
| AC-005 | T-001, T-006 | `src/core/board/filters.ts:arrangeBoard`; src/webview/board/FilterBar.tsx | `filters.test.ts` (AC-005); SpecBoard.test.tsx (AC-005) | built |
| AC-006 | T-003, T-006 | `src/core/board/progress.ts` | `progress.test.ts` (AC-006) | built |
| AC-007 | T-003 | `src/core/board/runs.ts:indexRuns, cardRun` | `runs.test.ts` (AC-007) | built |
| AC-008 | T-007, T-010 | src/webview/areas/SpecBoard.tsx; `src/core/shell/shellService.ts:onDidNavigate` | SpecBoard.test.tsx (AC-008); `boardService.test.ts` (AC-008); `webviewBundle.test.ts`; `src/test/board.smoke.test.ts` (CI) | built |
| AC-009 | T-006, T-009 | src/webview/detail/SpecDetail.tsx | SpecDetail.test.tsx (AC-009) | built |
| AC-010 | T-005, T-006, T-009, T-010 | `src/core/board/openFile.ts:createOpenFile`; src/webview/detail/{SpecDetail,DetailSection}.tsx | `openFile.test.ts` (AC-010); SpecDetail.test.tsx (AC-010) | built |
| AC-011 | T-001, T-004 | `src/core/board/filters.ts:arrangeBoard`; `boardRequests.ts` | `filters.test.ts` (AC-011); `boardService.test.ts` (AC-011); `boardRequests.test.ts` | built |
| AC-012 | T-001, T-007 | `src/core/board/filters.ts:arrangeBoard`; src/webview/board/FilterBar.tsx | `filters.test.ts` (AC-012); SpecBoard.test.tsx (AC-012); `shellService.navigation.test.ts` (onDidNavigate) | built |
| AC-013 | T-001 | `src/core/board/filters.ts:arrangeBoard` | `filters.test.ts` (AC-013) | verified |
| AC-014 | T-005, T-008, T-010 | `src/core/board/moves.ts:createMoves`; src/webview/board/MoveMenu.tsx; SpecBoard.tsx | `moves.test.ts` (AC-014); Keyboard.test.tsx (AC-014); `manifest.test.ts`; `src/test/board.smoke.test.ts` (CI) | built |
| AC-015 | T-005 | `src/core/board/moves.ts:requestMove` | `moves.test.ts` (AC-015) | verified |
| AC-016 | T-005, T-010 | `src/core/board/moves.ts`, `openFile.ts` | `noWrite.test.ts` (AC-016); `src/test/board.smoke.test.ts` (CI) | built |
| AC-017 | T-008, T-009 | src/webview/board/focusModel.ts; src/webview/detail/DetailSection.tsx:OpenButton | — + manual: Gregor, keyboard-only pass; focusModel.test.ts; Keyboard.test.tsx (AC-017); SpecDetail.test.tsx (keyboard-operable) | built |
| AC-018 | T-007, T-008 | src/webview/board/Announcer.tsx | — + manual: Gregor, screen reader; Keyboard.test.tsx (AC-018) | built |
| AC-019 | T-004, T-007, T-008 | src/webview/board/focusModel.ts:fallbackFocus | Keyboard.test.tsx (AC-019) | built |
| AC-020 | T-002 | `src/core/board/cards.ts:buildCards, buildBanner` | `cards.test.ts` (AC-020) | built |
| AC-021 | T-007 | src/webview/areas/SpecBoard.tsx; src/webview/board/Column.tsx | SpecBoard.test.tsx (AC-021); `boardService.test.ts` (AC-021) | built |
| AC-022 | T-001, T-004 | `src/shared/protocol/boardFilter.ts`, `filters.ts`; `extension.ts` (navigation to `applyNavigationFilter`) | `boardFilter.test.ts`, `filters.test.ts` (AC-022); `boardService.test.ts` (AC-022); SpecBoard.test.tsx (AC-022) | built |
| AC-023 | T-004 | `src/core/board/boardUiState.ts`; `studioPanel.ts` (`panelClosed`) | `boardService.test.ts` (AC-023) | built |
| AC-024 | T-002, T-006 | `src/core/board/cards.ts:blockedLines, readinessLine` | `cards.test.ts` (AC-024) | built |
| AC-025 | T-003 | `src/core/board/progress.ts:lastChange`, `cards.ts` | `progress.test.ts` (AC-025) | verified |
| AC-026 | T-007 | src/webview/main.css (theme variables only) | `webviewCss.test.ts` (AC-026) + manual: Gregor, light/dark/High Contrast | built |
| AC-027 | T-006, T-009 | src/webview/detail/SpecDetail.tsx | SpecDetail.test.tsx (AC-027) | built |
| AC-028 | T-006, T-009 | src/webview/detail/SpecDetail.tsx | SpecDetail.test.tsx (AC-028) | built |

## Session handoff

- **Done so far:** T-001 to T-010 are ticked and committed (baseline 0ecc7a7 plus 0003 T-009/T-010 and 0004 T-010, which this plan needed). The board, the detail, the Move to menu and command, native drag and drop, Open file, the panel wiring and the docs sync are in place. 1111 unit tests, both `tsc`, eslint and `npm run compile` are green.
- **Next action:**
  1. CI or Gregor: `npm test` (host suite, including `src/test/board.smoke.test.ts`).
  2. Gregor, manual: AC-017 keyboard-only pass, AC-018 screen reader, AC-026 and the two-line limit of AC-004 in a Light, a Dark and a High Contrast theme.
  3. A fresh session: `/sdd-compile` for 0007; the spec stays `In Progress` until then.
  4. 0006's plan adopts the filter shape of `boardFilter.ts`.
- **Open decisions:** none. Accepted limitation (spec): a second window sees new runs only at its next refresh. The ADR-001 §11 amendment (native drag and drop) is written.
- **Baseline:** 0ecc7a7 (HEAD before the first 0007 commit)
- **Environment:** this worktree needs `npm ci` first; `npm test` cannot run in the sandbox (CI runs it).
