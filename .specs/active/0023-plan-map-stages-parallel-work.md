# Plan Map: Stages, Parallel Work, Workers

**Status:** In Progress
**Plan:** [0023-plan-map-stages-parallel-work.plan.md](0023-plan-map-stages-parallel-work.plan.md)

*Amended by 0024 (PD-068): where Send is offered (0024 §6.2), the Copy prompt of the detail's first next-step line and of the first Now row is 0024's split button `Send to <Name>` — for its place, what follows it, its width ("every Copy", "the widest Copy") and the primary count (once, both parts primary); its menu holds Copy prompt (0024 §6.3, AC-002, AC-003).*

Basis: review `docs/ux-audit/07-implementation-review.md` §5.4, §6 (K-N); work order `08-spec-handoff.md` §4 (P-1…P-8,
AC drafts, E-8…E-10). PD-069, PD-072, PD-075, PD-076, PD-070, PD-013, PD-021 (2), PD-047, PD-055, PD-058, PD-016;
guidelines 1–12. Gregor delegated the round (PD-069): no interview, proxies in §10. Builds on **0021** (intents, short
form, Copy prompt, coach line, `(?)`) and **0022** (button classes, icon button, path breaks, divider, list or detail
below 900 px); Send is **0024**'s. 0021 and 0022 are implemented (In Progress), 0024 is a Draft; this spec refers to
them and restates none.

## 1. Summary

The Studio shows how a plan is built: its stages, which steps may run in parallel and why, how to start a stage and
what parallel workers sent back. A compact **Plan** section in the side panel shows one line per stage; a third tab
**Plan map** shows the selected spec's stages with step cards, the plan's own closing line, and — for the current
stage, when it joins steps with `‖` — FeatherSpec's three ways to run it, each with Copy prompt. Return notes show on
their step; while one lies, the next step (NS-6) becomes "Integrate the returned steps". The Studio reads files only.

## 2. Goal and problem

Gregor has "to look it up in the md file or ask, laboriously, what can run in parallel and how" (07 §6.1). The detail
shows "Steps 2 of 6" and the next open step; stages, `‖`, the closing line and return notes stay invisible (n10),
though the parser reads them all (07 §6.2). With a DONE return note lying, NS-6 names the returned step again as the
one to implement. Goal: without the plan file Gregor can say which stages could run in parallel, why or why not, and
copy the right prompt (AC-019). User: the developer (0001–0007).

## 3. Scope

### In scope

- The Plan section in the side panel (§5.2) and the Plan map tab with its command (§5.3).
- Ways to run the current `‖` stage with their prompts (§5.4); return-note states and the NS-6 integrate case (§5.5).
- The amendments of §4; README, CHANGELOG, release checklist, guideline 4 in both guideline files.

### Out of scope

- Starting, steering or watching agents; editing the plan, ticking steps, deleting return notes — because PD-055 and
  PD-013; integration is the main session's (`parallel-work.md` *Integrating*).
- Cutting, ordering or judging stages; a recommendation of its own — because that is `/sdd-plan`'s (08 §4, P-3).
- Archived plans of Done specs — because they are frozen history (guideline 7).
- Shared-file marking between `→` steps (08 P-6 option) — because `Files:` is written only on `‖` steps (`sdd-plan.md`).
- `Current step:`, the Session handoff, full Do or Verify text — because ticks and code lead (`plans.md`); guideline 5.
- A coach line or `(?)` in the Plan map — because guideline 11 (once per view: the side panel's).
  *Amended by 0025 (PD-082): §3 — the header shows the spec's next step with its coach line and `(?)` (0025 §5.3); ways and start lines keep Copy prompt.*
  *Amended by 0026 (PD-082): beside 0025's header, also 0026's `About these ways`, which holds no session or model advice (0026 A-012).*
- Send to an assistant for the map's prompts — because 0024 keeps Send at the detail and the first Now row (0024 §3).
- "Open Plan Map" in the tree's context menu — because 08 §4 does not ask for it; the click test kept it out (OP-005,
  PD-076).
  *Amended by 0025 (PD-082): built as `Show in Plan Map` in the tree's context menu (0025 §5.1, AC-005; 09 F-1 (2)).*
- A fixed FeatherSpec phrase for the stage prompts — because that is a FeatherSpec release (08 §7, OP-002).

## 4. Amendments of other specs

Applied in the implementing change set as a note directly under each statement: "*Amended by 0023 (PD-069): …*". The
PD register is not edited. Where 0021 or 0022 also amends a statement, their notes come first.

