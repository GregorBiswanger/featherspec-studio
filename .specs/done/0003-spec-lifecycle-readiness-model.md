# Spec Lifecycle & Readiness Model

**Status:** Implemented
**Plan:** [0003-spec-lifecycle-readiness-model.2026-11-17.plan.md](../plan-archive/0003-spec-lifecycle-readiness-model.2026-11-17.plan.md)

*Amended by 0018 (PD-062): wherever this spec names Mission Control or the Spec Board as a place, read Overview or Board; the rows of 0018 §5 change behaviour.*

*Amended by 0015 (PD-055/PD-056): every other statement, requirement, criterion, term, assumption or open point of this spec about agent runs, run events, providers, approvals, the Agent Center, the start workflow, the Clear command or specs 0008–0012 is void; a sentence that also says something else keeps that part. The notes below name what changes in meaning or needs a replacement; see [0015](0015-focus-on-visibility.md) §5.*

*Amended by 0017 (PD-060/PD-061): every other statement, criterion, note or open point of this spec about drag and drop, "Move to…", the move command, move requests, the board-requested transition check, an accepted Ready → Active request or the drop result is void; a sentence that also says something else keeps that part.*

Handoff reference: FS-003 ([po-handoff.md](../../docs/product/po-handoff.md) §6, §10). Format
basis: [featherspec-format.md](../../docs/discovery/featherspec-format.md) §5–§7 (SPIKE-001).
Decisions: [product-decisions.md](../../docs/product/product-decisions.md) PD-018–PD-023, PD-030.

## 1. Summary

A framework-free domain model that assigns every FeatherSpec spec entry (one file, PD-018)
exactly one board state (Backlog, Ready, Active, Review, Done, Blocked). The state comes from
the spec files, plan files and return notes alone, using documented rules. The model checks
readiness against named preconditions, accepts or refuses board transitions with a reason,
and keeps three status dimensions apart: spec lifecycle, agent run, verification. It records
a history of the state changes Studio observes while it is running. It never writes a
FeatherSpec file.

*Amended by 0017 (PD-060/PD-061): "accepts or refuses board transitions" is void; the model has no transition check (0017 §6.5).*

*Amended by 0015 (PD-055/PD-056): §1 and FR-08: two dimensions, spec lifecycle and verification; there is no agent run dimension.*

## 2. Goal and problem

Studio needs one status model that mirrors the existing FeatherSpec process, so that board,
Mission Control and activation (0007, 0006, 0008) all show the same state for the same files.
FeatherSpec persists only part of the lifecycle: folder plus `**Status:**`, and plan
`**Status:**`. Ready, Review and Blocked must be derived, and the derivation has to be
traceable (PD-004). The model succeeds when a developer can see, for every spec, which state
it is in, which rule put it there, why it is or is not Ready, and why a drop was refused.

*Amended by 0017 (PD-060/PD-061): "why a drop was refused" is void (no drop, PD-060).*

## 3. Users and roles

- **Developer** (primary): reads states and readiness, drags a Ready spec to Active. One role;
  no permission differences in the MVP (brief: [projectbrief.md](../../.memory-bank/projectbrief.md)).
  *Amended by 0017 (PD-060/PD-061): "drags a Ready spec to Active" is void (PD-060).*
- **Tech lead / architect:** reads the status history and the verification status.
- **Consuming components (not people):** board and detail view (0007), Mission Control (0006),
  activation workflow (0008), orchestrator (0011).

## 4. Scope

### In scope

- Mapping folders and header lines to the six board states (rules §6.1).
- Marking each state as persisted or derived, with the rule that produced it.
- Readiness check of the spec-side preconditions (§6.2).
- Lifecycle-contradiction diagnostics (§6.3): this model alone judges them (PD-020). File and
  parse diagnostics come from 0002 and are passed on unchanged.
- Validating board-requested transitions (§6.4) and marking observed transitions that leave
  the FeatherSpec flow.
  *Amended by 0017 (PD-060/PD-061): "Validating board-requested transitions (§6.4)" is void; marking observed transitions stays.*
- Re-deriving states after file changes, and the observed status history (§6.5).
- A separate verification status read from the plan's traceability table (§6.6).

### Out of scope

- Writing, moving or renaming any FeatherSpec artifact. Lifecycle moves stay with
  `/sdd-lifecycle` — because Studio is read-only for these files (PD-013).
- Provider availability, authentication and the user's start confirmation — because they are
  run-start preconditions owned by 0008. This spec delivers only the spec-side readiness that
  0008 consumes.

*Amended by 0015 (PD-055/PD-056): void. §2, §3 and §10 references to 0008 and 0011 are void; the consumer of an accepted request is the board (0007), which shows the next step.*
- Inter-spec dependencies as a readiness rule — because FeatherSpec has no dependency field.
  Shown as "not available"; a blocking dependency is expressed by plan `Blocked` (Gregor,
  2026-11-16).
