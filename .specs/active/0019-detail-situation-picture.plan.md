# Plan — Spec Detail as a Situation Picture Beside the Content

**Spec:** [0019-detail-situation-picture.md](0019-detail-situation-picture.md)
**Status:** Done
**Last updated:** 2026-11-18
**Current step:** — (all steps verified)

## Approach

The core builds a *situation picture* of the selected spec (protocol `DetailView` with a strict
guard, every link with a line) **beside** today's full-text `sections`, so the tree stays green;
the webview switches to it, then the old contract, texts and CSS go. After that the selection
moves the detail into a side panel that the shell frame renders in Overview and Board, with close,
focus and the 900 px drawer; the host opens files `ViewColumn.Beside` at the line. Order: the
independent host path and the core model first, then the content (largest diff, most voided
tests), then placement and focus (riskiest UX), docs and the test-title audit last. Memory Bank
touched in T-008 only: `techContext.md`, `systemPatterns.md`, `activeContext.md`.

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` ·
2 `npx tsc --noEmit` · 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile`
(steps touching wiring, adapters or the bundle) · `npm run compile-tests` (host-test compile) ·
pre-done gate `npm test` on Windows and CI (host smoke cannot run in the agent sandbox).

## Research

**Checkpoint digest (2026-11-18, `/sdd-plan` under Gregor's delegation).** No question only Gregor
can answer: every open choice is decided by the audit (05 R-07, R-11; 04 K-E, K-I; 03 §5.2, §6),
PD-058…PD-064 and `.claude/rules/ux-guidelines.md`, recorded as proxies P-1…P-19 below. Gregor
reads this plan and replies with changes or approval.

**Spec revised first (P-1).** PD-063 (5) (written 2026-11-18 01:21, after this spec's last
revision `f6d53c5`, 2026-11-17 23:19) keeps the format-note toggle "collapsed on every showing" and
remembering nothing. AC-015, §6.2 row 6 and the §5 row on 0013 AC-012 now follow it; Status history
keeps 0013 AC-012's memory; OP-004 records it. §11 names `areas/overview/requests.ts` (0018 P-1).

**Survey (code at `dc0077a`, 0018 T-009).**
- Detail today: `src/core/board/detail.ts` builds seven full-text sections; contract
  `src/shared/protocol/detail.ts` (`DetailSections`, guard checks `SECTION_KEYS`); webview
  `src/webview/detail/{SpecDetail,DetailSection,NextStep,sectionMemory}.tsx`, test builder
  `detail/testing/views.ts`; collapse memory `sectionMemory.ts` (module `Map`, default expanded);
  format notes `src/webview/ui/FormatNotes.tsx` (keyed by spec, 0016).
- Lines exist: `AcceptanceCriterion.line` (`specs/leadingIds.ts`, duplicates kept in order, so the
  first `find` is the first definition), `PlanStep.line` (`planSteps.ts`), `TraceabilityRow.line`
  and raw `criterion` (`parsePlan.ts`). Diagnostics carry `scope {file, line?}`.
- Open path: `createOpenFile` (`core/board/openFile.ts`) passes the line; `EditorPort.open(root,
  key, line?)`; `adapters/vscode/editor.ts` calls `showTextDocument(document, { selection, preview:
  false })` — no `viewColumn`. The webview's `OpenFile = (key) => void` drops the line.
- Selection: `ShellService` handler `select(stem, path)`; no way to clear (`isSelectPayload` needs a
  stem). Cards (`areas/SpecBoard.tsx` `open`), Overview rows (`areas/overview/SpecRow.tsx`) and
  activity entries (`Overview.tsx`) send `navigate {area: 'specExplorer', target: spec}` via
  `areas/overview/requests.ts` `rowRequest`/`activityRequest`. Cards open on Enter only.
- Frame: `src/webview/App.tsx` `Frame` renders the area into `main`; areas in `areas/registry.tsx`.
- Plan in use: `LifecycleEntry.plan` = `planInUse` (archived plan for `done/`); `spec.planKeys`
  holds sibling and archived plans (`PlanEntry.variant`), `spec.returnNoteKeys` the notes.
- `nextStep.ts` `openStep` is private and returns an ID; `startLine` (NS-7) uses it.
- Texts reused: T-07 `formatNotesText`, T-08 `derivedTooltip`, T-09 `DERIVED_SENTENCES`, T-10
  `persistedTooltip`, T-12 `needTooltip`, B-6 join `columnRuleTooltip`, `fileNotFoundText`,
  `NO_PLAN_TEXT`, `DETAIL_LABEL`, `NO_DETAIL_SELECTION_TEXT`; live region pattern
  `ui/CopyButton.tsx` (visually hidden, `role=status`, `aria-live=polite`).
- Guards that constrain the layout: `webviewCss.test.ts` 0018 AC-015 — no `@media` rule whose
  selector matches `/\.columns?\b/`; 0013 colour/alias/outline guards run over the whole sheet.
- `PROTOCOL_VERSION` is 2 (`messages.test.ts` asserts it); 22 envelope literals `v: 2` in 6 test
  files (`SpecBoard`, `Sections`, `Drilldown`, `client`, `probe`, `webviewBundle`); the `v: 2` in
  `doneMemory.test.ts` and `uiMemory.test.ts` are memory versions and stay.
- Host workspace (`.vscode-test.mjs`): `fs110-de-active-review` (spec `0001-tip-splitter.md`, 215
  lines, AC-001 at line 94), `incomplete-agents-only`, `not-fs-speckit`.
- No `Deprecated` candidate: 0005, 0006, 0007, 0013 keep their criteria except the §5 rows (inline
  notes, as 0015–0018 did).

**Fixture facts (read-only probe, throwaway esbuild bundle in `/tmp/probe-0019`, 2026-11-18).**
`fs110-ready-synthetic` 0001: Ready, steps 0/1, open T-001 "The feature", rows open 1, AC-001 spec
line 9, T-001 plan line 24, row line 36. `fs170-brownfield-mixed` 0006: Review, 4/4, verified 3/3,
AC-001/002/003 lines 13/17/21, T-001 line 70, T-004 line 169; 0003: Backlog, no plan.
`fs180-de-baselines` 0001: Done, no plan. `fs180-en-done-archived` 0001: Done, plan in use = the
archived plan, `planKeys` = that one plan only. `repo-8052f9a` 0015: Review, 20/20, counts verified
28, open 1 (AC-030), other 1 (AC-027 "verified here; `npm test` at the fix head pending") → AC-012's
"28 of 30". `repo-8052f9a/.specs/active/0015-*` is byte-identical to `git show 8052f9a:` (diff).

**VS Code facts (`engines.vscode ^1.146.0`, `@types/vscode` 1.146.0 in the lock).**
- `node_modules/@types/vscode/index.d.ts` 1.146.0 (read 2026-11-18): `TextDocumentShowOptions` —
  `viewColumn` default Active, "Use ViewColumn.Beside to open the editor to the side of the currently
  active one"; `preserveFocus` "when true will stop the editor from taking focus"; `preview` (ignored
  when previews are off); `selection` "to apply for the document". `ViewColumn.Beside` is symbolic; the
  resolved `TextEditor.viewColumn` is never `Beside`. `WebviewPanel.reveal(viewColumn?,
  preserveFocus?)` "Shows in the current WebviewPanel.viewColumn if undefined"; `createWebviewPanel`
  show options take `preserveFocus`. `revealRange` + `TextEditorRevealType.InCenterIfOutsideViewport`.
- [mainThreadEditors.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/browser/mainThreadEditors.ts)
  — `$tryShowTextDocument` passes `selection`, `pinned`, `preserveFocus` and no reveal type to the
  editor service (retrieved 2026-11-18, `main`).
- [editorOptions.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/common/editor/editorOptions.ts)
  — `applyTextEditorOptions` reveals a passed selection in the center unless a reveal type is given:
  the line is revealed without an extra `revealRange` (P-14) (retrieved 2026-11-18).
- [editorGroupColumn.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/editor/common/editorGroupColumn.ts)
  and [editorGroupFinder.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/editor/common/editorGroupFinder.ts)
  — `Beside` maps to `SIDE_GROUP`: the group next to the **active** group in the side-by-side
  direction, a new group when there is none or it is locked; the "reveal if open" search runs only
  for an unspecified group. So a link clicked in the Studio (its group active) opens to its side, and
  a file already open elsewhere opens again beside the panel (A-011) (retrieved 2026-11-18).
- [workbench.contribution.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/browser/workbench.contribution.ts)
  — `workbench.editor.revealIfOpen` (default false) is "ignored … when forcing an editor to open … to
  the side of the currently active group"; `workbench.editor.openSideBySideDirection` default
  `right` (`down` opens below; the Studio stays visible either way) (retrieved 2026-11-18).
- Restricted Mode and reader windows: the open path has no trust or writer input (`createOpenFile`,
  `createEditor`), so they change nothing by construction (P-19); the host smoke runs trusted only.

