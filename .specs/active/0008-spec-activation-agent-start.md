# Spec Activation & Agent Start Workflow

**Status:** In Progress
**Plan:** [0008-spec-activation-agent-start.plan.md](0008-spec-activation-agent-start.plan.md)

Handoff reference: FS-008 ([po-handoff.md](../../docs/product/po-handoff.md) §5.2, §6.4, §6.5,
§10). Builds on 0001, 0002, 0003, 0004, 0005, 0007, 0009 and 0011 (§10); M-1 also needs 0010
and 0012. Decisions: [product-decisions.md](../../docs/product/product-decisions.md) PD-002,
PD-005, PD-006, PD-013, PD-014, PD-016, PD-018, PD-019, PD-030, PD-040, PD-045; start prompt,
start policy and provider choice: Gregor, 2026-11-16 (not yet in the PD register, OP-010).

## 1. Summary

The workflow that turns an accepted Ready → Active move into one start request to the
orchestrator (0011): it checks the run-start preconditions, asks the developer for one explicit
confirmation, and sends a generated **start prompt** that makes the agent follow FeatherSpec's
own flow — start signal, backlog → active move through `/sdd-lifecycle`, the whole plan, stop
before `/sdd-compile`. Studio itself writes no FeatherSpec file (PD-013).

Terms: **hand-off** — the accepted Ready → Active request 0007 passes on with the stem (PD-045).
**Start request** — what 0008 hands to 0011 (§8). **Refusal** — a hand-off answered with reasons
instead of a run. **Start failure** — a run going from `Starting` to `Failed`; 0008 shows the
**start-failure notice** for it.

## 2. Goal and problem

Dragging a Ready spec to Active is meant to start the implementation, but Studio may neither move
specs (PD-013) nor widen a permission (PD-006). So the agent is told precisely what FeatherSpec
expects, and the files — not Studio — show the move to Active and later the derived Review state
(0003 S-REVIEW). Success: a confirmed start gives exactly one start request, a start failure is
visible with its run, and a refused or cancelled start leaves nothing but the reason shown.

## 3. Users and roles

- **Developer** (only role): requests the start, starts or cancels in the confirmation, answers
  the agent's approval and input requests (0012).
- **Agent** (actor, not a user): receives the start prompt and works in the project.

## 4. Scope

### In scope

- Receiving the hand-off from 0007 (PD-045).
- Run-start preconditions P-1 to P-8 (§6.1), checked before the confirmation and again on Start.
- The confirmation (§6.2), the start prompt (§6.3), the default-provider setting (§6.5).
- The start request to 0011; showing 0011's refusal and the start failure.

### Out of scope

- Readiness rules R-1…R-7 and the transition verdict — because 0003 owns them.
- Run creation, status transitions, cancel, resume and retry — because 0011 owns them.
- Provider availability, sign-in, setup, model setting and permission mode — because 0009/0010
  own them; 0008 only asks and shows the answer.
- Showing run events, approval and input requests — because 0012 owns them.
- Any write to `.specs/`, `.memory-bank/` or `AGENTS.md` by Studio — because of PD-013.
- A provider or model picker — because Gregor chose settings only (2026-11-16; 0010 Q4).
- Editing the prompt before the start — because its text is fixed (§6.3).
- A "don't ask again" option — because PD-002 excludes it.
- A "Start agent" button outside 0007's three move ways — because the Ready → Active move is the
  only start in the MVP (PD-014; Gregor, 2026-11-16).
- Checking the git working tree before a start — because Studio is not a git client (OP-008).
- Parallel runs — because of PD-005.

## 5. Functional flow

1. The developer moves a Ready card to Active by one of 0007's three ways; 0003 accepts; 0007
   hands the stem over (hand-off).
2. 0008 evaluates the preconditions (§6.1). Any failure: a refusal listing every failing one; no
   confirmation, no start request, nothing stored.
3. 0008 shows the confirmation (§6.2). Cancel: nothing is requested or stored.
4. Start: 0008 evaluates the preconditions again. Any failure, or a default provider, model or
   permission mode other than the confirmation showed: refusal as in 2.
5. 0008 hands 0011 one start request (§8). 0011 creates the run (`Starting`) and starts the
   provider (0011 AC-001) — or refuses with its reason (0011 BR-002, BR-012, BR-015); then 0008
   shows that reason as a refusal and no run exists.
