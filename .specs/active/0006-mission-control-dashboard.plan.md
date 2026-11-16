# Plan — Mission Control Dashboard

**Spec:** [0006-mission-control-dashboard.md](0006-mission-control-dashboard.md)
**Status:** In Progress
**Last updated:** 2026-11-16
**Current step:** T-003

## Approach

The host computes the dashboard. `src/core/missionControl` is a pure projection from 0002's
`ProjectRead`, 0003's `LifecycleModel` and status history, 0004's runs and store state and
0001's active project. It produces one serialisable `MissionControlView`, defined in
`src/shared/protocol/missionControl.ts`. A small service recomputes the view on every source
notification and pushes it through 0005's protocol. The webview area only renders that view and
builds navigation requests from it. So every rule (BR-01 to BR-09) is proven in plain-Node tests
on fakes. The webview tests prove rendering, freshness (AC-016), timing (AC-024) and the requests
sent (AC-012 to AC-014).

Order:
- First the run source (T-001): 0004's run-change notification already exists
  (`RuntimeStore.onDidChangeRuns`, added with the board), so T-001 only wraps it. Then, in sequence,
  the view contract and the spec figures (T-002).
- Then the rest of the core (T-003, T-004).
- Then the webview (T-005 to T-007).
- Last the host wiring, which depends most on 0005's real code (T-008).

No new dependency. Memory Bank files touched in T-008: `systemPatterns.md`, `techContext.md`,
and `activeContext.md` once this branch is the main session's.

