# Mission Control Dashboard

**Status:** Implemented
**Plan:** [0006-mission-control-dashboard.2026-11-17.plan.md](../plan-archive/0006-mission-control-dashboard.2026-11-17.plan.md)

*Amended by 0015 (PD-055/PD-056): every other statement, requirement, criterion, term, assumption or open point of this spec about agent runs, run events, providers, approvals, the Agent Center, the start workflow, the Clear command or specs 0008–0012 is void; a sentence that also says something else keeps that part. The notes below name what changes in meaning or needs a replacement; see [0015](0015-focus-on-visibility.md) §5.*

Handoff reference: FS-006 ([po-handoff.md](../../docs/product/po-handoff.md) §4.1, §10 FS-006,
§13, §18). Depends on: 0002 (spec entries, diagnostics), 0003 (states, readiness, status
history), 0004 (runs, run statuses, store state), 0005 (shell, panel-level states, navigation
request, theme). Drill-down targets: 0007 (board with a filter, spec detail in Spec Explorer),
0012 (run in the Agent Center). Decisions:
[product-decisions.md](../../docs/product/product-decisions.md), above all PD-024, PD-036,
PD-040, PD-041, PD-046 and PD-047.

## 1. Summary

*Amended by 0015 (PD-055/PD-056): the run bullet is void.*

Mission Control is the area the Studio panel shows on its first open. It shows the state of the
active project at a glance:
- how many specs exist and how they spread over the six lifecycle states;
- one documented progress figure;
- the open agent runs, counted apart from the specs, and the failed or interrupted latest runs;
- the specs that need the developer's attention, with the reason;
- the last ten relevant activities.

Each count, row and entry named in BR-08 leads to a detail view. The dashboard is read-only and
shows missing data as "not available", never as an estimate.

## 2. Goal and problem

A developer who opens Studio today must read Markdown files and run history to learn what is
going on. The goal: within a few seconds of opening Studio, the developer knows what is
happening in the project and where to act. The user story: "As a developer I want to
understand at once, when I open Studio, what is happening in my project and where attention
is needed." Success shows in the §18 KPI *Time to Project Overview*. Measuring that KPI is out
of scope here.

## 3. Users and roles

- **Developer** (primary, per `projectbrief.md`): opens Studio and reads the dashboard. One
  role, with no permission differences, because the dashboard has no actions.
- Secondary users (tech lead, product owner) read the same view. They have no extra rights.

## 4. Scope

### In scope

- A project header with the folder name, FeatherSpec version, the time of the last model
  update (spec read or run change, AC-017) and the count of project-level diagnostics (it opens the Spec Board, BR-08).
- Spec counts: the total and one count per state (Backlog, Ready, Active, Review, Done,
  Blocked), with Deprecated shown inside Done and the derived states labelled (BR-02).
- One progress figure with its formula shown (BR-04).
- Run section: the *Running* figure (BR-05) and the list of highlighted runs (BR-06).
- The *Needs attention* list, with the reasons per spec (BR-01).
- *Recent activity*: the last 10 entries (BR-07).
- Drill-down from the elements of BR-08.
- Live updates on file and run changes.
- The in-area states: zero specs, runtime data not available (PD-036).

### Out of scope

- The §18 KPIs (Time to Project Overview, Completion Rate, …) — because they are measured
  after the MVP and each needs its own calculation definition first.
- Trend charts or figures over time — because the MVP shows the current state only (P7), and
  the status history covers only what Studio observed (0003 §6.5).
- Progress based on tasks or acceptance criteria — because Gregor chose one spec-based figure
  for the first version (Q2); verification counts stay with 0003 and 0007.
- Actions on the dashboard (start, cancel or resume an agent, move a spec) — because they
  belong to the board (0007, 0008) and the Agent Center (0012).
- Totals across several projects — because the MVP has one active project (0001).
- Configurable or rearrangeable widgets — because they are not needed for the first feedback
  loop.
- Readiness failures of Backlog specs as attention items — because almost every new spec would
  show up (Gregor, Q1). This narrows the handoff's "missing prerequisites" (FR-006.5); the
  board shows readiness per card (0007).
- Single tool, message or file events in *Recent activity* — because they belong to live
  monitoring (0012).
- Writing any file in the repository — because Studio is read-only for FeatherSpec artifacts
  (PD-013).
- Panel-level states and their texts (no folder, no project, project not found, incomplete
  project, several projects, loading, load error, reload needed, the Restricted Mode note) —
  because the shell owns them (0005, PD-036).
- A "recovery pending" figure — because no such run state exists (PD-024).
- What the board, Spec Explorer and the Agent Center show after a drill-down — because 0007
  and 0012 prove that; this spec proves the request it sends (PD-046).

## 5. Functional flow

1. The developer opens Studio. On the first open in a workspace the panel shows Mission
   Control; later it shows the area shown last (0005 BR-02).
2. While a panel-level state applies (loading, no project, load error, …), the shell shows it
   and the dashboard is not shown (PD-036).
3. The dashboard shows the header, spec counts, progress, run section, *Needs attention* and
   *Recent activity* of the active project.
4. The developer activates a count, row or entry. The dashboard sends the shell one navigation
   request (BR-08).
5. A spec, plan or return note changes on disk, or a run is created, changes status or is
   removed. The dashboard content updates in place; the developer reloads nothing.

