# Plan Map Navigation and Progress Clarity

**Status:** Draft
**Plan:** _none yet_

Basis: work order `docs/ux-audit/09-round2-review.md` (F-1, F-2, AC-a…AC-g; G-1, G-2, G-7, G-10; §7, §8). Decisions:
**PD-079**, **PD-081** part 2, PD-082, PD-040, PD-047, PD-054, PD-077, PD-016; the orchestrator's product-owner decisions
**D-1** (a finished plan is Review, 0028) and **D-2** (one Next step per window) of 2026-11-19; guidelines 1–12. Builds on
0019, 0021–0024 and 0028 (next-step rules, built first) and restates none; 0026 owns the texts of short forms, coach
lines, Send targets and the ways block, 0027 the attachment, which this spec only places. No interview: proxies in §10.

## 1. Summary

A step link opens its card in the Plan map (focused, highlighted), Ctrl/Cmd+click the plan file; the tree gets **Show in
Plan Map**. Cards show `Verified:`, the worker's report, criterion states, Copy prompt on the step due now. The header
carries the next step (finished plan: the check). Percentages, codicon motifs, one returned-work statement, a parallel hint.

## 2. Goal and problem

On `tip-splitter` a click on `T-006` opened the plan's Markdown, not the step in context (g-r2-01, r12); with every
step ticked the map offered no action (g-r2-04, PD-081); "4 of 6 done" read as half (g-r2-02); after workers returned,
map, next step and Progress disagreed (r06); the next step hid a parallel stage (r02); `◐` is a thin stroke in the Linux
font (r11); an expanded card stretched its neighbour (r05). Goal: Gregor learns what a step does, whether it can run in
parallel, how far the spec is and what comes next without a Markdown file (AC-023, AC-024). User: the developer.

## 3. Scope

### In scope

- Step links, Ctrl/Cmd+click, Show in Plan Map (§5.1); cards (§5.2); the next step in the map header (§5.3);
  percentages (§5.4); step motifs (§5.5); one statement for returned work (§5.6); the parallel-stage hint (§5.7).
- §4's amendments; README, CHANGELOG, release checklist, guidelines 5 and 11 in both guideline files.

### Out of scope

- Next-step rules and the state of a finished plan — because 0028 owns `nextStep()` and D-1's Review (PD-081 part 1, G-11).
- Texts of short forms, coach lines, Send targets, the compact ways block (0026), attaching the spec (0027) — because
  those specs own them (PD-082).
- A view of requirements; criterion IDs keep opening the spec file — because 09 F-1 (5) keeps them there.
- Full Do, Verify or Notes text and the return note's Notes on a card — because guideline 5 (state, not text).
- Copy prompt on any card but the step due now — because it would skip the order; `‖` partners have start lines.
- Command links inside the tree tooltip — because it is untrusted Markdown with no command links (0020 §4.2).
- The hint of §5.7 in the first Now row, on cards, in the tree or in the map header — because guideline 11.
- The `‖`, `→`, `⇉` characters of stage lines and kind texts — because they are the plan's notation; G-1 names steps.

## 4. Amendments of other specs

Applied in the implementing change set as notes "*Amended by 0025 (PD-082): …*" after earlier ones; PD register unedited.

