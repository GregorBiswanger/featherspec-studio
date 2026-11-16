# Spec Activation & Agent Start Workflow

**Status:** Draft
**Plan:** _none yet_

Handoff reference: FS-008 ([po-handoff.md](../../docs/product/po-handoff.md) §5.2, §6.4, §6.5,
§10). Builds on 0003 (transition check, readiness), 0004 (run store, lock), 0007 (board moves),
0009 (provider abstraction), 0010 (first provider), 0011 (orchestrator, run lifecycle). First
provider per [ADR-003](../../docs/decisions/ADR-003-first-agent-provider.md). Decisions:
[product-decisions.md](../../docs/product/product-decisions.md) PD-002, PD-005, PD-006, PD-013,
PD-014, PD-018, PD-030, PD-040, PD-045; start prompt and start policy: Gregor, 2026-11-16
(§6.3, §6.5).

## 1. Summary

The workflow that turns an accepted Ready → Active request into one agent run. It checks the
run-start preconditions, asks the developer for one explicit confirmation, has 0011 create the
run, and hands the provider a generated **start prompt** that makes the agent follow
FeatherSpec's own flow: start signal, backlog → active move through `/sdd-lifecycle`, the whole
plan, stop before `/sdd-compile`. Studio itself writes no FeatherSpec file (PD-013).

## 2. Goal and problem

Dragging a Ready spec to Active is meant to start the implementation, but Studio may not move specs
itself (PD-013) and may not widen any permission (PD-006). The agent must therefore be told
precisely what FeatherSpec expects of it, so the files — not Studio — show the move to Active
and, when the plan is Done, the derived Review state (0003 S-REVIEW). Success: a confirmed start
gives one run per spec, its failures are visible as a run, and a refused start leaves no trace
but its reason.

## 3. Users and roles

- **Developer** (only role): requests the start, reads the confirmation, confirms or cancels,
  answers the agent's approval and input requests (0012).
- **Agent** (actor, not a user): receives the start prompt and works in the project.

## 4. Scope

### In scope

- Receiving the start request (spec stem) that 0007 hands over after 0003 accepts it (PD-045).
- Run-start preconditions P-1 to P-6 (§6.1), checked before the confirmation and again after it.
- The confirmation and its content (§6.2), cancel and confirm.
- The start prompt: owned text and its generation (§6.3).
- Asking 0011 to create the run and to start it with the prompt; showing start failures.
- Provider and model choice: the configured default provider, the provider's default model.

### Out of scope

- Readiness rules R-1…R-7 and the transition verdict — because 0003 owns them; 0008 consumes them.
- Run creation, status transitions, cancel, resume and retry of a run — because 0011 owns them.
- Provider availability, authentication checks, setup and permission modes — because 0009/0010
  own them; 0008 only asks and shows the answer.
- Showing run events, approval and input requests — because 0012 owns them.
- Any write to `.specs/`, `.memory-bank/` or `AGENTS.md` by Studio — because of PD-013.
- A provider or model picker — not now; after the MVP (Gregor, 2026-11-16).
- Editing the prompt before the start — not now; the prompt is shown read-only (Gregor, 2026-11-16).
- A "don't ask again" option — not ever in the MVP (PD-002).
- A "Start agent" button outside the three move ways of 0007 — not now (Gregor, 2026-11-16).
- Checking the git working tree before a start — not now; Studio is not a git client, needs a
  decision first (A-004).
- Parallel runs — because of PD-005.

## 5. Functional flow

1. The developer moves a Ready card to Active by one of 0007's three ways; 0003 accepts; 0007
   hands the stem to 0008 (PD-045).
2. 0008 evaluates P-1…P-6. Any failure: refusal showing every failing precondition; no
   confirmation, no run, nothing stored.
3. 0008 shows the confirmation (§6.2). Cancel: nothing is stored, the card stays as it was.
4. Confirm: 0008 evaluates P-1…P-6 again on the latest snapshot. Any failure: refusal as in 2.
5. 0008 asks 0011 to create the run (provider ID, model or "not available", spec stem and
   project-relative path). The run has its ID and status `Starting` (0004).
6. 0008 asks 0011 to start the run with the start prompt, working directory = the project root
   reported by 0001.
7. Any failure from step 5 on ends the run as `Failed` with its error category (0011, 0009); 0008
   shows a start-failure notice naming the run ID and the category, with "Open run" (PD-040).
