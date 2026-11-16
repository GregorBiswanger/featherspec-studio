# Spec Board & Spec Detail

**Status:** Draft
**Plan:** _none yet_

Handoff reference: FS-007 ([po-handoff.md](../../docs/product/po-handoff.md) §4.2, §4.3, §10,
§13 *Usability und Accessibility*). Builds on 0002 (parser model), 0003 (states, readiness,
transitions, history), 0004 (run store) and 0005 (Studio shell). UI surface per
[ADR-001](../../docs/decisions/ADR-001-extension-architecture.md) §2, §11.

## 1. Summary

A kanban board with six columns (Backlog, Ready, Active, Review, Done, Blocked) and a spec
detail view inside the Studio panel. Developers see every spec of the project, its state and
the reason for it, its progress and its latest agent run, all without opening Markdown files.
The board offers filters, sorting and full keyboard use. It owns the drag interaction and its
keyboard alternative: it rejects every drop that 0003 refuses, and passes a Ready → Active drop
on to the start workflow of 0008. Everything is read-only. Studio never writes a FeatherSpec file.

## 2. Goal and problem

Today the state of a FeatherSpec project is spread over folders, header lines, plans and
traceability tables. A developer has to open several files to see what is ready, what is
running, and why something is stuck. The board makes that visible at a glance, and the detail
view makes it readable in one place. Every figure on the board can be traced back to its file
and rule (handoff P2, P6, P8).
**Success:** every recognised spec appears in exactly one column with the state 0003 derives.
Derived states are visibly marked as derived. A file saved outside Studio shows up on the board
without a reload. Every board action can be done without a mouse.

## 3. Users and roles

- **Developer** (primary): scans the board, opens details, filters, drags a Ready spec toward
  Active. One role; no permission differences in the MVP
  ([projectbrief.md](../../.memory-bank/projectbrief.md)).
- **Tech lead / architect:** reads progress, verification and agent history.
- **Consuming features:** Mission Control (0006) opens the board with a filter already set.
  0008 receives the Ready → Active drop.

## 4. Scope

### In scope

- Board with six columns, cards, diagnostic badges and the *derived* marker.
- Card content: §6.1. Progress and last change: §6.2. Latest run: §6.3.
- Spec detail view with seven areas and "Open file" links (§6.4).
- Filters, sorting, hidden-card counts, "Clear filters", preset filters from 0006 (§6.5).
- Drag interaction, the "Move to…" menu and the command `FeatherSpec: Move Spec to…`.
  Refused moves show the reason from 0003; a Ready → Active move is passed on to 0008 (§6.6).
- Keyboard operation, non-colour status cues, screen-reader announcements, theme support (§6.7).
- Empty, loading and error states (§6.8). Live update after external file changes.

### Out of scope

- Starting an agent run, provider choice, the start confirmation and the run-start
  preconditions — because the drop that starts an agent belongs to 0008 (Gregor, 2026-11-16).
- Cancelling or restarting a run from the board — because 0007 only displays runs; run control
  belongs to 0011/0012.
- Writing, moving or renaming any FeatherSpec file, including lifecycle moves via drag & drop
  — because Studio is read-only for these files (PD-013, PD-014).
- Deriving states, readiness, refusal reasons and verification status — because 0003 owns them;
  the board only renders them.
- Parsing Markdown — because 0002 owns it; the board never reads files itself.
- Inventing a priority value — because FeatherSpec has no priority field (PD-015).
- Persisting filters and sorting across a VS Code restart — not now; revisit after MVP feedback.
- Editing spec content in the detail view — because the handoff excludes a visual spec editor
  (FS-002 *Out of Scope*).
- The Studio shell, navigation and the panel's global empty state without a project — because
  0005 owns them.
- Mission Control and the Agent Center — because 0006 and 0012 own them.

## 5. Functional flow

1. The developer opens the Spec Board in the Studio panel (0005).
2. The board shows placeholder columns while the first snapshot loads, then the cards in the
   columns 0003 derived.