- Reconstructing past states from git history or file timestamps — because the history is
  defined as what Studio observed (Gregor, 2026-11-16).
- Persisting the `/sdd-compile` verdict — because FeatherSpec does not persist it. Not now;
  revisit if Review→Done needs Studio-side evidence.
- User-configurable workflow engines or custom states — because the model mirrors the one
  documented FeatherSpec process, and configurable rules would break the traceable derivation
  (handoff FS-003 *Problem* and *Out of Scope*, PD-004). Not in the MVP.
- Detecting unreadable files, unknown values, duplicates, orphan plans, dangling links and
  unverified versions — because 0002 reports these file facts (PD-020).
- Parsing files (0002), storage technology (0004), board rendering, priority and sorting
  (0007, PD-015), agent run states (0011) — because each has its own spec.

## 5. Functional flow

1. The spec repository (0002) delivers a snapshot: per spec entry its key, stem, folder, header
   lines, body sections, linked plans with their status, acceptance-criterion definitions,
   traceability rows, linked return notes and diagnostics.
2. The model derives one state per entry (§6.1), its rule ID, the persisted/derived marker,
   the readiness result (§6.2), the diagnostics (§6.3) and the verification status (§6.6).
3. The model compares each state with the last recorded one and appends history entries (§6.5).
4. On a change notification from 0002, the affected specs go through steps 2–3 again.
5. When the board requests a transition, the model accepts it or refuses it with a reason (§6.4).
   The only accepted request is Ready → Active. Acceptance is a verdict for the caller and
   changes no state. 0008 then runs its own start checks and the start confirmation.
   *Amended by 0017 (PD-060/PD-061): void: the model checks no board-requested transition (0017 §6.5).*

*Amended by 0015 (PD-055/PD-056): §5 step 5: the board shows the next step (0015 AC-006); the verdict still changes no state.*

## 6. Business rules

Terms used below:

- **Entry:** one spec file, keyed by its project-relative path. Its **stem** `NNNN-slug` joins
  it to plans and names it in the history. The number alone is a display ID (PD-018).
- **State:** one of the six board states, capitalised. Folders are written `backlog/`,
  `active/`, `done/`. **Status** always means a header value: the `**Status:**` of a spec, a
  plan or a return note.
- **Sibling plan:** `<stem>.plan.md` in the entry's own folder.
- **Persisted state:** readable from the entry's folder and `**Status:**` line alone (Backlog,
  Active, Done). **Derived state:** needs anything else — plan status, plan link, return notes
  or the readiness check (Ready, Review, Blocked; PD-004).

### 6.1 State derivation (first match wins, evaluated top-down; PD-021)

| Rule | State | Persisted? | Condition |
| --- | --- | --- | --- |
| S-DONE | Done | persisted | entry in `done/`, whatever its status |
| S-BLOCKED | Blocked | derived | not in `done/`, and (sibling plan `**Status:** Blocked`, or a linked return note `activeContext.<NNNN>-<step>.md` with `**Status:** BLOCKED` exists). Applies to contradictory and unreadable specs too |
| S-FOLDER | Backlog (`backlog/`) or Active (`active/`) | persisted | spec carries a lifecycle contradiction (§6.3) or cannot be read |
| S-REVIEW | Review | derived | `active/`, `In Progress`, sibling plan `Done` |
| S-ACTIVE | Active | persisted | `active/` and none of the above |
| S-READY | Ready | derived | `backlog/` and readiness check passes (§6.2) |
| S-BACKLOG | Backlog | persisted | `backlog/` and none of the above |

*Amended by 0028 (PD-081, D-1): sibling plan `Done` or finished (0028 §6.1: readable, at least one step ticked, every step ticked or struck); the rule ID stays S-REVIEW.*

- A `done/` entry whose status is not `Implemented`, `Baseline` or `Deprecated` is Done and
  carries a contradiction diagnostic (§6.3).
- `Deprecated` is Done with a *Deprecated* marker and the successor read from the spec: the
  documented link, or the text `successor: none — behaviour removed`. Where the spec carries
  neither, the model reports *successor: not available* (PD-022).
- `Baseline` is Done. It needs no plan and no `**Clarified:**` line to be Done.
- Blocked is never derived from `activeContext.md` *Blockers* prose or from `## Blocker`
  sections in plans (featherspec-format §5.2). A return note blocks only while it exists, is
  linked to the entry by 0002 and its status is literally `BLOCKED`.
- Spec states never change because of agent run states or the verification status.

*Amended by 0015 (PD-055/PD-056): read: spec states never change because of the verification status.*

### 6.2 Readiness preconditions (spec side)

