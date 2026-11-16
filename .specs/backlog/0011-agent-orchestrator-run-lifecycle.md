# Agent Orchestrator & Run Lifecycle

**Status:** Draft
**Plan:** _none yet_

Handoff reference: FS-011 ([po-handoff.md](../../docs/product/po-handoff.md) §8.4, §10 FS-011,
§5.3, §6.2, §7). Decisions: PD-004, PD-005, PD-006, PD-007, PD-011, PD-013, PD-024, PD-025,
PD-029, PD-030 ([product-decisions.md](../../docs/product/product-decisions.md)); provider facts:
[ADR-003](../../docs/decisions/ADR-003-first-agent-provider.md).
Depends on: 0004 (run store), 0009 (provider port, capabilities, event taxonomy, fake provider),
0010 (first provider). Callers: 0008 (start), 0012 (stop, resume, answers). Readers of run data:
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

Success: with the fake provider, every scenario of §12 ends in the status this spec prescribes,
and the run's result or error is readable through 0004 afterwards.

## 3. Users and roles

- **Developer** (only role): starts runs through 0008, stops and resumes them, answers approval
  and input requests through 0012's UI or the palette commands of §9.
- No permissions model beyond PD-030: only the window that holds the store's write lock may act.

## 4. Scope

### In scope

- Creating a run for a start request handed over by 0008, and the last guard against a second
  open run (PD-005).
- The transition rules of the eight run statuses of 0004 BR-001 (PD-025).
- Status changes driven by 0009's normalised events.
- Stop, resume of `Interrupted` runs, forwarding approval and input answers to the provider.
- The closed list of error classes, the start timeout and the stop timeout.
- The run result and the "previous run" summary that 0008's confirmation shows.
- The "spec not found" flag of a run (PD-011).
- The resume continuation text, the refusal texts of §12 and two palette commands.

### Out of scope

- The start prompt, the readiness check, provider choice and the start confirmation — because
  0008 owns them (Gregor, 2026-11-16; PD-002, PD-045).
- Buttons and answer controls for stop, resume, approvals and input — because 0012 owns that UI
  (Gregor, 2026-11-16); 0011 owns the operations behind them.
- Showing runs, events and results — because 0006, 0007 and 0012 render them.
- Storing, masking, retention and the `Interrupted` classification at activation — because 0004
  owns them (0004 BR-004…BR-008, PD-024, PD-029).
- Event names, the capability model and mapping provider errors — because 0009 owns them;
  0009's adapters map into the error classes of BR-008.
- Automatic retries, scheduling, several runs at once — because PD-005 and handoff §2.3 exclude them.
- Changing a spec's board state, writing to `.specs/`, `.memory-bank/` or `AGENTS.md` — because
  PD-004 and PD-013 keep Studio read-only; Review and Done follow the files (0003).
- Adopting sessions Studio did not start — because PD-010 excludes it.
- Detecting stalled runs — because Gregor chose no automatic timeout while a run is open (BR-009).
- "Approve for session" or "approve for location" answers — because they would widen
  permissions (PD-006).

## 5. Functional flow

1. 0008 hands over a start request: spec stem and path, provider, model if known, permission
   mode, start prompt.
2. The orchestrator checks BR-002 and BR-012, creates the run in 0004 (`Starting`) and asks the
   provider through 0009's port to start.
3. Provider events arrive normalised (0009). Each one is stored by 0004; each one 0004 accepts
   may change the status per BR-001.
4. Approval and input requests set a waiting status; the developer answers through 0012; the
   orchestrator forwards the answer.
5. The run ends: completed, failed (classified), or cancelled by a stop. The result is stored.
6. After a restart, open runs are `Interrupted` (0004 AC-011); the developer may resume one.

## 6. Business rules

- **BR-001 Transitions** (PD-025, Gregor 2026-11-16). Allowed, and nothing else:
  `Starting` → `Running` · `Failed` · `Cancelled`; `Running` → `WaitingForApproval` ·
  `WaitingForInput` · `Completed` · `Failed` · `Cancelled`; `WaitingForApproval` ⇄
  `WaitingForInput`; `WaitingForApproval` · `WaitingForInput` → `Running` · `Completed` ·
  `Failed` · `Cancelled`. End states are final; the first end state wins. A late event never
  changes a status (0004 AC-028). The orchestrator never sets `Interrupted`; only 0004 AC-011 does
  (PD-024).
- **BR-002 One open run** (PD-005). A start or resume is refused while any run of the project is
  in an open state. 0008 checks first (PD-045); the orchestrator checks again at creation.