## 6. Business rules

Decisions marked "(Gregor, Qn)" come from the specify interview of 2026-11-16 (OP-11).

Terms used below:

- **Spec / entry:** one spec file (PD-018). Counts count entries. A run and a status-history
  entry name their spec by its **stem** `NNNN-slug`; "its spec" is the current entry with that
  stem. While a stem is duplicated (PD-019) they belong to every entry with that stem.
- **State counts:** the total and the six per-state counts. **Figures:** the state counts,
  progress and the *Running* figure. **Dashboard content:** the figures, the header values, the
  highlighted runs, the attention list and the activity list.
- ***Running* figure:** a count on the dashboard (BR-05). `Running`, written as code, is one of
  the eight run statuses of 0004 BR-001 (PD-025): open states `Starting`, `Running`,
  `WaitingForApproval`, `WaitingForInput`; end states `Completed`, `Failed`, `Cancelled`,
  `Interrupted`.
- **Latest run of a spec:** among the runs the store returns for that stem, the one with the
  newest created timestamp (0004 §8).
- **Store:** the runtime store of 0004. It is *unavailable* when 0004 reports that state
  (0004 AC-025); *writable* and *read-only* both count as available.
- **Project-level diagnostic:** a diagnostic of 0002 or 0003 that is attached to no spec entry
  — its scope is the project, or a file linked to no spec, such as an orphan plan (0002 §8,
  0007 §13).

Rules:

- **BR-01 Needs attention** (Gregor, Q1). A spec needs attention when at least one reason
  applies. Each spec is listed once, with every reason that applies:
  - (a) **Blocked**: its state is Blocked (0003 S-BLOCKED).
  - (b) **Run failed / Run interrupted**: its latest run is highlighted by BR-06.
  - (c) **Waiting for you**: one of its runs is in `WaitingForApproval` or `WaitingForInput`.
  - (d) **Diagnostic**: it carries a lifecycle-contradiction diagnostic (0003 §6.3) or an
    unreadable-file diagnostic on the spec file (0002 §8, 0003 AC-019). No other diagnostic
    kind counts (the kind *unknown content or value* in particular; the other kinds: OP-5).
  - (e) **Review pending**: its state is Review.

*Amended by 0015 (PD-055/PD-056): (b) and (c) are void: Needs attention has the reasons Blocked, Diagnostic and Review pending.*

  The rows are ordered by ascending spec number (then by path), the reasons of a row in the
  order (a) to (e) (OP-10); the list has no cap. A Backlog spec to which none of (a) to (e)
  applies is not listed, whatever its readiness result. The handoff's "pending reviews" (FR-006.5) is reason (e).
  Rows exist only for current entries: a run whose stem matches no current entry never creates
  a row (PD-046).
- **BR-02 Spec counts.** Every spec entry delivered by 0003 is counted in exactly the one state
  0003 assigns. The state counts add up to the total. An entry with 0003's *Deprecated* marker
  (0003 AC-013) counts as Done, and the Done figure shows "of which Deprecated: n". The Ready,
  Review and Blocked counts carry the label "derived" and their rule ID (PD-004).
- **BR-03 Separate dimensions.** Run data comes from the store (0004) only and never changes a
  state count. A spec state change never changes the *Running* figure (0003 AC-006). The
  attention count and the highlighted runs are not state counts; they follow BR-01 and BR-06.

*Amended by 0015 (PD-055/PD-056): void (no run data).*
- **BR-04 Progress** (Gregor, Q2). Progress = number of Done specs with status `Implemented` or
  `Baseline` ÷ (total specs − specs with the *Deprecated* marker), shown as a whole percentage,
  rounded down, together with both numbers and the formula text. A `done/` entry with any other
  status (a contradiction, PD-021) counts in the divisor only. When the divisor is 0, progress
  is "not available".
- **BR-05 Running** (Gregor, Q3). The *Running* figure counts the runs of the active project
  whose current status is an open state. There is no "recovery pending" figure (PD-024): a run
  left open by an earlier session arrives as `Interrupted` (0004 BR-004) and falls under BR-06.
  A run whose stem matches no current entry is counted like any other (PD-046). A run whose
  history 0004 reports as unreadable (`historyUnreadable`) is not counted, is never the latest
  run of a stem, and the run section says "<n> run(s) unreadable" (OP-6).

*Amended by 0015 (PD-055/PD-056): void.*
- **BR-06 Highlighted runs** (Gregor, Q3). A run is highlighted while its current status is
  `Failed` or `Interrupted` and it is the latest run of its spec. The highlight ends when a
  newer run of the same stem is created, when the spec is Done, or when the run is removed from
  the store (0004 BR-008). `Cancelled` runs are never highlighted. The highlighted runs are
  listed in the run section, one row each, newest status first (OP-10; no cap): spec number and
  title, and the status as text. A
  highlighted run whose stem matches no current entry is listed with its recorded stem and
  "spec not found" (PD-046).

*Amended by 0015 (PD-055/PD-056): void.*
- **BR-07 Recent activity** (Gregor, Q4; PD-046). The 10 newest entries, newest first, merged
  from:
  - spec status history entries (0003 §6.5) that have an old and a new state — changes observed
    while Studio was running, and *changed while Studio was not running* — and entries with the
    cause *no longer observed*. Entries with the cause *first observed* are never shown.
  - run status history entries (0004) with the status `Starting`, `WaitingForApproval`,
    `WaitingForInput`, `Completed`, `Failed`, `Cancelled` or `Interrupted`. A change to
    `Running` is not shown.

