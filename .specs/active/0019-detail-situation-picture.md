# Spec Detail as a Situation Picture Beside the Content

**Status:** In Progress
**Plan:** [0019-detail-situation-picture.plan.md](0019-detail-situation-picture.plan.md)

*Amended by 0021 (PD-069): wherever this spec names the control "Copy" of a prompt (a next step or `/sdd-specify`), read `Copy prompt`, named as 0021 §6.4; the feedback stays; wherever it shows a next step line, 0021 §6.1 gives each line its intent.*

*Amended by 0024 (PD-068): where Send is offered (0024 §6.2), the Copy prompt of the detail's first next-step line and of the first Now row is 0024's split button `Send to <Name>` — for its place, what follows it, its width ("every Copy", "the widest Copy") and the primary count (once, both parts primary); its menu holds Copy prompt (0024 §6.3, AC-002, AC-003).*

Owns R-07 and R-11 of the UX audit (`docs/ux-audit/` 05; K-E, K-I in 04; 03 §5.2, §6; evidence
02 §3.7, screenshots 06, 19, 19a, 24). Decisions: PD-058, PD-059, PD-061 (2). Guidelines 1, 3, 5–9.
Builds on 0016 (tiers, texts, history), 0017 (next step, Copy), 0018 (Overview, compact board),
all implemented first; 0020 removes the Spec Explorer area and relies on this side panel.

## 1. Summary

The detail stops re-rendering spec and plan. It shows where the spec stands — next step,
progress with the open criteria and the next open step, problems, files — and sends the
developer to the file beside the panel, at the line of every ID. It opens as a side panel in the
current area (Overview, Board) instead of switching to Spec Explorer.

## 2. Goal and problem

The detail is a second Markdown renderer: the detail of spec 0015 measured 4,952 px and 3,459
words (audit 02 §3.7, IA-5); what `/sdd-compile` needs — open criteria, next step — is lost in the
volume. A card switches area; "Open file" hides the Studio tab (Q-6, screenshot 24). Goal: "where
does this spec stand, what is missing?" answered without scrolling, the content one click away
beside the visible Studio. Measured by AC-010 (words), AC-022 (height) and AC-001 (zero area changes).

## 3. Users and roles

Developer (one role), as in 0005–0007; workshop participants use the same surface.

## 4. Scope

### In scope

- Side panel for the selected spec in Overview and Board: open, close, width, drawer, focus, keyboard, restore.
  *Amended by 0023 (PD-069): §3 — also in the Plan map from a 900 px panel, without its Plan section; below 900 px the map shows alone (0023 §5.3).*
- Detail content of §6.2; no full text of requirements, criteria, plan steps or verification logs.
- A line per ID; every ID and file link opens the file beside the panel at its line.
- The Spec Explorer area keeps list + detail pane, with the new content, until 0020.
  *Amended by 0020 (PD-058): §4 in scope "The Spec Explorer area keeps …" — void: no Spec Explorer area, list or pane; the side panel is the only detail (0020 §5).*

### Out of scope

- A "Full content" toggle — because guideline 5 forbids duplicating the editor and no test-decidable need exists (A-001, OP-001).
- Phase bar (K-H) and diagnostics in VS Code's Problems panel — because PD-061 (2) defers them.
- Removing the Spec Explorer area and the tree — because 0020 owns R-05.
- Next step lines, Copy and its feedback, card and Overview content, diagnostic tiers and their texts, the readable history — because 0016–0018 own them; this spec only places them.
- Spec header lines (Status, Plan, Ticket, Origin, Validated by, Clarified) and the readiness checklist — because the file shows them at its top and 0016 replaces readiness by a need text (A-007).
- A resizable or configurable side panel width, or a setting for the editor column — because no need is measured; one width and `Beside` follow the audit (A-003).
  *Amended by 0022 (PD-069): §4 out of scope — the width is resizable and remembered (0022 §4.7 G-2, G-3).*
- Editing anything from the detail — because the Studio is read-only (PD-013).

## 5. Amendments of other specs

The plan applies them as inline notes "*Amended by 0019 (PD-058): …*" in the implementing change
set, as 0015 did. Statements already amended by 0015–0018 are read as amended. The PD register is
history and is not edited: PD-058 already supersedes PD-042 (the fix round of the compile S48 only appends PD-066).

