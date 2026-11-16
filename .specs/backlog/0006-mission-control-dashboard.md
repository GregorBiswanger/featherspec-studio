# Mission Control Dashboard

**Status:** Draft
**Plan:** _none yet_

Handoff reference: FS-006 ([po-handoff.md](../../docs/product/po-handoff.md) §4.1, §10 FS-006,
§13, §18). Depends on: 0002 (spec entries, diagnostics), 0003 (states, readiness, status
history), 0004 (runs, run status history), 0005 (shell, navigation, theme). Drill-down targets:
0007 (filtered board, spec detail), 0012 (run detail in the Agent Center). Run statuses: 0011.

## 1. Summary

Mission Control is the first view of FeatherSpec Studio. It shows the state of the active
project at a glance:
- how many specs exist and how they spread over the six lifecycle states;
- one documented progress figure;
- the agent runs, counted apart from the specs;
- the specs that need the developer's attention, with the reason;
- the last ten relevant activities.

Every figure leads to a filtered detail view. The dashboard is read-only and shows missing
data as "not available", never as an estimate.

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

- A project header with the folder name, FeatherSpec version, last refresh time and the count
  of project-level diagnostics.
- Spec counts: the total and one count per state (Backlog, Ready, Active, Review, Done,
  Blocked), with Deprecated shown inside Done.
- One progress figure with its formula shown (BR-04).
- Run figures: Running, Recovery pending, and highlighted Failed or Interrupted latest runs.
- The *Needs attention* list, with the reasons per spec (BR-01).
- *Recent activity*: the last 10 entries (BR-07).
- Drill-down from every figure and entry (BR-08).
- Live updates on file and run changes.
- Empty, loading and error states.

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
- Readiness failures of plain Backlog specs as attention items — because almost every new spec
  would show up (Gregor, Q1). The board shows readiness per card (0007).
- Single tool, message or file events in *Recent activity* — because they belong to live
  monitoring (0012).
- Writing any file in the repository — because Studio is read-only for FeatherSpec artifacts
  (PD-013).

## 5. Functional flow

1. The developer opens Studio. Mission Control is the start view (0005).
2. While the project is being read, the dashboard shows "Reading specs…" and no figures.
3. The dashboard shows the header, spec counts, progress, run figures, *Needs attention* and
   *Recent activity* of the active project.
4. The developer clicks a figure or entry. Studio opens the matching filtered view (BR-08).
5. A spec file changes, or a run event arrives. The affected figures update in place without a
   reload.

## 6. Business rules

- **BR-01 Needs attention** (Gregor, Q1). A spec needs attention when at least one reason
  applies. Each spec is listed once, with every reason that applies:
  - (a) **Blocked**: its state is Blocked (0003 S-BLOCKED).
  - (b) **Run failed / Run interrupted**: its latest run is `Failed` or `Interrupted` (BR-06).
  - (c) **Waiting for you**: one of its runs is in `WaitingForApproval` or `WaitingForInput`.
  - (d) **Diagnostic**: it carries a contradiction or unreadable-file diagnostic (0003 §6.3,
    AC-019). Unknown but harmless content (0002 unknown-content kind) does not count.
  - (e) **Review pending**: its state is Review.

  A plain Backlog spec, whose readiness fails only for missing preconditions, does not need
  attention. This covers the handoff's "pending reviews and missing prerequisites" (FR-006.5)
  by reasons (a), (d) and (e).
- **BR-02 Spec counts.** Every spec entry delivered by 0003 is counted in exactly the one state
  0003 assigns. The state counts add up to the total. Deprecated specs count as Done, and the
  Done figure shows "of which Deprecated: n".
- **BR-03 Separate dimensions.** Run figures come from runtime data (0004) only and never
  change a spec count. Spec counts never change because of runs (0003 AC-006).
- **BR-04 Progress** (Gregor, Q2). Progress = number of Done specs with status `Implemented` or
  `Baseline` ÷ (total specs − Deprecated specs), shown as a whole percentage, rounded down,
  together with both numbers and the formula text. When the divisor is 0, progress is "not
  available".
- **BR-05 Running** (Gregor, Q3). Running counts the runs of the active project in `Starting`,
  `Running`, `WaitingForApproval` or `WaitingForInput`. Runs marked "recovery pending" (0004
  BR-004) are counted only under *Recovery pending*, never as Running.
