# Live Agent Activity & Monitoring (Agent Center)

**Status:** In Progress
**Plan:** [0012-live-agent-activity-monitoring.plan.md](0012-live-agent-activity-monitoring.plan.md)

Handoff reference: FS-012 ([po-handoff.md](../../docs/product/po-handoff.md) §4.4, §5.3, §10 FS-012,
§13). Depends on: 0004 (runs, events, store state), 0005 (shell, panel-level states, navigation),
0009 (kinds, payloads, capabilities), 0011 (statuses, error classes, stop, resume, answers).
Navigation requests come from 0006 and 0008; 0006 and 0007 show run status themselves (§4).

## 1. Summary

The Agent Center is the fourth area of the Studio panel. It lists the agent runs of the active
project and shows one run in detail: who runs it, for which spec, what it is doing now, the events
in order, tool calls, file changes, approval and input requests, errors and the result. The
developer can answer approval and input requests, cancel a run, resume an interrupted run where
0011 allows it, and jump to the spec. Everything updates live and survives a restart.

## 2. Goal and problem

User story (FS-012): "As a developer I want to follow live what an agent is working on and whether
I need to step in." Without this area a run is a black box: the developer cannot see that an agent
waits for an approval, which files it touched, or why it failed. Success: from a run figure or
highlighted run (0006), a start-failure notice (0008) or a request notification the developer
reaches the run in one action and sees what it waits for.

## 3. Users and roles

- **Developer** (only role, `projectbrief.md`): reads runs, answers requests, cancels, resumes.
- No permission differences inside Studio. Limits come from the window (reader window, PD-030) and
  Workspace Trust (Restricted Mode, 0005 S7).

## 4. Scope

### In scope

- Run list; run detail with header, current activity, timeline, file changes, requests, error
  details and result.
- The answer controls for approval and input requests, and one notification per request.
- Actions: Cancel run, Resume (where 0011 allows), Open spec, Open file.
- Live updates, paged history, in-area empty and unavailable states (PD-036).
- What a run target and a spec target of the shell's navigation request do here (PD-040).

### Out of scope

- Run status on spec cards and run figures on the dashboard (FR-012.1, AC-012.1, AC-012.2) — because 0007 AC-007 and 0006 own them (Gregor, 2026-11-16).
- Panel-level states (no project, loading, load error, Restricted Mode note) — because the shell owns them (PD-036).
- Starting, retrying or restarting a run — because new runs start only from the board through 0008 (Gregor, 2026-11-16).
- Status transitions, the rules for stop and resume, the resume confirmation, delivering answers to the provider — because 0011 owns them (PD-024, PD-025); this area only requests them.
- Event normalisation, kinds and capability declarations — because 0009 owns them.
- Error texts per category and provider remedy texts — because 0009 BR-009 and 0010 BR-12 supply them; this area shows the stored message.
- A run-set target, and filters the developer sets inside the area — because PD-040 knows three targets (spec, run, board filter) and no spec sends a run set (0006).
- Session-wide or location-wide approvals ("approve for session") — because the MVP answers each request once (PD-006).
- Attributing file changes from the file watcher or a git diff — because another actor may have made them (AC-012.5).
- A diff view of changed files — because it is not needed for the first feedback loop (P7).
- Raw provider payloads of unknown events — because PD-029 stores no raw provider data in the MVP.
- Agent flow graph, session replay, token and cost analysis — because handoff §2.3 excludes them.
- Clearing run history — because 0004 AC-019 owns the command.
- Any write to `.specs/`, `.memory-bank/` or `AGENTS.md` — because PD-013 keeps Studio read-only there.

## 5. Functional flow

1. The developer opens the Agent Center from the panel navigation, a run figure (0006), a
   start-failure notice (0008) or a request notification; a target selects a run or sets the filter.
2. The detail of the selected run shows header, current activity and the newest events, and
   follows new events and status changes.