| Spec · statement | Amendment |
| --- | --- |
| 0021 §6.2 table; AC-003 "An Active spec whose sibling plan's open step is `<ID>`", AC-005 | New first case "returned work" (0023 §5.5); AC-003 and AC-005 hold while no return note of the spec lies |
| 0021 §6.4 "Every control that copies a next step's prompt or the `/sdd-specify` of 0018 O-8" | Also the Plan map's way and start-line Copies (0023 §5.4) |
| 0015 §6.1 row NS-6 (as 0017 and 0021 amended it) | Plus 0023 §5.5's case, checked first |
| 0019 §6.2 table (order fixed); AC-009 | New section "Plan" (0023 §5.2) between 3 Problems and 4 Progress |
| 0019 §6.2 row 4, §6.3 *Steps* bullet; AC-011 | The Steps row shows only while no Plan section shows; otherwise its count heads the Plan section |
| 0019 AC-010 "no stage or step text other than the next open step's title"; AC-022 height check | Plus the Plan section's IDs, symbols and "The plan says" line; the 300 words and the height include it |
| 0019 AC-017 "accessible name shall be its visible text", tooltip and description | A Plan section chip: name `<ID> <title>, <state word>`; tooltip and description that name, then this text (0023 §5.2) |
| 0019 §3 bullet "Side panel … in Overview and Board", FR-01, §6.1 *Open* "shows the side panel in the current area"; AC-002 "Overview or Board is shown" | Also in the Plan map from a 900 px panel, without its Plan section; below, the map shows alone (0023 §5.3) |
| 0020 title "Two-Tab Panel"; §1, §2 "two tabs"; §4.5 "The panel offers two tabs, Overview (`overview`) and Board (`board`)"; AC-016 "exactly two tabs"; AC-018 "the tabs Overview and Board" | Three tabs: Overview, Board, Plan map (`planMap`), each with its icon |
| 0005 §1, §5 step 4, AC-004, AC-005 (as 0018 and 0020 amended them); 0018 §6.4 command table, AC-001 "area IDs shall be `overview`, `board`" | Plus area `planMap` and `featherspec-studio.openPlanMap` · `FeatherSpec Studio: Open Plan Map` |
| 0015 AC-001, AC-030 (as 0020 amended them) "Overview and Board"; ADR-001 §2 (as 0020 noted it) | Overview, Board and Plan map |
| 0022 §4.4 classes; AC-010, AC-011 | Also the Plan map tab: way Copies secondary text buttons, start lines icon buttons; no primary button (0023 AC-010) |
| 0022 §4.6 "(this list is complete)"; AC-015 | Plus the map's `Files`, way prompts and start lines (0023 §5.3, §5.4) |
| 0022 G-4 "a selected spec's detail shows alone in its place"; X-27 | Not in the Plan map: below 900 px the map shows alone, with no detail or back button (0023 §5.3) |
| Guideline 4 "The webview is for overview and board." (`.claude/rules/ux-guidelines.md`); `docs/product/ux-guidelines.md` *Target picture* row Panel "two tabs" | "The webview is for overview, board and plan map."; "three tabs: … and Plan map (a spec's stages)" |
| PD-058 "a panel with two tabs"; PD-054 icon per area; PD-075 "only the area (Overview or Board) is shown" | Refined by 0023 (register not edited) |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021; 0021 AC-020; 0022 AC-017 (test audits) | Also except the tests 0023 AC-016 lists against a statement this table changes |

## 5. Business rules

### 5.1 Data and step states

Sources (parser unchanged): the sibling plan's stages and closing line, its steps, the spec's return notes by step ID.
Only a readable sibling plan of a spec not Done counts; otherwise no Plan section, and the tab shows §5.3's state.

- **Stage line:** number; its head (the text before the first ` — `, ` – ` or ` - `, as the parser splits it, §9) gives
  the step IDs in order and between two consecutive IDs the separator as written (`‖` where the text between holds
  `‖`, else `→` where it holds `→`, else none); the rest is the description (plain text). A stage line whose head holds
  no ID is left out; a plan with no stage line left counts as having no stages. A *parallel group* is a run of IDs
  joined directly by `‖`.
- **Closing line:** the `Parallel:` or `No parallel stage:` line as written, prefix kept, continuation lines joined by
  a space. **Short text:** plain text cut at 80 characters, as 0019 §6.3 shows the next open step's title.
- **Step state**, first match wins: *dropped* (struck) · *returned* (a return note for its ID exists) · *done*
  (ticked) · *next* (0019 §6.3's next open step, while no return note of the spec lies) · *open* (anything else, an
  undetermined tick included). *Unfinished* = next or open. A stage ID with no step heading is *not found*. In a plan
  with stages, steps in no stage line are listed after the stages, under M-07.
- **Returned** carries the note's status: done, blocked with its `Blocked on` text as short text (full in the
  tooltip), or unknown (unreadable note or another value; its Problem stays 0016's and 0022's).
- **Count:** 0019 §6.3's "<done> of <total> done" over non-struck steps.
  *Amended by 0025 (PD-082): the progress texts end in ` · <p>%` (U-04) and every bar carries its text as `title` and `aria-valuetext` (0025 §5.4, AC-012, AC-013).*
- **Current stage:** the first stage whose line holds the next open step; none when no stage holds it.

### 5.2 Plan section in the side panel (P-1, P-7, P-8)

- Heading `Plan`; then the count with 0019's bar; then M-02 with the closing line as short text, full text as
  tooltip; no M-02 line without a closing line.
- One line per stage: its number, one chip per step (symbol of M-01, ID; the separators between), and M-04 after the
  chips of a stage that holds a `‖`; then the M-07 line, if any. Without stages: one line of chips in plan order, no
  numbers. No countable step: 0019's "No steps in the plan".