| Spec · statement | Amendment |
| --- | --- |
| 0023 §5.2 "A chip is a link that opens the plan at the step's heading (0019 §6.4)", tooltip "then 0019 AC-017's `Open <file name> at line <n>`"; AC-004 "activating a chip shall send the open request …" | A chip is a step link (0025 §5.1): it leads into the Plan map, Ctrl/Cmd opens the plan; tooltip U-02 |
| 0019 §6.3 Steps "Next open step: <ID> <title>"; AC-017 "a link of the side panel (ID …) shall send the open request", "tooltip … 'Open <file name> at line <n>'" | Its ID is a step link for a map-able spec (0025 §5.1); while a return note lies the line is U-05 (0025 §5.6); AC-017 holds for every other link |
| Guideline 5 "IDs and "Open" go to the file at the line, beside the panel (`ViewColumn.Beside`)" (`.claude/rules/ux-guidelines.md`) | "Criterion IDs and "Open" go to the file at the line, beside the panel (`ViewColumn.Beside`); a step ID goes to its card in the Plan map, Ctrl/Cmd+click to the file"; `docs/product/ux-guidelines.md` gains row `5 (2026-11-19)` (F-1, g-r2-01) |
| 0023 §3 out of scope "A coach line or `(?)` in the Plan map", "Send to an assistant for the map's prompts"; §5.3 *Header* | The header shows the spec's next step (0025 §5.3); ways and start lines keep Copy prompt |
| 0023 §3 out of scope bullet "Open Plan Map" in the tree's context menu; OP-005 | Built as `Show in Plan Map` (0025 §5.1; 09 F-1 (2), PD-082) |
| 0023 §5.2 "While the Plan map tab is shown, the side panel leaves this section out"; 0019 §6.2 table, AC-009 | Also its Next step section, while the map's header shows the spec the side panel shows (0025 §5.3, D-2) |
| 0021 §6.5 "in the detail … and in the first Now row …; nowhere else", §6.6, A-002, AC-009; guideline 11 "(detail, first Now row)" (`.claude/rules/ux-guidelines.md`) | Plus the Plan map header; the detail beside it then shows none (D-2); guideline 11 reads "(detail, first Now row, Plan map header)"; rationale row `11 (2026-11-19)` (PD-081, g-r2-04) |
| 0022 §4.4 (1), (2), AC-010, AC-011; 0023 AC-010 "the Plan map area shall render no primary button" (as 0024 amended it) | (4) the Plan map header's first line, while the side panel leaves out its Next step (D-2); the map with the side panel beside holds at most one primary; a card's Copy prompt is secondary |
| 0024 §4 out of scope "… the plan map (0023)", A-005; AC-003 "no … plan-map element … shall render a Send control" | Except the Plan map header's first line, which follows 0024 §6.3–§6.5 and AC-003–AC-010 as the detail's does |
| 0023 §5.3 *Card*, AC-008 "a card shall show symbol, ID, title, `Files` …, `Covers` IDs as links and M-09"; 0021 §6.4 list of Copy prompts | Plus §5.2's rows: `Verified`, `Reported`, criterion states, Copy prompt of the step due now |
| 0023 §5.3 "Cards and the ways block are collapsed on every showing"; A-013, AC-008 "its chips instead of cards"; §5.4 "collapsed on every showing" | Except a navigation target (0025 §5.1, §5.7) and a finished stage whose chip is activated: they show expanded, cards until the next showing |
| 0023 §6 M-01 symbols, AC-001's example symbols, AC-004 "the symbol of M-01"; 0022 §4.8 "no surface maps a state itself", AC-026 | U-01's motifs from one step-state table beside 0022's board-state table (0025 §5.5); state words unchanged |
| 0023 §5.5 and §6 M-16, M-17; AC-012 "the stage M-16 or M-17" | U-05 on each stage row holding a returned step (0025 §5.6) |
| 0019 AC-010 "no stage or step text other than …" (as 0023 amended it) | Plus U-05 and U-06 |
| 0019 §6.3 Steps and Criteria texts, AC-011, AC-012 counts; 0023 §5.1 *Count*; 0018 B-5, §7 card row 2, AC-019 "Steps 3/7"; 0020 §4.2 tooltip `Steps <d>/<t> · Criteria <d>/<t>` | With ` · <p> %` (U-04, 0025 §5.4); every bar carries its text as `title` and `aria-valuetext` |
| 0006 BR-04 "rounded down", as 0018 §7 row "Figures line tooltip" and 0018 AC-009 carry it | PD-079's rounding, U-04's formula |
| 0020 §4.2 context menu "in this order: `Open Spec`; `Open Plan` …; `Copy Next Step`", §6, AC-008, AC-011 "with exactly these titles" | `Show in Plan Map` first, on rows of a map-able spec (0025 §5.1); the three follow unchanged |
| PD-040 "a spec (stem), a run (ID) or a board filter"; 0005's note "the navigation request targets a spec or a board filter" (0015) | A spec target may name a step or the ways of its current stage, delivered once (A-011; register not edited) |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021; 0021 AC-020; 0022 AC-017; 0023 AC-016; 0024 AC-014 (test audits) | Also except the tests 0025 AC-020 lists against a statement this table changes |

## 5. Business rules

### 5.1 Step links lead into the Plan map (F-1 (1)–(3), (5); A-003, A-004, A-005)

- A *map-able* spec is one the Plan map shows a plan for (0023 §5.1: not Done, readable sibling plan). A *step link*
  is a step chip of the side panel's Plan section, the ID of Progress' next open step of a map-able spec, and a chip of
  a finished stage in the Plan map. Other IDs keep 0019 §6.4's file link.
