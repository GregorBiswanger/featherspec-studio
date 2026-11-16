# Live Agent Activity & Monitoring (Agent Center)

**Status:** Draft
**Plan:** _none yet_

Handoff reference: FS-012 ([po-handoff.md](../../docs/product/po-handoff.md) §4.4, §5.3, §10 FS-012,
§13). Depends on: 0004 (runs, events, store state), 0005 (shell, panel-level states, navigation),
0009 (event taxonomy, capabilities), 0011 (run statuses, transitions, cancel, resume, answers to the
adapter). Neighbours: 0006 (run figures, drill-down into this area), 0007 (run on the card), 0008
(starting runs), 0010 (error guidance texts). Event kinds: [ADR-003](../../docs/decisions/ADR-003-first-agent-provider.md) §3–§4.

## 1. Summary

The Agent Center is the fourth area of the Studio panel. It lists the agent runs of the active
project and shows one run in detail: who runs it, for which spec, what it is doing now, the events
in order, tool calls, file changes, approval and input requests, errors and the result. The
developer can answer approval and input requests, cancel a run, resume an interrupted run where the
provider allows it, and jump to the spec. Everything updates live and survives a restart.

## 2. Goal and problem

User story (FS-012): "As a developer I want to follow live what an agent is working on and whether
I need to step in." Without this area a run is a black box: the developer cannot see that an agent
waits for an approval, which files it touched, or why it failed. Success: from any run figure,
card or notification the developer reaches the run in one action and sees what it waits for.

## 3. Users and roles

- **Developer** (only role, `projectbrief.md`): reads runs, answers requests, cancels, resumes.
- No permission differences inside Studio. Limits come from the window (reader window, PD-030) and
  Workspace Trust (Restricted Mode, 0005 S7).

## 4. Scope

### In scope

- Run list with filters, run detail with header, current activity, timeline, file changes,
  requests, error details and result.
- The answer controls for approval and input requests, and one notification per request.
- Actions: Cancel run, Resume (where offered), Open spec, Open file.
- Live updates, paged history, in-area empty and unavailable states (PD-036).
- Targets of the shell's navigation request for this area (PD-040).

### Out of scope

- Run status on spec cards and run figures on the dashboard (FR-012.1, AC-012.1, AC-012.2) — because 0007 AC-007 and 0006 own them (Gregor, Q1).
- Panel-level states (no project, loading, load error, Restricted Mode note) — because the shell owns them (PD-036).
- Starting, retrying or restarting a run — because new runs start only from the board through 0008 (Gregor, Q6).
- Status transitions, cancel and resume execution, delivering answers to the provider — because 0011 owns them (PD-024, PD-025); this area only requests them.
- Event normalisation, kinds and capability declarations — because 0009 owns them (ADR-003 §3–§4).
- Guidance text per error category ("sign in", "install the runtime") — because 0010 supplies it (FR-010.10); this area displays it.
- Session-wide or location-wide approvals ("approve for session") — because the MVP answers each request once (Gregor, Q3; PD-006).
- Attributing file changes from the file watcher or a git diff — because another actor may have made them (AC-012.5, Gregor, Q5).
- A diff view of changed files — because it is not needed for the first feedback loop (P7).
- Raw provider payloads of unknown events — because PD-029 stores no raw provider data in the MVP.
- Agent flow graph, session replay, token and cost analysis — because handoff §2.3 excludes them.
- Clearing run history — because 0004 AC-019 owns the command.
- Any write to `.specs/`, `.memory-bank/` or `AGENTS.md` — because PD-013 keeps Studio read-only there.

## 5. Functional flow

1. The developer opens the Agent Center: from the panel navigation, a run figure (0006), a card
   (0007), or a request notification.
2. The run list shows the project's runs; the navigation target selects a run or sets a filter.
3. The developer selects a run. The detail shows header, current activity and the newest events.
4. New events and status changes arrive and appear without a reload.
5. The run waits for approval: the request appears with "Approve once" and "Reject"; the developer
   answers; the answer goes to 0011.
6. The run ends: the detail shows the result, or the error details for `Failed`.
7. After a restart the same runs and events are shown from the store; open runs are `Interrupted`
   (0004 AC-011).

## 6. Business rules