6. On a start failure 0008 shows the start-failure notice: run ID, error class (0011 BR-008),
   "Open run". Every other end of the run is shown by 0007 and 0012, not by 0008.
7. Otherwise 0008 shows nothing more. The card stays where the files put it and shows the run's
   status (0007, PD-045); the agent's `/sdd-lifecycle` move makes it Active, plan `Done` later
   makes it Review (0003).

## 6. Business rules

### 6.1 Run-start preconditions (owned by 0008)

| ID | Precondition | Fails when | Reason shows |
| --- | --- | --- | --- |
| P-1 | 0003's transition check accepts Ready → Active for the one entry with the stem in its latest snapshot | refused; no entry or several entries carry the stem (PD-019) | 0003's reason kind and its rule or precondition IDs |
| P-2 | `.claude/commands/sdd-plan.md`, `.claude/commands/sdd-lifecycle.md` and `.claude/rules/plans.md` exist in the project (OP-001) | any of them is missing | the project-relative path of each missing file |
| P-3 | The default-provider setting (§6.5) names a registered provider (0009 BR-001) | empty, or the ID is not registered | the configured value or "no provider configured" |
| P-4 | That provider's availability result is *available* (0009 BR-004) | any other result, *unknown* included | the result and the reason 0009 returns, unchanged |
| P-5 | No run of this project is in an open state (PD-005; 0004 BR-001) | an open run exists | its run ID and spec stem |
| P-6 | The runtime store's state is *writable* (0004 BR-009, PD-030) | *read-only* or *unavailable* | the store's reason, unchanged |
| P-7 | The workspace is trusted (ADR-001 §14; 0007 §6.6) | Restricted Mode | — |
| P-8 | The stem matches the format doc §3.1: four digits, `-`, ASCII kebab-case slug (OP-009) | any other stem | the stem |

- Every precondition is evaluated each time — P-1 on 0003's latest snapshot, the others asked
  afresh — so several can fail at once; P-4 is left out when P-3 fails, P-5 when the store is
  *unavailable*. While P-4's availability check runs, the panel shows that it runs; 0009's
  check timeout (`AVAILABILITY_TIMEOUT_MS`, 15 s) turns no answer into *unknown* (OP-006). Tests assert IDs, reason kinds and parameters, not the wording; the English
  texts (PD-016) are written in the plan.
- From a hand-off's arrival until its refusal, its cancel or 0011's answer, every further
  hand-off is refused with the reason kind *start pending*.
- A refusal or a cancel stores nothing; such attempts are not recorded (Gregor, 2026-11-16).

### 6.2 The confirmation (PD-002)

Shown for every start, never skipped. It shows: spec number, title and stem · the provider's
display name (0009 BR-001) · the model the provider reports for its next start, otherwise
"provider default" · the permission mode the provider reports for the run · the provider's
disclosure text where it supplies one (0010 BR-14) · one line for each of the capabilities
`approvals` and `userInput` the provider declares as `none` (OP-005) · the spec's previous-run summary from 0011
(BR-007, AC-021) · the start prompt (§6.3), not editable, collapsed until expanded. Actions:
**Start** and **Cancel**. Closing the confirmation, closing or hiding the panel (OP-007), or another project
becoming active, counts as Cancel.

### 6.3 The start prompt (owned by 0008; text decided by Gregor, 2026-11-16)

English always; the agent follows `DocLanguage` through `AGENTS.md`. It names files by
project-relative path with forward slashes and inlines no file content. The placeholders are
`<stem>`, `<spec path>` and `<plan path>`: the stem of the entry P-1 accepted and the paths of
that spec and its sibling plan (the `backlog/` paths). Exact text:

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

The prompt is the only instruction Studio adds; the adapter passes it on unchanged (0010 BR-04).
The confirmation shows the same text the start request carries.

### 6.4 Permissions (PD-006)

0008 neither chooses nor passes a permission mode: the start request has none (0011 §9), the
provider applies its own (0010 BR-05) and the confirmation shows that one. 0008 calls no approval
or input answer operation; the developer answers (0012). The prompt's git line is an instruction
to the agent, not a permission: git commands still pass through the provider's approval path.

