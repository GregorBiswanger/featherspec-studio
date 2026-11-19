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
7. T-017 → T-025 — Release readiness (final check of the UX round 0016–0020, decided by the orchestrator for Gregor): plan 0019, CHANGELOG, release checklist, README, PD register note, text modules, focus rule, audit sentence, records

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
- [x] **Verified (T-008):** 2026-11-18, agent sandbox: `docsScan.test.ts` red first on a scratch copy of the T-007 head (17 failed of 72: no Spec Explorer in README, checklist, design brief, AGENTS.md and `.architecture`, the README names, the checklist item, CHANGELOG, the nine `Amended by 0020` counts), then green (72 passed); `grep -c "Amended by 0020"`: 0005 28, 0007 6, 0013 4, 0015 3, 0016 4, 0017 2, 0018 5, 0019 8, ADR-001 1 (each at least its §5 rows); `git diff 16fc52b -- docs/product/product-decisions.md` empty; test-title audit below (44 absent, all explained); eslint, `tsc --noEmit`, `tsc --noEmit -p src/webview` clean; `npm run test:unit` 139 files, 2217 passed + 3 skipped (timing project 13 passed); `npm run compile` and `npm run compile-tests` green. Not run here: `npm test` on Windows and CI (host tests), AC-022 (manual, Gregor or his delegate). Recorded later the same day (STATE.md): Windows 11 at `77f585b`: `npm run test:unit` 2213 passed / 7 skipped + 13 timing, `npm test` 30 + 1 + 1 + 1 green; CI run 44277740119 at `77f585b`: success (the host tests AC-009, AC-013, AC-019 ran there). The compile of 2026-11-18 (NOT READY: D1-D3, G1-G5, F1-F9) is answered by T-009…T-016.
- **Notes:** (1) Deletes: none in this step. (2) The §5 notes are one `*Amended by 0020 (PD-058): …*` line under each named statement (bullet, paragraph, table or heading), inserted by a throwaway script (`/tmp/audit-0020/note.py`); the PD register is untouched. (3) README: the section "The Specs view" replaces "Spec Explorer"; the new `media/screenshots/spec-detail-light.png` is a preview-harness screenshot (Board, side panel of `studio-0015`, Light, 1400x900) taken on a scratch build of the T-007 head; the old `spec-explorer-detail-light.png` is now unreferenced and stays on disk: its deletion is Ask-first and proposed to Gregor. (4) `docsScan.test.ts` got a 0020 describe block (gone terms in README, checklist, design brief, AGENTS.md, `.architecture`; README names and screenshot files; checklist item; CHANGELOG; the nine note counts); CHANGELOG history is exempt. (5) `/sdd-architecture-update` changed exactly the lines the step names (the plan's approval is the confirmation); `adapters.md` also names the tree adapter and the editor's active-group rule. (6) The audit's "present" test is the same literal in any file at the head; template-literal titles are compared as written. (7) Checklist item "Keyboard and screen reader" is added beside AC-022 as a cheap extra for the same manual session.

### T-009 — Equal numbers are ordered by path (compile D1, G1)

- **Covers:** AC-003
- **Do:** Test first in `src/core/shell/specTree.test.ts` ("0020 AC-003: the order"): `0003-login.md` and `0003-login-page.md` in one group (Backlog, and the same pair in In progress at one state) must read `0003-login-page.md` before `0003-login.md` (path order: `-` sorts before `.`), in both directions of insertion. Then remove the stem tie-break (`compareText(left.stem, right.stem) ||`) from `compareRows` in `src/core/shell/specTree.ts`. Mutants M10 (stem tie-break stays), M11 (path tie-break removed) and M81 (stem tie-break reversed) must die.
- **Verify:** `npx vitest run --project node src/core/shell/specTree.test.ts` red on a scratch copy of HEAD (`git archive HEAD`), then green; the three mutants each fail the new test; gates 1–4
- [x] **Verified (T-009):** 2026-11-18: `vitest --project node specTree.test.ts` red on a scratch copy of HEAD (1 failed: the equal-number case, order login before login-page), then green 50/50 here, also with the model's entries reversed; mutants M10 (stem tie-break back), M11 (path tie-break removed), M81 (stem tie-break reversed) each fail that one test (49 passed, 1 failed); gates 1-4 green, unit 2218 passed + 3 skipped, timing 13.
- **Notes:** Compile D1 fixed: the stem tie-break of `compareRows` is gone, equal numbers fall to the path (`key`). The test lists the entries in model order and reversed, so M11 cannot hide behind a sorted input; two pairs are needed (`0003-login`/`0003-login-page` and `0005-alpha`/`0005-beta`) because a reversed stem order equals the path order for the first pair, so only the second kills M81. No deletions.

### T-010 — A row reopens a closed panel through the start path (compile G2)

- **Covers:** AC-009
- **Do:** A deciding test in `src/core/shell/treeActions.test.ts` ("0020 AC-009"): a navigation target set before the panel closed is gone after a row reopens the panel (BR-02: `shell.open({ via: 'start' })` consumes `target`); with the panel open the target stays. Mutant M40 (the `if (!deps.panel.isOpen()) deps.shell.open({ via: 'start' })` line removed) must die. Code unchanged unless the test shows a defect.
- **Verify:** `npx vitest run --project node src/core/shell/treeActions.test.ts` green, mutant M40 red; gates 1–4
- [x] **Verified (T-010):** 2026-11-18: `vitest --project node treeActions.test.ts` green 11/11 (the new test passes at once: code unchanged, a gap test); mutants on a scratch copy of HEAD: M40 (the `shell.open({ via: 'start' })` block removed) and its counterpart (open on every select) each fail that test (1 failed, 10 passed); gates 1-4 green, unit 2219 passed + 3 skipped, timing 13.
- **Notes:** Compile G2: the test sets a board-filter target through `navigate`, selects with the panel open (target stays), closes the panel, selects again (target gone, area and selection as remembered). The shell's area already equals the remembered one, which is why the old tests could not see the start path; `target` is the only thing `open` clears. T-004's `Verified:` claim of this mutant was wrong before this step. No code change, nothing deleted.

### T-011 — The view description shows the project count while one project is active (compile G3)

- **Covers:** AC-011
- **Do:** In `src/core/shell/specTreeService.test.ts` replace the test whose `else` branch asserted no description by two cases: two projects and one active → the view description shows the count and the name; two projects and none active → S3 message, no description. Mutants M82 (`projectCount: 1`) and M83 (counts every folder, not only verdict `project`) in `specTreeService.ts` must die.
- **Verify:** `npx vitest run --project node src/core/shell/specTreeService.test.ts` green, M82 and M83 red; gates 1–4
- [x] **Verified (T-011):** 2026-11-18: `vitest --project node specTreeService.test.ts` green 11/11 (gap tests, code unchanged); mutants on a scratch copy of HEAD: M82 (`projectCount: 1`) fails 'with two projects and one active …', M83 (counts every folder) fails 'control: one project beside a folder that is no project …' (1 failed, 10 passed each); gates 1-4 green, unit 2221 passed + 3 skipped, timing 13.
- **Notes:** Compile G3: the old test ('a second project sets the view description') took its else branch (two projects, none active gave S3 and no description). The shell world's `rememberedRoot` makes one project active, so the new test sees the name; the S3 case asserts message and no description; the control has a second folder that is no project (M83). The old 'control: one project' test stays. No code change, nothing deleted.

### T-012 — The timing test says what it times; three weak tests decide something (compile F2, F3)

- **Covers:** AC-010 (retitle), AC-016, AC-012, AC-021 (audit home)
- **Do:** `src/webview/areas/areas.timing.test.tsx:40` "0020 AC-010: a shell event reaches the DOM" times 0005's notice (PD-047): retitle it, and home the old title in the audit (T-015). `messages.test.ts:125` `expect('rows' in view).toBe(false)` asserts the test's own literal: assert on the view the code built, or drop it. `studioTree.test.ts` "AC-012: an action row keeps its command, a group and a spec row have no icon colour of an action" asserts the action row only: assert the group and the spec row too. `shellService.navigation.test.ts`: remove the two duplicated assertion lines. A mutant per changed test must die where the test claims to decide something.
- **Verify:** the three files green; a mutant per decided claim red; gates 1–4
- [x] **Verified (T-012):** 2026-11-18: studioTree.test.ts, shellService.navigation.test.ts, messages.test.ts (node) and areas.timing.test.tsx (timing-webview) green (73 + 1); mutants on a scratch copy of HEAD: a group with an icon, an action icon with a colour, a spec row with the shell-action command (1, 1, 2 failed in studioTree.test.ts) and `rows: []` back in the view (shellService.navigation.test.ts, 1 failed); gates 1-4 green, unit 2222 passed + 3 skipped, timing 13.
- **Notes:** F2: the timing describe is now '0005 AC-010 (PD-047): a shell event with a notice reaches the DOM'; the old title '0020 AC-010: a shell event reaches the DOM' (new in 0020, never at the Baseline) is homed in the audit in T-015. F3: the `'rows' in view` line of messages.test.ts asserted the test's own literal and is gone; its claim is decided by a new test on the view the ShellService builds (with and without a selection); the studioTree test asserts the action row, the group and the spec row; shellService.navigation.test.ts lost its two duplicated assertion lines (one more redundant line after a toEqual) and a double blank line. No code change, nothing deleted.

### T-013 — Leftovers of the removal go (compile F4)

- **Covers:** AC-016, AC-018 (no dead Spec Explorer code)
- **Deletes:** `src/webview/ui/RuleText.tsx`, `src/webview/ui/RuleText.test.tsx` (only if a grep shows no production user; approved by the orchestrator, Gregor's delegate)
- **Do:** Remove `VIEW_NAME` and `TITLE_NOT_AVAILABLE` from `texts.ts` if nothing uses them; the manifest test asserts all four `TREE_COMMAND_TITLES` from the constant (so the constant has users); remove the dead `[role="option"]:focus-visible` selector in `main.css:111`; remove `SpecDetail`'s dead `region`/null branch (the side panel passes `region={false}` and a spec detail); remove the stale `rows: []` of the fake shell view in `specTreeService.timing.test.ts`; fix the "three areas" title in `Drilldown.test.tsx:102`; drop "rule text" from `.architecture/webview.md`.
- **Verify:** `grep -rn "VIEW_NAME\|TITLE_NOT_AVAILABLE\|RuleText" src` has no hit; gates 1–5, `npm run compile-tests`
- [x] **Verified (T-013):** 2026-11-18: `grep -rn 'VIEW_NAME\|TITLE_NOT_AVAILABLE\|RuleText' src` has no hit (before: RuleText only in its own test and in dated `docs/ux-audit` history); scratch-copy mutants: `[role="option"]:focus-visible` back in main.css and a changed Open Plan title in texts.ts fail webviewCss.test.ts and manifest.test.ts (2 failed, 79 passed); gates 1-5 green (eslint, both tsc, unit 2219 passed + 3 skipped in 138 files, timing 13, compile) and compile-tests green.
- **Notes:** Deletes named at the start of the step, approved by the orchestrator (Gregor's delegate), and done with `git rm`: src/webview/ui/RuleText.tsx and src/webview/ui/RuleText.test.tsx (no production user: grep found none; unit count 2222 to 2219 = its three tests). VIEW_NAME and TITLE_NOT_AVAILABLE removed (no user). TREE_COMMAND_TITLES: manifest.test.ts asserts all four titles from the constant (and the constant's literals once). `[role="option"]:focus-visible` removed from main.css; the staying test 'AC-031: a focused control and a focused row …' in webviewCss.test.ts is retitled 'AC-031: a focused control uses the High Contrast active border … and no rule is left for the removed list rows' (its row half decided a rule that no element matches; home in the T-015 audit) and focusIndicator.test.tsx's negative control strips the shortened rule. SpecDetail takes a SpecDetailView, has no region prop and no null branch; SidePanel's `matches` is a type guard; CopyButton.test.tsx narrows its detail. Drilldown.test.tsx says 'two areas'; the timing fake has no `rows`; .architecture/webview.md lost 'rule text'.

### T-014 — The README and the docs scan say what the view is; screenshots are current (compile G4, G5, F6, F9)

- **Covers:** AC-018, AC-020
- **Deletes:** `media/screenshots/spec-explorer-detail-light.png` (unreferenced), `media/screenshots/mission-control-dark.png` and `media/screenshots/spec-board-dark.png` (outdated: taken before 0016–0020); approved by the orchestrator
- **Do:** `docsScan.test.ts`: the README names the four groups, the inline Copy and "Copy Next Step", the badge sentence and the tab Board (M78–M80 die); thresholds equal the §5 counts (0005 28, 0007 6, 0013 4, 0015 3, 0016 4, 0017 2, 0018 5, 0019 8, ADR-001 1; M76 dies). README: "Copy Next Step" for the menu entry, "Focus on Specs View reaches the view; Shift+F10 opens a row's context menu"; the Overview and Board images point at `media/screenshots/overview-dark.png` and `board-dark.png` (preview-harness shots at `77f585b`, Dark, 1400×900, no selection, two tabs); `spec-detail-light.png` stays. CHANGELOG and the checklist item "Keyboard and screen reader": "Copy Next Step".
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red on a scratch copy (the new checks against the old README), then green; mutants M76, M78–M80 red; gates 1–4
- [x] **Verified (T-014):** 2026-11-18: `vitest --project node docsScan.test.ts` red on a scratch copy of HEAD (new test file, old README/CHANGELOG/checklist: 4 failed of 74), then green 74/74 here; mutants on a scratch copy (README, CHANGELOG, checklist and screenshots of this step): one 0013 note lost (M76), README without the badge sentence (M78), without a group name (M79), without the inline Copy (M80), the menu entry named Copy again: each fails exactly one test (1 failed, 73 passed); gates 1-4 green, unit 2221 passed + 3 skipped, timing 13.
- **Notes:** Deletes named at the start of the step, approved by the orchestrator, done with `git rm`: media/screenshots/spec-explorer-detail-light.png (unreferenced, F9), media/screenshots/mission-control-dark.png and media/screenshots/spec-board-dark.png (taken before 0016-0020; no file references them any more: grep over the tree finds only plan and archive history). New media/screenshots/overview-dark.png and board-dark.png are the orchestrator's preview-harness shots at 77f585b (Dark, 1400x900, no selection, two tabs), copied unchanged; spec-detail-light.png stays; the README still links three screenshots, all existing. docsScan: the thresholds are the §5 counts (0005 28, 0007 6, 0013 4, 0015 3, 0016 4, 0017 2, 0018 5, 0019 8, ADR-001 1; re-counted with grep after the doc edits: unchanged), the README section is checked for the four groups, the inline Copy, 'Copy Next Step', the badge sentence, the two tabs and the Focus / Shift+F10 sentence; checklist and CHANGELOG say 'Copy Next Step' for the menu entry. README: 'Focus on Specs View reaches the view from the keyboard; Shift+F10 on a row opens its context menu'.

### T-015 — The audit homes hold; the notes sit where they belong (compile D2, D3, F1)

- **Covers:** AC-020, AC-021
- **Do:** Plan audit: the row "an active project keeps its entries …" is homed to §5 "0005 AC-003" with the titles "a loaded model keeps its groups while Refresh or Retry re-reads (S4)" and "S5 for discovery or listing with a project active shows its line and the rows Show output and Retry, rows of an old model gone" ("0020 AC-012: the states of the view"); "PD-048" names AC-005 (not AC-002), `states.test.tsx` names AC-012 (not AC-014); the retitled timing test of T-012 is homed. `0013`: the Amended-by note moves directly below the first §3.4 bullet. `0005` pointers: lines 81 and 517 AC-009 → AC-010; 102 and 350 AC-005 → AC-009; 423 AC-022 → AC-004; 51, 93, 124 §4.1 → §4.3. Re-run the title audit against `16fc52b` at the fix head: every absent title homed.
- **Verify:** the audit script lists every absent title with a home that holds; the docsScan counts of T-014 still pass; `git diff 16fc52b -- docs/product/product-decisions.md` empty
- [x] **Verified (T-015):** 2026-11-18: audit re-run at the fix head (`python3 -I /tmp/s54/audit/titles.py`, 16fc52b against HEAD d322158): 2205 / 2309 titles, 50 absent = the 44 homed rows plus six caused by T-013 (four RuleText titles, one retitle in webviewCss.test.ts, one in Drilldown.test.tsx), every one homed in the new table, the two replacing titles of the D2 row exist in specTree.test.ts (lines 397, 409); `docsScan.test.ts` 74/74 green; `git diff --quiet 16fc52b -- docs/product/product-decisions.md` empty.
- **Notes:** Docs only (no gate 1-5: no code touched). D2: the audit row now names 0020 §5 '0005 AC-003' and the two AC-012 titles; PD-048 names AC-005 and states.test.tsx names AC-012. D3: the 0013 note moved under the first §3.4 bullet, indented like the notes of 0005. F1: 0005 lines 81 and 517 (AC-010), 102 and 350 (AC-009), 423 (AC-004), 51, 93 and 124 (§4.3); the note counts are unchanged (28, 4). T-014's Verified line said unit 2223, the run said 2221: corrected here. Nothing deleted.

### T-016 — Traceability, handoff and Memory Bank agree; the 0019 record

- **Covers:** AC-021, AC-022 (state only; the manual check stays open)
- **Do:** Traceability rows to `verified` where a passing deciding test ran (AC-001…AC-020 with the Windows run at `77f585b` plus this round's runs; AC-021 after T-015; AC-022 stays `open`, manual). T-008 `Verified:` and the handoff record Windows at `77f585b` (unit 2213 passed / 7 skipped + 13 timing; `npm test` 30+1+1+1) and CI 44277740119. `.memory-bank/activeContext.md` Now / Validation / Next: 0020 implemented, compiled NOT READY, fixed by T-009…T-016; next: Windows and CI at the fix head, Gregor's AC-022, a fresh `/sdd-compile` for 0014–0020. 0019 plan: the orchestrator's harness result on the AC-022 row and T-017 Notes (docs only).
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts`; full gates of `IMPL-UX.md`
- [x] **Verified (T-016):** 2026-11-18: full gates of IMPL-UX at the head of this step: `npx eslint src --max-warnings 0` 0, `npx tsc --noEmit` 0, `npx tsc --noEmit -p src/webview` 0, `npm run test:unit` 138 files passed + 1 skipped, 2221 passed + 3 skipped, timing 10 files, 13 passed, `npm run compile` 0, `npm run compile-tests` 0; `docsScan.test.ts` 74/74; traceability: AC-001…AC-021 verified, AC-022 open (manual); T-008 Verified and the handoff carry Windows at 77f585b (unit 2213 / 7 skipped + 13 timing, `npm test` 30+1+1+1) and CI 44277740119.
- **Notes:** Docs only in this step. activeContext.md (53 lines): Now, Active Spec, Changed Recently, Next 0a and Validation. The 0019 plan carries the orchestrator's harness result on its AC-022 row and in T-017 Notes (docs only, no 0019 code touched). docs/release-checklist.md: the README-screenshots item names the new files. Windows and CI at the fix head are still to run (Next action).

### T-017 — Plan 0019 is whole again (final check 3)

- **Covers:** AC-022 (the Studio reads this repository's own plans without a false note), AC-021 (docs)
- **Do:** `.specs/active/0019-detail-situation-picture.plan.md`: the `### T-017 — Fix H1 …` block, spliced into T-008's **Do** sentence by `16fc52b`, moves after T-016; T-008's sentence reads "`## Test-title audit` here lists every absent title …" again. Nothing else in that plan changes. The stage list below gains this stage; the 0020 step headings T-017 … T-025 are never renumbered.
- **Verify:** a probe with `readProject` on this repository: the 0019 plan has 17 steps, no "Unknown plan section" note names a sentence of T-008, T-008's Verify and Verified lines sit inside T-008; `git diff` of the 0019 plan shows only the move and the one sentence
- [x] **Verified (T-017):** 2026-11-18: probe `npx tsx /tmp/s55/probe.ts` (readProject on the repository at the head): `.specs/active/0019-…plan.md steps 17` (was 16); the only note on that plan is `Unknown plan section "Test-title audit"` at line 521, the audit heading every plan of the round carries (0015…0020), no note names a fragment of T-008; T-008's Verify and Verified lines (lines 393-397) sit under its heading; the diff of the 0019 plan is the T-017 block moved and one joined sentence.
- **Notes:** Docs only (no gates 1-5). Final-check finding 3. T-008's Do sentence is restored word for word from the lines on both sides of the splice.

### T-018 — The CHANGELOG describes the first release as it ships (final check 1)

- **Covers:** AC-018, AC-020 (docs say what the product is); ux-guidelines 6 (no internal command IDs)
- **Decision (orchestrator, for Gregor):** nothing was ever published, so the first Marketplace release is 0.1.0 and its entry describes the product as it ships, not a history of features that never shipped.
- **Do:** `docsScan.test.ts` first: the three tests that pinned `[Unreleased]` wording (0017, 0018, 0020) now read the first release entry (`firstRelease`, with its own unit test); a new test asserts one `## [0.1.0] - Unreleased` section and no other, no `[Unreleased]`, none of drag, move to, Mission Control, Spec Explorer, Spec Board, Rescan, Needs attention or a `featherspec-studio.` command ID, and the terms Set up FeatherSpec, Restricted Mode, side panel, Problems; another asserts the checklist's Go section asks for the date of the 0.1.0 entry. Then `CHANGELOG.md`: both old sections replaced by the one entry (Specs view, status bar and Copy Next Step, Overview and Board, the detail side panel, honest signals, Set up FeatherSpec, commands, status history, Restricted Mode; the extension has no settings); `docs/release-checklist.md` Go gains "CHANGELOG date".
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red on a scratch copy of HEAD with the new tests, then green; a scratch copy with the checklist item removed fails exactly that test; gates 1–4
- [x] **Verified (T-018):** 2026-11-18: with the new tests against the old CHANGELOG 2 of 76 failed (the structure test and the entry test), against the new CHANGELOG and the old checklist 1 failed (the date item), then docsScan 77/77 green; gates 1-4 green (eslint 0 warnings, both tsc clean, unit 2224 passed + 3 skipped, timing 13).
- **Notes:** These docsScan tests pinned the old wording and were updated to the new truth (the claims stay: the entry names the status bar entry and Copy Next Step, Open Overview, Open Board, FeatherSpec Studio: Refresh, the native tree and its menu; it no longer names what was removed, because nothing of it ever shipped). Unit 2221 to 2224: +1 structure test, +1 helper test, +1 checklist date test. The date stays `Unreleased` until the publish (Gregor sets it, checklist Go).

### T-019 — The release checklist is in spec order and checks only UI that exists (final check 2, 10)

- **Covers:** AC-022 (the checklist is Gregor's instrument), AC-018; the manual criteria of 0014 … 0020 keep one item each
- **Do:** `docsScan.test.ts` first: the checklist's headings equal one list in spec order (Before publishing, Trying locally, 0001, 0005, 0006/0018, 0007/0018, 0013, 0014, 0015, 0016, 0017, 0018, 0019, 0020, Go last), none of "Plan line", "descriptions cut", "attention row", "attention reason", "filters, sort" occurs, the `media/` line names the tab icons, and a note about `spec-detail-light.png` exists; a second test pins one item per manual criterion of 0014 … 0020 in its section. Then `docs/release-checklist.md`: sections re-ordered; the 0013 AC-015 "Plan line" item removed (void by 0019, 0013 note); "descriptions cut to two lines" is now "long titles cut to two lines"; "the attention row" is "the Overview row"; "state and attention reason" is "reason under Problems"; the Board keyboard item says the sort select works and a drill-down chip clears with "Clear filters"; the `media/` line adds the two tab icons; the 0018 board-width item moves into the 0018 section and the README-screenshots item into 0013.
- **Verify:** docsScan red on a scratch copy of HEAD with the new tests (order, stale phrases), then green; a scratch copy without the AC-030 item fails the coverage test; gates 1–4
- [x] **Verified (T-019):** 2026-11-18: new tests against the old checklist: the order test red (1 failed of 79); the coverage test is green by construction, so a scratch copy of HEAD with the AC-030 item renamed fails both (2 failed); docsScan 79/79 green here; gates 1-4 green (unit 2226 passed + 3 skipped, timing 13).
- **Notes:** Final-check findings 2 and 10 (first half). Screenshots stay Gregor's taste call (finding 9): the 0013 taste item now says that `spec-detail-light.png` shows this repository's own specs and that he may keep or retake it on `tip-splitter`. Every manual criterion of 0014 (M-1 … M-3), 0015 (AC-030), 0016 (AC-025), 0017 (AC-026), 0018 (AC-031), 0019 (AC-022) and 0020 (AC-022 and the keyboard item) has its item; the CHANGELOG-date item of T-018 stays in Go.

### T-020 — The README agrees with itself (final check 4)

- **Covers:** AC-018, AC-020 (README says what the view and the status bar are)
- **Do:** `docsScan.test.ts` first: Getting started says the status bar shows the spec you work on (`<number> · <state> · <short form>`) and that the tooltip names the project and the version, not "shows the active project"; "read as a sentence on the card" is gone and the column-header tooltip is named; the next step is "shown in five places" (the Specs view's inline Copy, the detail, the Board card, the Overview rows, the status bar). Then `README.md`: those three sentences.
- **Verify:** docsScan red on a scratch copy of HEAD with the new test, then green; gates 1–4
- [x] **Verified (T-020):** 2026-11-18: the new test against the old README: 1 failed of 80; green after the three sentences (80/80); gates 1-4 green (unit 2227 passed + 3 skipped, timing 13).
- **Notes:** Final-check finding 4. The rule behind a derived state is in the column-header tooltip of the Board (README Board section, unchanged); the sentence now points there instead of claiming a sentence on the card.

### T-021 — PD-067 records which later decision retires which earlier one (final check 6)

- **Covers:** AC-020 (the register agrees with the notes); orchestrator decision, no existing row edited
- **Do:** `docsScan.test.ts` first: the register's last row is PD-067 and names PD-058 superseding PD-042 and the Spec Explorer parts of PD-048 and PD-054, PD-060 superseding PD-057 (4), PD-064 A-003 retiring PD-059's "counts in headers" and PD-063 (4)'s `Updated HH:MM` header, and the decision date and proxy; PD-066 and PD-064 stay as they were. Then one row appended to `docs/product/product-decisions.md`.
- **Verify:** docsScan red without the row, then green; `git diff 338a532 -- docs/product/product-decisions.md` shows one added line and no removed line; gates 1–4
- [x] **Verified (T-021):** 2026-11-18: the test against the old register 1 failed of 81, green with the row (81/81); the diff against 338a532 is one added line, no removed line; gates 1-4 green.
- **Notes:** Final-check finding 6, decided 2026-11-18 by the orchestrator as proxy for Gregor. No test pinned "register unedited since <baseline>" (the 0019 and 0020 plans only record `git diff <Baseline> -- docs/product/product-decisions.md` as a Verify line of their time): from now on that diff shows PD-066 (0019) and PD-067 (this step) as the only additions after 16fc52b; the new docsScan test pins PD-064 and PD-066 as they were and the last row as PD-067.

### T-022 — Visible literals move into the text modules; no implementation word in a reason (final check 7)

- **Covers:** ux-guidelines 10 and 6; AC-018 (texts asserted literally)
- **Do:** tests first: `core/lifecycle/historyTexts.test.ts` (the sentence, with and without a reason, and `it could not be read`), `shared/protocol/panelStateTexts.test.ts` (`FILTERS_LABEL`, `SELECT_PROJECT_PLACEHOLDER`, `PANEL_TITLE` literally), `SpecBoard.test.tsx` (the filter bar group is named "Filters"), `lifecycleService.test.ts` (a session without a reason: `Status history not available: it could not be read`), and `adapters/node/visibleLiterals.test.ts` (the three adapters hold no such literal, "Status history not available" is written only in `historyTexts.ts`, no production file holds a `'no store'` reason). Then `core/lifecycle/historyTexts.ts` (new) used by `lifecycleService`, `statusHistory`, `overviewService`, `boardService`, `activity`; the three constants in `shared/protocol/texts.ts` used by `FilterBar.tsx`, `ui.ts`, `studioPanel.ts`. The shape `Status history not available: <reason>` is unchanged; the unknown reason `no store` is now `it could not be read`.
- **Verify:** the new tests red on the old code (5 failed, the text module missing), then green; gates 1–5, `npm run compile-tests`
- [x] **Verified (T-022):** 2026-11-18: new tests against the old code: visibleLiterals 3 failed, lifecycleService 1 failed, historyTexts red (module missing); green after the change; gates 1-5 green (eslint 0 warnings, both tsc clean, unit 2236 passed + 3 skipped, timing 13, compile, compile-tests).
- **Notes:** Final-check finding 7. The reasons that come from the runtime store (`READER_REASON`, `NO_ACTIVE_PROJECT_REASON`, an error message) are unchanged; only the fallback word `store` goes. `activity.ts` derives its prefix from the same function, so an Overview reason and a detail reason stay in step. The host smoke tests assert nothing about these three literals (the tab title value is unchanged).

### T-023 — The sort select has a visible focus outline in a theme colour (final check 8)

- **Covers:** ux-guidelines 9 (visible focus, theme variables only)
- **Do:** `webviewCss.test.ts` first: a rule `.filter-bar select:focus-visible` sets `outline: 2px solid var(--vscode-contrastActiveBorder, var(--vscode-focusBorder))` and never `outline: none`. Then `main.css`: that rule, with the offset of the buttons.
- **Verify:** `npx vitest run --project node src/adapters/node/webviewCss.test.ts` red on a scratch copy of HEAD with the new test, then green; gates 1–5
- [x] **Verified (T-023):** 2026-11-18: the new test on a scratch copy of HEAD (`git archive`): 1 of 52 failed (no rule for the select), green after the rule (52/52); gates 1-5 green (unit 2237 passed + 3 skipped, timing 13, compile, compile-tests). jsdom paints no outline: the rendered ring is part of Gregor's manual checks.
- **Notes:** Final-check finding 8. Before, the select relied on the webview's default ring (`-webkit-focus-ring-color`), not a theme variable. The rule has the same colours and offset as `button:focus-visible`.

### T-024 — The 0018 audit sentence names the four groups that kept their tests (final check 10, second half)

- **Covers:** AC-021 of 0018 (its audit is accurate); no test is lost
- **Do:** `docsScan.test.ts` first: the 0018 plan's sentence about the 24 `describe` group titles names the four groups that kept all their tests under new names and no longer says each held only tests listed below. Then `0018-overview-and-compact-board.plan.md` (that sentence only): twenty held only listed tests; four kept all their tests under new names: "AC-016: the board writes no file", "0015 AC-026: the Mission Control purpose and the Restricted Mode note", "Mission Control view contract", "every request is one the shell accepts".
- **Verify:** docsScan red on a scratch copy of HEAD with the new test, then green; gates 1–4
- [x] **Verified (T-024):** 2026-11-18: the new test against the old plan 1 failed of 82, green after the edit (82/82); gates 1-4 green.
- **Notes:** Final-check finding 10 (second half). The count of 24 was right; only "each held only tests listed below" was inaccurate. Nothing else in the 0018 plan changes.

### T-025 — Records agree: validation at 338a532, handoff, Memory Bank (final check 5, outdated)

- **Covers:** AC-021, AC-022 (state only; the manual check stays open)
- **Do:** Where the plans and the handoff say "pending at the fix head" they now say what ran: Windows at `338a532` (unit 2217 passed, 7 skipped + 13 timing; `npm test` 30+1+1+1), CI run 44287407889 green, and the host suite against the VSIX unpacked from `338a532`: the 0020 traceability row AC-021, the 0020 handoff (Done so far, Next action), the 0019 handoff's Next action. `.memory-bank/activeContext.md` Now, Next 0a and Validation (0018, 0019, 0020): Validation green at `338a532`; next Gregor's manual checks from the release checklist, then a fresh `/sdd-compile` per spec, then Go.
- **Verify:** full gates of `IMPL-UX.md`; `docsScan.test.ts`; `.memory-bank/activeContext.md` stays within 60 lines
- [x] **Verified (T-025):** 2026-11-18: full gates at the head of this step: eslint 0 warnings, `tsc --noEmit` 0, `tsc --noEmit -p src/webview` 0, `npm run test:unit` 2238 passed + 3 skipped (140 files passed + 1 skipped), timing 13 passed, `npm run compile` 0, `npm run compile-tests` 0; docsScan 82/82; activeContext.md 53 lines.
- **Notes:** Docs only. The final check's finding 5 was outdated when this round began (the orchestrator had run Windows, CI and the VSIX at `338a532`); it is recorded here, not re-run. Product code of T-022 and T-023 changed after `338a532` (text modules, one CSS rule): the checklist item "Host suite" asks Gregor to repeat `npm test` on Windows at the release commit if the head moved.

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
| `core/shell/treeModel.test.ts` | it: PD-048: every entry of an active project has an icon of its own | voided: 0020 §5 "PD-048": no project and area entries; tree icons per 0020 §4.2, AC-005 |
| `core/shell/treeModel.test.ts` | it: an active project keeps its entries while a state such as loading or a load error applies | replaced: 0020 §5 "0005 AC-003" → "a loaded model keeps its groups while Refresh or Retry re-reads (S4)" and "S5 for discovery or listing with a project active shows its line and the rows Show output and Retry, rows of an old model gone" (both in "0020 AC-012: the states of the view", specTree.test.ts) |
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
| `webview/states.test.tsx` | it: the empty board, the empty Overview and the empty Spec Explorer | retitled: "the empty board and the empty Overview" (0020 §5 "0005 §13 zero specs"; the tree's zero state is specTree.test.ts, AC-012) |
| `webview/userLanguage.test.tsx` | it: the Spec Explorer row shows no rule ID | voided: 0020 §5 "0016 AC-011, AC-012 list row(s)"; the tree's tooltip is asserted in specTree.test.ts (AC-006) |

### Re-run at the fix head (T-015, 2026-11-18)

Script: `/tmp/s54/audit/titles.py` (throwaway, `python3 -I`), the same literals as above, `git archive 16fc52b` against `git archive` of the head before the T-015 commit (T-009…T-014 in). Result: 2205 titles at the Baseline, 2309 at the head, **50 absent**: the 44 rows above (every home checked again against the head, the two D2 titles included) and six more, which this round caused. The counts of the first run (2167, 2268) came from a stricter parse; the Baseline count of 2205 is the one the compile session found with its own script. Every absent title has a home:

| File | Absent title | Home |
| --- | --- | --- |
| `webview/ui/RuleText.test.tsx` | describe: 0013 AC-010, 0016 AC-011 RuleText | deleted with `RuleText.tsx` (T-013, no production user since 0020 T-006); the sentence and the tooltips of derived states are decided by `specTree.test.ts` (AC-004, AC-006) and `SpecBoard.test.tsx` |
| `webview/ui/RuleText.test.tsx` | it: AC-011: shows the sentence only; the rule ID is in the tooltip, never in the text | as above; `userLanguage.test.tsx` sweeps the visible text for rule IDs (0016 AC-011) |
| `webview/ui/RuleText.test.tsx` | it: T-08, T-10: the two tooltips read as the spec says | as above; `SpecBoard.test.tsx` "AC-020: the Ready, Review and Blocked headers carry the sentence and the rule text …" |
| `webview/ui/RuleText.test.tsx` | it: §3.5: the three derived-rule sentences | as above; `specTree.test.ts` "AC-006: the tooltip" (derived state, T-09 sentence) |
| `adapters/node/webviewCss.test.ts` | it: AC-031: a focused control and a focused row use the High Contrast active border before the focus border | retitled: "AC-031: a focused control uses the High Contrast active border before the focus border, and no rule is left for the removed list rows" (T-013: the row half named a selector no element matches) |
| `webview/areas/overview/Drilldown.test.tsx` | it: the view holds no run drill-down, and every request it can send names one of the three areas | retitled: "… one of the two areas" (T-013; the body already checked two) |

Not at the Baseline, homed for the record: `areas.timing.test.tsx` describe "0020 AC-010: a shell event reaches the DOM" (T-001…T-008) was mislabelled, as it times 0005's notice (PD-047); retitled in T-012 "0005 AC-010 (PD-047): a shell event with a notice reaches the DOM". Its Baseline home stays the voided row "AC-007: the Spec Explorer list".

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | src/core/shell/specTree.ts:buildSpecTree | specTree.test.ts "AC-001: the groups" | verified |
| AC-002 | T-001, T-005 | src/core/shell/specTree.ts:rowId, groupsOf | specTree.test.ts "AC-002: expand state and IDs" | verified |
| AC-003 | T-001, T-009 | src/core/shell/specTree.ts:compareRows | specTree.test.ts "AC-003: the order" (equal numbers by path, entries in model order and reversed) | verified |
| AC-004 | T-001 | src/core/shell/specTree.ts:rowOf | specTree.test.ts "AC-004: the row texts" | verified |
| AC-005 | T-001 | src/core/shell/specTree.ts:STATE_ICONS | specTree.test.ts "AC-005: icons and colours" | verified. Note (0022): `STATE_ICONS` was removed by 0022 T-004; icon and colour now come from `shared/protocol/stateLook.ts` (`STATE_LOOK`) |
| AC-006 | T-002, T-005 | src/core/shell/specTree.ts:tooltipOf | specTree.test.ts "AC-006: the tooltip" | verified |
| AC-007 | T-004 | src/core/shell/treeActions.ts:copy; src/core/copyNextStep/copyNextStep.ts:copy | treeActions.test.ts "AC-007"; copyNextStep.test.ts "AC-007" | verified |
| AC-008 | T-004 | src/core/shell/treeActions.ts:open; src/adapters/vscode/editor.ts; src/core/board/openFile.ts | treeActions.test.ts "AC-008"; editor.test.ts "AC-008"; openFile.test.ts "AC-008" | verified |
| AC-009 | T-004, T-005, T-010 | src/core/shell/treeActions.ts:select | treeActions.test.ts "AC-009" (incl. the start path: a target set before the panel closed is gone); host "AC-009 (0020)" | verified |
| AC-010 | T-002, T-005 | src/core/shell/specTree.ts:badgeOf | specTree.test.ts "AC-010: the badge" | verified |
| AC-011 | T-002, T-005, T-011 | package.json; src/adapters/vscode/studioTree.ts; src/adapters/vscode/commands.ts | manifest.test.ts "AC-011 (0020)"; studioTree.test.ts; specTreeService.test.ts (view description with two projects, one active) | verified |
| AC-012 | T-002, T-005 | src/core/shell/specTree.ts:buildSpecTree | specTree.test.ts "AC-012: the states of the view" | verified |
| AC-013 | T-003, T-005 | src/core/shell/specTreeService.ts | specTreeService.test.ts, specTreeService.timing.test.ts "AC-013" | verified |
| AC-014 | T-004 | src/core/shell/treeActions.ts | treeActions.test.ts "AC-014" | verified |
| AC-015 | T-005, T-006 | package.json (inline Copy only) | manifest.test.ts "AC-011, AC-015 (0020)" | verified |
| AC-016 | T-006, T-007 | src/shared/protocol/areas.ts; src/webview/areas/registry.tsx | messages.test.ts "AC-016"; App.test.tsx "AC-016" | verified |
| AC-017 | T-006 | src/core/shell/uiMemory.ts:parseUiMemory | uiMemory.test.ts "AC-017"; shellService.navigation.test.ts "AC-017" | verified |
| AC-018 | T-007, T-008, T-013, T-014 | src/core/shell/uiMemory.ts (the one mapping); src/webview/main.css; README, checklist, design brief, `.architecture` | sourceScan.test.ts "AC-018"; webviewCss.test.ts "AC-018"; docsScan.test.ts "product docs after 0020 (AC-018, AC-020)" | verified |
| AC-019 | T-005 | src/extension.ts; src/test/shell.smoke.test.ts | shell.smoke.test.ts "AC-019" (host, CI) | verified |
| AC-020 | T-008, T-014, T-015 | the nine files with `Amended by 0020` notes | docsScan.test.ts "carries its n notes of 0020" (nine, the §5 counts) | verified |
| AC-021 | T-008, T-015 | `## Test-title audit` in this plan | the audit script; `npm run test:unit` (`npm test` on Windows and CI at 77f585b and again at 338a532: unit 2217 passed, 7 skipped + 13 timing, `npm test` 30+1+1+1, CI run 44287407889 green, and the host suite also against the VSIX unpacked from 338a532); the re-run at the fix head homes all 50 absent titles (T-015) | verified |
| AC-022 | T-008 | docs/release-checklist.md "The native Specs tree (0020)" | manual: Gregor or his delegate (pre-release checklist) | open |

## Session handoff

- **Done so far:** T-001…T-008 (the implementation) and T-009…T-016 (the fixes of the compile, NOT READY with D1-D3, G1-G5, F1-F9) and T-017…T-025 (release readiness after the final check of the UX round: plan 0019 whole, one CHANGELOG entry, the checklist in spec order, the README, PD-067, text modules, the sort select's focus outline, the 0018 audit sentence, these records) verified and committed; the plan is Done. The spec stays `In Progress` in `active/` (no `/sdd-compile`, no move to done). Fixed: equal numbers by path (D1, G1), gap tests for the start path, the view description, the README and the note counts (G2-G5), the timing title and three weak tests (F2, F3), the leftovers of the removal (F4: `RuleText`, `VIEW_NAME`, `TITLE_NOT_AVAILABLE`, a dead selector, `SpecDetail`'s dead branch), the wording (F6), the audit homes, the 0013 note and the 0005 pointers (D2, D3, F1), three outdated or unreferenced screenshots deleted and two current ones added (F9).
- **Next action:** Gregor's manual checks from `docs/release-checklist.md` (AC-022 on `tip-splitter` and the keyboard item among them; he also decides whether `spec-detail-light.png`, which shows this repository's own specs, stays), then a fresh `/sdd-compile` for each of 0014…0020, then Go (set the date of the 0.1.0 entry in CHANGELOG.md first). Validation of the fix head is recorded: Windows, CI and the VSIX were green at `338a532` (unit 2217 passed, 7 skipped + 13 timing; `npm test` 30+1+1+1; CI run 44287407889). T-017…T-025 changed texts, one CSS rule and docs; Windows and CI at the release head are repeated by the checklist item "Host suite" only if the head moved.
- **Open decisions:** none; P-1…P-24 stand unless Gregor changes them. Proxy decisions of the fix round: see the T-009…T-016 notes.
- **Baseline:** `16fc52b` (HEAD before the first step commit; started 2026-11-18 on Gregor's delegated start signal); fix round from `77f585b`.
- **Environment:** host smoke runs on Windows and CI only (VS Code download blocked here).