| ID | Precondition | Fails when |
| --- | --- | --- |
| R-1 | Spec is in `backlog/` with `**Status:** Draft` | other folder or status |
| R-2 | At least one acceptance-criterion definition (`AC-NNN`) is present | none parsed |
| R-3 | Sibling plan exists and the spec's `**Plan:**` line links it | plan missing or not linked |
| R-4 | Sibling plan `**Status:** Not started` | no sibling plan, or any other plan status |
| R-5 | Spec is not Blocked (S-BLOCKED condition) | blocked |
| R-6 | No lifecycle contradiction (§6.3), no unreadable-file diagnostic on the spec or its sibling plan, no duplicate diagnostic on the spec (PD-019) | such a diagnostic exists |
| R-7 | Inter-spec dependencies | always *not available*; informational, never fails |

*Amended by 0016 (PD-059, proxy): R-6 fails exactly when the entry carries a *Problem* (0016 §6.1).*

- Each precondition is evaluated on its own, so several can fail at once. R-1 to R-6 are
  *pass* or *fail*; only R-7 is *not available*.
- Plan approval is not persisted by FeatherSpec. The explicit start confirmation in 0008
  (PD-002) **is** the plan approval; Ready does not wait for any other approval mark
  (Gregor, 2026-11-16).

*Amended by 0015 (PD-055/PD-056): plan approval stays with the human in the assistant: FeatherSpec's explicit start signal (`/sdd-plan`). Ready still waits for no approval mark.*
- The other diagnostic kinds of 0002 (unknown content or value, dangling link, unverified
  version, orphan) do not fail R-6. Where they matter for readiness, R-1, R-3 or R-4 fails.

*Amended by 0016 (PD-059, proxy): R-6 fails exactly when the entry carries a *Problem*; format notes and compatibility findings never fail it (0016 §6.1).*

### 6.3 Lifecycle contradictions (diagnostics, not states)

A contradictory entry gets its state from §6.1: Done in `done/`, Blocked where S-BLOCKED
applies, otherwise Backlog or Active by its folder (S-FOLDER). It carries a diagnostic naming
the contradiction and is never Ready or Review (PD-021). The list is closed (OP-009):

- Folder against spec status: `active/` with a status other than `In Progress`; `backlog/`
  with a status other than `Draft`; `done/` with a status other than `Implemented`, `Baseline`
  or `Deprecated`. A missing or unknown status counts as "other".
- `active/` without a sibling plan, unless `**Plan:**` links a `plan-archive/` path
  (reactivation before the fresh plan exists — valid, no diagnostic), and unless the spec
  carries an `**Origin:**` line and `**Plan:**` is `_none_` (reactivated Baseline before its
  first plan — valid, no diagnostic; OP-006).
- `done/` + `Implemented` without an archive link in `**Plan:**`. A legacy sibling plan beside
  a `done/` spec (≤ 1.4 layout) is valid and gets no diagnostic.

Not in this list, because 0002 reports them (PD-020): duplicates, orphan plans, dangling
links, unreadable files, unknown values. A duplicated entry — the same stem in two folders, or
one number with two slugs — stays its own entry with its own state and its own card. It is
never Ready (R-6), and nothing picks a canonical copy (PD-019).

### 6.4 Transitions

*Amended by 0017 (PD-060/PD-061): the part "Requested by the board" with its table is void; "Observed from the files" stays.*

**Requested by the board:** a request names an entry and a target state. The model judges it
against the entry's state in the latest snapshot delivered by 0002. Only a request to Active
for a Ready entry is accepted. Acceptance is a verdict returned to the caller (0008): it
changes no state, and the entry stays Ready until the files change (PD-013). Every other
request is refused with a reason (PD-014). The first matching row applies:

*Amended by 0015 (PD-055/PD-056): §6.4: the verdict is returned to the board (0007), which shows the next step; it still changes no state.*

| Reason kind | Request | Reason given |
| --- | --- | --- |
| not observed | the entry is not in the latest snapshot | the spec is no longer observed |
| derived target | to Ready, Review or Blocked | the target state is derived from the files; names its rule ID |
| needs evidence | to Done | Done needs `/sdd-compile` evidence and the `/sdd-lifecycle` move |
| not ready | to Active, entry in state Backlog | the failing readiness preconditions, by ID |
| lifecycle move | any other | Studio does not move specs; lifecycle moves belong to `/sdd-lifecycle` (PD-013) |

Tests assert the reason kind and its parameters (rule ID, precondition IDs), not the wording.
The English texts (PD-016) are written in the plan.

**Observed from the files:** the files are the truth. Every observed change is shown and
recorded. A change not in this list is recorded with the marker *outside the FeatherSpec flow*
(A-002): Backlog ↔ Ready · Backlog/Ready → Active · Active ↔ Review · Review → Done ·
Active → Done · Done → Active (reactivation) · any non-Done state ↔ Blocked · Blocked → Done.
The check compares the old and the new state of one history entry, whatever happened in
between. A change with the changed file paths as cause is *in flow* when a sequence of the
steps above leads from the old to the new state without passing through Blocked as an
intermediate state (collapsed jumps, e.g. Backlog → Review in one `git pull`; same reasoning as
A-003). An entry with cause *changed while Studio was not running* is *not checked* (OP-005).