- **BR-06 Failed / Interrupted highlight** (Gregor, Q3). A run is highlighted while it is
  `Failed` or `Interrupted` and is the latest run of its spec (latest = most recent created
  timestamp). The highlight ends when a newer run of the same spec is created, or when the spec
  is Done. `Cancelled` runs are never highlighted.
- **BR-07 Recent activity** (Gregor, Q4). The 10 newest entries, newest first, merged from:
  - spec state changes in the status history (0003 §6.5);
  - run status changes to `Starting`, `WaitingForApproval`, `WaitingForInput`, `Completed`,
    `Failed`, `Cancelled` or `Interrupted` (0004 status history).

  Each entry shows its time, spec number and title, and the change in words.
- **BR-08 Drill-down** (Gregor, Q5).

  | Element | Target |
  | --- | --- |
  | Total | board, no filter |
  | A state count | board filtered to that state |
  | *Needs attention* heading or count | board filtered to exactly the specs of BR-01 |
  | An attention row | spec detail of that spec |
  | Running, Recovery pending, or a highlighted run | that run in the Agent Center; for a count, the Agent Center filtered to those runs |
  | An activity entry | spec detail of its spec |
  | Diagnostics count in the header | the Output channel "FeatherSpec Studio" |

  The filter is visible on the target view and can be cleared with one action (0007, 0012).
- **BR-09 Honest status** (P8). A figure whose source is not available shows "not available"
  and the reason. It never shows 0 or an estimate in its place.

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-001 (FR-006.1) | Total and per-state spec counts | AC-001, AC-002 |
| FR-002 (FR-006.2) | Progress only by the documented rule | AC-003, AC-004 |
| FR-003 (FR-006.3) | Running runs, counted apart from specs | AC-005, AC-006 |
| FR-004 (FR-006.4) | Highlight failed, interrupted and blocked items | AC-007, AC-008, AC-009 |
| FR-005 (FR-006.5) | Pending reviews and missing prerequisites as attention reasons | AC-008 |
| FR-006 (FR-006.6) | Recent activity | AC-010, AC-011 |
| FR-007 (FR-006.7) | Drill-down to filtered views | AC-012, AC-013, AC-014 |
| FR-008 (FR-006.8) | Live update on file and run events | AC-015, AC-016 |
| FR-009 (§4.1) | Visible project context | AC-017 |
| FR-010 (§13) | Empty, loading, error states; honest missing data | AC-018, AC-019, AC-020 |
| FR-011 (§13) | Accessibility and read-only | AC-021, AC-022, AC-023 |
| FR-012 (§13) | Responsiveness | AC-024 |

## 8. Data requirements

All inputs are read and none are stored by this feature:
- spec entries and diagnostics (0002);
- states, rule IDs, Deprecated marker and status history (0003);
- runs with spec reference, status, timestamps and "recovery pending" marker, plus the run
  status history (0004);
- the active project's folder name and version (0001).

The dashboard figures are a projection computed from these inputs. They are never persisted.
No sensitive fields: run error messages are not shown on the dashboard (only the status and
the spec).

## 9. UI/UX requirements

- Layout (top to bottom):
  - header;
  - spec counts and progress;
  - run figures;
  - *Needs attention*;
  - *Recent activity*.

  Mission Control is the start view of the shell (0005).
- Every state, reason and highlight carries a text label. Colour is never the only carrier.
- Every clickable element is reachable with Tab and activated with Enter or Space.
- Theme, empty-state and error-state styling follow the shell (0005, ADR-001 §3).
- Times are shown in the developer's local time.
- States:

  | Condition | Shown |
  | --- | --- |
  | no active project | the messages of 0001 (AC-008, AC-010, AC-015) |
  | project being read | "Reading specs…", no figures |
  | zero specs | "No specs yet", with a pointer to `/sdd-specify` |
  | runtime data unreadable | spec part as usual; run part "not available" with the reason (0004 BR-007) |
  | no runs yet | run figures 0, *Recent activity* from spec history only |
  | Restricted Mode | full dashboard (no actions exist) |

## 10. Interfaces and integrations

Studio-internal only. The dashboard asks the shell's navigation (0005) to open the targets of
BR-08. No provider, network or external system is involved.

## 11. Security, permissions and privacy

The dashboard is read-only. It creates, changes or deletes no file (PD-013). It shows no run
error text, prompts or provider payloads. It sends no telemetry (handoff §13 Privacy).

## 12. Non-functional requirements

