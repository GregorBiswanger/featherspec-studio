# Spec Detail as a Situation Picture Beside the Content

**Status:** Draft
**Plan:** _none yet_

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

The detail is a second Markdown renderer: 0015 measured 4,952 px and 3,459 words (02 §3.7, IA-5);
what `/sdd-compile` needs — open criteria, next step — is lost in the volume. A card switches
area; "Open file" hides the Studio tab (Q-6, screenshot 24). Goal: "where does this spec stand,
what is missing?" answered without scrolling, the content one click away beside the visible
Studio. Measured by AC-010 (words), AC-022 (height) and AC-001 (zero area changes).

## 3. Users and roles

Developer (one role), as in 0005–0007; workshop participants use the same surface.

## 4. Scope

### In scope

- Side panel for the selected spec in Overview and Board: open, close, width, drawer, focus, keyboard, memory.
- Detail content of §6.2; no full text of requirements, criteria, plan steps or verification logs.
- A line per ID; every ID and file link opens the file beside the panel at its line.
- The Spec Explorer area keeps list + detail pane, with the new content, until 0020.

### Out of scope

- A "Full content" toggle — because guideline 5 forbids duplicating the editor and no test-decidable need exists (A-001, OP-001).
- Phase bar (K-H) and diagnostics in VS Code's Problems panel — because PD-061 (2) defers them.
- Removing the Spec Explorer area and the tree — because 0020 owns R-05.
- Next step lines, Copy and its feedback, card and Overview content, diagnostic tiers and their texts, the readable history — because 0016–0018 own them; this spec only places them.
- Spec header lines (Status, Plan, Ticket, Origin, Validated by, Clarified) and the readiness checklist — because the file shows them at its top and 0016 replaces readiness by a need text (A-007).
- A resizable or configurable side panel width, or a setting for the editor column — because no need is measured; one width and `Beside` follow the audit (A-003).
- Editing anything from the detail — because the Studio is read-only (PD-013).

## 5. Amendments of other specs

The plan applies them as inline notes "*Amended by 0019 (PD-058): …*" in the implementing change
set, as 0015 did. Statements already amended by 0015–0018 are read as amended.

| Spec · statement | Amendment |
| --- | --- |
| 0005 BR-03 | The side panel shows exactly while a spec is selected; closing it clears the selection (AC-003) |
| 0005 BR-07, AC-028 | A spec target keeps its meaning. Void: "this is how the board and Mission Control open a spec's detail in Spec Explorer (PD-042)" — they select in place (AC-001) |
| 0005 AC-007, AC-008 (Spec Explorer list) | Stay until 0020; the pane beside the list shows AC-008's detail |
| 0006 BR-08 rows "An attention row" and "An activity entry", AC-014 (as rebuilt by 0018) | Activating a spec row or a found activity entry selects the spec in place (AC-001), no request "Spec Explorer, that spec"; the not-found notice stays |
| 0007 §1 and §5 step 4 "detail view in the Spec Explorer area", FR-05, AC-008 | The detail is this spec's side panel in Overview and Board and the Spec Explorer pane until 0020; a card selects in place (AC-001) |
| 0007 §6.4 table and bullets, AC-009, AC-010, AC-027 | Replaced by §6.2 and AC-009–AC-019. AC-009 void. AC-010's section list and per-section "Open file" void; its not-found sentence continues as AC-019. AC-027's history is the collapsed section of AC-015 |
| 0007 §6.7 "Enter opens the detail view", "every Open file link"; AC-017 same parts | Enter opens the side panel (AC-004); "every ID and file link of the detail" |
| 0007 AC-028 | The "hint to select one" applies to the Spec Explorer pane only |
| 0013 §3.4 detail bullets (header "Open file", sections, per-section Open file, inline Markdown and tidying of file text) | Header per AC-009; collapsible sections are Format notes and Status history only; the detail shows no file text. The safe inline renderer and AC-014's no-`innerHTML` rule stay for their other users |
| 0013 AC-012 | Applies to Format notes and Status history, which start collapsed |
| 0013 AC-013, AC-015 | Void (no per-section "Open file", no full text) |
| 0013 AC-017 detail screenshots | Replaced by AC-022 |
| 0016 §6.2 detail row "toggle T-07 in Overview"; AC-007, AC-014, AC-015 detail parts | The Overview section ends: T-07 heads section 6, needs sit in Progress, the history in section 7 (§6.2) |
| 0016 AC-012 detail part | In the detail, T-09's sentence is the state chip's tooltip, not visible text (audit 03 §5.2) |
| PD-042 | Superseded in part (PD-058): Board and Overview show the detail as a side panel; 0020 ends the Spec Explorer part |