| Spec · statement | Amendment |
| --- | --- |
| 0005 BR-03 | The side panel shows exactly while a spec is selected; closing it clears the selection (AC-003) |
| 0005 BR-07 sentence "this is how the board and Mission Control open a spec's detail in Spec Explorer (PD-042)" | Void: they select in place (AC-001); a spec target keeps its meaning |
| 0005 AC-007, AC-008 (Spec Explorer list) | Stay until 0020; the pane beside the list shows AC-008's detail |
| 0006 BR-08 rows "An attention row", "An activity entry", AC-014 (as rebuilt by 0018); 0017 AC-012, 0018 O-5, AC-006 "send 0006 AC-014's request" | Activating such a row or entry selects its spec in place (AC-001), no request "Spec Explorer, that spec"; the not-found notice stays |
| 0007 §1, §4 first in-scope bullet, §5 step 4, §9 first bullet "detail view … in the Spec Explorer area"; FR-05, AC-008 | The detail is this spec's side panel in Overview and Board and the Spec Explorer pane until 0020; a card selects in place (AC-001) |
| 0007 §6.4 table and its "Open file" bullet; AC-009, AC-010, AC-027 | Replaced by §6.2 and AC-009–AC-019; §6.4's other bullets stay. AC-009 void. AC-010's section list and per-section "Open file" void; its open-at-location and not-found sentences continue as AC-017–AC-019. AC-027's history is the collapsed section of AC-015 |
| 0007 AC-006 last sentence "The Verification section …" | The Criteria row of Progress shows the card's numbers (AC-012) |
| 0007 §6.7 "Enter opens the detail view", "every Open file link"; AC-017 same parts | Enter opens the side panel (AC-004); "every link of the detail" |
| 0007 §13 rows "stem disappears … no-selection hint" and "'Open file' on a file that is gone"; AC-028 "hint to select one" | The side panel closes (AC-020); AC-019; the hint applies to the Spec Explorer pane only |
| 0013 §3.4 detail bullets (header "Open file", sections, per-section Open file, inline Markdown and tidying of file text) | Header per §6.2 row 1; collapsible: Format notes and Status history only; no file text. The safe inline renderer and AC-014 stay for problem and note reasons, which quote file text |
| 0013 AC-003 list "section 'Open file'", "related-artifact link" | The side panel's close button, links and toggles (AC-021) |
| 0013 AC-012 | Applies to Status history, which starts collapsed; Format notes follow PD-063 (5): collapsed on every showing, no memory (AC-015) |
| 0013 AC-013, AC-015 | Void (no per-section "Open file", no full text) |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030 (test audits) | Also except the tests 0019 AC-023 lists against a criterion this table voids or replaces |
| 0013 AC-017 detail screenshots | Replaced by AC-022 |
| 0015 AC-012 | The section is collapsed, headed "Status history (n)", hidden at zero entries; the not-available text with its reason stays (§6.2 row 7) |
| 0016 §6.2 detail row "toggle T-07 in Overview"; its §5 row on 0007 §6.4 Overview | No Overview section: T-07 heads section 6, needs sit in Progress, the history in section 7 (§6.2) |
| 0016 AC-012 detail part | In the detail, T-09's sentence is in the state chip's tooltip and in visually hidden text, not visible text (audit 03 §5.2, as 0018 B-6) |
| 0016 AC-016 | Void in the detail with the full text: criteria show as plain short titles, no `*` or `_` left (AC-013) |
| 0018 §2 goal, AC-031 "visible without horizontal scrolling" | Hold with no spec selected; with the side panel the board scrolls (§9) |
| PD-042 (register not edited) | Superseded in part by PD-058: Board and Overview show the detail as a side panel; 0020 ends the Spec Explorer part |

*Amended by 0020 (PD-058): §5 row "0005 AC-007, AC-008 … stay until 0020" — void: the list ends with 0020 (0020 §5).*

## 6. Business rules

### 6.1 Side panel

*Panel* is the Studio panel; *side panel* this detail beside the area; *pane* the Spec Explorer
detail until 0020; *Overview row* a Now, Up next or Problems row of a spec (0018).
*Amended by 0020 (PD-058): §6.1 "Spec Explorer until 0020" (the word "pane") — void: no pane; the side panel is the only detail (0020 §5).*