- **BR-003 Event effects.** Only events 0004 accepted change a status, so a duplicate (0004 AC-007)
  never changes one twice. Session started → `Running`; approval requested → `WaitingForApproval`;
  input requested → `WaitingForInput` unless an approval is open; all requests resolved →
  `Running`; run completed → `Completed`; run failed → `Failed`; run cancelled → `Cancelled`.
  Event names are 0009's (ADR-003 §4 is the starting point).
- **BR-004 Waiting precedence.** While at least one approval request is open the status is
  `WaitingForApproval`; while only input requests are open it is `WaitingForInput`.
- **BR-005 Resume** (PD-007, PD-024, Gregor 2026-11-16). Offered only for an `Interrupted` run that
  is the latest run of its spec, when the provider declares resume, the stem exists in the project,
  the spec is not Done (0003), BR-002 holds and the store is writable. One confirmation. Resume
  creates a **new run** with "resumed from <run ID>", reuses the stored provider session reference
  and sends the continuation text (owned here, wording fixed in `/sdd-plan`: re-read the plan,
  continue). The old run stays `Interrupted`.
- **BR-006 Stop** (Gregor 2026-11-16). Allowed in every open state where the provider declares
  cancel; one confirmation. The status becomes `Cancelled` when the provider confirms. Without a
  confirmation within the stop timeout (30 s, named constant) the orchestrator ends the provider
  session itself and records `Cancelled` with the cause "stop not confirmed by provider".
- **BR-007 New start after an end state** (handoff §5.3 step 5). No automatic retry ever. A new run
  is a normal start through 0008; the orchestrator supplies the spec's previous-run summary
  (end status, error class, message, run ID) for 0008's confirmation.
- **BR-008 Error classes** (FR-011.6; closed list owned here, 0004 §8 stores it):
  `auth`, `quota_or_rate_limit`, `model_unavailable`, `network_or_server`, `runtime_missing`,
  `policy_denied`, `provider_exited`, `start_timeout`, `unknown`. 0009's adapters map provider
  errors into it; anything unmapped is `unknown`. A failed tool call does not fail a run.
  The provider process ending without an end event → `Failed`/`provider_exited`. No "session
  started" within the start timeout (60 s, named constant) → `Failed`/`start_timeout`, and the
  provider session is ended.
- **BR-009 No stall timeout** (Gregor 2026-11-16). An open run without events keeps its status,
  however long; only a provider end, error, exit or a stop ends it.
- **BR-010 Answers** (PD-006). Approval answers: "Approve once" or "Reject" with an optional
  reason. Input answers: free text. The orchestrator forwards each to the provider for the named
  request. Nothing is answered automatically; an unanswered request stays open.
- **BR-011 Result** (FR-011.8). On an end state the orchestrator stores: end status, the agent's
  last complete message, error class and message, duration (created → end time, 0004 BR-011),
  usage and changed files where the provider delivers them, otherwise "not available" (P8).
- **BR-012 No trace, no start** (0004 OP-006, Gregor 2026-11-16). If the store is not *writable*
  (0004 BR-009) or the run cannot be stored, the provider is not called and the reason is shown.
- **BR-013 Spec link** (PD-011, PD-018). A run is linked by stem and path as at creation (0004 §8).
  While the stem is not in the project the run carries the flag "spec not found" and continues; it
  clears when the stem returns. A move between lifecycle folders keeps the stem: no flag.
- **BR-014 Run ≠ spec** (FR-011.9, PD-004, PD-013). No run status changes a spec's state; the
  orchestrator writes nothing inside the workspace. A completed run leads to Review only when the
  agent's file changes make 0003 derive it.
- **BR-015 Reader window** (PD-030). In a window without the write lock every operation of this
  spec is refused with the reason "another window holds the write lock".

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-001 (FR-011.1, FR-011.3) | Create a run linked to its spec for a start request | AC-001, AC-002, AC-003 |
| FR-002 (FR-011.2) | Apply the transition rules | AC-004, AC-005, AC-006 |
| FR-003 (FR-011.4) | At most one open run per project | AC-002 |
| FR-004 (FR-011.5) | Stop a run | AC-009, AC-010, AC-011 |
| FR-005 (FR-011.6) | Classify and store errors | AC-007, AC-008 |
| FR-006 (FR-011.7) | Resume `Interrupted` runs explicitly | AC-015, AC-016 |
| FR-007 (FR-011.8) | Store result and end event | AC-018 |
| FR-008 (FR-011.9) | Keep run end and spec state apart | AC-017 |
| FR-009 | Forward approval and input answers | AC-012, AC-013 |
| FR-010 | Spec-not-found flag, reader window, previous-run summary, palette commands | AC-019…AC-022 |
| FR-011 | Provider reached only through 0009's port | AC-023 |

## 8. Data requirements