3. The developer scans the cards, sets filters or a sort order, or arrives from Mission Control
   with a filter already set.
4. The developer selects a card with the mouse or Enter. The detail view opens and shows the
   seven areas. "Open file" opens the source in the editor.
5. The developer drags a card, or uses "Move to…". The board asks 0003 whether the move is
   allowed. If it is refused, the card returns and the reason is shown and announced. If it is a
   Ready → Active move that 0003 accepts, the board hands it to 0008.
6. A spec or plan changes on disk. The board and an open detail view update without a reload.

## 6. Business rules

### 6.1 Card content

- Always shown: spec number, title, state label as text plus icon, the *derived* marker with
  its rule ID for Ready, Review and Blocked, and a diagnostic badge when the spec or plan has one.
- Description: the first paragraph of the spec's first section after the header lines,
  whatever its heading text or language, cut to two lines. No paragraph → "No summary".
- Blocked cards show the blocking reason (plan `Blocked`, or the return note).
- Backlog cards show the first failing readiness check by ID and reason, e.g. "R-3: no plan".
- Priority: left off the card while no spec in the project declares one. The detail view shows
  "Priority: not available" (PD-015).

### 6.2 Progress and last change

- Tasks: ticked steps out of all steps of the spec's current plan, as delivered by 0002.
  The current plan is the sibling plan, or the archived plan for `done/` specs (0003 §6.6).
- Criteria: traceability rows with state `verified` out of the acceptance criteria the spec
  defines.
- No plan, no steps or no traceability table → "not available". Never shown as 0 %.
- Spec DoR/DoD checkboxes never count (0002 BR-08).
- Last change: the newest file modification time of the spec or its current plan. It is a
  file fact, used for display and sorting only, never for a state.

### 6.3 Agent and run on the card

- The card shows the spec's latest run from the run store (0004): provider and run status.
  No run → "No run". Run store unavailable → "Runs: not available".
- The run status is shown next to the spec state, never instead of it (0003 AC-006).

### 6.4 Spec detail view

| Area | Content |
| --- | --- |
| Overview | header lines as found, state with rule ID and *derived* marker, readiness checks R-1…R-7 with *pass / fail / not available* and reason, diagnostics, "Priority: not available" |
| Requirements | `FR-` rows when present, otherwise the requirements section as plain text |
| Acceptance criteria | every `AC-` definition with full text and annotations, any Given/When/Then, the *uncertain* flag |
| Plan & tasks | stages and steps with tick state and `Verified` text; "No plan yet" when absent |
| Verification | the verification status of 0003 §6.6, including the `/sdd-compile` verdict as *not available* |
| Related artifacts | sibling plan, archived plans, return notes — each opens in the editor |
| Agent history | the spec's runs from 0004, plus the status history from 0003 with its label "Observed by Studio while it was running — not a reconstruction" |

- Read-only, rendered from the model. No area offers editing.
- Every area has an "Open file" link that opens the source in the editor, at the line where
  0002 knows it.

### 6.5 Filters and sorting

- Filters: by board state; by agent (provider, or "No run"); by priority, offered only once a
  spec declares one. Filters combine with AND.
- Sorting within each column: by spec number (default), title or last change; by priority only
  when one exists.
- Each column shows "N hidden by filter" while a filter hides cards. "Clear filters" resets all
  filters.
- Filters and sorting survive a panel reload, not a VS Code restart.
- Filters and sorting change only the view, never a spec's state or files.
- 0006 can open the board with a preset filter; it appears as an ordinary, clearable filter.

### 6.6 Moves (drag & drop and "Move to…")

- Three equal ways to request a move: drag & drop, the card's "Move to…" menu, and the command
  `FeatherSpec: Move Spec to…`.
- Every request goes to 0003's transition check. A refusal returns the card to its column and
  shows 0003's reason (PD-014).
- An accepted Ready → Active request is handed to 0008. Until 0008 exists, the board refuses it
  with "Agent start is not available yet" (Gregor, 2026-11-16).
- A move never changes a file and never moves a card by itself. Cards move only when the files
  change.

