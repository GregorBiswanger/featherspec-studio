# Plan — Live Agent Activity & Monitoring (Agent Center)

**Spec:** [0012-live-agent-activity-monitoring.md](0012-live-agent-activity-monitoring.md)
**Status:** Done
**Last updated:** 2026-11-17
**Current step:** — (all steps done)

## Approach

Same pattern as Mission Control (0006) and the board (0007): a framework-free core module
`src/core/agentCenter/` computes everything; the host sends serialisable snapshots with no `seq`
(each replaces the last, re-sent on `hello`); the webview area `src/webview/areas/agentCenter/`
only renders them and sends typed requests. The core has three pure parts — **timeline**
(events → rows, folding, unknown events), **run summary** (a reducer over the whole run: current
activity, open requests, file changes, error details, last events) and **run list / header**
(order, spec label, durations, targets) — and one **Agent Center service** that reads the store
page by page, keeps the loaded window (bounded, OP-12), follows the store and the provider registry,
owns selection and filter per project root (workspace memento, like the shell's UI memory) and
hands stop, resume and answers to 0011's orchestrator. Live events come from a small wrapper
around the window's store (`withEventSignal`, applied in the composition root's `openStore`), so
0004 and 0011 stay unchanged; status changes and new runs come from 0004's `onDidChangeRuns`.
Order: pure projection first (most criteria, cheapest to prove), then the service read side, then
actions, then UI, then wiring and docs. Memory Bank files touched in T-009: `systemPatterns.md`,
`techContext.md`, `activeContext.md`.

### Consumed surface (fixed by other plans; redefined nowhere here)

- 0004: `RuntimeStore` (`listRuns`, `getRun`, `readEvents(runId, fromSeq, size)`, `state`,
  `onDidChangeRuns`, `onDidChangeState`), `RunView`, `StoredEvent`, `MAX_PAGE_SIZE = 500`,
  `NOT_AVAILABLE`. Sequence numbers are contiguous per run (`nextSeq++`, also for `truncated`).
- 0009 plan *Surface*: `ProviderRegistry.entry(id)`/`list()`/`onDidChange` (display name,
  capabilities `toolEvents`, `fileChanges`, `cancel`), payload names of the 23 kinds,
  `ApprovalAnswer`. The fake provider for scenario tests.
- 0011 plan *Surface*: `stop(runId)`, `resumability(runId)`, `resume(runId)` (asks its own
  confirmation; returns the new run ID), `respondToApproval`, `respondToInput`, `Refusal {reason}`,
  `isSpecNotFound(stem, model)`, `readRunResult(run)`; stored event payload carries `source`;
  stored result `{finalMessage, usage, changedFiles}`; `ERROR_CLASSES`.
- 0005: `navigate` with targets (PD-040), `ShellService.onDidNavigate`, `ShellView.restricted`,
  `AREAS` (Agent Center leaves `placeholder: true`). 0006: `createSpecResolver`
  (`src/core/missionControl/specRefs.ts`), `formatTime`. 0007: `ReadOnlyFileSystem.stat`,
  `EditorPort.open`. 0013: `--fs-*` aliases, `EmptyState`, chip and panel styling.

### New names (this plan)

- `src/core/ports/agentCenter.ts`: `AgentCenterOrchestrator` = `Pick` of 0011's orchestrator
  (the five operations above); `AgentCenterUiPort {notify(text, action): Promise<boolean>;
  confirm(text, button): Promise<boolean>}`; `EventSignal {onDidStoreEvent(listener: (e:
  {runId, seq, type, payload}) => void): Disposable}`.
- Constants (`src/core/agentCenter/constants.ts`): `AGENT_CENTER_PAGE_SIZE = 100` (≤ 0004's
  500), `MAX_LOADED_PAGES = 5`, `SUMMARY_READ_SIZE = 500`, `DURATION_TICK_MS = 1000`.