Terms: **run** — a stored run of 0004, identified by its run ID. **Open run** — a run in an open
state (0004 BR-001). **Request** — an `approval.requested` or `input.requested` event (ADR-003 §4)
without a matching `.resolved` event. **Follow mode** — the timeline keeps the newest event visible.

- **BR-01 Run list.** Every stored run of the active project (0004 AC-008), open runs first, then by
  created time, newest first. Each row: spec number and title — matched by stem (PD-018), or
  "spec not found" (PD-046) — provider, run status as text, start time, duration.
- **BR-02 Targets** (PD-040, Gregor Q2). A run ID selects that run and shows it in the list. A spec
  stem filters the list to that spec's runs. A **named run set** (label + list of run IDs, the run
  counterpart of PD-041) filters the list to those runs. The active filter is visible with its label
  and is cleared with one action. A run ID the store does not hold → the notice "Run <ID> is not in
  the run history" and no selection.
- **BR-03 Header** (handoff §4.4). Run ID, provider, model, provider session reference, spec, status,
  start time, duration. A value the store does not hold shows "not available" (P8; 0004 AC-003).
- **BR-04 Duration.** Open run: now − start time, updated while shown. `Completed`, `Failed`,
  `Cancelled`: end time − start time. `Interrupted`: "not available", because its end time is the
  time of classification (0004 BR-011). A run never `Running` has no start time → "not available".
- **BR-05 Current activity** (A-002). For an open run, the first that applies: an open request
  ("Waiting for approval: <what>", "Waiting for input"); a `tool.started` without its
  `tool.completed` ("Running tool <name>"); otherwise "not available". Ended runs show none.
- **BR-06 Timeline** (Gregor Q4). One row per stored event in sequence order (0004 AC-005). Each row
  shows the kind as a word, the time (occurred-at if delivered, otherwise received-at) and the
  source, *provider* or *derived* (FR-012.9). `message.delta` events are folded into one message row
  that grows until its `message.completed`. `reasoning` and `plan.updated` events are ordinary rows.
  An event whose kind is unknown to this Studio version shows "Unknown provider event: <type>" and
  no payload.
- **BR-07 History paging.** The detail loads the newest page of events; "Load earlier" loads the
  page before it (0004 AC-006; page size: 0004 OP-010). The view never asks for all events of a run
  at once (handoff §13 Performance).
- **BR-08 Follow mode.** On when a run is opened. Scrolling away from the newest event turns it off
  and shows "Jump to latest"; that action, or scrolling back to the newest event, turns it on.
- **BR-09 Tool calls** (AC-012.4). Shown only from `tool.*` events. Where the provider declares
  `toolEvents` as `none` (0009), the detail says "Tool calls: not delivered by <provider>" instead of
  an empty list.
- **BR-10 File changes** (AC-012.5, Gregor Q5). Listed only from `file.changed` events. Each entry
  shows path, operation and its basis: "reported by provider" (source *provider*) or "derived from
  tool input" (source *derived*). Where `fileChanges` is `none`, the detail says "File changes: not
  delivered by <provider>". No other source attributes a file to a run.
- **BR-11 Requests and answers** (PD-006, Gregor Q3). An open approval request shows what is asked
  (tool, path or command as the event delivers it) with "Approve once" and "Reject" plus an optional
  feedback text. An open input request shows its question and a text field with "Send". The answer
  is handed to 0011 with run ID and request ID; the request stays open until its `.resolved` event
  arrives. Nothing is answered automatically and there is no timeout.
- **BR-12 Notification.** When a request opens, Studio shows one VS Code notification naming the
  spec number and the request kind, with the action "Open in Agent Center" (navigates to the run).
  One per request; none for a request already open at activation.
- **BR-13 Actions** (Gregor Q6). "Cancel run" on open runs, after one confirmation that says the agent
  stops and changes already made stay; handed to 0011. "Resume" only on an `Interrupted` run whose
  provider declares `resume` (PD-007, PD-024); handed to 0011. "Open spec" sends a navigation request
  to Spec Explorer with the stem (PD-040, PD-042); absent for "spec not found". "Open file" for a
  changed path that exists inside the active project.
- **BR-14 Action availability.** In a reader window (store *read-only*, 0004 AC-025) and in
  Restricted Mode, Cancel, Resume and the answer controls are disabled and show the reason; the
  rest of the area stays readable.
