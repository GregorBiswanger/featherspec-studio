# Spec Board & Spec Detail

**Status:** Implemented
**Plan:** [0007-spec-board-spec-detail.2026-11-17.plan.md](../plan-archive/0007-spec-board-spec-detail.2026-11-17.plan.md)

*Amended by 0015 (PD-055/PD-056): every other statement, requirement, criterion, term, assumption or open point of this spec about agent runs, run events, providers, approvals, the Agent Center, the start workflow, the Clear command or specs 0008–0012 is void; a sentence that also says something else keeps that part. The notes below name what changes in meaning or needs a replacement; see [0015](0015-focus-on-visibility.md) §5.*

*Amended by 0017 (PD-060/PD-061): every other statement, criterion, note or open point of this spec about drag and drop, "Move to…", the move command, move requests, the board-requested transition check, an accepted Ready → Active request or the drop result is void; a sentence that also says something else keeps that part.*

Handoff reference: FS-007 ([po-handoff.md](../../docs/product/po-handoff.md) §4.2, §4.3, §10,
§13 *Usability und Accessibility*). Builds on 0002 (parser model), 0003 (states, readiness,
transitions, history), 0004 (run store) and 0005 (Studio shell). UI surface per
[ADR-001](../../docs/decisions/ADR-001-extension-architecture.md) §2, §11. Decisions:
[product-decisions.md](../../docs/product/product-decisions.md) PD-013–PD-016, PD-018, PD-019,
PD-036, PD-039–PD-045, PD-047.

## 1. Summary

A kanban board with six columns (Backlog, Ready, Active, Review, Done, Blocked) in the Spec
Board area, and the spec detail view in the Spec Explorer area of the Studio panel. Developers
see every spec of the project, its state and the reason for it, its progress and its latest
agent run, all without opening Markdown files. The board offers filters, sorting and full
keyboard use. It owns the drag interaction and its keyboard alternative: it rejects every move
that 0003 refuses, and passes a Ready → Active move on to the start workflow of 0008.
Everything is read-only. Studio never writes a FeatherSpec file.

*Amended by 0017 (PD-060/PD-061): "owns the drag interaction and its keyboard alternative" is void (PD-060); the card shows the next step (0017 AC-004).*

## 2. Goal and problem

Today the state of a FeatherSpec project is spread over folders, header lines, plans and
traceability tables. A developer has to open several files to see what is ready, what is
running, and why something is stuck. The board makes that visible in one view, and the detail
view makes it readable in one place. Every figure on the board can be traced back to its file
and rule (handoff P2, P6, P8).
**Success:** every recognised spec appears in exactly one column with the state 0003 derives.
Derived states are visibly marked as derived. A file saved outside Studio shows up on the board
without a reload. Every board action can be done without a mouse.

## 3. Users and roles

- **Developer** (primary): scans the board, opens details, filters, drags a Ready spec toward
  Active. One role; no permission differences in the MVP
  ([projectbrief.md](../../.memory-bank/projectbrief.md)).
  *Amended by 0017 (PD-060/PD-061): "drags a Ready spec toward" is void (PD-060).*
- **Tech lead / architect:** reads progress, verification and agent history.
- **Consuming features:** Mission Control (0006) asks the shell to open the board with a filter,
  or the detail of one spec (PD-040). 0008 receives the Ready → Active move.

## 4. Scope

### In scope

- Board with six columns, cards, diagnostic badges and the *derived* marker.
- Card content: §6.1. Progress and last change: §6.2. Latest run: §6.3.
- Spec detail view with seven detail sections and "Open file" links, shown in the Spec Explorer
  area (§6.4).
- Filters by state, provider and named spec set; sorting; hidden-card counts; "Clear filters";
  a filter handed in through the shell's navigation request (§6.5).
- Drag interaction, the "Move to…" menu and the command `FeatherSpec: Move Spec to…`.
  Refused moves show the reason from 0003; a Ready → Active move is passed on to 0008 (§6.6).
  *Amended by 0017 (PD-060/PD-061): void: no drag interaction, no "Move to…" menu, no move command (PD-060).*
- Keyboard operation, non-colour status cues, screen-reader announcements, theme support (§6.7).
- The in-area states: no specs, empty column, empty after filtering, runtime data not available
  (§6.8). Live update after file changes and run events.

### Out of scope

- Starting an agent run, provider choice, the start confirmation and the run-start
  preconditions (Restricted Mode and a reader window included) — because the move that starts
  an agent belongs to 0008 (Gregor, 2026-11-16; PD-045).
- Cancelling or restarting a run from the board — because 0007 only displays runs; run control
  belongs to 0011/0012.
- Writing, moving or renaming any FeatherSpec file, including lifecycle moves via drag & drop
  — because Studio is read-only for these files (PD-013, PD-014; both proxy, OP-002).
- Deriving states, readiness, refusal reasons and verification status — because 0003 owns them;
  the board only renders them. Its one own refusal is the 0008 placeholder of §6.6 (PD-045).
- Parsing Markdown — because 0002 owns it; the board never reads files itself.
- Showing, filtering or sorting by priority — because FeatherSpec has no priority field
  (PD-015, PD-041). The handoff's priority items (FR-007.2, .6, .7) are deferred until one
  exists; Studio never invents a value.
- Persisting filters and sorting across a panel close or a VS Code restart — because a named
  spec set (PD-041) is a list taken at one moment and would be stale afterwards. Saved views:
  not now; revisit after MVP feedback.
- Editing spec content in the detail view — because the handoff excludes a visual spec editor
  (FS-002 *Out of Scope*).
- The Studio shell, navigation, the spec selection, the Spec Explorer list and every
  panel-level state (no folder, no project, loading, load error, reload needed, Restricted
  Mode) — because 0005 owns them (PD-036, PD-039, PD-040).
- Run events in the detail view — because the event stream belongs to the Agent Center (0012);
  the detail lists runs only.
- Mission Control and the Agent Center — because 0006 and 0012 own them.