Stored through 0004 (its §8 holds the fields): run, status entries with cause, error class and
message, result, provider session reference. Added by this spec: "resumed from <run ID>" on a
resumed run; the result fields of BR-011. Reported, not stored: "spec not found" (BR-013) and the
previous-run summary (BR-007).

## 9. Interfaces and integrations

- **0008:** hands over start requests; receives creation success or a refusal with its reason, and
  the previous-run summary.
- **0009 / 0010:** start, resume, cancel, answer approval, answer input, events, capabilities.
- **0004:** create run, append status and events, read runs; store state (writable / read-only /
  unavailable).
- **0002 / 0003:** stems present in the project (BR-013), spec Done (BR-005).
- **0012:** calls stop, resume and the answer operations; shows refusals.
- Palette commands "FeatherSpec Studio: Stop Run" and "FeatherSpec Studio: Resume Run" (PD-016:
  English).

## 10. Security, permissions and privacy

- Nothing is approved automatically and no answer widens permissions (PD-006, BR-010).
- Every text the orchestrator hands to 0004 — answers, results, error messages — is masked there
  (PD-029); the orchestrator keeps no copy of its own outside 0004.

## 11. Error cases and edge cases

- Two start requests at once → one run, one refusal (AC-002).
- Completed and Cancelled race → first end state wins (AC-005).
- Provider dies mid-run → `Failed`/`provider_exited` (AC-007).
- Provider never reports a start → `Failed`/`start_timeout` (AC-008).
- Provider ignores a stop → forced `Cancelled` after 30 s (AC-010).
- Spec file deleted or renumbered during a run → flag, run continues (AC-019).
- VS Code closes during a run → `Interrupted` at the next activation (0004 AC-011); resume (AC-016).
- Store becomes read-only or unavailable during a run → 0004 AC-014 applies; new starts refused (AC-003).

## 12. Acceptance criteria

"The system" is FeatherSpec Studio. All criteria are decided in plain Node with the fake provider
of 0009, the in-memory store of 0004 and a controllable clock. Refusal texts are English (PD-016),
worded in `/sdd-plan`; a refusal names the reason and, where one exists, the blocking run ID and stem.

- **AC-001** When 0008 hands over a start request and BR-002 and BR-012 hold, the system shall
  create one run in 0004 with status `Starting`, the request's stem, path, provider and model, and
  then call the provider's start exactly once.
- **AC-002** If a start or resume is requested while a run of the project is in an open state,
  then the system shall refuse it, name that run's ID and stem, create no run and call no provider.
  - *Given* no open run, *when* two start requests for `0007-board` and `0008-start` arrive
    without waiting for each other, *then* exactly one run exists and the other request is refused.
- **AC-003** If the store is not *writable* or creating the run fails, then the system shall not
  call the provider and shall return the store's reason (BR-012).
- **AC-004** When an event accepted by 0004 implies a status (BR-003), the system shall append that
  status only if BR-001 allows the transition from the current one; otherwise the status stays
  unchanged. A test drives every pair of the eight statuses.
- **AC-005** While a run is in an end state, the system shall append no further status, whatever
  events arrive. An event 0004 refused as a duplicate shall change no status.
  - *Given* a `Running` run, *when* "run cancelled" then "run completed" arrive, *then* the status
    is `Cancelled` and stays so.
- **AC-006** While at least one approval request of a run is open, the system shall keep the run
  in `WaitingForApproval`; while only input requests are open, in `WaitingForInput`; when the
  last open request is resolved, it shall set `Running`.
- **AC-007** When the provider reports a failure, the system shall set `Failed` with the error
  class of BR-008 that 0009 supplies, `unknown` where none maps, and the message. If the provider
  process ends without an end event, then the system shall set `Failed` with `provider_exited`.
  A failed tool call shall change no status.
- **AC-008** If a run is still `Starting` 60 s after creation, then the system shall end the
  provider session and set `Failed` with `start_timeout`.
- **AC-009** When the developer requests a stop of an open run whose provider declares cancel, the
  system shall ask for confirmation; on confirmation it shall call the provider's cancel once and
  set `Cancelled` when the provider confirms; on refusal it shall change nothing.
- **AC-010** If the provider has not confirmed a stop 30 s after the cancel call, then the system
  shall end the provider session and set `Cancelled` with the cause "stop not confirmed by provider".
- **AC-011** If a stop is requested for a run in an end state or whose provider does not declare
  cancel, then the system shall refuse it with that reason and call no provider.
- **AC-012** When the developer answers an open approval request with "Approve once" or "Reject"
  (with an optional reason), the system shall forward exactly that answer for that request to the
  provider. The system shall offer no other approval answer and shall answer no request by itself:
  an unanswered request is still open after 24 h of clock time.
- **AC-013** When the developer answers an open input request with text, the system shall forward
  that text for that request to the provider. An answer to a request that is no longer open shall
  be refused and not forwarded.