### 6.5 Status history

*Amended by 0016 (PD-059, proxy): the label of the status history reads as T-15 of 0016; the scope it states is unchanged.*

- **Scope statement (binding):** the history contains only state changes Studio observed while
  it was running. It is not a reconstruction of the spec's past. The history view carries
  this statement as a label (Gregor, 2026-11-16). It is a best-effort observation log (PD-023).
- "Studio is running" means: from the model's first derivation after the extension's
  activation for the project until its deactivation.
- Entry: observed time, spec stem, old state, new state, rule ID, cause, flow marker. The flow
  marker is *in flow*, *outside the FeatherSpec flow* or *not checked*.
- **Last recorded state** of a stem: the new state of its newest entry. A stem has none when
  the history holds no entry for it (first run, pruned, cleared, unreadable store) or when its
  newest entry is *no longer observed* (PD-023).
- Causes:
  - the changed file paths — a state change while Studio is running; flow-checked.
  - *first observed* — an entry appears whose stem has no last recorded state. No old state;
    *not checked*.
  - *changed while Studio was not running* — at the first derivation after activation the
    derived state differs from the last recorded state. One entry, observed at that
    derivation; no intermediate states, no times taken from git or file timestamps;
    flow marker *not checked* (OP-005).
  - *no longer observed* — a stem with a last recorded state is absent from the snapshot, also
    at the first derivation after activation. No new state; *not checked*.
- A stem change is *no longer observed* for the old stem plus *first observed* for the new
  one. A move between lifecycle folders keeps the stem and is an ordinary state change
  (PD-018).
- State changes that happen while the history store is unavailable are not recorded later
  (PD-023). This holds at the first derivation too: when the history cannot be read at that
  moment, the model takes the derived states as its baseline and writes no entry for the gap;
  the stored entries, which may be older, never produce an entry once the store returns
  (revised 2026-11-16 after `/sdd-compile`).
- Only the window that holds the project store's write lock appends entries. Another window
  derives states and reads the history (PD-030).
- A `**Status:**` change that leaves the state unchanged creates no entry (OP-008).
- Stored in Studio's runtime data (0004, A-009), never in the repository. Kept per PD-012 and
  PD-027.

*Amended by 0015 (PD-055/PD-056): kept by the fixed 90-day age cap (0004 BR-008 as amended); there is no Clear.*
- **Duplicated stem** (two or more entries share the stem, PD-019): no entry is appended for
  that stem while it is duplicated. When exactly one entry with the stem remains, its state is
  compared with the stem's last recorded state like a live change (cause: the changed file
  paths), or recorded as *first observed* when the stem has none (OP-007).

### 6.6 Verification status (separate dimension)

- Source: one traceability table. For an entry in `backlog/` or `active/` it is the sibling
  plan's. For an entry in `done/` it is that of the archived plan linked from `**Plan:**`, or
  of a legacy sibling plan where there is no archive link.
- Shown: count of rows per `State` value (`open`, `built`, `verified`; any other value counts
  as *other*), and the summary *not available* (no such plan, linked plan file missing, no
  table, or a table without rows) · *pending* (any row not `verified`) · *all verified*.
- The `/sdd-compile` verdict is shown as *not available*: FeatherSpec does not persist it
  (Gregor, 2026-11-16).
- Spec DoR/DoD checkboxes are never counted (featherspec-format §6).

## 7. Functional requirements

| ID | Requirement | Handoff | Criteria |
| --- | --- | --- | --- |
| FR-01 | Support the six board states | FR-003.1 | AC-001 |
| FR-02 | Map folders and header lines to the model | FR-003.2 | AC-001, AC-012, AC-013, AC-020, AC-021, AC-022, AC-025 |
| FR-03 | Distinguish persisted and derived states | FR-003.3 | AC-002 |
| FR-04 | Validate transitions by defined rules | FR-003.4 | AC-008, AC-009 |
| FR-05 | Determine readiness by explicit preconditions | FR-003.5 | AC-003, AC-004, AC-005 |
| FR-06 | Detect external file changes and the resulting state changes | FR-003.6 | AC-014 |
| FR-07 | Make state changes traceable with time and cause | FR-003.7 | AC-014, AC-015, AC-016, AC-017, AC-023, AC-024, AC-026 |
| FR-08 | Keep spec lifecycle, agent run and verification status apart | FR-003.8 | AC-006, AC-007, AC-018 |
| FR-09 | Reproducible, documented derivation; never change FeatherSpec conventions | no FR; handoff AC-003.7, AC-003.8 | AC-002, AC-010, AC-011 |
| FR-10 | Keep working when individual files are broken or the history store is unavailable | no FR; follows 0002's isolation rule (handoff AC-002.5) and PD-023 | AC-019, AC-024 |
| FR-11 | Name the blocking conditions and the plan in use, so a consumer can show why | handoff §4.2 (reason on the card); needed by 0007 | AC-027, AC-028 |