## 5. Functional flow

1. The developer opens the Spec Board in the Studio panel (0005). Until the first snapshot is
   there, the shell shows its loading state (0005); the board has none of its own.
2. The board shows the cards in the columns 0003 derived.
3. The developer scans the cards, sets filters or a sort order, or arrives from Mission Control
   with a filter already set.
4. The developer activates a card with a click or Enter. The board asks the shell to open Spec
   Explorer with that spec selected (PD-040, PD-042). The detail view shows the seven detail
   sections. "Open file" opens the source in the editor.
5. The developer drags a card, or uses "Move to…". The board asks 0003 whether the move is
   allowed. If it is refused, the card stays in its column and the reason is shown and
   announced. If it is a Ready → Active move that 0003 accepts, the board hands it to 0008.
   *Amended by 0017 (PD-060/PD-061): void: the developer copies the next step from the card (0017 AC-004).*
6. A spec or plan changes on disk, or a run changes its status. The board and the detail view
   update without a reload.

## 6. Business rules

Terms used below:

- **Spec / entry:** one spec file, keyed by its project-relative path. Its **stem** `NNNN-slug`
  joins it to plans, runs and the selection. The number alone is a display ID (PD-018). Two
  files that share a number or a stem are two entries and two cards (PD-019).
- **Detail section:** one of the seven parts of the detail view (§6.4). "Area" is 0005's word
  for the four parts of the panel and is not used for them.
- **Move request:** a request to show a card in another column, made by drag & drop, "Move
  to…" or the command. It never moves anything by itself (§6.6).
  *Amended by 0017 (PD-060/PD-061): the term *Move request* is void (PD-060).*
- **Latest run:** the run of the spec's stem that was created last (0004 AC-008).
- **Marker:** the *derived* marker, the *Deprecated* marker, the diagnostic badge, the
  *uncertain* flag and the *struck* flag.

### 6.1 Card content

- Always shown: spec number, title, state label as text plus icon, the *derived* marker with
  its rule ID for Ready, Review and Blocked, the *Deprecated* marker where 0003 reports it
  (0003 AC-013), and one diagnostic badge when 0003's result for the entry carries at least one
  diagnostic. A spec without an H1 has no title; its card shows the file stem in its place.
  *Amended by 0016 (PD-059, proxy): §6.1 bullet 1 — the derived marker reads as 0016 T-09 with the rule ID in the tooltip (T-08); the badge counts *Problems* (T-05).*
- Description (PD-043): the first non-empty paragraph under the spec's first second-level
  heading. Text before that heading (header lines, a handoff reference) is skipped. A paragraph
  is a block of text lines that is not a list, table, blockquote or code block. None →
  "No summary". The card limits the description to two lines.
- Blocked cards show every S-BLOCKED condition that holds: the sibling plan's status `Blocked`,
  and each `BLOCKED` return note by its file name (A-006).
- Cards in state Backlog show the failing readiness precondition with the lowest ID and its
  reason from 0003, for example "R-3: no plan".
  *Amended by 0016 (PD-059, proxy): §6.1 bullet 4 — a Backlog card shows its first need (0016 §6.3, T-11), no check ID.*
- Priority: never on the card. The detail view shows "Priority: not available" (PD-015, PD-041).
  *Amended by 0016 (PD-059, proxy): §6.1 bullet 5 — no element shows a priority; the README says once why (0016 T-13).*

### 6.2 Progress and last change

- **The plan** of an entry is the one 0003 §6.6 names: the sibling plan in `backlog/` and
  `active/`; in `done/` the archived plan linked from `**Plan:**`, or a legacy sibling plan
  where there is no archive link.
- Tasks: ticked steps and all steps of that plan, as two numbers ("3 of 7"). Struck steps are
  obsolete and are not counted (featherspec-format §4.4). A step whose tick 0002 reports as
  undetermined counts as not ticked.
- Criteria (PD-043): `verified` rows and all rows of 0003's verification status (§6.6 there),
  as two numbers. Card and detail view show the same numbers from that one source.
- Each figure stands on its own. Tasks read "not available" where there is no such plan or it
  has no countable step. Criteria read "not available" where 0003 reports the verification
  summary as *not available*. Neither is ever shown as zero in that case.
- Spec DoR/DoD checkboxes never count (0002 BR-08).
- Last change (PD-043): the newer file modification time of the spec file and that plan, shown
  on the card. It is a file-system fact: a checkout, pull or clone sets it. It is used for
  display and sorting only, never for a state.

### 6.3 Run on the card

*Amended by 0015 (PD-055/PD-056): void (no run on the card); the run lines of §6.8 and §13 are void too.*

- The card shows the provider and run status of the spec's latest run (0004). No run →
  "No run". Run store state *unavailable* → "Runs: not available". A reader window (PD-030)
  reads runs like the writer.
- Where 0004 reports the latest run as "history unreadable", the card shows that text in place
  of the status.
- Runs are joined by stem. While a stem is duplicated, every entry with that stem shows the
  stem's runs; nothing picks a copy (PD-019).
- The run status is shown next to the spec state, never instead of it (0003 AC-006). It
  updates when the store reports a run event (§12).

### 6.4 Spec detail view

*Amended by 0015 (PD-055/PD-056): the section "Agent history" becomes "Status history": the 0003 history under its label, not available while the history is; the section list adds "Next step" above the sections (0015 AC-003).*

The detail view lives in the Spec Explorer area, beside 0005's spec list, and shows the
selected spec (PD-039, PD-042). The board, Mission Control and the list all reach it through
the shell's navigation request (PD-040). With no spec selected it shows a one-line hint to
select one.