### 6.7 Keyboard and accessibility

- Tab reaches the board. The arrow keys move between cards and columns. Enter opens the
  detail view. The context menu key or Shift+F10 opens "Move to…".
- Every state, marker and error is conveyed as text plus an icon, never by colour alone.
- The result of a move request (refusal reason, or hand-off to 0008) is announced to screen
  readers.
- The board and detail view use the active VS Code theme, including High Contrast themes.

### 6.8 Empty, loading and error states

- Project with no specs: "No specs yet" with the hint to run `/sdd-specify`. Each empty column
  shows a one-line hint.
- Loading: placeholder columns, no fake cards.
- A file with a diagnostic: the badge on its card; the other cards stay usable.
- Project-level diagnostics (e.g. orphan plan, version): a banner above the board.
- No recognised project: owned by 0005.

## 7. Functional requirements

| ID | Requirement | Handoff | Criteria |
| --- | --- | --- | --- |
| FR-01 | Show a kanban with Backlog, Ready, Active, Review, Done and Blocked | FR-007.1 | AC-001, AC-002 |
| FR-02 | Show cards with number, title, description, priority and state | FR-007.2 | AC-003, AC-004, AC-005 |
| FR-03 | Show task and criteria progress where data exists | FR-007.3 | AC-006 |
| FR-04 | Show the latest run with provider and status | FR-007.4 | AC-007 |
| FR-05 | Provide the spec detail view | FR-007.5 | AC-008, AC-009, AC-010 |
| FR-06 | Filter by state, priority and agent | FR-007.6 | AC-011, AC-012 |
| FR-07 | Sort by priority, last change and title | FR-007.7 | AC-013 |
| FR-08 | Keyboard operation of essential actions | FR-007.8 | AC-017, AC-018 |
| FR-09 | Drag & drop as the move interaction, handed to 0008 for Ready → Active | FR-007.9 | AC-014, AC-015, AC-016 |
| FR-10 | Live update after external changes | AC-007.7 | AC-019 |
| FR-11 | Empty, loading and error states | §13 Usability | AC-020, AC-021 |

## 8. Data requirements

- **Read only**, from three sources: the 0002 model (specs, plans, steps, criteria,
  traceability, return notes, diagnostics, source lines, file modification times), the 0003
  results (state, rule ID, *derived* marker, readiness, refusal reasons, verification status,
  status history) and the 0004 run store (runs per spec: provider, status, timestamps).
- **View state:** filters and sort order, kept for the panel's lifetime only (§6.5).
- No sensitive data. Spec content stays local and is never sent anywhere (handoff §13 Privacy).

## 9. UI/UX requirements

- UI language English (PD-016). Layout inside the singleton Studio panel (ADR-001 §2).
- The rules for card content, the detail view, the states and accessibility are in §6.1–§6.8.
- Accessibility follows handoff §13: essential information without opening Markdown, no
  colour-only cues, keyboard-operable board actions, VS Code themes.

## 10. Interfaces and integrations

- **0002:** model and change notifications (input).
- **0003:** per-spec results, the transition check, the status history (input).
- **0004:** runs per spec (input).
- **0005:** panel, routing, the no-project state.
- **0006:** opens the board with a preset filter.
- **0008:** receives an accepted Ready → Active request.
- **Editor:** "Open file" opens a workspace file at a line.

## 11. Security, permissions and privacy

- Read-only for `.specs/`, `.memory-bank/` and `AGENTS.md` (PD-013).
- The webview has no file-system access. It reaches files only through the host's typed
  messages (architecture snapshot boundaries in `AGENTS.md`).
- "Open file" opens only paths inside the active project root.

## 12. Non-functional requirements

- An external change is visible on the board within 1 s of the save, with up to 200 specs.
  These are Gregor's working thresholds from 0002 §11, re-measured on a real project (0002
  OP-001).
- The board stays responsive while run events arrive. The detail view loads a page of run
  history, never a whole event log (ADR-002 §3).

## 13. Error cases and edge cases