*Amended by 0017 (PD-060/PD-061): the first half of FR-04 (validating transitions the board requests) and AC-008 are void; AC-009 stays.*

## 8. Data requirements

- **Input** (from 0002, read-only; contract PD-018–PD-020, PD-034): per entry its key
  (project-relative path), stem, number, folder, `**Status:**`, classified `**Plan:**` value,
  body sections as raw text, AC definitions; the plans linked by stem with `**Status:**` and
  traceability rows; the linked return notes with status; diagnostics with scope and kind.
- **Output per entry:** state, rule ID, persisted/derived marker, readiness result (R-1…R-7,
  §6.2), diagnostics (0002's passed on, plus contradictions), verification status, Deprecated
  marker with successor, the blocking conditions that hold for a Blocked entry (which of plan
  status `Blocked` and `BLOCKED` return notes, the notes by file name) and the plan §6.6 uses
  (revised 2026-11-16 for 0007, Gregor).
- **History entry** (stored via 0004): fields in §6.5. Contains no file contents and no
  secrets.

## 9. UI/UX requirements

The rendering belongs to 0007. This model supplies the texts it needs: a state label, a
*derived* label with its rule, readiness reasons, refusal reasons, diagnostic text, and the
history scope statement (§6.5). UI language English (PD-016).

## 10. Interfaces and integrations

- **0002 Spec repository & parser:** snapshot and change notifications (input). It reports
  file facts and parse diagnostics; this model judges lifecycle contradictions (PD-020).
- **0004 Runtime persistence:** stores and loads the status history, keyed by stem, and tells
  whether the store is available and writable in this window (A-009, PD-030).
- **0007 Board / detail, 0006 Mission Control:** read states, reasons, history.
- **0008 Activation:** calls the transition check for Ready → Active and adds the run-start
  preconditions.
- **0011 Orchestrator:** run states are shown next to the spec state, never fed into it.

## 11. Security, permissions and privacy

- Read-only for `.specs/`, `.memory-bank/` and `AGENTS.md` (PD-013).
- History stays local in Studio runtime data, outside the user's repository (PD-003, PD-012).

## 12. Error cases and edge cases

- Unreadable or unparseable spec: the other specs keep their states. The affected spec gets
  its state from §6.1 (Done, Blocked, or by folder), carries the diagnostic and is never Ready
  or Review.
- Unreadable or unparseable sibling plan: its spec is neither Ready nor Review.
- Spec file deleted: history entry *no longer observed*; no card.
- Stem changed (number or slug): *no longer observed* for the old stem plus *first observed*
  for the new one. A move between lifecycle folders keeps the stem (PD-018).
- Duplicates: every file keeps its own card and state; none is Ready (PD-019). A duplicated
  stem gets no history entries until the duplication ends (§6.5).
- A spec reappears after *no longer observed* (branch switch): *first observed* again (§6.5).
- Several changes arriving in one notification: one entry per spec, last recorded → final state.
- History store unavailable, or this window without the write lock: states are still derived
  and shown; no entry is appended. Where the history cannot be read, it is reported as
  *not available* (PD-023, PD-030).
- Request for an entry that is not in the latest snapshot: refused (§6.4).
  *Amended by 0017 (PD-060/PD-061): void: no transition check (0017 §6.5).*

## 13. Acceptance criteria

**AC-001** The lifecycle model shall assign every spec entry delivered by the spec repository
exactly one state out of Backlog, Ready, Active, Review, Done and Blocked, using the rules of
§6.1 in the order S-DONE, S-BLOCKED, S-FOLDER, S-REVIEW, S-ACTIVE, S-READY, S-BACKLOG, first
match wins. *(handoff AC-003.1, PD-021)*

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
Ready. The readiness result shall name every failing precondition by ID; without a sibling
plan these are R-3 and R-4. *(AC-003.3)*

**AC-005** The readiness check shall return a result for each precondition R-1 to R-7: *pass*
or *fail* for R-1 to R-6, *not available* for R-7. Every *fail* and every *not available*
result shall carry a reason. R-7 shall never make the check fail.

**AC-006** While the files of a spec are unchanged, the model shall report the same state for
it whatever run state an agent run of that spec enters, including Completed.
*(AC-003.4, FR-003.8)*

*Amended by 0015 (PD-055/PD-056): void (there are no runs).*

**AC-007** The model shall report Review only for an `active/` spec with status `In Progress`
whose sibling plan is `Done`, and Done only for a spec in `done/`. It shall report such an
`active/` spec as Review, not Done, also when every traceability row is `verified` or a run of
it is Completed. *(AC-003.5)*

*Amended by 0028 (PD-081, D-1): sibling plan `Done` or finished (0028 §6.1: readable, at least one step ticked, every step ticked or struck); the rule ID stays S-REVIEW.*

*Amended by 0015 (PD-055/PD-056): drop "or a run of it is Completed".*

**AC-008** When the board requests a transition (entry and target state), the model shall
accept only a request to Active for an entry that is Ready in the latest snapshot delivered by
the spec repository. It shall refuse every other request with the reason kind of the first
matching §6.4 row and that row's parameters. An accepted request shall change no state.
*(AC-003.6, PD-013, PD-014)*

*Amended by 0017 (PD-060/PD-061): void: no transition check (0017 §6.5).*

**AC-009** If an observed state change with the changed file paths as cause cannot be reached
from its old state by a sequence of in-flow steps of §6.4 that passes through no intermediate
Blocked state, then the model shall show the new state as the files define it and record the
change in the history with the marker *outside the FeatherSpec flow*; a change that can be
reached so shall carry *in flow*. An entry with cause *changed while Studio was not running*
shall carry the marker *not checked*. *(OP-005, Gregor 2026-11-16)*

**AC-010** For identical snapshots — the same files at the same paths with the same contents —
the model shall produce identical states, rule IDs,
readiness results, diagnostics and verification statuses, regardless of the clock, the status
history and agent runs. *(AC-003.7)*

*Amended by 0015 (PD-055/PD-056): drop "and agent runs".*

**AC-011** The model shall not create, modify, move, rename or delete any file under
`.specs/`, `.memory-bank/` or `AGENTS.md`. *(AC-003.8, PD-013)*

**AC-012** If a spec shows a contradiction listed in §6.3, then the model shall derive its
state by §6.1 (Done in `done/`, Blocked where S-BLOCKED applies, otherwise Backlog or Active by
its folder), attach a diagnostic naming the contradiction, and report it neither as Ready nor
as Review. *(PD-021)*

**AC-013** Where a `done/` spec has status `Deprecated`, the model shall report Done with a
*Deprecated* marker and one of: the successor link from the spec, the text
`successor: none — behaviour removed` from the spec, or *successor: not available* where the
spec carries neither. *(PD-022)*

**AC-014** When the spec repository reports a change to a spec, plan or return note, the model
shall re-derive the affected specs. For each spec whose state changed, it shall append one
history entry with observed time, spec stem, old state, new state, rule ID, flow marker and
the changed file paths as cause. *(FR-003.6, FR-003.7)*

**AC-015** When the model derives states for the first time after Studio's activation and a
spec's derived state differs from its last recorded state (§6.5), the model shall append
exactly one entry with cause *changed while Studio was not running* and the time of that
derivation as observed time. It shall not record intermediate states or times taken from git
or file timestamps. This applies only when the history can be read at that derivation (AC-024).

**AC-016** The model shall append history entries only on the occasions named in AC-014,
AC-015, AC-017 and AC-026. The history data shall carry, once, the label "Observed by Studio while it
was running — not a reconstruction" for display.

*Amended by 0016 (PD-059, proxy): the label reads as T-15 of 0016 (`Only changes Studio saw while it was running.`); the scope it states is unchanged.*

**AC-017** When a spec appears whose stem has no last recorded state (§6.5), the model shall
append one entry with cause *first observed*, no old state and the flow marker *not checked*.
When a stem with a last recorded state is absent from the snapshot, the model shall append one
entry with cause *no longer observed*, no new state and the flow marker *not checked*. A stem
change shall produce both entries; a move between lifecycle folders shall produce neither.
*(PD-018, PD-023)*

**AC-018** The model shall provide, per spec, a verification status separate from spec state
and run state. It shall consist of the counts of traceability rows per `State` value from the
source named in §6.6 (`open`, `built`, `verified`, and *other* for any other value) and the
summary *not available*, *pending* or *all verified* as §6.6 defines them. The model shall
report the `/sdd-compile` verdict as *not available*.

*Amended by 0015 (PD-055/PD-056): drop "and run state".*

**AC-019** If a spec file cannot be read or parsed, then the model shall keep deriving the
states of all other specs, and shall derive the affected spec's state by §6.1 (S-DONE,
S-BLOCKED or S-FOLDER) with the diagnostic, never as Ready or Review. If a sibling plan cannot
be read or parsed, the model shall report its spec neither as Ready nor as Review.