| Detail section | Content | "Open file" |
| --- | --- | --- |
| Overview | header lines as 0002 delivers them, state with rule ID and the *persisted* or *derived* marker, *Deprecated* marker with the successor as 0003 reports it, readiness checks R-1…R-7 with *pass / fail / not available* and reason, for entries in `backlog/` only, every diagnostic with its reason, "Priority: not available" | spec file |
| Requirements | every `FR-` requirement 0002 delivers. A spec without `FR-` IDs: "No `FR-` requirements found" | spec file |
| Acceptance criteria | every `AC-` definition 0002 delivers, with its full text as delivered (annotations included, the leading ID shown once), its Given/When/Then illustration, the *uncertain* flag and the *struck* flag | spec file |
| Plan & tasks | stages and steps of the plan (§6.2) with tick state and `Verified` text, struck steps marked; "No plan yet" when absent | the plan, when one exists |
| Verification | the verification status of 0003 §6.6: rows per state, the summary, and the `/sdd-compile` verdict as *not available* | the plan, when one exists |
| Related artifacts | sibling plan, archived plans, return notes | each listed file |
| Agent history | the spec's runs from 0004, newest created first, each with provider, status, timestamps and 0004's "history incomplete" or "history unreadable" flag — runs only, no events. Below them the status history from 0003, under its label "Observed by Studio while it was running — not a reconstruction" | none |

*Amended by 0016 (PD-059, proxy): §6.4 status history row — entries read as 0016 T-14; the label as T-15.*

*Amended by 0016 (PD-059, proxy): §6.4 Verification row — no `/sdd-compile` verdict line (0016 T-13); the readiness checks read as needs (§6.3, T-11).*

*Amended by 0016 (PD-059, proxy): §6.4 Overview row — shows needs in place of R-1…R-7, *Problems* below "Next step" and format notes collapsed; the State chip reads T-09 or nothing visible (T-10); no priority line (0016 §6.2, T-13).*

- Read-only, rendered from the model. No detail section offers editing.
- "Open file" (PD-044) is offered only where the table names a source file and that file exists
  inside the active project. It is never offered for runs, the status history or "No plan
  yet". It opens the file in the editor at the source location 0002 delivers for the item
  (criteria, `FR-` rows, diagnostics), otherwise at the top of the file.
- A move between lifecycle folders keeps the selection and the detail view (PD-039). A stem
  that disappears clears the selection; the notice "Spec <number> is no longer in the project"
  is the shell's (0005, PD-039).

### 6.5 Filters and sorting

*Amended by 0015 (PD-055/PD-056): filters by state and named spec set only; no provider filter and no "No run".*

- Filters (PD-041): by board state; by provider of the latest run, "No run" included; and by a
  **named spec set** that a caller hands in (a label and a list of stems), shown under its
  label. This is how Mission Control opens "Needs attention".
- A card is shown when it matches every filter that is set. Where one filter has several values
  chosen, matching one of them is enough.
- A card whose runs are "not available" matches no provider value. A stem in a named set that
  is not in the project matches no card.
- Sorting within each column: by spec number ascending (default), by title A–Z, or by last
  change, newest first. Ties are ordered by stem, then by path. A card without the sort value
  comes last.
- Each column shows "N hidden by filter" while a filter hides cards in it. "Clear filters"
  removes every filter, a named spec set included. The sort order stays.
- A filter that arrives with a navigation request (PD-040) replaces the filters set before, so
  the board shows exactly what the caller asked for (0006 AC-012). It is visible and clearable
  like any other.
- Filters and sorting are kept while the Studio panel stays open, also when it is hidden and
  shown again or its content is rebuilt. Closing the panel or restarting VS Code resets them.
  A change of the active project clears the filters.
- Filters and sorting change only the view, never a spec's state or files.

### 6.6 Moves (drag & drop and "Move to…")

*Amended by 0017 (PD-060/PD-061): §6.6 is void (PD-060). The card shows the next step (0017 AC-004).*

*Amended by 0015 (PD-055/PD-056): an accepted Ready → Active request shows the next step (0015 AC-006), also in Restricted Mode and in a reader window (0015 AC-008); there is no hand-off to a start workflow.*

- Three equal ways to make a move request: drag & drop, the card's "Move to…" menu, and the
  command `FeatherSpec: Move Spec to…`. The command acts on the focused card, else on the
  selected spec (PD-039), else it offers a pick list of the project's specs.
- "Move to…" lists the five other columns. A drop on the card's own column, or outside every
  column, is no request: nothing is asked and nothing is shown.
- Every request goes to 0003's transition check, which judges it against the latest snapshot.
  On a refusal the card stays in its column and the board shows 0003's reason (PD-014, PD-045).
- An accepted Ready → Active request is handed to the start workflow of 0008 with the spec's
  stem (PD-045). 0008 checks again itself and owns everything after the hand-off: the
  confirmation, a cancel, and every start refusal (Restricted Mode, a reader window, a run
  already active). The card stays in Ready until the files change and shows the run's status
  once a run exists.
- While no start workflow is available — the case until 0008 is implemented — the board
  refuses the request itself with "Agent start is not available yet" (Gregor, 2026-11-16;
  PD-045). This is the board's only own refusal.
- A move request never changes a file and never moves a card. Cards move only when the files
  change.

### 6.7 Keyboard and accessibility

*Amended by 0015 (PD-055/PD-056): the announcement of the hand-off to the start workflow is void; the drop result of 0015 §8 is announced instead.*

- Tab reaches the board. Up and Down move to the previous and next card of the column. Left and
  Right move to the nearest column in that direction that shows a card. Enter opens the detail
  view. The card's "Move to…" button is the next tab stop after the card it belongs to, on
  every platform; Enter or Space on it opens the menu. Shift+F10 and the context-menu key open
  the same menu from the card as extra ways.
  *Amended by 0017 (PD-060/PD-061): Tab from the card reaches its Copy (one card stop plus one button stop stays); Enter or Space copies; Shift+F10 and the context-menu key open no Studio menu (0017 AC-006).*
- The filters, the sort control, "Clear filters" and every "Open file" link are reachable and
  operable by keyboard.
- Board state, run status, verification summary, every marker, every refusal and every "not
  available" message is conveyed as text; board states and diagnostic badges also carry an
  icon. Nothing is conveyed by colour alone.