- A chip is a link that opens the plan at the step's heading (0019 §6.4); a *not found* chip is plain text. Name
  `<ID> <title>, <state word>` (§6; title as short text); tooltip and accessible description: that name, then 0019
  AC-017's `Open <file name> at line <n>` on its own line.
  *Amended by 0025 (PD-082): a chip is a step link: it leads into the Plan map, Ctrl or Cmd opens the plan at the heading; its tooltip is 0025 U-02 (0025 §5.1, AC-001–AC-004).*
- Link M-03 sends a navigation request to area `planMap` with the spec as target (PD-040); selection and side panel
  stay; focus moves to the map's heading.
- No Copy, coach line or way in this section. While the Plan map tab is shown, the side panel leaves this section out.
  *Amended by 0025 (PD-082): also its Next step section, while the map's header shows the spec the side panel shows (0025 §5.3, D-2, AC-009).*

### 5.3 Plan map tab (P-2, P-3, P-6, P-7)

- Third tab after Overview and Board, title `Plan map`, ID `planMap`, icon motif `type-hierarchy-sub` (PD-054, A-003),
  purpose text M-11; command `featherspec-studio.openPlanMap` opens the panel on it like 0018's per-area commands. The
  tab shows the selected spec (PD-039). From a 900 px Studio panel the side panel stands beside it with 0022's divider
  (0019 §6.1, PD-070); below 900 px the map shows alone at full width, with no detail or back button (A-010).
