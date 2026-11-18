# Plan — Native Spec Tree and a Two-Tab Panel

**Spec:** [0020-native-spec-tree.md](0020-native-spec-tree.md)
**Status:** Done
**Last updated:** 2026-11-18
**Current step:** — (all steps verified)

## Approach

The tree is first a pure core model (`core/shell/specTree.ts`) built beside today's five-entry
`treeModel.ts`, then made live and given its actions behind ports, so stages 1–2 are proven on
fakes without `vscode`. T-005 switches the adapter, manifest and host smoke to it in one step (the
riskiest: VS Code's tree behaviour is proven here only through a mocked `vscode` and the manifest).
Only then does the Spec Explorer area go — first the area, its tab and command (T-006), then the
list's contract, texts and styles (T-007) — so every step leaves a working extension; docs, §5
notes, the test-title audit and the sync come last. Files this task did not create are deleted only
where a step's **Deletes:** line names them: the implementer names that list at the start of the
stage and waits for the yes (Ask-first; 0015's practice). Test review once per stage from the tests
named in each `Do:` (`AGENTS.md` *TDD*). Memory Bank touched in T-008 only: `techContext.md`,
`systemPatterns.md`, `activeContext.md`.

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` ·
2 `npx tsc --noEmit` · 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile`
(steps touching wiring, adapters, `package.json` or the bundle) · `npm run compile-tests` (host-test
compile) · pre-done gate `npm test` on Windows and CI (host smoke cannot run in the agent sandbox).

## Research

**Checkpoint digest (2026-11-18, `/sdd-plan` under Gregor's delegation).** No question only Gregor
can answer: every open choice is decided by the spec, PD-058…PD-065 and
`.claude/rules/ux-guidelines.md`, recorded as proxies P-1…P-24 below. Gregor reads this plan and
replies with changes or approval.

**Spec revised first (P-1, P-2).** PD-065 (2026-11-18, after the spec's last revision `f6d53c5`,
2026-11-17 23:19) keeps 0018 AC-029's `▸` exception "until 0020 removes that area": §5 gains a row
voiding it. OP-004 is resolved (names confirmed at `fd74ec7`), OP-006 records this pass, and AC-011
and §6 name the row-activation title `Select Spec`.

**Survey (code at `fd74ec7`, 0019 T-008).**
- Tree today: `core/shell/treeModel.ts` (`project | open | area | action`, `AREA_ICONS`),
  `adapters/vscode/studioTree.ts` (flat items, `TreeView.message`, context key
  `featherspec-studio.panelState`; no IDs, menus, badge). `api.shell().tree()` returns that model;
  `src/test/setup/noProject.test.ts` reads `.welcome` and `.items`.
- Row data exist: `buildCards` (`core/board/cards.ts`: state, deprecated, Problem count, step,
  tasks, criteria, path while duplicated; title falls back to the *stem*), `LifecycleEntry`
  (`persistence`, `rule`, `diagnostics` with tier, `plan` = plan in use), `nextStep()` (text
  rules NS-1, NS-3, NS-11), `stepView()` (`short`, `line`, `lines`); `shortTitle.ts` has a private
  `cut` with limit 80; `filters.ts` compares numbers with `Number()` then text.
- Texts the tree reuses sit in `shared/protocol/texts.ts` (`LOADING_TEXT`, `NO_SPECS_START_TEXT`,
  `problemsBadgeText` = T-05, `DERIVED_SENTENCES` = T-09, `stepsText`, `criteriaShortText`,
  `fileNotFoundText`, `DEPRECATED_MARKER`). `escapeMarkdown` (`core/copyNextStep/entryView.ts`)
  escapes every ASCII punctuation mark, so it cannot be used inside a code span.
- Selection: `extension.ts` registers `featherspec-studio.selectSpec` (0019 P-6, not contributed):
  `service.select` + `panel.show({ preserveFocus: true })`; `StudioPanel.show` reveals in the
  panel's column or creates it with `preserveFocus`; `ShellService.open({via: 'start'})` sets the
  BR-02 start area from the memory.
- Copy: `createCopyNextStep`'s private `copy(line)` = `copyLine` + `entry.copied(ok)` (status bar
  `$(check) Copied` / `$(warning) Could not copy`, `FEEDBACK_MS` 2000) + `ui.warn` on failure.
- Open: `createOpenFile` refuses keys outside the model's spec, plan and note keys;
  `EditorPort.open(root, key, line?)`; `editor.ts` always opens `ViewColumn.Beside` (0019);
  `editor.test.ts` mocks `vscode` with `vi.mock`, the pattern for adapter unit tests.
- States: `derivePanelState`; `ShellView.state` is S4 while Refresh or Retry runs, model still
  loaded; `statusEntry.ts` checks the loaded model (active root, `sameRoot`) and counts projects
  as `result.folders` with verdict `project`.
- Spec Explorer: `AREA_IDS`/`AREAS` (`protocol/areas.ts`), `AREA_COMMANDS` (`vscode/commands.ts`),
  `AREA_PATHS` (`webview/board/icons.tsx`), `areas/registry.tsx`, `areas/SpecExplorer.tsx` (only
  consumer of `ShellView.rows`, `focusSpecListRow`, the `NO_DETAIL_SELECTION_TEXT` hint of
  `SpecDetail`), `SpecRow`/`isSpecRow` (`messages.ts`), `core/shell/specRows.ts`, CSS `.explorer*`,
  `.spec-list`, `.spec-row*` and a `@media (max-width: 640px)` block, `package.json`
  `openSpecExplorer`. `parseUiMemory` drops the whole memory for an unknown area.
  `PROTOCOL_VERSION` 3; 22 `v: 3` envelope literals in six test files.
- Manifest tests compare exact `{command, title}` objects (`arrayContaining`, `toContainEqual`), so
  an added `icon` changes them; "0018 AC-001 …" asserts the exact `commandPalette` list.
- Host: the `smoke` workspace has one project (`fs110-de-active-review`: `0001-tip-splitter` "Restaurant-Rechnung mit
  Trinkgeld aufteilen" in `active/`, plan Done → Review, NS-5 `/sdd-compile …`), plus
  `incomplete-agents-only` and `not-fs-speckit`. The view ID stays, so implicit `onView` activation and
  `noMarker.test.ts` are unchanged. `shell.smoke.test.ts` uses `openSpecExplorer` and `view.rows`.
- Docs naming Spec Explorer: README (section, `spec-explorer-detail-light.png`, commands table),
  `docs/release-checklist.md` (four items), `docs/product/design-brief.md` §Spec Explorer,
  `.architecture/webview.md`, the snapshot's webview line; `docsScan.test.ts` requires ≥ 3
  screenshot links in the README.
- No `Deprecated` candidate: 0005, 0007, 0013, 0015–0019 keep their other criteria; §5 rows become
  inline notes, as 0015–0019 did.
- In parallel: a 0019 fix round (drawer scrolling below 900 px) touches `main.css` and webview
  tests; nothing here depends on it, but T-006/T-007 start on a tree that has it merged.

**VS Code facts (`engines.vscode ^1.146.0`; `@types/vscode` 1.146.0 in `node_modules`, re-read
2026-11-18).** `TreeItem.id` "has to be unique across tree … used to preserve the selection and
expansion state"; `contextValue` feeds `viewItem` in `when`; `command` is run "when the tree item
is selected"; `tooltip: string | MarkdownString`; `accessibilityInformation`; `ThemeIcon(id, color?)`
colour "only used in TreeItem"; `TreeView.badge` ("To remove the badge, set to undefined"),
`.description`, `.message`; `TabInputWebview.viewType`; `window.tabGroups.activeTabGroup`. Spec §9's
sources (API reference, 1.72 notes, UX guidelines: Views) were checked 2026-11-17 and not refetched.
- [mainThreadWebviewPanels.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/api/browser/mainThreadWebviewPanels.ts)
  — panel view types are stored as `'mainThreadWebview-' + viewType`, so a tab's `viewType` ends
  with `featherspecStudio.main` (the smoke tests already use `endsWith`) (retrieved 2026-11-18).
- [mainThreadEditorTabs.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/api/browser/mainThreadEditorTabs.ts)
  — the tab DTO passes `editor.viewType` through unchanged (retrieved 2026-11-18).
- [viewsService.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/services/views/browser/viewsService.ts)
  — every view gets `${id}.focus`, titled "Focus on {0} View": `featherspec-studio.navigator.focus`
  "Focus on Specs View" is the keyboard way in (§4.5) (retrieved 2026-11-18).
- [When clause contexts](https://code.visualstudio.com/api/references/when-clause-contexts) — `=~`
  takes a regex literal, escaped for JSON; `view` and `viewItem` scope `view/title` and
  `view/item/context` (retrieved 2026-11-18).
- [Tree View guide](https://code.visualstudio.com/api/extension-guides/tree-view) — `"group":
  "navigation"` for title actions, `"group": "inline"` for item actions; welcome content only for "a
  view that has no `TreeView.message` and an empty tree" (retrieved 2026-11-18).

**Proxy decisions (Gregor delegated; read with the plan).**
- P-1 Spec revised per PD-065 (3) (above); OP-004 resolved; OP-006 added.
- P-2 Row activation is 0019's `featherspec-studio.selectSpec`, now contributed with the title
  `Select Spec` and hidden from the palette (AC-011, §6); its handler becomes the tree's `select`.
- P-3 Tree commands `featherspec-studio.tree.copyNextStep`, `.tree.openSpec`, `.tree.openPlan`,
  titles `Copy Next Step`, `Open Spec`, `Open Plan` (menus show the title as is; no `category`);
  all four hidden by `commandPalette` `when: false`.
- P-4 In `core/shell` (spec §9): `specTree.ts` (pure `buildSpecTree`), `specTreeService.ts` (live),
  `treeActions.ts`; `specTree.ts` grows beside `treeModel.ts` until T-005 deletes the old one, as
  0019 built the picture beside `sections`. The model keeps `message`, `items`, `welcome?` and adds
  `badge?`, `description?`.
- P-5 Rows from `buildCards` plus the entry and `nextStep()`; the label falls back to the spec's
  `slug` (§4.2), not the card's stem, when the title is missing or only spaces.
- P-6 `cutAt(text, max)` exported from `core/board/shortTitle.ts` (its `cut`, limit as a parameter,
  80 unchanged for the picture); the tree uses 24.
- P-7 Row ID `JSON.stringify(['spec', root, stem])`, the path appended while the stem is
  duplicated; group IDs `group:inProgress`, `group:upNext`, `group:backlog`, `group:done` (no root, so
  the expand state carries across projects, §7).
- P-8 `contextValue` tokens `spec` + ` step` (a line to copy) + ` plan` (a plan in use), groups
  `group`. Menus: inline Copy `view == featherspec-studio.navigator && viewItem =~ /\bstep\b/`;
  context `Open Spec` (`/^spec\b/`, `spec@1`), `Open Plan` (`/\bplan\b/`, `spec@2`), Copy
  (`/\bstep\b/`, `spec@3`); group rows get no entry.
- P-9 Tooltip: Markdown paragraphs joined by a blank line (as the status entry); file text through
  `escapeMarkdown`; code spans fenced one backtick longer than the longest run inside, unescaped;
  `MarkdownString` untrusted, no theme icons, no HTML; built with the model (no `resolveTreeItem`).
  A derived state (`persistence === 'derived'`, `isDerivedRule`) reads `<State> — <T-09>`; a
  deprecated spec's state line reads `Deprecated`, as its description.
- P-10 §4.4 reading: project active + S5 → S5's line and rows; project active + loaded model (S4 of
  Refresh or Retry included) → groups or the zero-spec message; project active + no model →
  `Loading project…`; no project → today's branch of `buildTreeModel`, unchanged.
- P-11 Two or more projects = `result.folders` with verdict `project`, as `statusEntry.ts` counts.
- P-12 The service rebuilds synchronously on the shell view, the model source and discovery, and
  notifies only when the serialized model changed; AC-013 is timed from `source.set` to the listener.
- P-13 `select(ref)`: panel closed → `shell.open({via: 'start'})` first (BR-02), then
  `shell.select(ref)` and `panel.show({ preserveFocus: true })`; open → select and show (area kept).
  New `StudioPanelPort { isOpen(); show(options) }` in `core/ports/shell.ts`, served by `StudioPanel`.
- P-14 `CopyNextStep.copy(line)` becomes public; the tree copies the row's first line through it
  (0017's status feedback and warning), selecting nothing.
- P-15 `EditorPort.open(root, key, line?, place?)`, `place: 'beside' | 'activeGroup'`, default
  `beside` (0019); `createOpenFile.open` passes it. `editor.ts` resolves `activeGroup` to `Beside`
  when the active group's active tab is a `TabInputWebview` whose `viewType` ends with
  `featherspecStudio.main`, else `Active` (a fact read, unit-tested with fake groups). A `not-found`
  or `refused` result shows `File not found: <path>` through the step UI's `warn`.
- P-16 The adapter sets `message`, `badge` and `description` on every change, keeps the S2 context
  key, and is unit-tested with a mocked `vscode` (`studioTree.test.ts`).
- P-17 New texts in `shared/protocol/texts.ts` (the shell texts the host tree uses):
  `VIEW_NAME`, `GROUP_LABELS`, `NEXT_STEP_PREFIX`, `PROBLEM_PREFIX`, `badgeTooltip`,
  `TREE_COMMAND_TITLES`.
- P-18 The area goes in T-006, the list's protocol, texts and CSS in T-007; `PROTOCOL_VERSION` 4 once,
  in T-007 (both unreleased).
- P-19 `parseUiMemory` maps `specExplorer` to `overview` before the area check and keeps a valid
  selection; any other unknown area still drops the memory (0018 AC-002). The mapping is the one
  `specExplorer` left in `src` outside tests (AC-018).
- P-20 README: the Spec Explorer section and its image go; "The detail of a spec" shows a new
  `media/screenshots/spec-detail-light.png` (Board with the side panel of `studio-0015`, Light) from
  the preview harness (`techContext.md`), so three screenshot links stay. The old PNG stays
  unreferenced; its deletion is Ask-first and proposed in T-008's report.
- P-21 Deletions named per step (**Deletes:**), confirmed per stage; no move.
- P-22 Test-title audit by 0018/0019's method in T-008; expected map below.
- P-23 No `TreeView.reveal`, no `getParent`, no filter action (§3).
- P-24 Restricted Mode and reader window: no trust or writer input on the tree path; AC-014 by a
  no-write test on a temp copy.

**Expected test-title audit map (T-008 confirms it against the Baseline).** Absent at the head:
- `core/shell/treeModel.test.ts` (deleted): the project/Open Studio/area entries test and PD-048's
  icon test → void (§5 0005 AC-003, PD-048), replaced by AC-001, AC-005; "an active project keeps its
  entries while … loading or a load error" → AC-012 (groups stay). Its S2 and no-project tests keep
  their titles in `specTree.test.ts`.
- `core/shell/specRows.test.ts` (deleted, AC-007 group) → void (§5 0005 AC-007, AC-008, AC-031 row);
  order → AC-003.
- `webview/areas/areas.test.tsx` "AC-007: the Spec Explorer list" and "AC-008: selection in the panel
  UI" (row keys, path, AC-023 marker, AC-030, AC-031, round trip) → void (§5 0005 AC-007, AC-008,
  AC-022/23 list rows, AC-030, AC-031 row); `areas.timing.test.tsx` AC-007 → void, AC-013.
- `detail/Close.test.tsx` "AC-008: the Spec Explorer pane" and `SidePanel.test.tsx` "Spec Explorer
  shows no side panel" → void (§5 0019 FR-02, AC-008).
- `App.test.tsx` "lists Overview, Board and Spec Explorer", `messages.test.ts` "lists exactly
  Overview, Board and Spec Explorer, in this order" → AC-016.
- `states.test.tsx` empty Spec Explorer, `userLanguage.test.tsx` "the Spec Explorer row shows no rule
  ID", `focusIndicator.test.tsx` "… list row …", `webviewCss.test.ts` AC-030 and the selected-row
  AC-031 → void for the list (§5 0005, 0013 AC-010, 0016 AC-011/012), retitled where a staying part
  (nav item, empty board) remains.
- `sourceScan.test.ts` "the one marker left is the selected row of the Spec Explorer list …" → void
  (§5 0018 AC-029, P-1), replaced by "no `▸`".
- `shell.smoke.test.ts` "AC-003, AC-029: the tree shows the project name and the five entries …" →
  AC-019; `manifest.test.ts` "AC-003 (0005): … the view "FeatherSpec Studio"" → AC-011;
  `shellService.navigation.test.ts` "… "Spec Explorer, spec 0003-x" …" → "Board, spec 0003-x" (§5
  0005 AC-028) and "rows follow a model change …" → void (0005 AC-007), AC-013.

## Stages

1. T-001 → T-002 — the tree model in core: groups, rows, tooltip, badge, states
2. T-003 ‖ T-004 — the live tree service and the row actions (select, copy, open)
3. T-005 — the Specs view in VS Code: adapter, manifest, wiring, host smoke
4. T-006 → T-007 — the Spec Explorer area ends: two tabs and the mapping, then the list's contract and styles
5. T-008 — §5 notes, docs, test-title audit, architecture and Memory Bank sync, final gates
6. T-009 → T-016 — fix round after the 0020 compile (NOT READY: D1–D3, G1–G5, F1–F9): order, gap tests, leftovers, docs, deletions, sync

Parallel: stage 2 (T-003 adds only `specTreeService*`; T-004 the actions, two ports, `openFile`,
`editor` and `copyNextStep`; both only read `specTree.ts`, each `Verify` runs its own tests). Both
are small: run them in sequence. Stages 3–5 share `package.json`, `manifest.test.ts`, `commands.ts`
and the host smoke, so they stay `→`.

## Steps

### T-001 — The tree shows four groups of rows with state, step and icon

- **Covers:** AC-001, AC-002, AC-003, AC-004, AC-005
- **Do:** New `src/core/shell/specTree.ts` with `buildSpecTree(input)` (P-4) for the loaded-model
  case: groups per §4.1 (empty ones left out, Done collapsed), order per AC-003 (numbers compared
  as `filters.ts` does), rows from `buildCards` + entry (P-5): label via `cutAt(…, 24)` (P-6), IDs (P-7),
  description `<State> · <short>` / `<State>` / `Deprecated`, icon table and the `warning` override,
  accessible label with `problemsBadgeText`, `contextValue` (P-8), the first line and plan key for
  the actions. `GROUP_LABELS` in `texts.ts`; `cutAt` exported from `shortTitle.ts`. Tests
  `src/core/shell/specTree.test.ts` on `modelOf` memory projects (`core/board/testing/boardWorld.ts`)
  and `test/fixtures/studio-0015` (AC-004's Given): group set and counts, Blocked → Review → Active,
  a 24- and a 25-character title, a title of spaces, a duplicated stem, a backlog → active move, two
  roots, group ID for counts 1 and 3, unique IDs, every state icon, a Problem (`fs-broken`).
- **Verify:** `npx vitest run --project node src/core/shell/specTree.test.ts src/core/board/shortTitle.test.ts`
  red (`Not implemented` stub), then green; gates 1–4
- [x] **Verified (T-001):** 2026-11-18: vitest (node) on specTree.test.ts + shortTitle.test.ts red first (18 failed, `Not implemented`; the 6 cutAt tests green at once, a refactor of the 80-limit cut guarded by the unchanged shortTitle tests), then green 48/48; mutants (rank order, limit 25) fail 3 tests; gates 1-4 green, unit 2151 passed + 3 skipped, timing 12.
- **Notes:** No deviation. Model types live in specTree.ts (SpecRowModel, GroupModel, ActionRowModel); tooltip is empty until T-002. No deletions in this step.

### T-002 — Rows explain themselves on hover; the view tells its state; the badge counts what waits

- **Covers:** AC-006, AC-010, AC-012 (§4.4; the S2 manifest part in T-005), AC-011 (view description)
- **Do:** In `specTree.ts`: tooltip per §4.2 and P-9; badge per §4.3; description per P-11; §4.4
  per P-10 (the no-project branch copied from `buildTreeModel`). Texts `NEXT_STEP_PREFIX`,
  `PROBLEM_PREFIX`, `badgeTooltip`. Tests in `specTree.test.ts`: a Review spec (two lines, figures,
  path), a derived state, a Done spec (NS-3 text), Deprecated, two Problems, Markdown characters in a
  title and a backtick in a line, a figure not available; badge 1 Review, 2 Review + 1 Blocked, zero,
  absent during a message; description with one and two projects; every §4.4 row (S4 with and
  without a model, S5 discovery and listing with a project active, zero specs); the four no-project
  tests of `treeModel.test.ts` copied with their titles.
- **Verify:** `npx vitest run --project node src/core/shell/specTree.test.ts` red (failing
  assertions), then green; gates 1–4
- [x] **Verified (T-002):** 2026-11-18: vitest (node) specTree.test.ts red first (24 of 49 failed on assertions: tooltip, badge, description, states), then green 49/49; mutants (badge count, paragraph separator) fail 9 tests; gates 1-4 green, unit 2182 passed + 3 skipped, timing 12.
- **Notes:** Own text (state line, T-09 sentence, rule text, step labels) is not escaped; only file text (title, Problem reasons) goes through escapeMarkdown, and code spans are fenced. SpecRowModel gained state (for the badge). The no-project tests of treeModel.test.ts are copied with their titles (describe 'AC-003: the Activity Bar tree model'). No deletions in this step.

### T-003 — The tree follows every change within 500 ms

- **Covers:** AC-013 (core part)
- **Files:** `src/core/shell/specTreeService.ts`, `src/core/shell/specTreeService.test.ts`,
  `src/core/shell/specTreeService.timing.test.ts`
- **Do:** `createSpecTreeService({ shell, source, discovery, sameRoot })` → `{ model(),
  onDidChange(listener), dispose() }` (P-12). Tests on the shell world (`core/shell/testing/world.ts`):
  a spec added shows in Backlog, a state change moves its row, a ticked step changes the description,
  a second project sets the view description, an unchanged rebuild notifies nobody, dispose stops.
  Timing on `generateProject(…, 200)` with a fake source and shell, as `boardService.timing.test.ts`:
  `source.set` → listener sees the change, `bestOfThree` < `BUDGET_MS.uiFreshness`.
- **Verify:** `npx vitest run --project node src/core/shell/specTreeService.test.ts` and
  `npx vitest run --project timing-node src/core/shell/specTreeService.timing.test.ts` red (stub),
  then green; gates 1–4
- [x] **Verified (T-003):** 2026-11-18: vitest (node) specTreeService.test.ts and (timing-node) specTreeService.timing.test.ts red first (9 + 1 failed, Not implemented stub), then green 9/9 and 1/1; mutant without the source subscription fails the timing test (heard >= 3); gates 1-4 green, unit 2191 passed + 3 skipped, timing 13.
- **Notes:** Sequence, not parallel. The shell world's model source is a second createModelSource over the world's repository. Nothing deleted.

### T-004 — Select, copy and open from a row

- **Covers:** AC-007, AC-008, AC-009 (core part), AC-014
- **Files:** `src/core/shell/treeActions.ts`, `src/core/shell/treeActions.test.ts`,
  `src/core/ports/shell.ts`, `src/core/ports/board.ts`, `src/core/board/openFile.ts`,
  `src/core/board/openFile.test.ts`, `src/adapters/vscode/editor.ts`,
  `src/adapters/vscode/editor.test.ts`, `src/core/copyNextStep/copyNextStep.ts`,
  `src/core/copyNextStep/copyNextStep.test.ts`
- **Do:** `createTreeActions({ shell, panel, copy, openFile, warn })` with `select` (P-13), `copy`
  (P-14), `open(row, 'spec' | 'plan')` (P-15); `StudioPanelPort`; `EditorPort` and `createOpenFile`
  gain `place`; `CopyNextStep.copy` public. Tests: select with the panel open on Board (area kept,
  selection set, `preserveFocus: true`) and closed (remembered start area, else Overview), a gone stem
  (notice); copy puts the first line on a fake clipboard, `copied(true)`, a failing clipboard gives
  `copied(false)` and the warning, selection unchanged; Open Spec and Open Plan at line 1 with
  `activeGroup`, panel port untouched, a gone file and a refused key → `File not found: <path>`;
  `editor.test.ts` fake groups: Studio tab active → `Beside`, a text editor or empty group →
  `Active`, `preview: false`, 0019's tests unchanged; no-write: tree and actions over a temp copy of
  `studio-0015` with untrusted fakes leave the snapshot unchanged.
- **Verify:** `npx vitest run --project node src/core/shell/treeActions.test.ts src/core/board/openFile.test.ts src/adapters/vscode/editor.test.ts src/core/copyNextStep/copyNextStep.test.ts`
  red (stub, failing placement), then green; gates 1–4
- [x] **Verified (T-004):** 2026-11-18: vitest (node) on treeActions.test.ts, openFile.test.ts, editor.test.ts, copyNextStep.test.ts red first (10 failed on the Not implemented stub in treeActions; editor placement test failed with Beside for Active), then green 54/54; mutants (no open before select, preserveFocus false) fail 2 tests; gates 1-4 green, unit 2208 passed + 3 skipped, timing 13.
- **Notes:** Sequence, not parallel. editor.test.ts mock gained tabGroups, TabInputWebview and TabInputText through vi.hoisted; 0019's editor tests unchanged. OpenFile.open(key, line?, place?) keeps the old editor call shape when no place is given. A refused key shows File not found: <key> like a gone file. Nothing deleted.

### T-005 — The Specs view in VS Code: rows, menus, badge, toolbar

- **Covers:** AC-011, AC-012 (S2 welcome unchanged), AC-015 (one inline action), AC-019; host parts
  of AC-009, AC-013; re-proves the mapping of AC-002, AC-006, AC-010
- **Deletes:** `src/core/shell/treeModel.ts`, `src/core/shell/treeModel.test.ts`
- **Do:** `adapters/vscode/studioTree.ts` maps the model (P-16): groups `Expanded`/`Collapsed` with ID
  and count; rows with ID, description, `ThemeIcon(id, ThemeColor)`, untrusted `MarkdownString`,
  `accessibilityInformation`, `contextValue`, `command` = `selectSpec {stem, path?}`; action rows as
  today. New `studioTree.test.ts` (mocked `vscode`). `commands.ts` tree IDs (P-3). `extension.ts`:
  tree service, tree actions (panel port from `StudioPanel`, `copyNextStep`, `openFile`,
  `createStepUi().warn`), `selectSpec` → `select`, the three tree commands with an argument guard,
  `tree()` returns the new model. `package.json`: view `Specs`; icons `$(window)`, `$(refresh)`,
  `$(copy)`; four commands with P-2/P-3 titles; `view/title` `navigation@1`, `@2`;
  `view/item/context` (P-8); palette hides. `manifest.test.ts`: AC-011, AC-015 inline count, AC-012
  S2 literal; adapt "AC-015, AC-016: …" (icons), "0018 AC-001: …" (palette list), "AC-003 (0005): …"
  (view name). `src/test/shell.smoke.test.ts`: AC-019 replaces "AC-003, AC-029: the tree shows …";
  AC-009 host (closed panel opens with the spec selected, open panel stays on Board); AC-013 host
  (a backlog file added shows in Backlog, removed in `finally`).
- **Verify:** `npx vitest run --project node src/adapters/vscode/studioTree.test.ts src/adapters/vscode/manifest.test.ts`
  red, then green; gates 1–5; `npm run compile-tests`; host smoke on Windows and CI (pre-done gate)
- [x] **Verified (T-005):** 2026-11-18: studioTree.test.ts (7) and manifest.test.ts (7 failing of 28) red on a scratch copy of HEAD (git archive), then green 7/7 and 28/28 here; gates 1-5 green (eslint, both tsc, unit 2206 passed + 3 skipped, timing 13, compile) and compile-tests green. Host smoke (AC-019, AC-009, AC-013 host parts) written, cannot run in the sandbox; Windows and CI at the pre-done gate.
- **Notes:** Deletes named at the start of the stage and approved by Gregor's delegation: src/core/shell/treeModel.ts and src/core/shell/treeModel.test.ts (git rm, nothing else). The adapter takes the SpecTreeService (not the ShellService); api.shell().tree() returns the SpecTreeModel (groups, badge, description). The inline and context commands receive the tree element (SpecRowModel) as argument; treeRow guards it. OPEN_STUDIO_LABEL (texts.ts) had no user left and was removed. The AC-013 host test keeps the test's error when its cleanup also fails.

### T-006 — The panel has two tabs; a remembered Spec Explorer opens the Overview

- **Covers:** AC-015 (no Spec Explorer command or title), AC-016, AC-017
- **Deletes:** `src/webview/areas/SpecExplorer.tsx`
- **Do:** `AREA_IDS`/`AREAS` without `specExplorer`; `AREA_COMMANDS`, `AREA_PATHS`, the registry;
  `parseUiMemory` mapping (P-19); `package.json` drops `openSpecExplorer`; `focusSpecListRow` goes
  with its only caller. Tests: `uiMemory.test.ts` and `shellService.navigation.test.ts` for AC-017
  (the spec's Given; a stem not in the model → cleared with the notice; another unknown area still
  drops all); `App.test.tsx` and `messages.test.ts` two tabs in order with icons, the navigation
  requests only `overview` and `board`; `manifest.test.ts` AC-015; the Spec Explorer tests per the
  expected audit map — voided ones removed, staying ones retargeted to Board (`areas.test.tsx`
  notice, `Close.test.tsx`, `SidePanel.test.tsx`, `states.test.tsx`, `focusIndicator.test.tsx`,
  `userLanguage.test.tsx`, `webviewBundle.test.ts`, shell smoke AC-009 and AC-025 via `openBoard`).
- **Verify:** `npx vitest run --project node src/core/shell/uiMemory.test.ts src/core/shell/shellService.navigation.test.ts src/adapters/vscode/manifest.test.ts`
  and `npx vitest run --project webview src/webview/App.test.tsx` red, then green; gates 1–5;
  `npm run compile-tests`
- [x] **Verified (T-006):** 2026-11-18: uiMemory.test.ts + shellService.navigation.test.ts (AC-017: 3 red), manifest.test.ts (AC-015: 1 red), messages.test.ts (2 red), App.test.tsx (3 red) red on a scratch copy of HEAD (git archive), then green here; gates 1-5 green (eslint, both tsc, unit 2204 passed + 3 skipped, timing 13, compile) and compile-tests green.
- **Notes:** Deletes named at the start of the stage and approved by Gregor's delegation: src/webview/areas/SpecExplorer.tsx (git rm, nothing else). Spec Explorer tests per the audit map: voided and removed (areas.test.tsx AC-007 and AC-008 groups, areas.timing.test.tsx AC-007 replaced by a notice freshness test, Close.test.tsx AC-008 pane, SidePanel.test.tsx Spec Explorer shows no side panel, states.test.tsx the explorer part, userLanguage.test.tsx the explorer row, SpecDetail.test.tsx the hint test), retargeted to Board/Overview (SpecDetail.test.tsx and timing, SpecBoard tests, focusIndicator.test.tsx, webviewBundle.test.ts, shellService.navigation.test.ts, shell.smoke.test.ts via openBoard); PanelStateView.test.tsx AC-018 count 3 to 2. sourceScan.test.ts: the marker exception test is replaced by 'no ▸' here (the Spec Explorer file is gone), the AC-018 search of src stays in T-007. focusSpecListRow went with its only caller. The one specExplorer left in src is the mapping in uiMemory.ts.

### T-007 — The list's contract, texts, styles and hint go

- **Covers:** AC-018 (`src` part); re-proves AC-016
- **Deletes:** `src/core/shell/specRows.ts`, `src/core/shell/specRows.test.ts`
- **Do:** `ShellView.rows`, `SpecRow`, `isSpecRow`, `buildSpecRows` out; `PROTOCOL_VERSION` 4 with
  the envelope literals of the six test files (P-18); texts `NO_SPECS_TEXT`, `SPEC_LIST_LABEL`,
  `NO_DETAIL_SELECTION_TEXT`, the Explorer purpose; `SpecDetail`'s hint branch; CSS `.explorer*`,
  `.spec-list`, `.spec-row*` and their `@media` block (a rule another component uses stays: grep
  first); `webviewCss.test.ts` list-row tests per the map, the nav-item part kept. `sourceScan.test.ts`:
  AC-018's search of `src` without tests, except the mapping in `uiMemory.ts`, with a negative
  control, and no `▸` at all (replaces the marker-exception test). `shellService.navigation.test.ts`
  reads `view().selection` instead of `rows`; the shell smoke's `panelState` drops `rows`.
- **Verify:** `npx vitest run --project node src/adapters/node/sourceScan.test.ts src/shared/protocol/messages.test.ts`
  red, then green; gates 1–5; `npm run compile-tests`
- [x] **Verified (T-007):** 2026-11-18: messages.test.ts (PROTOCOL_VERSION 4, a view without rows), webviewCss.test.ts (no list rules), probe.test.ts and client.test.ts (version 4) red on a scratch copy of HEAD (git archive; 3 + 3 failed); sourceScan.test.ts AC-018 is green at once, its negative control plants every term; then green; gates 1-5 green (eslint, both tsc, unit 2199 passed + 3 skipped, timing 13, compile) and compile-tests green.
- **Notes:** Deletes named at the start of the stage and approved by Gregor's delegation: src/core/shell/specRows.ts and src/core/shell/specRows.test.ts (git rm, nothing else). PROTOCOL_VERSION 4: the six test files carry v: 4; the 'other version' literals of client.test.ts and PanelStateView.test.tsx became v: 5. Texts NO_SPECS_TEXT, SPEC_LIST_LABEL and NO_DETAIL_SELECTION_TEXT went; SpecDetail's hint branch returns null (the side panel never passed it a non-spec detail; its test was retitled in T-006). CSS: .explorer*, .spec-list, .spec-row*, the cells .spec-number/.spec-title/.spec-meta/.spec-state/.spec-derived/.spec-path (nobody else used them: grep) and the 640 px media block are gone; the sourceScan AC-018 search found only the mapping in uiMemory.ts.

### T-008 — §5 notes, docs, test-title audit, architecture and Memory Bank sync, final gates

- **Covers:** AC-018 (docs part), AC-020, AC-021, AC-022 (checklist item); re-proves AC-001…AC-019
- **Do:** Inline notes "*Amended by 0020 (PD-058): …*" at each §5 statement of 0005, 0007, 0013,
  0015, 0016, 0017, 0018, 0019 and ADR-001 §2; the PD register stays unedited. README: the view
  "Specs" (four groups, inline Copy, badge, toolbar, "Focus on Specs View" and Shift+F10), two tabs,
  commands table, no Spec Explorer section, screenshot per P-20. `docs/release-checklist.md` (Spec
  Explorer items reworded, a 0020 section with AC-022), `docs/product/design-brief.md` (§Spec
  Explorer → the tree and the side panel), CHANGELOG *Unreleased*. `docsScan.test.ts`: AC-018's docs
  search and the README names. Test-title audit: throwaway `/tmp/audit-0020/titles.py`
  (`describe`/`it`/`test`/`suite` literals of every `.ts`/`.tsx` under `src`, `src/test/**` and
  `testing/*.ts` included) at the Baseline (`git archive`) and the head; `## Test-title audit` here
  lists every absent title with its §5 row or replacing title. `/sdd-architecture-update`
  (confirmation = this plan's approval) changes exactly: `last reconciled` → `<date> (0020)` in
  `AGENTS.md` and the three module maps; snapshot `src/core/<area>` line `shell 0005` → `shell 0005
  (+ spec tree, tree service, tree actions 0020)`; `src/adapters` line `vscode/ (thin host ports, no
  logic)` → `vscode/ (thin host ports, no logic; the Specs tree view 0020)`; `src/webview` line drops
  `Spec Explorer, ` and `and as the Spec Explorer pane`; `src/shared/protocol` line adds 0020 to its
  spec list; `.architecture/core.md` shell line (`spec rows, tree model` → `spec tree, tree service,
  tree actions (0020)`), `adapters.md` (`studioTree.ts`; `editor.ts` active group or beside),
  `webview.md` (two areas, no pane). Memory Bank: `techContext.md` *Test* (one 0020 line),
  `systemPatterns.md` (one 0020 entry: native tree from the core model, IDs, menus by
  `contextValue`, tree actions, the `specExplorer` mapping), `activeContext.md`. Final gates.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green;
  audit counts in this plan; `grep -c "Amended by 0020"` on the eight spec files and ADR-001 ≥ their
  §5 rows; `git diff <Baseline> -- docs/product/product-decisions.md` empty; gates 1–5;
  `npm run compile-tests`; `npm test` on Windows and CI (pre-done gate); AC-022 manual: Gregor or
  his delegate in a real VS Code (no command sees VS Code's native tree drawing)
- [x] **Verified (T-008):** 2026-11-18, agent sandbox: `docsScan.test.ts` red first on a scratch copy of the T-007 head (17 failed of 72: no Spec Explorer in README, checklist, design brief, AGENTS.md and `.architecture`, the README names, the checklist item, CHANGELOG, the nine `Amended by 0020` counts), then green (72 passed); `grep -c "Amended by 0020"`: 0005 28, 0007 6, 0013 4, 0015 3, 0016 4, 0017 2, 0018 5, 0019 8, ADR-001 1 (each at least its §5 rows); `git diff 16fc52b -- docs/product/product-decisions.md` empty; test-title audit below (44 absent, all explained); eslint, `tsc --noEmit`, `tsc --noEmit -p src/webview` clean; `npm run test:unit` 139 files, 2217 passed + 3 skipped (timing project 13 passed); `npm run compile` and `npm run compile-tests` green. Not run here: `npm test` on Windows and CI (host tests), AC-022 (manual, Gregor or his delegate).
- **Notes:** (1) Deletes: none in this step. (2) The §5 notes are one `*Amended by 0020 (PD-058): …*` line under each named statement (bullet, paragraph, table or heading), inserted by a throwaway script (`/tmp/audit-0020/note.py`); the PD register is untouched. (3) README: the section "The Specs view" replaces "Spec Explorer"; the new `media/screenshots/spec-detail-light.png` is a preview-harness screenshot (Board, side panel of `studio-0015`, Light, 1400x900) taken on a scratch build of the T-007 head; the old `spec-explorer-detail-light.png` is now unreferenced and stays on disk: its deletion is Ask-first and proposed to Gregor. (4) `docsScan.test.ts` got a 0020 describe block (gone terms in README, checklist, design brief, AGENTS.md, `.architecture`; README names and screenshot files; checklist item; CHANGELOG; the nine note counts); CHANGELOG history is exempt. (5) `/sdd-architecture-update` changed exactly the lines the step names (the plan's approval is the confirmation); `adapters.md` also names the tree adapter and the editor's active-group rule. (6) The audit's "present" test is the same literal in any file at the head; template-literal titles are compared as written. (7) Checklist item "Keyboard and screen reader" is added beside AC-022 as a cheap extra for the same manual session.

### T-009 — Equal numbers are ordered by path (compile D1, G1)

- **Covers:** AC-003
- **Do:** Test first in `src/core/shell/specTree.test.ts` ("0020 AC-003: the order"): `0003-login.md` and `0003-login-page.md` in one group (Backlog, and the same pair in In progress at one state) must read `0003-login-page.md` before `0003-login.md` (path order: `-` sorts before `.`), in both directions of insertion. Then remove the stem tie-break (`compareText(left.stem, right.stem) ||`) from `compareRows` in `src/core/shell/specTree.ts`. Mutants M10 (stem tie-break stays), M11 (path tie-break removed) and M81 (stem tie-break reversed) must die.
- **Verify:** `npx vitest run --project node src/core/shell/specTree.test.ts` red on a scratch copy of HEAD (`git archive HEAD`), then green; the three mutants each fail the new test; gates 1–4
- [ ] **Verified (T-009):**
- **Notes:**

### T-010 — A row reopens a closed panel through the start path (compile G2)

- **Covers:** AC-009
- **Do:** A deciding test in `src/core/shell/treeActions.test.ts` ("0020 AC-009"): a navigation target set before the panel closed is gone after a row reopens the panel (BR-02: `shell.open({ via: 'start' })` consumes `target`); with the panel open the target stays. Mutant M40 (the `if (!deps.panel.isOpen()) deps.shell.open({ via: 'start' })` line removed) must die. Code unchanged unless the test shows a defect.
- **Verify:** `npx vitest run --project node src/core/shell/treeActions.test.ts` green, mutant M40 red; gates 1–4
- [ ] **Verified (T-010):**
- **Notes:**

### T-011 — The view description shows the project count while one project is active (compile G3)

- **Covers:** AC-011
- **Do:** In `src/core/shell/specTreeService.test.ts` replace the test whose `else` branch asserted no description by two cases: two projects and one active → the view description shows the count and the name; two projects and none active → S3 message, no description. Mutants M82 (`projectCount: 1`) and M83 (counts every folder, not only verdict `project`) in `specTreeService.ts` must die.
- **Verify:** `npx vitest run --project node src/core/shell/specTreeService.test.ts` green, M82 and M83 red; gates 1–4
- [ ] **Verified (T-011):**
- **Notes:**

### T-012 — The timing test says what it times; three weak tests decide something (compile F2, F3)

- **Covers:** AC-010 (retitle), AC-016, AC-012, AC-021 (audit home)
- **Do:** `src/webview/areas/areas.timing.test.tsx:40` "0020 AC-010: a shell event reaches the DOM" times 0005's notice (PD-047): retitle it, and home the old title in the audit (T-015). `messages.test.ts:125` `expect('rows' in view).toBe(false)` asserts the test's own literal: assert on the view the code built, or drop it. `studioTree.test.ts` "AC-012: an action row keeps its command, a group and a spec row have no icon colour of an action" asserts the action row only: assert the group and the spec row too. `shellService.navigation.test.ts`: remove the two duplicated assertion lines. A mutant per changed test must die where the test claims to decide something.
- **Verify:** the three files green; a mutant per decided claim red; gates 1–4
- [ ] **Verified (T-012):**
- **Notes:**

### T-013 — Leftovers of the removal go (compile F4)

- **Covers:** AC-016, AC-018 (no dead Spec Explorer code)
- **Deletes:** `src/webview/ui/RuleText.tsx`, `src/webview/ui/RuleText.test.tsx` (only if a grep shows no production user; approved by the orchestrator, Gregor's delegate)
- **Do:** Remove `VIEW_NAME` and `TITLE_NOT_AVAILABLE` from `texts.ts` if nothing uses them; the manifest test asserts all four `TREE_COMMAND_TITLES` from the constant (so the constant has users); remove the dead `[role="option"]:focus-visible` selector in `main.css:111`; remove `SpecDetail`'s dead `region`/null branch (the side panel passes `region={false}` and a spec detail); remove the stale `rows: []` of the fake shell view in `specTreeService.timing.test.ts`; fix the "three areas" title in `Drilldown.test.tsx:102`; drop "rule text" from `.architecture/webview.md`.
- **Verify:** `grep -rn "VIEW_NAME\|TITLE_NOT_AVAILABLE\|RuleText" src` has no hit; gates 1–5, `npm run compile-tests`
- [ ] **Verified (T-013):**
- **Notes:**

### T-014 — The README and the docs scan say what the view is; screenshots are current (compile G4, G5, F6, F9)

- **Covers:** AC-018, AC-020
- **Deletes:** `media/screenshots/spec-explorer-detail-light.png` (unreferenced), `media/screenshots/mission-control-dark.png` and `media/screenshots/spec-board-dark.png` (outdated: taken before 0016–0020); approved by the orchestrator
- **Do:** `docsScan.test.ts`: the README names the four groups, the inline Copy and "Copy Next Step", the badge sentence and the tab Board (M78–M80 die); thresholds equal the §5 counts (0005 28, 0007 6, 0013 4, 0015 3, 0016 4, 0017 2, 0018 5, 0019 8, ADR-001 1; M76 dies). README: "Copy Next Step" for the menu entry, "Focus on Specs View reaches the view; Shift+F10 opens a row's context menu"; the Overview and Board images point at `media/screenshots/overview-dark.png` and `board-dark.png` (preview-harness shots at `77f585b`, Dark, 1400×900, no selection, two tabs); `spec-detail-light.png` stays. CHANGELOG and the checklist item "Keyboard and screen reader": "Copy Next Step".
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red on a scratch copy (the new checks against the old README), then green; mutants M76, M78–M80 red; gates 1–4
- [ ] **Verified (T-014):**
- **Notes:**

### T-015 — The audit homes hold; the notes sit where they belong (compile D2, D3, F1)

- **Covers:** AC-020, AC-021
- **Do:** Plan audit: the row "an active project keeps its entries …" is homed to §5 "0005 AC-003" with the titles "a loaded model keeps its groups while Refresh or Retry re-reads (S4)" and "S5 for discovery or listing with a project active shows its line and the rows Show output and Retry, rows of an old model gone" ("0020 AC-012: the states of the view"); "PD-048" names AC-005 (not AC-002), `states.test.tsx` names AC-012 (not AC-014); the retitled timing test of T-012 is homed. `0013`: the Amended-by note moves directly below the first §3.4 bullet. `0005` pointers: lines 81 and 517 AC-009 → AC-010; 102 and 350 AC-005 → AC-009; 423 AC-022 → AC-004; 51, 93, 124 §4.1 → §4.3. Re-run the title audit against `16fc52b` at the fix head: every absent title homed.
- **Verify:** the audit script lists every absent title with a home that holds; the docsScan counts of T-014 still pass; `git diff 16fc52b -- docs/product/product-decisions.md` empty
- [ ] **Verified (T-015):**
- **Notes:**

### T-016 — Traceability, handoff and Memory Bank agree; the 0019 record

- **Covers:** AC-021, AC-022 (state only; the manual check stays open)
- **Do:** Traceability rows to `verified` where a passing deciding test ran (AC-001…AC-020 with the Windows run at `77f585b` plus this round's runs; AC-021 after T-015; AC-022 stays `open`, manual). T-008 `Verified:` and the handoff record Windows at `77f585b` (unit 2213 passed / 7 skipped + 13 timing; `npm test` 30+1+1+1) and CI 44277740119. `.memory-bank/activeContext.md` Now / Validation / Next: 0020 implemented, compiled NOT READY, fixed by T-009…T-016; next: Windows and CI at the fix head, Gregor's AC-022, a fresh `/sdd-compile` for 0014–0020. 0019 plan: the orchestrator's harness result on the AC-022 row and T-017 Notes (docs only).
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts`; full gates of `IMPL-UX.md`
- [ ] **Verified (T-016):**
- **Notes:**

## Test-title audit (0020 AC-021)

Script: `/tmp/audit-0020/titles.py` (throwaway, run with `python3 -I`): every `describe`/`it`/`test`/`suite` literal of every `.ts`/`.tsx` under `src` (including `src/test/**` and `testing/*.ts`) at Baseline `16fc52b` (`git archive`) and at the T-008 head. A title counts as present when the same literal exists in any file at the head.

Result: 2167 titles at the Baseline, 2268 at the head, 44 absent at the head. Every absent title is listed with its voided §5 row or the title that replaces it; none is missing without a reason.

| File | Absent title | Voided row or replacing title |
| --- | --- | --- |
| `adapters/node/sourceScan.test.ts` | it: the one marker left is the selected row of the Spec Explorer list (0005 AC-023), not the navigation | voided: 0020 §5 "0018 AC-029 … no ▸ except the selected-row marker"; replaced by "0020 AC-018: no ▸ is left in src …" |
| `adapters/node/webviewBundle.test.ts` | it: starts without a runtime error, renders the frame with the three areas and the loading state, and says hello | retitled: "… renders the frame with the two areas …" (0020 AC-016) |
| `adapters/node/webviewCss.test.ts` | it: AC-030: secondary text inside a selected row uses the selection foreground, not the description colour | voided: 0020 §5 "0005 AC-030" (no list row) |
| `adapters/node/webviewCss.test.ts` | it: AC-030 control: outside a selected row the secondary text keeps the description colour | voided: 0020 §5 "0005 AC-030" (no list row) |
| `adapters/node/webviewCss.test.ts` | it: AC-031: a selected row and the current navigation item carry the High Contrast active border | retitled: "AC-031: the current navigation item carries the High Contrast active border" (selected list row void; 0020 §5 "0005 AC-030; AC-031 for the spec row") |
| `adapters/vscode/manifest.test.ts` | it: AC-001, AC-005 (0005): contributes the Open command and one command per area with their titles | retitled: "AC-001, AC-005 (0005): … (Overview and Board) with their titles" (0020 §5 "0005 AC-004, AC-005") |
| `adapters/vscode/manifest.test.ts` | it: AC-003 (0005): contributes the Activity Bar container with its icon and the view "FeatherSpec Studio" | retitled: "AC-011 (0020): … the view \"Specs\"" (0020 §5 "0005 §9 Activity Bar view") |
| `core/shell/shellService.navigation.test.ts` | it: rows follow a model change without reopening and are ordered by number (AC-007) | voided: 0020 §5 "0005 AC-007"; spec rows left the protocol (0020 AC-016, protocol 4); the tree follows changes per specTreeService.test.ts (AC-013) |
| `core/shell/shellService.navigation.test.ts` | it: Given Overview is shown and spec 0003-x exists When the request "Spec Explorer, spec 0003-x" arrives Then Spec Explorer is shown and 0003 is selected | retitled: "… request \"Board, spec 0003-x\" arrives Then Board is shown …" (0020 §5 "0005 AC-028 example") |
| `core/shell/specRows.test.ts` | describe: AC-007: spec rows | voided: 0020 §5 "0005 AC-006 … AC-007" (no list; 0020 AC-003, AC-004 and the specTree.test.ts titles decide order, label and state) |
| `core/shell/specRows.test.ts` | it: are ordered by number and then by path | voided: 0020 §5 "0005 AC-006 … AC-007" (no list; 0020 AC-003, AC-004 and the specTree.test.ts titles decide order, label and state) |
| `core/shell/specRows.test.ts` | it: shows the title, or none when the spec has no title, with the board state word | voided: 0020 §5 "0005 AC-006 … AC-007" (no list; 0020 AC-003, AC-004 and the specTree.test.ts titles decide order, label and state) |
| `core/shell/specRows.test.ts` | it: carries the derived label with its rule for a derived state (PD-004) and none for a persisted one | voided: 0020 §5 "0005 AC-006 … AC-007" (no list; 0020 AC-003, AC-004 and the specTree.test.ts titles decide order, label and state) |
| `core/shell/specRows.test.ts` | it: shows the project-relative path for a duplicated stem only | voided: 0020 §5 "0005 AC-006 … AC-007" (no list; 0020 AC-003, AC-004 and the specTree.test.ts titles decide order, label and state) |
| `core/shell/specRows.test.ts` | it: marks the selected spec: by stem, and by stem plus path while duplicated | voided: 0020 §5 "0005 AC-006 … AC-007" (no list; 0020 AC-003, AC-004 and the specTree.test.ts titles decide order, label and state) |
| `core/shell/specRows.test.ts` | it: gives no rows without a model and for a project with zero specs | voided: 0020 §5 "0005 AC-006 … AC-007" (no list; 0020 AC-003, AC-004 and the specTree.test.ts titles decide order, label and state) |
| `core/shell/treeModel.test.ts` | it: with an active project: the project name, Open Studio and one entry per area, and no message | replaced by 0020 AC-001/AC-005: `buildSpecTree` rows (no project, Open Studio or area entries; 0020 §5 "0005 §9 Activity Bar view") |
| `core/shell/treeModel.test.ts` | it: PD-048: every entry of an active project has an icon of its own | voided: 0020 §5 "PD-048": no project and area entries; tree icons per 0020 §4.2, AC-002 |
| `core/shell/treeModel.test.ts` | it: an active project keeps its entries while a state such as loading or a load error applies | replaced by `AC-003: the Activity Bar tree model` no-project titles in specTree.test.ts (loading and load-error rows now follow 0020 AC-014, §4.4) |
| `shared/protocol/messages.test.ts` | describe: 0015 AC-001, AC-002: three areas | replaced by "0020 AC-016: two areas" (0020 §5 "0015 AC-001") |
| `shared/protocol/messages.test.ts` | it: lists exactly Overview, Board and Spec Explorer, in this order | replaced by "0020 AC-016: two areas" (0020 §5 "0015 AC-001") |
| `test/shell.smoke.test.ts` | test: AC-003, AC-029: the tree shows the project name and the five entries; every shell command is registered | replaced by "AC-019: the tree holds the group In progress …" (0020 §5 "0005 AC-003"); host test, runs on Windows and CI |
| `webview/App.test.tsx` | it: lists Overview, Board and Spec Explorer | replaced by "0020 AC-016: lists exactly Overview and Board …" |
| `webview/areas/areas.test.tsx` | describe: AC-007: the Spec Explorer list | voided: 0020 §5 "0005 AC-006 … AC-007, AC-008, AC-022, AC-023, AC-030" (no Spec Explorer list) |
| `webview/areas/areas.test.tsx` | it: renders every field: number, title or "not available", the state word, the derived label and the path of a duplicated stem | voided: 0020 §5 "0005 AC-006 … AC-007, AC-008, AC-022, AC-023, AC-030" (no Spec Explorer list) |
| `webview/areas/areas.test.tsx` | it: keeps the order the host sent | voided: 0020 §5 "0005 AC-006 … AC-007, AC-008, AC-022, AC-023, AC-030" (no Spec Explorer list) |
| `webview/areas/areas.test.tsx` | it: with zero specs it shows "This project has no specs yet." and no list | voided: 0020 §5 "0005 AC-006 … AC-007, AC-008, AC-022, AC-023, AC-030" (no Spec Explorer list) |
| `webview/areas/areas.test.tsx` | describe: AC-008: selection in the panel UI | voided: 0020 §5 "0005 AC-006 … AC-007, AC-008, AC-022, AC-023, AC-030" (no Spec Explorer list) |
| `webview/areas/areas.test.tsx` | it: a click, Enter and Space on a row send select with the stem; rows are reachable by keyboard | voided: 0020 §5 "0005 AC-006 … AC-007, AC-008, AC-022, AC-023, AC-030" (no Spec Explorer list) |
| `webview/areas/areas.test.tsx` | it: a row of a duplicated stem sends select with its path | voided: 0020 §5 "0005 AC-006 … AC-007, AC-008, AC-022, AC-023, AC-030" (no Spec Explorer list) |
| `webview/areas/areas.test.tsx` | it: AC-023: the selected row carries aria-selected and a visible marker, and no other row does | voided: 0020 §5 "0005 AC-006 … AC-007, AC-008, AC-022, AC-023, AC-030" (no Spec Explorer list) |
| `webview/areas/areas.test.tsx` | it: AC-030: in the real DOM the secondary text of a selected row is reached by a rule with the selection foreground, that of another row is not | voided: 0020 §5 "0005 AC-006 … AC-007, AC-008, AC-022, AC-023, AC-030" (no Spec Explorer list) |
| `webview/areas/areas.test.tsx` | it: AC-031: the selected row and the current navigation item are reached by a rule with the contrast active border | voided: 0020 §5 "0005 AC-030; AC-031 for the spec row"; the navigation part stays in "0013 AC-031: the current navigation item" |
| `webview/areas/areas.test.tsx` | it: the selected row stays marked after a round trip to another area and back | voided: 0020 §5 "0005 AC-006 … AC-007, AC-008, AC-022, AC-023, AC-030" (no Spec Explorer list) |
| `webview/areas/areas.timing.test.tsx` | describe: AC-007: the Spec Explorer list | voided: 0005 AC-007 (no list); the tree's 500 ms budget is specTreeService.timing.test.ts (AC-013) |
| `webview/areas/areas.timing.test.tsx` | it: a new shell event with changed rows is in the DOM within 500 ms of the message event (PD-047) | voided: 0005 AC-007 (no list); the tree's 500 ms budget is specTreeService.timing.test.ts (AC-013) |
| `webview/detail/Close.test.tsx` | describe: AC-008: the Spec Explorer pane | voided: 0020 §5 "0019 AC-008" (no pane); close behaviour of the side panel stays in "AC-003: closing the side panel" |
| `webview/detail/Close.test.tsx` | it: the pane has a close button, no side panel, and closing shows the hint with the list row focused | voided: 0020 §5 "0019 AC-008" (no pane); close behaviour of the side panel stays in "AC-003: closing the side panel" |
| `webview/detail/Close.test.tsx` | it: Escape in the pane closes it the same way | voided: 0020 §5 "0019 AC-008" (no pane); close behaviour of the side panel stays in "AC-003: closing the side panel" |
| `webview/detail/SidePanel.test.tsx` | it: Spec Explorer shows no side panel | replaced by "0020: the panel has no area without a side panel …" |
| `webview/detail/SpecDetail.test.tsx` | it: shows the hint and no spec content while nothing is selected | voided: 0020 §5 "0007 AC-028 hint" (the pane and its hint end) |
| `webview/focusIndicator.test.tsx` | it: every navigation item, list row, notice action and note action is reached by a :focus-visible rule with a visible outline in a theme colour | retitled: "every navigation item, notice action and note action …" (list rows end, 0020 §5 "0005 AC-022") |
| `webview/states.test.tsx` | it: the empty board, the empty Overview and the empty Spec Explorer | retitled: "the empty board and the empty Overview" (0020 §5 "0005 §13 zero specs"; the tree's zero state is specTree.test.ts, AC-014) |
| `webview/userLanguage.test.tsx` | it: the Spec Explorer row shows no rule ID | voided: 0020 §5 "0016 AC-011, AC-012 list row(s)"; the tree's tooltip is asserted in specTree.test.ts (AC-006) |

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | src/core/shell/specTree.ts:buildSpecTree | specTree.test.ts "AC-001: the groups" | built |
| AC-002 | T-001, T-005 | src/core/shell/specTree.ts:rowId, groupsOf | specTree.test.ts "AC-002: expand state and IDs" | built |
| AC-003 | T-001 | src/core/shell/specTree.ts:compareRows | specTree.test.ts "AC-003: the order" | built |
| AC-004 | T-001 | src/core/shell/specTree.ts:rowOf | specTree.test.ts "AC-004: the row texts" | built |
| AC-005 | T-001 | src/core/shell/specTree.ts:STATE_ICONS | specTree.test.ts "AC-005: icons and colours" | built |
| AC-006 | T-002, T-005 | src/core/shell/specTree.ts:tooltipOf | specTree.test.ts "AC-006: the tooltip" | built |
| AC-007 | T-004 | src/core/shell/treeActions.ts:copy; src/core/copyNextStep/copyNextStep.ts:copy | treeActions.test.ts "AC-007"; copyNextStep.test.ts "AC-007" | built |
| AC-008 | T-004 | src/core/shell/treeActions.ts:open; src/adapters/vscode/editor.ts; src/core/board/openFile.ts | treeActions.test.ts "AC-008"; editor.test.ts "AC-008"; openFile.test.ts "AC-008" | built |
| AC-009 | T-004, T-005 | src/core/shell/treeActions.ts:select | treeActions.test.ts "AC-009" | built |
| AC-010 | T-002, T-005 | src/core/shell/specTree.ts:badgeOf | specTree.test.ts "AC-010: the badge" | built |
| AC-011 | T-002, T-005 | package.json; src/adapters/vscode/studioTree.ts; src/adapters/vscode/commands.ts | manifest.test.ts "AC-011 (0020)"; studioTree.test.ts | built |
| AC-012 | T-002, T-005 | src/core/shell/specTree.ts:buildSpecTree | specTree.test.ts "AC-012: the states of the view" | built |
| AC-013 | T-003, T-005 | src/core/shell/specTreeService.ts | specTreeService.test.ts, specTreeService.timing.test.ts "AC-013" | built |
| AC-014 | T-004 | src/core/shell/treeActions.ts | treeActions.test.ts "AC-014" | built |
| AC-015 | T-005, T-006 | package.json (inline Copy only) | manifest.test.ts "AC-011, AC-015 (0020)" | built |
| AC-016 | T-006, T-007 | src/shared/protocol/areas.ts; src/webview/areas/registry.tsx | messages.test.ts "AC-016"; App.test.tsx "AC-016" | built |
| AC-017 | T-006 | src/core/shell/uiMemory.ts:parseUiMemory | uiMemory.test.ts "AC-017"; shellService.navigation.test.ts "AC-017" | built |
| AC-018 | T-007, T-008 | src/core/shell/uiMemory.ts (the one mapping); src/webview/main.css; README, checklist, design brief, `.architecture` | sourceScan.test.ts "AC-018"; webviewCss.test.ts "AC-018"; docsScan.test.ts "product docs after 0020 (AC-018, AC-020)" | built |
| AC-019 | T-005 | src/extension.ts; src/test/shell.smoke.test.ts | shell.smoke.test.ts "AC-019" (host, CI) | built |
| AC-020 | T-008 | the nine files with `Amended by 0020` notes | docsScan.test.ts "carries at least n notes of 0020" (nine) | built |
| AC-021 | T-008 | `## Test-title audit` in this plan | the audit script; `npm run test:unit` (`npm test` on Windows and CI still to run) | built |
| AC-022 | T-008 | docs/release-checklist.md "The native Specs tree (0020)" | manual: Gregor or his delegate (pre-release checklist) | open |

## Session handoff

- **Done so far:** all eight steps verified and committed; the plan is Done. The spec stays `In Progress` in `active/` (no `/sdd-compile`, no move to done).
- **Next action:** Gregor or his delegate: `npm test` on Windows and CI (host tests AC-009, AC-013, AC-019), AC-022 in a real window on `tip-splitter` (release checklist), read the proxy decisions P-1…P-24 and the step Notes; then `/sdd-compile` in a fresh session. Ask-first: delete `media/screenshots/spec-explorer-detail-light.png` (unreferenced).
- **Open decisions:** none; P-1…P-24 stand unless Gregor changes them.
- **Baseline:** `16fc52b` (HEAD before the first step commit; started 2026-11-18 on Gregor's delegated start signal)
- **Environment:** host smoke runs on Windows and CI only (VS Code download blocked here).
