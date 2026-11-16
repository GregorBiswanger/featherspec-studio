# Spec Lifecycle & Readiness Model

**Status:** Draft
**Plan:** _none yet_

Handoff reference: FS-003 ([po-handoff.md](../../docs/product/po-handoff.md) §6, §10). Format
basis: [featherspec-format.md](../../docs/discovery/featherspec-format.md) §5–§7 (SPIKE-001).

## 1. Summary

A framework-free domain model that assigns every FeatherSpec spec exactly one board state
(Backlog, Ready, Active, Review, Done, Blocked). The state comes from the spec and plan files
alone, using documented rules. The model checks readiness against named preconditions,
accepts or refuses board transitions with a reason, and keeps three status dimensions apart:
spec lifecycle, agent run, verification. It records a history of the state changes Studio
observes while it is running. It never writes a FeatherSpec file.

## 2. Goal and problem

Studio needs one status model that mirrors the existing FeatherSpec process, so that board,
Mission Control and activation (0007, 0006, 0008) all show the same state for the same files.
FeatherSpec persists only part of the lifecycle: folder plus `**Status:**`, and plan
`**Status:**`. Ready, Review and Blocked must be derived, and the derivation has to be
traceable (PD-004). The model succeeds when a developer can see, for every spec, which state
it is in, which rule put it there, why it is or is not Ready, and why a drop was refused.

## 3. Users and roles

- **Developer** (primary): reads states and readiness, drags a Ready spec to Active. One role;
  no permission differences in the MVP (brief: [projectbrief.md](../../.memory-bank/projectbrief.md)).
- **Tech lead / architect:** reads the status history and the verification status.
- **Consuming components (not people):** board and detail view (0007), Mission Control (0006),
  activation workflow (0008), orchestrator (0011).

## 4. Scope

### In scope

- Mapping folders and header lines to the six board states (rules §6.1).
- Marking each state as persisted or derived, with the rule that produced it.
- Readiness check of the spec-side preconditions (§6.2).
- Diagnostics for contradictory or unreadable specs (§6.3).
- Validating board-requested transitions (§6.4) and marking observed transitions that leave
  the FeatherSpec flow.
- Re-deriving states after file changes, and the observed status history (§6.5).
- A separate verification status read from the plan's traceability table (§6.6).

### Out of scope

- Writing, moving or renaming any FeatherSpec artifact. Lifecycle moves stay with
  `/sdd-lifecycle` — because Studio is read-only for these files (PD-013).
- Provider availability, authentication and the user's start confirmation — because they are
  run-start preconditions owned by 0008. This spec delivers only the spec-side readiness that
  0008 consumes.
- Inter-spec dependencies as a readiness rule — because FeatherSpec has no dependency field.
  Shown as "not available"; a blocking dependency is expressed by plan `Blocked` (Gregor,
  2026-11-16).
- Reconstructing past states from git history or file timestamps — because the history is
  defined as what Studio observed (Gregor, 2026-11-16).
- Persisting the `/sdd-compile` verdict — because FeatherSpec does not persist it. Not now;
  revisit if Review→Done needs Studio-side evidence.
- User-configurable workflow engines or custom states — not ever in the MVP (handoff FS-003
  *Out of Scope*).
- Parsing files (0002), storage technology (0004), board rendering, priority and sorting
  (0007, PD-015), agent run states (0011) — because each has its own spec.

## 5. Functional flow

1. The spec repository (0002) delivers a snapshot: per spec its folder, header lines, plan
   link, plan status, acceptance-criterion definitions, traceability rows, return notes and
   parser diagnostics.
2. The model derives one state per spec (§6.1), its rule ID, the persisted/derived marker,
   the readiness result (§6.2), the diagnostics (§6.3) and the verification status (§6.6).
3. The model compares each state with the last recorded one and appends history entries (§6.5).
4. On a change notification from 0002, the affected specs go through steps 2–3 again.
5. When the board requests a transition, the model accepts it or refuses it with a reason (§6.4).
   The only accepted request is Ready → Active. 0008 then runs its own start checks and the
   start confirmation.

## 6. Business rules

### 6.1 State derivation (first match wins, evaluated top-down)