- The result of a move request (refusal with its reason, or the hand-off to the start
  workflow) is announced to screen readers.
  *Amended by 0017 (PD-060/PD-061): void; Copy feedback is announced per 0016.*
- After a live update the keyboard focus stays on the card of the same spec, wherever that card
  now is.
- The board and detail view use the active VS Code theme, including High Contrast themes.

### 6.8 In-area states

The board and the detail view own only in-area states. Panel-level states and their texts —
no folder, no project, loading, load error, reload needed, Restricted Mode — are the shell's
and are not repeated here (PD-036, PD-038).

- Project with no specs: "No specs yet" with the hint to run `/sdd-specify`.
- A column that holds no card before filtering shows a one-line hint. A column emptied by a
  filter shows "N hidden by filter" instead.
- Runtime data not available: §6.3 on the card, *not available* in the Agent history section.
- A spec, plan or return note with a diagnostic: the badge on the spec's card; the other cards
  are not affected.
- Diagnostics tied to no spec entry — project scope, an orphan plan, an unlinked return note
  (0002 §9) — appear in one banner above the board, each with its reason.
  *Amended by 0016 (PD-059, proxy): §6.8 (the statement of §13 row "Diagnostics tied to no spec entry") — the board shows *Problems* tied to no spec entry; format notes sit behind the collapsed toggle (0016 §6.2, AC-009).*

## 7. Functional requirements

| ID | Requirement | Handoff | Criteria |
| --- | --- | --- | --- |
| FR-01 | Show a kanban with Backlog, Ready, Active, Review, Done and Blocked | FR-007.1 | AC-001, AC-002 |
| FR-02 | Show cards with number, title, description and state; priority deferred (PD-041) | FR-007.2 | AC-003, AC-004, AC-005, AC-024 |
| FR-03 | Show task and criteria progress where data exists, and the last change | FR-007.3 | AC-006, AC-025 |
| FR-04 | Show the latest run with provider and status | FR-007.4 | AC-007 |
| FR-05 | Provide the spec detail view | FR-007.5 | AC-008, AC-009, AC-010, AC-027, AC-028 |
| FR-06 | Filter by state, provider and named spec set; priority deferred (PD-041) | FR-007.6 | AC-011, AC-012, AC-022, AC-023 |
| FR-07 | Sort by number, title and last change; priority deferred (PD-041) | FR-007.7 | AC-013 |
| FR-08 | Keyboard operation of every board action; no colour-only cues; themes | FR-007.8, §13 Usability | AC-017, AC-018, AC-026 |
| FR-09 | Drag & drop as the move interaction, handed to 0008 for Ready → Active | FR-007.9 | AC-014, AC-015, AC-016 |
| FR-10 | Live update after file changes and run events | no FR; handoff AC-007.7 | AC-019 |
| FR-11 | In-area empty and error states | §13 Usability | AC-020, AC-021 |

*Amended by 0017 (PD-060/PD-061): void (PD-060).*

*Amended by 0015 (PD-055/PD-056): FR-10: drop "run events" and "run-event notification".*

*Amended by 0015 (PD-055/PD-056): FR-09: an accepted Ready → Active request shows the next step.*

*Amended by 0015 (PD-055/PD-056): FR-06: filters by state and named spec set.*

*Amended by 0015 (PD-055/PD-056): FR-04 is void (no run on the card).*

## 8. Data requirements

- **Read only**, from three sources: the 0002 model (specs, plans, steps, criteria,
  traceability, return notes, diagnostics, source locations, file modification times — A-002),
  the 0003 results (state, rule ID, persisted/derived marker, Deprecated marker with successor,
  readiness, refusal reasons, verification status, status history, the S-BLOCKED conditions —
  A-006) and the 0004 run store (runs per stem: provider, status, timestamps, flags; the store
  state).
- **From the shell (0005):** the selected spec and navigation requests with an optional filter
  (PD-039, PD-040).
- **View state:** filters and sort order, kept while the panel stays open (§6.5).
- No sensitive data. Spec content stays local and is never sent anywhere (handoff §13 Privacy).

## 9. UI/UX requirements

- UI language English (PD-016). The board fills the Spec Board area, the detail view sits in
  the Spec Explorer area of the Studio panel (0005, PD-042).
- The rules for card content, the detail view, the states and accessibility are in §6.1–§6.8.
  The English texts not fixed there (column hints, the no-selection hint, the hand-off
  announcement, "file not found") are written in the plan.
- Accessibility follows handoff §13: essential information without opening Markdown, no
  colour-only cues, keyboard-operable board actions, VS Code themes.

## 10. Interfaces and integrations

- **0002:** model and change notifications (input).
- **0003:** per-entry results, the transition check, the status history (input).
- **0004:** runs per stem, the store state, run-change notifications of this window (input).
  A second window sees runs written by the writer window only at its next refresh — an accepted
  limitation (Gregor, 2026-11-16; PD-030).
- **0005:** panel, areas, the selected spec, the navigation request (area plus optional target:
  a spec by stem or a board filter), every panel-level state (PD-036, PD-039, PD-040).
- **0006:** asks the shell to open the board with a filter (a state, or a named spec set) or
  the detail of one spec. The filter's encoding is shared with 0006 and 0012 and is agreed in
  the plan of whichever is planned first (0006 OP-1).
- **0008:** receives an accepted Ready → Active request with the stem (PD-045).
- **Editor:** "Open file" opens a workspace file at a location.

## 11. Security, permissions and privacy

- Read-only for `.specs/`, `.memory-bank/` and `AGENTS.md` (PD-013).
- The UI reaches files only through the extension. This restates the boundary in the
  `AGENTS.md` architecture snapshot, which is authoritative.
- "Open file" opens only paths inside the active project root (PD-044).

## 12. Non-functional requirements

*Amended by 0015 (PD-055/PD-056): drop "run status" and "run events".*