**Approved 2026-11-16 (Gregor):** the plan; OP-4 (the diagnostics count opens the Spec Board with the
named set "Diagnostics"), OP-6, OP-8, OP-9, OP-10, OP-12 as recommended, readings p1 to p6; all are in the
spec (A-006 to A-012, BR-05, BR-08, AC-027 to AC-029). Work starts from the real code of 0005 and 0007;
deviations from what this plan assumed are in the steps' `Notes:`.

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` (from 0005 T-002) · `npm run test:unit` · `npm run compile`
(T-008). Pre-done gate on CI: `npm test` (host smoke `src/test/missionControl.smoke.test.ts`)
plus Gregor's manual checks (T-008).

## Research

- **Survey** (2026-11-16, worktree `spec-0006` at `2cf3cc8`; 0001 to 0004 built, 0005 planned
  only):
  - **Inputs as built.**
    - `LifecycleService.model()` / `onDidChange` (`src/core/lifecycle/lifecycleService.ts`): the
      listener fires after the history append of that refresh, so a history read afterwards
      sees it.
    - `LifecycleEntry` carries key, stem, number, folder, state, rule, `derivedLabel`,
      diagnostics (own files plus contradictions) and `deprecated`. It carries no title and no
      spec status, so the projection joins by `key` to `ProjectRead.specs[]`:
      `parsed.title.value`, `parsed.status.value`.
    - `LifecycleModel.projectDiagnostics` holds only diagnostics scoped `'project'`. The spec's
      project-level set also includes file diagnostics on no entry's own files (an orphan
      plan). The projection computes that set from `ProjectRead.diagnostics` and the own-file
      rule of `entryContext.ts`.
    - `lifecycle.history()` gives a `HistoryView`: `{ available: false, text }` (AC-024 of
      0003) or the entries with `observedAt`, `stem`, `old`, `new` and `cause.kind`
      (`files | first-observed | changed-while-not-running | no-longer-observed`).
    - `RuntimeSession.current()` / `state()` / `onDidChangeState`; `RuntimeStore.listRuns()` →
      `ReadResult<RunView[]>`. `RunView` has `status`, `statusHistory[{status, at}]`,
      `created`, `spec.stem`, `historyUnreadable`, `errorMessage` and `result`.
    - `DiscoverySnapshot.active` gives `name`, `version` and `legacy`. 0001 already reports the
      version as "unknown" for legacy and empty values.
    - None of these sources holds a "last model update" time. The service stamps
      `ClockPort.now()` when it receives a lifecycle notification (OP-3 reading c).
  - **Gap in 0004 (additive change, T-001).** The store notifies only state changes
    (`onDidChangeState`). Nothing tells a consumer that a run was created, changed status or was
    removed, but AC-015 and AC-016 need that. T-001 adds `onDidChangeRuns` to `RuntimeStore` and
    `RuntimeSession`, the same kind of additive change as 0005 T-005 on 0001's controller.
    0004's tests stay green. A reader window (PD-030) only re-reads on its poll, so a live update
    there is not promised (OP-7 recommendation).
  - **Unreadable runs (OP-6).** For a run with unreadable history, 0004 builds a placeholder
    view with status `Starting`, stem `''` and `created ''` (`runtimeStore.ts`, around
    line 190). Counted naively, it would raise *Running*, which breaks P8. The plan takes the
    OP-6 recommendation: such a run is not counted, is never a latest run, and the run section
    shows "1 run unreadable". 0004 needs no change.
  - **0005 extension points (from its plan; not in this checkout).**
    - Area registry: `src/webview/areas/registry.tsx`.
    - `useShell().navigate({ area, target })`. The target is
      `{ kind: 'spec', stem, path? } | { kind: 'run', id } | { kind: 'boardFilter', filter: JsonValue }`,
      and 0007 validates the filter.
    - New message types go into `src/shared/protocol/messages.ts`, under one envelope with
      `seq`.
    - `runAction showOutput` already exists for S5.
    - The notice text X-10 is in `src/shared/protocol/texts.ts`.
    - 0005's reading (h): for a vanished stem, 0006 sends no request, so the area shows X-10
      itself.
    - Main is merged in before T-001. T-002, T-005, T-007 and T-008 read the real 0005 files
      and adapt names; any deviation goes into the step's `Notes:`.
  - **Board filter encoding (PD-041, shared with 0007, planned in parallel).** T-007 adds
    `src/shared/protocol/boardFilter.ts`:
    `{ kind: 'state', state } | { kind: 'specSet', label, stems }`, plus a guard. The state
    words sit in `BOARD_STATES` in shared code, because shared code imports nothing; a core test
    pins them to `LIFECYCLE_STATES`. If 0007's plan defines another shape, the file that lands
    first wins and the other plan adapts.
  - **Planning rule for open points** (as in plan 0005): where the spec has text, the plan
    follows the text. Where the spec leaves a point open, the plan takes its recommendation as a
    working assumption: OP-6, OP-8 (with zero specs, header, run section and activity stay), OP-9
    (a 0 sends its request; "not available" cannot be activated), OP-10 (attention by ascending
    number then path, reasons (a) to (e); highlighted runs newest status first; no cap) and OP-12
    (fixture: 200 specs, 5 runs per spec, 1,000 history entries). OP-4 keeps the spec text: the
    diagnostics count opens the Output channel. OP-5 keeps the spec text: reason (d) is a
    contradiction or an unreadable spec file only. OP-7 is not planned. OP-2 and OP-11 are not
    plan matters. **On approval, the accepted answers go into the spec (revise mode) before
    T-001.**
  - **Readings this plan adds (say if one is wrong):**
    - (p1) BR-09 per source: run values are "not available" when the store is unavailable or
      `listRuns` is not available; *Recent activity* is "not available" when the store or the
      status history is not available. A read-only store counts as available.
    - (p2) An activity entry of a duplicated stem shows the title of the first entry in key
      order and sends the spec request without a path.
    - (p3) A highlight with a duplicated stem holds while at least one entry with that stem is
      not Done.
    - (p4) The latest-run tie on equal `created` goes to the higher run ID.
    - (p5) Times are local `YYYY-MM-DD HH:mm` (spec §9 leaves the format to the plan).
    - (p6) The service computes only while someone listens (the panel is open), so a closed
      panel causes no store reads.
  - **PD check.** PD-004, PD-005, PD-024, PD-036 to PD-047 are cited by the spec and consistent
    with it. The register ends at PD-047, so no PD is newer than the spec's revision. `done/` is
    empty, so no spec is invalidated.
  - **Fakes available.**
    - `src/core/lifecycle/testing/projects.ts`: `readMemory`, `specText`, `planText`,
      `noteText`.
    - `fakeHistoryStore.ts`.
    - `src/core/runtime/testing/memoryMedium.ts`, `fakes.ts` (clock, IDs).
    - `src/core/specs/testing/generateProject.ts` (200 specs, temp dir).
    - `src/core/discovery/testing/fakeHost.ts`, `snapshotTree.ts`.
  - **Environment.** The worktree has no `node_modules`. Before T-001, `npm ci` installs from
    the lock file; nothing new is added.
- **Code reality (2026-11-16, HEAD `88963b8`; supersedes the survey where they differ):**
  - **Run notification exists.** `RuntimeStore.onDidChangeRuns(listener)` (0004 AC-030,
    `src/core/runtime/runtimeStore.ts`, contract `testing/contractRunChanges.ts`) fires for created
    runs, reported statuses, `clear` with removals and a writer takeover. `RuntimeSession` has no such
    member; the board follows `session.current()?.onDidChangeRuns` itself (`boardService.ts`, `follow`).
    T-001 is adjusted: no change in `src/core/runtime`; the dashboard gets a small run source.
  - **Model source.** `ShellModelSource` (`src/core/ports/shell.ts`: `current(): { project, lifecycle }`,
    `onDidChange`) is the model input, as for the board. The service takes
    `{ source, discovery, session, history, clock }`, not repository and lifecycle service. `history` is
    `{ read(): Promise<HistoryView>; onDidChange }` as in `BoardServiceDeps`. Name and version come from
    `DiscoveryController.snapshot().active` (`DiscoveredFolder.name`, `.version`, "unknown" for legacy).
    The project-level diagnostic count is `buildBanner(project, lifecycle).length` of the board
    (`src/core/board/cards.ts`): the same rule as the plan's own-file rule, one source.
  - **Board filter is 0007's.** `src/shared/protocol/boardFilter.ts`: `BoardFilter = { states?, providers?,
    set?: { label, stems } }`, guard `isBoardFilter`, `BOARD_STATES`. A state count sends
    `{ kind: 'boardFilter', filter: { states: [state] } }`; Needs attention and Diagnostics send
    `{ set: { label, stems } }`. T-007 adds no `boardFilter.ts`; this plan's `kind: 'state' | 'specSet'`
    encoding is dropped.
  - **Event transport.** Board, detail and move result travel as `evt` without `seq`
    (`studioPanel.ts`, `client.ts`); only `shell` is seq-ordered. The dashboard view follows the board's
    pattern: `evt missionControl`, pushed on `hello` and on change, held in the client snapshot, guarded in
    `messages.ts`; the view guard is in `src/shared/protocol/missionControl.ts`.
  - **Registry and frame.** `src/webview/areas/registry.tsx` holds `specBoard` and `specExplorer`;
    `AREAS` in `areas.ts` still flags `missionControl` as `placeholder: true` and 0005's tests pin it. T-005
    flips the flag and adjusts those tests. `App.tsx` already shows the `<h1>` and the project name.
  - **Notice for a vanished stem.** `noticeText(number)` in `src/shared/protocol/texts.ts`; the shell's
    `NoticeBar` is host-driven, so the dashboard shows its own dismissable `role="status"` line (0005 reading h).
  - **Host.** `createStudioPanel` takes a `board: PanelBoard` dep; the dashboard gets a sibling dep
    `missionControl: { view(); onDidChangeView }`. `extension.ts` composes with `modelSource`, `session`,
    `lifecycle.history()`; `StudioApi.missionControl()` is added for host tests.
  - **Test helpers reused.** `src/core/board/testing/boardWorld.ts` (`createFakeSource`, `createFakeStore`,
    `run`, `createFakeHistory`, `modelOf`).
- [WAI-ARIA APG — Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) — a focused
  button is activated by both Enter and Space. So every drill-down element is a native
  `<button type="button">` and AC-022 rests on native activation — retrieved 2026-11-16
- [MDN — `<button>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button)
  — a non-disabled button is focusable; do not override the focus ring (the visible focus uses
  0005's `--vscode-focusBorder`) — retrieved 2026-11-16
- jsdom fires no activation behaviour for synthetic key events (they are untrusted). The tests
  therefore check that each element is a native button reachable in tab order, and dispatch
  `click`. Enter and Space are added in the hands-on run. If 0005 T-002 has set a key helper,
  the tests use it. UNVERIFIED against an official jsdom page; the search found no
  authoritative source — 2026-11-16
- [Plan 0005](0005-studio-shell-navigation.plan.md) *Approach*, *Research*, T-001, T-004, T-007
  — the extension points above — read 2026-11-16

## Texts (English, PD-016; in `src/webview/areas/missionControl/texts.ts`)

| ID | Where | Text | Basis |
| --- | --- | --- | --- |
| M-01 | header | `<folder name>` · `FeatherSpec <version>` · `Model updated <time>` · button `<n> project diagnostics` (`1 project diagnostic`) | AC-017 |
| M-02 | spec counts | heading `Specs` · `Total <n>` · `<State> <n>` · `derived · <rule ID>` on Ready, Review and Blocked · `of which Deprecated: <n>` | BR-02, AC-025 |
| M-03 | progress | `Progress <p> % (<done> of <divisor>)` · `Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down` · `Progress: not available` | BR-04, AC-004 |
| M-04 | run section | heading `Agent runs` · `Running <n>` · row `<number> <title> — Failed` or `— Interrupted` · `<stem> — spec not found` · `No failed or interrupted runs.` · `<n> run(s) unreadable` · `Run data not available: <reason>` | BR-05, BR-06, OP-6 |
| M-05 | attention | heading `Needs attention (<n>)` · reasons `Blocked` · `Run failed` · `Run interrupted` · `Waiting for you` · `Diagnostic` · `Review pending` · `Nothing needs attention.` · `Run-based reasons not available: <reason>` | BR-01, BR-09 |
| M-06 | activity | heading `Recent activity` · `<time> · <number> <title> · <Old> → <New>` · suffix `(changed while Studio was not running)` · `no longer observed` · `Run: <status words>` · `No recent activity.` · `Recent activity not available: <reason>` | BR-07 |
| M-07 | zero specs | `No specs yet. Run /sdd-specify to write the first one.` | AC-020, OP-8 |
| M-08 | values | missing title `not available`; status words `Starting` · `Running` · `Waiting for approval` · `Waiting for input` · `Completed` · `Failed` · `Cancelled` · `Interrupted` | BR-09 |
| — | notice | X-10 from `src/shared/protocol/texts.ts` (`Spec <number> is no longer in the project`) | PD-039, AC-014 |

## Stages

1. T-001 ‖ T-002 — the run source (wrapping the existing run-change notification), and the view contract with the spec figures
2. T-003 → T-004 — the rest of the core: run figures, attention, activity, dashboard service
3. T-005 → T-006 → T-007 — the webview area: transport and header, the other sections, drill-down
4. T-008 — host wiring, host smoke, docs sync and final gates

Parallel: stage 1 (T-001 and T-002 add new files in `src/core/missionControl` and, for T-002,
`src/shared/protocol` only; each has its own test file). Stages 2
and 3 share only T-002's contract and could run side by side in two worktrees. All slices are
small, so the recommendation is to run them in sequence.

## Steps

### T-001 — Run source: the run-change notification of 0004, followed by the dashboard

- **Covers:** AC-015, AC-006, AC-018
- **Files:** `src/core/missionControl/runSource.ts`, `src/core/missionControl/runSource.test.ts`
- **Do:**
  - Adjusted 2026-11-16 (Gregor: the notification was added meanwhile by the board work): nothing is
    added to `src/core/runtime`. `RuntimeStore.onDidChangeRuns` is used as it is.
  - `createRunSource({ session })` with `session` a `Pick<RuntimeSession, 'state' | 'onDidChangeState'>`
    plus `current(): Pick<RuntimeStore, 'listRuns' | 'onDidChangeRuns' | 'state'> | undefined`:
    - `read(): Promise<RunsRead>`, `RunsRead = { available: true; runs: RunView[] } | { available: false; reason: string }`;
      no store gives the session state's reason or `no store`; a store state `unavailable` or an
      unavailable `listRuns` is `available: false` with its reason; a read-only store counts as available
      (reading p1); a throwing `listRuns` is `available: false`;
    - `onDidChange(listener)`: fires on the current store's `onDidChangeRuns` and on
      `session.onDidChangeState`; it re-follows the store on every read and drops the old subscription when
      the store object changed; a throwing listener is isolated.
  - Tests (named with AC IDs):
    - AC-015: a created run and a status change fire once each and the next `read()` shows them (real memory
      store of the 0004 harness, provider ID `fake`);
    - a store switch moves the subscription, the old store's changes arrive no more (negative control);
    - AC-018: unavailable store, no store and a throwing `listRuns` give `available: false` with a reason; a
      read-only store stays available;
    - a throwing listener does not stop a second one.
- **Verify:** `npx vitest run src/core/missionControl` plus the per-step gates
- [x] **Verified (T-001):** 2026-11-16 — red: `npx vitest run src/core/missionControl` 10 failed (`createRunSource` stub threw `Not implemented`); green: 1 file, 10/10 after the run source landed (includes the negative controls: listener disposed, old store after a switch, read-only store available). Gates: eslint 0, `tsc --noEmit` 0, `tsc --noEmit -p src/webview` 0, `npm run test:unit` 77 files, 1129 passed.
- **Notes:** Replaces the original T-001 (a store and session change); see *Code reality*. Added `testing/runtimeWorld.ts` (memory store, fake session). The source subscribes upstream only while it has a listener (reading p6) and re-follows the store on every read, as the board does.


### T-002 — View contract, header and spec figures

- **Covers:** AC-001, AC-002, AC-003, AC-004, AC-017, AC-019, AC-020, AC-025
- **Files:** `src/shared/protocol/missionControl.ts`, `src/shared/protocol/missionControl.test.ts`,
  `src/core/missionControl/specFigures.ts`, `src/core/missionControl/specFigures.test.ts`,
  `src/core/missionControl/testing/world.ts`
- **Do:**
  - `missionControl.ts` defines the whole `MissionControlView`, so stages 2 and 3 share one
    contract:
    - `header`: name, version, updatedAt, projectDiagnostics, `diagnosticStems` (the stems of the specs
      that carry a diagnostic, for the Diagnostics request, A-012);
    - `specs`: `{ kind: 'empty' }` or the counts per state with rule ID where derived,
      deprecated, total, and `progress` as a value or `'not available'`;
    - `runs`: `{ available: false, reason }` or running, `singleRunId?`, highlighted rows,
      unreadable;
    - `attention`: rows with reasons, and `runReasons` as available or a reason;
    - `activity`: `{ available: false, reason }` or entries;
    - a spec reference `{ stem, number, title: string | null, path?, found }`.

    It has no field for error text, prompt or payload (AC-026 by construction). It uses `BoardState` of
    0007's `boardFilter.ts` and defines no filter encoding. Its guard `isMissionControlView` is
    hand-written and strict: an unknown key is refused, so no extra field can reach the DOM.
  - `specFigures.ts`:
    - `projectSpecFigures(project, model)` counts each entry in its state. Done carries the
      Deprecated count. Ready, Review and Blocked carry their rule IDs.
    - Progress follows BR-04: ⌊100 × done ÷ divisor⌋ with both numbers, or `'not available'`
      when the divisor is 0.
    - Zero entries → `empty`.
    - `projectHeader(active, model, updatedAt)`: the version as 0001 reports it. The project-level count
      is `buildBanner(project, lifecycle).length` of the board.
    - The title is `null` unless `parsed.title` has a value.
  - `testing/world.ts` builds a `ShellModel` (`modelOf` of 0007's `boardWorld`) and run and history builders.
  - Tests, named with AC IDs:
    - the AC-001 fixture (9 specs, Done 3 of which Deprecated 1) and the AC-003 fixture
      (25 %, 2 of 8);
    - a `done/` spec with status `In Progress` counts in the divisor only;
    - divisor 0 → not available;
    - zero specs → `empty`;
    - legacy version "unknown";
    - an orphan plan diagnostic counts as project-level;
    - a missing title → `null`;
    - `diagnosticStems`: an entry with an `unknown-content` diagnostic is in it, one without any
      diagnostic is not (A-012);
    - the guard accepts a built view and rejects one with an extra key or a wrong type.
- **Verify:** `npx vitest run src/core/missionControl` plus the per-step gates
- [x] **Verified (T-002):** 2026-11-16 — red: `npx vitest run src/core/missionControl/specFigures.test.ts src/shared/protocol/missionControl.test.ts` 14 failed (`projectSpecFigures`, `projectHeader` and `isMissionControlView` stubs threw `Not implemented`); green: 2 files, 14/14 (one test fixture of mine put the unknown header line after a blank line, so no unknown-content diagnostic arose; fixed in the helper). Gates: eslint 0, `tsc --noEmit` 0, `tsc --noEmit -p src/webview` 0, `npm run test:unit` 79 files, 1143 passed.
- **Notes:** Deviations: the project-level count is `buildBanner(project, lifecycle).length` of the board (same rule, one source); `projectHeader(active, model, updatedAt)` takes no separate `project`. The spec reference builder and the title-`null` test move to T-003, where references are first built. The sample view for later tests is `src/shared/protocol/testing/missionControlSample.ts`; spec fixtures are `src/core/missionControl/testing/projects.ts`.


### T-003 — Run figures, highlighted runs and the attention list

- **Covers:** AC-005, AC-007, AC-008, AC-009, AC-018, AC-026, AC-027
- **Do:**
  - `src/core/missionControl/runFigures.ts`: `projectRuns(runs | unavailable, model, project)`.
    - Unreadable runs are left out and counted (OP-6).
    - *Running* counts open statuses, stems without a current entry included.
    - `singleRunId` is set while the count is 1.
    - The latest run per stem is decided by `created`; reading p4 breaks ties.
    - A run is highlighted when it is the latest of its stem, its status is `Failed` or
      `Interrupted`, and (reading p3) its stem has an entry that is not Done. A stem with no
      current entry is listed as `found: false`.
    - `Cancelled` never.
    - Ordered newest status first.
  - `attention.ts`: `projectAttention(model, project, runFacts)` applies reasons (a) to (e) per
    entry, in that order:
    - (b) is the entry's stem highlighted;
    - (c) is any run of the stem in `WaitingForApproval` or `WaitingForInput`;
    - (d) is a `lifecycle-contradiction` or an `unreadable-file` diagnostic on the spec's own
      key.

    No row is created for an unmatched stem. Rows go by number, then key. With runs
    unavailable: reasons (a), (d) and (e) only, plus `runReasons: { available: false, reason }`.
  - Tests:
    - the AC-005 G/W/T;
    - a newer run ends the highlight;
    - a Done spec is not highlighted;
    - a removed run is gone;
    - a `Cancelled` run is never highlighted;
    - a vanished stem gives `spec not found` and no attention row;
    - the AC-008 G/W/T (a Backlog spec without a plan is not listed; a Review spec is listed);
    - Blocked plus a failed latest run → one row with both reasons;
    - AC-009: `unknown-content` does not count;
    - AC-018: with the store unavailable the spec-based reasons stay and the run values carry
      the reason;
    - an unreadable run is not counted;
    - AC-026: a run with `errorMessage` `SECRET-1` and a `result` payload → `JSON.stringify(view)`
      contains neither.
- **Verify:** `npx vitest run src/core/missionControl` plus the per-step gates
- [ ] **Verified (T-003):** —
- **Notes:** —

### T-004 — Recent activity and the dashboard service

- **Covers:** AC-006, AC-010, AC-011, AC-015, AC-018, AC-023, AC-024
- **Do:**
  - `src/core/missionControl/activity.ts`: `projectActivity(history, runs, project)`.
    - Spec entries are taken with cause `files` (old and new set), `changed-while-not-running`
      or `no-longer-observed`; never `first-observed`.
    - Run entries are taken from `statusHistory` with every status except `Running`.
    - Order: newest first; on equal times, spec entries before run entries, then ascending
      number; at most 10.
    - The stem is resolved to number and title (reading p2), or `found: false`.
    - Reading p1 decides when the list is not available.
  - `missionControlService.ts`:
    - `createMissionControlService({ source, discovery, session, history, clock })` (the deps of
      `BoardServiceDeps`, plus `discovery: Pick<DiscoveryController, 'snapshot' | 'onDidUpdate'>` and
      `clock: ClockPort`) with `view()`, `onDidChangeView`, `whenIdle()` and `dispose()`.
    - Its deps are read-only `Pick`s (no write method reachable, AC-023) and it takes no trust
      input (same content in Restricted Mode).
    - It subscribes to the sources only while it has a listener (reading p6), then recomputes on
      `source.onDidChange` (and stamps `updatedAt`), `history.onDidChange`, `discovery.onDidUpdate` and
      the run source. Notifications that arrive during a recompute are coalesced into
      one more recompute.
    - It assembles the view from T-002 and T-003.
  - Tests:
    - activity: the filter, the cap at 10, fewer than 10, the tie order, no `first-observed`, a
      vanished stem;
    - AC-011: events appended through the store change nothing;
    - service on fakes:
      - AC-006: a run created or changed leaves the spec figures equal; a spec state change
        leaves *Running* equal;
      - AC-015: a file change, a run change and a store state change each yield a new view
        without a reopen;
      - AC-018: an unavailable store gives activity "not available" with its reason;
      - no source reads while there is no listener;
    - AC-024 guard: `generateProject` with 200 specs plus 1,000 runs and 1,000 history entries →
      the projection takes < 1000 ms.
- **Verify:** `npx vitest run src/core/missionControl` plus the per-step gates
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Webview area: transport, header and spec figures

- **Covers:** AC-016, AC-017, AC-019, AC-020, AC-024, AC-025, AC-028
- **Do:**
  - `src/shared/protocol/messages.ts`: a host event `missionControl { view }` (no `seq`, like `board`;
    see *Code reality*) with `isMissionControlEventPayload`; the view guard is T-002's.
  - `src/webview/client.ts`: a valid `missionControl` event is held in the snapshot; `useMissionControl()`
    in `src/webview/areas/missionControl/store.ts` reads it, as `useBoard` does. An invalid one is
    ignored, and the view stays as it was.
  - `src/shared/protocol/areas.ts`: `missionControl` is no placeholder any more; 0005's tests that pin it
    are adjusted.
  - `src/webview/areas/missionControl/`:
    - `MissionControl.tsx`, registered in `areas/registry.tsx`;
    - `texts.ts` (M-01 to M-08);
    - `format.ts`, local `YYYY-MM-DD HH:mm` (reading p5);
    - `Header.tsx`, `SpecFigures.tsx`.
    - Before the first view: 0005's loading text in the area.
    - With zero specs: M-07 in place of counts, progress and attention.
  - Tests in `src/webview/areas/missionControl/*.test.tsx`:
    - header values, "unknown" version, a missing title as `not available`;
    - the derived label with its rule ID;
    - progress with formula, and "not available";
    - zero specs → M-07;
    - an invalid event is ignored;
    - AC-016: a new event is in the DOM within 500 ms of the message event;
    - AC-024: a generated 200-spec view (5 runs per spec, 1,000 history entries, helper
      `testing/bigView.ts`) renders within 1000 ms of the message event.
- **Verify:** `npx vitest run src/webview src/shared` plus the per-step gates
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Webview area: runs, attention and activity sections

- **Covers:** AC-005, AC-007, AC-008, AC-010, AC-018, AC-021, AC-026
- **Do:**
  - `RunSection.tsx`, `Attention.tsx`, `Activity.tsx` per M-04 to M-06.
  - Every state, reason and status is a text node; colour is a CSS addition only (classes with
    `--vscode-*` variables).
  - An empty list keeps its heading and its empty text.
  - "Not available" shows with the reason, and the attention list keeps its spec-based rows plus
    the line.
  - Tests:
    - AC-021: each state word, reason and run status appears as text; no element carries meaning
      by colour alone (no text-less status element);
    - AC-018: "not available" plus the reason, never `0` or an empty list;
    - `spec not found` rows;
    - the activity list shows exactly the entries of the view and no "more" control;
    - AC-026: the DOM text holds no field beyond the contract (a view fixture with the T-003
      `SECRET-1` run).
- **Verify:** `npx vitest run src/webview` plus the per-step gates
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — Drill-down by navigation request

- **Covers:** AC-012, AC-013, AC-014, AC-017, AC-022, AC-029
- **Do:**
  - `src/webview/areas/missionControl/requests.ts`, pure: element → `NavigationRequest`, with 0007's
    filter shape unchanged (`src/shared/protocol/boardFilter.ts`).
    - Total → Spec Board.
    - A state → `{ kind: 'boardFilter', filter: { states: [state] } }`.
    - Attention heading or count → `{ kind: 'boardFilter', filter: { set: { label: 'Needs attention', stems } } }`,
      with the stems of exactly the listed rows.
    - The diagnostics count → `{ kind: 'boardFilter', filter: { set: { label: 'Diagnostics', stems: header.diagnosticStems } } }`
      (Gregor's OP-4 answer; replaces `runAction showOutput`).
    - An attention row → Spec Explorer `{ stem, path? }`, with the path while the stem is
      duplicated.
    - *Running* → Agent Center, with `singleRunId` as the target while set.
    - A highlighted run → its ID.
    - An activity entry → Spec Explorer, or for `found: false` no request and X-10 shown in the
      area (`role="status"`, dismissable).
    - Each element is a native `<button type="button">` that calls `useShell().navigate`. A
      value of 0 is still a button; a "not available" value is plain text (OP-9).
  - Tests:
    - one request per element, with the exact payload (AC-012 to AC-014);
    - a vanished stem sends nothing and shows the notice;
    - the diagnostics count sends the Diagnostics set and no `runAction`;
    - every request payload passes `isNavigationRequest` (the shared guard of 0005);
    - AC-022: every drill-down element is a `button`, not disabled, without `tabindex="-1"`, in
      DOM order; Enter and Space per *Research*;
    - a 0 count still sends its request, a "not available" value has no control (AC-029).
- **Verify:** `npx vitest run src/webview src/shared` plus the per-step gates
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — Host wiring, host smoke; docs sync and final gates

- **Covers:** AC-015, AC-023; AC-001 … AC-029 re-proven by the full gate run
- **Do:**
  - `src/extension.ts`: compose `createMissionControlService` from `modelSource`, controller, session,
    `lifecycle.history()` and the clock. Add `StudioApi.missionControl()` (view and change listener) for
    host tests.
  - `src/adapters/vscode/studioPanel.ts`: a dep `missionControl: { view(); onDidChangeView(listener) }`;
    on `hello`, send the current view after the board view; on change, send `evt missionControl` (no
    `seq`). Subscribe while the panel exists, so the service computes only while the panel is open (p6).
  - Host smoke `src/test/missionControl.smoke.test.ts` (CI):
    - AC-015: the fixture project's view matches its files; writing a spec file into the temp
      workspace, then `runtimeStore().createRun({ providerId: 'fake', … })`, then
      `reportStatus(… 'Failed')` each update the view without a reopen;
    - AC-023: `snapshotTree` of the workspace equals its state before plus only the test's own
      writes.
  - Docs sync:
    - `architecture:` in `AGENTS.md`, these entries only (the runtime line already names the run-change
      notification):
      - new `'src/core/missionControl — Mission Control projection: header, spec figures, progress, run source, run figures, attention list, recent activity, dashboard service (spec 0006)'`;
      - the `src/webview` line + `, Mission Control area (spec 0006)`;
      - the `src/shared/protocol` line + `, Mission Control view (spec 0006)`.
    - `systemPatterns.md`:
      - the host computes the dashboard as one serialisable view, and the webview only renders
        it;
      - the service computes only while it is listened to;
      - `onDidChangeRuns` is the run-change source for every area;
      - the attention and diagnostics drill-downs reuse 0007's named-set filter;
      - area texts in one file per area.
    - `techContext.md`:
      - tests: `src/core/missionControl`, the webview area, the new smoke file;
      - manual checks: AC-021 in High Contrast, AC-022 focus with Enter and Space, the §9 layout.
    - `README.md`: one Mission Control line.
    - `activeContext.md`.
- **Verify:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile`
- [ ] **Verified (T-008):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-002 | src/core/missionControl/specFigures.ts:projectSpecFigures | specFigures.test.ts (AC-001) | verified |
| AC-002 | T-002 | specFigures.ts:projectSpecFigures | specFigures.test.ts (AC-002) | verified |
| AC-003 | T-002 | specFigures.ts:projectSpecFigures | specFigures.test.ts (AC-003, rounding, PD-021) | verified |
| AC-004 | T-002 | specFigures.ts:projectSpecFigures | specFigures.test.ts (AC-004) | verified |
| AC-005 | T-003, T-006 | — | — | open |
| AC-006 | T-001, T-004 | — | — | open |
| AC-007 | T-003, T-006 | — | — | open |
| AC-008 | T-003, T-006 | — | — | open |
| AC-009 | T-003 | — | — | open |
| AC-010 | T-004, T-006 | — | — | open |
| AC-011 | T-004 | — | — | open |
| AC-012 | T-007 | — | — | open |
| AC-013 | T-007 | — | — | open |
| AC-014 | T-007 | — | — | open |
| AC-015 | T-001, T-004, T-008 | — | deciding: host smoke on CI | open |
| AC-016 | T-005 | — | — | open |
| AC-017 | T-002, T-005, T-007 | — | — | open |
| AC-018 | T-001, T-003, T-004, T-006 | — | — | open |
| AC-019 | T-002, T-005 | — | — | open |
| AC-020 | T-002, T-005 | specFigures.ts (empty form) | specFigures.test.ts (AC-020); rendering in T-005 | built |
| AC-021 | T-006 | — | + manual: Gregor, High Contrast | open |
| AC-022 | T-007 | — | + manual: Gregor, focus, Enter and Space | open |
| AC-023 | T-004, T-008 | — | — | open |
| AC-024 | T-004, T-005 | — | — | open |
| AC-025 | T-002, T-005 | specFigures.ts (derivedRule) | specFigures.test.ts (AC-025) | built |
| AC-026 | T-002, T-003, T-006 | — | — | open |
| AC-027 | T-003, T-006 | — | — | open |
| AC-028 | T-005 | — | — | open |
| AC-029 | T-007 | — | — | open |

## Session handoff

- **Done so far:** T-001 (run source) and T-002 (view contract, spec figures, header) ticked; 1143 unit tests green.
- **Next action:** T-003: run figures, highlighted runs, attention list (`src/core/missionControl`), then T-004, stage 3 (webview) and T-008.
- **Open decisions:** none blocking. Gregor's manual checks (spec §14): AC-021 in a High Contrast theme, AC-022 focus with Enter and Space, the §9 layout in the hands-on run.
- **Baseline:** `1ba50ff` (HEAD before the first step commit of this plan).
- **Environment:** `npm test` cannot run in the sandbox (VS Code download blocked); CI runs it. `node_modules` is installed; no dependency is added.