| Rule | State | Persisted? | Condition |
| --- | --- | --- | --- |
| S-DONE | Done | persisted | spec in `done/` with `**Status:**` `Implemented`, `Baseline` or `Deprecated` |
| S-BLOCKED | Blocked | derived | not in `done/`, and (plan `**Status:** Blocked`, or an unintegrated return note `activeContext.<NNNN>-<step>.md` for this spec with `**Status:** BLOCKED`) |
| S-REVIEW | Review | derived | `active/`, `In Progress`, sibling plan `Done` |
| S-ACTIVE | Active | persisted | `active/` and none of the above |
| S-READY | Ready | derived | `backlog/` and readiness check passes (§6.2) |
| S-BACKLOG | Backlog | persisted | `backlog/` and none of the above |

- `Deprecated` is Done with a *Deprecated* marker and the spec's successor link, or its
  `successor: none — behaviour removed` text (Gregor, 2026-11-16).
- `Baseline` is Done. It needs no plan and no `**Clarified:**` line to be Done.
- Blocked is never derived from `activeContext.md` *Blockers* prose or from `## Blocker`
  sections in plans (featherspec-format §5.2).
- Spec states never change because of agent run states or the verification status.

### 6.2 Readiness preconditions (spec side)

| ID | Precondition | Fails when |
| --- | --- | --- |
| R-1 | Spec is in `backlog/` with `**Status:** Draft` | other folder or status |
| R-2 | At least one acceptance-criterion definition (`AC-NNN`) is present | none parsed |
| R-3 | Sibling plan `<spec stem>.plan.md` exists and the spec's `**Plan:**` line links it | plan missing or not linked |
| R-4 | Plan `**Status:** Not started` | any other plan status |
| R-5 | Spec is not Blocked (S-BLOCKED condition) | blocked |
| R-6 | No contradiction or unreadable-file diagnostic on spec or plan (§6.3, §13) | such a diagnostic exists |
| R-7 | Inter-spec dependencies | always *not available*; informational, never fails |

- Plan approval is not persisted by FeatherSpec. The explicit start confirmation in 0008
  (PD-002) **is** the plan approval; Ready does not wait for any other approval mark
  (Gregor, 2026-11-16).
- Parser diagnostics for unknown but harmless content (0002, unknown-content kind) do not
  fail R-6.

### 6.3 Contradictions (diagnostics, not states)

The card stays in the column its folder points to (`backlog/` → Backlog rules, `active/` →
Active/Review rules, `done/` → Done). It carries a diagnostic naming the contradiction and is
never Ready (Gregor, 2026-11-16):

- `active/` with a status other than `In Progress`; `backlog/` with a status other than `Draft`;
  `done/` with `Draft` or `In Progress`.
- `active/` without a sibling plan, unless `**Plan:**` links a `plan-archive/` path
  (reactivation before the fresh plan exists — valid, no diagnostic).
- `done/` + `Implemented` without an archive link in `**Plan:**`. A legacy sibling plan beside
  a `done/` spec (≤ 1.4 layout) is valid and gets no diagnostic.
- The same spec stem or number in more than one lifecycle folder (placement: A-001).
- A plan file without a spec: no card, one project-level diagnostic.

### 6.4 Transitions

**Requested by the board:** only Ready → Active is accepted, and only while the readiness check
passes at the moment of the request. Every other request is refused with a reason (PD-014):

| Request | Reason given |
| --- | --- |
| to Ready, Review or Blocked | the target state is derived from the files; name its rule |
| to Done | Done needs `/sdd-compile` evidence and the `/sdd-lifecycle` move |
| Backlog → Active (spec not Ready) | the failing readiness preconditions, by ID |
| any other | Studio does not move specs; lifecycle moves belong to `/sdd-lifecycle` (PD-013) |

**Observed from the files:** the files are the truth. Every observed change is shown and
recorded. A change not in this list is recorded with the marker *outside the FeatherSpec flow*
(A-002): Backlog ↔ Ready · Backlog/Ready → Active · Active ↔ Review · Review → Done ·
Active → Done · Done → Active (reactivation) · any non-Done state ↔ Blocked · Blocked → Done.

### 6.5 Status history

- **Scope statement (binding):** the history contains only state changes Studio observed while
  it was running. It is not a reconstruction of the spec's past. The history view carries
  this statement as a label (Gregor, 2026-11-16).