### 6.5 Provider and model (Gregor, 2026-11-16)

One setting, `featherspec-studio.defaultProvider`, names the default provider by ID; no picker. Its shipped value is the first
provider's ID (PD-001; 0010) — until that provider is registered, P-3 refuses. The fake (0009
BR-006) is never the shipped value; the developer and tests may set it. The model is the
provider's matter (0010 BR-08): 0008 shows and passes on what the provider reports for its next
start, "not available" where it reports none (0004 AC-003).

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
| FR-09 | Have every confirmed start recorded as a run with its events (0011, 0004); nothing else | FR-008.9 | AC-003, AC-005 |
| FR-10 | Generate the start prompt of §6.3 | FR-010.5 | AC-006 |
| FR-11 | Grant no permission | AC-008.9, PD-006 | AC-011 |

## 8. Data requirements

0008 stores nothing of its own; the default-provider setting is its only configuration. The
start request (0011 §9) carries: provider ID · model or "not available" · spec stem and
project-relative path · start prompt · the project root (0001) as working directory.

## 9. UI/UX requirements

- English (PD-016). Confirmation, refusal and start-failure notice appear in the Studio panel;
  panel-level states stay with 0005 (PD-036). The confirmation is a dialog above the area; refusal
  and start-failure notice are one line each above the area until dismissed (OP-002). Texts: plan.
- A refusal lists each failing precondition on its own line. "Open run" sends the navigation
  request to the Agent Center with the run ID (PD-040, 0012 BR-02).
- All three are keyboard-operable and announced to screen readers (handoff §13) — M-2.

## 10. Interfaces and integrations

- **0007:** the hand-off. **0003, 0002:** transition check; spec number and title.
- **0009, with 0010 behind it:** registry; the default provider's availability, display name,
  model for the next start, permission mode and disclosure text (OP-010).
- **0011:** takes the start request, answers with the run or a refusal; supplies the
  previous-run summary; owns every run status.
- **0004:** open runs, store state, the run's status changes.
- **0005, 0001, host:** panel and navigation request; project root; workspace trust.

## 11. Security, permissions and privacy

- Read-only for all FeatherSpec artifacts (PD-013); the agent changes files, Studio does not.
- No permission widening, no auto-approval (PD-006, §6.4); no start in Restricted Mode (P-7).
- The prompt contains paths and fixed text only, never secrets or file contents (OP-009).

## 12. Error cases and edge cases

| Case | Behaviour |
| --- | --- |
| Spec file or a setting changes while the confirmation is open | Re-check on Start: P-1's reason, or *confirmation outdated* (AC-004) |
| Provider fails to launch, or sign-in expires, after the re-check | Start failure: run `Failed` with its error class; notice |
| Agent never does the move, or ends the turn before the plan is Done | Files are the truth: the card stays where they put it, with the run status (PD-045, OP-004) |
| Project is not a git repository | `/sdd-lifecycle` moves on the file system; the prompt allows `git mv`, it does not demand it |

## 13. Acceptance criteria

"The system" is FeatherSpec Studio's start workflow. All criteria are decided in plain Node with
the fake provider of 0009 and fakes for 0003, 0004 and 0011, on what 0008 shows and on the
requests it sends; what the neighbours do with them is proven there (as PD-046 rules for
navigation). The prompt's collapsed state is decided by a component test of the confirmation.

**AC-001** When a hand-off for a stem reaches 0008, the system shall evaluate P-1 to P-8 before
showing a confirmation and, if any fails, shall show a refusal naming every failing precondition
by ID with the parameters of §6.1, show no confirmation, hand 0011 no start request and store
nothing. A test fails each precondition alone and asserts its ID and parameters.
> *Given* P-1 refused with R-4 and P-5 failing for run `r-7` *then* the refusal lists P-1 (R-4)
> and P-5 (`r-7`, its stem) and 0011 received no start request.

**AC-002** When all preconditions pass, the system shall show one confirmation with every item
of §6.2 and the actions Start and Cancel. The system shall offer no way to edit the prompt and
shall show it collapsed until the developer expands it.

**AC-003** When the developer cancels the confirmation, or it ends as Cancel (§6.2), the system
shall hand 0011 no start request and write nothing to the store.