8. On success the card stays where the files put it and shows the run's status (PD-045). The
   agent's `/sdd-lifecycle` move makes it Active; plan `Done` later makes it Review (0003).

## 6. Business rules

### 6.1 Run-start preconditions (owned by 0008)

| ID | Precondition | Fails when | Reason shows |
| --- | --- | --- | --- |
| P-1 | 0003's transition check accepts Ready → Active for the stem on the latest snapshot | refused | 0003's reason kind and its rule or precondition IDs |
| P-2 | `.claude/commands/sdd-plan.md` and `.claude/commands/sdd-lifecycle.md` exist in the project | either is missing | the project-relative path of each missing file |
| P-3 | A default provider is configured and registered (0009) | none configured, or unknown ID | the configured value or "no provider configured" |
| P-4 | The default provider reports itself available and authenticated (0009) | not available or not authenticated | the reason 0009 returns, unchanged |
| P-5 | No run of this project is in an open state (PD-005; open states per 0004 BR-001) | an open run exists | its run ID and spec stem |
| P-6 | The runtime store is available and this window is its writer (PD-030) | unavailable, or another window holds the lock | the store's reason (0004) |

- All six are evaluated each time, so several can fail at once. Tests assert the IDs and their
  parameters, not the wording; the English texts (PD-016) are written in the plan.
- While a confirmation is open, every further start request is refused with the reason "another
  start is waiting for confirmation". At most one confirmation exists per window.
- A refusal before or at the confirmation creates no run and stores nothing (Gregor, 2026-11-16).

### 6.2 The confirmation (PD-002)

Shown for every start, never skipped. It shows: spec number, title and stem · provider name ·
model as the provider names it, otherwise "provider default" · the permission mode the provider
adapter declares (0009) · the start prompt (§6.3), collapsed and read-only. Actions: **Start**
and **Cancel**. Closing it counts as Cancel.

### 6.3 The start prompt (owned by 0008; text decided by Gregor, 2026-11-16)

English always; the agent follows `DocLanguage` through `AGENTS.md`. It names files by
project-relative path with forward slashes and inlines no file content. The placeholders are
`<stem>`, `<spec path>` and `<plan path>`, taken from the snapshot at confirmation (the
`backlog/` paths). Exact text:

> Read `AGENTS.md` first, completely; it is binding. Start signal from the human, given by
> confirming the start in FeatherSpec Studio: implement the whole plan of spec `<stem>`
> (`<spec path>`, plan `<plan path>`). This is the explicit start signal of
> `.claude/commands/sdd-plan.md`.
> 1. Do the backlog → active move by following `.claude/commands/sdd-lifecycle.md` exactly. This
>    start signal is the yes to its move proposal.
> 2. Then implement the plan per `.claude/rules/plans.md` until its status is Done. Any stop that
>    a working agreement in `AGENTS.md` requires (for example the test review per stage) still
>    applies: ask, then wait.
> 3. If you are blocked, set the plan to Blocked as the rules say, and stop with the reason.
> 4. Stop when the plan is Done. Do not run `/sdd-compile` and do not move the spec to `done/`:
>    the human does that.
>
> Git: the `git mv` that `/sdd-lifecycle` uses for the move is allowed. Make no commit and no
> other git write in this run; list your commit proposals in your final report.
>
> When a command is named, read its file under `.claude/commands/` and follow it as if the user
> had typed it.

The prompt is the only instruction Studio adds. 0010 passes it to the provider unchanged
(FR-010.5).

### 6.4 Permissions (PD-006)

The start passes the provider exactly the permission mode shown in the confirmation. Studio
pre-approves nothing and answers no approval or input request itself; the developer answers
them (0012). The prompt's git line is an instruction to the agent, not a permission: git
commands still pass through the provider's approval path.

### 6.5 Provider and model (Gregor, 2026-11-16)

One setting names the default provider (MVP: the first provider per PD-001; the fake provider in
tests). No picker. The model is the provider's default; Studio shows it when the provider names
it and stores "not available" otherwise (0004 AC-003).

## 7. Functional requirements