- **Click, Enter or Space:** one navigation request, area `planMap`, target the spec and the step (PD-040). The map then
  shows the spec (0023 §5.3) and the step's card expanded, scrolled into view, with focus on its disclosure button and
  highlighted for 1500 ms; a finished stage holding the step shows its cards until the next showing (0023 §5.3).
  Selection and side panel stay (0023 AC-005). Each activation applies once (A-011): the same link again repeats it; a
  reload, a model update or a later showing of the tab does not; a target that arrives before its spec shows waits.
- **With Ctrl or Cmd held (click, Enter or Space):** 0019 §6.4's open request for the plan at the step's heading.
- **Name** as today (chip: 0023 §5.2; next open step: 0019 AC-017); tooltip and description: the name, a break, U-02.
  **Highlight:** a 2 px outline in the focus colour (High Contrast: its active border); no transition under
  `prefers-reduced-motion: reduce`, otherwise at most 150 ms (0013's guard).
- **Tree:** `Show in Plan Map` (U-03) first in the context menu of a map-able spec's row. It opens a closed panel,
  sends the step target with the first step ID a line of the spec's next step names (none: the spec alone, focus on
  the map's heading) and brings the panel to the front with focus.
- Criterion IDs, `Open in plan` and `Open plan` keep opening their files (09 F-1 (5); guideline 5 as §4 amends it).

### 5.2 Richer cards (F-1 (4), G-10; A-006)

Rows added to 0023 §5.3's card, in this order; rows a step lacks are left out:
- `Verified` and the short text (0023 §5.1, full text as tooltip) of the step's `Verified:` value, for a done step.
- `Reported` and the short text of its return note's `Verified:` value, for a returned step, after M-09.
- After each `Covers` ID its state word `verified`, `built` or `open`, where exactly one traceability row's cell is that
  ID and its trimmed `State` is exactly that word (0019 §6.3); anything else shows no word (0016: no guess).
- In the expanded part, after `Open in plan`: **Copy prompt** (0021 §6.4, secondary) on the card of the step that the
  first line of the spec's next step names (0021: NS-6 "Open step", NS-7), copying that line; on no other card.
- **G-10:** a card row aligns its cards to their start (09: `align-items: start`); an expanded card stretches no neighbour.

### 5.3 The next step in the Plan map header (PD-081 part 2; A-001, A-002)

- Header order: `<number> <title>` with its Problem mark (0023), then the spec's next step exactly as the detail shows
  it, without U-06 (heading `Next step` with `(?)`; every line with intent, prompt and Copy prompt, the first primary;
  coach line; 0024's split button where Send is offered — 0021 §6.3–§6.6, 0022 §4.4, 0024 §6.3, its target 0026
  §6.1), then the count, `Open plan` and M-02. Source: the detail view's `nextStep()` (guideline 1); texts 0021, 0026, 0027.
- **One next step per window (D-2).** Map and side panel both show the selection (0023 §5.3, 0019 A-002). Exactly while
  the header shows the spec the side panel shows, the side panel leaves out its Next step section, as its Plan section
  (0023 §5.2): one next step, coach line and primary per view (guidelines 8, 11; 0026 §6.4 cites D-2). While the map
  shows a state of 0023 §5.3 or waits for the view, the side panel keeps it. Deviation from guideline 1: the header
  answers for the side panel. A finished plan's header shows the check (0028 §6.1, D-1), a step without a line its text.

### 5.4 Percentages (F-2, PD-079; A-007)

- `p` = done ÷ total × 100, rounded half up, at most 99 while done < total; 100 only when done = total; 0 is shown. No
  percentage where the total is 0 or the figure is not available.
- Every progress text ends in ` · <p> %` (U-04): Steps and Criteria rows (0019 §6.3), Plan section and Plan map
  counts (0023 §5.1), the Board card's Steps and Criteria parts (0018 B-5), the tree tooltip's figures (0020 §4.2).
  The Overview's figures-line tooltip keeps its form and takes this rounding (U-04's formula).
- Every progress bar carries its visible text as `title` and `aria-valuetext` (PD-079).

### 5.5 Step motifs (G-1; A-008)