3. The run waits for approval: the developer answers with "Approve once" or "Reject"; 0011 delivers it.
4. The run ends: the detail shows the result (`Completed`) or the error details (`Failed`).
5. After a restart the same runs and events are shown; open runs are `Interrupted` (0004 AC-011).

## 6. Business rules

Terms: **run** — a stored run of 0004, identified by its run ID; **open** and **ended** as 0004
BR-001. **Run row** — in the run list; **timeline row** — in the detail. **Request** — an
`approval.requested` or `input.requested` event (0009 §8.2), **open** until the `.resolved` event
with its request ID arrives or its run ends. **Provider** — shown by display name (0009 BR-001), by
ID while not registered. **Restart** — a new activation (0004 §6). **Follow mode** — the timeline
keeps the newest event visible.

- **BR-01 Run list.** Every stored run of the active project (0004 AC-008), open runs first, then by
  created time, newest first. Each run row: number and title of the spec that carries the run's
  stem (PD-018) — of several (PD-019) the one at the run's stored path, else the stem alone; of
  none "spec not found" (0011 BR-013, PD-046) — provider, run status as text, start time, duration,
  and "history incomplete" where 0004 flags the run (0004 BR-006).
- **BR-02 Targets and selection** (PD-040). A run target selects that run and clears the filter. A
  spec target filters the list to that stem's runs; the filter shows its label (the spec number;
  the stem for "spec not found"), is cleared with one action, and deselects a run it hides. A new
  target replaces the filter; a board-filter target changes nothing. A run ID the store does not
  hold — as a target, or because the selected run was removed (0004 BR-008) — gives the notice of
  AC-002 and no selection. Selection and filter are remembered across area switches and restarts.
- **BR-03 Header** (handoff §4.4). The values of AC-005; one the store does not hold shows "not
  available" (P8; 0004 AC-003).
- **BR-04 Start time and duration.** Start time is the run's first `Running` entry (0004 §8
  *started*); none → start time and duration "not available". Open run: now − start time, updated
  while shown (OP-06). `Completed`, `Failed`, `Cancelled`: end time − start time. `Interrupted`:
  "not available", because its end time is the time of classification (0004 BR-011; Gregor,
  2026-11-16).
- **BR-05 Current activity** (Gregor, 2026-11-16). For an open run, the first that applies: an open
  approval request ("Waiting for approval: <summary>"); an open input request ("Waiting for input");
  a `tool.started` without the `tool.completed` of its call ID ("Running tool <name>"); otherwise
  "not available". Of several, the oldest request (0011 BR-004) and the newest tool call. Ended runs
  show none.