- Entry: observed time, spec number, old state, new state, rule ID, cause, flow marker.
- Causes: the changed file paths; *first observed*; *changed while Studio was not running*
  (one entry at start-up when the derived state differs from the last recorded one — no
  intermediate states, no times guessed from git or file timestamps); *no longer observed*.
- Stored in Studio's runtime data (0004), never in the repository. Kept per PD-012.

### 6.6 Verification status (separate dimension)

- Source: the traceability table of the spec's current plan. That is the sibling plan in
  `backlog/` or `active/`, or the archived plan linked from `**Plan:**` for `done/` specs.
- Shown: count of rows per `State` value (`open`, `built`, `verified`), and the summary
  *not available* (no plan or no table) · *pending* (any row not `verified`) · *all verified*.
- The `/sdd-compile` verdict is shown as *not available*: FeatherSpec does not persist it
  (Gregor, 2026-11-16).
- Spec DoR/DoD checkboxes are never counted (featherspec-format §6).

## 7. Functional requirements

| ID | Requirement | Handoff | Criteria |
| --- | --- | --- | --- |
| FR-01 | Support the six board states | FR-003.1 | AC-001 |
| FR-02 | Map folders and header lines to the model | FR-003.2 | AC-001, AC-012, AC-013, AC-020, AC-021 |
| FR-03 | Distinguish persisted and derived states | FR-003.3 | AC-002 |
| FR-04 | Validate transitions by defined rules | FR-003.4 | AC-008, AC-009 |
| FR-05 | Determine readiness by explicit preconditions | FR-003.5 | AC-003, AC-004, AC-005 |
| FR-06 | Detect external file changes and the resulting state changes | FR-003.6 | AC-014 |
| FR-07 | Make state changes traceable with time and cause | FR-003.7 | AC-014, AC-015, AC-016, AC-017 |
| FR-08 | Keep spec lifecycle, agent run and verification status apart | FR-003.8 | AC-006, AC-007, AC-018 |
| FR-09 | Reproducible, documented derivation; never change FeatherSpec conventions | AC-003.7, AC-003.8 | AC-002, AC-010, AC-011 |
| FR-10 | Keep working when individual files are broken | — | AC-019 |

## 8. Data requirements

- **Input** (from 0002, read-only): folder, `**Status:**`, `**Plan:**` target, plan
  `**Status:**`, AC definitions, traceability rows, return notes with status, diagnostics.
- **Output per spec:** state, rule ID, persisted/derived marker, readiness result (R-1…R-7, each
  *pass / fail / not available* with reason), diagnostics, verification status, Deprecated
  marker with successor.
- **History entry** (persisted via 0004): fields in §6.5. Contains no file contents and no
  secrets.

## 9. UI/UX requirements

The rendering belongs to 0007. This model supplies the texts it needs: a state label, a
*derived* label with its rule, readiness reasons, refusal reasons, diagnostic text, and the
history scope statement (§6.5). UI language English (PD-016).

## 10. Interfaces and integrations

- **0002 Spec repository & parser:** snapshot and change notifications (input).
- **0004 Runtime persistence:** stores and loads the status history.
- **0007 Board / detail, 0006 Mission Control:** read states, reasons, history.
- **0008 Activation:** calls the transition check for Ready → Active and adds the run-start
  preconditions.
- **0011 Orchestrator:** run states are shown next to the spec state, never fed into it.

## 11. Security, permissions and privacy

- Read-only for `.specs/`, `.memory-bank/` and `AGENTS.md` (PD-013).
- History stays local in Studio runtime data, outside the user's repository (PD-003, PD-012).

## 12. Error cases and edge cases

- Unreadable or unparseable spec or plan: the other specs keep their states. The affected spec
  is placed by its folder, carries the diagnostic and is never Ready.
- Spec file deleted: history entry *no longer observed*; no card.
- Spec renumbered or renamed: treated as *no longer observed* plus *first observed* (identity
  is the spec number, 0002).
- Several changes arriving in one notification: one entry per spec, old → final state.
- History storage unavailable: states are still derived and shown; the history view reports
  *not available*.

## 13. Acceptance criteria

**AC-001** The lifecycle model shall assign every spec delivered by the spec repository exactly
one state out of Backlog, Ready, Active, Review, Done and Blocked, using the rules of §6.1 in
the order S-DONE, S-BLOCKED, S-REVIEW, S-ACTIVE, S-READY, S-BACKLOG, first match wins.
*(handoff AC-003.1)*

