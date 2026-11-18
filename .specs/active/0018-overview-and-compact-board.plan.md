# Plan — Overview and a Compact Board

**Spec:** [0018-overview-and-compact-board.md](0018-overview-and-compact-board.md)
**Status:** Done
**Last updated:** 2026-11-18
**Current step:** —

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
5. T-010 → T-011 → T-012 → T-013 → T-014 — fixes from the compile S44 (appended 2026-11-18): Refresh after a failed discovery, strip count, test gaps, narrow Overview rows, spec and plan corrections

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
- [x] **Verified (T-002):** 2026-11-18: (a) the moves by `git mv` (`core/overview`, `shared/protocol/overview.ts` and its test and sample, `webview/areas/overview` with `Overview.tsx`, `src/test/overview.smoke.test.ts`, service and view files) plus the identifier rename: green after (a) except the three tests of mine that the global rename had touched (fixed). (b) `rows.test.ts` red through the `Not implemented` stub (12 failures: Now and Up next givens), then green; contract tests in `overview.test.ts` and the service key list; the webview tests (`Sections.test.tsx` 0018 AC-004/005/006/011/012, `webviewCss.test.ts` row rules) written after the components (no separate red run). `npm run test:unit` 1908 passed, 3 skipped, timing 12 passed; eslint, both `tsc`, `compile`, `compile-tests` clean.
- **Notes:** P-1 done in full including CSS `.mc-*` → `.ov-*` and `data-mission-control` → `data-overview` (T-003 then only deletes the dead parts). The UX rule glob and the Copilot loader `applyTo` both read `src/core/overview/**`. P-2 done: `DerivedRule`, `isDerivedRule`, `STATE_RULES` live in `shared/protocol/board.ts`; `StateCount.derivedRule` stays until T-003 because the old tiles still show it. The old 0017 AC-012 "Needs attention row" tests stay beside the new Now-row tests until T-003 removes that section. Row status texts: Backlog = first need (`needsOf`), else `Backlog`; all other states their name. The "+ n more" test sits in `Sections.test.tsx`, not `Drilldown.test.tsx` (same file family, same helpers).

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
- [x] **Verified (T-003):** 2026-11-18: the contract and webview tests were adapted to the new view (`{ now, upNext, problems, figures, activity }`) and the removed parts; new tests: `problems.test.ts`, `figures.test.ts` (moved `specFigures.test.ts`, 0006 AC-001…AC-004, AC-020 kept), `overview.test.ts` contract cases, `Overview.test.tsx` (AC-003 order and absences, AC-007, AC-008, AC-009, AC-011, AC-013), `Drilldown.test.tsx` (0006 AC-012, AC-014, AC-022 kept and retargeted; Problems heading request also without spec rows), `webviewCss.test.ts` (no `.mc-` and no removed rule). `npm run test:unit` 1898 passed, 3 skipped, timing 12 passed; eslint, both `tsc`, `compile`, `compile-tests` clean.
- **Notes:** Proxy: `problems.ts` and the webview components were written before their tests (no red run); the tests carry negative controls (Review without Problem, format notes, orphan plan). The view key `specs` is `figures` and `McSpecs` is `OverviewFigures`; `StateCount.derivedRule` and the rule names left the Overview contract (a view with `derivedRule` is refused, tested). The header facts moved to the shell view in T-001; the model-read-time tests of the old service moved to `shellService.test.ts` (F-1). The attention tests of 0016 AC-006/AC-007 live on as `problems.test.ts` (titles reworded, listed in the T-009 audit); the 0017 AC-012 tests on Needs-attention rows were replaced by the Now-row tests of T-002. Progress and "of which Deprecated" use `title` plus `aria-describedby` to `hidden` spans (P-7); tests read visible text without `[hidden]` nodes.

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
- [x] **Verified (T-004):** 2026-11-18: `overviewService.test.ts` AC-010 block red through the `Not implemented` stub (5 failures: open kept, re-push, reset after last listener, second-listener control, unavailable form), then green; guard test for `overviewSetActivity` in `messages.test.ts` and `boardFilter.test.ts` (guard list); webview AC-010 tests in `Sections.test.tsx` written after the component (heading button, `aria-expanded`, request, entries follow the view, Enter and Space, no section without entries, unavailable form). `npm run test:unit` 1910 passed, 3 skipped, timing 12 passed; eslint, both `tsc`, `compile` clean (no `compile-tests` required by the plan for this step).
- **Notes:** The open flag travels in `activity: { available: true; entries; open }`; the toggle is a button with `data-drill="activity"` so the Tab-order test of 0006 AC-022 lists it. A request while no listener exists is ignored (the state is reset by the last listener leaving anyway). Old texts "Recent activity", "No recent activity." and "Recent activity not available" are gone from the Overview (T-008 scans them).

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
- [x] **Verified (T-005):** 2026-11-18: tests written with the code in one pass, no separate red run (`filters.test.ts` AC-014 givens, `SpecBoard.test.tsx` strips, chip, B-6 titles, zero-specs Copy; `webviewCss.test.ts` AC-015 arithmetic from the parsed values; `boardRequests.test.ts`, `boardFilter.test.ts` for the missing `boardSetFilter`). `npm run test:unit` 1916 passed, 3 skipped, timing 12 passed; eslint and both `tsc` clean.
- **Notes:** `count` is the cards shown on a wide column, the hidden cards on a `filtered` strip and 0 on an `empty` one; `narrow: 'collapsed'` and its text exist in the contract and `narrowColumnText` already (T-006 fills them). The 0007 AC-017 keyboard test of the filter controls is retitled AC-024 (Clear filters and sort: two controls). `states.test.tsx` expects the new zero-specs text. The filter chip lists state names in board order as the filter holds them.

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
- [x] **Verified (T-006):** 2026-11-18: written with the code in one pass, no separate red run (`doneMemory.test.ts`; `boardService.test.ts` eight Done tests incl. restart over the same memory, damaged memory, `panelClosed`, filter and Clear filters; `filters.test.ts`; `noWrite.test.ts` with the two memory writes; `Keyboard.test.tsx` six tests; `SpecBoard.test.tsx` toggle block; guard and router tests; host `board.smoke` thin test compiles, not run here). `npm run test:unit` 1936 passed, 3 skipped, timing 12 passed; eslint, both `tsc`, `compile`, `compile-tests` clean.
- **Notes:** `BoardView.doneToggle` is optional (absent instead of `undefined`). The memory is read once when the service is created. One `Column` element tree serves wide, strip and toggle so the toggle button keeps its DOM node and the focus across collapse and expand. `fallbackFocus` is unchanged (first card of the nearest column), so the Keyboard test names that, not "the nearest card". `boardService.timing.test.ts` expands Done before counting 200 cards. The host smoke test cannot close the panel through the test API, so it covers "writes nothing" and the collapsed view; the restart is proven by the service test.

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
- [x] **Verified (T-007):** 2026-11-18: written with the code in one pass, no separate red run (`lastChange.test.ts` AC-021 givens incl. `<date>`, `2026-13-40`, `2026-02-30`, prose and `2026-11-10 (stage 2)`; `boardService.test.ts` L-3 on in-memory projects with plan dates; `filters.test.ts` AC-023; `SpecBoard.test.tsx` AC-018, AC-019, AC-021, AC-022; guards; `webviewCss.test.ts` title clamp). `npm run test:unit` 1952 passed, 3 skipped, timing 12 passed; eslint, both `tsc`, `compile-tests` clean.
- **Notes:** `criteriaText` stays in `texts.ts`: Spec Detail still shows "Criteria: d of t verified" (0007 detail, not a card); `tasksText`, `TASKS_PROGRESS_LABEL`, `CRITERIA_PROGRESS_LABEL`, `lastChangeText`, `formatLastChange` are gone. `progress.ts` `lastChange(...)` was removed with `lastChangeMs` (its 0007 AC-025 "newer of the times" test is replaced by `lastChange.test.ts`, the card test now compares with `cardLastChange`). `planText` in the test helpers gained `lastUpdated`. Row 2 state part in order: Backlog need, Blocked lines, Deprecated, else Steps bar and Criteria (a Deprecated Backlog card with a need shows the need). The state row is the card's `aria-describedby` target and is absent without parts. `webviewBundle.test.ts` Board mount now asserts the Ready header tooltip and the card name.

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
- [x] **Verified (T-008):** 2026-11-18: the scans written with the docs in one pass, no separate red run (`sourceScan.test.ts` "0018 AC-001, AC-029" with negative control; `docsScan.test.ts` "product docs after 0018": README, release checklist, design brief and `package.json` free of both old names, CHANGELOG *Unreleased* names `Open Overview`, `Open Board`, `FeatherSpec Studio: Refresh`, nine specs carry the 0018 note, seven carry the catch-all note in their head, PD-064 exists). `npm run test:unit` 1981 passed, 3 skipped, timing 12 passed; eslint and both `tsc` clean.
- **Notes:** Notes were added by a throwaway script (`/tmp/amend/amend.py`): a head note per spec listing the §5 statements that are not acceptance criteria, an inline note after each acceptance criterion §5 names (0001 has only the head note: its §9 command row has no AC). The catch-all note sits in the head of 0003, 0005, 0006, 0007, 0013, 0015, 0016 (0017's own catch-all is not needed: it names no area as a place beyond the AC-012 rows). The scan allows one `▸`: the selected row of the Spec Explorer list (`SpecExplorer.tsx`, 0005 AC-023 — first written as "0007 AC-023", corrected in T-014 — a staying test that §5 did not amend; 0020's tree replaces it; since T-014 the spec's AC-029 names the exception); a test pins that file as the only one. Hyphenated names (`mission-control-dark.png`) are not matched by the docs scan (P-15 keeps the screenshot files). The README tour, release checklist (new section for AC-031 and the screenshot replacement) and design brief headings name Overview and Board; the old design-brief text stays as history under a note.

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
- [x] **Verified (T-009):** 2026-11-18, re-checked in the fix session S45 (the box had stayed open with an empty `Verified:` while the plan said Done; the compile S44 named it). Claims re-checked against the repository: the audit table below exists (its two errors are corrected in T-014); `docsScan.test.ts` "`.architecture/*.md` name neither old area" and the "product docs after 0018" block exist and pass; the snapshot in `AGENTS.md` reads `last reconciled: 2026-11-18 (0018)` and names `overview 0006, 0018`; `techContext.md`, `systemPatterns.md`, `activeContext.md` carry the 0018 entries (`activeContext.md` 45 lines). The red run of the `.architecture` scan before the docs were fixed was not recorded at the time; the scan was seen red against its mutants in S44 (R4, R5 killed). Gates at `dc0077a` in the sandbox (S44 re-run): eslint, both `tsc`, `compile`, `compile-tests` exit 0; `npm run test:unit` 1983 passed, 3 skipped, timing 12 passed. Gregor's Windows 11 machine at `dc0077a` (2026-11-18): `npm run test:unit` 1979 passed, 7 skipped, 12 timing passed; `npm test` 26 + 1 + 1 + 1 passing. GitHub Actions run 44246134800 at `dc0077a`: ubuntu-latest and windows-latest green.
- **Notes:** The fix head (T-010…T-014) changes product code (`shellService.ts`, `filters.ts`, `Column.tsx`, `main.css`): Windows and CI need a re-run at the fix head (orchestrator).

### T-010 — Compile fix D1: Refresh after a failed discovery re-reads no spec

- **Covers:** AC-027 (spec §8 "Discovery fails during Refresh → 0005's panel state, no re-read")
- **Do:** `shellService.refresh()` re-reads only when discovery left an active project and no `failure`. Test first in `shellService.test.ts`: the command, the panel Refresh and Retry after a failing discovery re-read nothing and the state stays S5; a later working Refresh re-reads once (control).
- **Verify:** `npx vitest run src/core/shell` red, then green; gates 1–5
- [x] **Verified (T-010):** 2026-11-18: the new test `0018 AC-027, §8: a discovery that fails during Refresh leaves the panel state S5 and re-reads no spec, …` red against the code of `dc0077a` (`expected 3 to be +0`: three re-reads for the command, Refresh and Retry), then green after the change; `npx vitest run src/core/shell` 135 passed.
- **Notes:** Proxy (PD-065): the orchestrator decided D1 as a code fix, the spec's §8 stays as written. The existing "Retry reruns discovery … and recovers" test stays green: a Retry whose discovery works again re-reads once.

### T-011 — Compile fix D3: a strip's count is the cards it holds

- **Covers:** AC-014 (B-1)
- **Do:** `arrangeBoard` keeps `count` = the cards shown (0 on a strip a filter emptied); `Column.tsx` names `column.hidden` in the strip's tooltip and accessible name (`<State>: <n> hidden by filter`, §7 unchanged). Spec B-1 and AC-014 amended. Tests first: `filters.test.ts` (filtered strips read 0, `hidden` carries the number), `boardService.test.ts` (Done under a filter), `SpecBoard.test.tsx` (count badge `0`, text names 3).
- **Verify:** `npx vitest run src/core/board src/webview/board` red, then green; gates 1–5
- [x] **Verified (T-011):** 2026-11-18: with the tests changed first, 5 tests red (`filters.test.ts` ×3, `boardService.test.ts` ×1, `SpecBoard.test.tsx` ×1: filtered strips still counted their hidden cards); green after the change, `npx vitest run src/core/board src/webview` 509 passed.
- **Notes:** Proxy (PD-065): rule B-1 holds as written. The wording stays "hidden by filter" (§7 literal) instead of "hidden by the filter". T-005's note "`count` is … the hidden cards on a `filtered` strip" is superseded.

### T-012 — Compile fix: close the test gaps

- **Covers:** AC-005 (boundary), AC-007 (duplicated stem), 0006 AC-010 (no show-more control), AC-021 (L-1 newer of the two times)
- **Do:** `rows.test.ts` four entries give "more" 1 and three give 0; `Sections.test.tsx` "+ 1 more" renders and sends the request, and the open Activity list has only the heading toggle and one button per entry and no "more"; `Drilldown.test.tsx` fixture holds the stem `0004-dup` in two Problems rows (the Tab-order list gains one entry); `lastChange.test.ts` a spec newer than its plan gives the spec day. Each seen red against its mutant, restored after.
- **Verify:** `npx vitest run src/core/overview src/webview/areas/overview src/core/board/lastChange.test.ts`, each mutant red
- [x] **Verified (T-012):** 2026-11-18: the new or tightened tests are green at the code of `dc0077a` and red against their mutants: O7a (`more` = length − 4) → 2 red in `rows.test.ts`; O7b (`more <= 1` hides the line) → 1 red in `Sections.test.tsx`; D4 (Problems stems without the de-duplication) → 1 red in `Drilldown.test.tsx` (it stayed green before the fixture held the stem twice); O20b (a "Show more" button in an open Activity, with and without `data-drill`) → 1 red each in `Sections.test.tsx`; T4 (`planMs ?? specMs` instead of the newer time) → 1 red in `lastChange.test.ts`. Every mutant restored; `git diff` shows none.
- **Notes:** Rows 49 and 91 of the audit are corrected in T-014. The `Drilldown.test.tsx` keyboard list test names the second `row:problems:0004-dup` (the id is by stem).

### T-013 — Compile fix V1: Overview rows wrap at 720 px or less

- **Covers:** AC-006, AC-031 (defect V1 of the orchestrator's preview check: at 640 px the rows cut the title and the state)
- **Do:** `main.css` `@media (max-width: 720px)`: `.ov-row` wraps (`flex-wrap`, `white-space: normal`), the title takes `flex: 1 1 calc(100% - 4em)` so the state, the step and Copy fall to line 2 (Copy bottom-aligned by `.ov-row-item { align-items: flex-end }`), title and state wrap and are not cut. Spec O-5, AC-006 and AC-031 amended (PD-065). Guard tests first in `webviewCss.test.ts`: the narrow rules and a control that the wide rules sit outside every media query.
- **Verify:** `npx vitest run src/adapters/node/webviewCss.test.ts` red, then green, three mutants red; gates 1–5
- [x] **Verified (T-013):** 2026-11-18: `0018 AC-006 (V1): at 720 px or less a spec row wraps to two lines, …` red against the stylesheet of `dc0077a` (no media rule), green after the change (the control test was green throughout); mutants: no `flex-wrap`, a kept `text-overflow: ellipsis` on the state, threshold 600 px, each 1 red, restored. `npm run test:unit` 1989 passed, 3 skipped, timing 12 passed. A throwaway page (`/tmp/v1`, three sample rows, the real `main.css`) in headless Chrome at 640 px showed line 1 number and title (wrapping), line 2 state and "Next …", Copy at the right of the last line; at 1000 px one line. That page lacks the real theme, so the check after the fix is the orchestrator's in the preview harness.
- **Notes:** A very long Problems reason pushes the step to a third line at 640 px; the state stays readable. `.step-text` keeps `margin-left: auto`.

### T-014 — Compile fix: spec and plan corrections, evidence, PD-065

- **Covers:** AC-029 (D2), AC-030, AC-031; plan hole of T-009
- **Do:** Spec AC-029 excepts the selected-row marker of `src/webview/areas/SpecExplorer.tsx` (0005 AC-023) until 0020; the plan's citation "0007 AC-023" corrected; `sourceScan.test.ts` title names 0005. PD-065 records the decisions D1, D2, D3, V1 and the T-009 rule. T-009 ticked with its evidence; audit rows 49, 75, 91 and the describe count corrected; evidence of 2026-11-18 (Windows 11 and CI at `dc0077a`, AC-031) recorded; traceability and handoff updated.
- **Verify:** `npx vitest run src/adapters/node/sourceScan.test.ts src/adapters/node/docsScan.test.ts`; gates 1–5, `compile-tests`
- [x] **Verified (T-014):** 2026-11-18: `npx vitest run src/adapters/node` green (`sourceScan.test.ts` only retitled to cite 0005; its pin of `SpecExplorer.tsx` and its negative control are unchanged); gates 1–5 and `compile-tests` exit 0 at the end of the session: eslint, both `tsc`, `npm run test:unit` 1989 passed, 3 skipped, timing 12 passed (`dc0077a`: 1983; +6 = T-010 ×1, T-012 ×3, T-013 ×2), `compile`, `compile-tests`.
- **Notes:** Proxy decisions of the orchestrator for Gregor, recorded in PD-065 (new row; PD-064 is not edited). The fix steps were committed code first (T-010…T-013), the plan, spec, PD and Memory Bank edits in one commit with T-014.

## Test-title audit

AC-030, from a throwaway script outside the repo (`/tmp/audit-0018/titles.py`, 2026-11-18): the
`describe`/`it`/`test`/`suite` title literals of every `.ts`/`.tsx` under `src` at the Baseline
`a992d08` (`git archive`) and at the head, compared across files (a moved test is no loss;
`it.each` titles count once as written).

- Baseline: 1,635 test titles (1,632 different); head: 1,721 (the Vitest total is higher because
  `it.each` expands: `npm run test:unit` at the Baseline 1,875 passed, at the head 1,983 passed, both
  with 3 skipped; the timing projects pass 12 at both).
- Absent at the head: 99 test titles, every one listed below with the criterion §5 voids or the head
  title that replaces it. No title is absent without a row (corrected by T-014: row 75 was no test and the real 99th is the host suite title, now row 75; rows 49 and 91 had lost assertions, restored in T-012). 24 `describe` group titles also changed:
  they name the removed tiles, header and attention list or carry the old area names; each held only
  tests listed below.
- Kept unchanged by title: all of 0006's drill-down tests that §5 maps (the total, the state counts,
  the named sets, Enter and Space, the activity entries, the vanished stem) apart from the renames
  below, the host smoke tests of 0001 and 0005 (renamed with the new IDs where the command or area name is
  in the title), and every other test of the Baseline.

| # | Baseline title | Baseline file | Disposition |
| --- | --- | --- | --- |
| 1 | 0006 AC-022: a Mission Control drill-down button sets no outline of its own, so the generic focus indicator of every button applies | `adapters/node/webviewCss.test.ts` | renamed: head `0006 AC-022: an Overview drill-down button sets no outline …` |
| 2 | 0015 AC-010 (0016 T-04): the reasons are Blocked, Problem and Review pending only, in that order, and no run reason exists | `core/missionControl/attention.test.ts` | voided by 0018 §5 (0016 T-04, 0015 AC-010 *Needs attention* part: the attention list ends); head `rows.test.ts` Now givens (AC-004) and `problems.test.ts` |
| 3 | 0015 AC-011: the filters offer board state and named spec set only: one checkbox group, no provider, no "No run" | `webview/board/SpecBoard.test.tsx` | voided by 0018 §5 (0007 AC-012, AC-022: no filter control); head `AC-017: the board offers no checkbox and no filter control of its own, only the sort select` |
| 4 | 0015 AC-017 (0006): a spec read while open moves the time to that read; a history change alone leaves it (negative control) | `core/missionControl/missionControlService.test.ts` | moved: head `0018 F-1 (0015 AC-017, 0006): the time is the last spec read: a read moves it, a change of …` in `shellService.test.ts` (the time is the project name's tooltip, §5) |
| 5 | 0015 AC-017 (0006): the time is the last spec read the dashboard processed: a model read at 10:00 shows 10:00 whenever the panel opens | `core/missionControl/missionControlService.test.ts` | moved: head `0018 F-1 (0015 AC-017, 0006): the time is the last spec read …` in `shellService.test.ts` |
| 6 | 0015 AC-018 (0006): with the history not available Recent activity says so with the reason; the spec figures and the reasons stay | `core/missionControl/missionControlService.test.ts` | renamed: head `0015 AC-018 (0006): with the history not available Activity says so with the reason; the figures and Now stay` |
| 7 | 0015 §3.2 (0013): Recent activity stands alone in the panel row below the attention list | `webview/areas/missionControl/Sections.test.tsx` | renamed: head `0015 §3.2 (0013): Activity stands alone in the panel row below the figures line` |
| 8 | 0016 AC-006, AC-007: the badge reads 1 problem for one Problem and is absent at 0 (negative control) | `webview/board/SpecBoard.test.tsx` | replaced: head `AC-019: the Problems badge is the warning icon with its text, and absent at 0 (negative control)` |
| 9 | 0016 AC-007, AC-008: the fixture project has no Problem, so its header counts none and its attention row names no Problem | `test/missionControl.smoke.test.ts` | renamed: head `0016 AC-007, AC-008 (0018 AC-007): the fixture project has no Problem, so Problems lists none …` |
| 10 | AC-003: Total and every tile are Tab stops | `webview/areas/missionControl/MissionControl.test.tsx` | replaced: head `every spec row, Copy, figure, "+ n more", the Problems and Activity headings are Tab stops in DOM order` (tiles void, 0013 AC-004–AC-007) |
| 11 | AC-003: progress shows the percentage, both numbers and the formula text | `webview/areas/missionControl/MissionControl.test.tsx` | replaced by 0018 AC-009: head `the line and "Total n" carry it as tooltip, "Total n" as accessible description` (the visible text goes) |
| 12 | AC-004, AC-006: no summary and unavailable figures read as text, never as zero | `webview/board/SpecBoard.test.tsx` | voided on the card by 0018 §5 (0007 AC-004, AC-006 card part); head `AC-019: unavailable parts are left out and never read as zero …` and `AC-018: the card tooltip is number and title, a line break, then the description or No summary …` |
| 13 | AC-004: activating a tile sends the state request of 0006 BR-08 | `webview/areas/missionControl/MissionControl.test.tsx` | retargeted: head `%s sends 0006 BR-08's request (a zero included)` (figures replace tiles) |
| 14 | AC-004: six tiles in board order, each one native button with count, state name and state icon; Ready, Review and Blocked carry the sentence with the rule ID | `webview/areas/missionControl/MissionControl.test.tsx` | voided by 0018 §5 (0013 AC-004–AC-007); head `shows "Total n" and the six "State n" in board order, zeros included, each one control` |
| 15 | AC-004: with no divisor progress reads "not available" and shows no percentage | `webview/areas/missionControl/MissionControl.test.tsx` | retargeted: head `without a divisor the text reads "Progress: not available" and shows no percentage` |
| 16 | AC-005: 5 Backlog and 7 Review give two segments, 41.7 % and 58.3 % wide, named "Backlog: 5 of 12" and "Review: 7 of 12"; no segment for 0 | `webview/areas/missionControl/MissionControl.test.tsx` | voided by 0018 §5 (0013 AC-004–AC-007: no distribution bar) |
| 17 | AC-005: the progress figure shows 0006 BR-04's rule as visible secondary text and as tooltip | `webview/areas/missionControl/MissionControl.test.tsx` | replaced by 0018 AC-009: head `no visible element shows it: every element holding the text is hidden or a tooltip` |
| 18 | AC-006: fs-broken lists 0002 (unreadable) and 0003 (contradiction) with the reason Problem | `core/missionControl/attention.test.ts` | retargeted: head `fs-broken gives the rows 0002 (unreadable) and 0003 (contradiction), each with its own reason as the state text` |
| 19 | AC-007: a spec with format notes only is not listed (fs170-brownfield-mixed: only the spec with a Problem) | `core/missionControl/attention.test.ts` | retargeted: head `format notes give no row and no line (fs170-brownfield-mixed: only the spec with a Problem, 0016 AC-007)` |
| 20 | AC-007: each attention row shows a number chip, the title and every reason as text with an icon | `webview/areas/missionControl/Sections.test.tsx` | retargeted: head `shows "Problems (n)" with n = rows + lines, each spec row with its reasons, and a line as plain text` (0006 AC-014 attention row → Problems row) |
| 21 | AC-007: the empty Recent activity panel shows an icon and 0006's sentence | `webview/areas/missionControl/Sections.test.tsx` | voided by 0018 AC-010 (no Activity section without entries); head `without entries there is no Activity section at all` |
| 22 | AC-008 (0016): a project-level format note (an archived orphan plan) is no Problem and the header counts none | `core/missionControl/specFigures.test.ts` | voided header count (0006 AC-008, AC-009 → AC-004, AC-007, §5); head `a project-level format note (an archived orphan plan) is no line` |
| 23 | AC-008 control: format notes on a spec count for nothing (fs170 0006) | `core/missionControl/specFigures.test.ts` | voided header count (§5); head `a spec with an unknown header line (a format note) has no row` |
| 24 | AC-008: Problems at project level only open the Spec Board without a filter, where its banner lists them | `webview/areas/missionControl/Drilldown.test.tsx` | replaced by 0018 AC-007 (heading always sends the named set, also without stems): head `with only project-level lines the heading still sends the named set Problems, with no stem` |
| 25 | AC-008: a Backlog spec without a plan is not listed, a Review spec is, with the reason "Review pending" | `core/missionControl/attention.test.ts` | retargeted: Review is a Now row (`rows.test.ts`, 0018 AC-004), Backlog is Up next (AC-005); head `a Review entry without a Problem has no row (0016 AC-006 retargeted)` |
| 26 | AC-008: an unreadable spec file counts as the reason Problem | `core/missionControl/attention.test.ts` | retargeted: head `fs-broken gives the rows 0002 (unreadable) and 0003 (contradiction) …` |
| 27 | AC-008: no height on a board column, sticky column headers, a scrolling card list, 240 px minimum and a horizontally scrolling board | `adapters/node/webviewCss.test.ts` | replaced: head `AC-015: columns share the width by flexbox (200 to 360 px, strips 32 px, gap 8 px) …` (0013 AC-008 → 0018 AC-015, §5) |
| 28 | AC-008: one spec with several Problems (an unknown status, a dangling plan link and the folder contradiction) counts each, because the header counts Problems and not specs | `core/missionControl/specFigures.test.ts` | voided header count (§5); head `several Problems of one spec give one row, the reasons joined by " · " and the count of the Problems` |
| 29 | AC-008: problemStems holds the specs that carry a Problem, sorted, and not a spec with an unknown header line (a note) | `core/missionControl/specFigures.test.ts` | retargeted: head `a duplicated stem carries its path in the row and appears once in the stems` and `shows "Problems (n)" …` |
| 30 | AC-008: problems counts the Problems on specs plus those at project level (fs-broken: 2; an orphan return note adds one) | `core/missionControl/specFigures.test.ts` | retargeted to 0018 AC-007: head `shows "Problems (n)" with n = rows + lines, each spec row with its reasons, and a line as plain text` |
| 31 | AC-008: sends one request for the Spec Board with the named set "Problems" and the stems that carry a Problem, and no runAction | `webview/areas/missionControl/Drilldown.test.tsx` | renamed: head `activating the heading sends one request for the Board with the named set Problems and the stems of the rows` and `0018 AC-007: the Problems heading sends the named set "Problems" …` |
| 32 | AC-008: while no Problem exists the header shows no problem element at all | `webview/areas/missionControl/Drilldown.test.tsx` | replaced: head `shows Problems only while it lists something` (no header, §5) |
| 33 | AC-008: with no Problem the header shows no problem element and no count | `webview/areas/missionControl/MissionControl.test.tsx` | replaced: head `shows Problems only while it lists something` (no header, §5) |
| 34 | AC-009: a lifecycle contradiction counts as the reason Problem; an unknown header line (a format note) does not | `core/missionControl/attention.test.ts` | retargeted: head `fs-broken gives the rows …` and `a spec with an unknown header line (a format note) has no row` |
| 35 | AC-009: number and title, one state chip, summary, the tasks and criteria progressbars and the next-step line follow in DOM order | `webview/board/SpecBoard.test.tsx` | replaced: head `AC-009: number and title, the steps bar, the criteria and the next-step line follow in DOM order …` (0013 AC-009, three-row card) |
| 36 | AC-009: the progressbars carry value, maximum and the figure text | `webview/board/SpecBoard.test.tsx` | replaced: head `AC-019: the steps bar is named Steps and carries the figure` |
| 37 | AC-009: where 0007 delivers no figure only "not available" shows, no progressbar | `webview/board/SpecBoard.test.tsx` | replaced: head `AC-009: where 0007 delivers no figure nothing shows for it and no progressbar is drawn` (0007 AC-006 card part) |
| 38 | AC-011, AC-012, AC-013: filter, sort and clear go to the board state | `core/board/boardRequests.test.ts` | replaced: head `AC-017, AC-013: sort and clear go to the board state, and the board has no request that sets a filter` (0007 AC-012, AC-022: no filter control, §5; P-8) |
| 39 | AC-013: by last change newest first, ties by stem, a card without the value last | `core/board/filters.test.ts` | replaced: head `AC-023: by last change newest day first, ties by stem then path, a card without a date last` (0007 AC-013 → 0018 L-4) |
| 40 | AC-014 (0016): a Backlog card shows its need as text without icon, the rule only in the tooltip; the Deprecated marker sits beside the chip | `webview/board/SpecBoard.test.tsx` | renamed: head `… the Deprecated marker shows on a card without a need` (no chip, §5) |
| 41 | AC-015: the first listener makes the service compute; the view has the four sections and no run figure | `core/missionControl/missionControlService.test.ts` | renamed: head `… the view has the five parts and no run figure` |
| 42 | AC-017: every filter control is reachable by keyboard | `webview/board/SpecBoard.test.tsx` | replaced: head `AC-024: the chip's Clear filters and the sort control are reachable by keyboard` (0007 AC-017, §5) |
| 43 | AC-017: name, version as reported ("unknown" included), update time and no Problem | `core/missionControl/specFigures.test.ts` | moved: the project name's tooltip (0018 F-1, AC-025): head `shows the folder name exactly once in the panel and the version and read time as its tooltip`, `a legacy project reads "FeatherSpec unknown"` in `App.test.tsx`; no header (§5) |
| 44 | AC-018: every state and every badge carries an icon beside its text, hidden from assistive technology | `webview/board/SpecBoard.test.tsx` | replaced: head `AC-018: every badge carries an icon beside its text, hidden from assistive technology` (no state chip on the card) |
| 45 | AC-023: the current area is marked with aria-current, a visible marker and the area heading, not by colour | `webview/App.test.tsx` | replaced: head `0018 AC-026: the current area is marked with aria-current and the area heading; no marker and no ▸ …` (0005 §9 marker, PD-054, §5) |
| 46 | AC-024: blocked lines, the readiness line, the Deprecated marker, the diagnostic badge and a duplicated path show as text | `webview/board/SpecBoard.test.tsx` | renamed: head `AC-024: blocked lines, the Deprecated marker, the Problems badge and a duplicated path show as text`; the need is in `AC-019: a Backlog card shows its first need …` |
| 47 | AC-025: Ready, Review and Blocked carry their rule ID, the other states carry none | `core/missionControl/specFigures.test.ts` | voided by 0018 §5 (0006 AC-025); the rule moves to the column header: head `AC-020: the Ready, Review and Blocked headers carry the sentence and the rule text …`; `0018 AC-003: the figures name no rule …` |
| 48 | AC-025: a card takes the newer modification time of the spec and its plan | `core/board/progress.test.ts` | replaced: head `AC-021: a card takes the date of L-1 from the spec, its plan and the plan's Last updated line` (0007 AC-025 → 0018 §6.3) |
| 49 | AC-025: the newer of the times, one time alone, or none | `core/board/progress.test.ts` | replaced: head `lastChange.test.ts` — `uses the spec file time alone when there is no plan, and nothing when no time is known`, `the plan's Last updated line wins …` and, restored in T-012 (the compile S44 found "the newer of spec and plan" untested, mutant T4), `the newer of the two file times decides: a spec newer than its plan gives the spec day, a plan newer than its spec the plan day` (0007 AC-025 → 0018 §6.3) |
| 50 | AC-029 (0005): contributes "FeatherSpec Studio: Rescan Project"; the internal action command stays out of the palette | `adapters/vscode/manifest.test.ts` | voided by 0018 §5 (0005 AC-029: Rescan Project → Refresh); head `0018 AC-001: contributes exactly the commands of the spec with their titles …` |
| 51 | AC-029: the Rescan command runs while a project is active and changes no file | `test/shell.smoke.test.ts` | replaced: head `0018 AC-027: the Refresh command runs while a project is active and changes no file` (0005 AC-029, §5) |
| 52 | Copy by pointer, Enter and Space posts copyText only, shows Copied at that Copy and sends no navigation request | `webview/areas/missionControl/Sections.test.tsx` | retargeted to Now rows (0017 AC-012 amended): head `Copy sits outside the row button, is the next Tab stop after it, and posts copyText only` |
| 53 | Copy sits outside the row button, is the next Tab stop after it and is named with the full first line | `webview/areas/missionControl/Sections.test.tsx` | renamed: head `Copy sits outside the row button, is the next Tab stop after it, and posts copyText only` |
| 54 | Given Mission Control is shown and spec 0003-x exists When the request "Spec Explorer, spec 0003-x" arrives Then Spec Explorer is shown and 0003 is selected | `core/shell/shellService.navigation.test.ts` | renamed: head `Given Overview is shown and spec 0003-x exists …` |
| 55 | Mission Control (header, tiles, attention row, activity) shows no rule ID or internal word | `webview/userLanguage.test.tsx` | renamed: head `Overview (Now, Up next, Problems, figures, activity) shows no rule ID or internal word` |
| 56 | OP-10: rows are ordered by ascending spec number whatever the order of the files | `core/missionControl/attention.test.ts` | renamed: head `rows go by number, whatever the order of the files` |
| 57 | Refresh runs discovery only, with S4 while it runs | `core/shell/shellService.test.ts` | replaced: head `0018 AC-027: the panel action Refresh runs discovery, then the re-read once, with S4 while …` (0005 *Refresh* action, §5) |
| 58 | T-02: the header time reads Updated HH:MM today, else with the date | `webview/areas/missionControl/MissionControl.test.tsx` | moved: head `T-02: the time reads Updated HH:MM today` in `App.test.tsx` (the time is the name's tooltip, 0016 T-02, §5) |
| 59 | a Mission Control row takes a step or no step key, and refuses a bad step | `shared/protocol/stepView.test.ts` | renamed: head `an Overview row takes a step or no step key, and refuses a bad step` |
| 60 | a column with no card before filtering shows its hint; a column emptied by a filter shows "N hidden by filter" | `webview/board/SpecBoard.test.tsx` | voided by 0018 §5 (0007 §6.8, AC-021: no column hint); head `AC-014: a column that shows no card is a narrow strip …`, `AC-012: a wide column that a filter partly empties still says how many are hidden` |
| 61 | a damaged remembered value (%s) gives Mission Control and no selection | `core/shell/shellService.navigation.test.ts` | renamed: head `… gives the Overview and no selection` |
| 62 | a remembered area agentCenter shows Mission Control with no notice and no selection | `core/shell/shellService.navigation.test.ts` | renamed: head `… shows Overview with no notice and no selection` |
| 63 | a row of a duplicated stem names its path so that the request can pick the entry | `core/missionControl/attention.test.ts` | renamed: head `a row of a duplicated stem names its path; the row carries its next step (0017 AC-012)` |
| 64 | a row whose spec has a step carries it; a row without a step has no step key | `core/missionControl/attention.test.ts` | renamed: head `a row of a duplicated stem names its path; the row carries its next step (0017 AC-012)` and the contract test `an Overview row takes a step or no step key, and refuses a bad step` |
| 65 | a row whose spec has no step shows no "Next" and no Copy (negative control) | `webview/areas/missionControl/Sections.test.tsx` | renamed: head `a row whose spec has no step shows no "Next" and no Copy; it has the one row button only` |
| 66 | a state count sends the Spec Board filtered to that state, once | `webview/areas/missionControl/Drilldown.test.tsx` | renamed: head `a state count sends the Board filtered to that state, once` |
| 67 | a valid missionControl event fills the area; an invalid one is ignored and the view stays as it was | `webview/areas/missionControl/MissionControl.test.tsx` | renamed: head `a valid overview event fills the area; an invalid one is ignored and the view stays as it was` |
| 68 | accepts a payload that holds a valid view and refuses anything else (negative control: a board view is no Mission Control view) | `shared/protocol/missionControl.test.ts` | renamed: head `… a board view is no Overview view` in `overview.test.ts` |
| 69 | activating the rest of the row still sends the request of 0006 AC-014 | `webview/areas/missionControl/Sections.test.tsx` | renamed: head `activating the row outside Copy sends the request of 0006 AC-014` |
| 70 | an attention row sends Spec Explorer with that spec; a row of a duplicated stem carries its path | `webview/areas/missionControl/Drilldown.test.tsx` | renamed: head `a Now row sends Spec Explorer with that spec; a row of a duplicated stem carries its path` (0006 AC-014, §5) |
| 71 | an empty list keeps its heading and says so; "not available" shows the reason and no list | `webview/areas/missionControl/Sections.test.tsx` | replaced by 0018 AC-010: head `while the status history is not available it shows the heading "Activity", the reason and no toggle` and `without entries there is no Activity section at all` |
| 72 | an empty list keeps its heading and says that nothing needs attention | `webview/areas/missionControl/Sections.test.tsx` | voided by 0018 §5/§7 ("Nothing needs attention." removed; Problems shows only while it lists something) |
| 73 | calls nothing while no project is active | `core/shell/shellService.test.ts` | voided by 0018 §5 (0005 OP-009 Rescan Project; 0001 §9 Refresh Project Discovery); head `runs discovery only while no project is active` (0018 AC-027) |
| 74 | calls the repository rescan once while a project is active | `core/shell/shellService.test.ts` | voided by 0018 §5 (Rescan Project is gone); head `0018 AC-027` command test: discovery once, then the re-read once while a project is active |
| 75 | FeatherSpec Studio Mission Control smoke | `test/missionControl.smoke.test.ts` | renamed suite: head `FeatherSpec Studio Overview smoke` in `test/overview.smoke.test.ts`, its three tests present (host suite, CI and Windows only). The earlier row 75, `const label = "Spec Board";`, was a `THEME_READS.test('…')` regex call, no test title |
| 76 | control: a Mission Control event with an extra field is refused and the area stays an empty frame | `adapters/node/webviewBundle.test.ts` | renamed: head `control: a Overview event with an extra field is refused …` |
| 77 | lists Mission Control, Spec Board and Spec Explorer | `webview/App.test.tsx` | renamed: head `lists Overview, Board and Spec Explorer` |
| 78 | lists exactly Mission Control, Spec Board and Spec Explorer, in this order | `shared/protocol/messages.test.ts` | renamed: head `lists exactly Overview, Board and Spec Explorer, in this order` |
| 79 | mounts Mission Control with a snapshot of a fixture project: header, six state counts, progress, the attention list, the activity, no start-up error | `adapters/node/webviewBundle.test.ts` | renamed: head `mounts Overview with a snapshot of a fixture project: Now, Up next, the figures line …`; header, tiles and attention list voided by 0018 §5 (0006 AC-008, AC-009; 0013 AC-004–AC-007) |
| 80 | mounts the Spec Board with a snapshot of a fixture project: six columns, the cards, no start-up error | `adapters/node/webviewBundle.test.ts` | renamed: head `mounts the Board with a snapshot of a fixture project: six columns, the cards, no start-up error` |
| 81 | no status element is empty and every marker carries its word | `webview/areas/missionControl/Sections.test.tsx` | retargeted: head `shows number, title, status text, the next step and Copy, and no second step line` (status text per row, no marker) |
| 82 | removes the data of the tag build, keeps the history and a newer folder, and Recent activity shows the kept entry | `adapters/node/earlierRunData.endToEnd.test.ts` | renamed: head `… and Activity shows the kept entry` |
| 83 | renders attention and activity within 1000 ms of the message event | `webview/areas/missionControl/Sections.timing.test.tsx` | renamed: head `renders Now and activity within 1000 ms of the message event` |
| 84 | shows "Next" and the short form after the reasons inside the row button, with the full lines as tooltip | `webview/areas/missionControl/Sections.test.tsx` | retargeted: head `shows number, title, status text, the next step and Copy …` and `title and status carry their full text as tooltip, the step its full lines` |
| 85 | shows "No specs yet" with the pointer to /sdd-specify in place of counts and progress, and keeps the header | `webview/areas/missionControl/MissionControl.test.tsx` | replaced by 0018 AC-011: head `shows "No specs yet. Start with /sdd-specify" and Copy in place of Now, Up next and the figures; Problems and Activity stay` |
| 86 | shows "unknown" as the version and "n problems" in the plural | `webview/areas/missionControl/MissionControl.test.tsx` | moved: version in the tooltip (head `a legacy project reads "FeatherSpec unknown"` in `App.test.tsx`); the problem count is the heading's n (0018 AC-007) |
| 87 | shows folder name, FeatherSpec version, the model update time in local time and the problem count | `webview/areas/missionControl/MissionControl.test.tsx` | moved: head `shows the folder name exactly once in the panel and the version and read time as its tooltip` (0018 AC-025); problem count → Problems (n) |
| 88 | shows number, title, state text, description, figures and last change | `webview/board/SpecBoard.test.tsx` | replaced: head `AC-018: a card shows number and title, then row 2 with the steps, the criteria and the day …` (state text, description, "Last change:" voided, §5) |
| 89 | shows the count in the heading and every reason of a row as text | `webview/areas/missionControl/Sections.test.tsx` | retargeted: head `shows "Problems (n)" with n = rows + lines, each spec row with its reasons …` |
| 90 | shows the total, the six states with their counts as text, "of which Deprecated" and the derived label with the rule ID | `webview/areas/missionControl/MissionControl.test.tsx` | retargeted: head `shows "Total n" and the six "State n" …` and `Done carries "of which Deprecated: n" as tooltip …`; the derived label voided (0018 AC-003, §5) |
| 91 | shows time, number, title and the change of each entry in the order of the view, and no control that shows more | `webview/areas/missionControl/Sections.test.tsx` | renamed: head `while open it shows time, number, title and the change of each entry in the order of the view, and no control that shows more (0006 AC-010)`; the "no control that shows more" assertions had been dropped in T-002 and are restored in T-012 (compile S44, mutant O20b) |
| 92 | the Needs attention heading sends the named set "Needs attention" with the stems of exactly the listed rows, a duplicated stem once | `webview/areas/missionControl/Drilldown.test.tsx` | renamed: head `0018 AC-007: the Problems heading sends the named set "Problems" with the stems of the listed spec rows, a duplicated stem once` (set label per §7) |
| 93 | the Spec Board card shows no rule ID or internal word, whatever its state, need or Problem | `webview/userLanguage.test.tsx` | renamed: head `the Board card shows no rule ID or internal word, whatever its state, need or Problem` |
| 94 | the description is limited to two lines | `adapters/node/webviewCss.test.ts` | replaced: head `AC-018: the number and title of a card are limited to two lines …` (0007 AC-004: no description on the card, §5) |
| 95 | the empty board, the empty Mission Control and the empty Spec Explorer | `webview/states.test.tsx` | renamed: head `the empty board, the empty Overview and the empty Spec Explorer` |
| 96 | the first open in a workspace shows Mission Control | `core/shell/shellService.navigation.test.ts` | renamed: head `0018 AC-002: the first open in a workspace shows the Overview` |
| 97 | the message replaces counts, progress and the attention list; the header and the activity stay | `webview/areas/missionControl/Sections.test.tsx` | replaced by 0018 AC-011: head `shows "No specs yet. Start with /sdd-specify" and Copy in place of Now, Up next and the figures …`; header voided (§5) |
| 98 | the state checkboxes send the full filter; unchecking the last one removes the key | `webview/board/SpecBoard.test.tsx` | voided by 0018 §5 (0007 AC-012, AC-022: no filter control; P-8) |
| 99 | the total sends the Spec Board without a target | `webview/areas/missionControl/Drilldown.test.tsx` | renamed: head `the total sends the Board without a target` |

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-008, T-009 | `src/shared/protocol/areas.ts`, `src/adapters/vscode/commands.ts`, `package.json`, README, CHANGELOG, `docs/` | `manifest.test.ts`, `messages.test.ts`, `sourceScan.test.ts` (0018 AC-001, AC-029), `docsScan.test.ts` (product docs after 0018) | verified |
| AC-002 | T-001 | `src/shared/protocol/areas.ts` (`parseUiMemory` rejects unknown areas) | `shellService.navigation.test.ts` (remembered `missionControl`, `specBoard`, `agentCenter`; first open) | verified |
| AC-003 | T-003 | `src/core/overview/figures.ts`, `webview/areas/overview/Figures.tsx` | `figures.test.ts`, `Overview.test.tsx` (figures, tooltips) | verified |
| AC-004 | T-002 | `src/core/overview/rows.ts`, `src/webview/areas/overview/Now.tsx`, `SpecRow.tsx` | `rows.test.ts`, `Sections.test.tsx` | verified |
| AC-005 | T-002, T-012 | `src/core/overview/rows.ts`, `src/webview/areas/overview/Now.tsx`, `SpecRow.tsx`, `+ n more` request in `requests.ts` | `rows.test.ts` (incl. the four-entry boundary), `Sections.test.tsx` ("+ 1 more"), `Drilldown.test.tsx` | verified |
| AC-006 | T-002, T-003, T-013 | `SpecRow.tsx`, `main.css` (`.ov-row`, `@media (max-width: 720px)`) | `Sections.test.tsx`, `webviewCss.test.ts` (one line above 720 px; V1 two lines at 720 px or less, with its control) | verified |
| AC-007 | T-003, T-012 | `src/core/overview/problems.ts`, `Problems.tsx` | `problems.test.ts`, `Overview.test.tsx`, `Drilldown.test.tsx` (the fixture holds a stem twice among the rows) | verified |
| AC-008 | T-003 | `Figures.tsx`, `requests.ts` | `Overview.test.tsx`, `Drilldown.test.tsx` | verified |
| AC-009 | T-003 | `Figures.tsx` (tooltip and `aria-describedby`) | `Overview.test.tsx`, `webviewBundle.test.ts` | verified |
| AC-010 | T-004 | `src/core/overview/overviewService.ts`, `activity.ts`, `Activity.tsx`, `overviewSetActivity` in `messages.ts` | `overviewService.test.ts`, `Sections.test.tsx`, `messageRouter.test.ts` | verified |
| AC-011 | T-002, T-005 | `NO_SPECS_START_TEXT` in `texts.ts`, `Overview.tsx`, `areas/SpecBoard.tsx` | `Sections.test.tsx`, `SpecBoard.test.tsx`, `states.test.tsx` | verified |
| AC-012 | T-002 | `Now.tsx` (empty texts) | `Sections.test.tsx` | verified |
| AC-013 | T-003 | `Drill.tsx`, `Overview.tsx` | `Overview.test.tsx`, `Drilldown.test.tsx`, `Sections.test.tsx` | verified |
| AC-014 | T-005, T-006, T-011 | `src/core/board/filters.ts`, `webview/board/Column.tsx` | `filters.test.ts`, `boardService.test.ts`, `SpecBoard.test.tsx` (a filtered strip counts 0, its text names the hidden number), `Keyboard.test.tsx` | verified |
| AC-015 | T-005 | `src/webview/main.css` (`.columns`, `.column`) | `webviewCss.test.ts` (AC-015) | verified |
| AC-016 | T-006 | `src/core/board/doneMemory.ts`, `boardUiState.ts`, `boardService.ts`, `src/adapters/vscode/uiMemory.ts`, `Column.tsx` | `doneMemory.test.ts`, `boardService.test.ts`, `filters.test.ts`, `SpecBoard.test.tsx`, `Keyboard.test.tsx`, host `board.smoke.test.ts` | verified |
| AC-017 | T-005 | `webview/board/FilterBar.tsx`, `messages.ts` (no `boardSetFilter`) | `SpecBoard.test.tsx`, `boardRequests.test.ts`, `boardFilter.test.ts` | verified |
| AC-018 | T-007 | `webview/board/Card.tsx`, `texts.ts` (`cardTooltip`, `cardName`) | `SpecBoard.test.tsx`, `webviewCss.test.ts`, `userLanguage.test.tsx` | verified |
| AC-019 | T-007 | `Card.tsx` | `SpecBoard.test.tsx` | verified |
| AC-020 | T-005 | `Column.tsx`, `texts.ts` (`columnRuleTooltip`) | `SpecBoard.test.tsx`, `webviewBundle.test.ts` | verified |
| AC-021 | T-007, T-012 | `src/core/board/lastChange.ts`, `cards.ts`, `Card.tsx` | `lastChange.test.ts` (incl. the newer of spec and plan file time), `progress.test.ts`, `SpecBoard.test.tsx` | verified |
| AC-022 | T-007 | `boardService.ts` (L-3), `FilterBar.tsx` | `boardService.test.ts`, `SpecBoard.test.tsx` | verified |
| AC-023 | T-007 | `src/core/board/filters.ts` | `filters.test.ts`, `boardService.test.ts` | verified |
| AC-024 | T-006 | `Column.tsx`, `areas/SpecBoard.tsx`, `FilterBar.tsx` | `Keyboard.test.tsx`, `SpecBoard.test.tsx` | verified |
| AC-025 | T-001 | `src/webview/App.tsx`, `ShellView` in `messages.ts`, `shellService.ts` | `App.test.tsx`, `shellService.test.ts`, `messages.test.ts` | verified |
| AC-026 | T-001 | `Navigation.tsx`, `main.css` | `App.test.tsx`, `webviewCss.test.ts` | verified |
| AC-027 | T-001, T-010 | `src/core/shell/shellService.ts` (`refresh`, no re-read after a failed discovery), `src/extension.ts`, `commands.ts` | `shellService.test.ts` (incl. §8 failed discovery), host `shell.smoke.test.ts` (compiled; green on Windows and CI at `dc0077a`) | verified |
| AC-028 | T-006 | read-only services (no new writer) | `noWrite.test.ts`, `overviewService.test.ts` (AC-023), host `board.smoke.test.ts` (compiled, not run here) | verified |
| AC-029 | T-008, T-014 | texts in `src/shared/protocol/texts.ts` and `areas/overview/texts.ts`; the one `▸` left is `src/webview/areas/SpecExplorer.tsx` (excepted in the spec, PD-065) | `sourceScan.test.ts` (pins that file as the only one), `docsScan.test.ts`, literal assertions in the area tests | verified |
| AC-030 | T-009, T-014 | this plan's *Test-title audit* (corrected in T-014), `/tmp/audit-0018/titles.py` (not in the repo) | audit table above; Windows 11 at `dc0077a` (2026-11-18): `npm run test:unit` 1979 passed, 7 skipped, 12 timing, `npm test` 26 + 1 + 1 + 1; CI run 44246134800 at `dc0077a` green on ubuntu-latest and windows-latest; re-run at the fix head open (orchestrator) | verified (at `dc0077a`) |
| AC-031 | T-008, T-013 | — | manual: the orchestrator looked at Overview and Board in Dark, Light and High Contrast at 1400 px and at 640 px on 2026-11-18: one defect, V1 (at 640 px the Overview rows cut the title and the state, "Re…", "needs …"), fixed in T-013; the re-check after the fix is the orchestrator's; Gregor in a real window (release checklist) | built |

## Session handoff

- **Done so far:** T-001…T-009 verified (Baseline `a992d08`), T-009 ticked in S45 with the evidence of
  2026-11-18; the compile S44 found D1 (Refresh after a failed discovery), D2 (`▸` exception), D3 (strip
  count), four test gaps and the orchestrator's preview check found V1 (narrow Overview rows): fixed in
  T-010…T-014 (PD-065). Gates 1–5 and `compile-tests` green in the sandbox at the fix head: 1,989 unit
  tests passed, 3 skipped, timing 12. Windows 11 at `dc0077a`: `npm run test:unit` 1979 passed, 7 skipped,
  12 timing; `npm test` 26 + 1 + 1 + 1; CI run 44246134800 at `dc0077a` green on both runners.
- **Next action:** the orchestrator re-runs Windows (`npm run test:unit`, `npm test`) and CI at the fix head
  (product code changed in T-010, T-011, T-013) and re-checks Overview at 640 px in the preview harness
  (V1); Gregor reads PD-064 and PD-065 and checks a real window (release checklist); then a fresh
  `/sdd-compile` decides the move to done. Do not move 0018 before that.
- **Open decisions:** OP-002 (Gregor confirms the proxies, PD-064 and PD-065).
- **Baseline:** `a992d08` (HEAD at the start of implementation); fix session base `dc0077a`.
- **Environment:** `npm test` cannot run in the agent sandbox (VS Code download blocked); CI and Gregor's Windows machine run it.
