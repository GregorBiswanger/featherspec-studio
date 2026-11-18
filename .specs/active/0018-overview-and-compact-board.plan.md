# Plan — Overview and a Compact Board

**Spec:** [0018-overview-and-compact-board.md](0018-overview-and-compact-board.md)
**Status:** In Progress
**Last updated:** 2026-11-18
**Current step:** T-002

## Approach

Three vertical tracks, each slice test, core, contract and webview together, so the tree is green
after every step. First the frame (T-001): area IDs `overview`/`board`, the area and Refresh
commands, the remembered area, the project name once with its tooltip and no `▸` — every
manifest, host-test and remembered-state rename sits in this one step. Then the Overview (T-002…
T-004): the code names follow the UI (`core/overview`, `areas/overview`, `protocol/overview.ts`,
event `overview`), Now and Up next first beside the old parts, then Problems and the figures line
replace header, tiles and *Needs attention*, then Activity collapsed with its state in the host.
Then the Board (T-005…T-007): narrow strips, widths and the filter chip; Done collapsed and
remembered in `workspaceState`; the three-row card with a date from the plan's `Last updated:`
line. Last the §5 notes, product docs and scans (T-008) and the test-title audit with the
architecture and Memory Bank sync (T-009). 0019's side panel and 0020's tree are not built: rows
and cards still navigate to Spec Explorer, and the panel keeps three areas. Files this task did not
create are moved or deleted only where a step names them (Gregor delegated, PD-058). Test review
once per stage from the tests named in each `Do:` (`AGENTS.md` *TDD*). Memory Bank:
`techContext.md`, `systemPatterns.md`, `activeContext.md` (T-009; `activeContext.md` at each stage end).

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile` (T-001, T-002, T-003,
T-004, T-006, T-009) · `npm run compile-tests` (T-001, T-002, T-003, T-006, T-009: the host smoke
compiles). Pre-done gate on Windows and CI: `npm test`.

## Research

- **Survey (2026-11-18, at `fbdab51`, 0016 and 0017 implemented; the 0017 fix session's edits to
  `main.css`, card-head and Copy tests land before T-001 and change no structure used here).**
  - Areas: `AREA_IDS`, `AREAS`, `DEFAULT_AREA` in `src/shared/protocol/areas.ts`; maps keyed by
    `AreaId`: `AREA_COMMANDS` (`src/adapters/vscode/commands.ts`), `AREA_ICONS`
    (`src/core/shell/treeModel.ts`), `AREA_PATHS` (`src/webview/board/icons.tsx`),
    `AREA_COMPONENTS` (`src/webview/areas/registry.tsx`); area literals in
    `areas/missionControl/requests.ts` and `core/copyNextStep/testing/entryWorld.ts`. Tree labels
    come from `AREAS`. `parseUiMemory` rejects an unknown area and drops the whole memory, so AC-002
    holds by construction once the IDs change. `PROTOCOL_VERSION = 1` (`envelope.ts`; asserted in
    `messages.test.ts`).
  - Commands: `featherspec-studio.rescan` → `ShellService.rescan` (re-read only, nothing without a
    project); `featherspec-studio.refreshDiscovery` → `controller.refresh` (string literal in
    `extension.ts`); `runAction('refresh')` = guarded discovery, `'retry'` = guarded discovery and
    re-read (S4 while running); `repository.rescan()` is a no-op without a project. The S2 welcome
    links `shellAction refresh`.
  - Mission Control: `buildMissionControlView` → `{ header, specs, attention, activity }` under a
    strict `exactly()` guard. Header: name and version from discovery, `updatedAt` =
    `source.updatedAt()` (the repository's `readAt`), Problems and their stems
    (`projectFindings()` in `core/board/cards.ts` also feeds the board banner). Rows:
    `projectAttention()` with `stepView()`. `ACTIVITY_LIMIT` 10. The service computes only while
    listened to; `studioPanel.ts` subscribes on `adopt` and releases on `onDidDispose`, so the last
    listener leaving is the panel closing — the reset point for Activity's open state (P-5).
  - Panel: `studioPanel.ts` routes `deps.board.handlers` and `deps.service.handlers`, re-sends
    `shell`, `board`, `missionControl`, `detail` on `hello`; no `retainContextWhenHidden`.
    `App.tsx` shows `projectName` in `.studio-header`; `Header.tsx` repeats folder, version, time.
    `Navigation.tsx` renders `<span data-marker>▸</span>`.
  - Board: `arrangeBoard()` → `{ state, cards, hidden, emptyBeforeFilter }`; `.columns` is a grid
    `minmax(240px, 1fr)`, gap 8 px; `main` padding `12px 16px`; no global `box-sizing`.
    `moveFocus` skips columns with an empty list; `fallbackFocus` returns `undefined` when no card
    is left (the container gets focus). `boardUiState` (filter, sort) resets on `panelClosed`.
    `CardView.lastChangeMs` = newer mtime; `parsePlan` returns `lastUpdated` as a `HeaderField`
    (`<date>` is `placeholder`). `boardSetFilter` is sent only by the state checkboxes.
  - Texts: the 0016 IDs the spec cites match the code (T-01 `mcProblems`, T-02 `updatedText`, T-05
    `problemsBadgeText`, T-08 `derivedTooltip`, T-09 `DERIVED_SENTENCES`, T-11 `NEED_*`), so OP-001's
    re-alignment changes nothing.
  - Tests that name old IDs or texts: `shell.smoke` (`openMissionControl`, `openSpecBoard`,
    `rescan`, `refreshDiscovery`, area `specBoard`, tree labels), `discovery.smoke`
    (`refreshDiscovery`), `missionControl.smoke` (`api.missionControl()`), `manifest.test.ts`,
    `shellService.test.ts` ("Refresh runs discovery only…", "AC-029: Rescan Project"),
    `shellService.navigation.test.ts`, `App.test.tsx`, `treeModel.test.ts`, `messages.test.ts`,
    `webviewBundle.test.ts`, `userLanguage.test.tsx`, `states.test.tsx`, `webviewCss.test.ts` (0013
    AC-008 "240 px minimum", 0006 AC-022 `.mc-drill`), every file in both `missionControl` folders.
    Non-`.test` suites: `src/core/runtime/testing/contract*.ts`, `src/test/**`.
  - Path-scoped rule: `.claude/rules/ux-guidelines.md` `paths:` and its Copilot loader's `applyTo`
    name `src/core/missionControl/**`; P-1's move would leave them stale (T-002 moves the glob).
  - Survey and spec agree: §10's as-is notes hold at `fbdab51`; no spec defect. No `done/` spec
    becomes `Deprecated`: §5 amends 0001, 0005–0007, 0013 in place. No new dependency.
- **Checkpoint digest:** no question that only Gregor can answer; the open points stay as the spec
  states them (OP-002's proxies are carried, PD-064 records them in T-008). Proxy decisions below
  (Gregor delegated the UX-audit round: audit 05, 04 K-C, K-D, K-J, PD-058…PD-063,
  `.claude/rules/ux-guidelines.md`); Gregor reads them with the plan.
- **Proxy decisions.**
  - P-1 Code names follow the UI: `src/core/missionControl/` → `src/core/overview/`,
    `src/shared/protocol/missionControl.ts` → `overview.ts`, `src/webview/areas/missionControl/` →
    `src/webview/areas/overview/`, event `missionControl` → `overview`, test API `missionControl()` →
    `overview()`, `src/test/missionControl.smoke.test.ts` → `overview.smoke.test.ts`, CSS `.mc-*` →
    `.ov-*`. Plain `mv` (git sees the rename at commit), named in T-002 and T-003. Reason: the next
    agent reads the code by the names it sees in the UI (§10 suggestion).
  - P-2 `DerivedRule`, `isDerivedRule` move to `src/shared/protocol/board.ts` with
    `STATE_RULES` (Ready S-READY, Review S-REVIEW, Blocked S-BLOCKED), used by the column tooltip
    (B-6) and the core; the Overview contract names no rule any more.
  - P-3 F-1: `ShellView` gains optional `projectVersion` and `updatedAt` (the model read time, 0015
    AC-017's rule) while a project is active; the name's `title` is `FeatherSpec <version> ·
    <updatedText(updatedAt, now)>`. The name stays where it is (right end of the header row).
  - P-4 One `ShellService.refresh()`: discovery once, then the re-read once if a project is active
    after discovery. The command runs it unguarded (content kept, no S4); `runAction('refresh')` and
    `'retry'` run it guarded (S4). `rescan()` and both old commands go.
  - P-5 Activity's open state lives in the Overview service (host, like `boardUiState`), false at
    the first listener and reset when the last listener leaves; request `overviewSetActivity
    { open }`; the view carries `open`.
  - P-6 A Problems row's state text is the reasons as plain text (no inline formatting inside a
    button), joined by ` · `; a project-level line reads `<where>: <reason>`, as the board banner.
    The heading always sends the named set "Problems" with the rows' stems, also none (AC-007
    literally; the banner lists project-level Problems).
  - P-7 Progress text and "of which Deprecated: n": `title` plus `aria-describedby` to an element
    with the `hidden` attribute (accname 1.2 step 2A counts a directly referenced hidden node), so no
    visible element shows them.
  - P-8 `boardSetFilter`, its handler and `client.setBoardFilter` go with the checkboxes (B-4: a
    filter arrives only with a navigation request); `BoardService.setFilter` stays for the host test API.
  - P-9 `BoardColumn` gains `narrow?: 'empty' | 'filtered' | 'collapsed'` and `count`; collapsed
    Done carries `cards: []` and `count` = its cards, so `moveFocus` skips it unchanged. `BoardView`
    gains `doneToggle: 'show' | 'hide' | undefined` and `sortKeys`.
  - P-10 Done memory: `workspaceState` key `featherspec-studio.board`, value `{ v: 1, done:
    'expanded' | 'collapsed' }`; anything else reads collapsed; written only by a toggle (request
    `boardSetDone { expanded }`); `panelClosed` keeps it.
  - P-11 Widths by flexbox: `.columns` flex row, gap 8 px, `overflow-x: auto`; `.column`
    `box-sizing: border-box; flex: 1 1 0; min-width: 200px; max-width: 360px`;
    `.column[data-narrow]` `flex: 0 0 32px` with min and max 32 px; strip name `writing-mode:
    vertical-rl`; no `@media` rule for the board (B-2).
  - P-12 Card date `CardView.lastChange: { day: 'YYYY-MM-DD'; source: 'plan' | 'file' } |
    undefined`, computed in the host (`core/board/lastChange.ts`, local `Date` getters); L-3 in the
    board service over all cards; while it holds a `lastChange` sort is set to Number in the UI
    state too (the choice does not come back by itself).
  - P-13 Card tooltip `<number> <title>`, a line break, the description or `No summary`; the card's
    `aria-label` is `<number> <title>, <State>` with `aria-describedby` on row 2.
  - P-14 The equal-file-times fixture is an in-memory project (git keeps no mtimes); local dates are
    built with local `Date` constructors so the tests hold in every time zone.
  - P-15 README screenshots keep their files; headings and alt texts say Overview and Board; new
    screenshots come from the orchestrator's preview harness after 0018 (release-checklist item).
  - P-16 PD-064 records the spec's proxies A-002…A-011, A-013 and P-1…P-17 (OP-002), in T-008.
  - P-17 Layout split: jsdom and the stylesheet test decide `data-narrow`, how many columns are wide
    per fixture (AC-014), widths and the 640/1,240 px arithmetic (AC-015) and one-line rows (AC-006);
    visible-without-scrolling, six cards per wide column and legibility stay AC-031 (manual: the
    orchestrator's preview harness after T-009, verdict recorded in this plan; the real window is a
    release-checklist item). No step depends on the harness. Host smoke stays thin: renamed tests
    plus one Done test in `board.smoke`.
- [MDN `writing-mode`](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode): `vertical-rl`
  flows top to bottom; "Baseline: Widely available … since March 2017"; `sideways-*` arrived later,
  so P-11 uses `vertical-rl`. Retrieved 2026-11-18.
- [MDN, ratios of flex items](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Controlling_ratios_of_flex_items_along_the_main_axis):
  `flex: 1 1 0` with equal `flex-grow` gives equal widths (B-2's equal share). Retrieved 2026-11-18.
- [CSS Flexbox Level 1 §9.7](https://www.w3.org/TR/css-flexbox-1/#resolve-flexible-lengths): "Clamp
  each non-frozen item's target main size by its used min and max main sizes" — 200/360 px bound the
  share, the rest is redistributed. Retrieved 2026-11-18.
- [W3C accname 1.2](https://www.w3.org/TR/accname-1.2/) step 2A: a hidden node is skipped unless the
  node directly referenced by `aria-labelledby`/`aria-describedby` is hidden (P-7). Retrieved 2026-11-18.
- [WAI-ARIA APG, Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/): a `button` with
  `aria-expanded`; Enter and Space toggle (Done toggle, Activity heading). Retrieved 2026-11-18.
- [VS Code, Common Capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities):
  `workspaceState` — "VS Code manages the storage and will restore it when the same workspace is
  opened again" (P-10; stored by VS Code, not in a workspace folder). Retrieved 2026-11-18.

## Stages

1. T-001 — the frame: Overview and Board names, one Refresh, the project name once, no marker
2. T-002 → T-003 → T-004 — the Overview: Now and Up next; Problems and the figures line; Activity
3. T-005 → T-006 → T-007 — the Board: strips, widths, chip; Done remembered; three-row card and date
4. T-008 → T-009 — §5 notes, docs, scans; test-title audit, sync, final gates

No parallel stage: the Overview and Board steps share `messages.ts`, `client.ts`, `studioPanel.ts`,
`extension.ts`, `texts.ts`, `main.css` and their tests (`webviewCss`, `userLanguage`,
`webviewBundle`); a shared contract step first would cost more than the small steps save.

## Steps

### T-001 — The frame: names, one Refresh, the project name once, no marker

- **Covers:** AC-001 (manifest, area IDs, labels, purposes), AC-002, AC-025, AC-026, AC-027
- **Do:** `areas.ts`: IDs `overview`, `board`, `specExplorer`; titles `Overview`, `Board`; the
  Overview purpose of §7; `DEFAULT_AREA` `overview`. The keyed maps and literals follow
  (`AREA_COMMANDS` `openOverview`/`openBoard`, `AREA_ICONS`, `AREA_PATHS`, `registry.tsx`,
  `requests.ts`, `entryWorld.ts`); `PROTOCOL_VERSION` 2. Refresh per P-4: `REFRESH_COMMAND`
  replaces `RESCAN_COMMAND` in `commands.ts`; `extension.ts` registers it and drops
  `refreshDiscovery`; `package.json` commands per §6.4. Frame per P-3: `ShellView`/`isShellView`,
  `shellService.compute`, `App.tsx` `title`, `projectTooltip()` in `texts.ts`; `Header.tsx` keeps
  only the problem drill (gone in T-003); its name, version and time tests (0006 AC-017, 0016
  T-02) move to `App.test.tsx` as the tooltip. `Navigation.tsx` drops the `▸` span, CSS
  `.nav-item [data-marker]` goes. Tests (red first): `shellService.navigation.test.ts` — AC-002
  (remembered `missionControl` and `specBoard` with a selection → Overview, no selection; first open
  → Overview; titles naming Mission Control reworded); `shellService.test.ts` — AC-027 (command:
  discovery once then re-read once while active, discovery only while none, no S4; panel Refresh and
  Retry: S4, discovery then re-read), F-1 (view carries version and the read time); `App.test.tsx` —
  AC-025 (folder `alpha-project` once; tooltip `FeatherSpec 1.10.0 · Updated HH:MM`), AC-026 (no `▸`,
  no `[data-marker]`, `aria-current`); `webviewCss.test.ts` — current item 2 px bottom border and
  contrast active border; `manifest.test.ts` — AC-001 (exactly §6.4's right column with its titles,
  none of the left); `treeModel.test.ts`, `messages.test.ts` (version 2, IDs); host smoke `shell.smoke`
  (AC-005 with `openBoard`/`openOverview`, tree labels and command list, "AC-029: the Refresh
  command…"), `discovery.smoke` (`featherspec-studio.refresh`).
- **Verify:** `npx vitest run src/core/shell src/shared/protocol src/webview/App.test.tsx src/webview/areas src/adapters/vscode/manifest.test.ts src/adapters/node/webviewCss.test.ts` red, then green; gates 1–5; `npm run compile-tests`
- [x] **Verified (T-001):** 2026-11-18: renaming area IDs, `PROTOCOL_VERSION` 2 and the commands first turned 21 existing tests red (old IDs, versions, titles); the new 0018 tests (AC-001 manifest and IDs, AC-002 remembered `missionControl`/`specBoard`, AC-025 tooltip, AC-026, AC-027 command and panel actions, F-1) were written with the change, not run red separately (see Notes). Green: `npm run test:unit` 1883 passed, 3 skipped (Baseline 1875 + 3); timing 12 passed; eslint, both `tsc`, `npm run compile`, `npm run compile-tests` clean.
- **Notes:** Proxy: the new tests and the rename landed together, so no isolated red run of the new tests; each assertion is on a behaviour that did not exist before (`refresh`, `projectVersion`, tooltip). Test titles naming "Mission Control"/"Spec Board" in files outside the `missionControl` folders were reworded by script; the folder's own titles follow in T-002/T-003. `Header.tsx` keeps only the problem drill; its folder/version/time test moved to `App.test.tsx` (AC-025). Host smoke tests renamed (`openOverview`, `openBoard`, `refresh`), not runnable here.

### T-002 — Overview: Now and Up next (code names follow the UI)

- **Covers:** AC-004, AC-005, AC-006 (Now and Up next rows), AC-011 (Overview), AC-012
- **Do:** (a) Moves per P-1 (service, view builder, contract with `OverviewView`/`isOverviewView`,
  sample, webview area with `Overview.tsx`/`useOverview`, event type, client snapshot key,
  `studioPanel` `PanelOverview`, `extension.ts`, `testing/dom.tsx`, `webviewBundle.test.ts`, test API,
  smoke file, every importer such as `core/copyNextStep` and `earlierRunData.endToEnd.test.ts`) and
  P-2; the UX rule's globs follow the move: `src/core/missionControl/**` → `src/core/overview/**` in
  `.claude/rules/ux-guidelines.md` `paths:` and in the `applyTo` of
  `.github/instructions/ux-guidelines.instructions.md` (they mirror each other); existing tests green
  after (a), titles unchanged. (b) `core/overview/rows.ts`:
  `projectNow` (O-2) and `projectUpNext` (O-3: at most three rows, `more`, `stems` of every Up next
  entry); a row is `{ spec, state, status, problems, step? }` with O-5's status; view keys `now`,
  `upNext` beside the old ones (strict guard). Webview: `SpecRow.tsx` (one `Drill`: number, title,
  status, warning icon with T-05 while `problems > 0`, `StepText`; Copy as sibling; title and status
  carry their full text as `title`), Now and Up next above the old parts, "+ n more" → Board with the
  named set "Up next", O-8's empty texts with Copy of `/sdd-specify`; zero specs: `NO_SPECS_START_TEXT`
  (shared `texts.ts`, the Board uses it in T-005) with Copy in place of Now, Up next and the tiles.
  CSS `.ov-row` on one line. Texts in `areas/overview/texts.ts`. Tests (red first): `rows.test.ts`
  (AC-004 and AC-005 givens; Backlog need, else `Backlog`; ties by path; duplicated stem carries its
  path); `overview.test.ts` guard (new keys; an extra key refused); `Sections.test.tsx` (AC-006 parts,
  no second step line, tooltips, activation sends 0006 AC-014's request, Copy sends none — the 0017
  AC-012 tests retargeted to Now rows; AC-011, AC-012 texts, Copy posts `/sdd-specify`);
  `Drilldown.test.tsx` (+ n more request); `webviewCss.test.ts` (row `nowrap`, title and status with
  ellipsis, step and Copy `flex: none`).
- **Verify:** `npx vitest run src/core/overview src/shared/protocol src/webview/areas src/adapters/node/webviewCss.test.ts src/adapters/node/webviewBundle.test.ts` red, then green; gates 1–5; `npm run compile-tests`
- [ ] **Verified (T-002):** —
- **Notes:** —

### T-003 — Overview: Problems and the figures line replace header, tiles and Needs attention

- **Covers:** AC-003, AC-006 (Problems rows), AC-007, AC-008, AC-009, AC-013
- **Do:** Core: `problems.ts` (O-4: spec rows by number then path with P-6's status; lines from
  `projectFindings().problems`; stems), `figures.ts` from `specFigures.ts` (total, six counts in board
  order, Done `deprecated` only while > 0, progress); view `{ now, upNext, problems, figures,
  activity }`; `attention.ts`, `projectHeader`, `McHeader`, `McAttention`, `StateCount.derivedRule`
  go. Webview: `Problems.tsx` (heading `Drill` "Problems (n)", n = rows + lines, → Board named set
  "Problems"; rows via `SpecRow`; lines plain text), `Figures.tsx` (one line: "Total n" and six
  "State n" Drills; P-7 for the progress text and Done's description); DOM order Now, Up next,
  Problems, figures, Activity. `Header.tsx`, `SpecFigures.tsx`, `Attention.tsx`, their texts and CSS
  (`.mc-header`, `.mc-tiles`, `.mc-tile*`, `.mc-distribution`, `.mc-segment`, `.mc-progress`,
  `.mc-formula`, attention rules) go; remaining `.mc-*` → `.ov-*`; `userLanguage.test.tsx` sweeps the
  new sections. Tests (red first): `problems.test.ts` (AC-007 given `fs-broken`; a Review entry without
  a Problem has no row; format notes give none (`fs170-brownfield-mixed`); an orphan return note
  gives a line; the attention tests of 0016 AC-006/AC-007 retargeted, titles kept where they hold);
  `figures.test.ts` (moved specFigures tests: 0006 AC-001…AC-004, AC-020 hold); `Overview.test.tsx`
  (AC-003 order and absences, AC-007, AC-008 seven controls with a 0, AC-009 given, AC-013 Tab order
  over every control, Enter and Space); `Drilldown.test.tsx` (0006 AC-012, AC-014, AC-029 kept;
  Problems heading request, also without spec rows); `webviewCss.test.ts` (no `.mc-` selector;
  `.ov-drill` sets no outline — retargets the 0006 AC-022 test).
- **Verify:** `npx vitest run src/core/overview src/shared/protocol src/webview src/adapters/node` red, then green; gates 1–5; `npm run compile-tests`
- [ ] **Verified (T-003):** —
- **Notes:** —

### T-004 — Overview: Activity collapsed

- **Covers:** AC-010
- **Do:** `overviewService.ts` per P-5 (`setActivityOpen`, reset with the last listener); view
  `activity: { available: true; entries; open }`; request `overviewSetActivity { open: boolean }` in
  `messages.ts` with its guard, handlers on the service, routed by `studioPanel.ts`; client
  `setActivityOpen`. `Activity.tsx`: heading button "Activity (n)" with `aria-expanded`, entries only
  while open, no section without entries; not available → heading "Activity" and "Activity not
  available: <reason>", no toggle. Tests (red first): `overviewService.test.ts` (collapsed at the
  first listener; open kept across new views while listened; collapsed again after the last listener
  left and a new one came — panel closed and reopened; a `hello` re-push carries the same state —
  hidden and shown); `messages.test.ts` guard; `Sections.test.tsx` (AC-010: `aria-expanded="false"`,
  toggle sends one request, entries follow the view, no section without entries, unavailable form,
  Enter and Space).
- **Verify:** `npx vitest run src/core/overview src/shared/protocol src/webview/areas` red, then green; gates 1–5
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Board: narrow columns, widths and the filter chip

- **Covers:** AC-011 (Board), AC-014, AC-015, AC-017, AC-020
- **Do:** `filters.ts` `arrangeBoard` sets `narrow` (`empty`, `filtered`) and `count` (P-9), guard
  in `board.ts`; `BOARD_LABEL` `Board`; P-8 removes `boardSetFilter`. `Column.tsx`: a narrow strip
  carries `data-narrow`, icon, vertical name and count, no list and no hint, `aria-label` = §7 text,
  `title` = §7 text, for Ready, Review and Blocked followed by ` · ` and B-6; wide Ready, Review and
  Blocked headers carry B-6 as `title`. `FilterBar.tsx`: no fieldset or checkbox; chip
  "Filter: <label>" (set label, else state names joined by ", "), "Clear filters", sort. Board zero
  specs: `NO_SPECS_START_TEXT` with Copy. CSS per P-11; `COLUMN_HINTS`, `STATE_FILTER_LABEL`,
  `SPEC_SET_LABEL` and the fieldset, legend and checkbox rules go. Tests (red first): `filters.test.ts`
  (AC-014 given; `filtered` and `empty` strips; counts); `SpecBoard.test.tsx` (AC-014 `data-narrow` and
  accessible names; AC-017 given — the Review figure's filter → "Filter: Review", Review wide, five
  narrow; no checkbox or filter control; AC-020 givens and the other three headers without tooltip;
  AC-011 Board text and Copy); `webviewCss.test.ts` AC-015 (values, then 2 × 200 + 4 × 32 + 5 × 8 +
  2 × 16 = 600 ≤ 640 and 5 × 200 + 32 + 5 × 8 + 2 × 16 = 1,104 ≤ 1,240 computed from the parsed
  values; sticky headers; `overflow-x: auto`; no `@media` rule for `.columns`/`.column`) replacing the
  0013 AC-008 test; `boardRequests.test.ts`, `messages.test.ts` (`boardSetFilter` unknown).
- **Verify:** `npx vitest run src/core/board src/shared/protocol src/webview/board src/adapters/node/webviewCss.test.ts` red, then green; gates 1–4
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Board: Done collapsed and remembered; keyboard

- **Covers:** AC-016, AC-024, AC-028
- **Do:** Core: `board/doneMemory.ts` (P-10 parse and serialize); `boardUiState` gains
  `doneExpanded`/`setDoneExpanded` (writes through the port); `createBoardService({ …, memory })`;
  `arrangeBoard` collapses Done while no filter is set (`narrow: 'collapsed'`, `cards: []`, `count`);
  `BoardView.doneToggle`; request `boardSetDone { expanded }` (`messages.ts`, `boardRequests.ts`,
  client, `useBoard`). Adapter: `createUiMemory(memento, key)` in `uiMemory.ts` with the keys
  `featherspec-studio.shell` and `featherspec-studio.board`; `extension.ts` wires it; test API
  `board().setDone(expanded)`. Webview: while `doneToggle` is set, Done's header is the toggle button
  (`aria-expanded`, name "Show Done"/"Hide Done", visible "Done" and count); focus stays on it after a
  toggle; `SpecBoard.tsx` moves a lost focus to the toggle when `fallbackFocus` finds no card.
  Tests (red first): `doneMemory.test.ts` (round trip; damaged → collapsed); `boardService.test.ts`
  (collapsed by default; expanded after a toggle; a new service over the same memory keeps it —
  restart; `panelClosed` keeps it; a filter gives Done B-1 and no toggle; "Clear filters" brings the
  choice back); `filters.test.ts` (collapsed Done has no cards, its count); `noWrite.test.ts` (toggle
  writes no file, AC-028); `Keyboard.test.tsx` (Left and Right skip strips; toggle in Tab order,
  Enter and Space, focus stays; AC-024 given; every spec Done → the toggle is the only Tab stop among
  the columns); `SpecBoard.test.tsx` (toggle only while Done holds a card); host `board.smoke` thin
  ("0018 AC-016, AC-028: the Done choice survives a panel close and writes nothing").
- **Verify:** `npx vitest run src/core/board src/shared/protocol src/webview/board` red, then green; gates 1–5; `npm run compile-tests`
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — Board: the three-row card and a date to trust

- **Covers:** AC-018, AC-019, AC-021, AC-022, AC-023
- **Do:** Core: `board/lastChange.ts` (L-1: the plan's `Last updated:` when it starts with a real
  calendar date `YYYY-MM-DD` followed by the end or a space, else the newer mtime of spec and plan as
  a local day; P-12); `CardView` drops `derivedRule` and `lastChangeMs`, gains `lastChange` (guard and
  both fixture factories); board service L-3 (fewer than two different days → no `lastChange`,
  `sortKeys` Number and Title, a `lastChange` sort becomes Number); `filters.ts` L-4. Webview
  `Card.tsx`: (1) number and title clamped to two lines, (1a) path, (2) warning icon with T-05, the
  state part (need, blocked lines, "Deprecated", else a Steps bar with "Steps d/t" · "Criteria d/t",
  each left out while not available), date right-aligned with its tooltip, (3) step; no `StateChip`,
  summary or `RuleText`; P-13 tooltip and `aria-label`; sort options from `sortKeys`. Texts
  `stepsText`, `criteriaShortText`, `STEPS_PROGRESS_LABEL`, `lastChangeTooltip`, `cardTooltip`;
  `tasksText`, `criteriaText`, `TASKS_PROGRESS_LABEL`, `CRITERIA_PROGRESS_LABEL`, `lastChangeText`,
  `formatLastChange` go. Tests (red first): `lastChange.test.ts` (AC-021 givens; empty, `<date>`,
  `2026-13-40`, `2026-02-30`, prose → file day; `2026-11-10 (stage 2)` → plan day); `cards.test.ts`;
  `boardService.test.ts` (AC-022 given on P-14's memory project; one spec → no date; a `lastChange`
  sort → Number); `filters.test.ts` (AC-023: newest first, ties by stem then path, no date last;
  Number and Title unchanged); `SpecBoard.test.tsx` (AC-018 order and absences, tooltip, name ends
  with the state; AC-019 givens; AC-022 two sort options); `webviewCss.test.ts` (title clamp replaces
  the description clamp test).
- **Verify:** `npx vitest run src/core/board src/shared/protocol src/webview/board src/adapters/node/webviewCss.test.ts` red, then green; gates 1–4
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — §5 notes, product docs and scans

- **Covers:** AC-001 (scan, CHANGELOG), AC-029, AC-031 (checklist item); §5
- **Do:** Notes "*Amended by 0018 (PD-062): …*" at each statement §5 names in 0001, 0005, 0006,
  0007, 0013, 0015, 0016, 0017; the catch-all note ("read Overview or Board") in the heads of 0003,
  0005–0007, 0013, 0015–0017. README (tour: Overview, Board; P-15; commands table with Open
  Overview, Open Board, Refresh), CHANGELOG *Unreleased* (Changed: old → new area and command names,
  Overview, compact board, card date; Removed: tiles, bar, header, state checkboxes, Rescan Project,
  Refresh Project Discovery), release checklist (sections renamed; AC-031; README screenshots from the
  harness), design brief (Overview and Board per PD-062 and 0018), PD-064 (P-16). Scans (red first):
  `sourceScan.test.ts` "0018 AC-001, AC-029" — `src` without tests holds no `mission control` or
  `spec board` in any letter case, no `▸`, and none of `Nothing needs attention.`, `No recent
  activity.`, `Specs by state`, `Model updated`, `specs with diagnostics`, `Recent activity`, `Needs
  attention`, `Run /sdd-specify to write the first one`, `No spec in the backlog.`, `No spec is
  blocked.`, `Tasks: `, `Criteria verified`, `Last change: `, `Named set`, `Rescan Project`, `Refresh
  Project Discovery`; negative control. `docsScan.test.ts` "product docs after 0018" — README, release
  checklist, design brief and `package.json` name neither old area; CHANGELOG names `Open Overview`,
  `Open Board` and `Refresh` under *Unreleased*; each §5 spec carries a 0018 note; negative control.
- **Verify:** `npx vitest run src/adapters/node/sourceScan.test.ts src/adapters/node/docsScan.test.ts` red, then green; gates 1–4
- [ ] **Verified (T-008):** —
- **Notes:** —

### T-009 — Test-title audit, architecture and Memory Bank sync, final gates

- **Covers:** AC-030; re-proves AC-001…AC-029
- **Do:** Throwaway script outside the repo (`/tmp/audit-0018/titles.py`): the
  `describe`/`it`/`test`/`suite` title literals of every `.ts`/`.tsx` under `src` (so
  `runtime/testing/contract*.ts` and `src/test/**` count) at the Baseline (`git archive`) and at the
  head, compared across files (a moved test is no loss). Write `## Test-title audit` into this plan:
  counts, every missing title — renamed ones included — with its voided criterion (§5) or the head
  title replacing it. `docsScan` adds `.architecture/*.md` to the 0018 scan (red: `Spec Board` in
  `core.md`, `Mission Control` in `webview.md`). `/sdd-architecture-update` (confirmation = this
  plan's approval) changes exactly: the snapshot's `src/core/<area>` line (`missionControl 0006` →
  `overview 0006, 0018`; board `+ narrow columns, Done memory, card date 0018`), `src/webview` line
  (Overview and Board areas, strips and Done toggle; no old names), `src/shared/protocol` line
  (Overview view; specs list adds 0018), `last reconciled`; `.architecture/core.md` (overview area
  line, board line), `adapters.md` (the board memory key), `webview.md` (`areas/overview`, Board).
  Memory Bank: `techContext.md` (*Test*: the Overview line replaces Mission Control's, host smoke list
  with `overview.smoke`, a 0018 line), `systemPatterns.md` (Mission Control entries renamed to
  Overview, the drill-down entry names "Up next" and "Problems"; one 0018 entry: Activity state in
  the host reset with the last listener, Done in `workspaceState`, card date from the plan line,
  flexbox widths), `activeContext.md`. Final gates.
- **Verify:** audit counts in the plan; `npx vitest run src/adapters/node/docsScan.test.ts` red, then green; gates 1–5; `npm run compile-tests`; `npm test` on Windows and CI (pre-done gate, Gregor)
- [ ] **Verified (T-009):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-008, T-009 | — | — | open |
| AC-002 | T-001 | — | — | open |
| AC-003 | T-003 | — | — | open |
| AC-004 | T-002 | — | — | open |
| AC-005 | T-002 | — | — | open |
| AC-006 | T-002, T-003 | — | — | open |
| AC-007 | T-003 | — | — | open |
| AC-008 | T-003 | — | — | open |
| AC-009 | T-003 | — | — | open |
| AC-010 | T-004 | — | — | open |
| AC-011 | T-002, T-005 | — | — | open |
| AC-012 | T-002 | — | — | open |
| AC-013 | T-003 | — | — | open |
| AC-014 | T-005, T-006 | — | — | open |
| AC-015 | T-005 | — | — | open |
| AC-016 | T-006 | — | — | open |
| AC-017 | T-005 | — | — | open |
| AC-018 | T-007 | — | — | open |
| AC-019 | T-007 | — | — | open |
| AC-020 | T-005 | — | — | open |
| AC-021 | T-007 | — | — | open |
| AC-022 | T-007 | — | — | open |
| AC-023 | T-007 | — | — | open |
| AC-024 | T-006 | — | — | open |
| AC-025 | T-001 | — | — | open |
| AC-026 | T-001 | — | — | open |
| AC-027 | T-001 | — | — | open |
| AC-028 | T-006 | — | — | open |
| AC-029 | T-008 | — | — | open |
| AC-030 | T-009 | — | — | open |
| AC-031 | T-008 | — | manual: orchestrator's preview harness after T-009 (verdict here), Gregor in a real window (release checklist) | open |

## Session handoff

- **Done so far:** plan written (9 steps, 4 stages, no parallel stage).
- **Next action:** Gregor reads the plan (proxy decisions P-1…P-17); on the start signal, the
  backlog → active move, then T-001.
- **Open decisions:** OP-002 (Gregor confirms the spec's proxies; PD-064 records them in T-008).
- **Baseline:** `a992d08` (HEAD at the start of implementation).
- **Environment:** `npm test` cannot run in the agent sandbox (VS Code download blocked); CI and Gregor's Windows machine run it.