*Amended by 0015 (PD-055/PD-056): Recent activity takes the spec status history entries only.*

  The order uses the observed time of a spec entry and the status timestamp of a run entry.
  Entries with the same time: spec entries before run entries, then ascending spec number
  (A-005). Each entry shows its time, spec number and title, and the change: old and new state,
  "no longer observed", or the new run status; *changed while Studio was not running* is named.
  An entry whose stem matches no current entry shows the recorded stem and "spec not found" in
  place of number and title. The list has no paging.
- **BR-08 Drill-down** (Gregor, Q5; PD-040). Activating an element sends the shell one
  navigation request: an area plus an optional target. The dashboard opens no area itself.

*Amended by 0015 (PD-055/PD-056): the rows for the Running figure and the highlighted run are void.*

  | Element | Request |
  | --- | --- |
  | Total | Spec Board, no target |
  | A state count | Spec Board, filter: that state |
  | *Needs attention* heading or count | Spec Board, filter: the named spec set "Needs attention" with the stems of exactly the listed specs (PD-041) |
  | An attention row | Spec Explorer, that spec (PD-039, PD-042) |
  | The *Running* figure | Agent Center — with the run as target while exactly one run is counted (PD-005), without a target otherwise |
  | A highlighted run | Agent Center, that run (ID) |
  | An activity entry | Spec Explorer, its spec. If its stem matches no current entry: no request, and the notice "Spec <number> is no longer in the project" (PD-039) |
  | Diagnostics count in the header | Spec Board, filter: the named spec set "Diagnostics" with the stems of the specs that carry at least one diagnostic (OP-4; the board's banner shows the project-level ones, 0007 §13) |

  A figure that reads 0 sends its request like any other count; a value shown as "not
  available" is plain text and cannot be activated (OP-9). Progress, the Deprecated sub-count
  and the other header values have no drill-down. What the
  target area shows, the visible and clearable filter included, belongs to 0007 and 0012
  (PD-041, PD-046). Until a target area exists the request ends on its placeholder (PD-040).
- **BR-09 Honest status** (P8). A value whose source does not deliver it is shown as below,
  never as 0, an empty list, an estimate, a default or a value from another source.

*Amended by 0015 (PD-055/PD-056): the run values of the second row and the sentence after the table are void; the second row keeps Recent activity.*

  | Value | Missing when | Shown |
  | --- | --- | --- |
  | Progress | the divisor is 0 | "not available" |
  | *Running* figure, highlighted runs, attention reasons (b) and (c), *Recent activity* | the store is unavailable, or 0003 reports the status history as not available (0003 AC-024) | "not available" with the reason the source gives (PD-046) |
  | Spec title | the spec has no title (0002 AC-019) | "not available" |
  | FeatherSpec version | legacy project or empty value | "unknown", as 0001 reports it (PD-031, PD-032) |

  While attention reasons (b) and (c) are not available, the list still shows the specs with
  reasons (a), (d) and (e), plus one line saying that run-based reasons are not available.

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-001 (FR-006.1) | Total and per-state spec counts | AC-001, AC-002, AC-025 |
| FR-002 (FR-006.2) | Progress only by the documented rule | AC-003, AC-004 |
| FR-003 (FR-006.3) | Open runs, counted apart from specs | AC-005, AC-006 |
| FR-004 (FR-006.4) | Make failed and interrupted runs and blocked specs stand out | AC-007, AC-008, AC-009 |
| FR-005 (FR-006.5) | Pending reviews as an attention reason; "missing prerequisites" narrowed by BR-01 | AC-008 |
| FR-006 (FR-006.6) | Recent activity | AC-010, AC-011 |
| FR-007 (FR-006.7) | Drill-down by navigation request | AC-012, AC-013, AC-014 |
| FR-008 (FR-006.8) | Live update on file and run changes | AC-015, AC-016 |
| FR-009 (§4.1) | Visible project context | AC-017 |
| FR-010 (§13) | Zero-spec state; honest missing data | AC-018, AC-019, AC-020, AC-027, AC-028, AC-029 |
| FR-011 (§13) | Accessibility, read-only, no sensitive run data | AC-021, AC-022, AC-023, AC-026 |
| FR-012 (§13) | Display time | AC-024 |

## 8. Data requirements

All inputs are read and none are stored by this feature:
- spec entries with stem, number and title, and diagnostics with scope and kind (0002);
- states, rule IDs, *Deprecated* marker and status history (0003);
- runs with stem, status, timestamps and status history, and the store state with its reason
  (0004);
- the active project's folder name and version (0001, delivered with 0002's project read).

The dashboard content is a projection computed from these inputs. It is never persisted. No
sensitive fields: run error messages, prompts and provider payloads are not shown (AC-026).

## 9. UI/UX requirements

*Amended by 0015 (PD-055/PD-056): the layout's run section and the in-area row "no runs stored" are void.*