## 6. Business rules

### 6.1 Side panel

- **Open.** Activating a board card or an Overview spec row (click, Enter, Space) selects the spec
  (0005's select message) and shows the side panel in the current area. Never an area switch, never
  a navigation request (guideline 8). The side panel shows whenever a spec is selected, whoever
  set the selection (list, restore, 0020's tree); 0017's current spec follows the same selection.
- **Place.** Panel ≥ 900 px wide: 400 px at the right edge beside the area content, own scroll.
  Narrower: a drawer over the area from the right edge, min(400 px, panel width) wide; the area
  keeps its width. Non-modal in both (`role="complementary"`, accessible name "Spec detail").
- **Close.** The close button, or Escape inside the side panel, clears the selection; focus
  returns to the spec's card or row where shown, else to the area's first focusable element.
- **Focus.** Opening from a card or row moves focus to the side panel's heading. Tab order: close,
  then every control in §6.2's section order. A selection set outside the panel (restore, 0020's
  tree) moves no focus.
- **Switching area** by hand or by a drill-down keeps selection and side panel (0005 BR-03); no
  new memory: the remembered selection and area (0005 AC-009) restore it.
- **Spec Explorer until 0020.** List and pane stay (0013 §3.4); the pane shows the same detail;
  close and Escape clear the selection, the pane shows its hint; no side panel in this area.

### 6.2 Detail content (order fixed)

| # | Section | Content |
| --- | --- | --- |
| 1 | Header | number, title, one state chip — tooltip: 0016's T-09 sentence (derived states), then T-08 or T-10 — "Deprecated" and 0003's successor text where reported, close button |
| 2 | Next step | the block of 0015 AC-003 as 0016 and 0017 leave it (Copy primary) |
| 3 | Problems | 0016 §6.2's detail row unchanged: each *Problem* with its reason, no heading, not collapsible; nothing when none |
| 4 | Progress | 0016's needs (Backlog) and the Steps and Criteria rows (§6.3) |
| 5 | Files | "Spec", "Plan", one "Archived plan" per archived plan, one "Return note" per note; file name as link; rows for absent files are not shown |
| 6 | Format notes | collapsed; heading 0016's T-07; expanded: each note's reason; hidden at zero |
| 7 | Status history | collapsed; heading "Status history (n)"; expanded: 0016's T-15 label and §6.4 entries in their order; hidden at zero entries; while the history is not available, heading "Status history" with "Status history: not available" |

### 6.3 Progress

- **Steps:** from the plan 0003 uses (sibling, or a done spec's archived plan): "<done> of <total>
  done" over non-struck steps (0007 §6.2), with a bar; while a step is open, "Next open step: <ID>
  <title>" — the step NS-7 names (first neither ticked nor struck; one function, guideline 1).
- **Criteria:** from 0003's traceability counts (PD-043): "<verified> of <total> verified" with a
  bar; below "Not verified yet:" one entry per criterion ID whose row is not `verified`, in order
  of first appearance: ID link, short title, and " · built" for state `built`. No list when all are verified.
- **Short title:** the bold title when the definition reads `**AC-NNN — Title**` (separator `—`,
  `-`, `:` or `|` inside the bold); otherwise the first sentence of the text after the ID. Plain
  text: emphasis and code markers removed, intraword `_` kept, `[text](target)` → text; cut at
  the last space within 80 characters, then "…". A row whose ID the spec does not define: ID only.
- **Needs:** for a Backlog spec, 0016 §6.3's applying needs come first, in order, each with T-12.
- **Honest absence (guideline 6):** no plan → Backlog: the needs only (they include "needs a
  plan"); Done (Baseline included): no Progress section, it can never fill; any other state: "No
  plan yet". Plan without traceability rows → Criteria "not available — the plan has no
  traceability table"; plan without steps → "No steps in the plan"; plan unreadable → both rows
  "not available — Studio cannot read the plan".

### 6.4 Lines and opening files

- The model delivers a 1-based line for each criterion (first definition), requirement, plan
  step (heading) and traceability row. The parser records all four today; AC-016 pins them.
- A criterion ID opens the spec at its definition, or the plan at its traceability row when the
  spec has none; a step ID, the plan at its heading; a problem or format note, its file at its
  line; a file link, line 1.
- The host opens beside the Studio panel (`ViewColumn.Beside`), not as preview, cursor at the
  line, revealed; the panel's group is unchanged; only files the model knows (PD-044, today's check).

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-01 | Side panel in Overview and Board; selecting never switches area | AC-001–AC-007, AC-020 |
| FR-02 | Spec Explorer keeps list + new detail until 0020 | AC-008 |
| FR-03 | Situation picture, no full text | AC-009–AC-015 |
| FR-04 | A line per ID; files open beside the panel at the line | AC-016–AC-019 |
| FR-05 | No quality loss; amendments; themes | AC-021–AC-024 |

## 8. Texts (English, PD-016; in the text modules, asserted literally)

| New text | Replaces (today) |
| --- | --- |
| Close button: accessible name "Close spec detail", tooltip "Close (Esc)" | — (new) |
| "Progress" | section titles "Plan & tasks" and "Verification" |
| "Steps", "<done> of <total> done", "Next open step: <ID> <title>", "No steps in the plan" | the step list with tick icons and `Verified` texts |
| "Criteria", "<verified> of <total> verified", "Not verified yet:", " · built" | "Criteria: <v> of <t> verified"; "open <n> · built <n> · verified <n> · other <n>" |
| "not available — the plan has no traceability table", "not available — Studio cannot read the plan" | "Criteria: not available"; "not available" under Verification |
| "Files", "Spec", "Plan", "Archived plan", "Return note" | "Related artifacts", "No related artifacts", "Open file", "Open file: <name>" |
| ID link tooltip and accessible name "Open <file name> at line <n>" | — (new) |
| "Status history (<n>)" | "Status history" |
| — (removed) | "Overview", "Requirements", "Acceptance criteria", "No FR- requirements found", "Priority: not available", "/sdd-compile verdict: not available — FeatherSpec does not persist it." |

"No plan yet", "Deprecated", "File not found: <path>", "Spec detail" and "Select a spec in the
list to see its details." stay as they are.

## 9. Error cases and edge cases

| Case | Behaviour |
| --- | --- |
| File gone when a link is activated | AC-019 |
| Selected spec disappears | Side panel closes; the shell's notice (0005 AC-010) |
| Spec unreadable | Header with the stem as title; Problems names it (0016); Progress from the plan where readable |
| Duplicated stem | The selected entry (stem + path, PD-039); its own files |
| Many open criteria | All listed, one line each (ellipsis), no cap |
| Board with side panel, panel ≥ 900 px | The board's free width shrinks by 400 px; 0018 B-2's horizontal scrolling applies |
| Panel crosses 900 px while open | Switches between beside and drawer; selection and focus stay |
| Restricted Mode, reader window | Same detail; opening files works (read-only) |

## 10. Acceptance criteria

Decided by unit and component tests unless marked manual. Fixtures: `fs110-ready-synthetic` (Ready
0001), `fs170-brownfield-mixed` (Review 0006, Backlog 0003), `fs180-de-baselines` and
`fs180-en-done-archived` (Done), and `studio-0015`, a copy of this repository's 0015 spec and plan
at commit `8052f9a` (made by the plan, like `studio-0002`).

- **AC-001** When the developer activates a board card or an Overview spec row or found activity entry by click, Enter or Space, the system shall select that spec, show its detail in the side panel and keep the current area; it shall send no navigation request; activating a card's or row's Copy shall select nothing (0017 AC-005).
  > **Given** `fs170-brownfield-mixed` on the Board **When** the developer activates the cards of 0003, 0004 and 0006 one after another **Then** the Board is still the current area, the side panel shows 0006, and no navigation request was sent.
- **AC-002** While a spec is selected and Overview or Board is shown, the system shall show the side panel with that spec's detail; while none is selected, it shall show no side panel. Switching area by hand shall keep both.
- **AC-003** When the developer activates the close button, or presses Escape while focus is inside the side panel, the system shall clear the selection, hide the side panel and move focus to that spec's card or row where shown, otherwise to the area's first focusable element.
- **AC-004** When the side panel opens from a card or row, the system shall move focus to its heading; with the keyboard alone the developer shall reach the close button and then every control of the side panel in §6.2's section order — Copy buttons, links, collapse toggles — and operate each with Enter or Space.
- **AC-005** While the panel is at least 900 px wide, the side panel shall be 400 px wide beside the area content with its own scroll; while it is narrower, the side panel shall overlay the area from the right edge at min(400 px, panel width) and the area content shall keep its width. (CSS guard test on the rules; screenshots in AC-022)
- **AC-006** After a window reload with a spec selected, the system shall show the side panel with that spec on the area last shown, without user action and without moving focus.
- **AC-007** The card or row of the selected spec shall carry `aria-current="true"` and the selection background and border (0013 D-12); no other card or row shall.
- **AC-008** While Spec Explorer is shown, the system shall show the list and, in the pane beside it, the detail of §6.2 and no side panel; close and Escape shall clear the selection and the pane shall show "Select a spec in the list to see its details."
- **AC-009** The detail shall show the sections of §6.2 in that order, Problems, Format notes and Status history only under §6.2's conditions, and Format notes and Status history collapsed when first shown.
- **AC-010** The detail shall show no requirement text, no criterion text other than short titles, no stage or step text other than the next open step's title, no `Verified` text, no spec header line, no readiness check and none of the removed texts of §8. For `studio-0015` with both collapsible sections closed, its visible text shall contain no text of any `FR-` row of that spec and at most 300 words (today 3,459).
- **AC-011** The Steps row shall follow §6.3: `fs110-ready-synthetic` 0001 shows "0 of 1 done" and "Next open step: T-001 The feature"; `fs170-brownfield-mixed` 0006 shows "4 of 4 done" and no next open step; 0003 there shows the need "needs a plan" and no Steps or Criteria row; `fs180-de-baselines` 0001 shows no Progress section. The next open step shall equal the step of the NS-7 line for every fixture spec with a plan.
- **AC-012** The Criteria row shall follow §6.3: `fs110-ready-synthetic` 0001 shows "0 of 1 verified" and the entry "AC-001 The system shall be ready."; `fs170-brownfield-mixed` 0006 shows "3 of 3 verified" and no list; a plan with no traceability rows shows "not available — the plan has no traceability table"; `studio-0015` shows "28 of 30 verified" and exactly the entries AC-027 and AC-030, in that order (0016 reads no free-text state by its first word).
- **AC-013** The short title shall follow §6.3: `**AC-001 — Batch size and interval are configurable**` gives "Batch size and interval are configurable"; a text with `` `OUTBOX_BATCH_SIZE` `` gives `OUTBOX_BATCH_SIZE` without backticks; a first sentence longer than 80 characters is cut at the last space within 80 characters and ends with "…"; a row whose ID the spec does not define shows the ID only.
- **AC-014** The Files section shall show one row per existing file of §6.2 with its label and file name, and no row for an absent file: `fs180-en-done-archived` 0001 shows "Spec" and one "Archived plan" and no "Plan".
- **AC-015** Format notes and Status history shall start collapsed, show the headings of §6.2 and §8, show their entries when expanded, and keep each collapse state per section name while the panel stays open; at zero entries the section shall not be shown.
- **AC-016** The model shall deliver these lines: `fs110-ready-synthetic` AC-001 → spec line 9, T-001 → plan line 24, its traceability row → plan line 36; `fs170-brownfield-mixed` 0006 AC-001, AC-002, AC-003 → spec lines 13, 17, 21, T-001 → plan line 70, T-004 → plan line 169. A criterion defined twice shall carry the line of its first definition.
- **AC-017** When the developer activates an ID link, the system shall send the open request with the file and line of §6.4, and with line 1 for a file link; each ID link shall carry the tooltip and accessible name "Open <file name> at line <n>".
- **AC-018** When the host receives an open request for a file the model knows inside the active project, it shall call `showTextDocument` with `viewColumn` `Beside`, `preview` false and a selection at the start of that line, revealed; it shall not show the Studio panel in another group. (editor adapter unit test; host smoke test: the opened editor's column differs from the panel's and its cursor line equals the requested line)
- **AC-019** If the file no longer exists, then the system shall open nothing, show "File not found: <path>" in place of the activated link until the next model update, and announce it through the side panel's `aria-live` region.
- **AC-020** When the side panel receives a model-changed notification, it shall show the new content within 500 ms for the 200-spec fixture (PD-047), keep its scroll position and keep focus on the same control where it still exists. If the selected spec is no longer in the model, then the side panel shall close and the shell's notice shall appear (0005 AC-010).
- **AC-021** The side panel's CSS shall use VS Code theme variables only and show a visible focus outline on every control; the CSS guard tests of 0013 shall cover its rules.
- **AC-022** *(manual, Gregor or his delegate)* Preview-harness screenshots in Dark, Light and High Contrast: Board and Overview with the side panel of `studio-0015` at 1400×900 and 800×900. Checked: the side panel's content is at most 900 px tall with both collapsible sections closed (today 4,952 px); the drawer covers the board's right part at 800 px; nothing is cut off. In real VS Code: an ID opens the file beside the Studio, which stays visible. Pre-release checklist item.
- **AC-023** Every test title at the commit before 0019's first implementation commit shall exist at the head and pass, or be listed in the plan's *Test-title audit* with the criterion of this spec or the §5 row that voids or replaces it; a script compares the titles of both commits; `npm run test:unit` and `npm test` shall pass on Windows and in CI.
- **AC-024** 0005, 0006, 0007, 0013 and 0016 shall carry the notes of §5 at the named statements, and PD-042 its superseded note; checked by a grep in the plan.

## 11. Technical notes for developers or AI agents

- Lines exist: `AcceptanceCriterion.line`, `Requirement.line` (`src/core/specs/leadingIds.ts`),
  `PlanStep.line` (`planSteps.ts`), `TraceabilityRow.line` (`parsePlan.ts`); 0016's parser work
  must keep them. `OpenTarget.line`, `OpenFilePayload.line` and `createOpenFile` carry a line, but
  the webview's `OpenFile = (key) => void` drops it and `src/adapters/vscode/editor.ts` passes no
  `viewColumn`.
- `src/core/board/detail.ts` builds seven full-text sections; `DetailSections`
  (`src/shared/protocol/detail.ts`) shrinks — a protocol change, the version moves (0005 S6).
  Reuse `openStep` (`nextStep.ts`, export it), `taskProgress`, `criteriaProgress`, `readVerification`.
- `SpecBoard.tsx` `open` and `attentionRowRequest`/`activityRequest` (`missionControl/requests.ts`,
  rebuilt by 0018) send "Spec Explorer, that spec" today; they become `shell.select`. One detail
  component serves pane and side panel; collapse memory stays `sectionMemory.ts`. The 900 px
  switch is a CSS media query. `/sdd-architecture-update` only if a module is added or moved.

## 12. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | (proxy) No "Full content" toggle | Guideline 5; the audit calls it optional, for transition; the editor beside the panel is the full content, one click away | Readers who liked reading in the Studio lose it; OP-001 measures |
| A-002 | (proxy) Side panel open ⇔ a spec is selected; closing clears the selection | One state, nothing hidden; restore needs no new memory | 0017's status bar falls back to its "otherwise" spec after a close |
| A-003 | (proxy) 400 px, drawer below 900 px, non-modal | Audit K-E: 360–420 px, drawer under 900 px | Layout tweak only |
| A-004 | (proxy) Focus moves into the panel on open; Escape returns it | Common side-panel pattern; keyboard browsing is Escape, arrow, Enter | Keyboard users need one more key per spec |
| A-005 | (proxy) Open criteria = rows not `verified`; `built` marked | `/sdd-compile` needs exactly these; built ≠ verified | — |
| A-006 | (proxy) Short title rule of §6.3 | Repository specs mostly have no bold title; 80 characters fit 400 px in one or two lines | Titles read clipped; wording tweak only |
| A-007 | (proxy) No header lines, no readiness list | Guideline 5; 0016 states readiness as a need | A user looking for the Ticket line opens the spec |
| A-008 | Lines in the model are 1-based file lines | `editor.ts` subtracts 1; screenshot 24 shows AC-001 at line 13 | Off-by-one, caught by AC-016/AC-018 |
| A-009 | (proxy) Problems directly below Next step, before Progress | 0016 AC-006 places them there; NS-1 and NS-2 point to them | — (audit 03 §5.2 lists them fourth) |
| A-010 | (proxy) A Done spec without a plan shows no Progress | Guideline 6: an absence that can never be filled is not shown | A Baseline reader misses "no plan" |

## 13. Open points

- OP-001: Gregor's Hands-On on `tip-splitter` checks the audit's task "Which criteria are still open for 0001?" (answer without scrolling) and whether anyone asks for full text; a need found there is a new spec.
- OP-002: Texts referenced from 0016–0018 (T-07…T-15, problem reasons, Copy feedback) stay theirs; `/sdd-clarify` checks the references against their final wording.

## 14. Definition of Ready / Done

Ready: rules and texts fixed, proxies recorded, 0016–0018 implemented. Done: FR-01…FR-05 built;
AC-001…AC-024 pass (AC-022 by Gregor or his delegate); §5 applied; README and wiki updated where
they describe the detail or "Open file"; Memory Bank synced.

## 15. Recommended next steps

`/sdd-clarify` in a fresh session (proxies, references to 0016–0018), then `/sdd-plan` after 0018 is done.