- Display: Gregor, Q7 (AC-024).
- Updates must not block the UI while events stream in (handoff §13 Performance). Covered by
  AC-016's time bound.

## 13. Error cases and edge cases

- A spec file can't be read: the spec counts in its folder's state with a diagnostic and gets
  attention reason (d) (0003 AC-019).
- A run's spec reference matches no current spec (renamed or deleted, PD-011): the run is still
  counted. Its row and its activity entry show the recorded reference with "spec not found",
  and a click shows that message instead of navigating.
- A run event arrives twice: it is stored once (0004 AC-007), so figures do not change twice.
- Two activity entries have the same time: run entries follow spec entries, then they are
  ordered by spec number.
- More than 10 activities: only the newest 10 are shown, with no paging (drill-down covers the
  rest).
- A spec is both Blocked and has a failed latest run: one attention row, both reasons.

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
- **AC-005** The system shall count as Running the runs of the active project in `Starting`,
  `Running`, `WaitingForApproval` or `WaitingForInput`. It shall count runs marked "recovery
  pending" only under *Recovery pending*. *(FR-006.3)*
- **AC-006** The system shall derive run figures from runtime data only. Adding, ending or
  removing a run shall change no spec count, and a spec state change shall change no run
  count. *(AC-006.2)*
- **AC-007** While a spec's latest run is `Failed` or `Interrupted` and the spec is not Done,
  the system shall highlight that run with its status as text. When a newer run of the same
  spec is created, or the spec becomes Done, the system shall remove the highlight. The
  system shall never highlight a `Cancelled` run. *(AC-006.3)*
- **AC-008** The system shall list in *Needs attention* each spec that meets at least one
  reason (a)–(e) of BR-01, exactly once, with every applying reason as text. It shall not list
  a Backlog spec that meets none of them. *(AC-006.3, FR-006.5)*
  > **Given** a Backlog spec without a plan and a Review spec **When** the dashboard is shown
  > **Then** only the Review spec is listed, with the reason "Review pending".
- **AC-009** The system shall not count a parser diagnostic of the unknown-content kind (0002)
  as attention reason (d).
- **AC-010** The system shall show in *Recent activity* at most 10 entries, newest first,
  taken only from spec state changes in the status history and from run status changes to
  `Starting`, `WaitingForApproval`, `WaitingForInput`, `Completed`, `Failed`, `Cancelled` or
  `Interrupted`. Each entry shall show its time, spec number, spec title and the change. *(FR-006.6)*
- **AC-011** The system shall not show tool, message, file-change or usage events in *Recent
  activity*.
- **AC-012** When the developer activates the total, a state count or the *Needs attention*
  count, the system shall open the board with the filter of BR-08 applied, and the board shall
  show exactly the specs counted in that figure. *(AC-006.4)*
- **AC-013** When the developer activates Running, Recovery pending or a highlighted run, the
  system shall open the Agent Center showing that run, or the runs counted in that figure.
  *(AC-006.4)*
- **AC-014** When the developer activates an attention row or an activity entry, the system
  shall open the spec detail of its spec. If that spec no longer exists, then the system shall
  show "spec not found" with the recorded reference and stay on the dashboard.
- **AC-015** When the spec repository reports a change, or the runtime store records a run
  status change or a new event for a run of the active project, the system shall update the
  affected figures, attention rows and activity entries without reloading the view. *(AC-006.5)*
- **AC-016** When a change of AC-015 has been processed by the host, the system shall show the
  updated figures within 1 second. Checked by an automated timing test with the fake provider.
- **AC-017** While a project is active, the system shall show its folder name, FeatherSpec
  version ("unknown" for legacy projects, 0001), the time of the last model update and the
  number of project-level diagnostics. Activating that number shall open the Output channel
  "FeatherSpec Studio".
- **AC-018** If runtime data cannot be read, then the system shall show all spec figures as
  usual and show every run figure as "not available" with the reason, never as 0. *(AC-006.6)*
- **AC-019** The system shall show every value its source does not deliver as "not
  available", and shall not replace it with an estimate, a default or a value from another
  source. *(AC-006.6)*
- **AC-020** While the project model is being read, the system shall show "Reading specs…" and
  no figures. If the active project has zero specs, then it shall show "No specs yet" with a
  pointer to `/sdd-specify`. While no project is active, it shall show the messages of 0001.
- **AC-021** The system shall show every state, attention reason and highlight as text, with
  colour only in addition. Checked by a component test, and by Gregor in a high-contrast theme.