- **BR-15 Error details** (Gregor Q7, FR-012.6). For a `Failed` run: error category in words (ADR-003
  §4 categories; the stored error class of 0004), the masked message, the failure time, the last
  status before `Failed`, the last event, and the guidance text from 0010 where one exists. An
  unknown category shows as "Unknown error".
- **BR-16 Result.** For a `Completed` run: the stored result, or "No result delivered". The text says
  the spec is not done until FeatherSpec verifies it (AC-011.8).
- **BR-17 In-area states** (PD-036). No runs → "No runs yet. Start one by moving a Ready spec to
  Active on the Spec Board." Filter with no match → "No runs match this filter" with "Clear filter".
  Store *unavailable* → "Runs: not available — <reason>" (0004 AC-025), never an empty list. One
  run "history unreadable" (0004 AC-015) → its row and detail say so; other runs unaffected.

## 7. Functional requirements

| ID | Requirement | Handoff | Criteria |
| --- | --- | --- | --- |
| FR-01 | Run list with spec, provider, status, times; targets and filters | §4.4, FR-012.2 | AC-001, AC-002, AC-003, AC-004 |
| FR-02 | Run header and current activity | §4.4 | AC-005, AC-006, AC-007 |
| FR-03 | Events in order, with kind and source, paged | FR-012.2, FR-012.9 | AC-008, AC-009, AC-010, AC-011 |
| FR-04 | Live updates without reload | FR-012.7 | AC-012, AC-013 |
| FR-05 | Tool calls only from provider data | FR-012.3 | AC-014 |
| FR-06 | File changes only where attributable, with basis | FR-012.4 | AC-015 |
| FR-07 | Approval and input requests visible and answerable | FR-012.5, PD-006 | AC-016, AC-017, AC-018 |
| FR-08 | Errors and results understandable | FR-012.6 | AC-019, AC-020 |
| FR-09 | Actions: cancel, resume, open spec, open file | §4.4 | AC-021, AC-022, AC-023, AC-024 |
| FR-10 | History available after restart | FR-012.8 | AC-025 |
| FR-11 | Unknown events never break the view | AC-012.9 | AC-026 |
| FR-12 | Honest in-area states and accessibility | P8, §13 | AC-027, AC-028, AC-029 |
| — | Status on cards and dashboard | FR-012.1 | 0007 AC-007, 0006 (not restated) |

## 8. Data requirements

Read only, all through the extension (0005 §11): runs, status histories and pages of events from
0004; the store state (0004 AC-025); capability declarations per provider (0009); guidance text per
error category (0010); spec number, title and stem from 0002. Stores nothing of its own except
remembered UI state (selected run ID, filter) in VS Code workspace state. Event payloads are already
masked by 0004 (PD-029).

## 9. Error cases and edge cases

- Store unavailable or read-only → BR-17, BR-14. History unreadable for one run → BR-17.
- Run's spec renamed or deleted → "spec not found" (PD-046); "Open spec" absent.
- Request answered from another place, or run ends while a request is open → the request closes
  when its `.resolved` event or an end state arrives; the answer controls disappear.
- Answer or cancel refused by 0011 (run already ended, adapter error) → the reason is shown at the
  control; the request stays open.
- Late or duplicate events → shown as 0004 stores them (0004 AC-007, AC-028).
- Run with a `truncated` marker (0004 AC-027) → its row says "Event history truncated at the size cap".
- Selected run removed by retention or Clear → selection cleared with BR-02's notice.

## 10. Acceptance criteria

"The system" is FeatherSpec Studio. Unless marked, each criterion is decided by an automated test in
plain Node or jsdom with the fake provider and the in-memory store of 0004.