**AC-020** While a spec outside `done/` has a sibling plan with status `Blocked`, or a linked
return note with status `BLOCKED` exists, the model shall report Blocked, also when the spec
carries a contradiction or cannot be read. The model shall not derive Blocked from
`activeContext.md` text, from `## Blocker` sections or from a return note with any other
status. *(PD-021)*

**AC-021** The model shall report a `done/` spec with status `Baseline` as Done, without
requiring a plan or a `**Clarified:**` line.

**AC-022** If the spec repository reports a duplicate diagnostic for a spec entry (the same
stem in two folders, or one number with two slugs), then the model shall give every such entry
its own state by §6.1, pass the diagnostic on, and report none of them as Ready. *(PD-019)*

**AC-023** When one change notification covers several changes to a spec, the model shall
append one history entry for that spec, from its last recorded state to its final state.

**AC-024** If the history store cannot be read or written, or this window does not hold the
project store's write lock, then the model shall keep deriving and reporting states and shall
append no entry. It shall not record later a state change that happened while the store was
unavailable: if the store cannot be read at the first derivation after activation, the model
shall take the derived states as its new baseline and append no entry for the gap when the
store returns. If the history cannot be read, the model shall report it as *not available*.
*(PD-023, PD-030)*

**AC-025** The model shall attach no contradiction diagnostic to an `active/` spec without a
sibling plan whose `**Plan:**` line links a `plan-archive/` path, nor to a `done/` spec that
has a legacy sibling plan beside it, nor to an `active/` spec without a sibling plan that
carries an `**Origin:**` line and `**Plan:** _none_` (reactivated Baseline, OP-006).

