# Agent Orchestrator & Run Lifecycle

**Status:** Implemented
**Plan:** [0011-agent-orchestrator-run-lifecycle.2026-11-17.plan.md](../plan-archive/0011-agent-orchestrator-run-lifecycle.2026-11-17.plan.md)

Handoff reference: FS-011 ([po-handoff.md](../../docs/product/po-handoff.md) §8.4, §10 FS-011,
§5.3, §6.2, §7). Decisions: PD-004, PD-005, PD-006, PD-007, PD-011, PD-013, PD-018, PD-019,
PD-024, PD-025, PD-029, PD-030 ([product-decisions.md](../../docs/product/product-decisions.md));
provider facts: [ADR-003](../../docs/decisions/ADR-003-first-agent-provider.md).
Depends on: 0004 (run store), 0009 (provider port, capabilities, event kinds), 0010 (first
provider; see OP-006). Callers: 0008 (start), 0012 (stop, resume, answers). Readers of run data:
0006, 0007, 0012 through 0004.

## 1. Summary

The orchestrator is the one place that turns a start request into an agent run, drives the run's
status from the provider's events, stops and resumes runs, forwards the human's answers to
approval and input requests, classifies errors and stores the result. It never decides a spec's
lifecycle: a completed run leaves the spec where its files put it.

## 2. Goal and problem

A developer has to be able to trust what Studio says about an agent run: every run is created
the same way, has exactly one current status that follows fixed rules, can be stopped, and
ends with a stored result or a classified error. Without one owner for these rules, start,
board, monitoring and persistence would each interpret provider events differently and the
status would drift from the truth (handoff P5, P8).

Success: every scenario of §12 ends in the status this spec prescribes, and the run's result or
error is readable through 0004 afterwards.

## 3. Users and roles

- **Developer** (only role): starts runs through 0008, stops and resumes them through 0012 or the
  palette commands of §9, answers approval and input requests through 0012.
- No permissions model beyond PD-030: only the writer window may change a run.

## 4. Scope

### In scope

- Creating a run for 0008's start request; the last guard against a second open run (PD-005).
- The transition rules of the eight run statuses of 0004 BR-001 (PD-025), driven by 0009's events.
- Stop, resume of `Interrupted` runs, forwarding approval and input answers to the provider.
- The closed list of error classes, both timeouts, the run result, the previous-run summary.
- The "spec not found" flag (PD-011), the resume confirmation, the continuation text and two
  palette commands.

### Out of scope

- The start prompt, the readiness check, provider choice and the start confirmation — because
  0008 owns them (Gregor, 2026-11-16; PD-002, PD-045).
- Buttons, answer controls and the confirmation of 0012's "Cancel run" — because 0012 owns that
  UI (Gregor, 2026-11-16; 0012 AC-021); 0011 owns the operations behind them.
- Showing runs, events and results — because 0006, 0007 and 0012 render them.
- Storing, masking, retention and the `Interrupted` classification at activation — because 0004
  owns them (0004 BR-004…BR-008, PD-024, PD-029).
- Event kinds, capabilities and error categories — because 0009 owns them.
- Automatic retries, scheduling, several runs at once — because PD-005 and handoff §2.3 exclude them.
- Changing a spec's board state, writing to `.specs/`, `.memory-bank/` or `AGENTS.md` — because
  PD-004 and PD-013 keep Studio read-only; Review and Done follow the files (0003).
- Adopting sessions Studio did not start — because PD-010 excludes it.
- Detecting stalled runs — because Gregor chose no time limit once a session started (BR-009).
- "Approve for session" or "for location" answers — because they widen permissions (PD-006).

## 5. Functional flow

1. 0008 hands over one start request (§9). The orchestrator checks BR-002, BR-012 and BR-015,
   creates the run in 0004 (`Starting`) and calls the provider's start through 0009's port.