> **Given** a fixture with one spec each in `backlog/` (with a not-started linked plan),
> `active/` (plan `In Progress`), `active/` (plan `Done`) and `done/` (`Implemented`)
> **When** the model derives states **Then** they are Ready, Active, Review, Done.

**AC-002** The model shall mark Backlog, Active and Done as *persisted*, and Ready, Review and
Blocked as *derived*. It shall attach to every state the ID of the rule that produced it.
*(AC-003.7, PD-004)*

**AC-003** The model shall report Ready only for a spec that passes readiness preconditions
R-1 to R-6. *(AC-003.2)*

**AC-004** If a `backlog/` spec has no sibling plan, or its `**Plan:**` line does not link the
sibling plan, or the plan status is not `Not started`, then the model shall not report it as
Ready. The readiness result shall name the failing precondition by ID. *(AC-003.3)*

**AC-005** The readiness check shall return, for each precondition R-1 to R-7, one of *pass*,
*fail* or *not available*, with a reason. R-7 shall always be *not available* and shall never
make the check fail.

**AC-006** When an agent run of a spec enters any run state, including Completed, the model
shall leave that spec's state unchanged. *(AC-003.4, FR-003.8)*

**AC-007** The model shall report Review only for an `active/` spec with status `In Progress`
whose sibling plan is `Done`, and Done only for a spec in `done/`. A run state or verification
status shall never move a spec between Review and Done. *(AC-003.5)*

**AC-008** When the board requests a transition, the model shall accept only Ready → Active,
and only if the readiness check passes at that moment. It shall refuse every other request
with the reason defined in §6.4. *(AC-003.6, PD-014)*

**AC-009** If an observed state change is not in the in-flow list of §6.4, then the model
shall show the new state as the files define it. It shall record the change in the history
with the marker *outside the FeatherSpec flow*.

**AC-010** For identical file contents, the model shall produce identical states, rule IDs,
readiness results, diagnostics and verification statuses, regardless of the clock, the status
history and agent runs. *(AC-003.7)*

**AC-011** The model shall not create, modify, move, rename or delete any file under
`.specs/`, `.memory-bank/` or `AGENTS.md`. *(AC-003.8, PD-013)*

**AC-012** If a spec shows a contradiction listed in §6.3, then the model shall place it by its
folder, attach a diagnostic naming the contradiction, and not report it as Ready.

**AC-013** Where a `done/` spec has status `Deprecated`, the model shall report Done with a
*Deprecated* marker and the successor link or successor text from the spec.

**AC-014** When the spec repository reports a change to a spec, plan or return note, the model
shall re-derive the affected specs. For each spec whose state changed, it shall append one
history entry with observed time, spec number, old state, new state, rule ID, flow marker and
the changed file paths as cause. *(FR-003.6, FR-003.7)*

**AC-015** When Studio starts and a spec's derived state differs from the last state recorded
in its history, the model shall append exactly one entry with cause *changed while Studio was
not running* and the start time as observed time. It shall not record intermediate states or
times taken from git or file timestamps.

**AC-016** The status history shall contain only entries the model recorded itself. Its data
shall carry the label "Observed by Studio while it was running — not a reconstruction" for
display.

**AC-017** When the model sees a spec number for the first time, it shall append one entry
with cause *first observed* and no flow check. When a spec disappears, it shall append one
entry with cause *no longer observed*.

**AC-018** The model shall provide, per spec, a verification status separate from spec state
and run state. It shall consist of the counts of traceability rows per `State` value in the
spec's current plan (§6.6) and the summary *not available*, *pending* or *all verified*. The
`/sdd-compile` verdict shall be reported as *not available*.

**AC-019** If a spec or plan file cannot be read or parsed, then the model shall keep deriving
the states of all other specs, and shall place the affected spec by its folder with the
diagnostic, never as Ready.

**AC-020** While a spec outside `done/` has a plan with status `Blocked`, or an existing return
note for it with status `BLOCKED`, the model shall report Blocked. The model shall not derive
Blocked from `activeContext.md` text or from `## Blocker` sections.

**AC-021** The model shall report a `done/` spec with status `Baseline` as Done, without
requiring a plan or a `**Clarified:**` line.