| ID | Requirement | Handoff | Criteria |
| --- | --- | --- | --- |
| FR-01 | Accept the Ready → Active hand-off from 0007 | FR-008.1 | AC-001 |
| FR-02 | Check readiness and run-start preconditions before the start | FR-008.2 | AC-001, AC-004, AC-007 |
| FR-03 | Show missing preconditions with their concrete cause | FR-008.3 | AC-001, AC-007, AC-008, AC-013 |
| FR-04 | Use the configured default provider | FR-008.4 | AC-002, AC-005 |
| FR-05 | Start only after one explicit confirmation | FR-008.5, PD-002 | AC-002, AC-003, AC-014 |
| FR-06 | Prevent a second open run | FR-008.6, PD-005 | AC-008, AC-009 |
| FR-07 | Link run and spec by stem | FR-008.7, PD-018 | AC-005 |
| FR-08 | Handle start failures without inconsistent state | FR-008.8 | AC-010, AC-012 |
| FR-09 | Record the start attempt as the run and its events | FR-008.9 | AC-003, AC-005, AC-010 |
| FR-10 | Generate the start prompt of §6.3 | FR-010.5 | AC-006 |
| FR-11 | Grant no permission | AC-008.9, PD-006 | AC-011 |

## 8. Data requirements

0008 stores nothing of its own. Inputs and outputs are listed per neighbour in §10; the create
and start requests carry provider ID, model, spec stem + path, prompt and working directory.

## 9. UI/UX requirements

- UI language English (PD-016). The confirmation and the notices appear in the Studio panel; the
  panel-level states stay with 0005 (PD-036).
- Refusals list each failing precondition on its own line. The start-failure notice offers "Open
  run" as a navigation request with the run ID (PD-040).
- Confirmation and notices are keyboard-operable and announced to screen readers (handoff §13).

## 10. Interfaces and integrations

- **0007:** delivers the stem of an accepted request (input).
- **0003:** transition check and readiness results (input).
- **0009/0010:** default provider, availability, authentication, model, permission mode; the
  start call carrying the prompt.
- **0011:** creates and starts the run, owns every status from `Starting` on, enforces one open
  run at creation.
- **0004:** open runs of the project, store and lock state.
- **0005:** panel, navigation request.

## 11. Security, permissions and privacy

- Read-only for all FeatherSpec artifacts (PD-013); the agent changes files, Studio does not.
- No permission widening, no auto-approval (PD-006, §6.4).
- The prompt contains paths and fixed text only, never secrets or file contents.

## 12. Error cases and edge cases

| Case | Behaviour |
| --- | --- |
| Spec file changes while the confirmation is open | Re-check after Start; refused with P-1's reason if no longer Ready |
| Another window starts a run meanwhile | P-5 or P-6 fails on the re-check |
| Provider fails to launch, auth expires, runtime missing | Run exists, ends `Failed` with category; notice with run ID |
| Two requests in quick succession (double drop) | The second meets an open confirmation or an open run: refused |
| Agent never does the move | Files are the truth: card stays Ready with the run status (PD-045) |
| Agent finishes the turn without finishing the plan | Run status per 0011; spec stays where the files put it |
| Project without `.claude/commands/` files | P-2 refusal naming the files |

## 13. Acceptance criteria

All criteria run in plain Node with the fake provider of 0009 and fakes for 0003, 0004 and 0011
where those do not exist yet.

**AC-001** When a start request for a stem reaches 0008, the system shall evaluate P-1 to P-6
before showing a confirmation and, if any fails, shall show a refusal naming every failing
precondition by ID with its parameters, show no confirmation, request no run from 0011 and store
nothing.
> *Given* P-1 refused with R-4 and P-5 failing for run `r-7` *then* the refusal lists P-1 (R-4)
> and P-5 (`r-7`, its stem) and 0011 received no create request.

**AC-002** When all preconditions pass, the system shall show a confirmation with spec number,
title, stem, provider name, model or "provider default", the declared permission mode, and the
start prompt collapsed and read-only, with the actions Start and Cancel.

**AC-003** When the developer cancels or closes the confirmation, the system shall request no run
and store nothing; the store's run count is unchanged.

**AC-004** When the developer confirms, the system shall evaluate P-1 to P-6 again on the latest
snapshot, and if any fails it shall refuse as in AC-001 and request no run.

**AC-005** When the developer confirms and all preconditions pass, the system shall request
exactly one run from 0011 with the default provider's ID, the model or "not available", and the
spec's stem and project-relative path, and shall start it with the generated prompt and the
project root as working directory.
> *Then* the fake provider received one start with that prompt and that directory, and the store
> holds one run for the stem with status `Starting` or later.