- **AC-001** The system shall list in the Agent Center every stored run of the active project, open
  runs first and then newest created first, each row showing spec number and title (or "spec not
  found"), provider, run status as text, start time and duration (BR-01, BR-04).
- **AC-002** When the shell delivers a navigation request with a run ID, the system shall select that
  run and show its detail. If the store holds no run with that ID, then the system shall show "Run
  <ID> is not in the run history" and select nothing.
- **AC-003** When the shell delivers a navigation request with a spec stem or a named run set, the
  system shall list exactly the runs of that stem or that set, show the filter's label, and list all
  runs again after the developer clears it with one action.
  > **Given** runs R1, R2 of `0007-board` and R3 of `0003-lifecycle` **When** the target is stem
  > `0007-board` **Then** only R1 and R2 are listed under the label "0007".
- **AC-004** If the stem of a run matches no spec of the project, then the system shall show "spec not
  found" in its row and detail and offer no "Open spec" (PD-046).
- **AC-005** When a run is selected, the system shall show run ID, provider, model, provider session
  reference, spec, status, start time and duration, and "not available" for every value the store
  does not hold.
- **AC-006** The system shall show the duration of an `Interrupted` run, and of a run without a start
  time, as "not available" (BR-04).
- **AC-007** While a run is open, the system shall show its current activity per BR-05; with neither
  an open request nor an open tool call it shall show "not available".
- **AC-008** The system shall show one timeline row per stored event in ascending sequence order, each
  with kind, time and source (*provider* or *derived*), and shall fold the `message.delta` events of
  one message into one row.
  > **Given** a fake run emitting 3 `message.delta` and 1 `message.completed`, then 1 `tool.started`
  > **Then** the timeline has 2 rows: the message with the joined text, then the tool call.
- **AC-009** When a run is opened, the system shall request only the newest page of its events; when
  the developer activates "Load earlier", it shall request the page before the oldest shown event.
  No request shall ask for more than the page size of 0004 OP-010.
- **AC-010** While follow mode is on, the system shall keep the newest event visible as events arrive;
  when the developer scrolls away from it, the system shall stop following and show "Jump to latest".
- **AC-011** The system shall label every timeline row and every file change with its source, and no
  row shall lack one (FR-012.9).
- **AC-012** When the store records a new event or status change for the shown run, the system shall
  show it without a reload within 500 ms after the area receives the notification (PD-047).
- **AC-013** When the store records a new run or a status change of any listed run, the system shall
  update the run list within 500 ms after the area receives the notification (PD-047).
- **AC-014** The system shall show tool calls only from `tool.*` events. Where the run's provider
  declares `toolEvents` as `none`, it shall show "Tool calls: not delivered by <provider>" (BR-09).
- **AC-015** The system shall attribute a file to a run only from that run's `file.changed` events,
  showing path, operation and "reported by provider" or "derived from tool input". Where the provider
  declares `fileChanges` as `none`, it shall show "File changes: not delivered by <provider>". A file
  changed in the workspace during the run without such an event shall not appear (BR-10).
- **AC-016** While an approval request is open, the system shall show what is asked with "Approve
  once", "Reject" and an optional feedback field. When the developer activates one, the system shall
  hand run ID, request ID, the decision and the feedback to 0011 once, and offer no other decision.
- **AC-017** While an input request is open, the system shall show its question with a text field
  and "Send"; on "Send" it shall hand run ID, request ID and the text to 0011 once. The system shall
  never answer a request without a developer action and shall close it only on its `.resolved` event
  or the run's end state.
- **AC-018** When a request opens, the system shall show exactly one VS Code notification naming the
  spec number and the request kind, with "Open in Agent Center"; activating it shall send a
  navigation request with that run ID. Requests already open at activation shall raise none.
- **AC-019** When a `Failed` run is selected, the system shall show error category in words (or
  "Unknown error"), the stored message, the failure time, the last status before `Failed`, the last
  event, and 0010's guidance text for that category where one exists (BR-15).
- **AC-020** When a `Completed` run is selected, the system shall show its stored result or "No
  result delivered", and the text that the spec is not done until FeatherSpec verifies it.
- **AC-021** When the developer activates "Cancel run" on an open run, the system shall ask for one
  confirmation stating that the agent stops and changes already made stay; on confirmation it shall
  hand the run ID to 0011, on decline it shall do nothing. Ended runs shall offer no "Cancel run".
- **AC-022** The system shall offer "Resume" only on an `Interrupted` run whose provider declares
  `resume`, and on activation hand the run ID to 0011. No run shall offer "Start", "Retry" or
  "Restart".
- **AC-023** When the developer activates "Open spec", the system shall send the shell one navigation
  request to Spec Explorer with the run's stem (PD-040), and open no other view itself.
- **AC-024** The system shall offer "Open file" for a changed path only when that file exists inside
  the active project.
- **AC-025** After a restart, the system shall show every run and event the store returns (0004
  AC-010), the same as before the restart, with formerly open runs as `Interrupted`.
- **AC-026** If an event has a kind unknown to this Studio version, then the system shall show one row
  "Unknown provider event: <type>" without payload and go on showing every later event.
  > **Given** a fake run emitting `tool.started`, `x.custom`, `tool.completed` **Then** three rows show,
  > the middle one "Unknown provider event: x.custom".
- **AC-027** If the store is *unavailable*, then the system shall show "Runs: not available — <reason>"
  instead of a list; with zero runs it shall show "No runs yet…" (BR-17); a filter without match shall
  show "No runs match this filter" with "Clear filter". The area shall repeat no panel-level state
  (PD-036).
- **AC-028** While the store is *read-only* or the workspace is in Restricted Mode, the system shall
  show Cancel, Resume and the answer controls disabled with the reason, and keep everything else
  readable (BR-14).
- **AC-029** The system shall show every run status, request and error as text, with colour only in
  addition, and make every action reachable with Tab and activatable with Enter or Space.
- **AC-030** The system shall create, change or delete no file in the workspace while showing or
  updating the Agent Center (PD-013); a fixture comparison before and after each scenario decides it.

**Manual checks** (cannot be decided with the fake provider): after the PoC of PD-001, Gregor runs
one real Copilot run on `C:\projects\test\tip-splitter` and confirms (1) events appear live, (2) an
approval request is shown, notified, answered once and the agent continues, (3) cancel stops the
agent, (4) the run and its events are shown after a VS Code restart, (5) reported file changes match
the files the agent touched. AC-029 additionally in a high-contrast theme.

## 11. Technical notes for developers or AI agents

- Greenfield: no source modules yet. The area is a React view inside the shell's webview (PD-008,
  ADR-001 §2); it receives runs, event pages, store state and capabilities only as typed messages and
  sends navigation, answer, cancel and resume requests the same way (0005 §11).
