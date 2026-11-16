# Plan — Mission Control Dashboard

**Spec:** [0006-mission-control-dashboard.md](0006-mission-control-dashboard.md)
**Status:** Not started
**Last updated:** 2026-11-16
**Current step:** T-001

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
- First the one missing source contract: 0004 has no run-change notification (T-001, additive).
  In parallel, the view contract and the spec figures (T-002).
- Then the rest of the core (T-003, T-004).
- Then the webview (T-005 to T-007).
- Last the host wiring, which depends most on 0005's real code (T-008).

No new dependency. Memory Bank files touched in T-008: `systemPatterns.md`, `techContext.md`,
and `activeContext.md` once this branch is the main session's.

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

1. T-001 ‖ T-002 — the source notification for runs, and the view contract with the spec figures
2. T-003 → T-004 — the rest of the core: run figures, attention, activity, dashboard service
3. T-005 → T-006 → T-007 — the webview area: transport and header, the other sections, drill-down
4. T-008 — host wiring, host smoke, docs sync and final gates

Parallel: stage 1 (T-001 changes `src/core/runtime` only; T-002 adds new files in
`src/core/missionControl` and `src/shared/protocol` only; each has its own test file). Stages 2
and 3 share only T-002's contract and could run side by side in two worktrees. All slices are
small, so the recommendation is to run them in sequence.

## Steps

### T-001 — Run-change notification in the runtime store and session

- **Covers:** AC-015, AC-006
- **Files:** `src/core/runtime/runtimeStore.ts`, `src/core/runtime/runtimeSession.ts`,
  `src/core/runtime/runChanges.test.ts`
- **Do:**
  - `RuntimeStore.onDidChangeRuns(listener: () => void): Disposable` fires after each of these
    succeeds:
    - `createRun`;
    - `reportStatus`;
    - `clear` with at least one removal;
    - a writer takeover that re-classified runs or removed runs by age.

    A throwing listener is isolated. The store fires no notification for events, for
    spec-history appends or for refused writes.
  - `RuntimeSession.onDidChangeRuns` follows the current store, re-subscribes on a store
    switch and drops the old subscription.
  - Tests (named with AC-015):
    - each of the four triggers fires once;
    - `appendEvent`, `appendSpecStatusEntry` and a refused `reportStatus` fire nothing;
    - after a project switch only the new store's changes arrive;
    - a throwing listener does not stop a second one.
- **Verify:** `npm run test:unit -- src/core/runtime` plus the per-step gates
- [ ] **Verified (T-001):** —
- **Notes:** —

### T-002 — View contract, header and spec figures

- **Covers:** AC-001, AC-002, AC-003, AC-004, AC-017, AC-019, AC-020, AC-025
- **Files:** `src/shared/protocol/missionControl.ts`, `src/core/missionControl/specFigures.ts`,
  `src/core/missionControl/specFigures.test.ts`, `src/core/missionControl/testing/world.ts`
- **Do:**
  - `missionControl.ts` defines the whole `MissionControlView`, so stages 2 and 3 share one
    contract:
    - `header`: name, version, updatedAt, projectDiagnostics;
    - `specs`: `{ kind: 'empty' }` or the counts per state with rule ID where derived,
      deprecated, total, and `progress` as a value or `'not available'`;
    - `runs`: `{ available: false, reason }` or running, `singleRunId?`, highlighted rows,
      unreadable;
    - `attention`: rows with reasons, and `runReasons` as available or a reason;
    - `activity`: `{ available: false, reason }` or entries;
    - a spec reference `{ stem, number, title: string | null, path?, found }`.

    It has no field for error text, prompt or payload (AC-026 by construction). `BOARD_STATES`
    sits in the same file.
  - `specFigures.ts`:
    - `projectSpecFigures(project, model)` counts each entry in its state. Done carries the
      Deprecated count. Ready, Review and Blocked carry their rule IDs.
    - Progress follows BR-04: ⌊100 × done ÷ divisor⌋ with both numbers, or `'not available'`
      when the divisor is 0.
    - Zero entries → `empty`.
    - `projectHeader(active, project, model, updatedAt)`: the version as 0001 reports it. The
      project-level count is the diagnostics scoped `'project'`, plus file diagnostics on no
      entry's own files.
    - The title is `null` unless `parsed.title` has a value.
  - `testing/world.ts` builds `ProjectRead` and `LifecycleModel` from `readMemory`.
  - Tests, named with AC IDs:
    - the AC-001 fixture (9 specs, Done 3 of which Deprecated 1) and the AC-003 fixture
      (25 %, 2 of 8);
    - a `done/` spec with status `In Progress` counts in the divisor only;
    - divisor 0 → not available;
    - zero specs → `empty`;
    - legacy version "unknown";
    - an orphan plan diagnostic counts as project-level;
    - a missing title → `null`;
    - `BOARD_STATES` equals `LIFECYCLE_STATES`.