- **AC-022** The system shall make every drill-down element reachable with the Tab key and
  activatable with Enter or Space.
- **AC-023** The system shall create, modify, move or delete no file in the workspace while
  showing or updating the dashboard. In Restricted Mode it shall show the full dashboard.
- **AC-024** While the project holds up to 200 specs and their runs, the system shall show all
  figures within 1 second of the moment the host holds the project model. Checked by an
  automated timing test on a 200-spec fixture.

Who decides: AC-001 to AC-020 and AC-022 to AC-024 are decided by automated tests:
- unit tests over the dashboard projection, using fixture snapshots and fake-provider runs;
- component tests in jsdom;
- one host integration test for AC-015 and AC-016.

Gregor accepts the whole dashboard by hand in the hands-on run against a fixture project
(Q9), including the AC-021 high-contrast check.

## 15. Technical notes for developers or AI agents

- As-is: only the generator scaffold exists (`src/extension.ts`, `src/test/extension.test.ts`).
  Nothing to reuse.
- Suggested shape (decided in `/sdd-plan`):
  - a pure projection in `src/core/` (no `vscode` import) computes the dashboard view model
    from 0003 states and history, 0004 runs and 0001 project data;
  - the host pushes it through the typed protocol: snapshot, then `evt` with `seq`
    (ADR-001 §6);
  - the webview only renders it and sends navigation requests;
  - no `retainContextWhenHidden`: after a reload the host rebuilds the model (ADR-001 §7).
- Drill-down filters are route parameters of the in-app routing (ADR-001 §2). Their encoding is
  shared with 0007 and 0012.
- Tests: Vitest for core and webview, Mocha only for the host integration test (ADR-001 §12).
  Use AC IDs in test names.
- Quality gates: `.memory-bank/techContext.md`.

## 16. Assumptions

| ID | What we assume | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | The 1 s display budget (AC-024) starts when the host holds the project model; parsing time belongs to 0002 AC-018 | 0002 owns parsing performance; the "Reading specs…" state covers it | AC-024 would need a larger budget that includes parsing |
| A-002 | 0006 is built before 0007 and 0012 (handoff §11.2). Until they exist, AC-012 to AC-014 are decided by the navigation request the dashboard emits (route and filter), and the board's and Agent Center's own display of the filter is decided in 0007 and 0012 | The build order is the handoff's; the shell (0005) routes to placeholder views | The drill-down ACs cannot be proven end-to-end until 0007 and 0012 exist; acceptance of AC-012 to AC-014 moves with them |
| A-003 | "Latest run of a spec" means the run with the most recent created timestamp for that spec reference | 0004 stores a created timestamp per run, and PD-005 allows one active run per spec | Highlights could stick to an older run |
| A-004 | Run figures stay at 0 in Phase 1 until 0011 creates runs; tests use fake-provider runs written through the 0004 store | Handoff §16 phases; 0004 is provider-independent | The run part could not be tested before 0011 |
| A-005 | Activity entries with equal timestamps are ordered spec entries first, then by spec number | A deterministic order is needed for tests; no product preference is known | Only the order of simultaneous entries would change |

## 17. Open points

- OP-1: The filter encoding shared by the dashboard, board (0007) and Agent Center (0012) must
  be agreed when the first of those is planned.
- OP-2: Whether the §18 KPI *Time to Project Overview* is later measured from this dashboard
  needs a decision after the MVP. It is not part of this spec.

## 18. Definition of Ready

- [ ] Goal, user and value are clear (§2, §3).
- [ ] Scope and out-of-scope are documented with reasons (§4).
- [ ] Rules BR-01 to BR-09 are testable.
- [ ] The happy path and edge cases are described (§5, §13).
- [ ] The acceptance criteria are measurable (§14).
- [ ] Dependencies 0002 to 0005 are specified, and A-002 has been accepted.
- [ ] Open points are visible (§17).

## 19. Definition of Done

- [ ] All FR are built and AC-001 to AC-024 pass with evidence; tests were added and run
  green.
- [ ] No out-of-scope functionality was added, and no file is written (AC-023).
- [ ] Docs and the architecture snapshot are updated where new modules appear.
- [ ] Gregor accepted the dashboard in the hands-on run.

## 20. Recommended next steps

1. Run `/sdd-clarify` on this spec in a fresh session (it carries assumptions A-001 to A-005).
2. Run `/sdd-plan` after 0002 to 0005 are planned, so the projection inputs are fixed.