- **BR-06 Timeline.** The stored events in sequence order (0004 AC-005: order of receipt), one row
  per event except for folding. A row shows the kind as a word, the time
  (occurred-at if delivered, otherwise received-at), the source, and the payload fields of its kind
  (0009 §8.2) as plain text — no markup is interpreted. Source: *provider* or *derived* as
  delivered (FR-012.9); *Studio* for the store's `truncated` event ("Event history truncated at the
  size cap", 0004 AC-027); "not available" where none is stored. Folding: the `message.delta`
  events since the previous `message.completed` (or the run's start) form one message row with the
  next `message.completed`; it grows per delta and shows the `message.completed` text once that
  arrives. A `provider.unknown` event, or a stored type outside 0009 §8.2, shows "Unknown provider
  event: <name>" — the provider's type name, or the stored type — and no payload.
- **BR-07 History paging.** The detail loads the newest page of events; "Load earlier" loads the
  page before the oldest loaded event (0004 AC-006; page size: 0004 OP-010). The view never asks
  for all events of a run at once (handoff §13 Performance). Current activity, open requests and
  the file-change list cover the whole run, not only the loaded pages.
- **BR-08 Follow mode.** On when a run is opened. Scrolling away from the newest event turns it off
  and shows "Jump to latest"; that action, or scrolling back to the newest event, turns it on.
- **BR-09 Tool calls** (AC-012.4). A tool call is shown as the timeline rows of its `tool.*` events
  and from nothing else. Where the provider declares `toolEvents` as `none` (0009 BR-002), the
  detail says "Tool calls: not delivered by <provider>".
- **BR-10 File changes** (AC-012.5). Listed only from `file.changed` events, each with path,
  operation and its basis from the event's confidence (0009 §8.2): "reported by provider" or
  "derived from tool input". Where `fileChanges` is `none`: "File changes: not delivered by
  <provider>". No other source attributes a file to a run.
- **BR-11 Requests and answers** (PD-006). Every open request of the shown run is listed, oldest
  first. An approval request shows its kind of action and summary (0009 §8.2), "outside the project
  folder" where it carries `outsideProject` (0010 BR-06), "Approve once", and "Reject" with an
  optional reason (0009 BR-005). An input request shows its question and a text field with "Send".
  An answer is handed to 0011 once; its controls are disabled until the request closes or 0011
  refuses. Nothing is answered automatically and there is no timeout.
- **BR-12 Notification.** One VS Code notification per request, in a window that can answer it
  (BR-14): it names the spec number (the stem for "spec not found") and whether approval or input
  is asked, and offers "Open in Agent Center" (navigates to the run).
- **BR-13 Actions.** "Cancel run" on an open run whose provider declares `cancel` other than `none`
  (0011 BR-006); with `none` the detail says "Cancel: not supported by <provider>". This area asks
  the one confirmation, then hands the stop to 0011. "Resume" only on a run 0011 reports as
  resumable (0011 BR-005; PD-007); 0011 asks the confirmation (0011 AC-016). A refusal shows
  0011's reason at the control. "Open spec" sends a navigation request to Spec Explorer with the
  stem (PD-040, PD-042); absent for "spec not found". "Open file" for a changed path whose file
  exists inside the active project (the rule of PD-044).
- **BR-14 Action availability.** In a reader window (store *read-only*, 0004 AC-025) Cancel, Resume
  and the answer controls are disabled and show the store's reason. In Restricted Mode they are
  not offered and the area adds no text: the shell's note says why (PD-036, ADR-001 §14). The rest
  of the area works in both.
- **BR-15 Error details** (FR-012.6). For a `Failed` run, the items of AC-019. The error class is
  0011 BR-008's; the stored message carries 0009 BR-009's generic text and 0010 BR-12's remedy text
  where the adapter delivered them.
- **BR-16 Result.** For a `Completed` run: the final message of the stored result (0011 BR-011), or
  "No result delivered", and the text that the spec is not done until FeatherSpec verifies it
  (AC-011.8). `Cancelled` and `Interrupted` runs show their status only (OP-07).
- **BR-17 In-area states** (PD-036). No runs → "No runs yet. Start one by moving a Ready spec to
  Active on the Spec Board." Filter with no match → "No runs match this filter" with "Clear filter".
  Store *unavailable* → "Runs: not available — <reason>" (0004 AC-025), never an empty list. One
  run "history unreadable" (0004 AC-015) → its run row and detail say so; other runs unaffected.

## 7. Functional requirements

| ID | Requirement | Handoff | Criteria |
| --- | --- | --- | --- |
| FR-01 | Run list with spec, provider, status, times; run and spec targets | §4.4, FR-012.2 | AC-001, AC-002, AC-003, AC-004 |
| FR-02 | Run header and current activity | §4.4 | AC-005, AC-006, AC-007 |
| FR-03 | Events in order, with kind and source, paged | FR-012.2, FR-012.9 | AC-008, AC-009, AC-010, AC-011 |
| FR-04 | Live updates without a developer action | FR-012.7 | AC-012, AC-013 |
| FR-05 | Tool calls only from provider data | FR-012.3 | AC-014 |
| FR-06 | File changes only where attributable, with basis | FR-012.4 | AC-015 |
| FR-07 | Approval and input requests visible and answerable | FR-012.5, PD-006 | AC-016, AC-017, AC-018 |
| FR-08 | Errors and results understandable | FR-012.6 | AC-019, AC-020 |
| FR-09 | Actions: cancel, resume, open spec, open file | §4.4; Open file: PD-044 | AC-021, AC-022, AC-023, AC-024 |
| FR-10 | History available after restart | FR-012.8 | AC-025 |
| FR-11 | Unknown events never break the view | AC-012.9 | AC-026 |
| FR-12 | Honest in-area states, accessibility, no workspace writes | P8, §13, PD-013 | AC-027, AC-028, AC-029, AC-030 |
| — | Status on cards and dashboard | FR-012.1 | 0007 AC-007, 0006 (not restated) |

## 8. Data requirements

Read only, all through the extension (0005 §15): runs with their flags, status histories and pages
of events from 0004; the store state (0004 AC-025); registered providers with display name and
capabilities (0009); "spec not found", whether a run is resumable, and refusal reasons from 0011;
spec number, title, stem and path from 0002. Stores nothing of its own except remembered UI state
(selected run ID, spec filter), kept where the shell keeps its own (0005 §8). Event payloads are
already masked by 0004 (PD-029).

## 9. Error cases and edge cases

- Store state changes while the area is shown → the area follows it (0004 AC-025; BR-14, BR-17).
- Request resolved elsewhere, or run ends while a request is open → the request closes; its
  controls disappear.
- Late or duplicate events → shown as 0004 stores them (0004 AC-007, AC-028).
- Run ends inside a message → the row keeps the joined deltas. `message.completed` without deltas →
  its own row. Deltas older than the loaded pages → the row shows the loaded part until
  `message.completed` or "Load earlier" brings the rest.
- Provider of a stored run not registered (0009 BR-006) → its ID as name, no capability notes.
- A page arriving for a run no longer shown is dropped.

## 10. Acceptance criteria

"The system" is FeatherSpec Studio. Unless marked, an automated test with the fake provider of 0009
and the in-memory store of 0004 decides each criterion. Quoted UI texts are working wording;
`/sdd-plan` fixes them in one text table (OP-02) that the tests read.

- **AC-001** The system shall list in the Agent Center every stored run of the active project, open
  runs first and then newest created first, each run row showing spec number and title (or "spec
  not found"), provider, run status as text, start time, duration, and "history unreadable" or
  "history incomplete" where 0004 reports it (BR-01, BR-17).
- **AC-002** When the shell delivers a navigation request with a run ID, the system shall clear the
  filter, select that run and show its detail. If the store holds no run with that ID, or the
  selected run leaves the store, then the system shall show "Run <ID> is not in the run history"
  and select nothing.
- **AC-003** When the shell delivers a navigation request with a spec stem, the system shall list
  exactly the runs of that stem, show the filter's label, and list all runs again after the
  developer clears it with one action.
  > **Given** runs R1, R2 of `0007-board` and R3 of `0003-lifecycle` **When** the target is stem
  > `0007-board` **Then** only R1 and R2 are listed under the label "0007".
- **AC-004** If no spec of the project carries a run's stem, then the system shall show "spec not
  found" in its run row and detail and offer no "Open spec" (PD-046).
- **AC-005** When a run is selected, the system shall show run ID, provider, model, provider session
  reference, spec, status, start time and duration, and "not available" for every value the store
  does not hold.
- **AC-006** The system shall show the duration of a `Completed`, `Failed` or `Cancelled` run as end
  time − start time, of an open run as the test clock's now − start time, and of an `Interrupted`
  run or a run without a start time as "not available" (BR-04).
- **AC-007** While a run is open, the system shall show its current activity per BR-05, also when
  the deciding event lies outside the loaded pages; with neither an open request nor an open tool
  call it shall show "not available".
- **AC-008** The system shall show the stored events as timeline rows in ascending sequence order,
  each with kind, time, source and its payload as plain text, one row per event except that the
  `message.delta` events of one message and its `message.completed` form one row (BR-06).
  > **Given** a fake run emitting 3 `message.delta` and 1 `message.completed`, then 1 `tool.started`
  > **Then** the timeline has 2 rows: the message with the `message.completed` text, then the tool
  > call. A payload text `<b>x</b>` is shown as those eight characters.
- **AC-009** When a run is opened, the system shall hand the view only the newest page of its events;
  when the developer activates "Load earlier", the system shall request the page before the oldest
  loaded event. The system shall send the store no request for more events than the page size
  (0004 OP-010) — also while it reads the whole run page by page for current activity, open
  requests and file changes (BR-07) — and shall offer no "Load earlier" once the run's first event
  is loaded. *(Revised 2026-11-17, second `/sdd-compile`: "request only the newest page" read
  literally contradicted BR-07, AC-007 and AC-015, which need the whole run; §11 already said the
  extension feeds the projection the whole run page by page.)*
- **AC-010** While follow mode is on, the system shall keep the newest event visible as events arrive;
  when the developer scrolls away, the system shall stop following and show "Jump to latest"; that
  action, or scrolling back, shall resume following. Decided by the follow state and the scroll
  request; the visible scrolling is a manual check.
- **AC-011** The system shall label every timeline row with its source and every file change with its
  basis, and shall show "not available" as the label where the store holds no source (FR-012.9).
- **AC-012** When the store records a new event or status change for the shown run, the system shall
  show it without a developer action within 500 ms after the area receives the store's signal
  (PD-047).
- **AC-013** When the store records a new run or a status change of any listed run, the system shall
  update the run list within 500 ms after the area receives the store's signal (PD-047).
- **AC-014** The system shall show a tool call only as the rows of its `tool.*` events. Where the
  run's provider declares `toolEvents` as `none`, the system shall show the note of BR-09.
- **AC-015** The system shall attribute a file to a run only from that run's `file.changed` events —
  all of them, also outside the loaded pages — showing path, operation and basis. Where the provider
  declares `fileChanges` as `none`, the system shall show the note of BR-10. The system shall not
  list a file that changed in the workspace during the run without such an event.
- **AC-016** While an approval request is open, the system shall show its kind of action and summary,
  "outside the project folder" where it carries `outsideProject`, "Approve once", "Reject" and a
  reason field for Reject, and no other decision. When the developer activates one, the system
  shall hand run ID, request ID, decision and reason to 0011 exactly once; a second activation
  before the request closes shall hand over nothing. If 0011 refuses, then the system shall show
  0011's reason at the control and enable the controls again.
- **AC-017** While an input request is open, the system shall show its question with a text field
  and "Send"; on "Send" the system shall hand run ID, request ID and the text to 0011 once. In no
  scenario of this section shall the system hand an answer to 0011 without a developer activation;
  the system shall close a request only on its `.resolved` event or the run's end state.
- **AC-018** When a request opens while the store is *writable*, the system shall show exactly one VS
  Code notification for it, naming the spec number and whether approval or input is asked, with
  "Open in Agent Center"; activating it shall send a navigation request with that run ID. In a
  reader window, in Restricted Mode (BR-12, BR-14), and while that run's detail is shown in the
  focused panel (OP-10) the system shall show none. *(Revised 2026-11-17, second `/sdd-compile`:
  the two exceptions decided in BR-12 and OP-10 were missing from the criterion.)*
- **AC-019** When a `Failed` run is selected, the system shall show the error class in words ("Unknown
  error" for `unknown` and for a value outside 0011 BR-008), the stored message, the failure time,
  the last status before `Failed` and the last event before the failing one.
- **AC-020** When a `Completed` run is selected, the system shall show the final message of its stored
  result or "No result delivered", and the text that the spec is not done until FeatherSpec
  verifies it.
- **AC-021** When the developer activates "Cancel run" on an open run, the system shall ask for one
  confirmation stating that the agent stops and changes already made stay; on confirmation it shall
  hand the run ID to 0011, on decline it shall do nothing. The system shall offer "Cancel run" on
  no ended run and, where the provider declares `cancel` as `none`, show "Cancel: not supported by
  <provider>" in its place.
- **AC-022** The system shall offer "Resume" only on a run 0011 reports as resumable (0011 AC-015)
  and on activation hand the run ID to 0011 without a confirmation of its own. Apart from
  "Resume", the system shall offer no control that starts a run. If 0011 refuses a stop or a
  resume, then the system shall show 0011's reason at the control.
- **AC-023** When the developer activates "Open spec", the system shall send the shell one navigation
  request to Spec Explorer with the run's stem (PD-040), and open no other view itself.
- **AC-024** The system shall offer "Open file" for a changed path only when that file exists inside
  the active project at the time the entry is shown.
- **AC-025** When the Agent Center is shown after a restart, the system shall show the runs and
  events the store returns (0004 AC-010) as the same rows in the same order as before, formerly
  open runs as `Interrupted` without an open request, and the remembered selection and spec filter
  (BR-02).
- **AC-026** If an event is `provider.unknown` or has a stored type outside 0009 §8.2, then the system
  shall show one row "Unknown provider event: <name>" without payload and go on showing every later
  event.
  > **Given** the fake's scenario *unknown event* **Then** one row shows "Unknown provider event:
  > fake.mystery" and the later rows follow. **Given** a stored event of type `x.custom` **Then** its
  > row shows "Unknown provider event: x.custom".
- **AC-027** If the store is *unavailable*, then the system shall show "Runs: not available — <reason>"
  with the store's reason instead of a list; with zero runs "No runs yet…" (BR-17); for a filter
  without a match "No runs match this filter" with "Clear filter". The system shall show none of
  the shell's panel-state texts (0005 S1–S9) inside the area (PD-036).
- **AC-028** While the store is *read-only*, the system shall show Cancel, Resume and the answer
  controls disabled with the store's reason. While the workspace is in Restricted Mode, the system
  shall offer none of them and add no text about it. In both, the system shall keep list, detail,
  paging and "Open spec" working (BR-14).
- **AC-029** The system shall show every run status, request and error as text, with colour only in
  addition, and make every control — run rows, "Load earlier" and "Jump to latest" included —
  reachable with Tab and activatable with Enter or Space.
- **AC-030** The system shall create, change or delete no file in the workspace while showing or
  updating the Agent Center (PD-013); a fixture comparison before and after each scenario decides it.

**Manual checks** (cannot be decided with the fake provider): after the PoC of PD-001, one real
Copilot run on `C:\projects\test\tip-splitter` confirms (1) events appear live and the timeline
follows them, (2) an approval request is shown, notified, answered once and the agent continues,
(3) cancel stops the agent, (4) the run and its events are shown after a VS Code restart, (5)
reported file changes match the files the agent touched. These need a real agent in a real VS Code
window: checked by Gregor or his delegate; pre-release checklist item (delegation by Gregor,
2026-11-17). They are not criteria; the criteria above stay decided by the automated tests. AC-010's
visible scrolling and AC-029's high-contrast look were checked by Gregor's delegate in headless
Chrome with the real core and VS Code's theme variables (2026-11-17; plan *Open evidence*).

## 11. Technical notes for developers or AI agents

- Greenfield: no source modules yet. The area is a React view inside the shell's webview (PD-008,
  ADR-001 §2); it receives runs, event pages, store state and capabilities only as typed messages and
  sends navigation, answer, stop and resume requests the same way (0005 §15).
- A pure projection in the core turns a run plus its events into rows, current activity, open
  requests and file changes. The extension feeds it the whole run page by page; the webview holds
  the loaded pages plus those summaries (BR-07). Unit under test for AC-005…AC-011,
  AC-014…AC-020, AC-026.
- The answer contract with 0011 (request ID, decision `approve-once | reject`, reason, text) is
  fixed in `/sdd-plan` with 0011's plan; what 0004 must add is OP-14.
- Notification (AC-018) is raised by the host, not the webview, so it works with the panel closed.

## 12. Assumptions

| ID | Assumption | Why | What breaks if wrong |
| --- | --- | --- | --- |
| A-006 | Each stored event carries its source as the top-level payload field `source` (0011 plan *Surface*, "Stored events") | 0009 §8.2 delivers it; 0004 §8 has no field; the 0011 plan stores it in the payload | Rows show the source "not available" (AC-011 stays true) |

A-001…A-004 are withdrawn: decided by 0009 (BR-002, §8.2), by Gregor (now BR-05, BR-04) and by
0011 (BR-005, BR-006, AC-011, AC-015). A-005 is withdrawn (2026-11-16, `/sdd-plan`): new runs and
status changes come from 0004's run-change notification (0004 AC-030); stored events from a
notifying wrapper around the window's store that this spec's plan adds (writer window only, OP-09).

## 13. Open points

Resolved:

- OP-01, OP-03 (2026-11-16): settled by 0009 BR-007 (no `raw`) and by 0006 (no "recovery pending").
- OP-04 (2026-11-16): `/sdd-clarify` listed 80 findings, 14 blocking; resolved in one pass at
  Gregor's standing request from the PD register, 0004, 0009, 0010 and 0011; none asked. The list
  with its disposition is kept outside the repository (`0012-findings.md`). Readings made on the
  way — say so if one is wrong: (a) the named run set (interview Q2) is removed: PD-040 has no
  such target and nothing sends one; (b) a message row shows the `message.completed` text once it
  arrives; (c) tool calls are timeline rows, not a list of their own; (d) with `cancel` `none` the
  detail says so instead of a button 0011 refuses; (e) in Restricted Mode the controls are absent,
  not disabled; (f) the reason belongs to Reject only; (g) error and remedy texts arrive inside
  the stored message; (h) "the last event" is the one before the failing event; (i) request
  notifications appear only in the window that can answer; (j) selection and filter survive a
  restart; (k) payload text is never interpreted as markup.

- OP-02, OP-05…OP-13 (2026-11-16, `/sdd-plan`): decided by the recommendations below, approved
  by Gregor as a standing answer for this plan session. OP-02: the wording is the text table of
  the plan (*Texts*), one file the tests read (`src/shared/protocol/agentCenterTexts.ts`). OP-05:
  only BR-04's duration is shown. OP-06: whole seconds, refreshed once a second while shown.
  OP-07: a status entry's cause is shown beside the status in the header. OP-08: after a
  confirmed Resume the new run is selected. OP-09: no live updates in a reader window; it re-reads
  when the area is shown. OP-10: no notification while that run's detail is shown in the focused
  window. OP-11: "Send" is disabled while the field is empty. OP-12: the view keeps a fixed number
  of loaded pages (named constant) and drops the oldest while following. OP-13: selection and
  filter are kept per project root.
- OP-14, 0004 and 0009 parts (2026-11-16, `/sdd-plan`): no change to 0004 is needed — sequence
  numbers are contiguous per run, so the page before the oldest loaded event is read forwards from
  a computed start; the event signal is the plan's store wrapper (A-005); `source` stays A-006.
  0009's plan surface carries `outsideProject` on `approval.requested`.

Open (cross-spec, main session; does not block):

- OP-14, 0007 part: a card offers no way to its run in the Agent Center.

## 14. Definition of Ready / Done

Ready: no open point blocks (OP-04); 0004, 0005, 0009 and 0011 are clarified before planning.
Done: all criteria pass in the unit and component tests, the host smoke passes on Windows and CI,
the delegate checks of §10 are recorded, the real-agent checks of §10 are on the pre-release
checklist (Gregor, 2026-11-17), and the architecture snapshot lists the Agent Center module.

## 15. Recommended next steps

Gregor reads OP-04's readings and OP-05…OP-13; then `/sdd-plan`, together with 0011's plan (§11).