One table in `src/shared` maps each step state to a codicon motif and colour, the pattern of 0022 §4.8: done `check`,
next `debug-stackframe` in the focus colour, open `circle-large-outline`, returned `reply`, returned blocked
`circle-slash` in Blocked's colour (0022 §4.8), not found `question`, the rest in the description colour; a dropped
step keeps its struck ID and has no motif. Chips and cards draw the panel's own glyph of the motif (PD-054),
`aria-hidden`; the state word stays in the accessible name. Colour is never the only cue.

### 5.6 One statement for returned work (G-2; A-009)

While a return note of the spec lies, one sentence U-05 says the same in three places: under the Plan section's count,
in Progress' Steps row in place of the next open step, and on each Plan map stage row holding a returned step in place
of M-16 and M-17. It is built from n (the spec's return notes by distinct step ID), the IDs of the steps returned
blocked (plan order) and a clause from the next step's case: 0023 §5.5's NS-6 "returned work" → integrates; NS-4 →
finds out what blocks; any other case → no clause. None of the three names a next open step while a note lies.

### 5.7 Parallel stage hint (G-7; A-010)

While the spec's current stage has ways (0023 §5.4's conditions), the detail's Next step shows U-06 directly after its
first line's coach line (with tips off: after its Copy prompt and status region) and before line 2. `Ways to run it`
sends a navigation request for `planMap` with the spec and its ways as target: the map shows that stage's ways block
(0026 §6.6) expanded, scrolled into view, focus on its disclosure `Ways to run stage <n>`, highlighted, applied as §5.1.

## 6. Texts (English, PD-016; in the text modules, asserted literally; proxies, confirmed by the click test AC-023)