2. It hands every event the port delivers to 0004; each one 0004 accepts may change the status
   (BR-003). Requests set a waiting status; the developer's answers (0012) are forwarded.
3. The run ends: completed, failed (classified), or cancelled. The result is stored.
4. After a restart, open runs are `Interrupted` (0004 AC-011); the developer may resume one.

## 6. Business rules

Terms:

- **Open / end state** — 0004 BR-001: `Starting`, `Running`, `WaitingForApproval`,
  `WaitingForInput` are open; `Completed`, `Failed`, `Cancelled`, `Interrupted` are end states.
- **Project** — the active project of 0001; its runs are those of its store (PD-026).
- **End kind** — `run.completed`, `run.failed` or `run.cancelled` (0009 BR-008).
- **Open request** — an approval or input request from its `.requested` event until its
  `.resolved` event or the run's end state (0009 §8.2, 0012 BR-11); an answer does not close it.
- **Error class** — the stored reason of a `Failed` run (BR-008); 0009's *category* is what a
  `run.failed` event or a refused port call carries.
- **Latest run of a spec** — the newest created run recorded under its stem (0004 AC-008).
- **Refuse** — return a reason to the caller and change nothing. A developer *declines*.

Rules:

- **BR-001 Transitions** (PD-025, Gregor 2026-11-16). Allowed, and nothing else:
  `Starting` → `Running` · `Failed` · `Cancelled`; `Running` → `WaitingForApproval` ·
  `WaitingForInput` · `Completed` · `Failed` · `Cancelled`; `WaitingForApproval` ⇄
  `WaitingForInput`; `WaitingForApproval` · `WaitingForInput` → `Running` · `Completed` ·
  `Failed` · `Cancelled`. End states are final; the first one wins. A late event never changes a
  status (0004 AC-028). The orchestrator never sets `Interrupted`; only 0004 AC-011 does (PD-024).
- **BR-002 One open run** (PD-005). A start or resume is refused while any run of the project is
  in an open state. 0008 checks first (0008 P-5); the orchestrator checks again when it creates
  the run.
- **BR-003 Events and status.** Only events 0004 accepted count, so a duplicate (0004 AC-007) has
  no effect. An end kind sets `Completed`, `Failed` or `Cancelled`. `session.started` sets
  `Running` and its session reference goes to 0004. From then on the status is
  `WaitingForApproval` while an approval request is open, else `WaitingForInput` while an input
  request is open, else `Running`. A status is appended only where it differs from the current one
  and BR-001 allows the step. Every other kind changes no status; a `.resolved` for a request
  that is not open is ignored.
- **BR-004 Waiting precedence.** Approval requests win over input requests (BR-003). A request
  that opened before `session.started` counts from that event on.
- **BR-005 Resume** (PD-007, PD-024, Gregor 2026-11-16). Possible only when all of these hold; the
  first that fails, in this order, is the refusal reason: (1) this window is the writer and the
  store is *writable*; (2) the run is `Interrupted`; (3) it is the latest run of its spec; (4)
  BR-002 holds; (5) its provider is registered and declares `resume`; (6) a session reference is
  stored; (7) exactly one entry of the project carries the stem (PD-019); (8) that entry is not
  Done (0003). The orchestrator asks one confirmation naming stem and run ID, then checks again.
  Resume creates a **new run**: `Starting`, the old run's provider ID and stem, the entry's
  current path, and the cause "resumed from <run ID>" on its first status entry. The provider's
  resume gets the new run's ID, the stored session reference and the continuation text (owned
  here; OP-005). The old run stays `Interrupted`.