- Layout, top to bottom (guidance; Gregor checks it in the hands-on run):
  - header;
  - spec counts and progress;
  - run section: *Running* figure, highlighted runs;
  - *Needs attention*;
  - *Recent activity*.

  Revised 2026-11-17: spec 0013 §3.2 replaces this guidance — *Needs attention* follows the
  spec counts, and the run section and *Recent activity* sit side by side below it. Checked
  by Gregor's delegate on the screenshots `01-mission-control-{light,dark,hc}` (2026-11-17);
  the look in a real VS Code window is a pre-release checklist item (Gregor's delegation,
  2026-11-17).
- Every state, reason and highlighted-run status carries a text label. Colour is never the only
  carrier.
- Every drill-down element is reachable with Tab, shows a visible focus and is activated with
  Enter or Space.
- Theme and panel-level states follow the shell (0005, ADR-001 §3, PD-036).
- Times are shown as date and time in the developer's local time zone, as `YYYY-MM-DD HH:mm`
  (reading p5).
- In-area states (PD-036). An empty list keeps its heading and says that it is empty; the
  wording (English, PD-016) is set in the plan.

  | Condition | Shown |
  | --- | --- |
  | zero specs | "No specs yet", with a pointer to `/sdd-specify`; the header, the run section and *Recent activity* stay, spec counts, progress and *Needs attention* are replaced by the message (OP-8) |
  | store unavailable | BR-09 |
  | no runs stored | *Running* 0, no highlighted runs, *Recent activity* from the spec status history only |
  | Restricted Mode | the same dashboard content as in a trusted workspace; the note is the shell's (0005 S7) |

## 10. Interfaces and integrations

Studio-internal only. The dashboard sends the shell (0005) the navigation requests of BR-08
(PD-040). No provider, network or external
system is involved.

## 11. Security, permissions and privacy

The dashboard is read-only. It creates, changes or deletes no file (PD-013). It shows no run
error text, prompts or provider payloads (AC-026). It sends no telemetry (handoff §13 Privacy).

## 12. Non-functional requirements

- Display time: the whole dashboard content of a 200-spec project within 1 second (Gregor, Q7;
  a working threshold like PD-035) — AC-024, OP-12.
- Update time: 500 ms after the dashboard receives a notification (PD-047) — AC-016. The
  model's own budget is 0002's (PD-035).
- Events that are not run status changes cause no dashboard update (AC-011), so an event stream
  cannot hold it up (handoff §13 Performance). Several file changes arrive as one model
  notification (0002 AC-012); the dashboard updates once per notification.
- The time from opening Studio to the dashboard is the sum of the shell's frame budget (0005
  AC-024), the project read (0002 AC-018) and AC-024. No criterion bounds the sum (OP-2).

## 13. Error cases and edge cases

*Amended by 0015 (PD-055/PD-056): the run cases are void.*

- A spec file can't be read: the spec counts in the state 0003 gives it, with a diagnostic and
  attention reason (d) (0003 AC-019).
- A run's stem matches no current entry (renamed or deleted, PD-011): the run counts in the
  *Running* figure, and is listed among the highlighted runs and in *Recent activity* with its
  recorded stem and "spec not found". It never becomes an attention row (PD-046).
- The store is unavailable: BR-09 (PD-046). The spec figures are unaffected.
- A second window on the same project (reader, PD-030): the dashboard shows what the store
  returns there; it has no actions that could be refused. Live updates there: OP-7.
- A run or history entries are removed (age cap, "Clear Run History"; 0004 BR-008): the
  dashboard shows what the store still holds; a removed run is no longer highlighted.
- The store holds the same status change twice: it appears twice. Which changes are allowed is
  0011's rule (PD-025); provider events are de-duplicated by 0004 and never shown here.
- The active project changes: the dashboard shows the new project's content. A project that
  disappears or fails to load is a panel-level state of the shell (PD-036 to PD-038).
- Two activity entries have the same time: BR-07.
- More than 10 activities: only the newest 10 are shown, with no paging.
- A spec is both Blocked and has a failed latest run: one attention row, both reasons.
- One run reported "history unreadable" by 0004: OP-6.

## 14. Acceptance criteria

- **AC-001** The system shall count every spec entry of the active project in exactly the one
  state the lifecycle model (0003) assigns to it, and the six state counts shall add up to the
  shown total. *(AC-006.1)*
  > **Given** a fixture with 2 Backlog, 1 Ready, 1 Active, 1 Review, 3 Done (one of them
  > Deprecated) and 1 Blocked spec **When** the dashboard is shown **Then** the total reads 9,
  > and Done reads 3 with "of which Deprecated: 1".
- **AC-002** Where a Done spec has status `Deprecated`, the system shall count it in Done and
  show the number of Deprecated specs beside the Done count.
- **AC-003** The system shall show progress as ⌊100 × Done(`Implemented`, `Baseline`) ÷ (total
  − Deprecated)⌋ %, together with both numbers and the formula text. *(AC-006.7)*
  > **Given** the AC-001 fixture **When** progress is shown **Then** it reads 25 % (2 of 8),
  > with the formula.
- **AC-004** If total − Deprecated is 0, then the system shall show progress as "not
  available" and no percentage.
- **AC-005** The system shall show as the *Running* figure the number of runs of the active
  project whose current status is `Starting`, `Running`, `WaitingForApproval` or
  `WaitingForInput`, runs whose stem matches no current spec included. *(FR-006.3, PD-024,
  PD-046)*
  > **Given** stored runs in `WaitingForInput`, `Interrupted` and `Completed` **When** the
  > dashboard is shown **Then** *Running* reads 1.