Who decides: all criteria are decided by unit tests over fixture snapshots (fixture set in
featherspec-format §11, including the synthetic `fs110-ready-synthetic` and
`fs110-parallel-synthetic`). AC-016's label in the UI is checked by Gregor in 0007.

## 14. Technical notes for developers or AI agents

- Brownfield check: no source module exists yet (`architecture: modules: []`); nothing to
  reuse. The model lives in the framework-free domain layer and must not import `vscode`
  (AGENTS.md snapshot, Core purity).
- Shape to aim for (decided in `/sdd-plan`): a pure function `snapshot → per-spec result`
  makes AC-010 testable directly. History appending is an application service behind the
  0004 storage port.
- Parser risks that bear on this model (featherspec-format §10): #8 do not use
  `Current step:`; #9 the verdict is not persisted; #10 accept both `_none yet_` and `_none_`
  for Baselines; #11 Baselines without `**Clarified:**` must still be Done; #12 never derive
  from `activeContext.md`; #20 the Ready shape, `Blocked` plans and return notes are seen in no
  sample, so synthetic fixtures are required.
- Status values stay English in German projects (featherspec-format §3.2), so match them
  literally. Headings are not stable; take the plan stem, not heading text.
- Quality gates per step: `.memory-bank/techContext.md` *Quality gates*. The first plan
  introduces `npm run test:unit`.

## 15. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | A duplicated spec number gives one card, placed by the copy in the furthest folder (`done/` > `active/` > `backlog/`), with a diagnostic naming all copies | `/sdd-lifecycle` resolves duplicates only with a human, so Studio must not pick a "canonical" copy; one card keeps 0007 AC "exactly one column" | Card lands in a column the user does not expect; rule change only |
| A-002 | The in-flow transition list of §6.4 matches FeatherSpec's flow | Derived from the AGENTS.md *Flow* line, `/sdd-lifecycle` reactivation and the evidence gate (featherspec-format §7) | Legitimate moves get the *outside the flow* marker; marker only, no refusal |
| A-003 | Active → Done in one observation is in-flow | The final step tick and the `done/` move can land in one change notification | Spurious *outside the flow* markers |
| A-004 | `**Clarified:**` is not required for Ready | By rule it appears only on Baselines (`.claude/rules/specs.md`) | Ready shown before `/sdd-clarify` ran |
| A-005 | 0002 delivers every input field of §8 plus change notifications | handoff FS-002 FR-002.2–002.8 | This spec needs a re-plan once 0002 is written |
| A-006 | A return note counts as blocking only while the file exists | `parallel-work.md`: notes are deleted once integrated | A stale Blocked state, or a missed one |
| A-007 | Non-binding criteria count as `open` in the verification counts | They are marked only in prose (featherspec-format §6) | *all verified* never shown for such plans; acceptable |
| A-008 | Proxy decisions PD-002, PD-012, PD-013, PD-014 hold | PD register, awaiting Gregor's confirmation | Transition and history rules change (§6.4, §6.5) |

## 16. Open points

- OP-001: Confirm A-001 (duplicate placement) in `/sdd-clarify`.
- OP-002: The Ready rule is **UNVERIFIED** against a real sample (featherspec-format §5.2). It
  is verified by the synthetic fixture only.
- OP-003: The proxy PDs (A-008) await Gregor's confirmation. A change means revising this spec.
- OP-004 (resolved): interview questions 2–6 were asked in one message at Gregor's explicit
  request, a one-off exception to `/sdd-specify`'s one-question rule (2026-11-16).

## 17. Definition of Ready

Goal and problem, users, scope and out-of-scope are documented. The derivation, readiness and
transition rules are testable. The happy path and the error cases are described. The criteria
are measurable. Data and constraints are clarified or recorded as assumptions, and the open
points are visible.

## 18. Definition of Done

All must-requirements are built and AC-001 to AC-021 pass in unit tests over the fixture set.
No out-of-scope behaviour was added, in particular no file writes. Assumptions are verified or
documented. The architecture snapshot is updated for the new domain module. Gregor accepted
the result.

## 19. Recommended next steps

1. `/sdd-clarify` on this spec in a fresh session (assumptions A-001–A-003, OP-001).
2. `/sdd-plan` after 0002's model is specified, since it defines this spec's input.