- **Verify:** `npm run test:unit -- src/core/missionControl` plus the per-step gates
- [ ] **Verified (T-002):** —
- **Notes:** —

### T-003 — Run figures, highlighted runs and the attention list

- **Covers:** AC-005, AC-007, AC-008, AC-009, AC-018, AC-026
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
- **Verify:** `npm run test:unit -- src/core/missionControl` plus the per-step gates
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
    - `createMissionControlService({ discovery, repository, lifecycle, session, clock })` with
      `view()`, `onDidChangeView`, `whenIdle()` and `dispose()`.
    - Its deps are read-only `Pick`s (no write method reachable, AC-023) and it takes no trust
      input (same content in Restricted Mode).
    - It subscribes to the sources only while it has a listener (reading p6), then recomputes
      on `lifecycle.onDidChange` (and stamps `updatedAt`), `session.onDidChangeState` and
      `session.onDidChangeRuns`. Notifications that arrive during a recompute are coalesced into
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
- **Verify:** `npm run test:unit -- src/core/missionControl` plus the per-step gates
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Webview area: transport, header and spec figures

- **Covers:** AC-016, AC-017, AC-019, AC-020, AC-024, AC-025
- **Do:**
  - `src/shared/protocol/messages.ts`: a host event `missionControl { view }` in 0005's
    seq-ordered stream, and `missionControlGuard.ts` (hand-written, one guard).
  - 0005's `client.ts`: hand a valid `missionControl` event to `useMissionControl()`. An invalid
    one is ignored, and the view stays as it was.
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
- **Verify:** `npm run test:unit -- src/webview src/shared` plus the per-step gates
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
- **Verify:** `npm run test:unit -- src/webview` plus the per-step gates
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — Drill-down by navigation request

- **Covers:** AC-012, AC-013, AC-014, AC-017, AC-022
- **Do:**
  - `src/shared/protocol/boardFilter.ts`: the encoding and guard from *Research*.
  - `src/webview/areas/missionControl/requests.ts`, pure: element → `NavigationRequest`.
    - Total → Spec Board.
    - A state → `boardFilter { kind: 'state' }`.
    - Attention heading or count → `specSet { label: 'Needs attention', stems }`, with the
      stems of exactly the listed rows.
    - An attention row → Spec Explorer `{ stem, path? }`, with the path while the stem is
      duplicated.
    - *Running* → Agent Center, with `singleRunId` as the target while set.
    - A highlighted run → its ID.
    - An activity entry → Spec Explorer, or for `found: false` no request and X-10 shown in the
      area (`role="status"`, dismissable).
    - The diagnostics count → `runAction showOutput`.
    - Each element is a native `<button type="button">` that calls `useShell().navigate`. A
      value of 0 is still a button; a "not available" value is plain text (OP-9).
  - Tests:
    - one request per element, with the exact payload (AC-012 to AC-014);
    - a vanished stem sends nothing and shows the notice;
    - the diagnostics count sends `showOutput`;
    - AC-022: every drill-down element is a `button`, not disabled, without `tabindex="-1"`, in
      DOM order; Enter and Space per *Research*;
    - the `boardFilter` guard accepts and rejects.