- UI freshness (PD-047): the board and the detail view show a change within 500 ms after they
  receive the model-changed notification or a run-event notification. It is decided by an
  automated component test on the model of the generated 200-spec fixture (PD-035).
- The model's own budget — file change to updated model — is 0002's and stays PD-035. This
  spec adds no bound of its own to it.
- One column can hold most of a project's cards (Done in a mature project). The 500 ms bound
  holds for that shape too.

## 13. Error cases and edge cases

*Amended by 0015 (PD-055/PD-056): the rows "Ready → Active before 0008 exists" and "… in Restricted Mode, in a reader window, or with a run active" read: the next step is shown (0015 AC-006, AC-008).*

| Case | Expected behaviour |
| --- | --- |
| Spec file unreadable | Card in the column 0003 derives (Done, Blocked, or by its folder; 0003 AC-019) with a diagnostic badge; other cards unaffected |
| Duplicate number or stem | Every file keeps its own card, each with a duplicate diagnostic (PD-019) |
| Spec without a first paragraph | "No summary" |
| Plan without countable steps, or no table | That figure reads "not available" |
| Run store unavailable | Card shows "Runs: not available"; runs and status history in the detail show *not available* |
| Latest run "history unreadable" | Card shows that text in place of the status |
| Selected spec moves between lifecycle folders | Selection and detail view stay (PD-039) |
| Selected spec's stem disappears (deleted, renamed, renumbered) | Selection cleared with the shell's notice (PD-039); the detail shows the no-selection hint |
| Card being dragged while its file changes | The drop is judged against the latest snapshot; the board shows the files' state |
| Drop on the own column or outside every column | No request |
| Filter hides every card | Columns show "N hidden by filter" and the "Clear filters" button |
| Filter arrives with a navigation request | It replaces the filters set before |
| "Open file" on a file that is gone since the snapshot | The UI says the file was not found and opens nothing |
| Ready → Active before 0008 exists | Refused with "Agent start is not available yet" |
| Ready → Active in Restricted Mode, in a reader window, or with a run active | Handed to 0008, which refuses with its own reason (ADR-001 §14, PD-005, PD-030) |
| Active project changes | Filters cleared; selection handling is the shell's (0005) |
| A run is written by another window (PD-030) | Not pushed to this window; its board shows it at its next model change or refresh (accepted limitation, Gregor, 2026-11-16) |

*Amended by 0017 (PD-060/PD-061): the rows "Card being dragged while its file changes" and "Drop on the own column or outside every column" are void (PD-060).*

## 14. Acceptance criteria

**AC-001** The board shall show every spec entry (one file, PD-018) that the spec repository
(0002) delivers and that no filter hides as exactly one card. Entries that share a number or a
stem shall each get their own card. *(handoff AC-007.1, PD-019)*

> **Given** a project with 9 spec files, two of them with the same number, and no filter set
> **When** the board renders **Then** it shows 9 cards.

**AC-002** The board shall place each card in exactly one of the six columns, namely the one
matching the state 0003 derives for its entry. *(AC-007.2)*

> **Given** fixture specs that 0003 derives as Ready, Active, Review and Done **When** the board
> renders **Then** each card appears once, in the column of its state.

**AC-003** The board shall show on every card the spec number, the title 0002 delivers and the
state label as text, and for Ready, Review and Blocked a *derived* marker with the rule ID.
Where a spec has no title, the card shall show its file stem in the title's place. *(AC-007.3)*

*Amended by 0016 (PD-059, proxy): AC-003 — the derived marker reads as 0016 T-09 with the rule ID in the tooltip (T-08); the badge counts *Problems* (T-05); a Backlog card shows a need (0016 §6.3).*

**AC-004** The card shall show as description the first non-empty paragraph under the spec's
first second-level heading, skipping all text before that heading, or "No summary" when there
is no such heading or paragraph. The card shall limit the description to two lines. *(PD-043)*

> **Given** a spec whose header lines are followed by a "Handoff reference: …" paragraph and
> then `## 1. Summary` **When** its card renders **Then** the description is the first
> paragraph under `## 1. Summary`.

**AC-005** The board shall show no priority on any card and shall offer no filter and no sort
by priority. The detail view shall show "Priority: not available". *(PD-015, PD-041)*

*Amended by 0016 (PD-059, proxy): AC-005 — second sentence: no element shows a priority; the README says once why (0016 T-13).*

**AC-006** The card shall show task progress as the number of ticked steps and the number of
all steps of the plan named in §6.2, not counting struck steps. It shall show criteria progress
as the number of `verified` rows and the number of all rows of 0003's verification status.
Where there is no such plan or it has no countable step, the task figure shall read "not
available". Where 0003 reports the verification summary as *not available*, the criteria figure
shall read "not available". The Verification section of the detail view shall show the same
criteria numbers as the card. *(PD-043)*

**AC-007** The card shall show the provider and run status of the spec's latest run — the run
of its stem created last — next to the state label and never in its place. It shall show
"No run" when the stem has no run, "Runs: not available" while the run store's state is
*unavailable*, and "history unreadable" in place of the status when 0004 reports the latest run
so.

*Amended by 0015 (PD-055/PD-056): void (no run on the card).*

**AC-008** When the developer activates a card by click or Enter, the board shall ask the shell
to open Spec Explorer with that spec selected, and the detail view shall show that spec.
*(AC-007.4, PD-040, PD-042)*

**AC-009** The detail view shall show every acceptance-criterion definition that 0002 delivers
for the spec, with its full text as delivered, its Given/When/Then illustration, its
*uncertain* flag and its *struck* flag. It shall show every `FR-` requirement 0002 delivers for
the spec. It shall show each ID exactly once: the text as delivered loses only its own leading
list marker, ID and separator (revised 2026-11-16, first visual check), and in the plan's stage
list a stage line loses its list number, which the list adds again. Where 0002 delivers none, the Requirements section shall show "No `FR-` requirements
found" and still offer "Open file" on the spec. *(AC-007.5, PD-034)*