- Protocol (`src/shared/protocol/agentCenter.ts`, strict guards — an unknown key refuses the
  whole view, as 0006): events `agentCenter {view}` and `agentCenterTimeline {runId, rows,
  hasEarlier}`; requests `acSelect {runId}`, `acClearFilter {}`, `acLoadEarlier {runId}`,
  `acFollow {runId, on}`, `acAnswer {runId, requestId, answer}` (`{kind: 'approval', decision,
  reason?}` | `{kind: 'input', text}`), `acCancel {runId}`, `acResume {runId}`, `acOpenFile
  {runId, path}`. Open spec uses the existing `navigate`.
- UI memory key `featherspec-studio.agentCenter`: `{v: 1, projects: {[root]: {runId?, stem?}}}`.

### Texts (OP-02; English, PD-016; all in `src/shared/protocol/agentCenterTexts.ts`)

- List and states: heading "Agent runs" · "spec not found" · "history incomplete" · "history
  unreadable" · "not available" · "Run <ID> is not in the run history" · filter "Filter: <label>"
  with "Clear filter" · "No runs yet. Start one by moving a Ready spec to Active on the Spec
  Board." · "No runs match this filter" · "Runs: not available — <reason>".
- Status words: Starting, Running, "Waiting for approval", "Waiting for input", Completed,
  Failed, Cancelled, Interrupted; cause beside it: "(<cause>)" (OP-07).
- Header labels: "Run ID", "Provider", "Model", "Session", "Spec", "Status", "Started",
  "Duration"; duration `m:ss`, `h:mm:ss` from one hour, whole seconds.
- Activity: "Current activity" · "Waiting for approval: <summary>" · "Waiting for input" ·
  "Running tool <name>".
- Timeline: "Timeline" · "Load earlier" · "Jump to latest" · sources "provider", "derived",
  "Studio" · "Event history truncated at the size cap" · "Unknown provider event: <name>" · kind
  words: Session started, Turn started, Turn completed, Message, Reasoning, Tool started, Tool
  progress, Tool completed, File changed, Approval requested, Approval resolved, Input requested,
  Input resolved, Plan updated, Usage, Warning, Retry, Sign-in status, Run completed, Run failed,
  Run cancelled. Payload field labels: one word pair per 0009 payload field (in the same file).
- Notes: "Tool calls: not delivered by <provider>" · "File changes: not delivered by
  <provider>" · "Cancel: not supported by <provider>".
- File changes: "File changes" · added / changed / deleted · "reported by provider" · "derived
  from tool input" · "Open file".
- Requests: "Waiting for you" · "outside the project folder" · "Approve once" · "Reject" ·
  "Reason (optional)" · "Your answer" · "Send".
- Notification: "Spec <number>: the agent asks for approval." / "… asks for input." · action
  "Open in Agent Center".
- Cancel confirmation (modal): "Cancel the agent run for spec <number>? The agent stops; changes
  it already made stay." · button "Cancel run".
- Error: "Error" · "Error class" · "Message" · "Failed at" · "Last status before failure" · "Last
  event before failure"; class words auth "Sign-in rejected", quota_or_rate_limit "Quota or rate
  limit reached", model_unavailable "Model not available", network_or_server "Network or server
  error", runtime_missing "Provider runtime missing", policy_denied "Denied by policy",
  provider_exited "Provider stopped without a final event", start_timeout "Start timed out",
  unknown and any other value "Unknown error".