- **States**, first match: no spec selected → M-12; selected spec Done → M-14; without a sibling plan → M-13; plan
  unreadable → `<number>: ` and 0022's X-14. Each then lists M-15 and one button per spec with a readable sibling plan
  (0020 §4.1's groups In progress, Ready, Backlog in this order, then by number), `<number> <title>`; activating one
  selects that spec, keeps the tab and moves focus to the map's heading. No such spec: no M-15.
- **Header:** `<number> <title>` (with a Problem: 0016's warning, 0022 §4.5's sentences as tooltip and description,
  also on its M-15 button; guideline 3), the count (or "No steps in the plan"), link `Open plan` (plan, line 1); then
  M-02 with the full closing line through the safe inline renderer (0013), no cut. The Studio adds no judgement (P-3).
- **Stage row:** M-05 `Stage <n>` and its description; its kind text (M-06; none for one step); M-16 or M-17 (§5.5);
  its cards: each parallel group's cards side by side, each 200–360 px wide, wrapping below each other when the row is
  narrower (container width, guideline 12); groups and single cards stack in line order with `→` between them. A stage
  whose steps are all done or dropped shows its chips of §5.2 instead of cards (guideline 7, A-013). Without stages:
  the cards stacked in plan order, no stage heading, kind or ways (P-7).
- **Card:** a disclosure button `<symbol> <ID> <title>` (title as short text, `aria-expanded`), under it `Files` (the
  line's paths as plain text, without code marks, breaking as 0022 §4.6), `Covers` (each criterion ID a link, 0019
  §6.4) and, for returned, M-09. Expanded: `Do` and `Verify` as short texts and link `Open in plan` (plan at the step
  heading). Rows a step lacks are left out. Other links take 0019 AC-017's name and tooltip. Cards and the ways
  block are collapsed on every showing — the tab becomes visible or shows another spec (PD-063 (5) pattern); a model
  update keeps them.
- **Keyboard:** the cards are one tab stop. A *card row* is a parallel group's cards or a card of its own; Up and Down
  move to the previous or next card row (the card at the same position, else its last), Left and Right within a card
  row; at an end focus stays (0007 AC-017's grid, rows for columns). Tab reaches the focused card's links, then the
  next control; Enter or Space toggles the card.

### 5.4 Ways to run the current stage (P-4, E-8, E-10)

*Amended by 0028 (PD-082, A-010): §5.4 and AC-009 — "Report first" is not "Open step", so no ways show while it holds (0028 AC-007); the content of the ways stays 0026's.*

Shown in the Plan map only, for the current stage only, while both hold: the spec is Active or Ready and has no
return note (its next step is NS-6's case "Open step", 0021 §6.2, or NS-7); a parallel group of the stage holds two
or more unfinished steps. No other stage shows a way or prompt: it would hit `plans.md` "ask once which you are" or
the worker's "Check your base first … stop" (guideline 2).

- A disclosure `Ways to run stage <n>` after the stage's cards, in its row, collapsed on every showing; M-02 above it
  is the plan's word (E-10).
- Expanded, in order: the lead M-08; then each way as name, effect sentence, prompt in code (breaking as 0022 §4.6)
  and **Copy prompt** (0021 §6.4: label, name, 2 s feedback, the prompt alone on the clipboard), styled secondary
  (0022 §4.4):
  *Amended by 0026 (PD-082): a radio group with the checked way's part; M-08 and the effects sit behind `About these ways` (0026 §6.6, AC-009–AC-011).*

| Way | Effect (visible) | Prompt |
| --- | --- | --- |
| In sequence | One chat builds the steps one after another and stops at the stage end and at every test review on the way. | `Implement the whole stage <n> of <plan path> in sequence` |
| Subagents | Where a working agreement asks for a test review, the chat first writes the stage's tests and stops for it; then it hands each step to a subagent. Subagents cannot ask you; there is no steering in between. | `Implement the whole stage <n> of <plan path> with subagents` |
| Other agents | The chat proposes the commit a worktree needs and prints one start line per step. Paste each into another chat, tool or worktree; each worker builds its step and leaves a return note. | `Implement the whole stage <n> of <plan path> with other agents` |

- Under *Other agents*, while the spec is Active and the parallel group holding the next step has two or more
  unfinished steps: M-10, then per unfinished step of that group, in line order, the start line `Implement <ID> of
  <plan path> as a parallel worker.` — `parallel-work.md`'s wording, byte for byte — each with 0022 §4.4's icon Copy,
  named `Copy prompt: <line>`; not for Ready (A-005). The three stage prompts are proxies (A-007, AC-020).

### 5.5 Returned work (P-5)

- Each returned step shows its M-09 text on its card and the `↩` or `⊘` chip (§6). In the tab a stage with a returned
  step shows M-16 `<n> of <m> steps returned` (m = its steps returned or unfinished), or M-17 once n = m.
- **NS-6, returned work** (extends 0021 §6.2, checked before its other cases): while an Active spec
  has a return note, its next step is line 1 `Integrate the returned steps` · `/sdd-plan <spec path>`, no line 2;
  short intent `Integrate`; session · model `same chat or new chat` · fast (main session, A-004); effect `The agent
  checks each returned step against its files, runs its check and the quality gates, then ticks the steps and removes
  the return notes.`; then-sentence `Paste it once every worker you started is back.`
  Source: `sdd-plan.md` Mode B step 1 ("A return note … is parallel work that came back and is not integrated yet —
  integrate it first"); `parallel-work.md` *Integrating* 1–3 ("main session only").
  *Amended by 0026 (PD-088): `Send it once every worker you started is back.` while Send is offered (0026 §6.2, AC-021).*
  *Amended by 0026 (PD-080): session `current or new chat` (0026 §6.2).*
- A BLOCKED note makes the spec Blocked (PD-021 (2)): NS-4 applies, unchanged; the card shows the reason. A Review spec
  (plan `Done`, PD-021 (4) before (5)) keeps NS-5; its cards show the return.

*Amended by 0028 (PD-081, D-1): §5.5 "A Review spec (plan `Done`, PD-021 (4) before (5)) keeps NS-5": Review includes a finished plan (0028 §6.1); the texts stay.*

## 6. Texts (English, PD-016; in the text modules, asserted literally; all proxies, A-012)

| ID | Place | New | Replaces |
| --- | --- | --- | --- |
| M-01 | Step symbols and state words | done `✓` `done` · next `◐` `next` · open `○` `open` · dropped ID struck through `dropped` · returned `↩` `returned` · returned blocked `⊘` `returned, blocked` · not found `?` `not in the steps` | — |
| M-02 | Closing line | `The plan says: <closing line>` | — |
| M-03, M-04 | Side panel link; stage with `‖` there | `Open plan map` · `⇉ can run in parallel` | — |
| M-05 | Stage heading (tab) | `Stage <n>` · ` — <description>` | — |
| M-06 | Kind (tab) | sequential `→ in order: each step builds on the one before` · parallel `⇉ can run in parallel: the steps share no file` · mixed `⇉ partly in parallel` | — |
| M-07 | Steps in no stage | `Not in a stage` | — |
| M-08 | Ways lead | `Steps joined by ‖ share no file and may run in parallel. In sequence is the default; parallel pays off for large steps. Either parallel way runs the quality gates once, on the combined result, before a step is ticked.` | — |
| M-09 | Card return | `Returned · done` · `Returned · blocked: <reason>` (no reason: `Returned · blocked`) · `Returned · status unknown` | — |
| M-10 | Start lines lead | `Start lines — commit first: a worktree holds committed files only.` | — |
| M-11 | Tab, command | tab `Plan map`; purpose `See a plan's stages, what can run in parallel and how to start it.`; `FeatherSpec Studio: Open Plan Map` | — |
| M-12…M-15 | Tab states | `Select a spec with a plan to see its stages.` · `<number> has no plan yet.` · `<number> is done.` · `Specs with a plan` | — |
| M-16, M-17 | Stage return (tab) | `<n> of <m> steps returned` · `All steps returned: the next step integrates them.` | — |
| — | Ways, NS-6 case | §5.4 table, `Ways to run stage <n>`, card labels `Files` `Covers` `Do` `Verify` `Open in plan` `Open plan`; §5.5's intent, short intent, effect, then-sentence | — |
| — | Side panel Steps row | the count heads the Plan section | Progress' Steps row and "Next open step: …" while the section shows |

*Amended by 0025 (PD-082): the stage line is the returned-work statement U-05, and U-08 while a member of a parallel group is still out (0025 §5.6, AC-015, AC-025).*

*Amended by 0025 (PD-082): the symbols are replaced by codicon motifs from one step-state table; state words unchanged (0025 §5.5, U-01, AC-014).*

## 7. Error cases and edge cases

- Closing line absent → no M-02; the ways still show where §5.4 holds. Closing contradicts the `‖` marks → both as
  written. An ID twice in stage lines → each occurrence is a chip with the step's state; the first sets the current
  stage.
- Mixed stage `T-002 ‖ T-003 → T-004` → ways while T-002 and T-003 are unfinished; start lines for those two only.
  `T-002 → T-003 ‖ T-004` with T-002 next → ways, no start line until T-002 is done.
- The current stage has one unfinished step left (`‖` partner done) → no ways; NS-6 names the step.
- A return note for an ID the plan lacks → in Files only (0019), yet NS-6 "Integrate"; a ticked step with a note →
  *returned* (integration not finished), NS-6 "Integrate".
- Close or Escape in the side panel beside the map clears the selection (0019 §6.1) → M-12, focus on that spec's
  button. The selected spec disappears → 0019 AC-020; the tab shows M-12.
- Plan text with Markdown or HTML → shown as text; only the tab's M-02 formats inline Markdown (0013's renderer).

## 8. Acceptance criteria

Decided by unit tests (core, no `vscode`) and component tests (jsdom) unless marked; `fast` stands only in the
literal coach line of AC-013 (0021 §6.5), the exception 0021 §9 names to `.claude/rules/specs.md`. Fixtures:
`fs110-parallel-synthetic` (stage 2 `T-003 ‖ T-004`, DONE and BLOCKED notes) with the variants the plan makes (no
notes; DONE only, plan In Progress), `fs110-de-active-review` (`No parallel stage:`), `fs110-ready-synthetic`,
`studio-0015`, and a generated plan with single, sequential, parallel and mixed stages (`‖` before and after `→`), a
struck step, an unknown ID, a step in no stage, no closing.

- **AC-001** For a plan with stages the projection shall give one row per stage line in file order with its number, IDs in line order, the separators of §5.1 and its description; each step's state by §5.1's precedence; steps in no stage after the stages; for a plan without stages one row of all steps in plan order.
  > **Given** `fs110-parallel-synthetic` without notes, plan In Progress **Then** rows `1: T-001 → T-002` (✓ ✓), `2: T-003 ‖ T-004` (◐ ○), `3: T-005` (○); count `2 of 5 done`.
- **AC-002** While no return note of the spec lies, the *next* marker shall be exactly 0019's next open step, and while one lies no step shall be marked; for every fixture whose next step is NS-6's case "Open step" or NS-7 with a step ID the marked ID shall equal the ID in its first line.
- **AC-003** The side panel shall show the Plan section of §5.2 directly after Problems and before Progress for every spec with a readable sibling plan whose state is not Done, and none otherwise; while it shows, Progress shall have no Steps row and no "Next open step"; M-02 shall be the closing line as short text with the full text as tooltip, absent without a closing line.
- **AC-004** Each chip shall carry the symbol of M-01, the name `<ID> <title>, <state word>`, and as tooltip and accessible description that name, then `Open <file name> at line <n>`; activating a chip shall send the open request for the plan at that step's heading line (0019 AC-017); a *not found* chip shall be no link; M-04 shall follow exactly the stages that hold `‖`; the section shall contain no button that copies.
  *Amended by 0025 (PD-082): a chip is a step link: it leads into the Plan map, Ctrl or Cmd opens the plan at the heading; its tooltip is 0025 U-02 (0025 §5.1, AC-001–AC-004).*
- **AC-005** When the developer activates M-03, the system shall send one navigation request for area `planMap` with the spec as target, keep the selection and side panel and move focus to the map's heading; the Plan map shall then show that spec, and the side panel no Plan section.
- **AC-006** The panel navigation shall list exactly Overview, Board and Plan map in this order, each with its icon (A-003's motif for Plan map); the manifest shall contribute `featherspec-studio.openPlanMap` titled M-11; running it shall show the Plan map tab; a remembered `planMap` area shall be restored after a reload (0005 AC-009).
- **AC-007** The Plan map shall show, first match, M-12 with no spec selected, M-14 for a Done spec, M-13 for one without a sibling plan and `<number>: ` with 0022's X-14 for an unreadable plan, each followed by M-15 and the buttons of §5.3 in their order, no M-15 without a button; activating one shall select its spec, keep the tab and focus the map's heading; when the selection changes in the tree, the Overview or the Board, the tab shall show the new spec; below a 900 px Studio panel (query stubbed) the tab shall show no detail and no back button, from 900 px the side panel beside it.
- **AC-008** For a spec with a plan the Plan map shall show the header (with 0016's warning while the spec has a Problem), M-02 with the full closing line, one stage row per §5.3 with M-05, M-06 and its cards side by side per parallel group, and for a stage whose steps are all done or dropped its chips instead of cards; a card shall show symbol, ID, title, `Files` without code marks, `Covers` IDs as links and M-09 for a returned step; activating a card by pointer, Enter or Space shall toggle `aria-expanded` and the `Do`, `Verify` short texts and `Open in plan`; cards shall be collapsed whenever the tab shows another spec or becomes visible again; no rendered text shall hold a Do or Verify text beyond its short text.
  *Amended by 0025 (PD-082): a card also shows `Verified`, `Reported`, the state word after each covered criterion and, on the step due now, a Copy prompt (0025 §5.2, AC-007, AC-008).*
- **AC-009** The ways block shall render after the current stage's cards exactly when §5.4's conditions hold: collapsed on every showing; expanded, M-08 and the three ways of §5.4 in order with their effect sentences and prompts literally, `<n>` and `<plan path>` filled; then, for an Active spec whose next step's parallel group holds two or more unfinished steps, M-10 and exactly one start line `Implement <ID> of <plan path> as a parallel worker.` per unfinished step of that group, else none. No other stage, and no spec in another state, shall show a way or a prompt.
  > **Given** `fs110-parallel-synthetic` without notes, plan In Progress **Then** stage 2 offers `Implement the whole stage 2 of .specs/active/0001-parallel-demo.plan.md in sequence` and the start lines for T-003 and T-004; stages 1 and 3 offer none. **Given** a stage `T-002 → T-003 ‖ T-004` with T-002 next **Then** the ways and no start line.
  *Amended by 0028 (PD-082, A-010): AC-009 — no ways while 0028's case "Report first" holds (0028 AC-007).*
  *Amended by 0026 (PD-082): 0026 §6.6, AC-009–AC-011: radio group, `(?)`, the checked way's part.*
- **AC-010** Each way's Copy shall follow 0021 AC-008 (label, name, feedback, clipboard holds the prompt alone) as a secondary button; each start line's Copy shall follow 0022 AC-012 as an icon button that copies its start line; the Plan map area shall render no primary button, so the view holds at most one (the side panel's, 0022 §4.4 (1)).
  *Amended by 0024 (PD-068): AC-010 "at most one (the side panel's …)" — the side panel's primary is 0024's split button where Send is offered; it counts once (0024 AC-003).*
  *Amended by 0025 (PD-082): the Plan map header's first line is a primary place while the side panel leaves out its Next step; the map with the side panel beside holds at most one primary, a card's Copy prompt is secondary (0025 §5.3, §5.2, AC-010).*
- **AC-011** In the Plan map one card shall be the tab stop; Up and Down shall move focus to the previous or next card row and Left and Right within one (§5.3), focus staying at an end; Tab from the focused card shall reach its links, then the next control outside the cards; every control shall show the theme's focus outline (0013's CSS guard covers the new rules).
- **AC-012** Where a return note exists for a step, the card and chip shall show its state (M-01, M-09: done, blocked with the reason as short text and full as tooltip, unknown), the stage M-16 or M-17; when a note appears, changes or disappears, the Plan map and the side panel shall show it within 500 ms after the model-changed notification (PD-047), keeping expanded cards, the ways block's state and focus where the element still exists; a focused step card that leaves shall hand the focus to the card now at its place (same stage, same position, else the one before it), and when no card is left there, or when the focused element was a way, a Copy or a start line, focus shall go to the map's heading.
  > *Amended by PD-077 (2026-11-18, the orchestrator as Gregor's delegate, after the compile S78 finding D3): the wording read "… and focus where the element still exists, else focus on the map's heading", which sent every removed card to the heading and left a removed way, Copy or start line without a rule. Keeping the keyboard user's place in the grid is kinder than a jump to the top; the side panel's rule (0019 AC-020: its heading) is unchanged.*
  *Amended by 0025 (PD-082): the stage line is the returned-work statement U-05, and U-08 while a member of a parallel group is still out (0025 §5.6, AC-015, AC-025).*
  *Amended by 0026 (PD-082): "keeping expanded cards, the ways block's state" includes the checked way (0026 AC-013).*
- **AC-013** While an Active spec has a return note, `nextStep()` shall return NS-6 with the single line `/sdd-plan <spec path>` and the intent, short form `Integrate · /sdd-plan`, coach line `same chat or new chat · fast model`, effect and then-sentence of §5.5 literally; without a note NS-6 shall be as 0021 AC-003 and AC-005; a BLOCKED note shall still give NS-4.
  *Amended by 0028 (PD-082): AC-013 "without a note NS-6 shall be as 0021 AC-003 and AC-005" — as 0028's notes leave them.*
  *Amended by 0026 (PD-080): coach `current or new chat · fast model` (0026 AC-002).*
- **AC-014** No chip, link, card, way, Copy or command of this spec shall create, change, move or delete a file of the workspace, start a process or write a setting (0017 AC-023's tests extended); AC-001–AC-013 shall hold in Restricted Mode and a reader window.
- **AC-015** Every text of §6 and §5.4 shall come from a text module and be asserted literally; 0016's user-language sweep shall cover the Plan section and the Plan map and find no rule ID, `struck`, `sibling`, `kind`, `stem` or `parsing`.
- **AC-016** Every test at the commit on which this spec's implementation starts that decides a statement §4 does not change shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI; a script compares the titles of both commits and the plan lists every missing title with the changed statement or the head title that replaces it.
  *Amended by 0024 (PD-068): AC-016 (test audit) — also except the tests 0024 AC-014 lists against a statement 0024 §5 replaces.*
  *Amended by 0028: also excepts the tests 0028 AC-012 lists against a statement 0028 §5 replaces.*
  *Amended by 0025 (PD-082): also except the tests 0025 AC-020 lists against a statement 0025 §4 changes.*
- **AC-017** The statements of §4 shall carry their notes, no PD row shall be edited, `.claude/rules/ux-guidelines.md` shall read guideline 4 and `docs/product/ux-guidelines.md` its Panel row as §4 says, `README.md` shall name the Plan map tab, the three ways and "Integrate the returned steps" and hold no "two tabs", `CHANGELOG.md` shall name the Plan section and the Plan map under the version in preparation, and `docs/release-checklist.md` shall carry AC-018–AC-020 and no line saying the panel shows "Overview and Board only".
- **AC-018** *(manual, preview harness by the orchestrator, then Gregor; guideline 12)* Dark, Light and High Contrast at 1600 px and 1000 px window width on `fs110-parallel-synthetic` and `studio-0015`, at 1600 px with the side panel at its default width: the Plan section and Plan map cut no ID, prompt or start line; `‖` cards sit side by side and wrap, uncut, once the divider leaves the map less than two cards' width; at 1000 px (Studio panel below 900 px) the map shows alone; every Copy is fully visible and reachable by Tab; screenshots and verdict in the plan.
- **AC-019** *(manual, Gregor; PD-069 click test on an HTML draft before `/sdd-plan`, then on the build)* On a project with a `‖` stage, Gregor says without the plan file which stages could run in parallel, why or why not, and which prompt he would copy; he confirms or changes E-8's prompts, E-9's two places, E-10's collapsed ways and §6's texts; the plan records the answers, a change is a revise of this spec.
- **AC-020** *(manual, Gregor with Claude Code and Copilot; E-8)* On a copy of `tip-splitter` re-cut with a `‖` stage: each stage prompt of §5.4 copied into a fresh chat does what its effect says, the test-review stop kept (`plans.md`); a start line in a second chat builds exactly its step and writes its return note; `/sdd-plan` then integrates it; 0021's NS-6 line 1 for a step of that stage builds only that step (asked how to run the stage: "in sequence"). A prompt that fails is replaced by the wording that worked, or goes to a FeatherSpec release (OP-002).

## 9. Technical notes for developers or AI agents

- As-is (read 2026-11-18): `parsePlan()` → `stages { present, stages: PlanStage[] { number, raw, line, stepIds, kind },
  closing? { raw, line, parallel } }` (`kind` and `stepIds` from the head before `\s[—–-]\s`; `raw` keeps the whole
  line and continuation lines; the projection reads the separators from the head). `PlanStep { id, title, line,
  struck, ticked: boolean | 'undetermined', coveredCriteria, files, doText, verify }`. `ReturnNoteEntry { stepId,
  parsed { status, blockedOn } }` joined to `SpecEntry.returnNoteKeys` (`readProject.ts`); BLOCKED sets `blocked`
  (`lifecycle/entryContext.ts`); Review needs plan `Done`. 0019's next open step is `openStep()`,
  short text `plainShort()` (`core/board/shortTitle.ts`; not `shortTitle()`). `nextStep()`
  in `core/board/nextStep.ts`. No module reads `stages` today.
- New core folder `src/core/planMap/` (projection for section and tab, pure); protocol `src/shared/protocol/planMap.ts`
  with guards, `SpecDetailView.plan?`, area `planMap` in `AREA_IDS`, `AREA_COMMANDS`, `AREA_PATHS`, the registry;
  protocol version bump. A new source folder → `/sdd-architecture-update` in the same change set.
- The NS-6 case lives in `nextStep()` and 0021's intent table, so cards, rows, tree, status bar follow (guideline 1).
- Webview: `detail/PlanSection.tsx`, `areas/planMap/`; reuse `ui/CopyButton.tsx`, 0022's icon button and narrow-mode
  query, `board/focusModel` (`moveFocus` with card rows as its columns), `ui/inlineFormat.ts`; widths by flexbox and
  container rules, no `@media` (guideline 12). Tests asserting two areas, the Steps row or NS-6: `areas`, `SpecDetail`,
  `detail`, `manifest`, `messages`, `nextStep`, `stepView`, `userLanguage`, `webviewBundle` (300 words; 61 today),
  both `noWrite` (board, copyNextStep), `src/test/shell.smoke`.

*Amended by 0028 (PD-081, D-1): §10 "Review needs plan `Done`" — Review includes a finished plan (0028 §6.1).*

## 10. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | E-9: both places, compact section and full tab (proxy) | 08 E-9 recommendation; orchestrator | §5.2 or §5.3 goes |
| A-002 | E-10: ways always collapsed, with M-02 above (proxy) | A plan has no recommendation field: 3 of this repository's 20 plans (0002, 0016, 0017) put "Recommended: in sequence" into the closing prose, the rest give reasons only; in sequence is FeatherSpec's default (`plans.md`) | AC-009 |
| A-003 | Tab `Plan map`, ID `planMap`, command Open Plan Map, not 08's "Plan"; icon motif `type-hierarchy-sub` (proxy) | The tree's "Open Plan" opens the plan file (0020); PD-054's tree entries are gone (0020 §4.5); a branching motif for parallel steps | M-11, AC-006 |
| A-004 | "Integrate the returned steps" is an NS-6 case with `/sdd-plan`, triggered by any return note, session `same chat or new chat` (proxy) | Guideline 1 (single source); `sdd-plan.md` Mode B step 1; `parallel-work.md` "A return note lying … is not integrated", *Integrating* "main session only"; 07 §6.4 rule 4 "Prompt für die Hauptsitzung" | AC-013 |
| A-005 | Ways for the current stage only, Active or Ready; start lines only for an Active spec and the next step's parallel group (proxy) | Guideline 2; `plans.md` and `parallel-work.md` stop a step whose earlier steps are open; the start signal moves a Ready plan (`sdd-plan.md` *Always*) | AC-009 |
| A-006 | *Other agents* starts with a main-session prompt, then the start lines (proxy) | `parallel-work.md`: the main session notes the stage base and proposes the commit before printing the lines; 08 P-4 offered the lines alone | §5.4 |
| A-007 | E-8: the three stage prompts as §5.4 words them (proxy) | `plans.md` *One step, then stop* "the whole stage", its `‖` bullet for the way names and costs; `parallel-work.md` *Subagents*, *Other agents*; checked by AC-020 | §5.4, AC-009 |
| A-008 | The section follows Problems and takes over Progress' Steps row (proxy) | Guideline 3 (Problems first), guideline 5 (no duplicate count) | AC-003 |
| A-009 | 08 P-6 "Why not parallel?" is M-02 plus M-06 (proxy) | The reason lives in the closing line; `→` means "builds on" (`sdd-plan.md`) | §5.3 |
| A-010 | From a 900 px panel the side panel stands beside the map; below, the map alone, no detail (proxy) | 0019 §6.1; PD-075 shows one thing below 900 px, but 0022 G-4's detail in place would hide the map, and its back clears the map's spec | §5.3, AC-007, AC-018 |
| A-011 | Per-step start-line Copies, not one "Copy 2 lines"; arrow keys as the Board's grid, rows for columns (proxy) | One line per chat (07 §6.4 open question, 08 P-4); 08 AC-007, one grid pattern in the Studio | §5.4, AC-011 |
| A-012 | Every text of §5 and §6 as the drafts show it (proxy, confirmed by the click test) | PD-069 process; PD-076: the proxies the drafts show stand as drawn | §6 |
| A-013 | A stage whose steps are all done or dropped shows chips, not cards (proxy) | Guideline 7 "Done is collapsed"; 07 §6.4's sketch expands one stage | AC-008 |
*Amended by 0026 (PD-080): session `current or new chat` (0026 §6.2).*

*Amended by 0025 (PD-082): except a navigation target and a finished stage whose chip is activated: they show expanded, cards until the next showing (0025 §5.1, §5.7, AC-001, AC-003, AC-016).*

## 11. Open points

- OP-001 Click test on an HTML draft before `/sdd-plan` (PD-069, AC-019). Closed 2026-11-18 by PD-076: passed ("ich
  finde es super so"), the proxies the drafts show stand as drawn; AC-019's part on the build stays.
- OP-002 E-8: the stage prompts are proxies; only the start line and the integration via `/sdd-plan` are FeatherSpec's
  own. Followed: §5.4; AC-020 decides; a fixed phrase is a FeatherSpec release (08 §7).
- OP-003 0021 and 0022 are implemented, 0024 is a Draft; a change there to NS-6's table, Copy prompt, the button
  classes, G-4 or Send is followed by reference. Re-checked 2026-11-18 against 0021 §6.2 (variant A, PD-072), 0022 G-4
  (PD-075), 0024 §3, and against their code at `196cf72` (plan *Research*).
- OP-004 `tip-splitter`'s plan has no `‖` stage (`No parallel stage:`); AC-019 and AC-020 need a re-cut copy or
  `fs110-parallel-synthetic` (recommendation: a re-cut copy, so the prompts meet a real agent).
- OP-005 Tree context menu "Open Plan Map" (§3): not built. Closed by PD-076: the drafts showed no tree entry and passed.
  *Amended by 0025 (PD-082): built as `Show in Plan Map` in the tree's context menu (0025 §5.1, AC-005; 09 F-1 (2)).*
- OP-006 `/sdd-clarify` 2026-11-18 (S66): all findings resolved in one pass at Gregor's standing request (no
  walkthrough; list `0023-findings.md`; cross-spec with 0022 G-4 and 0024). Readings; say so if one is wrong: (a) the
  map alone below 900 px; (b) *next* only while no note lies; (c) start lines only for an Active spec's next parallel
  group; (d) integration not in a worker's chat; (e) finished stages as chips; (f) `⊘` for a blocked return.

## 12. Definition of Ready / Done and next steps

Ready: §5, §6 literal, §4 listed, OP-001 closed (PD-076). Clarified on 2026-11-18 (OP-006). Done: AC-001–AC-017 green
with evidence, AC-018–AC-020 checked, §4 applied, docs, architecture, Memory Bank synced, `/sdd-compile` READY. Planned
2026-11-18 ([plan](0023-plan-map-stages-parallel-work.plan.md)); next: Gregor reads the plan, then the start signal.