**AC-026** While two or more spec entries share a stem, the model shall append no history
entry for that stem. When exactly one entry with that stem remains, the model shall compare
its state with the stem's last recorded state and append an entry as AC-014 defines it, or a
*first observed* entry as AC-017 defines it when the stem has no last recorded state.
*(OP-007, Gregor 2026-11-16)*

**AC-027** For an entry in state Blocked, the model shall report which S-BLOCKED conditions
hold: the sibling plan's status `Blocked`, and each linked return note with status `BLOCKED`,
the notes by file name. For an entry in any other state it shall report none. *(0007 AC-024)*

> **Given** an `active/` spec whose sibling plan has status `Blocked` and that has a linked
> return note with status `BLOCKED` **When** the model derives it **Then** it reports both
> conditions, the note by its file name.

**AC-028** For every entry the model shall report the key of the plan that §6.6 uses for its
verification status — the sibling plan, the archived plan its `**Plan:**` line links, or the
legacy sibling plan — also where that plan has no traceability rows, and none where there is no
such plan. *(0007 AC-006)*

Who decides: automated tests over fixture snapshots (fixture set in featherspec-format §11,
including the synthetic `fs110-ready-synthetic` and `fs110-parallel-synthetic`); the test level
per criterion is set in `/sdd-plan`. The Ready shape, `Blocked` plans, return notes and
Deprecated with successor exist only as synthetic fixtures and are flagged UNVERIFIED (OP-002,
PD-022). AC-011 is decided by comparing the fixture tree before and after a derivation, a
transition request and a history append. AC-016 is decided here on the label the model
supplies; showing it is 0007's criterion.

*Amended by 0017 (PD-060/PD-061): AC-011 is decided by comparing the fixture tree before and after a derivation and a history append.*

## 14. Technical notes for developers or AI agents

- Brownfield check (updated by `/sdd-plan`, 2026-11-16): builds on `src/core/specs` (input
  model, 0002) and `src/core/runtime` (history store, 0004). The model lives in the framework-free domain layer and must not import `vscode`
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
| A-001 | *Withdrawn 2026-11-16.* Replaced by PD-019: every duplicate keeps its own card (§6.3, AC-022) | — | — |
| A-002 | The in-flow transition list of §6.4 matches FeatherSpec's flow | Derived from the AGENTS.md *Flow* line, `/sdd-lifecycle` reactivation and the evidence gate (featherspec-format §7) | Legitimate moves get the *outside the flow* marker; marker only, no refusal |
| A-003 | Active → Done in one observation is in-flow | The final step tick and the `done/` move can land in one change notification | Spurious *outside the flow* markers |
| A-004 | `**Clarified:**` is not required for Ready | By rule it appears only on Baselines (`.claude/rules/specs.md`) | Ready shown before `/sdd-clarify` ran |
| A-005 | 0002 delivers every input of §8 plus change notifications that name the affected stems | The contract is fixed by PD-018–PD-020 and PD-034; 0002 is revised under the same decisions | This spec's plan is realigned (`/sdd-plan` Mode C) |
| A-006 | A return note counts as blocking only while the file exists | `parallel-work.md`: notes are deleted once integrated | A stale Blocked state, or a missed one |
| A-007 | Non-binding criteria count as `open` in the verification counts | They are marked only in prose and are not machine-readable (featherspec-format §6), so Studio cannot tell them apart without guessing | *all verified* is never shown for such plans; unavoidable until FeatherSpec marks them |
| A-008 | Proxy decisions PD-002, PD-013, PD-014, PD-015, PD-016 hold | The PD register records them as proxy decisions that follow the handoff's own proposals (P2, §6.3, §6.5); PD-012 is confirmed by PD-027 | Transition rules and UI texts change (§6.4, §9); see OP-003 |
| A-009 | 0004 stores and returns the history entries of §6.5, keyed by stem, and tells whether the store is available and writable in this window | PD-023 (store, keyed by stem), PD-025 (open event type), PD-030 (one writer) | 0004 as written names only run data (OP-010); the history then needs its own storage decision |

## 16. Open points

Open — Gregor decides; the recommendation is not applied:

- OP-003: The proxy decisions PD-002, PD-013, PD-014, PD-015, PD-016 (A-008) await Gregor's
  confirmation. Recommendation: confirm as written; they follow the handoff. A change means
  revising §6.4 and §9.
- OP-008: `Implemented` → `Deprecated` leaves the state Done, so the history gets no entry.
  Recommendation: keep it that way in the MVP; handoff FR-003.7 asks for state changes, and
  the card shows the marker.
- OP-009: Candidates outside the closed §6.3 list: a plan in another lifecycle folder than its
  spec, a `backlog/` spec whose plan is `In Progress` or `Done`, a sibling plan with a dated
  twin in the archive outside a reactivation (featherspec-format §5.2). Recommendation: keep
  the list closed in the MVP; R-3 or R-4 already keeps such specs from being Ready.
- OP-010 (cross-spec, main session): 0007 §12 still cites the withdrawn A-001 ("one card").
  The 0004 part is resolved (below).

Verification still owed:

- OP-002: No real sample shows the Ready shape. Its basis is the `/sdd-plan` command text: the
  plan is written with `**Status:** Not started`, linked from `**Plan:**`, and the pair stays
  in `backlog/` until the start signal. The synthetic fixture stays flagged UNVERIFIED. The
  same holds for the Deprecated successor (PD-022); recommendation for its fixture: a line
  that starts with `successor:`, followed by a link or `none — behaviour removed`.

Resolved:

- OP-001 (2026-11-16): A-001 withdrawn; duplicates per PD-019.
- OP-004 (2026-11-16): interview questions 2–6 were asked in one message at Gregor's explicit
  request, a one-off exception to `/sdd-specify`'s one-question rule.
- OP-011 (2026-11-16): `/sdd-clarify` listed 42 findings, 8 blocking. Gregor decided the
  blocking ones in the PD register and delegated the rest; the walkthrough ran in bulk at his
  explicit request, a one-off exception to the one-finding-per-message rule. Resolved 38:
  - PD-021: Blocked wins over placement by folder; `done/` is always Done; a missing or
    unknown status is a contradiction.
  - PD-018: identity is the entry, history keyed by stem, stem change = removed + new.
  - PD-019: duplicates, also one number with two slugs.
  - PD-020: diagnostics ownership; orphan plans and dangling links are 0002's; kinds failing R-6.
  - PD-022: Deprecated successor. PD-023, PD-030: history baseline, store outage, second window.
  - One reading each: terms defined (§6, §6.4); AC-004 to AC-008, AC-010, AC-016, AC-018 made
    decidable; AC-023 to AC-025 added for rules without a criterion; "Who decides", A-005,
    A-007, the custom-states scope entry and the FR-09/FR-10 sources corrected.

  Parked 4: OP-003, OP-005, OP-006, OP-008.
- OP-005 (2026-11-16, Gregor at the `/sdd-plan` checkpoint): recommendation applied — §6.4,
  §6.5 and AC-009. Refinement written by `/sdd-plan`: a chain may not pass through Blocked as
  an intermediate state; otherwise every state reaches every other via Blocked and the marker
  could never appear.
- OP-006 (2026-11-16, Gregor): recommendation applied — §6.3 and AC-025.
- OP-007 (2026-11-16, Gregor): recommendation applied — §6.5, §12 and new AC-026; when the
  duplication ends the remaining entry is compared like a live change.
- OP-010, 0004 part (2026-11-16, `/sdd-plan` survey): 0004 is built with
  `RuntimeStore.appendSpecStatusEntry` / `readSpecStatusHistory` (`src/core/runtime/runtimeStore.ts`),
  refusing writes when read-only or unavailable; A-009 holds.

## 17. Definition of Ready

Goal and problem, users, scope and out-of-scope are documented. The derivation, readiness and
transition rules are testable. The happy path and the error cases are described. The criteria
are measurable. Data and constraints are clarified or recorded as assumptions, and the open
points are visible.

## 18. Definition of Done

All must-requirements are built and AC-001 to AC-028 pass in automated tests over the fixture
set.
No out-of-scope behaviour was added, in particular no file writes. Assumptions are verified or
documented. The architecture snapshot is updated for the new domain module. Gregor accepted
the result.

## 19. Recommended next steps

1. Gregor: OP-003, OP-008, OP-009 (the plan follows the spec as written).
2. Gregor reads the plan [0003-spec-lifecycle-readiness-model.2026-11-17.plan.md](../plan-archive/0003-spec-lifecycle-readiness-model.2026-11-17.plan.md);
   the main session aligns 0007 §12 (OP-010).

## Plan history

- 2026-11-17 — [0003-spec-lifecycle-readiness-model.2026-11-17.plan.md](../plan-archive/0003-spec-lifecycle-readiness-model.2026-11-17.plan.md) — T-001…T-010 built; second `/sdd-compile` READY; host suite 28 passing at e6f0c85 (Windows 11) and CI green at 9635ba4.