- **BR-006 Stop** (Gregor 2026-11-16). Possible for a run in an open state whose provider declares
  `cancel`. One confirmation, asked by the surface that offers the stop: 0012's control (0012
  AC-021) or the palette command; the stop operation itself asks nothing and calls the
  provider's cancel once. The run becomes `Cancelled` on `run.cancelled`; another end kind that
  arrives first wins. If no end kind arrives within the stop timeout (30 s) after the cancel call,
  whatever that call returned, the orchestrator sets `Cancelled` itself with the cause "stop not
  confirmed by provider" and calls the port's `endSession` once (0009 OP-006). Stopping the
  runtime is the adapter's duty (0010 BR-13; OP-004).
- **BR-007 New start after an end state** (handoff §5.3 step 5). No automatic retry ever. A new run
  is a normal start through 0008. On request the orchestrator returns the previous-run summary of
  a stem: the latest run's ID, status, error class and error text.
- **BR-008 Error classes** (FR-011.6; closed list owned here, 0004 §8 stores it):
  `auth`, `quota_or_rate_limit`, `model_unavailable`, `network_or_server`, `runtime_missing`,
  `policy_denied`, `provider_exited`, `start_timeout`, `unknown`. A `run.failed` whose category
  (0009 BR-009) bears the name of a class gets that class; any other category is `unknown`. A
  `run.failed` with source `derived` — the provider stopped without an end kind (0009 BR-008) —
  is `provider_exited`. A start or resume that fails reaches the orchestrator as the `run.failed`
  0009's port delivers for it (0009 BR-008) and is classed by the two rules before; a start or
  resume the port refuses without delivering an end kind fails the run at once with `unknown` and
  the refusal reason as error text. A failed tool call fails no run. A run still `Starting` when
  the start timeout (60 s) has passed since its creation becomes `Failed`/`start_timeout`, and the
  orchestrator calls cancel once where declared, then `endSession` once (0009 OP-006).
- **BR-009 No stall timeout** (Gregor 2026-11-16). Once a session has started, an open run without
  events keeps its status, however long; only an end kind, the stop timeout or a restart (0004
  AC-011) ends it.
- **BR-010 Answers** (PD-006). An answer names run ID and request ID. Approval: "approve once" or
  "reject" with an optional reason. Input: free text, passed unchanged. For an open request the
  orchestrator forwards the answer and returns the provider's result, a refusal included; for
  any other — unknown, resolved, run ended — it refuses and forwards nothing. Nothing is
  answered automatically; no request times out.