*Amended by 0015 (PD-055/PD-056): void.*
- **AC-006** When a run is created, changes status or is removed, the system shall leave the
  total and every state count unchanged. When a spec's state changes, the system shall leave
  the *Running* figure unchanged. *(AC-006.2)*

*Amended by 0015 (PD-055/PD-056): void.*
- **AC-007** While a run's current status is `Failed` or `Interrupted`, it is the latest run of
  its spec and that spec is not Done, the system shall list it among the highlighted runs with
  the spec's number and title and its status as text. When a newer run of the same stem is
  created, the spec becomes Done or the run is removed from the store, the system shall remove
  it from that list. If the run's stem matches no current spec, then the system shall list it
  with the recorded stem and "spec not found". The system shall never list a `Cancelled` run
  there. *(AC-006.3, PD-046)*

*Amended by 0015 (PD-055/PD-056): void.*
- **AC-008** The system shall list in *Needs attention* exactly the specs of the active project
  that meet at least one reason (a) to (e) of BR-01, each once, with every applying reason as
  text. It shall create no row for a run whose stem matches no current spec. *(AC-006.3,
  FR-006.5, PD-046)*
  > **Given** a Backlog spec without a plan and a Review spec **When** the dashboard is shown
  > **Then** only the Review spec is listed, with the reason "Review pending".

*Amended by 0015 (PD-055/PD-056): drop the run parts.*
- **AC-009** The system shall not count a diagnostic of the kind *unknown content or value*
  (0002 §8) as attention reason (d).
- **AC-010** The system shall show in *Recent activity* the 10 newest entries of BR-07 — all of
  them while fewer than 10 exist — newest first, with ties in the order of BR-07. It shall take
  them only from the spec status history and the run status history as BR-07 selects them, and
  shall show no entry with the cause *first observed*. Each entry shall show its time, spec
  number, spec title and the change. The system shall offer no control that shows more
  entries. *(FR-006.6, PD-046)*

*Amended by 0015 (PD-055/PD-056): Recent activity takes the spec status history entries only.*
- **AC-011** The system shall not show tool, message, file-change or usage events, nor any
  other event that is not a run status change, in *Recent activity*.

*Amended by 0015 (PD-055/PD-056): void.*
- **AC-012** When the developer activates the total, a state count (a count of 0 included) or
  the *Needs attention* heading or count, the system shall send the shell one navigation request for the Spec Board:
  without a target for the total; with that state as filter for a state count; with the named
  spec set "Needs attention", holding the stems of exactly the listed specs, for *Needs
  attention*. *(AC-006.4, PD-040, PD-041, PD-046)*
- **AC-013** When the developer activates a highlighted run, the system shall send the shell
  one navigation request for the Agent Center with that run's ID as target. When the developer
  activates the *Running* figure, the system shall send one request for the Agent Center, with
  the run's ID as target while exactly one run is counted and without a target otherwise.
  *(AC-006.4, PD-040)*

*Amended by 0015 (PD-055/PD-056): void.*
- **AC-014** When the developer activates an attention row, or an activity entry whose stem
  matches a current spec, the system shall send the shell one navigation request for Spec
  Explorer with that spec as target. If the stem of an activated activity entry matches no
  current spec, then the system shall send no request and show the notice "Spec <number> is no
  longer in the project". *(PD-039, PD-042)*
- **AC-015** When a spec, plan or return note of the active project changes on disk, when a run
  of the active project is created, changes status or is removed, or when the store's state
  changes, the system shall show the resulting figures, highlighted runs, attention rows and
  activity entries without the developer reloading or reopening the panel. *(AC-006.5)*

*Amended by 0015 (PD-055/PD-056): drop the run parts.*
- **AC-016** When the dashboard receives a model-changed or run-change notification, the system
  shall show the updated dashboard content within 500 ms. *(PD-047)*

*Amended by 0015 (PD-055/PD-056): the model-changed notification only.*
- **AC-017** While the dashboard is shown, the system shall show the active project's folder
  name, its FeatherSpec version as 0001 reports it ("unknown" included), the time of the last
  update of what the dashboard shows and the number of project-level diagnostics. That time
  is the later of the last spec read and the last run change the dashboard processed; opening
  the panel does not change it, so a model read at 10:00 shows 10:00 in a panel opened at
  11:00. When the developer
  activates that number, the system shall send the shell one navigation request for the Spec
  Board with the named spec set "Diagnostics", holding the stems of the specs that carry at
  least one diagnostic.

*Amended by 0015 (PD-055/PD-056): the time is the last spec read the dashboard processed.*
- **AC-018** If the store is unavailable, then the system shall show the *Running* figure, the
  highlighted runs, the attention reasons (b) and (c) and *Recent activity* as "not available"
  with the store's reason, never as 0 or as an empty list. It shall show the total, the state
  counts, progress and the attention reasons (a), (d) and (e) exactly as it does with an
  available store. *(AC-006.6, PD-046)*

*Amended by 0015 (PD-055/PD-056): when the spec status history is not available, Recent activity shows "not available" with the reason and everything else is unchanged.*
- **AC-019** If the source of a value named in the BR-09 table does not deliver it, then the
  system shall show that value as the table says, and shall not replace it with an estimate, a
  default or a value from another source. *(AC-006.6)*