| ID | Place | New | Replaces |
| --- | --- | --- | --- |
| U-01 | Step motifs (§5.5) | done `check` · next `debug-stackframe` · open `circle-large-outline` · returned `reply` · returned, blocked `circle-slash` · not in the steps `question` (codicon names; M-01's words unchanged) | M-01's `✓` `◐` `○` `↩` `⊘` `?` |
| U-02 | Step link tooltip after the name | `Show <ID> in the plan map · Ctrl+click opens the plan file` (macOS: `Cmd+click`) | `Open <file name> at line <n>` on step links |
| U-03 | Tree context menu | `Show in Plan Map` | — |
| U-04 | Progress | `<d> of <t> done · <p> %` · `<v> of <t> verified · <p> %` · `Steps <d>/<t> · <p> %` · `Criteria <d>/<t> · <p> %`; formula `Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded half up, at most 99 % until all are done` | the same without ` · <p> %`; formula ending `rounded down` |
| U-05 | Returned work | `<n> returned` + (`, <IDs> blocked`, IDs joined by `, ` · else `, waiting to be integrated`) + (`: the next step integrates them` · `: the next step finds out what blocks` · nothing) + `.` | M-16, M-17; `Next open step: <ID> <title>` while a note lies |
| U-06 | Parallel hint (detail) | `Stage <n> can run in parallel · ` and the link `Ways to run it` | — |
| U-07 | Card rows | labels `Verified`, `Reported`; state words `verified` · `built` · `open`; the card's Copy prompt as 0021 §6.4 | — |

## 7. Error cases and edge cases

- Target step gone → focus on the map's heading, no highlight; spec no longer map-able (also from a stale tree menu)
  → 0023 §5.3's state text; a dropped step → its card; a step on two stage lines → its first card. Ctrl/Cmd+click,
  plan gone → 0019's not-found text, as today.
- A model update during the 1500 ms → the highlight stays while the card exists; focus as 0023 AC-012 and PD-077.
- A note for an ID the plan lacks → counts in n, shown by the Plan section and Progress, by no stage row. Unknown
  status → returned, not blocked. Two notes for one step → one in n. A first line naming no step (NS-6 "Integrate",
  0028's "Report first") → no card Copy prompt.

## 8. Acceptance criteria

Unit tests (core, no `vscode`) and jsdom component tests unless marked; every UI criterion starts red on a stub. Fixtures:
`fs110-parallel-synthetic` in 0023's variants (no notes, plan In Progress, first line `Implement T-003 of …` under 0028;
DONE note only; both notes), `fs110-ready-synthetic`, `studio-0015`, 0023's generated plan, an all-ticked `tip-splitter`
copy, plan `In Progress` (PD-081; Review by D-1).

- **AC-001** When the developer activates a step chip of the Plan section by click, Enter or Space without Ctrl or Cmd, the system shall send exactly one navigation request, area `planMap`, target the spec and that step, and no open request; the Plan map shall then show the spec with that card's `aria-expanded` true, `scrollIntoView` called on it (stubbed), focus on its disclosure button and `data-highlight` on the card for 1500 ms from the render that applies the target (fake timers), and the selection unchanged.
  > **Given** the no-notes variant, 0001 selected in the Board **When** the developer clicks the chip T-004 **Then** the Plan map shows 0001 with T-004 expanded, focused and highlighted, and no file opens.
- **AC-002** When the developer activates a step link with Ctrl or Cmd held (click, Enter or Space), the system shall send 0019 AC-017's open request for the plan at the step's heading line and no navigation request.
- **AC-003** The ID of Progress' next open step of a map-able spec and the chip of a finished stage in the Plan map shall behave as AC-001 and AC-002; a finished stage holding the target, or whose chip was activated, shall show its cards until the tab becomes visible again or shows another spec; for a spec that is not map-able the next open step's ID shall keep 0019 AC-017.
- **AC-004** Each step link's tooltip and accessible description shall be its name, a line break and U-02 with `Ctrl+click`, and with `Cmd+click` where the platform is macOS (stubbed); its accessible name shall stay as today (chip: 0023 AC-004; next open step: 0019 AC-017).
- **AC-005** The manifest shall contribute `featherspec-studio.tree.showInPlanMap` titled U-03, hidden from the Command Palette, first in the spec row's context menu, with a `when` that holds exactly for rows whose `contextValue` names `map`; a row shall name `map` exactly when its spec is map-able; executing it shall open a closed panel, send the step target with the first step ID a line of the spec's next step names (none: the spec alone, focus on the map's heading) and reveal the panel with focus (fake panel and shell ports).
- **AC-006** Each activation of a step link, `Show in Plan Map` or `Ways to run it` shall apply its target once, decided by two tests written red first. (a) Shell service with fake panel and shell ports: the activation's step or ways target shall reach the webview in exactly one message, the first after the panel's hello where the activation opened the panel (AC-005); after it, the messages a model update, a reloaded panel's hello or a change of area causes shall carry none; two activations of one link shall give two. (b) Plan map (jsdom), fed such messages: a message with a target shall apply as AC-001 (AC-016 for ways), also when it arrives before the map shows its spec, then on the first render that shows it; after the developer collapsed that card or the 1500 ms ended, later board, detail and shell messages without a target shall leave every card's `aria-expanded`, the focus and the absence of `data-highlight` as they are; a second message with the same target shall expand, focus and highlight again. If the target step is no longer in the plan when the map shows, the map's heading shall have focus and no card `data-highlight`.
- **AC-007** A done step's card shall show `Verified` with the short text of its `Verified:` value (full as tooltip), a returned step's card `Reported` with its note's `Verified:` short text, and each `Covers` ID followed by `verified`, `built` or `open` where exactly one traceability row's cell is that ID and its trimmed `State` exactly that word (0019 §6.3), else by nothing; no further step or note text shall appear (0023 AC-008).
  > **Given** both notes **Then** T-001 shows `Verified 2026-11-09 · npm test green`; T-003 `Reported 2026-11-10 · npm test -- add: red → green 3 of 3` and `AC-001 built`; T-004 `AC-002 open`.
- **AC-008** While the first line of the spec's next step names a step, the expanded card of that step and of no other step shall show a secondary Copy prompt (0021 AC-008) that puts exactly that line on the clipboard; while a return note lies, no card shall show one.
  > **Given** the no-notes variant **Then** only T-003's card offers it, copying `Implement T-003 of .specs/active/0001-parallel-demo.plan.md`; T-004 (its `‖` partner) offers none.
- **AC-009** For every fixture spec the Plan map shows, the header shall render after the title and before the count the heading `Next step`, the `(?)` and the lines of the detail view's next step with intents, prompts, Copy prompts, first line primary, and coach line as the detail renders them (0021 AC-001, AC-009), 0024's split button where Send is offered (0024 AC-003), and no U-06; so also below a 900 px Studio panel (query stubbed), where the map shows alone. The side panel beside the map shall render no Next step section exactly while the header shows the spec the side panel shows (stem and path); while the map shows a state text for the selection (no plan, Done, unreadable plan, its detail not yet received) the side panel shall render its Next step section as beside the Board.
  > **Given** the all-ticked `tip-splitter` copy, plan `In Progress` **Then** the header's first line equals `nextStep()`'s first line, the check (0028 §6.1, D-1). **Given** a selected spec without a plan **Then** M-13 in the map, `Write the plan` in the side panel.
- **AC-010** The Plan map with the side panel beside it shall hold at most one primary control, exactly one where the next step shown has a line: the header's first line, Send offered or not, while the header shows the spec, else the side panel's (0022 §4.4 (1)); card and way Copies shall be secondary and start lines icon buttons (0022 §4.4).
- **AC-011** When the plan or a return note changes, the header's next step, every percentage and U-05 shall show the new state within 500 ms after the model-changed notification (PD-047, timing test), focus as 0023 AC-012 and PD-077 (an offer change in the header: 0024 AC-010); when the last step gets its tick, the header's first line shall be the one `nextStep()` gives then.
- **AC-012** The percentage function shall give 4/6 → 67, 5/6 → 83, 199/200 → 99, 6/6 → 100, 0/3 → 0, 1/8 → 13, 1/200 → 1, 1/1000 → 0, 999/1000 → 99 and no value for a total of 0.
- **AC-013** The Steps and Criteria rows, the Plan section and Plan map counts, the Board card's Steps and Criteria parts and the tree tooltip's figures shall read U-04 literally, and every progress bar shall carry its visible text as `title` and `aria-valuetext`; "not available" texts shall carry no number; the Overview tooltip shall use the same rounding and U-04's formula.
  > **Given** `fs110-ready-synthetic` 0001 **Then** `0 of 1 done · 0 %` and `0 of 1 verified · 0 %`; `studio-0015` `28 of 30 verified · 93 %`; an Active spec with 3 of 7 steps the card `Steps 3/7 · 43 %`; three specs, two Done and Implemented, `Progress 67 % (2 of 3): Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded half up, at most 99 % until all are done`.
- **AC-014** Every step chip and card shall render the motif of U-01 for its state as an inline SVG carrying the codicon name, `aria-hidden`; the rendered Plan section and Plan map shall contain none of `✓ ◐ ○ ↩ ⊘`; one shared module shall map step states to motif and colour; *next* and *returned, blocked* shall take their colours from theme variables only (0013's CSS guard).
- **AC-015** While a return note of the spec lies, the Plan section, Progress' Steps row and each Plan map stage row holding a returned step shall show the identical U-05 sentence, and none of them a next open step or M-16 or M-17.
  > **Given** both notes (Blocked, NS-4) **Then** `2 returned, T-004 blocked: the next step finds out what blocks.` **Given** the DONE note only (NS-6 returned work) **Then** `1 returned, waiting to be integrated: the next step integrates them.`
- **AC-016** While the current stage has ways, the detail's Next step shall show U-06 after the first line's coach line (tips off: after its Copy prompt and status region) and before line 2; activating `Ways to run it` shall send one navigation request for `planMap` targeting the spec's ways, and the map shall show that ways block expanded, scrolled into view (stubbed), focus on its disclosure button and highlighted as AC-001; no Now row, card, tree item or map header shall show U-06.
  > **Given** the no-notes variant **Then** `Stage 2 can run in parallel · Ways to run it`; **Given** both notes **Then** none.
- **AC-017** The stylesheet's card-row rule shall set `align-items` to `start` or `flex-start`, and the highlight rule an outline from theme variables with no transition inside `prefers-reduced-motion: reduce`.
- **AC-018** No step link, tree command, card Copy, header control or hint link shall create, change, move or delete a workspace file, start a process or write a setting (0017 AC-023's and 0023 AC-014's tests extended); AC-001–AC-016 shall hold in Restricted Mode and a reader window.
- **AC-019** Every text of §6 shall come from a text module and be asserted literally; 0016's user-language sweep shall cover the header, the new card rows, U-05 and U-06 and find no rule ID, `NS-`, `traceability`, `struck` or `stem`.
- **AC-020** Every test at the commit on which this spec's implementation starts that decides a statement §4 does not change shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI; a script compares the titles of both commits and the plan lists every missing title with the changed statement or the head title that replaces it.
- **AC-021** The statements of §4 shall carry their notes and no PD row shall be edited; `.claude/rules/ux-guidelines.md` shall read guidelines 5 and 11 literally as §4 says, and `docs/product/ux-guidelines.md` shall hold the rows `5 (2026-11-19)` and `11 (2026-11-19)`; `README.md` shall contain `Show in Plan Map`, `Ctrl+click`, `4 of 6 done · 67 %`, and `Next step` in its *Plan map* section; `CHANGELOG.md` under `[0.1.0]` shall contain `Show in Plan Map` and `4 of 6 done · 67 %`; `docs/release-checklist.md` shall carry AC-022–AC-024.
- **AC-022** *(manual, preview harness by the orchestrator, then Gregor; guideline 12)* Dark, Light and High Contrast at 1600 px and 1000 px window width with the side panel open at its default width, on `fs110-parallel-synthetic` (each variant) and `studio-0015`: header next step, card rows, percentages, U-05 and U-06 cut nothing; every motif is told apart without colour; the highlight is visible in each theme; an expanded card leaves its `‖` neighbour at its own height; at 1000 px the map alone shows the header's next step; screenshots and verdict in the plan.
- **AC-023** *(manual, Gregor; click test on an HTML draft before `/sdd-plan`, PD-082, 09 §7)* Task across views, started in the Overview with 0001 of the parallel fixture: "Find out what T-004 does, whether it can run in parallel, how far the spec is, and copy what you would run next." The observer notes every click; it passes when Gregor answers without opening a Markdown file and names the percentage; he confirms or changes §6's texts; the plan records path and answers, a change is a revise of this spec.
- **AC-024** *(manual, Gregor; real use on `C:\projects\test\tip-splitter` before the spec closes, PD-082, 09 AC-e)* Every step's information is reached without the Markdown file (chip, next open step, tree); Ctrl+click opens the plan at the step; after the agent ticks the last step the map header shows the check and the percentage first reads 100 %.

## 9. Technical notes for developers or AI agents

- As-is (read 2026-11-19, `7f535bd`; `src` as at `db71223`): `core/planMap/planMap.ts planOf()` → `PlanView` (`count`,
  `closing`, `stages[]` with `returned {n,m}`, `ways`; `loose`); `stepView()` projects `id, state, title, open, files,
  covers, doText, verify, returned`; `PlanStep.verified` and the note's `parsed.verified` are parsed, not projected;
  traceability rows as `criteriaOf()` reads them (`core/board/situation.ts`). Texts: `STEP_LOOKS` (Unicode),
  `stageReturnedText`, `ALL_RETURNED_TEXT` (`planMapTexts.ts`); `stepsDoneText`, `criteriaVerifiedText`, `stepsText`,
  `criteriaShortText` (`texts.ts`); `core/overview/figures.ts` `Math.floor`, `FORMULA_TEXT` "rounded down".
- Webview: `ui/StepChip.tsx` and Progress' next open step wrap `ui/FileLink.tsx`; `ui/ProgressBar.tsx` sets
  `aria-valuetext`, no `title`; `board/icons.tsx` draws codicon motifs (`STATE_LOOK`); `areas/planMap/` `Header`, `Stages`
  (expanded set, roving stop, PD-077), `StageRow` (finished → chips), `StepCard`, `Ways`, `focus.ts`; `.plan-group` has
  no `align-items` (G-10). `PlanMap` and `SidePanel` both render the selection; `SidePanel` hides the Plan section in
  `planMap`, so Progress shows the next open step (r06); side panel beside the map from 900 px (`App.tsx`).
- Navigation: `NavigationTarget` `{kind:'spec', stem, path?} | boardFilter`; `shellService.navigate()` selects, persists
  area and selection, and sends `target` in every later view until `open()`; no webview code reads it; board filters
  apply through `onDidNavigate` (`extension.ts`) — hence A-011. Tree: `contextValueOf()` → `spec step plan`.
- Proposal, the plan decides: shared `percentOf()` in integers (`floor((200·done + total) / (2·total))`, ≤ 99 open);
  the spec target gains `step?` or `ways?`, delivered once (a view field dropped after one send, or an event); `PlanStepView`
  gains `verified?`, `reported?`, `covers[].state?`, `copy?`; one returned-work summary; a step-look table beside
  `STATE_LOOK`; token `map`; U-02's platform from the host; protocol version up; a new source folder →
  `/sdd-architecture-update`. Tests: the modules' own, `Keyboard`, `SpecDetail`, `SpecBoard`, `shellService.navigation`,
  `primaryButtons`, `figures`, `specTree`, `studioTree`, `treeActions`, `manifest`, `messages`, `webviewCss`,
  `webviewBundle`, `userLanguage`, both `noWrite`, `src/test/shell.smoke`.

## 10. Assumptions

| ID | Assumption (proxy unless marked) | Why we believe it — recommendation followed | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | Beside the Plan map the side panel drops its Next step section while the header shows the same spec; the header carries it (decided, D-2) | D-2 (orchestrator as product owner, 2026-11-19); PD-081 asks for the action in the map at every width (g-r2-04 is the map alone); guidelines 8, 11; 0023 §5.2 drops the Plan section the same way | §5.3, AC-009, AC-010 |
| A-002 | The header shows every line of the next step with coach line and `(?)`, Send where offered | Orchestrator note on PD-081 part 2; one block rendered one way; line 2 is the way after a break (PD-072) | §5.3, AC-009 |
| A-003 | Plain click, Enter or Space navigate; with Ctrl or Cmd they open the file; U-02 names the platform's key | 09 F-1 (3), the editor's link convention; full keyboard path (guideline 9) | §5.1, AC-002, AC-004 |
| A-004 | `Show in Plan Map` in Title Case, first in the menu, only for map-able specs; target the step the next step names; the panel takes focus | 09 F-1 (2); the tree's titles `Open Spec`, `Open Plan`; guideline 2 (no dead entry); VS Code's "Reveal in …" commands move focus | §5.1, AC-005 |
| A-005 | Highlight: 2 px focus-colour outline for 1500 ms; a finished stage shows its cards for a target until the next showing | 09 F-1 (1) "Rahmen in `focusBorder`", reduced motion; 0023 A-013 otherwise kept | §5.1, AC-001, AC-003 |
| A-006 | Card rows `Verified`, `Reported`, exact traceability words; Copy prompt only on the step the first line names, in the expanded part, secondary | 09 F-1 (4); its "Ausnahme … Startzeilen ohnehin" read as: `‖` partners need no card Copy; guideline 1 (the line is `nextStep()`'s), guideline 8 | §5.2, AC-007, AC-008 |
| A-007 | Percentages also on compact forms (card, tree) and PD-079's rounding for the Overview figure; `title` = `aria-valuetext` = visible text | PD-079 "every progress text", "the same text"; one rule per product (guideline 10); 09's "67 percent" variant not taken | §5.4, AC-013 |
| A-008 | *next* = `debug-stackframe` in the focus colour; *not found* = `question`; *returned, blocked* in Blocked's colour | 09 G-1 offers `debug-stackframe` or `arrow-small-right`, "filled, accent": the editor's current-line arrow; 0022 §4.8 | §5.5, AC-014 |
| A-009 | One sentence built from count, blocked IDs and the next step's case, also under the Plan section's count | 09 G-2's two examples merged so all places read alike; "All steps returned" under a plan-wide count would read as the whole plan | §5.6, AC-015 |
| A-010 | The hint only in the detail, after the first line; its link expands the ways and focuses their disclosure | 09 G-7; guideline 11; in the map the ways stand in the same view; the disclosure, like a card target's (§5.1), holds whatever 0026 puts inside | §5.7, AC-016 |
| A-011 | A step or ways target reaches the webview once, the first message after the hello where it opened the panel (not a proxy: testability) | The webview forgets on a reload and 0005 restores only area and selection, so only the host can keep a reload from applying a target again; one delivery makes AC-006 decidable on both sides, red first | §5.1, AC-005, AC-006 |

## 11. Open points

- OP-001 Click test with a task across views before `/sdd-plan` (PD-082): Gregor's, AC-023; §6 and §10 stand till then.
- OP-002 Closed by D-2 (2026-11-19): beside the map the header's next step is the view's one; 0026 §6.4 cites D-2.
- OP-003 `/sdd-clarify` 2026-11-19 (S92): 33 findings settled in one pass (standing answer; `0025-findings.md`). Say if
  a reading is wrong: no header → the side panel keeps its Next step; a target travels once; ways focus the disclosure.

## 12. Definition of Ready / Done and next steps

Ready: §5, §6 literal, §4 listed, 0028 implemented, OP-001 closed. Done: AC-001–AC-021 green with evidence,
AC-022–AC-024 checked, §4 applied, docs and Memory Bank synced, `/sdd-compile` READY. Next: click test (OP-001), `/sdd-plan`.