**AC-006** The system shall generate the start prompt as the text of §6.3 with `<stem>`, `<spec
path>` and `<plan path>` replaced; a golden-file test shall compare it byte for byte for a fixture
spec.

**AC-007** If `.claude/commands/sdd-plan.md` or `.claude/commands/sdd-lifecycle.md` is missing,
then the system shall refuse with P-2 naming each missing path.

**AC-008** If a run of the project is in an open state, then the system shall refuse with P-5
naming that run's ID and stem; for two start requests issued together the store shall hold at
most one new run.

**AC-009** While a confirmation is open, the system shall refuse every further start request with
the reason "another start is waiting for confirmation".

**AC-010** If the create or the start fails after confirmation, then the run shall end `Failed`
with an error category from 0009, the system shall show a notice naming the run ID and the
category with "Open run", and no second run shall exist.
> *Given* the fake provider fails to launch with `runtime_missing` *then* one run is `Failed`
> (`runtime_missing`) and the notice names its ID.

**AC-011** The system shall pass the provider exactly the permission mode shown in the
confirmation and shall answer no approval or input request on its own.
> *Given* the fake provider emits an approval request *then* no answer reaches it until a test
> sends the developer's answer.

**AC-012** The system shall write no file inside the project during any start, refusal or failure:
a fixture project's file tree and contents are identical before and after.

**AC-013** If the store is unavailable or another window holds its lock, then the system shall
refuse with P-6 and the store's reason.

**AC-014** When two starts are requested one after the other, the system shall show the
confirmation both times.

### Manual checks (Gregor)

- **M-1** Real provider on `tip-splitter`: the agent moves spec and plan to `active/` via
  `/sdd-lifecycle` (`git mv`), implements, stops at the test review per stage, ends with plan
  `Done` before `/sdd-compile`, makes no commit and lists commit proposals.
- **M-2** The confirmation reads clearly and the prompt is understandable when expanded.

### Handoff criteria map

AC-008.1 → 0007 AC-014/AC-015 + AC-001 · AC-008.2 → AC-001, AC-004 · AC-008.3/.4 → AC-001 ·
AC-008.5/.6 → AC-005 · AC-008.7 → AC-008 · AC-008.8 → AC-010 · AC-008.9 → AC-011.

## 14. Technical notes for developers or AI agents

- 0008 is an application service in the core behind ports to 0003, 0004, 0009 and 0011; the
  confirmation is a UI request through the shell; no `vscode` import in the core (AGENTS.md).
- The prompt template lives in one place with a golden-file test; any change to it is a spec
  change of §6.3.
- The plan path in the prompt is the `backlog/` path; after the move the agent finds the pair in
  `active/` through `/sdd-lifecycle`.
- Copilot CLI auto-loading `AGENTS.md` is UNVERIFIED; the prompt's first sentence makes it moot.

## 15. Assumptions

| ID | Assumption | Why | If wrong |
| --- | --- | --- | --- |
| A-001 | Real FeatherSpec projects ship `.claude/commands/` | Gregor, 2026-11-16: the samples lacked it only as a copy artefact | P-2 refuses real projects; revise P-2 |
| A-002 | The agent can ask and wait through the provider's input request | ADR-003 §3 `userInput` native for Copilot | Stops end the turn; 0011 maps the status |
| A-003 | 0011 refuses a second open run at creation | FR-011.4, PD-005 | AC-008's race needs a lock in 0008 |
| A-004 | A dirty working tree is the developer's matter | Studio is no git client | Agent works on top of uncommitted changes |

## 16. Open points

- OP-001 `.claude/rules/plans.md` is named in the prompt but not checked by P-2 (Gregor named the
  two command files). Add it to P-2? Non-blocking.
- OP-002 The texts of refusals and notices are written in the plan (PD-016).

## 17. Definition of Ready and Done

Ready: preconditions, prompt text and criteria fixed; 0009/0011 faked in tests until they exist.
Done: all criteria green in plain Node with the fake provider, M-1 and M-2 accepted by Gregor,
0007's "Agent start is not available yet" refusal replaced by the hand-off, docs synced.

## 18. Recommended next steps

`/sdd-clarify` in a fresh session (OP-001, A-002, A-003, the split with 0011); then `/sdd-plan`.