- **Open.** Activating a board card, an Overview row or an Overview activity entry whose spec is
  in the project (click, Enter, Space) selects the spec (0005's select message) and shows the side
  panel in the current area. Never an area switch, never a navigation request (guideline 8). The
  side panel shows whenever a spec is selected, whoever set the selection (list, restore, 0020's
  tree); 0017's current spec follows the same selection.
  *Amended by 0023 (PD-069): §6.1 *Open* "shows the side panel in the current area" — also in the Plan map from a 900 px panel; below, the map shows alone (0023 §5.3).*
- **Place.** Panel ≥ 900 px wide: 400 px at the right edge beside the area content, own scroll.
  Narrower: a drawer over the area from the right edge, min(400 px, the width of the area frame)
  wide; the Board's content keeps its width; the Overview's content takes the width left of the
  drawer (PD-066): its end padding is the drawer's width and its rows take the two-line layout of
  0018 T-013, so every row with its next step and Copy and the figures line stay visible.
  Non-modal in both (`role="complementary"`, accessible name "Spec detail").
  While the drawer is shown, a card, or a control inside a card, that receives focus is scrolled clear of it
  (A-003).
  *Amended by 0022 (PD-069): §6.1 Place — beside the area at a width the developer sets by the divider, remembered (0022 G-2, G-3), one scrollbar for the area and one for the detail (0022 G-1); below 900 px the area or the detail alone, no drawer (0022 G-4).*
- **Close.** The close button, or Escape inside the side panel, clears the selection; focus moves
  to the card or Overview row that opened the side panel while it is shown, else to the spec's
  first card or Overview row in DOM order, else to the area's first focusable element.
  *Amended by 0021 (PD-069): §6.1 Close and AC-003 — not while a toggletip is open: that Escape closes only the toggletip, the next closes the side panel (0021 AC-014).*
  *Amended by 0022 (PD-069): §6.1 Close — below 900 px the detail shows alone with a back button in place of the close button; Escape inside the detail does the same (0022 AC-029).*
  *Amended by 0024 (PD-068): §6.1 Close and AC-003 — not while 0024's Send menu is open: that Escape closes only the menu; the next Escape clears the selection (0024 AC-008).*
- **Focus.** Opening from a card, Overview row or activity entry moves focus to the side panel's
  heading (a screen reader announces it). Tab order: close, then every control in §6.2's section
  order. A selection set outside the panel (restore, 0020's tree) moves no focus.
- **Switching area** by hand or by a drill-down keeps selection and side panel (0005 BR-03); no
  new memory: the remembered selection and area (0005 AC-009) restore it.
- **Spec Explorer until 0020.** List and pane stay (0013 §3.4); the pane shows the same detail;
  close and Escape clear the selection, the pane shows its hint and focus moves to the spec's list
  row; no side panel in this area.
  *Amended by 0020 (PD-058): §6.1 bullet "Spec Explorer until 0020" — void: no Spec Explorer area, list or pane (0020 §5).*

### 6.2 Detail content (order fixed)

| # | Section | Content |
| --- | --- | --- |
| 1 | Header | number, title (duplicated stem: its path below), one state chip, "Deprecated" with 0003's successor text where reported, close button. Chip tooltip: derived state 0016's T-09 and T-08 joined by ` · ` (as 0018 B-6), else T-10; T-09 also as visually hidden text after the chip |
| 2 | Next step | the block of 0015 AC-003 as 0016 and 0017 leave it (Copy primary, one Copy per line) |
| 3 | Problems | 0016 §6.2's detail row unchanged: each *Problem* with its reason, no heading, not collapsible; nothing when none; a reason with a file is its link (§6.4) |
| 4 | Progress | 0016's needs (Backlog) and the Steps and Criteria rows (§6.3) |
| 5 | Files | "Spec", "Plan", one "Archived plan" per archived plan, one "Return note" per note, each kind by file name; file name as link; rows for absent files are not shown |
| 6 | Format notes | collapsed on every showing, no memory (PD-063 (5)); heading 0016's T-07; expanded: each note's reason, a link where it has a file; hidden at zero |
| 7 | Status history | collapsed; heading "Status history (n)"; expanded: 0016's T-15 label and §6.4 entries in their order; hidden at zero entries; while the history is not available, heading "Status history" with 0003's "Status history not available: <reason>" ("Status history: not available" without a reason); that text is a plain section, always visible and not collapsible, so its reason is readable without a click (guideline 3) and AC-015's "collapsed" applies to a history with entries |

*Amended by 0021 (PD-069): §6.2 row 2 — as 0021 leaves the block: intents, one "Copy prompt" per line, the coach line and the `?` (About this step) beside the heading; which Copy prompt is primary: 0022 §4.4.*

*Amended by 0022 (PD-069): §6.2 row 3 — each Problem shows as its sentence, the link where the finding has a file; the reason is its tooltip (0022 §4.5).*

*Amended by 0023 (PD-069): §6.2 table (order fixed) — a new section "Plan" (0023 §5.2) between 3 Problems and 4 Progress; the Steps row of row 4 shows only while no Plan section shows, otherwise its count heads the Plan section (0023 §5.2).*

*Amended by 0024 (PD-068): §6.2 row 2 — where Send is offered, the first line's Copy prompt is 0024's split button; the further lines keep their secondary Copy (0024 AC-003).*

### 6.3 Progress

- **Steps:** from the plan of 0007 §6.2 (0003 §6.6): "<done> of <total> done" over non-struck
  steps, an undetermined tick counting as not done, with a bar; while a step is open, "Next open
  step: <ID> <title>" — the first step neither ticked nor struck, by the function NS-7 uses
  (guideline 1), its title plain and cut like a short title. No countable step (none, or all
  struck) → "No steps in the plan".
  *Amended by 0023 (PD-069): §6.3 *Steps* bullet — shows only while no Plan section shows; otherwise its count heads the Plan section (0023 §5.2).*
- **Criteria:** from 0003's traceability counts (PD-043): "<verified> of <total> verified" over all
  rows, with a bar; below, "Not verified yet:" and one entry per row whose trimmed `State` is not
  exactly `verified`, in table order; `built` adds " · built", any other value adds nothing (0016:
  free text is a format note, never read by its first word). A cell holding one ID the spec defines
  gives ID link and short title; any other cell (undefined ID, several IDs, `M-03`) its text as link
  to that row. No list when all rows are verified.
- **Short title:** the bold title when the definition reads `**AC-NNN — Title**` (separator `—`,
  `-`, `:` or `|` inside the bold); otherwise the first sentence of the text after the ID, its
  separator and any emphasis around it; a sentence ends at `.`, `!` or `?` before a space or the
  end. Plain text: emphasis and code markers removed, intraword `_` kept, `[text](target)` → text.
  Over 80 characters: cut at the last space within the first 80, then "…" (no space: after 79).
- **Needs:** for a Backlog spec, 0016 §6.3's applying needs come first, in order, each with T-12.
- **Honest absence (guideline 6):** no plan → Backlog: the needs only (they include "needs a
  plan"); Done (Baseline included): no Progress section, it can never fill; any other state: "No
  plan yet". Plan without traceability rows → Criteria "not available — the plan has no
  traceability table"; plan unreadable → both rows "not available — Studio cannot read the plan".

### 6.4 Lines and opening files

- The model delivers a 1-based line for each criterion (first definition), plan step (heading)
  and traceability row. The parser records all three today; AC-016 pins them.
- A criterion ID opens the spec at its definition, or the plan at its traceability row when the
  spec has none; another criterion cell, the plan at its row; a step ID, the plan at its heading;
  a problem or format note with a file, that file at its line (line 1 without one); a file link,
  line 1. Needs, history entries and texts without a file open nothing (PD-044).
- **Where:** in a group other than the Studio panel's, so the Studio stays visible: a link sits
  in the panel, whose group is then active, and the host passes `ViewColumn.Beside`; not as
  preview; the editor takes the focus, cursor at the line, revealed; the panel keeps its group. A
  file open elsewhere opens again beside the panel (A-011). Only files the model knows (PD-044).

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-01 | Side panel in Overview and Board; selecting never switches area | AC-001–AC-007, AC-020 |
| FR-02 | Spec Explorer keeps list + new detail until 0020 | AC-008 |
| FR-03 | Situation picture, no full text | AC-009–AC-015 |
| FR-04 | A line per ID; files open beside the panel at the line | AC-016–AC-019 |
| FR-05 | No quality loss; amendments; themes | AC-021–AC-024 |

*Amended by 0020 (PD-058): FR-02 — void: no Spec Explorer area, list or pane (0020 §5).*

*Amended by 0023 (PD-069): FR-01 — also in the Plan map from a 900 px panel (0023 §5.3).*

## 8. Texts (English, PD-016; in the text modules, asserted literally)

| New text | Replaces (today) |
| --- | --- |
| Close button: accessible name "Close spec detail", tooltip "Close (Esc)" | — (new) |
| "Progress" | section titles "Plan & tasks" and "Verification" |
| "Steps", "<done> of <total> done", "Next open step: <ID> <title>", "No steps in the plan" | the step list with tick icons and `Verified` texts |
| "Criteria", "<verified> of <total> verified", "Not verified yet:", " · built" | "Criteria: <v> of <t> verified"; "open <n> · built <n> · verified <n> · other <n>" |
| "not available — the plan has no traceability table", "not available — Studio cannot read the plan" | "Criteria: not available"; "not available" under Verification |
| "Files", "Spec", "Plan", "Archived plan", "Return note" | "Related artifacts", "No related artifacts", "Open file", "Open file: <name>" |
| Every link: accessible name = its visible text; tooltip and accessible description "Open <file name> at line <n>" | — (new) |
| "Status history (<n>)" | "Status history" |
| — (removed) | "Overview", "Requirements", "Acceptance criteria", "No FR- requirements found", "Priority: not available", "/sdd-compile verdict: not available — FeatherSpec does not persist it." |

*Amended by 0025 (PD-082): a step ID is a step link for a map-able spec: a plain activation leads into the Plan map, Ctrl or Cmd opens the plan at the step (0025 §5.1, AC-001–AC-004, AC-027); tooltip 0025 U-02.*

"No plan yet", "Deprecated", "File not found: <path>", "Spec detail", "Status history not
available: <reason>", "Status history: not available" and "Select a spec in the list to see its
details." stay as they are.
*Amended by 0020 (PD-058): §8 pane hint "stay" — void: the hint ends with the pane (0020 §5).*

## 9. Error cases and edge cases

| Case | Behaviour |
| --- | --- |
| File gone when a link is activated | AC-019 (deviation from guideline 8, named: the link's text changes) |
| Selected spec disappears | Side panel closes, focus as on close; the shell's notice (0005 AC-010) |
| Spec unreadable | Header with the stem as title; Problems names it (0016); Progress from the plan where readable |
| Duplicated stem | The selected entry (stem + path, PD-039): its path in the header, its own files |
| Many open criteria | All listed, no cap; a short title wraps (at most 80 characters) |
| Board with side panel, panel ≥ 900 px | The board's free width shrinks by 400 px; 0018 B-2's horizontal scrolling applies |
| Drawer shown, a covered card or a control in it gets focus | Scrolled clear of the drawer (§6.1); no Overview row is covered (PD-066) |
| Panel crosses 900 px while open | Switches between beside and drawer; selection and focus stay |
| File changed since the model read it (unsaved, re-read pending) | Cursor at the delivered line, kept inside the file |
| Restricted Mode, reader window | Same detail; files open editable (VS Code: "text editing is always supported") |

*Amended by 0022 (PD-069): §9 rows "Board with side panel, panel ≥ 900 px", "Drawer shown …" and "Panel crosses 900 px while open" — the width is the developer's (0022 G-2); below 900 px the detail replaces the area, no drawer; crossing 900 px keeps the selection (0022 AC-029).*

## 10. Acceptance criteria

Decided by unit and component tests unless marked manual. Fixtures: `fs110-ready-synthetic` (Ready
0001), `fs170-brownfield-mixed` (Review 0006, Backlog 0003), `fs180-de-baselines` and
`fs180-en-done-archived` (Done), and `studio-0015`, a copy of this repository's 0015 spec and plan
at commit `8052f9a` (made by the plan, like `studio-0002`).

- **AC-001** When the developer activates a board card, an Overview row or an Overview activity entry whose spec is in the project by click, Enter or Space, the system shall select that spec, show its detail in the side panel and keep the current area; it shall send no navigation request; activating a card's or row's Copy shall select nothing (0017 AC-005).
  > **Given** `fs170-brownfield-mixed` on the Board **When** the developer activates the cards of 0003, 0004 and 0006 one after another **Then** the Board is still the current area, the side panel shows 0006, and no navigation request was sent.
- **AC-002** While a spec is selected and Overview or Board is shown, the system shall show the side panel with that spec's detail; while none is selected, it shall show no side panel. Switching area by hand shall keep both.
  *Amended by 0022 (PD-069): AC-002 — "and Overview or Board is shown": below 900 px the side panel shows the detail alone (0022 AC-029).*
  *Amended by 0023 (PD-069): AC-002 — "Overview or Board is shown" also covers the Plan map from a 900 px panel (0023 §5.3).*
- **AC-003** When the developer activates the close button, or presses Escape while focus is inside the side panel, the system shall clear the selection, hide the side panel and move focus to the card or Overview row that opened it while that is shown, else to that spec's first card or Overview row in DOM order, else to the area's first focusable element.
  *Amended by 0021 (PD-069): AC-003 — Escape with a toggletip open closes only the toggletip (0021 AC-014).*
  *Amended by 0022 (PD-069): AC-003 — below 900 px the back button, or Escape inside the detail, clears the selection and shows the area again (0022 AC-029).*
  *Amended by 0024 (PD-068): AC-003 — Escape inside the side panel does not clear the selection while 0024's Send menu is open (0024 AC-008).*
- **AC-004** When the side panel opens from a card, Overview row or activity entry, the system shall move focus to its heading; with the keyboard alone the developer shall reach the close button and then every control of the side panel in §6.2's section order — Copy buttons, links, collapse toggles — and operate each with Enter and with Space.
- **AC-005** While the panel is at least 900 px wide, the side panel shall be 400 px wide beside the area content with its own scroll; while it is narrower, the side panel shall overlay the area from the right edge at min(400 px, the width of the area frame); the Board's content shall keep its width and the Overview's content shall take the width left of the drawer (PD-066). (CSS guard and unit tests on the rules; screenshots in AC-022)
  *Amended by 0022 (PD-069): AC-005 — the 400 px width and the drawer part are void: the default width is a share of the panel, resizable and remembered (0022 AC-023, AC-024); below 900 px the detail shows alone (0022 AC-029).*
- **AC-006** After a window reload with a spec selected, the system shall show the side panel with that spec on the area last shown, without user action and without moving focus.
- **AC-007** Every card and Overview row of the selected spec shall carry `aria-current="true"` and the selection background and border (0013 D-12); no other card or row shall.
- **AC-008** While Spec Explorer is shown, the system shall show the list and, in the pane beside it, the detail of §6.2 and no side panel; close and Escape shall clear the selection, the pane shall show "Select a spec in the list to see its details." and focus shall move to that spec's list row.
  *Amended by 0020 (PD-058): AC-008 — void: no Spec Explorer area, list or pane; the side panel is the only detail (0020 §5).*
- **AC-009** The detail shall show the sections of §6.2 in that order, Problems, Format notes and Status history only under §6.2's conditions, Format notes and Status history collapsed when first shown, and the header of §6.2 row 1, the path only for a duplicated stem.
  > **Given** `fs110-ready-synthetic` 0001 **Then** the chip reads "Ready", its tooltip "Plan written, not started yet · Derived from the files · rule S-READY", and the header holds that sentence as visually hidden text.
  *Amended by 0023 (PD-069): AC-009 — plus the section "Plan" (0023 §5.2) between Problems and Progress.*
  *Amended by 0025 (PD-082): also its Next step section, while the map's header shows the spec the side panel shows (0025 §5.3, D-2, AC-009).*
- **AC-010** The detail shall show no requirement text, no criterion text other than short titles, no stage or step text other than the next open step's title, no `Verified` text, no spec header line, no readiness check and none of §8's removed texts as a heading or line of its own. For `studio-0015` with both collapsible sections closed, its visible text shall contain no text of any `FR-` row of that spec and at most 300 words (today 3,459).
  *Amended by 0023 (PD-069): AC-010 "no stage or step text other than the next open step's title" — plus the Plan section's IDs, symbols and "The plan says" line (0023 §5.2).*
  *Amended by 0025 (PD-082): plus the returned-work statement U-05, the parallel hint U-06 and the group view U-08 (0025 AC-015, AC-016, AC-025).*
- **AC-011** The Steps row shall follow §6.3: `fs110-ready-synthetic` 0001 shows "0 of 1 done" and "Next open step: T-001 The feature"; `fs170-brownfield-mixed` 0006 shows "4 of 4 done" and no next open step; 0003 there shows the need "needs a plan" and no Steps or Criteria row; `fs180-de-baselines` 0001 shows no Progress section; a plan whose steps are all struck shows "No steps in the plan". For every fixture spec with a plan, the next open step shall be the step NS-7's open-step function returns for that plan.
  *Amended by 0023 (PD-069): AC-011 — the Steps row shows only while no Plan section shows (0023 §5.2).*
  *Amended by 0025 (PD-082): the progress texts end in ` · <p>%` (U-04) and every bar carries its text as `title` and `aria-valuetext` (0025 §5.4, AC-012, AC-013).*
- **AC-012** The Criteria row shall follow §6.3, one entry per row not `verified`: `fs110-ready-synthetic` 0001 shows "0 of 1 verified" and the entry "AC-001 The system shall be ready."; `fs170-brownfield-mixed` 0006 shows "3 of 3 verified" and no list; a plan with no traceability rows shows "not available — the plan has no traceability table"; `studio-0015` shows "28 of 30 verified" and exactly the entries AC-027 and AC-030, in that order, unmarked (AC-027's state is free text); a `built` row ends with " · built"; a cell `M-01, M-02` shows as that text, linked to its plan row.
  *Amended by 0025 (PD-082): the progress texts end in ` · <p>%` (U-04) and every bar carries its text as `title` and `aria-valuetext` (0025 §5.4, AC-012, AC-013).*
- **AC-013** The short title shall follow §6.3: `**AC-001 — Batch size and interval are configurable**` gives "Batch size and interval are configurable"; `**AC-002** — Dispatch is unchanged. More text` gives "Dispatch is unchanged."; a text with `` `OUTBOX_BATCH_SIZE` `` gives `OUTBOX_BATCH_SIZE` without backticks; no short title shall keep a `*` or `_` of emphasis (an intraword `_` stays); the system shall cut a short title over 80 characters at the last space within the first 80, or after 79 characters without such a space, and end it with "…"; a row whose ID the spec does not define shows the ID only.
- **AC-014** The Files section shall show one row per existing file of §6.2 with its label and file name, each kind by file name, and no row for an absent file: `fs180-en-done-archived` 0001 shows "Spec" and one "Archived plan" and no "Plan".
- **AC-015** Format notes and Status history shall start collapsed, show the headings of §6.2 and §8 and show their entries when expanded; Status history shall keep its collapse state while the Studio panel stays open, across closing the side panel and selecting another spec; Format notes shall be collapsed again whenever the detail shows a spec anew (another spec, or the same spec after a close) and remember nothing (PD-063 (5)); the system shall show neither section at zero entries.
- **AC-016** The model shall deliver these lines: `fs110-ready-synthetic` AC-001 → spec line 9, T-001 → plan line 24, its traceability row → plan line 36; `fs170-brownfield-mixed` 0006 AC-001, AC-002, AC-003 → spec lines 13, 17, 21, T-001 → plan line 70, T-004 → plan line 169. A criterion defined twice shall carry the line of its first definition.
- **AC-017** When the developer activates a link of the side panel (ID, criterion cell, problem, format note, file), the system shall send the open request with the file and line of §6.4, line 1 for a file link; no need, history entry or text without a file shall send one. Each link's accessible name shall be its visible text, and its tooltip and accessible description "Open <file name> at line <n>".
  *Amended by 0022 (PD-069): AC-017 — a Problem link's tooltip and description hold the reason, then "Open <file name> at line <n>" on its own line (0022 §4.5).*
  *Amended by 0023 (PD-069): AC-017 "accessible name shall be its visible text", tooltip and description — a Plan section chip: name `<ID> <title>, <state word>`; tooltip and description that name, then this text (0023 §5.2).*
  *Amended by 0025 (PD-082): a step ID is a step link for a map-able spec: a plain activation leads into the Plan map, Ctrl or Cmd opens the plan at the step (0025 §5.1, AC-001–AC-004, AC-027); tooltip 0025 U-02.*
- **AC-018** When the host receives an open request for a file the model knows inside the active project, it shall call `showTextDocument` with `viewColumn` `Beside`, `preview` false, no `preserveFocus` and a selection at the start of that line; that line shall be in the editor's visible ranges and the Studio panel shall stay in its group; Restricted Mode and a reader window shall change nothing. (adapter unit test; host smoke with the Studio panel open and active: editor column ≠ panel column, cursor and visible line = requested line)
- **AC-019** If the file no longer exists, then the system shall open nothing; the activated link shall keep the focus and read "File not found: <path>" until the next model update or until the side panel shows another spec, and 0016's live region shall announce it.
- **AC-020** When the side panel receives a model-changed notification, it shall show the new content within 500 ms for the 200-spec fixture (PD-047), keep its scroll position and keep focus on the same control where it still exists, else on its heading. If the selected spec is no longer in the model, then the side panel shall close, focus that was inside it shall move as AC-003 says, and the shell's notice shall appear (0005 AC-010).
  *Amended by 0024 (PD-068): AC-020 — an offer change hands focus to the replacing Copy prompt (0024 AC-010): focus on a split button that the change removes moves to the Copy prompt that takes its place; everywhere else this rule stands.*
- **AC-021** The side panel's CSS shall use VS Code theme variables only and show a visible focus outline on every control; the CSS guard tests of 0013 shall cover its rules.
- **AC-022** *(manual, Gregor or his delegate)* Preview-harness screenshots in Dark, Light and High Contrast: Board and Overview with the side panel of `studio-0015` at 1400×900 and 800×900. Checked: the side panel's content is at most 900 px tall with both collapsible sections closed (today 4,952 px); at 800 px the drawer covers the board's right part and a card focused under it by Tab or arrow scrolls clear; in the Overview at 800 px every row with its next step and Copy and the figures line stay visible; nothing is cut off. In real VS Code: an ID opens the file beside the Studio, which stays visible. Pre-release checklist item.
  *Amended by 0022 (PD-069): AC-022 — "the drawer" is void: below 900 px the detail shows alone (0022 AC-029); the rows follow the list's width (0022 AC-001).*
  *Amended by 0023 (PD-069): AC-022 height check — includes the Plan section; the 300 words of AC-010 include it (0023 §5.2).*
- **AC-023** Every test title at the commit before 0019's first implementation commit shall exist at the head and pass, or the plan's *Test-title audit* shall list it with the criterion of this spec or the §5 row that voids or replaces it; a script compares the titles of both commits; `npm run test:unit` and `npm test` shall pass on Windows and in CI.
  *Amended by 0020 (PD-058): AC-023 — also except the tests 0020 AC-021 lists against a criterion 0020 §5 voids.*
  *Amended by 0021 (PD-069): AC-023 (test audit) — also except the tests 0021 AC-020 lists against a statement 0021 §5 replaces.*
  *Amended by 0022 (PD-069): AC-023 — also excepts the tests 0022 AC-017 lists against a statement 0022 §5 changes.*
  *Amended by 0023 (PD-069): AC-023 (test audit) — also except the tests 0023 AC-016 lists against a statement 0023 §4 changes.*
  *Amended by 0024 (PD-068): AC-023 (test audit) — also except the tests 0024 AC-014 lists against a statement 0024 §5 replaces.*
  *Amended by 0028: also excepts the tests 0028 AC-012 lists against a statement 0028 §5 replaces.*
  *Amended by 0025 (PD-082): also except the tests 0025 AC-020 lists against a statement 0025 §4 changes.*
- **AC-024** 0005, 0006, 0007, 0013, 0015, 0016, 0017 and 0018 shall carry the notes of §5 at the named statements, and the PD register shall hold no edit of an existing entry (PD-066, appended by the fix round of the compile S48, is the one new entry); checked by a grep and a diff in the plan.

## 11. Technical notes for developers or AI agents

- Lines exist: `AcceptanceCriterion.line` (`src/core/specs/leadingIds.ts`), `PlanStep.line`
  (`planSteps.ts`), `TraceabilityRow.line` and its raw `criterion` cell (`parsePlan.ts`); 0016's
  parser work must keep them. `OpenTarget.line`, `OpenFilePayload.line` and `createOpenFile` carry
  a line, but the webview's `OpenFile = (key) => void` drops it and `src/adapters/vscode/editor.ts`
  passes no `viewColumn`.
- `src/core/board/detail.ts` builds seven full-text sections; `DetailSections`
  (`src/shared/protocol/detail.ts`) shrinks — a protocol change, the version moves (0005 S6).
  Closing needs a way to clear the selection: `select` requires a stem (`isSelectPayload`).
  Reuse `openStep` (`nextStep.ts`, export it), `taskProgress`, `criteriaProgress`,
  `readVerification` (`other` counts free-text states).
- `SpecBoard.tsx` `open` and `rowRequest`/`activityRequest` (`areas/overview/requests.ts`,
  rebuilt by 0018) send "Spec Explorer, that spec" today; they become `shell.select`. One detail
  component serves pane and side panel; collapse memory stays `sectionMemory.ts`. The 900 px
  switch is a CSS media query. `/sdd-architecture-update` only if a module is added or moved.
- Detail tests losing their subject (`detail`, `SpecDetail`, `webviewBundle`, `openFile`, `editor`,
  `board.smoke`, `SpecBoard`, `Drilldown`) each map to a §5 row or a criterion here (AC-023).

## 12. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | (proxy) No "Full content" toggle | Guideline 5; the audit calls it optional; the editor beside the panel holds the full content | Readers who liked reading in the Studio lose it; OP-001 measures |
| A-002 | (proxy) Side panel open ⇔ a spec is selected; closing clears the selection | One state, nothing hidden; restore needs no new memory | 0017's status bar falls back to its "otherwise" spec after a close |
| A-003 | (proxy) 400 px, drawer below 900 px, non-modal; a focused card is scrolled clear of the drawer | Audit K-E: 360–420 px, drawer under 900 px; WCAG 2.2 SC 2.4.11 | Layout tweak only |
| A-004 | (proxy) Focus moves into the side panel on open; Escape returns it to the opener | Common side-panel pattern; keyboard browsing is Escape, arrow, Enter | Keyboard users need one more key per spec |
| A-005 | (proxy) Open criteria = traceability rows whose State is not exactly `verified`, one entry per row; `built` marked | `/sdd-compile` needs exactly these; FeatherSpec writes `open \| built \| verified`; PD-043 counts rows | A free-text "verified" row lists as open; its format note says why |
| A-006 | (proxy) Short title rule of §6.3 | Repository specs mostly have no bold title; 80 characters wrap to at most two lines at 400 px | Titles read clipped; wording tweak only |
| A-007 | (proxy) No header lines, no readiness list | Guideline 5; 0016 states readiness as a need | A user looking for the Ticket line opens the spec |
| A-008 | Lines in the model are 1-based file lines | `editor.ts` subtracts 1; screenshot 24 shows AC-001 at line 13 | Off-by-one, caught by AC-016/AC-018 |
| A-009 | (proxy) Problems directly below Next step, before Progress | 0016 AC-006 places them there; NS-1 and NS-2 point to them | Problems sit below Progress (audit 03 §5.2 lists them fourth); one order change |
| A-010 | (proxy) A Done spec without a plan shows no Progress | Guideline 6: an absence that can never be filled is not shown | A Baseline reader misses "no plan" |
| A-011 | (proxy) A file open in another group opens again beside the panel | One predictable place, Studio visible (K-I); `Beside` is "to the side of the currently active one" (`@types/vscode` 1.146) | Two tabs of one file; a reuse rule is a small change |

*Amended by 0022 (PD-069): A-003 — 400 px and the drawer are void; PD-066 is superseded by PD-075 (0022 G-4).*

## 13. Open points

- OP-001: Gregor's Hands-On on `tip-splitter` checks the audit's task "Which criteria are still open for 0001?" (answer without scrolling) and whether anyone asks for full text; a need found there is a new spec.
- OP-002: Resolved: the references to 0016–0018 (T-07…T-15, 0016 §6.2–§6.5, 0017 §6.1, 0018 B-6, O-5) match their drafts of 2026-11-17; `/sdd-plan` re-checks them against the implemented code.
- OP-003: `/sdd-clarify` 2026-11-17: 48 findings resolved in one pass under Gregor's standing answer, none asked (`0019-findings.md`; cross-spec: 0016 AC-016, 0018 AC-031, the test audits). Readings to confirm: one entry per traceability row; only an exact `verified` or `built` counts; focus returns to the opener; A-003, A-011.
- OP-004: Resolved by `/sdd-plan` 2026-11-18 (proxy, Gregor delegated): PD-063 (5), recorded after this spec's last revision, keeps the format-note toggle collapsed on every showing with no memory; AC-015, §6.2 row 6 and the §5 row on 0013 AC-012 follow it, Status history keeps 0013 AC-012's memory. OP-002's re-check against the implemented 0016–0018 found the named texts as written (T-07 `formatNotesText`, T-08 `derivedTooltip`, T-09 `DERIVED_SENTENCES`, T-10 `persistedTooltip`, T-12 `needTooltip`, B-6 `columnRuleTooltip`); 0018 moved `missionControl/requests.ts` to `areas/overview/requests.ts` (§11 reads so).

## 14. Definition of Ready / Done

Ready: rules and texts fixed, proxies recorded, 0016–0018 implemented. Done: FR-01…FR-05 built;
AC-001…AC-024 pass (AC-022 by Gregor or his delegate); §5 applied; README and wiki updated where
they describe the detail or "Open file"; Memory Bank synced.

## 15. Recommended next steps

`/sdd-plan` after 0018 is done, against the code of that time (OP-002).