| Case | Expected behaviour |
| --- | --- |
| Spec file unreadable | Card placed by its folder with a diagnostic badge (0003 AC-019); other cards unaffected |
| Duplicate spec number | One card with a diagnostic naming all copies (0003 A-001) |
| Spec without a first paragraph | "No summary" |
| Plan without steps or table | Progress "not available" |
| Run store unavailable | Card shows "Runs: not available"; status history in detail shows *not available* |
| Spec deleted while its detail view is open | Detail shows "This spec no longer exists" with a link back to the board |
| Card being dragged while its file changes | The drop is checked against the current state; the board shows the files' state |
| Filter hides every card | Columns show "N hidden by filter" and the "Clear filters" button |
| Ready → Active before 0008 exists | Refused with "Agent start is not available yet" |

## 14. Acceptance criteria

**AC-001** The board shall show every spec the spec repository (0002) delivers as exactly one
card. *(handoff AC-007.1)*

**AC-002** The board shall place each card in exactly one of the six columns, namely the one
matching the state 0003 derives for it. *(AC-007.2)*

> **Given** fixture specs that 0003 derives as Ready, Active, Review and Done **When** the board
> renders **Then** each card appears once, in the column of its state.

**AC-003** The board shall show on every card the spec number, the title and the state label as
text, and for Ready, Review and Blocked a *derived* marker with the rule ID. *(AC-007.3)*

**AC-004** The card shall show the first paragraph of the spec's first section after the
header lines, cut to two lines, or "No summary" when there is none.

**AC-005** While no spec in the project declares a priority, the board shall show no priority
on cards, and the detail view shall show "Priority: not available". *(PD-015)*

**AC-006** The card shall show task progress as ticked steps out of all steps of the current
plan, and criteria progress as `verified` traceability rows out of the defined acceptance
criteria. Where the plan, its steps or its table is missing, it shall show "not available"
instead of a number.

**AC-007** The card shall show the provider and run status of the spec's latest run from the
run store, "No run" when the spec has none, and "Runs: not available" when the store cannot
be read.

**AC-008** When the developer selects a card by mouse or Enter, the board shall open that
spec's detail view. *(AC-007.4)*

**AC-009** The detail view shall show every acceptance criterion that 0002 parsed for the spec,
with its full text, annotations, Given/When/Then illustration and *uncertain* flag. It shall
show the `FR-` requirements, or the requirements section as plain text when it has no `FR-`
IDs. *(AC-007.5)*

**AC-010** The detail view shall show the areas Overview, Requirements, Acceptance criteria,
Plan & tasks, Verification, Related artifacts and Agent history as defined in §6.4. Each area
shall offer an "Open file" link that opens the source file in the editor, at the line where
0002 knows it.

**AC-011** Applying, changing or clearing filters or sort order shall not change any spec's
state, any 0003 result, or any file. *(AC-007.6)*

**AC-012** While a filter hides cards in a column, that column shall show the number of hidden
cards, and the board shall offer "Clear filters".

**AC-013** The board shall sort the cards within each column by spec number by default, and by
title or last change on request. It shall offer sorting by priority only while a spec declares
one.

**AC-014** When the developer requests a move by drag & drop, "Move to…" or the command
`FeatherSpec: Move Spec to…`, the board shall submit it to 0003's transition check. If 0003
refuses it, then the board shall leave the card in its column and show 0003's reason.

**AC-015** When 0003 accepts a Ready → Active request, the board shall hand it to 0008. Where
0008 is not present, the board shall refuse the request with "Agent start is not available
yet".

**AC-016** The board shall not create, modify, move, rename or delete any file under `.specs/`,
`.memory-bank/` or `AGENTS.md`, for any move request or other board action. *(PD-013)*

**AC-017** A developer using only the keyboard shall be able to reach every card, move between
cards and columns with the arrow keys, open the detail view with Enter, and open "Move to…" with
the context menu key or Shift+F10. *(AC-007.8)*

**AC-018** The board shall show every state, marker and error as text plus an icon, without
relying on colour alone. It shall announce the result of every move request to screen readers.