**AC-004** When the developer activates Start, the system shall evaluate P-1 to P-8 again. If
any fails, or the default provider, model or permission mode differs from what the confirmation
showed (reason kind *confirmation outdated*), then it shall refuse as in AC-001 and hand 0011 no
start request.

**AC-005** When the developer activates Start and AC-004 raises no refusal, the system shall
hand 0011 exactly one start request with the values of §8, provider and model as the
confirmation showed them.
> *Then* the fake 0011 received one start request with exactly those values. *(That a run with
> its own ID then exists: 0011 AC-001.)*

**AC-006** The system shall generate the start prompt as the text of §6.3 with `<stem>`, `<spec
path>` and `<plan path>` replaced as §6.3 defines; for a fixture spec the result shall equal a
golden file byte for byte, and the confirmation shall show the same text.

**AC-007** If `.claude/commands/sdd-plan.md`, `.claude/commands/sdd-lifecycle.md` or
`.claude/rules/plans.md` is missing, then the system shall refuse with P-2 naming each missing path.

**AC-008** If a run of the project is in an open state, then the system shall refuse with P-5
naming that run's ID and stem. If 0011 refuses a start request because a run is open (0011
AC-002), then the system shall show that refusal with the run's ID and stem and no notice.

**AC-009** While the system is checking a hand-off, showing its confirmation or waiting for
0011's answer to its start request, it shall refuse every further hand-off with the reason kind
*start pending* and show no second confirmation.

**AC-010** When the run of a start request goes from `Starting` to `Failed`, the system shall
show a start-failure notice naming the run ID and its error class (0011 BR-008) with "Open run",
and shall hand 0011 no further start request by itself. If 0011 refuses the start request (0011
BR-012, BR-015), then the system shall show 0011's reason as a refusal and no notice.
> *Given* the fake 0011 reports the run `Failed` with `runtime_missing` *then* the notice names
> the run ID and `runtime_missing`, and "Open run" sends the navigation request with that run ID.

**AC-011** The system shall show the permission mode the provider reports, shall put no
permission setting into the start request, and shall call no approval or input answer operation
of 0011 or 0009 — recorders on the fakes decide it. *(That the provider runs in that mode and
nothing else answers: 0010 AC-015, 0011 AC-012, 0009 AC-019.)*

**AC-012** The system shall create, change or delete no file inside the project: a fixture
project's file tree and contents are identical before and after every scenario of this section.

**AC-013** If the store's state is *read-only* or *unavailable*, then the system shall refuse
with P-6 and the store's reason.

**AC-014** When a hand-off passes all preconditions after the developer confirmed an earlier
start whose run has ended, the system shall show the confirmation again.

### Manual checks (Gregor)

- **M-1** (checked with 0010's acceptance, OP-011) Real provider on `tip-splitter` (needs 0010, 0011, 0012): the agent moves spec and
  plan to `active/` via `/sdd-lifecycle` (`git mv`), implements, stops at the test review per
  stage, ends with plan `Done` before `/sdd-compile`, makes no commit and lists commit proposals.
- **M-2** Gregor accepts the confirmation and the expanded prompt as readable, and operates
  confirmation, refusal and notice by keyboard alone with a screen reader announcing them.
  Revised 2026-11-17 under Gregor's delegation ("everything must work, be tested", Gregor,
  2026-11-17): keyboard-only operation and what a screen reader is given to announce — the
  dialog named by its title, refusal and notice as alerts, the checking line as a status — are
  decided by the component tests named "M-2" in `StartDialog.test.tsx` and `StartLines.test.tsx`;
  readability is checked by Gregor's delegate on headless-Chrome screenshots of the real webview
  bundle in Dark, Light and High Contrast; the announcement by a real screen reader inside VS Code
  is checked by Gregor or his delegate — pre-release checklist item.

### Handoff criteria map

AC-008.1 → 0007 AC-014/AC-015 + AC-001 · AC-008.2 → AC-001, AC-004 · AC-008.3/.4 → AC-001 ·
AC-008.5/.6 → AC-005 + 0011 AC-001 · AC-008.7 → AC-008, AC-009 + 0011 AC-002 · AC-008.8 →
AC-010 · AC-008.9 → AC-011 + 0011 AC-012.