- **Verify:** `npm run test:unit -- src/webview src/shared` plus the per-step gates
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — Host wiring, host smoke; docs sync and final gates

- **Covers:** AC-015, AC-023; AC-001 … AC-026 re-proven by the full gate run
- **Do:**
  - `src/extension.ts`: compose `createMissionControlService` from controller, repository,
    lifecycle, session and clock. Add `StudioApi.missionControl()` (view and change listener)
    for host tests.
  - 0005's panel host (expected `src/adapters/vscode/studioPanel.ts`): on `hello`, send the
    current view after the shell snapshot. On `onDidChangeView`, send `evt missionControl` with
    the next `seq`. Subscribe while the panel exists.
  - Host smoke `src/test/missionControl.smoke.test.ts` (CI):
    - AC-015: the fixture project's view matches its files; writing a spec file into the temp
      workspace, then `runtimeStore().createRun({ providerId: 'fake', … })`, then
      `reportStatus(… 'Failed')` each update the view without a reopen;
    - AC-023: `snapshotTree` of the workspace equals its state before plus only the test's own
      writes.
  - Docs sync:
    - `architecture:` in `AGENTS.md`, exactly these entries (wording of the 0005 lines as
      merged):
      - runtime module → `'src/core/runtime — runtime store: runs, events, masking, writer lock, retention, store state, run-change notification (spec 0004; notification 0006)'`;
      - new `'src/core/missionControl — Mission Control projection: header, spec figures, progress, run figures, attention list, recent activity, dashboard service (spec 0006)'`;
      - the 0005 `src/webview` line + `, Mission Control area (spec 0006)`;
      - the 0005 `src/shared/protocol` line + `, Mission Control view and board filter encoding (spec 0006)`.
    - `systemPatterns.md`:
      - the host computes the dashboard as one serialisable view, and the webview only renders
        it;
      - the service computes only while it is listened to;
      - `onDidChangeRuns` is the run-change source for every area;
      - the board filter encoding;
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
| AC-001 | T-002 | — | — | open |
| AC-002 | T-002 | — | — | open |
| AC-003 | T-002 | — | — | open |
| AC-004 | T-002 | — | — | open |
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
| AC-018 | T-003, T-004, T-006 | — | — | open |
| AC-019 | T-002, T-005 | — | — | open |
| AC-020 | T-002, T-005 | — | — | open |
| AC-021 | T-006 | — | + manual: Gregor, High Contrast | open |
| AC-022 | T-007 | — | + manual: Gregor, focus, Enter and Space | open |
| AC-023 | T-004, T-008 | — | — | open |
| AC-024 | T-004, T-005 | — | — | open |
| AC-025 | T-002, T-005 | — | — | open |
| AC-026 | T-002, T-003, T-006 | — | — | open |

## Session handoff

- **Done so far:** plan written (8 steps, 4 stages); no code changed.
- **Next action:**
  1. Gregor reviews the plan, the *Texts* table, the open-point rule and readings p1 to p6.
  2. The accepted answers go into the spec (revise mode).
  3. Main (0005) is merged into `spec-0006`, then `npm ci`.
  4. On the start signal: `/sdd-lifecycle` backlog → active, then T-001.
- **Open decisions:**
  - the 0004 addition `onDidChangeRuns` (T-001);
  - OP-4: Output channel as written, or a Spec Board request;
  - OP-6, OP-8, OP-9, OP-10 and OP-12 as planned;
  - readings p1 to p6;
  - the board filter encoding shared with 0007's plan.
- **Baseline:** _(commit hash before the first step commit; set when work starts)_
- **Environment:** `npm test` cannot run in the sandbox (VS Code download blocked); CI runs
  it. The worktree needs `npm ci` first.