- Result: "Result" · "No result delivered" · "The spec is not done until FeatherSpec verifies it."
- Actions: "Cancel run" · "Resume" · "Open spec".

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile` (T-008, T-009).
Pre-done gate on CI or Windows: `npm test` with the new `src/test/agentCenter.smoke.test.ts`.

## Research

- Survey (2026-11-16): no Agent Center code; `AREAS` marks `agentCenter` as placeholder, and
  `src/webview/areas/areas.test.tsx` (AC-006 placeholder `it.each`, AC-028 target-on-placeholder),
  `src/webview/states.test.tsx` ("the Agent Center placeholder") and
  `src/shared/protocol/messages.test.ts` ("areas", non-placeholder list) assert it — T-006
  retargets them (no area is a placeholder any more: the placeholder component stays tested
  through a synthetic `AreaInfo`). `RuntimeStore.appendEvent` does not notify (0004 AC-030 covers
  runs and statuses only), hence `withEventSignal`. `readEvents` is forward-only; with contiguous
  sequence numbers the page before seq `s` is `readEvents(max(1, s − P), min(P, s − 1))`.
  The shell's `navigate` with a spec target whose stem is unknown ends in 0005's notice and does
  not switch area — nobody sends such a target to the Agent Center today; no change. Test worlds to
  reuse: `src/core/missionControl/testing/runtimeWorld.ts` (`openMemoryStore`, fake session),
  `src/core/shell/testing/world.ts`, 0009's fake provider, 0011's orchestrator test world.
- Decisions taken here: spec OP-02, OP-05…OP-13 by the spec's recommendations, A-005 withdrawn,
  A-006 settled by 0011's *Surface* (written into the spec 2026-11-16). No PD newer than the spec
  changes it. No new dependency.
- VS Code `showWarningMessage(text, {modal: true}, button)` resolves to the button or `undefined`
  on dismissal — repo precedent `src/adapters/vscode/runtimeUi.ts`;
  [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api), retrieved 2026-11-16.
- [Notifications UX guidelines](https://code.visualstudio.com/api/ux-guidelines/notifications) —
  modal only for user-started actions needing an immediate answer (fits Cancel); one notification
  at a time, no repeats (fits one per request, none while shown, OP-10); retrieved 2026-11-16.

## Stages

1. T-001 → T-002 → T-003 — pure projection: timeline, run summary, run list and header
2. T-004 → T-005 — Agent Center service: reading, paging, live updates; actions and notifications
3. T-006 → T-007 — the area UI: list, detail, states, controls; timeline with follow mode
4. T-008 → T-009 — VS Code wiring and host smoke; docs sync and final gates

No parallel stage: stages 1–2 are one module (`src/core/agentCenter`), and every step extends
`src/shared/protocol/agentCenter.ts`, whose view the UI steps need finished.

## Steps

### T-001 — Timeline rows, text table, protocol rows

- **Covers:** AC-008, AC-011, AC-014, AC-026
- **Do:** `src/shared/protocol/agentCenterTexts.ts` (*Texts*), `src/shared/protocol/agentCenter.ts`
  with the row type and its guard. `src/core/agentCenter/timeline.ts`: `timelineRows(events)` —
  ascending seq, one row per event; `message.delta` since the previous `message.completed` (or the
  first loaded event) fold with the next `message.completed` into one row (its text once it
  arrives, the joined deltas until then); time = occurredAt else receivedAt; source from
  `payload.source` (`provider` | `derived`), `Studio` for `truncated`, else "not available";
  payload fields as `{label, text}` strings; `provider.unknown` and any type outside 0009's
  `EVENT_KINDS` → "Unknown provider event: <typeName | type>" without fields; tool rows only from
  `tool.*`. Tests `timeline.test.ts` incl. the AC-008 and AC-026 examples, `<b>x</b>` kept as text,
  a table-completeness test (every kind, status, class has a word).
- **Verify:** `npx vitest run src/core/agentCenter/timeline.test.ts src/shared/protocol` then the per-step gates
- [x] **Verified (T-001):** 2026-11-17 — red: `npx vitest run src/core/agentCenter/timeline.test.ts src/shared/protocol/agentCenter.test.ts` with `timelineRows` and both guards as `Not implemented` stubs: 14 failed (all with `Error: Not implemented`: the 12 timeline cases for AC-008, AC-011, AC-014, AC-026 and the 2 guard cases), the 2 table-completeness cases passed at once (negative control inside: a missing word is reported). Green after the implementation: same command plus `src/shared/protocol` 6 files, 71 tests passed; gates: eslint 0 warnings, tsc and tsc -p src/webview clean, `npm run test:unit` 138 files, 1739 tests passed.
- **Notes:** —

### T-002 — Run summary: activity, requests, file changes, error, result

- **Covers:** AC-007, AC-015, AC-019, AC-020
- **Do:** `src/core/agentCenter/summary.ts`: `emptySummary()` and `summarize(summary, event)` —
  open requests (oldest first; closed by `.resolved` or the run's end state), open tool calls by
  call ID, every `file.changed` with operation and basis, last event and the event before the
  first `run.failed`. `currentActivity(run, summary)` per BR-05; `errorDetails(run, summary)`
  (class word, stored message, failure time and last status from the status history, last event
  before the failing one); `resultView(run)` via 0011's `readRunResult` ("No result delivered"
  for `NOT_AVAILABLE`) plus the not-done text; capability notes for `toolEvents`/`fileChanges`
  `none`. Tests `summary.test.ts`: a deciding event outside the newest page still counts, the
  request precedence, a file changed without an event is never listed.
- **Verify:** `npx vitest run src/core/agentCenter/summary.test.ts` then the per-step gates
- [x] **Verified (T-002):** 2026-11-17 — red: `npx vitest run src/core/agentCenter/summary.test.ts` with the seven exports of `summary.ts` as `Not implemented` stubs: 18 of 18 failed (`Error: Not implemented`). Green after the implementation: `npx vitest run src/core/agentCenter` 2 files, 32 tests passed (the paged-versus-whole summary case covers a deciding event outside the newest page). Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 139 files, 1757 tests passed.
- **Notes:** —

### T-003 — Run list, header, durations, targets

- **Covers:** AC-001, AC-002, AC-003, AC-004, AC-005, AC-006
- **Do:** `src/core/agentCenter/runList.ts`: order (open first, then created, newest first); spec
  label via `createSpecResolver` (the entry at the run's stored path among duplicates, else the
  stem; "spec not found" by 0011's `isSpecNotFound`, no Open spec then); provider display name or
  ID; flags. `header.ts`: AC-005 values, "not available" per missing value, cause beside the
  status. `src/shared/protocol/agentCenterDuration.ts`: `runDuration(run, nowMs)` per BR-04 and
  its `m:ss` format (shared so the webview ticks it). `selection.ts`: apply a run target (clear
  filter, select, or "not in the run history"), a spec target (filter by stem, label number or
  stem, deselect a hidden run), board filter → no change; parse and serialise the memory per
  project root. Tests `runList.test.ts`, `header.test.ts`, `selection.test.ts`,
  `agentCenterDuration.test.ts` with the AC-003 example.
- **Verify:** `npx vitest run src/core/agentCenter src/shared/protocol` then the per-step gates
- [x] **Verified (T-003):** 2026-11-17 — red: `npx vitest run` on runList, header, selection and agentCenterDuration tests with the exports as `Not implemented` stubs: 22 failed (all `Error: Not implemented`). Green: `npx vitest run src/core/agentCenter src/shared/protocol` 11 files, 111 tests passed. Gates after an environment restart, re-run: eslint 0 warnings, both tsc clean, `npm run test:unit` 143 files, 1779 tests passed. Notes: the AC-003 example sits in selection.test.ts, the duration cases (AC-006) in agentCenterDuration.test.ts.
- **Notes:** —

### T-004 — Service: reading, paging, live updates, store states

- **Covers:** AC-009, AC-012, AC-013, AC-025, AC-027, AC-030
- **Do:** `src/core/agentCenter/eventSignal.ts` (`withEventSignal(store)` → the same store whose
  `appendEvent` emits after `stored`). `agentCenterService.ts`: `view()`, `timeline()`,
  `onDidChangeView`, `onDidChangeTimeline`, `whenIdle`, `dispose`; computes only while listened
  to (0006 pattern); follows `RunSourceSession`, registry `onDidChange`, model source, navigation,
  the event signal; on selection reads the run in `SUMMARY_READ_SIZE` pages for the summary and
  keeps the newest `AGENT_CENTER_PAGE_SIZE` events as the window; `loadEarlier` reads one page
  before the oldest loaded seq, `hasEarlier` false once the run's first seq is loaded; new events
  append; while following, the window keeps `MAX_LOADED_PAGES` pages; bursts coalesce, no delay.
  States: unavailable → reason, zero runs, filter without match, one run unreadable; read-only
  store → reader re-read on `hello` or area shown (OP-09). Memory port reused (`UiMemoryPort`).
  Tests `agentCenterService.test.ts` (store-call recorder: no read larger than the page size;
  fake clock: view within 500 ms of the signal), `restart.test.ts` (second store instance on
  the same memory: same rows, `Interrupted`, no open request, remembered selection and filter),
  `noWrite.test.ts` (fixture byte-identical before/after every scenario).
- **Verify:** `npx vitest run src/core/agentCenter` then the per-step gates
- [x] **Verified (T-004):** 2026-11-17 — red: `npx vitest run src/core/agentCenter src/shared/protocol/agentCenter.test.ts` with `withEventSignal`, `createAgentCenterService` and `isAgentCenterView` as `Not implemented` stubs: 28 failed, all `Error: Not implemented` (service, restart, noWrite, signal and view-contract cases), 52 passed (earlier steps). Green: first run 4 failed (a host-subscription bug: the store re-follow disposed the session subscriptions; one test expected `dropped` where the store refuses an unknown run), fixed, then `npx vitest run src/core/agentCenter` 9 files passed. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 147 files, 1807 tests passed.
- **Notes:** the event signal carries run ID, sequence number and type only (no payload: the store masks payloads, the signal must not leak the unmasked one); the service reads the newer events from the store on a signal. The service takes no clock (no timers). `view()` is `unavailable` also without an active project. The pending navigation target is kept until the first listener attaches (notification action with the panel closed).

### T-005 — Service: answers, cancel, resume, open file, notifications

- **Covers:** AC-016, AC-017, AC-018, AC-021, AC-022, AC-024, AC-028
- **Do:** `src/core/ports/agentCenter.ts` (*New names*). `agentCenterActions.ts`: an answer is
  handed to 0011 once per request (pending until the request closes or 0011 refuses; refusal
  reason stored at the control, controls enabled again); Cancel only on open runs whose provider
  declares `cancel` ≠ `none`, one `confirm`, then `stop`; Resume only when `resumability` says so,
  no own confirmation, a `resumed` result selects the new run (OP-08); Open file only when `stat`
  says `file` inside the project at view time; read-only → controls disabled with the store's
  reason; Restricted Mode → none offered, no text. `requestNotifier.ts`: on the event signal,
  one `notify` per `approval.requested`/`input.requested` while the store is writable, not while
  that run is shown in the focused panel (OP-10); its action navigates to the run. Tests
  `agentCenterActions.test.ts` (fake orchestrator recorder: exactly once, second activation hands
  nothing, no hand-over without activation), `requestNotifier.test.ts`, and one scenario through
  the real 0011 orchestrator with the fake provider's `approval` scenario. Seven criteria: kept
  together because one control-state model serves them all.
- **Verify:** `npx vitest run src/core/agentCenter` then the per-step gates
- [x] **Verified (T-005):** 2026-11-17 — red: `npx vitest run src/core/agentCenter` with the service actions, `createActions`, `createRequestNotifier` and `projectRelativeKey` as `Not implemented` stubs: 24 failed (19 `Error: Not implemented`, 5 assertion failures for the defaults: cancel `none` instead of offer/unsupported, Open file `canOpen` false), 77 passed (earlier steps). Green: `npx vitest run src/core/agentCenter` 11 files, 101 tests passed (one test first over-asserted that no orchestrator call happens at all, though the resumability probe of an ended run is expected; narrowed). Includes the scenario through the real 0011 orchestrator with the fake provider's approval scenario. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 149 files, 1833 tests passed.
- **Notes:** Open file offers relative paths only (backslashes become slashes; absolute, drive and parent paths are not openable); the control state lives in `agentCenterActions.ts` behind the service (`answerApproval`, `answerInput`, `cancel`, `resume`, `openFile`); resumability is asked only for ended runs; in Restricted Mode no cancel note is shown. The notifier takes `shownAndFocused(runId)` and `open(runId)` as callbacks for T-008.

### T-006 — Area UI: list, detail, states, controls

- **Covers:** AC-001, AC-004, AC-016, AC-017, AC-021, AC-023, AC-027, AC-028, AC-029 (UI side)
- **Do:** `src/webview/areas/agentCenter/` — `AgentCenter.tsx` (two panes like Spec Explorer,
  stacked under 640 px), `RunList.tsx` (rows as buttons), `RunDetail.tsx` (header, activity, error,
  result, file changes, notes, actions), `Requests.tsx` (Approve once, Reject + reason, input +
  Send disabled while empty, OP-11), `store.ts`, `texts.ts` re-exporting the shared table; Open
  spec sends one `navigate` to Spec Explorer with the stem; `RunStatusChip` in `src/webview/ui`
  with a `[data-run-status]` → `--fs-tint` mapping (open blue, waiting yellow, Completed green,
  Failed red, Cancelled/Interrupted muted) and `.ac-*` rules from the `--fs-*` aliases only;
  `EmptyState` for the in-area states. `client.ts` and `messages.ts` carry the two events; register
  the area in `registry.tsx`, `placeholder: false`; retarget the three placeholder tests (Research).
  Duration ticks every `DURATION_TICK_MS` while an open run is shown. Tests `AgentCenter.test.tsx`
  (keyboard: Tab and Enter/Space on rows and controls; status as text), CSS guard extension in
  `src/adapters/node/webviewCss.test.ts` (every run status has a rule).
- **Verify:** `npx vitest run --project webview src/webview src/adapters/node/webviewCss.test.ts` then the per-step gates
- [x] **Verified (T-006):** red: AgentCenter.test.tsx 33 of 33 failed with Not implemented, webviewCss.test.ts 3 AC-029 tests failed. green: webview suite 311 passed, full unit 1876 passed, eslint and both tsc clean, npm run compile ok. Preview (Dark, Light, High Contrast, 05-agent-center-*.png) shows list with 3 runs, open approval with Approve once/Reject, failed run chip, activity panel; looked at and no defects left.
- **Notes:** —

### T-007 — Timeline with follow mode and Load earlier

- **Covers:** AC-008, AC-009, AC-010, AC-012 (UI side)
- **Do:** `Timeline.tsx`: renders rows as text (no markup), "Load earlier" while `hasEarlier`,
  follow on when a run opens; scrolling away sends `acFollow {on: false}` and shows "Jump to
  latest"; that button or scrolling back to the end turns it on; while following, new rows issue
  one scroll request to the end. Tests `Timeline.test.tsx` with scroll metrics set on the
  element (jsdom has no layout): follow state, scroll requests, `acLoadEarlier` sent once per
  activation, rows applied synchronously on the timeline event. The visible scrolling stays the
  manual check of AC-010.
- **Verify:** `npx vitest run --project webview src/webview/areas/agentCenter` then the per-step gates
- [x] **Verified (T-007):** red: Timeline.test.tsx 8 of 9 failed (no timeline rendered). green: Timeline.test.tsx 9 passed, webview suite 320 passed, full unit 1885 passed, eslint and both tsc clean, compile ok. Preview Dark/Light/HC screenshots show the timeline panel with rows and clock times; scrolling stays the manual AC-010 check.
- **Notes:** —

### T-008 — VS Code wiring and host smoke

- **Covers:** AC-018, AC-021, AC-025 (host side)
- **Do:** `src/adapters/vscode/agentCenterUi.ts` (`notify` → `showInformationMessage` with the
  action; `confirm` → modal `showWarningMessage`), `agentCenterMemory.ts` (memento key).
  `src/extension.ts`: `withEventSignal` inside `openStore`; the service with session, registry,
  orchestrator, model source, discovery, memory, file system, editor, shell navigation and
  restricted state; the notifier; `StudioApi.agentCenter()` (view, timeline, whenIdle).
  `src/adapters/vscode/studioPanel.ts`: `PanelAgentCenter` pushes both events, re-sent on `hello`,
  handlers for the `ac*` requests, focused-and-shown query for OP-10. Bundle test mounts the area
  with a fixture snapshot. `src/test/agentCenter.smoke.test.ts` (CI only): a run created and
  events appended through `runtimeStore()` show up in `agentCenter().view()` and the timeline;
  polling waits up to 20 s that report what was awaited and the last view on timeout; Mocha
  timeout 120 s per test.
- **Verify:** `npx vitest run src/adapters` then the per-step gates and `npm run compile`
- [x] **Verified (T-008):** red: agentCenterRequests.test.ts 2 of 2 failed with Not implemented. green: 2 passed, bundle test 'mounts the Agent Center with a fixture snapshot' passed (it was written after T-006 had registered the area, so it was not seen red; it asserts rows, detail, request and timeline in the built bundle), full unit 1888 passed, eslint and both tsc clean, npm run compile ok. src/test/agentCenter.smoke.test.ts is written and typechecks; it runs on CI only (npm test is blocked here).
- **Notes:** —

### T-009 — Docs sync and final gates

- **Covers:** AC-001 … AC-030
- **Do:** README: an "Agent Center" section (what it shows, answers, cancel, resume). `AGENTS.md`
  snapshot — add module `'src/core/agentCenter — Agent Center projection: timeline rows, run
  summary, run list and header, selection and filter memory, event signal wrapper, Agent Center
  service, actions, request notifier (spec 0012)'`; extend `src/core/ports` with "Agent Center
  ports (orchestrator operations, UI, event signal)", `src/webview` with "Agent Center area; run
  status chip", `src/shared/protocol` with "Agent Center view, timeline and texts" (spec 0012).
  `systemPatterns.md`: event signal wrapper instead of polling; host-held bounded event window.
  `techContext.md`: Agent Center tests and host smoke file. `activeContext.md`. Then every gate.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`
- [x] **Verified (T-009):** docs only, no code behaviour: README Agent Center section, AGENTS.md snapshot, systemPatterns.md, techContext.md, activeContext.md synced; traceability set to verified. green: eslint, both tsc, npm run test:unit (152 files, 1888 tests) and npm run compile all clean.
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-003, T-006 | src/core/agentCenter/runList.ts:projectRunRows; src/webview/areas/agentCenter/RunList.tsx | runList.test.ts, AgentCenter.test.tsx | verified |
| AC-002 | T-003 | src/core/agentCenter/selection.ts:applyTarget, reconcileSelection | selection.test.ts, agentCenterService.test.ts | verified |
| AC-003 | T-003 | src/core/agentCenter/selection.ts:applyTarget, visibleRuns | selection.test.ts | verified |
| AC-004 | T-003, T-006 | src/core/agentCenter/runList.ts:specRefOf; RunList.tsx:SpecText | runList.test.ts, AgentCenter.test.tsx | verified |
| AC-005 | T-003 | src/core/agentCenter/header.ts:runHeader | header.test.ts | verified |
| AC-006 | T-003 | src/shared/protocol/agentCenterDuration.ts:runDuration | agentCenterDuration.test.ts | verified |
| AC-007 | T-002 | src/core/agentCenter/summary.ts:currentActivity | summary.test.ts, agentCenterService.test.ts | verified |
| AC-008 | T-001, T-007 | src/core/agentCenter/timeline.ts; src/webview/areas/agentCenter/Timeline.tsx | timeline.test.ts, Timeline.test.tsx | verified |
| AC-009 | T-004, T-007 | agentCenterService.ts:loadEarlier; Timeline.tsx | agentCenterService.test.ts, Timeline.test.tsx | verified |
| AC-010 | T-007 | src/webview/areas/agentCenter/Timeline.tsx | Timeline.test.tsx; manual: visible scrolling (spec §10) | verified, manual scroll pass open |
| AC-011 | T-001 | src/core/agentCenter/timeline.ts:sourceOf | timeline.test.ts | verified |
| AC-012 | T-004, T-007 | agentCenterService.ts:follow; Timeline.tsx | agentCenterService.test.ts, Timeline.test.tsx | verified |
| AC-013 | T-004 | src/core/agentCenter/agentCenterService.ts | agentCenterService.test.ts | verified |
| AC-014 | T-001 | src/core/agentCenter/timeline.ts, summary.ts:capabilityNotes | timeline.test.ts, summary.test.ts | verified |
| AC-015 | T-002 | src/core/agentCenter/summary.ts:summarize | summary.test.ts | verified |
| AC-016 | T-005, T-006 | agentCenterActions.ts; Requests.tsx | agentCenterActions.test.ts, AgentCenter.test.tsx | verified |
| AC-017 | T-005, T-006 | agentCenterActions.ts; Requests.tsx | agentCenterActions.test.ts, AgentCenter.test.tsx | verified |
| AC-018 | T-005, T-008 | requestNotifier.ts; src/adapters/vscode/agentCenterUi.ts | requestNotifier.test.ts; src/test/agentCenter.smoke.test.ts (CI) | verified, smoke runs on CI |
| AC-019 | T-002 | src/core/agentCenter/summary.ts:errorDetails | summary.test.ts | verified |
| AC-020 | T-002 | src/core/agentCenter/summary.ts:resultView | summary.test.ts | verified |
| AC-021 | T-005, T-006, T-008 | agentCenterActions.ts; RunDetail.tsx; extension.ts | agentCenterActions.test.ts, AgentCenter.test.tsx | verified |
| AC-022 | T-005 | src/core/agentCenter/agentCenterActions.ts:resume | agentCenterActions.test.ts | verified |
| AC-023 | T-006 | src/webview/areas/agentCenter/RunDetail.tsx | AgentCenter.test.tsx | verified |
| AC-024 | T-005 | src/core/agentCenter/filePath.ts, agentCenterService.ts:openFile | agentCenterActions.test.ts | verified |
| AC-025 | T-004, T-008 | src/core/agentCenter/agentCenterService.ts | restart.test.ts | verified |
| AC-026 | T-001 | src/core/agentCenter/timeline.ts:rowOf | timeline.test.ts | verified |
| AC-027 | T-004, T-006 | agentCenterService.ts; AgentCenter.tsx | agentCenterService.test.ts, AgentCenter.test.tsx | verified |
| AC-028 | T-005, T-006 | agentCenterActions.ts; RunDetail.tsx | agentCenterActions.test.ts, AgentCenter.test.tsx | verified |
| AC-029 | T-006 | src/webview/main.css (.run-status-chip, .ac-*); RunStatusChip.tsx | webviewCss.test.ts, AgentCenter.test.tsx; manual: High Contrast pass (spec §10) | verified, manual High Contrast pass open |
| AC-030 | T-004 | src/core/agentCenter/agentCenterService.ts | noWrite.test.ts | verified |

## Session handoff

- **Done so far:** T-001 to T-009
- **Next action:** none; Gregor's manual passes remain (AC-010 scrolling, AC-029 High Contrast, host smoke on CI), then /sdd-compile
- **Open decisions:** none.
- **Baseline:** 2026-11-17, HEAD 70362df: eslint, both tsc and `npm run test:unit` green (136 files, 1723 tests).
- **Environment:** `npm test` cannot run here (VS Code download blocked); the host smoke runs on CI or Gregor's Windows machine. UI looks: `npm run compile` and `/home/claude/orch/preview/run.sh`, screenshots in `/mnt/user-data/outputs/screens/`.