## 14. Technical notes for developers or AI agents

- 0008 is an application service in the core behind ports to 0003, 0004, 0009, 0011 and the UI;
  no `vscode` import in the core (AGENTS.md). The setting's key is `featherspec-studio.defaultProvider`.
- One prompt template. The golden file fixes its byte form: the wraps inside the quote of §6.3
  are layout, not line breaks — one line per paragraph and list item, LF. A change to template
  or golden file is a spec change of §6.3.
- The plan path in the prompt is the `backlog/` path; after the move the agent finds the pair in
  `active/` through `/sdd-lifecycle`.
- Copilot CLI auto-loading `AGENTS.md` is UNVERIFIED; the prompt's first sentence makes it moot.

## 15. Assumptions

| ID | Assumption | Why | If wrong |
| --- | --- | --- | --- |
| A-001 | Real FeatherSpec projects ship the two command files of P-2 | Template content (format doc §1); the samples lacked `.claude/` only as a copy artefact (Gregor, 2026-11-16). Only a start needs them, recognising a project does not (0001) | P-2 refuses real projects; revise P-2 |
| A-002 | The first provider lets the agent ask and wait (input request) | 0010 BR-07; ADR-003 §3 — unproven until the PoC (PD-001) | A stop ends the turn and the run (OP-004, OP-005) |
| A-004 | A dirty working tree is the developer's matter in the MVP | Studio is no git client (OP-008) | Agent works on top of uncommitted changes |

## 16. Open points

Open (cross-spec, main session):

- OP-010 [F-04…F-07, F-17, F-58]: 0009's port now reports permission mode (`permissionModeLabel`),
  disclosure text and next-start model (plan 0009 *Surface*); still open: 0009's "never the
  default provider" is read here as "never the shipped value" · the format doc §1.1 lacks A-001's
  note · the "Gregor, 2026-11-16" decisions have no PD entry · 0010's acceptance has to list M-1.

Resolved:

- 2026-11-16, by each point's own recommendation (Gregor, applied while planning):
  OP-001 `.claude/rules/plans.md` joins P-2; no version gate in the MVP ·
  OP-002 refusal and notice are one line above the area until dismissed, the confirmation a
  dialog above the area (§9) ·
  OP-004 MVP: after a run ended on an `active/` spec the developer continues in their own agent
  chat; a "continue" start is later work ·
  OP-005 a default provider declaring `approvals` or `userInput` as `none` is allowed; the
  confirmation names each such capability (§6.2) ·
  OP-006 the panel shows that the availability check runs; 0009's `AVAILABILITY_TIMEOUT_MS`
  (15 s) makes P-4 fail with *unknown* (§6.1) ·
  OP-007 hiding the panel cancels an open confirmation (§6.2) ·
  OP-008 no git check in the MVP (A-004) ·
  OP-009 P-8 refuses a stem outside the format doc §3.1 ·
  OP-011 M-1 moves to 0010's acceptance; 0008's Done does not wait for it.
- OP-003 (2026-11-16): `/sdd-clarify` listed 59 findings, 11 blocking; resolved in one go at
  Gregor's request (one-off exception to the walkthrough): 48 resolved, 11 parked, none
  asked. The blocking ones were contract conflicts, settled by the owner: 0011 — one start
  request, refusal without a run, error class (A-003 withdrawn) · 0007 §6.6, ADR-001 §14 — P-7 ·
  0010, 0011 BR-007 — confirmation content, permission mode, model · 0009, 0004 — P-3, P-4, P-6.
  Readings made while applying; say so if one is wrong: (a) only *available* passes P-4; (b) the
  developer may set the fake as default provider; (c) a setting changed while the confirmation
  is open refuses the start; (d) closing the panel or switching the project cancels an open
  confirmation; (e) 0008 shows a notice only for `Starting` → `Failed`.

## 17. Definition of Ready and Done

Ready: preconditions, prompt text and criteria fixed; 0003, 0004 and 0011 faked in tests until
they exist. Done: all criteria green, 0007's "Agent start is not available yet" refusal replaced
by the hand-off, docs synced, M-2 recorded as revised in §13; M-1 is accepted with 0010 (OP-011).

## 18. Recommended next steps

`/sdd-plan`; OP-010 goes to the main session.