**AC-010** The detail view shall show the detail sections Overview, Requirements, Acceptance
criteria, Plan & tasks, Verification, Related artifacts and Agent history with the content
§6.4 lists. It shall offer "Open file" exactly where §6.4 names a source file — spec, plan,
archived plan, return note — that exists inside the active project, and never for runs, the
status history or "No plan yet". When the developer activates "Open file", the system shall
open that file in the editor at the source location 0002 delivers for the item, or at the top
of the file where 0002 delivers none. If the file no longer exists, then the system shall say
so and open nothing. *(PD-044)*

*Amended by 0016 (PD-059, proxy): AC-010 — the Overview shows needs in place of R-1…R-7, *Problems* below "Next step" and format notes collapsed; no priority or verdict line (0016 §6.2, T-13).*

*Amended by 0015 (PD-055/PD-056): the list of sections adds "Next step" above the sections (0015 AC-003).*

**AC-011** Applying, changing or clearing filters or sort order shall not change any spec's
state, any 0003 result, or any file. *(AC-007.6)*

**AC-012** While a filter hides cards in a column, that column shall show the number of hidden
cards, and the board shall offer "Clear filters". When the developer activates "Clear filters",
the board shall remove every filter, a named spec set included.

**AC-013** The board shall sort the cards within each column by spec number ascending by
default, and on request by title from A to Z or by last change, newest first. It shall order
ties by stem, then by path, and shall place cards without the sort value last.

**AC-014** When the developer requests a move by drag & drop, "Move to…" or the command
`FeatherSpec: Move Spec to…`, the board shall submit it to 0003's transition check. If 0003
refuses it, then the board shall leave the card in its column and show 0003's reason. A drop on
the card's own column or outside every column shall submit nothing. The command shall act on
the focused card, else on the selected spec, else on the spec the developer picks from a list
of the project's specs. *(PD-045)*

*Amended by 0017 (PD-060/PD-061): void (PD-060).*

**AC-015** When 0003 accepts a Ready → Active request, the board shall hand it to the start
workflow of 0008 with the spec's stem and shall leave the card in Ready. While no start
workflow is available to the board — the case until 0008 is implemented — the board shall
refuse the request with "Agent start is not available yet". *(PD-045)*

*Amended by 0017 (PD-060/PD-061): void (PD-060).*

*Amended by 0015 (PD-055/PD-056): an accepted request shows the next step (0015 AC-006).*

**AC-016** The board shall not create, modify, move, rename or delete any file under `.specs/`,
`.memory-bank/` or `AGENTS.md`, for any move request or other board action. *(PD-013)*

*Amended by 0017 (PD-060/PD-061): "for any move request or other board action" reads "for any board action, Copy included".*

**AC-017** A developer using only the keyboard shall be able to reach every card, move to the
previous and next card of a column with Up and Down, move to the nearest column that shows a
card with Left and Right, open the detail view with Enter, reach the card's "Move to…" button with Tab, open
its menu from that button and choose a target in it, and reach and operate every filter, the sort control, "Clear filters"
and every "Open file" link. *(AC-007.8)*

*Amended by 0017 (PD-060/PD-061): "Move to… button … opens the menu … choose a target", Shift+F10 and the context-menu key: Tab from the card reaches its Copy, Enter or Space copies, Shift+F10 and the context-menu key open no Studio menu (0017 AC-006).*

**AC-018** The board and the detail view shall show every board state, run status,
verification summary, marker (§6), refusal and "not available" message as text, and every board
state and diagnostic badge with an icon as well. The board shall announce the result of every
move request to screen readers: the refusal with its reason, or the hand-off to the start
workflow.

*Amended by 0017 (PD-060/PD-061): "announce the result of every move request" is void; Copy feedback is announced per 0016.*

*Amended by 0015 (PD-055/PD-056): drop "run status" and the hand-off to the start workflow.*

**AC-019** When the board or the detail view receives a model-changed notification or a
run-event notification, it shall show the new content, state and run status within 500 ms,
without a manual reload, for the model of the generated 200-spec fixture. Keyboard focus shall
stay on the card of the same spec where that card still exists. *(AC-007.7, PD-047)*

*Amended by 0015 (PD-055/PD-056): drop "run-event notification".*

**AC-020** If a spec, its plan or its return note has a diagnostic, then the board shall show a
diagnostic badge on that spec's card and shall leave the content, column and actions of every
other card unchanged. The board shall show every diagnostic that is tied to no spec entry
(project scope, orphan plan, unlinked return note) in one banner above the columns.

*Amended by 0016 (PD-059, proxy): AC-020 — the badge counts *Problems* only; the banner follows 0016 AC-009.*

**AC-021** While the project has no specs, the board shall show "No specs yet" with the hint to
run `/sdd-specify`. While a column holds no card before filtering, it shall show a one-line
hint. The board and the detail view shall show no loading state and no load-error state of
their own. *(PD-036)*

**AC-022** The board shall show exactly the cards that match every filter that is set: the
board state, the provider of the latest run ("No run" included), and a named spec set by its
stems. When a navigation request carries a filter, the board shall replace the filters set
before with it and show it as set and clearable. *(PD-040, PD-041)*

*Amended by 0015 (PD-055/PD-056): filters by state and named spec set.*

> **Given** 9 specs, 3 of them named in a set "Needs attention", and a state filter set by the
> developer **When** a navigation request arrives with that set **Then** the board shows those
> 3 cards, shows the label "Needs attention" as a set filter, and the state filter is gone.

**AC-023** While the Studio panel stays open, the board shall keep the filters and the sort
order, also after the panel was hidden and shown again. After the panel was closed and
reopened, or VS Code was restarted, the board shall show no filter and the default sort order.
When the active project changes, the board shall clear the filters.

**AC-024** The board shall show on every Blocked card each S-BLOCKED condition that holds, on
every card in state Backlog the failing readiness precondition with the lowest ID and its
reason, and on every card of a Deprecated spec the *Deprecated* marker. The Overview shall show
the successor as 0003 reports it, and the readiness checks only for an entry in `backlog/`.
*(handoff §4.2, 0003 AC-013)*