- **BR-011 Result** (FR-011.8). With an end state it sets, the orchestrator hands 0004: the final
  message (`run.completed`'s if delivered, else the last `message.completed`), for `Failed` the
  error class and the error text, and usage and changed files where events delivered them;
  otherwise "not available" (P8). Duration is created → end time (0004 BR-011). An `Interrupted`
  run has no result from the orchestrator.
- **BR-012 No trace, no start** (0004 OP-006, Gregor 2026-11-16). If the store is not *writable*
  (0004 BR-009), creating the run fails or the request's provider ID is not registered, no
  provider is called and the caller gets the reason.
- **BR-013 Spec link** (PD-011, PD-018). A run records stem and path as at its creation (0004 §8).
  Any run, open or ended, whose stem no entry of the project carries — file deleted or stem
  changed — is reported with the flag "spec not found"; an open one continues. The flag is
  computed on each read and never stored. A move between lifecycle folders keeps the stem: no flag.
- **BR-014 Run ≠ spec** (FR-011.9, PD-004, PD-013). No run status changes a spec's state; the
  orchestrator writes nothing inside the workspace. A completed run leads to Review only when the
  agent's file changes make 0003 derive it.
- **BR-015 Reader window** (PD-030). In a window without the write lock every operation that
  changes a run — start, stop, resume, answers — is refused with the reason "another window holds
  the write lock". Reads work.
- **BR-016 Window end** (OP-001, OP-003; Gregor 2026-11-16). If the window stops being the writer
  of the run's store, or the store is closed, while a run is open, the orchestrator calls the
  provider's cancel once where declared, then `endSession` once, and appends nothing more for that
  run; 0004 AC-011 sets its status in the window that becomes the writer. When VS Code shuts down
  with a run open, it does the same without waiting for an answer.

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-001 (FR-011.1, FR-011.3) | Create a run linked to its spec for a start request | AC-001, AC-002, AC-003 |
| FR-002 (FR-011.2) | Apply the transition rules; no stall timeout | AC-004, AC-005, AC-006, AC-014 |
| FR-003 (FR-011.4) | At most one open run per project | AC-002 |
| FR-004 (FR-011.5) | Stop a run; let go of a run at the window's end | AC-009, AC-010, AC-011, AC-024 |
| FR-005 (FR-011.6) | Classify and store errors | AC-007, AC-008 |
| FR-006 (FR-011.7) | Resume `Interrupted` runs explicitly | AC-015, AC-016 |
| FR-007 (FR-011.8) | Store the result with the end state | AC-018 |
| FR-008 (FR-011.9) | Keep run end and spec state apart | AC-017 |
| FR-009 | Forward approval and input answers | AC-012, AC-013 |
| FR-010 | Spec-not-found flag, reader window, previous-run summary, palette commands | AC-019…AC-022 |
| FR-011 | Provider reached only through 0009's port | AC-023 |

## 8. Data requirements

Stored through 0004 (its §8 holds the fields): run, status entries with cause, session reference,
error class and error text, result. Defined here: the content of the result (BR-011), the class
list (BR-008) and two causes, "resumed from <run ID>" (BR-005) and "stop not confirmed by
provider" (BR-006); this spec sets no other cause. Reported, not stored: "spec not found"
(BR-013), the previous-run summary (BR-007), and whether a run can be resumed, with the reason
if not (BR-005).

## 9. Interfaces and integrations

- **0008:** one start request — stem, project-relative path, provider ID, model or "not available",
  start prompt, working directory — answered by the run ID or a refusal; the summary of BR-007.
- **0009 / 0010:** registry, capabilities, start, resume, cancel, both answers, events.
- **0004:** create run, append status and events, read runs; store state.
- **0002 / 0003:** the project's entries by stem (BR-013), Done (BR-005).
- **0012:** calls stop (already confirmed), resume and the answers by run ID; shows refusals.
- **Host UI** (a port): confirmations, pick list and messages of BR-005 and the palette commands.
- Palette commands "FeatherSpec Studio: Stop Run" and "FeatherSpec Studio: Resume Run" (PD-016:
  English).

## 10. Security, permissions and privacy

- Nothing is approved automatically and no answer widens permissions (PD-006, BR-010).
- Texts handed to 0004 are masked there (PD-029); nothing is persisted except through 0004.

## 11. Error cases and edge cases

Beyond what the criteria name:

- `run.completed` before `session.started` → not applied (BR-001); the start timeout ends the run.
- Silent run, provider without `cancel` → open, blocks starts until a reload (0004 AC-011).
- Store fails during a run → the agent keeps working (0004 AC-014); new starts refused (AC-003).

## 12. Acceptance criteria

"The system" is FeatherSpec Studio. All criteria are decided in plain Node with a scripted
provider double behind 0009's port, the in-memory store of 0004, a fake host UI and a
controllable clock. Texts not quoted here are English (PD-016) and written in the plan; a
refusal carries its reason and, where one exists, the blocking run's ID and stem.

- **AC-001** When 0008 hands over a start request and BR-002, BR-012 and BR-015 hold, the system
  shall create one run in 0004 with status `Starting` and the request's stem, path, provider ID
  and model, then call that provider's start exactly once with the run ID and the request's
  working directory, prompt and model. When `session.started` arrives, the system shall hand its
  session reference to 0004.
- **AC-002** If a start or resume is requested while a run of the project is in an open state,
  then the system shall refuse it, name that run's ID and stem, create no run and call no provider.
  - *Given* no open run, *when* two start requests for `0007-board` and `0008-start` arrive
    without waiting for each other, *then* exactly one run exists and the other request is refused.
- **AC-003** If the store is not *writable*, creating the run fails or the request names a
  provider ID the registry does not hold, then the system shall call no provider and return the
  reason to the caller (BR-012).
- **AC-004** When an event accepted by 0004 yields a status other than the current one (BR-003),
  the system shall append it only if BR-001 lists that step; for every other of the 64 ordered
  status pairs the system shall leave the status as it is.
- **AC-005** While a run is in an end state, the system shall append no further status, whatever
  events arrive and whichever timeout elapses. An event 0004 refused as a duplicate shall change
  no status.
  - *Given* a `Running` run, *when* `run.cancelled` then `run.completed` arrive, *then* the status
    is `Cancelled` and stays so.
- **AC-006** While a started run has at least one open approval request, the system shall hold it
  in `WaitingForApproval`; while it has only open input requests, in `WaitingForInput`; when the
  last open request is resolved, it shall set `Running`. An end kind shall end the run from
  either waiting status.
- **AC-007** When a `run.failed` arrives, the system shall set `Failed` with its text and the
  class of BR-008: `provider_exited` for a derived one, `unknown` for a category that is no class.
  If the port refuses a start or resume call without delivering an end kind, then the system shall
  set `Failed` at once with `unknown` and the refusal reason. A `tool.completed` that is not ok
  shall change no status.
- **AC-008** If a run is still `Starting` when 60 s have passed since its creation, then the
  system shall set `Failed` with `start_timeout`, call the provider's cancel once where the
  provider declares `cancel`, then the port's `endSession` once. This holds for a run created by
  resume too.
- **AC-009** When a stop is requested for an open run whose provider declares `cancel`, the
  system shall call the provider's cancel exactly once, ask no confirmation of its own and leave
  the status as it is until an end kind arrives; on `run.cancelled` it shall set `Cancelled`.
- **AC-010** If no end kind has arrived when 30 s have passed since the cancel call, whatever
  that call returned, then the system shall set `Cancelled` with the cause "stop not confirmed by
  provider", call the port's `endSession` once and call no other provider operation again.
- **AC-011** If a stop is requested for a run in an end state, for a run whose provider does not
  declare `cancel`, or while a stop of that run is pending, then the system shall refuse it with
  that reason and call no provider.
- **AC-012** When the developer answers an open approval request with "approve once" or "reject"
  (with an optional reason), the system shall forward exactly that answer for that request to the
  provider and return the provider's result; it shall refuse any other answer value. The system
  shall answer no request by itself: an unanswered request is still open after 24 h of clock time.
- **AC-013** When the developer answers an open input request, the system shall forward the text
  unchanged for that request and return the provider's result. If an approval or input answer
  names a request that is not open, then the system shall refuse it and forward nothing. After a
  forwarded answer the system shall keep the request open until its `.resolved` event.
- **AC-014** While a run is open and no event arrives, the system shall keep its status: after
  24 h of clock time without events the status is unchanged.
- **AC-015** The system shall report a run as resumable only when all conditions of BR-005 hold,
  and shall refuse a resume otherwise with the first failing condition, in BR-005's order, as
  the reason.
- **AC-016** When a resume is requested and BR-005 holds, the system shall ask one confirmation
  naming stem and run ID; on decline it shall change nothing. On yes it shall check BR-005 again,
  create the new run of BR-005, call the provider's resume once with the new run's ID, the stored
  session reference and the continuation text, and leave the old run `Interrupted` with
  unchanged data.
- **AC-017** Whatever end state a run reaches, the system shall create, change or delete no file
  inside the workspace: the workspace fixture is byte-identical before and after every scenario
  of this section.
- **AC-018** When the system sets an end state, it shall hand 0004 the result of BR-011 with it;
  for a value no event delivered, the system shall return "not available".
  - *Given* a provider double without usage data, *when* its run completes with the message
    "Done", *then* the result shows `Completed`, "Done", a duration and usage "not available".
- **AC-019** While no entry of the project carries a run's stem, the system shall report that run
  with the flag "spec not found" and shall not change its status; once an entry carries the stem
  again, the system shall report the run without the flag. A move of the spec between lifecycle
  folders shall raise no flag.
- **AC-020** While the window is a reader (PD-030), the system shall refuse start, stop, resume
  and every answer with the reason "another window holds the write lock" and call no provider;
  it shall still return the previous-run summary and the flag.
- **AC-021** When asked for the previous-run summary of a stem, the system shall return the latest
  run's ID, status, error class and error text, or "No run" when the stem has none.
- **AC-022** When the developer runs "Stop Run", the system shall ask one confirmation naming the
  open run's stem and, on yes, stop it per AC-009. When the developer runs "Resume Run", the
  system shall show the resumable runs by stem as a pick list where there are several, and
  proceed per AC-016 with the chosen or the only one. Where no run is open, or none is resumable,
  the system shall show a message saying so and change nothing.
- **AC-023** The system shall reach providers only through 0009's port: no orchestrator module
  under `src/core/` shall import `vscode`, a provider SDK or a module under `src/adapters/` —
  the import scan of 0009 AC-002 covers it.
- **AC-024** If, while a run is open, the window stops being the writer of the store or the store
  is closed, then the system shall call the provider's cancel once where declared, then the port's
  `endSession` once, and append no further status or event of that run. When VS Code shuts down
  with a run open, the system shall make the same two calls without waiting for their answers.

### Manual checks (not decidable without a real provider)

- **M-01** Gregor, with the first real provider (PD-001, after ADR-003 §7): start, approval answer,
  stop and resume behave as AC-001, AC-012, AC-009 and AC-016 describe; he notes how long
  `session.started` and a cancel take (A-003).
- **M-02** Gregor: whether a resumed real session continues the earlier work (ADR-003 §6 risk 4).
- **M-03** The wording of the refusal texts (including `An input answer is text.`) and the
  continuation text is checked by Gregor or his delegate; pre-release checklist item (delegation,
  Gregor, 2026-11-17). The texts themselves are pinned by the orchestrator tests.

## 13. Technical notes for developers or AI agents

- Greenfield. Target: an orchestrator service in the application layer, a pure function for
  BR-001/BR-003, timers behind the clock port, confirmations behind a UI port.
- Both timeouts are named constants; a timer is dropped when the state it guards is left.
- The orchestrator accepts no operation before 0004's `Interrupted` classification at writer
  activation has finished, or a resume could see a stale open run.
- The provider double is a test-only implementation of 0009's port (0009 AC-021): scripted
  events in any order, a refused start, a cancel never answered, declarable capabilities.
- Run ID uniqueness and masking are 0004's (AC-002, AC-013 there); do not test them again here.

## 14. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-003 | A real provider delivers `session.started` within 60 s and an end kind within 30 s of a cancel | Interview working values, not measured; 0010 BR-13 forces a stop after 10 s | First starts fail with `start_timeout`; the constants change after M-01 |
| A-004 | A `run.failed` with source `derived` means the provider stopped without an end kind | 0009 BR-007 and BR-008; 0010 AC-020 | Such runs are classed `unknown` instead of `provider_exited` |
| A-005 | 0002/0003 answer, per stem, which entries carry it and whether one is Done | 0002's entries carry the stem (PD-018); 0003 derives one state per entry | BR-005 (7), (8) and BR-013 need a lookup of their own |
| A-006 | "Accepted by 0004" (BR-003) means every event 0004 does not refuse as a duplicate; an event cut by the size cap (0004 AC-027, outcome *dropped*) still counts | 0004 keeps storing status changes after the cap; otherwise a run past 20,000 events could never end | A run past the cap stays open until a restart |

A-001 and A-002 are withdrawn: decided by 0009 BR-008 and §8.1/§8.2.

## 15. Open points

Open: none. OP-001 and OP-003…OP-007 were resolved at `/sdd-plan` (below).

Cross-spec, for the main session (no product decision):

- OP-002: (a) 0004: OP-006 is answered by BR-012; §8's error class is the closed list of BR-008.
  (b) 0009 §8.1: `resume` needs the new run's ID and the continuation text; `start` takes no
  permission mode although 0008 §6.4 "passes" one. (c) 0008: steps 5 and 6 are one request here;
  step 7 fails where creation fails (BR-012); its confirmation shows no summary (BR-007).
  (d) 0010 AC-020: source `derived` (A-004). (e) 0012 AC-022 hands a resume over unconfirmed: it
  is asked here. 0006 and 0012 take "spec not found" from BR-013; "category" there means class.
  (b) is answered by 0009 (its OP-011 and its plan's *Surface*: `resume` carries the run ID and
  the continuation text, `start` no mode).

Resolved:

- 2026-11-16 (Gregor, at `/sdd-plan`: every recommendation approved as written; aligned with
  0009's `endSession`, 0009 OP-006): OP-001 — at a clean shutdown the orchestrator calls cancel
  once where declared and `endSession`, without waiting; 0004 AC-011 settles the status (BR-016,
  AC-024). OP-003 — losing the write lock or the store with a run open: the same two calls, then no
  further event of that run is handled (BR-016, AC-024). OP-004 — no new port operation: after its
  timeouts the orchestrator calls 0009's `endSession`, which leaves the runtime to the adapter
  (BR-006, BR-008). OP-005 — the continuation text is: "Continue the interrupted work on spec
  `<stem>`: read `AGENTS.md` and the plan beside the spec again, then continue at the plan's
  current step under the same rules as before." Its wording is accepted with M-03. OP-006 — M-01
  and M-02 move to 0010's acceptance (the edit of 0010 is the main session's). OP-007 — PD-002,
  PD-006, PD-011 and PD-013 confirmed. Alignment with 0009 (its OP-011): a failing start or resume
  is the port's `run.failed`; a refusal without an end kind is `unknown` (BR-008, AC-007).
- OP-008 (2026-11-16): `/sdd-clarify` listed 79 findings, 10 blocking. Gregor delegated the
  resolution in one pass, a one-off exception to the one-finding walkthrough. The list, its
  disposition and the readings made on the way are kept by the run orchestrator
  (`0011-findings.md`); the readings that reinterpret an interview answer are OP-004 and A-004.

## 16. Definition of Ready

- [x] Interview answered (Gregor, 2026-11-16, all ten suggestions accepted).
- [x] Clarified 2026-11-16 (OP-008); kind and capability names are 0009's (§8.2, BR-002).

## 17. Definition of Done

- [x] AC-001…AC-024 pass with evidence; `npm run test:unit` green, `npm test` before done
  (Windows host suite 28 passing at e6f0c85, 2026-11-17; re-run on the merged commit after T-009).
- [x] M-03 on the pre-release checklist (delegation, Gregor, 2026-11-17); M-01 and M-02 with
  0010's acceptance (OP-006).
- [x] No out-of-scope behaviour; nothing written inside the workspace (AC-017).
- [x] Architecture snapshot and Memory Bank updated for the orchestrator module.

## 18. Recommended next steps

Plan written 2026-11-16; Gregor reviews it. Implementation after 0009 is done (order 0009 → 0011 → 0008 → 0012).

## Plan history

- 2026-11-17 — [0011-agent-orchestrator-run-lifecycle.2026-11-17.plan.md](../plan-archive/0011-agent-orchestrator-run-lifecycle.2026-11-17.plan.md) — T-001…T-009 built and verified; second `/sdd-compile` READY after T-009 (window end on a project switch with the real `RuntimeSession`).