**AC-019** When a spec, plan or return note changes on disk, the board and an open detail view
shall show the new content and state within 1 s of the save, without a manual reload, for a
project of up to 200 specs. *(AC-007.7)*

**AC-020** If a spec or plan has a diagnostic, then the board shall show a diagnostic badge on
its card and keep every other card usable. Project-level diagnostics shall appear in a banner
above the board.

**AC-021** While the project has no specs, the board shall show "No specs yet" with the hint to
run `/sdd-specify`. While the first snapshot loads, it shall show placeholder columns and no
cards.

Who decides: AC-001–AC-016 and AC-019–AC-021 are decided by unit tests over the fixture set
(featherspec-format §11) and webview component tests. AC-016 is also decided by a test that
fails on any file write. AC-017 and AC-018 are decided by component tests plus Gregor's manual
check in the panel: one keyboard-only pass and the light, dark and High Contrast themes. Gregor
also checks the timing of AC-019 once on a real project.

## 15. Technical notes for developers or AI agents

- Brownfield check: no source module exists yet (`architecture: modules: []`); nothing to reuse.
- ADR-001 §11 names `@dnd-kit/react` 0.5.3 with native HTML5 DnD as fallback, plus the mandatory
  "Move to…" alternative. Adding the dependency is Ask-first (`AGENTS.md` *Non-negotiables*).
- ADR-001 rejects `retainContextWhenHidden`. Keep filter and sort state in the webview state so
  it survives a reload (§6.5), and rebuild domain state from the host snapshot (ADR-001 §7).
- Card and detail data should be shaped in a pure core view model (no `vscode` import, *Core
  purity*), so most criteria are unit-testable without the webview.
- 0002 §8 lists no file modification time. "Last change" needs it, so it has to be added to
  0002's model when it is planned (A-002).
- The description comes from 0002's sections with raw content. Do not locate it by heading
  text; headings vary by language (featherspec-format §3.3).
- Quality gates per step: `.memory-bank/techContext.md` *Quality gates*.

## 16. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | The run store (0004) answers "runs of spec X, latest first" | 0004 stores `specId` per run (ADR-002 §1) | Card and agent history need a re-plan |
| A-002 | 0002 can deliver file modification times | The file system port reads files anyway | "Last change" sorting is dropped or 0002 is revised |
| A-003 | The first paragraph of the first section is a useful summary | The template's first section is *Summary* (`/sdd-specify` structure) | Cards show a less useful line; rule change only |
| A-004 | Agent filter by provider is enough; no filter by run status | Gregor accepted the suggestion (Q6) | A second filter is added later |
| A-005 | Proxy decisions PD-002, PD-013, PD-014, PD-015, PD-016 hold | PD register, awaiting Gregor's confirmation | Move, priority and language rules change |

## 17. Open points

- OP-001: The 1 s / 200 specs threshold is to be re-measured on a real project (0002 OP-001).
- OP-002: Proxy PDs (A-005) await Gregor's confirmation; a change means revising this spec.
- OP-003 (resolved): interview questions 2–8 were asked in one message at Gregor's explicit
  request, a one-off exception to `/sdd-specify`'s one-question rule (2026-11-16).

## 18. Definition of Ready

Goal and problem, users, scope and out-of-scope are documented. Card, detail, filter, move and
accessibility rules are testable. The happy path and the error cases are described. The
criteria are measurable. Data and interfaces are clarified or recorded as assumptions, and the
open points are visible.

## 19. Definition of Done

All must-requirements are built and AC-001 to AC-021 pass. No out-of-scope behaviour was added:
in particular no file writes and no agent start. Gregor's manual keyboard and theme check is
done. Assumptions are verified or documented. The architecture snapshot is updated for the new
modules. Gregor accepted the result.

## 20. Recommended next steps

1. `/sdd-clarify` on this spec in a fresh session (A-001, A-002, the split with 0008).
2. `/sdd-plan` after 0002–0005 are planned, since they define this spec's inputs.