*Amended by 0016 (PD-059, proxy): AC-024 — the readiness checks read as needs (0016 §6.3, T-11); no check ID is visible.*

**AC-025** The card shall show the last change: the newer file modification time of the spec
file and the plan named in §6.2. *(PD-043)*

**AC-026** The board and the detail view shall take every colour from the active VS Code theme
and shall keep every text and focus outline visible in a light, a dark and a High Contrast
theme.

**AC-027** The Agent history section shall list the spec's runs, newest created first, with
provider, status and timestamps, and no run events. It shall show the status history of 0003
under the label "Observed by Studio while it was running — not a reconstruction". While the run
store's state is *unavailable*, it shall show *not available* for both.

*Amended by 0016 (PD-059, proxy): AC-027 — entries read as 0016 T-14; the label as T-15.*

*Amended by 0015 (PD-055/PD-056): the section is "Status history".*

**AC-028** When the selected spec moves between lifecycle folders, the detail view shall keep
showing it. While no spec is selected, the detail view shall show a hint to select one and no
spec content. *(PD-039)*

Who decides: AC-001–AC-016, AC-019–AC-025, AC-027 and AC-028 are decided by unit tests over the
fixture set (featherspec-format §11) and by UI component tests; the test level per criterion is
set in `/sdd-plan`. AC-016 is also decided by a test that fails on any file write. AC-019's
500 ms is decided by an automated component test (PD-047). AC-015's second sentence is decided
with no start workflow registered. AC-017 and AC-018 are decided by component tests plus
Gregor's manual keyboard-only pass in the panel. AC-026 and the two-line limit of AC-004 are
decided by Gregor's manual check in a light, a dark and a High Contrast theme. Message texts
that §9 leaves to the plan are asserted by kind, not by wording.

Revised 2026-11-17 (Gregor delegated the closing checks, 2026-11-17): the manual parts are
checked by Gregor or his delegate. AC-017 and AC-018 are decided by the component tests (focus
model, Tab onto "Move to…", menu, live region text); AC-026 and the two-line limit of AC-004
by the CSS guard tests (theme variables only, visible outlines, `line-clamp: 2`) plus the
delegate's check of the screenshots `02-spec-board-*` and `04-spec-explorer-detail-0002-*`
in Light, Dark and High Contrast (headless Chrome with the real core, 2026-11-17). What only a
person in a real VS Code window can judge — the keyboard-only pass, a real screen reader
reading the announcements, focus outlines in the three real themes — is a pre-release
checklist item for Gregor.

## 15. Technical notes for developers or AI agents

- Brownfield check: no source module exists yet (`architecture: modules: []`); nothing to reuse.
- ADR-001 §11 names `@dnd-kit/react` 0.5.3 with native HTML5 DnD as fallback, plus the mandatory
  "Move to…" alternative. Decided (Gregor, 2026-11-16): native HTML5 DnD, no new dependency.
- Keys for the "Move to…" menu: the context-menu key or Shift+F10 where the platform has them,
  and a menu button on the card that works on every platform (macOS has neither key). The button
  is reachable with Tab on every platform (decided 2026-11-16, `/sdd-compile`): it is a tab stop
  of the card that is the board's current tab stop, so the board stays one card stop plus one
  button stop and not one stop per card.
- ADR-001 rejects `retainContextWhenHidden`. Decided (Gregor, 2026-11-16): filter and sort live in
  extension memory, per panel, not in webview state; they survive hiding and a rebuild of the
  content (§6.5), and a restart or a closed panel ends them, so no restore flag is needed.
  Domain state is rebuilt from the host snapshot (ADR-001 §7).
- Card and detail data should be shaped in a pure core view model (no `vscode` import, *Core
  purity*), so most criteria are unit-testable without the webview.
- The description comes from 0002's sections with raw content. Do not locate it by heading
  text; headings vary by language (featherspec-format §3.3). Take the first section that has a
  heading (PD-043).
- For `/sdd-plan` to decide: where a refusal message sits and how long it stays; which card of
  the target column takes the focus on Left/Right, and where focus goes when its card is gone;
  scrolling inside a long column; whether inline Markdown in the description is rendered.
- Quality gates per step: `.memory-bank/techContext.md` *Quality gates*.

## 16. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | The run store answers "runs of stem X, newest created first" and reports its state | 0004 AC-008, AC-025 | Card and agent history need a re-plan |
| A-002 | 0002 delivers the modification time of every file it reads | PD-043 decides it; 0002 §8 does not list the field yet (OP-008) | "Last change" and its sort have no source until 0002 is aligned |
| A-003 | *Withdrawn 2026-11-16.* Replaced by PD-043: the description is the first paragraph under the first second-level heading | — | — |
| A-004 | *Withdrawn 2026-11-16.* Replaced by PD-041: filters by state, provider and named spec set | — | — |
| A-005 | Proxy decisions PD-002, PD-013, PD-014, PD-015, PD-016 hold | The PD register records them as proxy decisions that follow the handoff's own proposals (P2, §6.3, §6.5); same basis as 0003 A-008 | Move, priority and language rules change (OP-002) |
| A-006 | 0003 reports which S-BLOCKED conditions hold for a Blocked entry, and which plan §6.6 uses | Handoff §4.2 asks for the blocking reason on the card; 0003 §6.1 defines the two conditions; added to its output (0003 AC-027, AC-028) on Gregor's approval, 2026-11-16 | The card can only say "Blocked (S-BLOCKED)" |
| A-007 | 0005 offers the navigation request, keeps the selection by stem and hosts the detail view in Spec Explorer | PD-039, PD-040, PD-042; 0005 as written still selects by number and has no navigation request (OP-008) | AC-008 and AC-028 have no counterpart; 0005 is realigned first |

*Amended by 0015 (PD-055/PD-056): A-001 is void.*