- **AC-014** While a run is open and no event arrives, the system shall keep its status: after
  24 h of clock time without events the status is unchanged.
- **AC-015** The system shall offer resume only for a run meeting all conditions of BR-005, and
  shall refuse it otherwise with the first failing condition as the reason.
- **AC-016** When the developer confirms a resume, the system shall create a new run with
  "resumed from <old run ID>", call the provider's resume once with the stored session reference
  and the continuation text, and leave the old run `Interrupted` with unchanged data.
- **AC-017** When a run reaches any end state, the system shall leave the spec's board state as
  0003 derives it from the files, and shall create, change or delete no file inside the workspace:
  the workspace fixture is byte-identical before and after every scenario of this section.
- **AC-018** When a run reaches an end state, the system shall store the result of BR-011; a value
  the provider did not deliver is returned as "not available".
  - *Given* a fake provider without usage data, *when* its run completes with the message "Done",
    *then* the result shows `Completed`, "Done", a duration and usage "not available".
- **AC-019** While a run is open and its stem is not in the project, the system shall report the
  flag "spec not found" and keep the run's status; when the stem returns, the flag is cleared. A
  move of the spec between lifecycle folders shall raise no flag.
- **AC-020** While the window is a reader (PD-030), the system shall refuse start, stop, resume
  and every answer with the reason "another window holds the write lock" and call no provider.
- **AC-021** When asked for the previous-run summary of a stem, the system shall return the latest
  run's ID, end status, error class and message, or "No run" when the stem has none.
- **AC-022** When the developer runs "Stop Run" or "Resume Run" from the palette, the system shall
  act on the one open run, or let the developer pick among the runs eligible for resume by stem;
  where none exists it shall say so and change nothing.
- **AC-023** The system shall reach providers only through 0009's port: the orchestrator's core
  code imports neither `vscode` nor a provider SDK — an import scan decides it.

### Manual checks (not decidable with the fake provider)

- **M-01** Gregor, with the first real provider (PD-001, after ADR-003 §7): start, approval answer,
  stop and resume behave as AC-001, AC-012, AC-009 and AC-016 describe.
- **M-02** Gregor: whether a resumed real session continues the earlier work (ADR-003 §6 risk 4).
- **M-03** Gregor accepts the wording of the refusal texts and the continuation text.

## 13. Technical notes for developers or AI agents

- Greenfield: no source modules yet. Target: an orchestrator service in the application layer,
  a pure transition function for BR-001/BR-004, timers behind a clock port.
- Start timeout 60 s and stop timeout 30 s are named constants; tests advance the clock.
- 0004 classifies `Interrupted` at writer activation; the orchestrator must not run before that
  classification has finished, or a resume could see a stale open run.
- The fake provider (0009) needs scriptable events, a process-exit signal, a "never confirms
  cancel" mode and declarable capabilities to cover AC-004…AC-016.
- Run ID uniqueness and masking are 0004's (AC-002, AC-013 there); do not test them again here.

## 14. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | 0009 delivers a "process ended" signal apart from normal end events | ADR-003 §2: all three SDKs spawn a child process whose exit is observable | `provider_exited` cannot be detected; such runs stay open until restart |
| A-002 | Approval and input requests carry a request ID the answer can name | ADR-003 §4: `permission.requested` and `user_input.requested` are distinct, addressable events | Answers cannot be routed; BR-010 needs a redesign |
| A-003 | The provider's "session started" event arrives within 60 s on a typical machine | Desk evaluation only (ADR-003 §2, runtime copied on first use) | First starts fail with `start_timeout`; the constant is raised after M-01 |

## 15. Open points

- OP-001: What happens to an open run when VS Code shuts down cleanly. Recommendation: ask the
  provider to stop, best effort, without waiting; the status is settled by 0004 AC-011 at the next
  activation. Non-blocking.
- OP-002 (cross-spec, main session): 0004 OP-006 is answered by BR-012; 0004 §8's "error class
  (open string, defined by 0011)" is now the closed list of BR-008.

## 16. Definition of Ready

- [x] Interview answered (Gregor, 2026-11-16, all ten suggestions accepted).
- [ ] 0009's event and capability names exist, or the plan uses ADR-003 §3–4 as placeholders.

## 17. Definition of Done

- [ ] AC-001…AC-023 pass with evidence; `npm run test:unit` green, `npm test` before done.
- [ ] M-01…M-03 recorded by Gregor.
- [ ] No out-of-scope behaviour; nothing written inside the workspace (AC-017).
- [ ] Architecture snapshot and Memory Bank updated for the orchestrator module.

## 18. Recommended next steps

`/sdd-clarify` on this spec in a fresh session, then `/sdd-plan`.