- A pure projection in the core turns a run plus event pages into rows (folding deltas, current
  activity, open requests); it is the unit under test for AC-005…AC-011, AC-014…AC-020, AC-026.
- Request and answer contracts with 0011 (request ID, decision `approve-once | reject`, feedback,
  text) are fixed in `/sdd-plan` with 0011's plan. Copilot maps `approve-once`/`reject` 1:1 (ADR-003 §1).
- Notification (AC-018) is raised by the host, not the webview, so it works with the panel closed.
- ADR-003 §4 gives unknown events `raw?`; PD-029 stores no raw provider data. PD wins here (OP-01).

## 12. Assumptions

| ID | Assumption | Why | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | 0009 names its kinds as in ADR-003 §4 and declares `toolEvents`, `fileChanges`, `resume` per provider | ADR-003 §3 is 0009's starting point (SPECIFY-LATE) | Labels and AC-014/015/022 need re-mapping |
| A-002 | Current activity = open request, else open tool call, else "not available" | Gregor accepted (questions round, 2026-11-16) | AC-007 changes |
| A-003 | `Interrupted` duration is "not available" | 0004 BR-011 end time is classification time; Gregor accepted | AC-006 changes |
| A-004 | 0011 accepts answers, cancel and resume by run ID and refuses with a reason | Ownership per PD-024/PD-025; 0011 not yet written | Error handling of §9 changes |
| A-005 | The store notifies consumers of new runs, events and status changes | 0006 AC-015 and 0007 rely on the same | AC-012/013 need polling |

## 13. Open points

- OP-01 (for 0009): ADR-003 §4 `raw?` on `provider.unknown` contradicts PD-029. This spec follows
  PD-029.
- OP-02: Wording of notices and confirmation texts — fixed in `/sdd-plan` (English, PD-016).
- OP-03: 0006 BR-08 still names "Recovery pending" as a drill-down figure; PD-024/PD-046 removed it
  (also 0004 OP-013).

## 14. Definition of Ready / Done

Ready: as `/sdd-specify` defines; additionally 0004, 0005, 0009 and 0011 are clarified. Done: all
criteria pass in the unit and component tests, the manual checks of §10 are confirmed by Gregor,
and the architecture snapshot lists the Agent Center module.

## 15. Recommended next steps

1. `/sdd-clarify` on this spec in a fresh session, together with 0011 for A-004 and the answer contract.
2. `/sdd-plan` after 0009 and 0011 are clarified.