## 17. Open points

Open — Gregor decides; the recommendation is not applied:

- OP-002: The proxy decisions PD-002, PD-013, PD-014, PD-015, PD-016 (A-005) await Gregor's
  confirmation. Recommendation: confirm as written; they follow the handoff. A change means
  revising §6.6 and §4.

Cross-spec, for the main session (no product decision):

- OP-008: (a) 0002 §8 has to list the file modification time (PD-043, A-002). (b) 0003's output
  has to name the S-BLOCKED conditions that hold (A-006). (c) 0005 has to be realigned to
  PD-039, PD-040 and PD-042 (A-007). (d) The filter encoding shared with 0006 and 0012 is
  agreed in the first plan that needs it (0006 OP-1).
  State at `/sdd-plan` (2026-11-16, [plan](../plan-archive/0007-spec-board-spec-detail.2026-11-17.plan.md) *Research*):
  (a) holds in code — 0002 delivers `modifiedMs` for every file it reads; only 0002 §8's text
  lags. (b) not in code — the plan adds the blocking conditions to 0003's output as an additive
  change (T-002). (c) done by 0005's revision and plan. (d) the plan proposes encoding v1, owned
  by this spec; 0006 uses it (OP-010).

Resolved:

- OP-010 (2026-11-16, Gregor, approving the plan): the additive changes to 0003 (which blocking
  condition holds, which plan is in use) and to 0004 (a notification when runs change) are
  made in their own specs and plans; the board filter encoding is owned by this spec
  (`src/shared/protocol/boardFilter.ts`, covers the named set of PD-041: label and stems) and
  0006 uses it; filters are kept in extension memory; no drag-and-drop library; a second window
  sees new runs at its next refresh (limitation, §13).
- OP-001 (2026-11-16): the "1 s of the save" bound is replaced by PD-047 (500 ms after the
  notification, automated test). The re-measurement on a real project stays with 0002 OP-001.
- OP-003 (2026-11-16): interview questions 2–8 were asked in one message at Gregor's explicit
  request, a one-off exception to `/sdd-specify`'s one-question rule.
- OP-009 (2026-11-16): `/sdd-clarify` listed 71 findings, 12 blocking. Gregor decided the
  blocking ones in the PD register and delegated the rest; the walkthrough ran in bulk at his
  explicit request, a one-off exception to the one-finding-per-message rule.
  - PD-019: every duplicate keeps its own card. PD-039, PD-040, PD-042: the detail view lives
    in Spec Explorer, opened through the shell, selection by stem, one "no longer in the
    project" notice. PD-041: filters by state, provider and named spec set; no priority.
  - PD-043: description, criteria progress from 0003's verification status, last change.
    PD-044: "Open file". PD-045: transition check and hand-off to 0008. PD-036, PD-038: the
    shell owns loading and load error. PD-047: 500 ms.
  - Decided by a neighbouring spec: latest run and run order (0004 AC-008), the plan used for
    progress (0003 §6.6), the Deprecated marker (0003 AC-013), struck steps (featherspec-format
    §4.4), start refusals (0008; ADR-001 §14, PD-030), a filter from Mission Control replaces the
    filters set before (0006 AC-012).
  - Wording and testability: terms defined (§6); AC-001, AC-003, AC-004, AC-006, AC-007,
    AC-010, AC-013, AC-015, AC-017, AC-018, AC-020 made decidable; AC-022 to AC-028 added for
    rules without a criterion; key names and container moved to §15; A-003 and A-004 withdrawn.
  - Readings made while applying the decisions; say so if one is wrong: (a) closing the panel
    resets filters and sort, hiding it does not; (b) sort directions and tie order as in §6.5;
    (c) the provider filter looks at the latest run; (d) "Move to…" lists the five other
    columns, and a drop on the own column is no request; (e) Left/Right skip columns without a
    card; (f) a step with an undetermined tick counts as not ticked; (g) a column hint shows
    only where the column is empty before filtering; (h) a project change clears the filters;
    (i) while a stem is duplicated every entry shows the stem's runs; (j) "Open file" opens at
    the top where 0002 has no location, and says so when the file is gone; (k) focus stays
    with the spec on a live update; (l) the reason given for not persisting filters across a
    restart (§4).
  - Parked: OP-002.
- OP-004 to OP-007 (2026-11-16, Gregor): a spec without `FR-` IDs shows "No `FR-` requirements
  found" (PD-034 allows no section to be found by its meaning); a card without a title shows
  the file stem; the move command acts on the focused card, else the selected spec, else a
  pick list; readiness checks appear in the Overview for `backlog/` entries only.

## 18. Definition of Ready

Goal and problem, users, scope and out-of-scope are documented. Card, detail, filter, move and
accessibility rules are testable. The happy path and the error cases are described. The
criteria are measurable. Data and interfaces are clarified or recorded as assumptions, and the
open points are visible.

## 19. Definition of Done

All must-requirements are built and AC-001 to AC-028 pass. No out-of-scope behaviour was added:
in particular no file writes and no agent start. Gregor's manual keyboard and theme check is
done. Assumptions are verified or documented. The architecture snapshot is updated for the new
modules. Gregor accepted the result.

Revised 2026-11-17: the keyboard and theme check is done by Gregor or his delegate (§14); the
checks that need a real VS Code window are pre-release checklist items, and the acceptance is
the closing run Gregor delegated on 2026-11-17.

## 20. Recommended next steps

1. Main session: OP-008 — align 0002, 0003 and 0005.
2. Gregor: OP-002, non-blocking.
3. `/sdd-plan` after 0002–0005 are planned, since they define this spec's inputs.

## Plan history

- 2026-11-17 — [0007-spec-board-spec-detail.2026-11-17.plan.md](../plan-archive/0007-spec-board-spec-detail.2026-11-17.plan.md) — T-001 to T-014 built; second `/sdd-compile` READY (manual items: 3, pre-release checklist); host suite green on Windows at e6f0c85.