- **AC-020** If the active project has zero specs, then the system shall show "No specs yet"
  with a pointer to `/sdd-specify`. *(PD-036; the panel-level states are 0005's)*
- **AC-021** The system shall show every state, attention reason and highlighted-run status as
  text, with colour only in addition.

*Amended by 0015 (PD-055/PD-056): drop the run parts.*
- **AC-022** The system shall make every drill-down element of BR-08 reachable with the Tab
  key, show a visible focus on it, and activate it with Enter or Space. *(0005 AC-022)*
- **AC-023** The system shall create, modify, move or delete no file in the workspace while
  showing or updating the dashboard. While the workspace is in Restricted Mode, it shall show
  the same dashboard content as in a trusted workspace.
- **AC-024** While the project holds up to 200 specs (test fixture: 5 runs per spec and 1,000
  history entries), the system shall show the whole dashboard
  content within 1 second after the dashboard receives the project model. *(Working threshold,
  OP-12)*

*Amended by 0015 (PD-055/PD-056): fixture without runs.*
- **AC-025** The system shall show the label "derived" and the rule ID (S-READY, S-REVIEW,
  S-BLOCKED) with the Ready, Review and Blocked counts. *(PD-004)*
- **AC-026** The system shall show no run error message, prompt or provider payload anywhere on
  the dashboard.

*Amended by 0015 (PD-055/PD-056): void.*
- **AC-027** (OP-6) The system shall not count a run with unreadable history in the *Running*
  figure, shall not treat it as the latest run of its stem, and shall show "<n> run(s)
  unreadable" in the run section.
  > **Given** one run with unreadable history and one `Running` run **When** the dashboard is
  > shown **Then** *Running* reads 1 and the run section says "1 run unreadable".

*Amended by 0015 (PD-055/PD-056): void.*
- **AC-028** (OP-8) If the active project has zero specs, then the system shall keep the header,
  the run section and *Recent activity* and replace the spec counts, progress and *Needs
  attention* by the message of AC-020.

*Amended by 0015 (PD-055/PD-056): drop the run parts.*
- **AC-029** (OP-9) The system shall send its request when the developer activates a figure that
  reads 0, and shall show a value that is "not available" as plain text with no control.

Who decides: automated tests decide AC-001 to AC-020, AC-022 to AC-029; AC-021 is decided
by an automated test and by Gregor. The test level per criterion is set in `/sdd-plan`, with
three fixed points:
- AC-012 to AC-014 are decided by the navigation request the dashboard sends (PD-046);
- AC-016 is decided by a component test (PD-047), AC-024 by a timing test on a generated
  200-spec fixture;
- AC-015 is decided by one integration test in the extension.

Gregor accepts the whole dashboard by hand in the hands-on run against a fixture project
(Q9), including AC-021 in a high-contrast theme and the §9 layout. Until 0007 and 0012 exist,
a drill-down ends on the target area's placeholder; that is accepted (PD-040, PD-046).

Revised 2026-11-17 (Gregor delegated the closing checks, 2026-11-17): AC-021 and the §9 layout
are checked by Gregor or his delegate — the delegate checked the screenshots
`01-mission-control-{light,dark,hc}` (headless Chrome with the real core, 2026-11-17 01:43);
every state, reason and run status is text, colour and icon come in addition. AC-022 is
decided by component and CSS tests (native buttons, emulated Enter and Space, the shared
focus outline). What only a real VS Code window can show — the whole dashboard in a real
High Contrast theme, real Enter and Space with a visible focus, and the OP-12 re-measurement
on a real project — is a pre-release checklist item for Gregor.

## 15. Technical notes for developers or AI agents

- As-is (2026-11-16, after 0001 to 0005 and 0007 were built): the shell (`src/core/shell`,
  `src/webview`, `src/shared/protocol`), the board (`src/core/board`), the lifecycle model with
  its status history, the runtime store with its run-change notification
  (`RuntimeStore.onDidChangeRuns`, spec 0004 AC-030) and the board filter
  (`src/shared/protocol/boardFilter.ts`: `{ states?, providers?, set? }` with a named set) exist.
  The dashboard reuses them; it builds no second run notification and no second filter shape.
- Suggested shape (decided in `/sdd-plan`):
  - a pure projection in `src/core/` (no `vscode` import) computes the dashboard view model
    from 0003 states and history, 0004 runs and store state, and 0001 project data;
  - the host pushes it through the typed protocol: snapshot, then `evt` with `seq`
    (ADR-001 §6);
  - the webview only renders it and sends navigation requests;
  - no `retainContextWhenHidden`: after a panel reload the host rebuilds the model
    (ADR-001 §7).
- The navigation request (area plus optional target: spec stem, run ID, or board filter by
  state or named spec set) is the shell's, PD-040 and PD-041. Its encoding lives in the shared
  protocol and is shared with 0005, 0007 and 0012.
- Clocks: AC-016 starts when the webview receives the `evt`, AC-024 when it receives the
  snapshot; both end when the content is rendered.
- Tests: Vitest for core and webview (component tests in jsdom), Mocha only for the host
  integration test (ADR-001 §12). Runs for tests are written through the 0004 store port with
  the provider ID `fake`; no provider adapter is needed. Use AC IDs in test names.
- Quality gates: `.memory-bank/techContext.md`.

## 16. Assumptions

| ID | What we assume | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | *Withdrawn 2026-11-16:* the clock start is now part of AC-024 (OP-3 reading f) | — | — |
| A-002 | *Withdrawn 2026-11-16:* decided by PD-046 — the drill-down criteria are proven by the request sent | — | — |
| A-003 | *Withdrawn 2026-11-16:* "latest run" is a defined term in §6, based on 0004 §8 (created timestamp) | — | — |
| A-004 | The *Running* figure stays at 0 and no run is highlighted in Phase 1, until 0011 creates runs; tests write runs through the 0004 store | Handoff §16 phases; 0004 stores a run with any provider ID (0004 AC-003) | The run section could not be tested before 0011 |
| A-005 | Activity entries with equal timestamps are ordered spec entries first, then by ascending spec number | A deterministic order is needed for tests; no product preference is known | Only the order of simultaneous entries would change |
| A-006 | (p1, approved 2026-11-16) Run values are "not available" when the store is unavailable or `listRuns` is not available; *Recent activity* is "not available" when the store or the status history is not available; a read-only store counts as available | BR-09 names the sources; 0004 and 0003 report them separately | A read-only window would show "not available" for data it can read |
| A-007 | (p2) An activity entry of a duplicated stem shows the title of the first entry in key order and sends the spec request without a path | PD-019 gives no per-entry history | The title of one of two duplicates could be shown for the other |
| A-008 | (p3) A highlighted run of a duplicated stem holds while at least one entry with that stem is not Done | Reading (e) of OP-3 | A duplicate that is Done could end a highlight too early or too late |
| A-009 | (p4) The latest-run tie on equal `created` goes to the higher run ID | 0004 §8 names no tie rule | Only which of two simultaneous runs is "latest" would change |
| A-010 | (p5) Times are shown local as `YYYY-MM-DD HH:mm` | §9 leaves the format to the plan | Only the display format would change |
| A-011 | (p6) The dashboard service computes only while someone listens (the panel is open), so a closed panel causes no store reads | ADR-001 §7, no retained context | The first view after opening would be computed on demand |
| A-012 | (p7, new with Gregor's answer to OP-4) "Specs that carry a diagnostic" are the entries whose lifecycle entry holds at least one diagnostic of any kind (own files, contradictions); the header number counts project-level diagnostics only (AC-017), so the set can be empty while the number is above 0 — the board's banner then shows the project-level ones | The header number and the set answer two questions; the banner shows the rest (0007 §13) | The board could open with no card although the number reads above 0 |
| A-013 | (2026-11-16, after `/sdd-compile`) The header time is the later of two stamps: the repository's own time of its last spec read, and the clock time at which the dashboard processed its last run change. A run change that happens while the panel is closed is not processed, so it does not move the time | The dashboard listens only while the panel is open (A-011); the run store keeps no change time | After a closed panel the time can be older than the newest run, which the run section shows anyway |

## 17. Open points

Closed:

- OP-1 (2026-11-16): closed by PD-040 and PD-041 — the shell's navigation request and the
  board's filters are decided; the encoding is a planning matter (§15).
- OP-3 (2026-11-16): `/sdd-clarify` listed 71 findings, 7 blocking (full list:
  `orch/clarify/0006-findings.md`, kept by the run orchestrator outside this repository; numbers
  in brackets). Gregor decided the
  blocking ones in the PD register and delegated the rest; the walkthrough ran in bulk at his
  request. Resolved 61:
  - PD-024, PD-046: no "recovery pending" [1.1, 3.1] → §4, BR-05, AC-005.
  - PD-046: runs without a current spec [1.2, 3.8] → BR-01, BR-05 to BR-07, AC-007, AC-008,
    AC-014; store unavailable [1.5, 2.10, 3.13] → BR-09, AC-018; activity sources [2.1, 3.5] →
    BR-07, AC-010; drill-down proven by the request [6.1, 3.6, 3.7] → AC-012 to AC-014, A-002.
  - PD-036 to PD-038: panel-level states are the shell's [1.3, 3.15, 5.5] → §4, §9, AC-020.
  - PD-040 to PD-042, PD-039: navigation request, named spec set, Spec Explorer [1.4, 2.15,
    6.8] → BR-08, OP-1.
  - PD-047, PD-035: update time [3.10, 4.1] → AC-016.
  - PD-004: derived label [1.14] → BR-02, AC-025. PD-025: status owner [1.12]. PD-031: version
    "unknown" [1.9].
  - Neighbour specs: start view, 0005 BR-02 [1.6]; Deprecated and Done, 0003 [2.9]; removal and
    repeated status changes, 0004 [5.4, 5.7]; bursts, 0002 AC-012 [3.11, 5.9]; test runs, 0004
    AC-003 [6.5]; latest run, 0004 §8 [6.3]; end-to-end time [6.2].
  - Wording and testability, one reading each: [1.7, 1.8, 1.10, 1.11, 1.15, 2.2 to 2.8, 2.11,
    2.12, 2.14, 3.2 to 3.4, 3.9, 3.12, 3.14, 3.16 to 3.18, 4.2 to 4.4, 5.8, 6.4].
  - Readings made while applying the decisions; say so if one is wrong: (a) the *Running*
    figure opens the Agent Center on the one counted run, else without a target — PD-040 has no
    run-set target and PD-005 allows one open run; (b) reason (b) holds exactly while the run
    is highlighted, so not for a Done spec; (c) one header time, the last model update: a spec read or a run change the dashboard
    processed (revised 2026-11-16 after `/sdd-compile`: the first reading excluded run changes
    and stamped the panel-open time); (d) project-level = attached to no spec entry; (e) for a
    duplicated stem, runs and history belong to every entry with it; (f) AC-024's clock starts
    when the dashboard receives the model; (g) times are absolute; (h) a missing title shows
    "not available", and an activity entry of a vanished stem shows "spec not found" and
    answers a click with PD-039's notice; (i) with the store unavailable the attention list
    keeps reasons (a), (d), (e) and adds one line; (j) a removed run is no longer highlighted;
    (k) ties: ascending spec number; (l) AC-022's visible focus follows 0005 AC-022; (m) AC-025
    and AC-026 are new, for PD-004 and the §8/§11 rule that had no criterion; (n) an empty
    list keeps its heading and says that it is empty.

Open (none blocks the work; clarify finding in brackets; a recommendation each). OP-4, OP-6,
OP-8, OP-9, OP-10 and OP-12 are closed below by Gregor's answers; the plan's readings p1 to p6
(A-006 to A-011) are approved:

- OP-2: Whether the §18 KPI *Time to Project Overview* is later measured from this dashboard
  needs a decision after the MVP. It is not part of this spec.
- OP-4 [1.13, 4.5]: *Closed 2026-11-16 (Gregor):* the diagnostics count does not open the Output
  channel; it opens the Spec Board filtered to the specs that carry a diagnostic (named spec set
  "Diagnostics") → BR-08, AC-017.
- OP-5 [2.13]: Do duplicate, unreadable-sibling-plan, dangling-link, orphan or
  unverified-version diagnostics raise reason (d)? Recommendation: the set that fails 0003 R-6
  — contradiction, unreadable spec or sibling plan, duplicate; the others do not.
- OP-6 [5.1]: *Closed 2026-11-16 (Gregor, as recommended):* BR-05, AC-027. 0004's placeholder
  view of such a run (`historyUnreadable`) is recognised by that flag.
- OP-7 [5.2]: Does a reader window (PD-030) see the writer's run changes live? Recommendation:
  no promise in the MVP; it refreshes when the panel is opened. Needs 0004.
- OP-8 [5.3]: *Closed 2026-11-16 (Gregor, as recommended):* §9, AC-028.
- OP-9 [5.6]: *Closed 2026-11-16 (Gregor, as recommended):* BR-08, AC-029.
- OP-10 [5.10]: *Closed 2026-11-16 (Gregor, as recommended):* BR-01, BR-06.
- OP-11 [6.6, 1.10]: The interview decisions Q1 to Q5, Q7 and Q9 are stored nowhere but in
  this spec, and Q1 narrows handoff FR-006.5. Recommendation: one PD entry for them.
- OP-12 [6.7, 3.17]: AC-024's 1 second and AC-016's 500 ms are working thresholds (PD-035,
  PD-047); Gregor re-measures them on a real project, a failed re-measurement reopens this
  spec. *Closed 2026-11-16 (Gregor, as recommended):* the fixture has 5 runs per spec and 1,000
  history entries (AC-024).
- OP-13 (cross-spec, main session): 0005 and 0007 must carry PD-040 and PD-041 as this spec
  uses them; 0004 OP-013's note on "recovery pending" in 0006 is settled.

## 18. Definition of Ready

- [ ] Goal, user and value are clear (§2, §3).
- [ ] Scope and out-of-scope are documented with reasons (§4).
- [ ] Rules BR-01 to BR-09 are testable.
- [ ] The happy path and edge cases are described (§5, §13).
- [ ] The acceptance criteria are measurable (§14).
- [ ] Dependencies 0002 to 0005 are specified.
- [x] Blocking `/sdd-clarify` findings decided (PD-024, PD-036, PD-040, PD-041, PD-046, PD-047).
- [x] The readings in OP-3 and the recommendations in OP-4 to OP-12 seen by Gregor (2026-11-16: OP-4, OP-6, OP-8, OP-9, OP-10, OP-12 and readings p1 to p6 decided; OP-2, OP-5, OP-7, OP-11 stay as written).
- [ ] Open points are visible (§17).

## 19. Definition of Done

- [x] All FR are built and AC-001 to AC-029 pass with evidence; AC-012 to AC-014 by the request
  sent (PD-046); tests were added and run green (plan *Traceability* and *Open evidence*,
  2026-11-17).
- [x] No out-of-scope functionality was added, and no file is written (AC-023).
- [x] Docs and the architecture snapshot are updated where new modules appear.
- [x] Revised 2026-11-17: the dashboard is checked by Gregor or his delegate (screenshots,
  §14); the hands-on look in a real VS Code window is a pre-release checklist item (Gregor's
  delegation, 2026-11-17).

## 20. Recommended next steps

1. Gregor reads the readings in OP-3 and the recommendations in OP-4 to OP-12.
2. Run `/sdd-plan` after 0002 to 0005 are planned, so the projection inputs are fixed.

## Plan history

- 2026-11-17 — [0006-mission-control-dashboard.2026-11-17.plan.md](../plan-archive/0006-mission-control-dashboard.2026-11-17.plan.md) — T-001 to T-009 built; second `/sdd-compile` READY (manual items: 2, pre-release checklist); host suite green on Windows at e6f0c85.