**Accessibility facts.**
- [Understanding SC 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
  — "the component is not entirely hidden due to author-created content"; a non-modal overlay that
  can cover focusable items is "at risk of failing"; a partly covered component passes AA
  (retrieved 2026-11-18).
- [Technique C43](https://www.w3.org/WAI/WCAG22/Techniques/css/C43) — `scroll-padding` plus end
  padding let a focused element scroll clear of an overlay (retrieved 2026-11-18).

**Proxy decisions (Gregor delegated; read with the plan).**
- P-1 Spec revised per PD-063 (5) (above).
- P-2 Contract: the spec variant of `DetailView` gains `path?` (duplicated stem), `state`, `rule`,
  `persistence`, `successor?`, `problems`/`notes` as `{reason, open?}`, `progress?`, `files`,
  `history`; every `open` is `{key, line}` with `line ≥ 1` (file link 1). Added beside `sections` in
  T-002, `sections` removed in T-004; `PROTOCOL_VERSION` 3 once, in T-006 with the new request.
- P-3 Short titles and the open-criteria list are computed in the core as plain text
  (`core/board/shortTitle.ts`); the webview derives nothing (`.architecture/webview.md` playbook).
- P-4 `openStep` is exported from `nextStep.ts` and returns the step (`id`, `title`, `line`);
  `startLine` uses its ID, NS-7 unchanged.
- P-5 Closing sends a new request `clearSelection` (empty payload); `select` keeps its guard.
- P-6 Entry point for 0020: `ShellService.select(reference | undefined)` is public, and the
  internal command `featherspec-studio.selectSpec` (args `{stem, path?}`, `isSelectPayload`) selects
  and calls `panel.show({ preserveFocus: true })`, keeping the area. Registered, not contributed: no
  palette entry, 0018 AC-001's exact command list holds. 0020 binds `TreeItem.command` to it.
- P-7 The side panel is rendered by the shell frame (`App.tsx`) for `overview` and `board`, not by
  each area; until the detail event matches the selection it shows only its heading.
- P-8 `detail/opener.ts` keeps the element that opened the side panel; focus moves to the heading
  only after an in-panel activation (restore, `selectSpec` and the list move none).
- P-9 `detail/selected.ts` matches a card or row with `view.selection` (stem, and path when the
  selection has one); `aria-current="true"` on `li.card` and `button.ov-row`; CSS as
  `.spec-row.selected` (0013 D-12).
- P-10 `ui/FileLink.tsx`: a button whose visible text is its name; `title` and an
  `aria-describedby` hidden span carry "Open <file name> at line <n>" (deterministic, as 0018 P-7).
- P-11 Not-found: the link remembers its own activation; while the `openFileResult` key matches and no
  new detail event came, it reads `File not found: <path>`, keeps the focus and announces through a
  visually hidden polite region (0016 §6.5 pattern).
- P-12 Collapse: Status history uses `useCollapsed('Status history')`, default collapsed, kept in the
  module memory (lives with the panel's webview); Format notes stay 0016's toggle keyed by spec.
- P-13 Layout: `.area-frame` flex row; `.side-panel` 400 px, own scroll; `@media (max-width: 899px)`
  overlays it at `min(400px, 100vw)`; no media rule names `.columns?`. While the drawer shows,
  `data-drawer` on `.columns` (set from `matchMedia` with the same query constant) gives
  `scroll-padding-inline-end` and end padding of the drawer width (C43). Overview rows span the area
  and stay partly visible (SC 2.4.11 AA), so they need no scroll.
- P-14 No explicit `revealRange` (source above); the host smoke checks `visibleRanges`.
- P-15 Fixture `test/fixtures/studio-0015`: `.specs/active/0015-*` copied from `repo-8052f9a`
  (identical to `8052f9a`), `AGENTS.md` from `studio-0002`, empty `backlog/`, `done/` with `.gitkeep`.
- P-16 Test-title audit by 0018's method (T-008); expected map below.
- P-17 `rowRequest`/`activityRequest` become one `specReference(spec)`; the drill requests stay.
- P-18 A card opens on Space as on Enter (AC-001); its Copy keeps its own keys (0017 P-11).
- P-19 Restricted Mode and reader window: no trust input on the open path (above).

**Expected test-title audit map (T-008 confirms it against the Baseline).** Absent at the head:
- `core/board/detail.test.ts`: "AC-009: every criterion with its full text…", "AC-009: every FR-
  requirement…", "AC-009: each ID appears once…" → void (§5 0007 AC-009); "AC-010: Overview, Plan,
  Verification and Related carry their open targets…" → 0019 AC-017, AC-014; "AC-010: no plan gives
  no plan target…" → AC-011; "AC-010: plan steps carry tick, struck mark and their Verified text" →
  void (§5 0007 AC-010 section list; AC-010); "AC-006: the Verification section shows the same
  criteria numbers as the card" → AC-012 (§5 0007 AC-006); "AC-016: AC-001 of 0003 … keeps its bold
  title…" → void (§5 0016 AC-016), AC-013; "AC-007: … the notes with their reasons in the overview" →
  AC-009 (notes are section 6).
- `webview/detail/SpecDetail.test.tsx`: group "AC-010: the seven sections" (6 tests) → AC-009,
  AC-011, AC-012, AC-014, void for header lines and the plan step list (§5 0007 §6.4, A-007); group
  "AC-009: criteria and requirements as delivered" (3) → void (§5 0007 AC-009); group "AC-010: Open
  file exactly where a file is named" (6) → AC-017, AC-019, AC-004, "0013 AC-013 … no line" void (§5
  0013 AC-013); "each header line is one wrapper…" → void (§5 0013 §3.4); "AC-012: all sections start
  expanded…" → AC-015 (§5 0013 AC-012); "AC-013: no Open file per requirement…" → void; "AC-003:
  toggles, section Open file buttons and related links…" → AC-004, AC-021 (§5 0013 AC-003);
  "detail header: number chip, title, state chip and one Open file…" → AC-009; "AC-010: the Overview
  shows a derived state with its sentence and rule ID" → AC-009 (§5 0016 AC-012); "AC-006: … above
  Overview" → AC-009 (above Progress); "AC-016: a criterion whose title is bold…" → void, AC-013.
- `SpecDetail.timing.test.tsx` "renders the update fast enough: 120 requirements…" → AC-020.
- `adapters/node/webviewBundle.test.ts` "0013 AC-014, AC-015: the detail of … studio-0002 …" → AC-010
  on `studio-0015` (§5 0013 AC-015 void; AC-014's renderer stays for reasons).
- `adapters/node/webviewCss.test.ts` "AC-010: the Overview header lines are a two-column grid…" →
  void (§5 0013 §3.4).
- `webview/board/SpecBoard.test.tsx` "a click and Enter send the navigation request to Spec
  Explorer…" → AC-001 (§5 0007 FR-05, AC-008); `areas/overview/Drilldown.test.tsx` "a Now row sends
  Spec Explorer…", "an activity entry of a current spec sends Spec Explorer…" and
  `Sections.test.tsx` "activating the row outside Copy sends the request of 0006 AC-014" → AC-001
  (§5 0006 BR-08, AC-014; 0018 AC-006).
- Kept by title, retargeted: `SpecBoard` "a card of a duplicated stem sends its path", `Keyboard`
  "… Enter on a card opens the spec as before", `boardService.timing` 500 ms, `userLanguage` detail
  sweep, `openFile.test.ts`, `editor.test.ts`, `board.smoke` "AC-010, AC-016: Open file …", 0015
  AC-012 history, 0016 AC-007 format notes, the next-step and selection groups; shell navigation with
  a spec target (0005 BR-07 keeps its meaning).

## Stages

1. T-001 ‖ T-002 — host paths (beside, select from outside) and the core situation picture
2. T-003 → T-004 — the detail shows the picture with links at the line; the full-text contract goes
3. T-005 → T-006 → T-007 — the side panel: select in place, close and focus, beside or drawer
4. T-008 — §5 notes, docs, test-title audit, architecture and Memory Bank sync, final gates
5. T-009 → T-016 — fixes of the compile S48 (NOT READY): D5, D6 (PD-066), D1, D2, F1, F3, the test gaps, docs
6. T-017 — AC-022 round 3 finding: the selected Overview row shows a marker in High Contrast

Parallel: stage 1 (T-001 touches the editor adapter, panel, shell service, wiring and host smoke;
T-002 the protocol detail, core board, the test builder and a new fixture; no shared file, each
`Verify` runs its own tests). Both are small: run them in sequence. Stages 2–4 build on one
contract and share `SpecDetail.tsx`, `App.tsx` and `main.css`.

## Steps

### T-001 — Host: files open beside the Studio at the line; a spec can be selected from outside

- **Covers:** AC-018; P-6 (0020's entry point)
- **Files:** `src/adapters/vscode/editor.ts`, `src/adapters/vscode/editor.test.ts`,
  `src/adapters/vscode/studioPanel.ts`, `src/core/shell/shellService.ts`,
  `src/core/shell/shellService.navigation.test.ts`, `src/extension.ts`,
  `src/test/board.smoke.test.ts`, `src/test/shell.smoke.test.ts`
- **Do:** `editor.ts`: `showTextDocument(document, { viewColumn: ViewColumn.Beside, preview: false,
  selection })`, no `preserveFocus`, selection collapsed at (line − 1, 0), (0, 0) without a line
  (P-14). `ShellService.select(reference | undefined)` public; the `select` handler and the test API
  call it; `undefined` clears and remembers the selection, area, target and notice untouched.
  `studioPanel.show(options?: { preserveFocus?: boolean })` hands it to `reveal` and
  `createWebviewPanel`. `extension.ts` registers `featherspec-studio.selectSpec` (P-6). Tests:
  `editor.test.ts` "0019 AC-018" (recorded options: `viewColumn` −2, `preview` false, no
  `preserveFocus` key, selection (n − 1, 0); no line → (0, 0)); `shellService.navigation.test.ts`
  "0019 P-6" (selection set and remembered, area unchanged, no navigation listener called;
  `undefined` clears and remembers; an unknown stem shows the notice). Host smoke (CI only):
  `board.smoke` "0019 AC-018" — Studio open and active, `openFile('.specs/active/0001-tip-splitter.md',
  94)` → active editor column ≠ the Studio tab's group column (`tabGroups`), cursor line 93, a visible
  range holds line 93, the Studio tab keeps its group; `shell.smoke` "0019 P-6" — the command selects
  `0001-tip-splitter`, one panel, area unchanged.
- **Verify:** `npx vitest run src/adapters/vscode/editor.test.ts src/core/shell` red (no `viewColumn`;
  `select` is not on the service), then green; gates 1–5; `npm run compile-tests`; host smoke on
  Windows and CI (pre-done gate)
- [x] **Verified (T-001):** 2026-11-18 — red: `npx vitest run src/adapters/vscode/editor.test.ts src/core/shell` failed 5 tests (no `viewColumn` in the recorded options, `service.select is not a function`); green after the change (144 passed). Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 1996 passed + 3 skipped (+12 timing), `npm run compile` and `npm run compile-tests` green. Host smoke (`board.smoke` "0019 AC-018", `shell.smoke` "0019 P-6") written, compiled, not run here (CI and Windows).
- **Notes:** Proxy: `ShellService.select` takes `SpecReference {stem, path?}` (exported from `shellService.ts`); the command id lives in `adapters/vscode/commands.ts` as `SELECT_SPEC_COMMAND`. A malformed command argument is ignored (no throw).

### T-002 — Core: the situation picture of a spec, a line for every ID

- **Covers:** AC-011, AC-012, AC-013, AC-014, AC-016; AC-009 (header facts in the model)
- **Files:** `src/shared/protocol/detail.ts`, `src/shared/protocol/detail.test.ts` (new),
  `src/core/board/detail.ts`, `src/core/board/detail.test.ts`, `src/core/board/shortTitle.ts` (new),
  `src/core/board/shortTitle.test.ts` (new), `src/core/board/nextStep.ts`,
  `src/webview/detail/testing/views.ts`, `test/fixtures/studio-0015/**` (new)
- **Do:** Fixture `studio-0015` (P-15). Contract fields of P-2 beside `sections`, strict guard for
  them. `progress` (absent for a Done spec without a plan): `needs` (Backlog, T-12 rule);
  `noPlan` (other states without a plan); `steps` — `{done, total, next?: {id, title, open}}` |
  `none` | `unavailable`; `criteria` — `{verified, total, open: [{id?, text, built, open}]}` |
  `unavailable: 'no-table' | 'unreadable'`. `shortTitle.ts` per §6.3 (P-3); `openStep` exported
  (P-4). `detail.ts` per §6.3/§6.4: criterion ID → spec line of the first definition, else its plan
  row; other cells → plan row; step → plan heading; problem or note → its file at its line, line 1
  without; files (`Spec`, sibling `Plan`, `Archived plan`, `Return note` by variant) → line 1;
  entries in table order, exact `built` marked, other non-`verified` values unmarked. `views.ts`
  gives defaults for the new fields so webview tests keep sending valid views. Tests (red via
  `Not implemented` stubs of `shortTitle` and the new builder part): `shortTitle.test.ts` AC-013
  (the three examples, `_` intraword, link text, 80/79 cuts, no-separator case, a negative control);
  `detail.test.ts` AC-011 (fs110 0001 "0 of 1", next T-001 "The feature"; fs170 0006 4/4, no next;
  0003 needs only; fs180-de 0001 no progress; all-struck memory plan → `none`; for every listed
  fixture spec with a plan `next.id` = `openStep(...)?.id`), AC-012 (fs110 0/1 with "AC-001 The
  system shall be ready."; 0006 3/3, no list; memory plan without rows → `no-table`; `studio-0015`
  28/30 with AC-027 then AC-030 unmarked; a `built` row; cell `M-01, M-02` → its text at its row),
  AC-014 (fs180-en 0001: Spec and one Archived plan, no Plan), AC-016 (the lines of §10 and a
  criterion defined twice), AC-009 model (fs110 0001 state Ready, rule S-READY, derived; `path` only
  for a duplicated stem); `detail.test.ts` in `shared/protocol` for the guard.
- **Verify:** `npx vitest run src/core/board src/shared/protocol src/webview/detail` red (stubs), then
  green; gates 1–4
- [x] **Verified (T-002):** 2026-11-18 — red: `npx vitest run src/core/board/shortTitle.test.ts` failed 24 of 24 on the `Not implemented` stub; `npx vitest run src/core/board/detail.test.ts` failed 22 of 44 (no `progress`, `files`, `state` … on the view, problems without a line); green after the change: shortTitle 24, detail 44, `src/shared/protocol/detail.test.ts` 24 (guard: one accepting case, 21 damaged views each refused, so no case is vacuous). Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2066 passed + 3 skipped (+12 timing).
- **Notes:** Deviations and proxies: (1) the new builder part lives in `src/core/board/situation.ts` (`progressOf`, `filesOf`), not inside `detail.ts`, to keep that file small; `src/core/board/shortTitle.ts` also exports `plainShort` (next open step title). (2) `DiagnosticLine.open` is now a `LineTarget` (line ≥ 1; line 1 without one) for `problems` and `notes`; the old `sections.overview.notes` follows. (3) A Backlog spec without a plan and without an applying need (unreadable spec) gets `noPlan: true`, so Progress is never empty. (4) File rows carry their `label` from `FILE_LABELS` (`texts.ts`), `openStep` returns the `PlanStep`. (5) The fixture `studio-0015` holds `.gitkeep` in backlog/ and done/ as `studio-0002` does. (6) Webview tests keep passing on the old `sections`; `views.ts` builds the new fields with defaults (`extra` parameter overrides).

### T-003 — The detail shows the picture; every link opens its file at the line

- **Covers:** AC-009 (rows 1–5), AC-010, AC-017, AC-019, AC-020 (500 ms)
- **Do:** `SpecDetail.tsx` renders §6.2 rows 1–5 from T-002's fields and no longer renders
  `sections`; Format notes (0016's `ui/FormatNotes.tsx` gains an optional item renderer: the
  detail's reasons are links, the board banner's stay text) and the existing Status history
  section follow Files until T-004. Header: number, title, path for a duplicated stem, one
  `StateChip` with tooltip `columnRuleTooltip(rule)` (derived) or `persistedTooltip(rule)`, T-09 as
  visually hidden text after it, "Deprecated" with the successor text. Progress: needs, Steps and
  Criteria rows with `ProgressBar`, "Not verified yet:" entries, the absence texts of §6.3. Files:
  label and file-name link per row. `ui/FileLink.tsx` (P-10, P-11) posts `openFile {key, line}`;
  the `OpenFile` type carries the line. §8's new texts in `texts.ts`, asserted literally. Tests:
  `SpecDetail.test.tsx` rewritten on the new contract (the 0015 next-step, 0016 Problems, format-note
  and NS-1, 0015 history and AC-028 groups retargeted) — AC-009 (order; fs110 0001 chip "Ready", its
  tooltip, the hidden sentence), AC-010 (none of §8's removed texts as a heading or line; no
  Verified text, no header line), AC-017 (each link kind posts key and line; file link 1; needs,
  history and texts post nothing; name, tooltip, description), AC-019 (text at the link, focus kept,
  live region, reset by the next detail event and by another spec); `SpecDetail.timing.test.tsx`
  AC-020 (a picture with 200 open criteria and 100 history entries in the DOM within 500 ms);
  `webviewBundle.test.ts` AC-010 on `studio-0015` (real core, collapsible sections closed: no text
  of an `FR-` row, at most 300 words); `userLanguage.test.tsx` sweeps the new detail.
- **Verify:** `npx vitest run src/webview src/adapters/node/webviewBundle.test.ts` red (new
  expectations on the old component), then green; gates 1–5
- [x] **Verified (T-003):** 2026-11-18 — red: `npx vitest run src/webview/detail/SpecDetail.test.tsx` on the old component failed 28 of 46 (no Progress/Files, old sections, no `file-link`); the removed bundle test of 0013 AC-014/015 was replaced by the AC-010 test on `studio-0015` (first run red on a test slip: `SpecEntry` has no `stem`, fixed, then green). Green: `src/webview` 325 passed, `webviewBundle.test.ts` 9 passed (no `FR-` row text, at most 300 words, `28 of 30 verified`, AC-027 and AC-030). Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2070 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green. `SpecDetail.timing.test.tsx` AC-020 (200 open criteria + 100 history entries) passes within the 500 ms budget in the timing project.
- **Notes:** (1) The hidden description of each link is a `visually-hidden` span after the button (P-10); tests read visible text without `.visually-hidden`. (2) One live region (`.detail-open-status`) per detail announces the not-found text; the link itself shows it only when the `openFileResult` object is newer than the one present at its activation, so a stale result never marks a working link. (3) `PlainSection` (DetailSection.tsx) holds the headed sections without a toggle (Progress, Files). (4) Status history keeps the old `DetailSection` until T-004; Format notes use `FormatNotes` with `renderNote`. (5) New texts in `texts.ts`: `PROGRESS_HEADING`, `STEPS_LABEL`, `CRITERIA_LABEL`, `FILES_HEADING`, `NEXT_OPEN_STEP_LABEL`, `NO_STEPS_TEXT`, `NOT_VERIFIED_YET_LABEL`, `BUILT_MARK`, `CRITERIA_NO_TABLE_TEXT`, `PLAN_UNREADABLE_TEXT`, `stepsDoneText`, `criteriaVerifiedText`, `openFileTooltip`. (6) The old CSS rules and constants stay until T-004.

### T-004 — Format notes and Status history collapse; the full-text contract goes

- **Covers:** AC-009 (rows 6–7), AC-015; re-proves AC-010
- **Do:** Section 6: 0016's `FormatNotes` toggle (heading T-07), collapsed on every showing, keyed
  by spec, hidden at zero (P-12, PD-063 (5)). Section 7: `DetailSection` "Status history (n)" with
  `useCollapsed('Status history')` defaulting to collapsed, hidden at zero entries; not available →
  heading "Status history" with 0003's text. `DetailSection` loses its Open file button and status
  line. Remove `sections` from the contract, `SECTION_KEYS`, `buildDetail` and `views.ts`; remove the
  constants left unused (`SECTION_TITLES` but history, `NO_REQUIREMENTS_TEXT`, `NO_RELATED_TEXT`,
  `OPEN_FILE_LABEL`, `STATE_LABEL`, `UNCERTAIN_FLAG`, `STRUCK_FLAG`, `criteriaText`, `OpenButton`) and
  the CSS rules whose elements are gone (`.detail-grid`, `.detail-header`, `.detail-facts`,
  `.detail-steps`, `.detail-stages`, `.step-*`, `.related-link`, `.open-file`) with the voided
  header-grid CSS test. Tests: AC-015 (both collapsed when first shown; history state kept across
  another spec and after a close; format notes collapsed again; zero → neither; not-available
  heading and text); AC-009 rows 6–7 order; `boardService.timing.test.ts` counts criteria from
  `progress` (title kept); the voided core detail tests removed (audit map).
- **Verify:** `npx vitest run src/webview src/core/board src/shared/protocol src/adapters/node` red
  (AC-015 on the expanded history), then green; gates 1–5
- [x] **Verified (T-004):** 2026-11-18 — red: `npx vitest run src/webview/detail/SpecDetail.test.tsx` failed 6 of 51 on the expanded history (heading without count, no collapse, no zero-entries rule, no memory across another spec); green after the change: `src/webview/detail` 53 passed, `src/shared/protocol` + `src/core/board` 340 passed. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2067 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green.
- **Notes:** (1) Status history while not available is a plain, always visible section (heading "Status history" and 0003's text), not a toggle: the reason must be readable without a click (guideline 3, honest signals); a toggle exists only with entries. (2) `useCollapsed` now defaults to collapsed for every name (its only user is Status history, memory key `Status history`); the heading is `historyHeading(n)` in `texts.ts`. (3) `DetailSection` lost `open`, `keys`, `fileResult`, `onOpen` and the status line; `OpenButton`, `SECTION_TITLES`, `NO_REQUIREMENTS_TEXT`, `NO_RELATED_TEXT`, `OPEN_FILE_LABEL`, `STATE_LABEL`, `UNCERTAIN_FLAG`, `STRUCK_FLAG`, `criteriaText`, `OpenTarget`, the whole `sections` contract and its guard key list are gone. (4) CSS rules removed: `.detail-grid`, `.detail-header`, `.detail-facts`, `.detail-state`, `.detail-status`, `.detail-steps`, `.step-tick`, `.step-verified`, `.related-link`, `.open-file` (also from the transition list); `.step-text/.step-label/.step-short` stay (next step). `tidy`/`splitCells` in `ui/inlineFormat.ts` have no caller left but their tests are no listed void test, so they stay (a later clean-up, not 0019). (5) `boardService.timing.test.ts` now adds a traceability row to the target's plan and counts `progress.criteria.open`. (6) Voided tests removed with the audit map: the three 0007 AC-009 core tests, AC-010 section tests, 0007 AC-016 bold-title test, the header-grid CSS test; every other title kept or retargeted.

### T-005 — Selecting keeps the area; the side panel shows while a spec is selected

- **Covers:** AC-001, AC-002, AC-006, AC-007; AC-008 (pane, no side panel)
- **Do:** `App.tsx`: `.area-frame` holding `.area-content` and, for `overview` and `board` while
  `view.selection` is set and no panel state shows, `detail/SidePanel.tsx` (`role="complementary"`,
  name "Spec detail") (P-7). Card `open`, `SpecRow` and a found activity entry call `shell.select`
  (path when duplicated) and hand the element to `detail/opener.ts` (P-8, P-17); a card opens on
  Space (P-18); Copy selects nothing. `detail/selected.ts` and `aria-current="true"` with the
  selection CSS (P-9). Tests: AC-001 (board with cards 0003, 0004, 0006 activated by click, Enter,
  Space → three `select`, no `navigate`, area Board, side panel shows 0006; Now, Up next and
  Problems rows and an activity entry → `select`; Copy → none), AC-002 (selection ⇔ side panel in
  Overview and Board; switching area by hand keeps it; Spec Explorer shows the pane, no side
  panel), AC-006 (remembered selection on Board → side panel, focus untouched), AC-007 (exactly the
  selected spec's cards and rows carry `aria-current`); the activation tests of the audit map
  retargeted.
- **Verify:** `npx vitest run src/webview` red (cards still navigate; no complementary region), then
  green; gates 1–5
- [x] **Verified (T-005):** 2026-11-18 — red: `npx vitest run src/webview` failed 6 tests expecting `navigate` once the components called `select` (Keyboard, SpecBoard x2, Drilldown x2, Sections), and before the change cards and rows still sent `navigate` and no complementary region existed; green after the change and the retargeting: `src/webview` 330 passed incl. the new `detail/SidePanel.test.tsx` (7). Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2074 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green.
- **Notes:** (1) P-7 `App.tsx` frame: `.area-frame` holds `.area-content` and `SidePanel` only for `overview` and `board` while `view.selection` is set and no panel state shows; Spec Explorer keeps its pane. (2) P-8/P-17 `useOpenSpec` hands the opener element to `detail/opener.ts` and calls `shell.select` (path only for a duplicated stem); Copy selects nothing. (3) P-9 `detail/selected.ts` `isSelectedSpec` drives `aria-current="true"` on cards and rows, plus selected CSS. (4) P-18 a card opens on Space. (5) Overview `rowRequest` and `activityRequest` removed; `specReference` replaces them. (6) Retargeted tests keep their titles with an AC-001 prefix where the request changed; Drilldown's area check now filters to `navigate`. (7) The panel shows only the number until the detail event matching the selection arrives.

### T-006 — Close, Escape and focus; updates keep the place

- **Covers:** AC-003, AC-004, AC-008 (close in the pane), AC-020 (focus, scroll, spec gone)
- **Do:** Request `clearSelection` (empty payload, P-5) → `ShellService.select(undefined)`; client
  `clearSelection()`; `PROTOCOL_VERSION` 3, the envelope literals in tests follow (not the memory
  versions). Header order: heading
  (`tabIndex=-1`), chip, close button ("Close spec detail", tooltip "Close (Esc)"), so Tab from the
  heading reaches close, then §6.2's controls. Escape inside the side panel or pane closes. Focus:
  in-panel activation → heading once shown; close → the opener while shown, else the spec's first
  card or Overview row in DOM order, else the area's first focusable element; Spec Explorer → that
  spec's list row and the hint. Detail update: the focused control keeps focus while it exists
  (stable keys), else the heading; the scroll container is not remounted; a selection cleared by
  the host while focus is inside follows the close rule. Tests: AC-003 (button and Escape send
  `clearSelection`, side panel gone, the three focus cases), AC-004 (heading focused; Tab order close
  → Copy → links → toggles; Enter and Space on each kind), AC-008 (close and Escape in the pane →
  hint, list row focused), AC-020 (a focused link kept across an update; removed → heading; spec gone
  → closed, focus as AC-003, notice shown); guard and router tests for `clearSelection`; version 3.
- **Verify:** `npx vitest run src/webview src/shared/protocol src/core/shell` red, then green;
  gates 1–5
- [x] **Verified (T-006):** 2026-11-18 — red: with the production edits of this step stashed, `npx vitest run src/webview/detail/Close.test.tsx src/shared/protocol/messages.test.ts src/core/shell` failed 16 tests (no close button, no `clearSelection` guard, handler or client call, version 2); green with them: `src/webview src/shared src/core/shell` 587 + 3 new passed, `Close.test.tsx` 14. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2091 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green.
- **Notes:** (1) `PROTOCOL_VERSION` is 3; envelope literals `v: 2` in the webview, bundle and probe tests moved to 3, and the tests that used 3 as "another version" now use 4 (memory versions in `doneMemory`/`uiMemory` tests untouched). (2) New `detail/DetailFrame.tsx` wraps every detail (side panel, pane, placeholder): tracks whether focus is inside, closes on Escape, and when the focused control disappears focuses the heading, else the `fallback` (close rule). `detail/focus.ts` holds the rules: `requestHeadingFocus` (set by `useOpenSpec`, consumed by the matching `Picture`, so a remembered selection never takes focus), `focusAfterClose` (opener while connected, else the spec's first card or Overview row via `data-spec-stem` / `data-spec-row`, else the first focusable of `.area-content`), `focusSpecListRow` (Explorer, `data-spec-stem` and `data-spec-path` on the options). (3) The placeholder shown before the detail event has the number heading and the close button too, so the panel is always closable. (4) The close button is the last element of the title row (`margin-inline-start: auto`), after the chip and flag; its glyph is `aria-hidden` text. (5) Host-cleared selection and a vanished spec use the same path as the button: the panel unmounts with focus inside and the close rule runs in a microtask. (6) The new tests were written after the code, the red run above was taken by stashing the production edits.

### T-007 — Beside from 900 px, a drawer below; focused cards scroll clear

- **Covers:** AC-005, AC-021; §6.1 drawer rule (looked at in AC-022)
- **Do:** CSS per P-13 (`.area-frame` flex row, `position: relative`; `.area-content` `flex: 1;
  min-width: 0; overflow: auto`; `.side-panel` `flex: 0 0 400px`, own `overflow-y: auto`, left
  border; `@media (max-width: 899px)` `.side-panel` absolute at the right, `width: min(400px,
  100vw)`, the area keeps its width; `.columns[data-drawer]` `scroll-padding-inline-end` and
  `padding-inline-end` of the drawer width). `SidePanel` sets `data-drawer` on the board's `.columns`
  from `matchMedia(DRAWER_QUERY)` and its `change` event. Theme variables only; focus outlines from
  the shared rule. Tests: `webviewCss.test.ts` AC-005 (parsed values; the media query equals
  `DRAWER_QUERY`; no media rule on `.columns?`) and AC-021 (side-panel rules inside the colour, alias
  and outline guards); `focusIndicator.test.tsx` reaches close, links and toggles; a webview test
  for `data-drawer` with a stubbed `matchMedia`.
- **Verify:** `npx vitest run src/adapters/node/webviewCss.test.ts src/webview` red, then green;
  gates 1–5; layout itself: `manual:` preview harness in T-008 (jsdom computes no layout)
- [x] **Verified (T-007):** 2026-11-18 — red: with `main.css` and `SpecBoard.tsx` stashed, `npx vitest run src/adapters/node/webviewCss.test.ts src/webview/detail/SidePanel.test.tsx src/webview/focusIndicator.test.tsx` failed 5 tests (no `.side-panel` rules, no drawer media rule, no `data-drawer`); green with them: 60 passed in those three files. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2100 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green. Layout itself (jsdom computes none): manual: preview harness in T-008.
- **Notes:** (1) `DRAWER_QUERY` lives in `src/shared/protocol/layout.ts` (no DOM types, so the node-side CSS test imports the same constant as the webview); `detail/drawer.ts` holds `useDrawer()` (`useSyncExternalStore` on `matchMedia(DRAWER_QUERY)`, false where `matchMedia` is missing). (2) `SpecBoard` sets `data-drawer` on `.columns` while a spec is selected and the query matches; the board's own tests never see a media rule (`.columns?` has none). (3) `.area-content` now scrolls itself (`overflow: auto`), the frame is the positioning context of the overlay, `.side-panel > .spec-detail` has `overflow: visible` so the aside is the one scroll container. (4) The 0005 AC-019 theme-read guard exempts `detail/drawer.ts` only, and a new test pins that file to the one width query and no colour-scheme or computed-style reads. (5) The new tests were written after the code; the red run above stashes the CSS and board edit.

### T-008 — §5 notes, docs, test-title audit, architecture and Memory Bank sync, final gates

- **Covers:** AC-022 (checklist item), AC-023, AC-024; re-proves AC-001…AC-021
- **Do:** Inline notes "*Amended by 0019 (PD-058): …*" at each §5 statement of 0005, 0006, 0007,
  0013, 0015, 0016, 0017, 0018; the PD register stays unedited. README (Spec Explorer section,
  Next-step and status-bar sentences: select in Overview or Board, side panel, IDs open beside),
  `docs/product/design-brief.md` detail section, `docs/release-checklist.md` (AC-022 item; the
  "Enter opens the detail view" and "Open file" items reworded), CHANGELOG *Unreleased*. Test-title
  audit: throwaway `/tmp/audit-0019/titles.py` (0018's method: `describe`/`it`/`test`/`suite`
  literals of every `.ts`/`.tsx` under `src`, `src/test/**` and `testing/*.ts` included) at the
  Baseline (`git archive`) and the head; `### T-017 — Fix H1: the selected Overview row shows a marker in every theme (AC-007, AC-022 round 3)

- **Covers:** AC-007, AC-022; ux-guidelines 3 and 9 (theme variables, visible focus)
- **Do:** `main.css`: `.ov-row[aria-current="true"]` gets `box-shadow: inset 0 0 0 1px var(--vscode-contrastActiveBorder, transparent)`.
  The row has no border width, so the shared `border-color` shows nothing, and in High Contrast
  `list-activeSelectionBackground` equals the page colour. The inset shadow needs no border width and sets no
  outline, so the keyboard focus outline stays. CSS guard in `webviewCss.test.ts` beside G4.
- **Verify:** `npx vitest run src/adapters/node/webviewCss.test.ts` red on a scratch copy without the rule, then
  green; mutants (colour changed, rule removed) die; gates 1–5
- [x] **Verified (T-017):** 2026-11-18 — red on a scratch copy of HEAD with the new test: 1 of 52 failed (no `box-shadow` on the selected row), green after the rule (52). Mutants on a scratch copy, both killed: fallback `transparent` → `#fff` (4 fail, the colour guards too), the rule removed (1 fails). Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2127 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green. The rendered marker in High Contrast is the orchestrator's AC-022 round 3 check; jsdom paints nothing.
- **Notes:** The fallback is `transparent` (not a colour) so the shadow appears only where the theme defines `contrastActiveBorder` (High Contrast); Dark and Light keep the selection background as their marker. Cards are unchanged (they have a border).

## Test-title audit` here lists every absent title with
  its §5 row or criterion. `/sdd-architecture-update` (confirmation = this plan's approval) changes
  exactly: `last reconciled` → `(0019)`; the `src/core/<area>` line, board part `+ situation picture,
  short title 0019`; the `src/webview` line, `detail with next step` → `detail as side panel in
  Overview and Board and as the Spec Explorer pane (0019)`; the `src/shared/protocol` line, `detail
  picture` and 0019 in its spec list; `.architecture/core.md` board line, `webview.md` (`detail/`
  side panel, `ui/FileLink`), `adapters.md` (`editor.ts` opens beside). Memory Bank:
  `techContext.md` *Test* (one 0019 line), `systemPatterns.md` (one 0019 entry: state not text,
  links with lines, `Beside`, side panel in the frame, select in place, `clearSelection`,
  `selectSpec` for 0020, collapse per PD-063 (5)), `activeContext.md`. Final gates.
- **Verify:** audit counts in this plan; `grep -c 'Amended by 0019'` on the eight spec files ≥ their
  §5 rows; `git diff --stat <Baseline> -- docs/product/product-decisions.md` empty; gates 1–5;
  `npm run compile-tests`; `npm test` on Windows and CI (pre-done gate, Gregor); AC-022 by Gregor or
  his delegate (pre-release)
- [x] **Verified (T-008):** 2026-11-18 — audit: `python3 /tmp/audit-0019/titles.py` Baseline vs head lists 40 absent test titles, each mapped in "Test-title audit" (the 8 absent `describe` titles were missing there until T-016, compile S48 D3); `grep -c "Amended by 0019"` 0005 4, 0006 2, 0007 16, 0013 7, 0015 2, 0016 5, 0017 2, 0018 3 (all eight ≥ 1; "one per §5 statement" was wrong: the §5 row "0018 §2 goal, AC-031" had no note until T-016, compile S48 D4; the 0018 count is 5 at the head); `git diff 20792ca -- docs/product/product-decisions.md` empty. Gates: eslint 0 warnings, `tsc --noEmit` and `tsc -p src/webview` clean, `npm run test:unit` 2100 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green. Not run here: `npm test` (host smoke; VS Code download blocked, Windows and CI), AC-022 (manual: preview harness screenshots and a real window); jsdom computes no layout, so the 400 px column, the drawer overlay and the scroll-clear padding rest on the CSS guard tests until then.
- **Notes:** (1) §5 notes are one `*Amended by 0019 (PD-058): …*` line under each named statement (bullet, paragraph, table or heading), the PD register stays unedited. (2) README: Spec Explorer and "The detail of a spec" sections, Overview and Board sentences (select in place), next-step sentences; its screenshot of the old detail stays (a docs scan requires three screenshot links) until AC-022's new ones replace it. (3) `docs/product/design-brief.md` Spec Explorer section marks the old detail superseded by PD-058; `docs/release-checklist.md` rewords the keyboard and "Open file" items and adds the 0019 section with AC-022; CHANGELOG Unreleased has Added, Changed and Removed lines. (4) `/sdd-architecture-update`: `last reconciled` → `(0019)` in `AGENTS.md` and the three module maps, plus the core, webview, protocol and adapter lines named in this step; Memory Bank: `techContext.md`, `systemPatterns.md`, `activeContext.md`. (5) Commit trailers follow `/home/claude/orch/IMPL-UX.md` (`Co-Authored-By: Claude Opus 5.5`); T-005 to T-007 were first committed with another model name and rewritten before this commit.

### T-009 — Fix D5: a card focused under the drawer scrolls clear (compile 0019 D5, AC-022 V1)

- **Covers:** AC-005, AC-022 (V1); §6.1 Place, §9 "Drawer shown, a covered card … gets focus"
- **Do:** `areas/SpecBoard.tsx` `onFocus`: while the drawer is shown (`drawer` and a selection), a card or a
  control inside a card that receives focus calls `target.scrollIntoView({ block: 'nearest', inline: 'nearest' })`
  (Chromium's focus scrolling ignores `scroll-padding` for an element already inside the scrollport; this call
  honours it — orchestrator harness: `scrollLeft` 0 → 111). Guard `typeof scrollIntoView === 'function'` (jsdom
  has none). Test in `detail/SidePanel.test.tsx` (stubbed `scrollIntoView` and `matchMedia`): the card and its
  Copy button each get one call with exactly those options, on the focused element; no call without the drawer
  match, none without a selection.
- **Verify:** `npx vitest run src/webview/detail/SidePanel.test.tsx` red (no call), then green; gates 1–5;
  a mutant on a scratch copy (call removed; drawer condition dropped) dies; layout: AC-022 round 2 (orchestrator)
- [x] **Verified (T-009):** 2026-11-18 — red: `npx vitest run src/webview/detail/SidePanel.test.tsx` failed 1 of 13 (no `scrollIntoView` call; the three controls pass), green after the change (13). Mutants on a scratch copy (`/tmp/fs50/mut.py`), all killed: `drawer &&` dropped (control "query not matching" dies), options removed (`scrollIntoView()`), whole condition `false` (main test dies). Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2104 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green. The layout effect itself (scrollLeft 0 → 111) is AC-022 round 2 by the orchestrator (jsdom has no layout).
- **Notes:** The call sits in `SpecBoard.onFocus` for a card and for any control inside a card (`keyOfTarget`), guarded by `typeof scrollIntoView === 'function'` because jsdom has none (a test pins that a missing function breaks nothing). The Board's `data-drawer` padding stays (C43).

### T-010 — Fix D6: the Overview takes the width left of the drawer (PD-066; compile 0019 D6, AC-022 V2)

- **Covers:** AC-005, AC-022 (V2); §6.1 Place, §9; WCAG 2.2 SC 2.4.11
- **Do:** Proxy decision PD-066 in `docs/product/product-decisions.md` (newest PD). While the drawer is shown
  (panel < 900 px and a spec selected) the Overview's content takes the width left of the drawer: `Overview.tsx`
  sets `data-drawer` on `.overview` from `useDrawer()` and the selection; `main.css` `.overview[data-drawer]`
  gets `padding-inline-end: min(400px, 100%)` (percentage of the frame's width), and the two-line row layout of
  0018 T-013 (the rules of `@media (max-width: 720px)` for `.ov-row-item`, `.ov-row`, `.ov-title`, `.ov-status`)
  repeated under `.overview[data-drawer]`, because a media query on the viewport alone does not trigger at 800 px.
  Spec 0019 §6.1 Place, §9 and AC-005 amended ("the Board's content keeps its width; the Overview's content
  takes the width left of the drawer (PD-066)"). Tests: `SidePanel.test.tsx` (the Overview carries the drawer
  mark exactly while a spec is selected and the query matches, follows the change event); `webviewCss.test.ts`
  (the end padding of `.overview[data-drawer]`, the two-line rules, no new media rule on `.overview`).
- **Verify:** `npx vitest run src/webview/detail/SidePanel.test.tsx src/adapters/node/webviewCss.test.ts` red, then
  green; gates 1–5; mutants (mark dropped, padding rule removed) die; layout: AC-022 round 2 (orchestrator)
- [x] **Verified (T-010):** 2026-11-18 — red: `npx vitest run src/webview/detail/SidePanel.test.tsx src/adapters/node/webviewCss.test.ts` failed 4 new tests (no drawer mark on the Overview, no `.overview[data-drawer]` rules), green after the change (64). Mutants on a scratch copy, all killed: `drawer &&` dropped (Overview marked at 900 px and up), `selection !== undefined` dropped (marked without a selection), end padding `0`, `flex-wrap: nowrap` in the marked row rule. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2108 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green. Layout (the Copy button visible left of the drawer at 800 px, the figures line) is AC-022 round 2 by the orchestrator; jsdom has no layout.
- **Notes:** (1) PD-066 is appended to `docs/product/product-decisions.md` as the newest entry (reason: SC 2.4.11, no scroll room in the Overview); AC-024's sentence "the PD register shall be unedited" now reads "no edit of an existing entry (PD-066 … the one new entry)", and §5's intro says so; the plan's check becomes a diff against the Baseline that shows only the appended row. (2) The padding sits on `.overview[data-drawer]` (the Overview root, which fills the scroll container `.area-content`); a percentage padding resolves against the frame's width, so a panel narrower than 400 px loses nothing. (3) Amended: 0019 §6.1 Place, §9 row 'Drawer shown …', AC-005, AC-022; README line 31 and `docs/release-checklist.md` (AC-022 item) say the same. (4) The two-line rules of the 720 px media block are repeated under `.overview[data-drawer]`; a test compares every property of the four media selectors with the marked ones, so the two cannot drift. (5) The 0018 AC-015 guard (no media rule on `.columns?`) and the 0019 AC-005 guard (the only media rule is `.side-panel`) hold unchanged.

### T-011 — Fix D1 and G6: focus stays on the same link when an earlier entry leaves (AC-020)

- **Covers:** AC-020 (focus kept where the control still exists, scroll container kept)
- **Do:** Identity keys: Problems by `reason` + file + line, open criteria by `id ?? text` + file + line, each with
  an occurrence counter so equal entries stay distinct (`detail/identityKeys.ts`); no index in a key.
  Test in `detail/Close.test.tsx`: a detail with Problems [A, B] and open criteria [AC-001, AC-002, AC-003],
  focus the AC-003 link and the second Problem, send a CHANGED view of the same spec (the first entries removed):
  focus is still on the same link element, the side panel, the detail frame and the heading are the same nodes.
- **Verify:** `npx vitest run src/webview/detail` red (focus on the heading), then green; gates 1–5; mutant
  (index key restored; detail remounted on every change) dies
- [x] **Verified (T-011):** 2026-11-18 — red: `npx vitest run src/webview/detail/Close.test.tsx` failed 2 of 18 new tests (focus fell to the heading, the focused link was remounted; the "heading when the control itself leaves" and the "two equal entries" controls pass), green after the change (18; `src/webview` 364 passed). Mutants on a scratch copy, all killed: Problems key back to `index|reason`, criteria key back to `index|id`, the side panel's `SpecDetail` remounted on every change (`key={JSON.stringify(detail)}`, the surviving M46 of the compile), the occurrence counter dropped ("two equal entries" dies on the duplicate-key warning). Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2112 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green.
- **Notes:** `detail/identityKeys.ts` (`identityKeys(items, identity)`) appends an occurrence number, so two equal entries stay distinct; Problem identity = reason + file + line, open criterion = `id ?? text` + file + line. A line that moves is a new identity and takes the heading (a changed target is not the same control). History entries are not focusable and keep their index key.

### T-012 — Fix D2: the Files "Plan" row lists only the plan beside this spec (AC-014)

- **Covers:** AC-014; §9 "Duplicated stem → its own files"
- **Do:** `core/board/situation.ts` `filesOf`: a sibling plan only when it lies in the spec's own folder (same
  directory of the key); the archived plans and return notes follow the spec's stem as before. Test in
  `core/board/detail.test.ts`: a memory project with `.specs/active/0005-e.md`, `.specs/active/0005-e.plan.md`,
  `.specs/backlog/0005-e.md` — the backlog entry shows Spec only, the active one Spec and Plan.
- **Verify:** `npx vitest run src/core/board` red, then green; gates 1–4; mutant (folder test dropped) dies
- [x] **Verified (T-012):** 2026-11-18 — red: `npx vitest run src/core/board/detail.test.ts` failed 1 of 38 (the backlog entry listed `.specs/active/0005-e.plan.md` as its Plan), green after the change (`src/core/board` 230 passed). Mutant on a scratch copy killed: the `siblingPlanKey` condition removed. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2113 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green.
- **Notes:** `filesOf` shows a sibling plan only when its key is the one beside this spec (`siblingPlanKey(spec.key)`, the function the lifecycle uses for `entry.plan` of a non-Done entry); archived plans and return notes still follow the stem/number (a reactivated spec legitimately lists its earlier archived plans, 0019 §6.2 row 5).

### T-013 — Fix F1: the opener is forgotten on close and for another spec (AC-003)

- **Covers:** AC-003 ("the card or Overview row that opened it"), the entry point of 0020's tree
- **Do:** `detail/opener.ts` keeps the stem with the element; `currentOpener(stem)` returns it only for the same
  spec; `focusAfterClose` clears it. Test in `Close.test.tsx` through the host selection path: open 0003 from its
  card, close, the host selects 0007 (`selectSpec`, no opener), close: focus goes to the card of 0007.
- **Verify:** `npx vitest run src/webview/detail` red, then green; gates 1–5; mutant (stem check dropped) dies
- [x] **Verified (T-013):** 2026-11-18 — red on a scratch copy of the head (`git archive HEAD | tar -x -C /tmp/fs50/red`, new `Close.test.tsx` copied in): `npx vitest run src/webview/detail/Close.test.tsx` failed the new F1 test (focus on the card of 0003, the stale opener); green after the change (20 tests). Mutants on a scratch copy, all killed: stem check dropped in `currentOpener`, `forgetOpener()` removed from `focusAfterClose` (needed a second test with a duplicated stem: the opener is the second card, a later host selection of the same spec must focus the first). Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2115 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green.
- **Notes:** `detail/opener.ts` keeps the element with the stem it opened (`rememberOpener(element, stem)`, `currentOpener(stem)`, `forgetOpener()`); `focusAfterClose` reads it for the closing spec and forgets it. The host selection path is exercised the way 0020's tree will use it: a shell event with a selection, no `useOpenSpec`.

### T-014 — Fix F3: the drawer never extends past the frame's left edge (AC-005)

- **Covers:** AC-005; §6.1 Place ("min(400 px, panel width)")
- **Do:** `main.css`: the drawer's width and the board's end and scroll padding are relative to the frame, not to
  the window (`min(400px, 100%)`), so a panel under 432 px (16 px padding each side) is never overrun. CSS guard
  in `webviewCss.test.ts` (no `vw` unit in the drawer rules; the three values read `min(400px, 100%)`).
- **Verify:** `npx vitest run src/adapters/node/webviewCss.test.ts` red, then green; gates 1–5; mutant (`100vw`
  restored) dies
- [x] **Verified (T-014):** 2026-11-18 — red: `npx vitest run src/adapters/node/webviewCss.test.ts` failed 3 of 50 (the drawer width and both paddings still `min(400px, 100vw)`, the new no-`vw` guard), green after the change (50). Mutants on a scratch copy, all killed: drawer width back to `100vw`, board scroll padding back to `100vw`, Overview end padding to `100vw`. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2116 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green. Layout: AC-022 round 2 (orchestrator).
- **Notes:** The drawer's `width`, the board's `padding-inline-end` and `scroll-padding-inline-end` and the Overview's end padding (T-010) are `min(400px, 100%)`: `100%` is the width of the frame (`.area-frame` is the containing block of the absolute panel), so the drawer ends at the frame's left edge under 432 px. The two AC-005 tests changed their expected value and one title ("… at min(400px, 100%) of the frame"); neither title exists at the Baseline.

### T-015 — Close the test gaps G1–G5, G7 and F4 of the compile

- **Covers:** AC-003 (G1, G2), AC-007 (G3, G4), AC-019 (G5, F2), AC-018 (G7), AC-009/§8 (F4)
- **Do:** Tests only (plus the F2 fix if G5 shows it): G1 `Close.test.tsx` the opener is a second element of the
  same spec (focus returns to it, not to the first card); G2 close in the Overview without an opener focuses the
  spec's first Overview row; G3 Overview rows of the selected spec carry `aria-current="true"`, others not; G4
  `webviewCss.test.ts` the selection background and border on `.card[aria-current="true"]` and
  `.ov-row[aria-current="true"]`; G5 `SpecDetail.test.tsx` link A succeeds, link B gets not-found for its key: A
  keeps its text (F2: a result marks only the link that was activated after it arrived); G7 `openFile.test.ts`
  `createOpenFile` takes `source` and `editor` and nothing else (like 0015's `boardRequests` test); F4 the visible
  "Criteria" row label asserted literally.
- **Verify:** each test green on the head, then its mutant on a scratch copy dies: `focus.ts` opener branch,
  `focus.ts` Overview selector, `SpecRow` `current`, the CSS rule background, `FileLink` key match, `createOpenFile`
  dependency, `CRITERIA_LABEL`; gates 1–5
- [x] **Verified (T-015):** 2026-11-18 — tests added (10): G1 and G2 in `detail/Close.test.tsx`, G3 in `detail/SidePanel.test.tsx` (shared view `sharedSpecView` in `shared/protocol/testing/overviewSample.ts`), G4 in `adapters/node/webviewCss.test.ts`, G5 and two F2 tests and F4 in `detail/SpecDetail.test.tsx`, two G7 tests in `core/board/openFile.test.ts`. All green on the head except F2 (red: the earlier link read the result too; fixed in `ui/FileLink.tsx`). Mutants on a scratch copy (`/tmp/fs50/mut.py`), all killed: G1 `if (false)` for the opener branch in `focus.ts` (M05; the G1 test and the F1 test die), G2 selector reduced to `'[data-spec-stem]'` (M06), G3 `current={false}` in `SpecRow` (M15), G4 `background: transparent` and `border-color: transparent` of the selection rule (M16), G5 key match dropped (M43; first run SURVIVED because the per-link token already hid the effect, so the fix keeps a per-key latest activation and a test for out-of-order results), F2 per-key latest check dropped, G7 a `trusted` dependency added to `createOpenFile`, F4 `CRITERIA_LABEL` → 'Verified'. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2126 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green.
- **Notes:** (1) F2 is not the cause of G5 (G5 was only a missing test), but the same area: `FileLink` kept one activation per link and a not-found result marked every link of that file that had been activated. Now a module map holds the latest activation per file key; a link reads a result only while it is that latest activation and the result's key is its own (AC-019: the activated link). A link to another file is never marked. (2) G7 is a structural test (type of the `deps` keys, no word trust, writer, restricted, reader in `openFile.ts` and `adapters/vscode/editor.ts`, arity) plus a repeat-call test, as 0015's `boardRequests` test is behavioural only. (3) The G1 case needed a duplicated stem (two cards of one spec) because one spec has one card per Board.

### T-016 — Docs: audit rows, 0018 notes, traceability, memory, F8 and F9

- **Covers:** AC-023, AC-024, AC-015 (F9 wording); compile §8 items 1–5
- **Do:** Test-title audit: the 8 absent `describe` titles with their homes (compile D3); the 0018 notes at §2 goal and
  AC-031 (D4); fix the T-008 `Verified:` note count; traceability rows (Windows `npm test` 28+1+1+1, unit 2096/7 + 12,
  CI run 44261156444 green at `fd74ec7`; AC-014, AC-020, AC-022, AC-024 state); 0019 §6.2 row 7 one sentence for the
  not-available history (F9); the statement named in the notes under 0005 AC-007, AC-008 and 0006 AC-014 (F8);
  `src/shared/protocol/layout.ts` named in `.architecture/webview.md`; `activeContext.md`; re-run of the test-title audit
  for the titles of this round.
- **Verify:** `python3 -I` audit script (Baseline `20792ca` vs head) lists only titles homed in the plan; `grep -c`
  on the notes; gates 1–5 once more
- [x] **Verified (T-016):** 2026-11-18 — docs. Audit: `python3 -I /tmp/fs50/titles.py <git archive 20792ca> <head>` lists ABSENT 48 (40 test titles + the 8 `describe` titles now in the table), DECREASED 0, MOVED 0; the titles of T-009…T-015 are new, none renames a Baseline title. `grep -c "Amended by 0019"`: 0005 4, 0006 2, 0007 16, 0013 7, 0015 2, 0016 5, 0017 2, 0018 5; `git diff 20792ca -- docs/product/product-decisions.md`: one added line (PD-066), none removed. Gates: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 2126 passed + 3 skipped (+12 timing), `npm run compile`, `npm run compile-tests` green.
- **Notes:** (1) D4: the 0018 notes sit under the §2 goal sentence and under AC-031 ("visible without horizontal scrolling" holds with no spec selected; AC-031 already says so inline since `f6d53c5`). (2) F8: the notes under 0005 AC-007, AC-008 and 0006 AC-014 now begin with their statement's ID. (3) F9: 0019 §6.2 row 7 says the not-available text is a plain, always visible section and that AC-015's "collapsed" applies to a history with entries. (4) The T-008 `Verified:` claims ("one per §5 statement", 40 absent titles) are corrected in place. (5) `.architecture/webview.md` names `src/shared/protocol/layout.ts` and the `data-drawer` marks; `activeContext.md`, `systemPatterns.md`, README line 31, the release checklist and the CHANGELOG follow PD-066. (6) AC-024 text allows the one appended PD-066 row; the check is a diff against the Baseline that shows only that row. (7) Not done on purpose: `tidy`/`splitCells` stay (note only), the README's old Spec Explorer screenshot stays until 0020, nothing of 0020 touched except the stale "unplanned" in `activeContext.md`.

## Test-title audit

Method (0018's): `/tmp/audit-0019/titles.py` reads every `describe`/`it`/`test`/`suite` literal of each `.ts`/`.tsx`
under `src` (`src/test/**` and `testing/*.ts` included) at the Baseline 20792ca (`git archive`) and at the
head, 2026-11-18 (T-008, head `fd74ec7`: Baseline 2,077 titles, 1,728 tests; head 2,167 titles, 1,801 tests;
re-run in T-016 on the fix head: Baseline 2,079 titles by the compile's script, head 2,199). Every Baseline title
that is absent at the head is listed: 40 test titles and 8 `describe` titles (the compile S48 found the 8 missing,
D3), 48 in all; no title has a lower count, none moved out of its file; every other title exists at the head and
passes (`npm run test:unit`: 2,126 passed, 3 skipped, +12 timing). The titles of T-009…T-015 are new or renamed
0019 titles that do not exist at the Baseline, so no row is needed for them (T-016 re-run: still 48 absent).
Retargeted tests that kept their title are not listed. The PD register carries no edit of an existing entry:
`git diff 20792ca -- docs/product/product-decisions.md` shows the one appended row PD-066 and no removed line.

| Absent title (file) | Voided or replaced by |
| --- | --- |
| `0013 AC-013: sends openFile with the key of the section's file and no line` (SpecDetail.test) | Void: §5 0013 AC-013; replaced by AC-017 (key and line) |
| `0013 AC-014, AC-015: the detail of this repo's spec 0002 (fixture studio-0002) …` (webviewBundle.test) | AC-010 on `studio-0015` ("0019 AC-010 … fixture studio-0015", detail.test and bundle); §5 0013 AC-015 void, AC-014's renderer stays for reasons |
| `AC-003: toggles, section Open file buttons and related links are native buttons in the Tab order` | AC-004, AC-021; §5 0013 AC-003 |
| `AC-006: each Problem shows with the warning icon directly below Next step and above Overview` | Kept as "… above Progress" (AC-009 order) |
| `AC-006: the Verification section shows the same criteria numbers as the card` (detail.test) | AC-012; §5 0007 AC-006 ("AC-006 (0019 AC-012): the Criteria row shows the same numbers as the card") |
| `AC-009: each ID appears once in a requirement, a criterion and a stage; the rest of the delivered text is kept` | Void: §5 0007 AC-009 (no text in the detail), AC-010 |
| `AC-009: every FR- requirement; none gives an empty list and "Open file" stays on the spec` | Void: §5 0007 AC-009 |
| `AC-009: every criterion with its full text, illustration, uncertain and struck flags, at its line` | Void: §5 0007 AC-009; the line per ID is AC-013, AC-017 |
| `AC-010: Overview, Plan, Verification and Related carry their open targets; runs and history carry none` | AC-017, AC-014; §5 0007 AC-010 section list |
| `AC-010: no plan gives no plan target and no steps ("No plan yet"), and no verification target` | AC-011 (no plan: "No plan yet", no Steps or Criteria row) |
| `AC-010: plan steps carry tick, struck mark and their Verified text` | Void: §5 0007 AC-010 section list; AC-010 (no Verified text) |
| `AC-010: the Overview header lines are a two-column grid …` (webviewCss.test) | Void: §5 0013 §3.4 (no header lines) |
| `AC-010: the Overview shows a derived state with its sentence and rule ID` | AC-009 ("a derived state shows its chip tooltip, the sentence as hidden text …"); §5 0016 AC-012 detail part |
| `AC-012: all sections start expanded; a collapsed section stays collapsed after another spec is selected` | AC-015 ("keeps its state across another spec …"); §5 0013 AC-012 |
| `AC-012: the heading holds one toggle button; activating it hides the body and sets aria-expanded; again shows it` | AC-015 ("starts collapsed under the heading "Status history (n)" and shows its entries when expanded"); §5 0013 AC-012 |
| `AC-013: no Open file per requirement, criterion or diagnostic; the Open file of a section sits in its heading row` | Void: §5 0013 AC-013 |
| `AC-016: AC-001 of 0003 in fs170-brownfield-mixed keeps its bold title and loses the ID and the stray marker` (detail.test) | Void: §5 0016 AC-016 (no criterion text in the detail); AC-013 (plain short title) |
| `AC-016: a criterion whose title is bold shows it in <strong> with no asterisk left` (SpecDetail.test) | Void: §5 0016 AC-016; AC-013 |
| `Overview shows header lines, state, rule, persistence, priority and the format notes behind a toggle` | AC-009 (header, no header lines), AC-015 (format notes folded); §5 0016 §6.2 detail row |
| `Overview shows the needs, no readiness checklist, and the successor of a deprecated spec` | AC-011 (needs in Progress), AC-009 ("a Deprecated spec shows the marker and its successor text") |
| `Plan shows stages, steps with tick state, struck and the Verified text` | Void: §5 0007 §6.4 table (A-007); AC-011, AC-012 (Steps row, next open step) |
| `Related shows the artifacts, and a hint when there are none` | AC-014 (Files: "lists an archived plan and a return note by their file names, nothing for an absent file") |
| `Verification shows the counts, the summary, the criteria progress and no verdict line` | AC-012 (Criteria row); §5 0007 §6.4 |
| `a Now row sends Spec Explorer with that spec; a row of a duplicated stem carries its path` (Drilldown.test) | AC-001 ("AC-001: a Now row sends select with that spec; …"); §5 0006 BR-08, AC-014; 0018 AC-006 |
| `a click and Enter send the navigation request to Spec Explorer with the stem` (SpecBoard.test) | AC-001 ("AC-001: a click and Enter send the select request …"); §5 0007 FR-05, AC-008 |
| `a new detail view clears the message` | AC-019 ("showing another spec restores the text") |
| `activating the row outside Copy sends the request of 0006 AC-014` (Sections.test) | AC-001 ("AC-001: activating the row outside Copy sends select, not navigate"); §5 0006 AC-014; 0018 AC-006 |
| `an activity entry of a current spec sends Spec Explorer with that spec` (Drilldown.test) | AC-001 ("AC-001: an activity entry of a current spec sends select …") |
| `detail header: number chip, title, state chip and one Open file for the spec` | AC-009 ("the header holds the number, the title, one state chip and no Open file button") |
| `each header line is one wrapper holding its label and its value …` | Void: §5 0013 §3.4 (no header lines) |
| `is never offered for the status history or No plan yet` | AC-017 ("needs, history entries and texts send nothing"); §5 0007 §6.4 "Open file" bullet |
| `is offered for the spec, the plan, related artifacts, items and diagnostics` | AC-017, AC-010 ("the next open step, an open criterion and a file send their key and line") |
| `lists the labelled status history and no run` | AC-015 ("lists the labelled status history and no run once expanded") |
| `renders the update fast enough: 120 requirements, 200 criteria, 150 steps, 100 history entries` (SpecDetail.timing) | AC-020 (timing of the picture's update, same budget) |
| `says so and still offers Open file on the spec when there are no requirements` | Void: §5 0007 AC-009 |
| `shows each criterion with its text, its Given/When/Then and both flags` | Void: §5 0007 AC-009 |
| `shows each requirement with its id and text` | Void: §5 0007 AC-009 |
| `shows the heading of the spec and the sections in order, each under a heading` | AC-009 ("shows Next step, Problems, Progress, Files, Format notes and Status history in this order") |
| `shows the not-found text in the status line of the section that holds the file` | AC-019 ("the activated link reads "File not found: <path>" …") |
| `the buttons are keyboard-operable` | AC-004, AC-017 ("every link is a native button in the Tab order and works with Enter and with Space") |
| `0013 AC-012, AC-013, AC-010: collapsible sections, detail header, Overview rules` (SpecDetail.test, group) | Group void: its tests are listed above or void; §5 0013 AC-012, AC-013, §3.4 |
| `0015 AC-012: Status history` (SpecDetail.test, group) | Renamed "0015 AC-012, 0019 AC-015: Status history" (AC-015; §5 0015 AC-012) |
| `0016 AC-006, AC-007, AC-016, AC-022: Problems, format notes and the title emphasis` (SpecDetail.test, group) | Renamed "0016 AC-006, AC-007, AC-022: Problems, format notes"; §5 0016 AC-016 void |
| `AC-009: criteria and requirements as delivered` (SpecDetail.test, group) | Group void: §5 0007 AC-009 (its three tests are listed above) |
| `AC-010: Open file exactly where a file is named` (SpecDetail.test, group) | "0019 AC-017: every link opens its file at its line" (AC-017, AC-019) |
| `AC-010: the Overview header lines` (SpecDetail.test, group) | Group void: §5 0013 §3.4 (A-007; no header lines) |
| `AC-010: the seven sections` (SpecDetail.test, group) | "0019 AC-009: the situation picture in its order" (§5 0007 §6.4) |
| `AC-019: the detail is in the DOM within 500 ms of the event (PD-047; a large spec)` (SpecDetail.timing, group) | "0019 AC-020: the situation picture is in the DOM within 500 ms of the event (PD-047; a large spec)" |

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-005 | `webview/{App,detail/useOpenSpec,board/Card,areas/SpecBoard,areas/overview/*}.tsx` | `detail/SidePanel.test.tsx`, `board/SpecBoard.test.tsx`, `board/Keyboard.test.tsx`, `areas/overview/{Drilldown,Sections}.test.tsx` | verified |
| AC-002 | T-005 | `webview/App.tsx`, `detail/SidePanel.tsx` | `detail/SidePanel.test.tsx`, `core/shell/shellService.navigation.test.ts` | verified |
| AC-003 | T-006, T-013, T-015 | `shared/protocol/messages.ts`, `core/shell/shellService.ts`, `webview/{client,shell}`, `detail/{DetailFrame,focus,opener}` | `detail/Close.test.tsx` (incl. G1, G2, F1), `shared/protocol/messages.test.ts`, `core/shell/{messageRouter,shellService.navigation}.test.ts` | verified |
| AC-004 | T-006 | `detail/{DetailFrame,CloseButton,focus,SpecDetail}.tsx` | `detail/Close.test.tsx`, `detail/SpecDetail.test.tsx` | verified |
| AC-005 | T-007, T-009, T-010, T-014 | `webview/main.css`, `detail/drawer.ts`, `shared/protocol/layout.ts`, `areas/SpecBoard.tsx` (focus scrolls clear), `areas/overview/Overview.tsx` (PD-066) | `adapters/node/webviewCss.test.ts`, `detail/SidePanel.test.tsx` | verified (CSS guard, unit); layout by AC-022 round 2 |
| AC-006 | T-005 | `webview/App.tsx`, `detail/{focus,SidePanel}` | `detail/SidePanel.test.tsx`, `detail/Close.test.tsx` | verified |
| AC-007 | T-005, T-015, T-017 | `webview/detail/selected.ts`, `board/Card.tsx`, `areas/overview/SpecRow.tsx`, `webview/main.css` | `detail/SidePanel.test.tsx` (cards, Overview rows G3), `adapters/node/webviewCss.test.ts` (G4, T-017 inset shadow of the selected row) | verified (High Contrast marker fixed by T-017; rendered check in AC-022) |
| AC-008 | T-005, T-006 | `areas/SpecExplorer.tsx`, `detail/SpecDetail.tsx` | `detail/Close.test.tsx`, `detail/SidePanel.test.tsx` | verified |
| AC-009 | T-002, T-003, T-004 | `core/board/detail.ts`, `shared/protocol/detail.ts`, `webview/detail/SpecDetail.tsx` | `core/board/detail.test.ts`, `detail/SpecDetail.test.tsx`, `shared/protocol/detail.test.ts` | verified |
| AC-010 | T-003, T-004 | `webview/detail/*`, `core/board/detail.ts` | `detail/SpecDetail.test.tsx`, `core/board/detail.test.ts`, `adapters/node/webviewBundle.test.ts`, `webview/userLanguage.test.tsx` | verified |
| AC-011 | T-002 | `core/board/situation.ts`, `detail/Progress.tsx` | `core/board/detail.test.ts`, `detail/SpecDetail.test.tsx` | verified |
| AC-012 | T-002 | `core/board/situation.ts`, `detail/Progress.tsx` | `core/board/{detail,boardService}.test.ts`, `detail/SpecDetail.test.tsx` | verified |
| AC-013 | T-002 | `core/board/shortTitle.ts` | `core/board/shortTitle.test.ts`, `core/board/detail.test.ts` | verified |
| AC-014 | T-002, T-012 | `core/board/situation.ts` (`filesOf`) | `core/board/detail.test.ts` (incl. the duplicated stem, D2), `detail/SpecDetail.test.tsx` | verified |
| AC-015 | T-004 | `detail/{DetailSection,sectionMemory,SpecDetail}.tsx`, `ui/FormatNotes.tsx` | `detail/SpecDetail.test.tsx` | verified |
| AC-016 | T-002 | `core/board/detail.ts`, `shared/protocol/detail.ts` | `core/board/detail.test.ts`, `shared/protocol/detail.test.ts` | verified |
| AC-017 | T-003 | `ui/FileLink.tsx`, `core/board/openFile.ts` | `detail/SpecDetail.test.tsx`, `core/board/boardService.test.ts` | verified |
| AC-018 | T-001, T-015 | `adapters/vscode/{editor,commands}.ts`, `studioPanel.ts`, `extension.ts` | `adapters/vscode/editor.test.ts`, `core/shell/shellService.navigation.test.ts`, `core/board/openFile.test.ts` (no trust or writer, G7), host smoke `board.smoke`, `shell.smoke` | verified: unit; Windows `npm test` 28 + 1 + 1 + 1 and CI run 44261156444, both green at `fd74ec7` (orchestrator, STATE.md) |
| AC-019 | T-003, T-015 | `ui/FileLink.tsx` | `detail/SpecDetail.test.tsx` (incl. G5, F2) | verified |
| AC-020 | T-003, T-006, T-011 | `detail/{DetailFrame,SpecDetail,Progress,identityKeys}.tsx`, `core/board/boardService.ts` | `detail/Close.test.tsx` (incl. the changed update, G6), `detail/SpecDetail.timing.test.tsx`, `core/board/boardService.timing.test.ts` | verified |
| AC-021 | T-007 | `webview/main.css` | `adapters/node/webviewCss.test.ts`, `webview/focusIndicator.test.tsx` | verified |
| AC-022 | T-008, T-009, T-010, T-014, T-017 | `docs/release-checklist.md` item; fixes in `areas/SpecBoard.tsx`, `areas/overview/Overview.tsx`, `webview/main.css` | manual: round 1 (orchestrator, `fd74ec7`) passed the height and failed V1 and V2; round 2 after T-009, T-010, T-014 by the orchestrator; AC-022 rounds 1–3 by the orchestrator: height 728 px; V1/V2 pass at 98472bf; HC row marker fixed by T-017; real window pending (Gregor or his delegate) | open |
| AC-023 | T-008, T-016 | `/tmp/audit-0019/titles.py` (throwaway) | section "Test-title audit" above (48 absent titles, all homed); `npm run test:unit`; Windows unit 2096 passed, 7 skipped, +12 timing and `npm test` 28 + 1 + 1 + 1, CI run 44261156444, all green at `fd74ec7` | verified (unit, Windows, CI at `fd74ec7`; unit again at the fix head) |
| AC-024 | T-008, T-010, T-016 | `.specs/{done,active}/` notes | `grep -c "Amended by 0019"`: 0005 4, 0006 2, 0007 16, 0013 7, 0015 2, 0016 5, 0017 2, 0018 5 (the §5 row "0018 §2 goal, AC-031" has its two notes since T-016); the PD register: one appended row (PD-066), no edit of an existing entry | verified |

## Session handoff

- **Done so far:** T-001…T-017 verified, plan Done (the compile S48 verdict NOT READY is answered by T-009…T-016); spec
  stays `In Progress` until AC-022 round 2 and a fresh `/sdd-compile`.
- **Next action:** the orchestrator re-runs AC-022 (all six harness runs and the keyboard walk at 800 px, Board and
  Overview: a card focused under the drawer scrolls clear; every Overview row, its next step, Copy and the figures
  line stay visible left of the drawer), then `npm test` on Windows and CI at the fix head, a real window by Gregor
  (an ID opens the file beside the Studio at its line), then `/sdd-compile` in a fresh session.
- **Open decisions:** none; P-1…P-19 stand, PD-066 records the Overview under the drawer. Left as a note, not fixed:
  `tidy` and `splitCells` in `ui/inlineFormat.ts` have no caller left (T-004 Note 4); the old Spec Explorer screenshot in
  the README stays until 0020; 0020's files are not touched.
- **Baseline:** 20792ca (commit before the first step commit; backlog → active move done 2026-11-18)
- **Environment:** host smoke runs on Windows and CI only (VS Code download blocked here). Commit messages end with
  `Co-Authored-By: <model of the session>` and `Claude-Session: https://claude.ai/code/session_01Gjx4ug55tnrs2YJYnrBwo6`
  (T-001…T-008: Claude Opus 5.5; T-009…T-017: Claude Sonnet 5.5).
