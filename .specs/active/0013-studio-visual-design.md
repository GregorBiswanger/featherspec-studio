# Studio Visual Design

**Status:** In Progress
**Plan:** [0013-studio-visual-design.plan.md](0013-studio-visual-design.plan.md)

Depends on: 0005, 0006, 0007. Input: [design-brief.md](../../docs/product/design-brief.md), Gregor's interview answers
for this spec. `D-n` = defect n of the UI preview report of 2026-11-16.

## 1. Summary and goal

The preview shows correct data as unstyled HTML (D-1…D-12); handoff P1 "Visual First" is not
met. Goal: a calm, dense, native VS Code tool whose project state reads in two seconds. Success:
Gregor accepts screenshots of every area in Dark, Light and High Contrast as fit for a talk or a
Marketplace listing. Users: the developer in the Studio panel; Gregor accepts the look.

## 2. Scope

### In scope

- Layout, typography, spacing, icons, chips, bars and motion of the four areas and of 0005's
  panel-level states, with `--vscode-*` theme variables only.
- Five behaviour deltas Gregor named, each refining the cited criterion:
  1. inline Markdown in file text of the detail view (0007 AC-009);
  2. collapsible detail sections (0007 §6.4);
  3. one "Open file" per detail section instead of per item (0007 AC-010);
  4. sentences for derived-state rules and readiness checks, ID as secondary text (0007 AC-003,
     AC-024; 0006's derived markers);
  5. Mission Control header diagnostics wording (0006 AC-017).

### Out of scope

- New data, protocol messages or model fields — because Gregor limited this spec to
  presentation; carried data may be reshaped (a string split into ID + text), not added.
- Drill-down targets, filters, moves, transition check, keyboard model, panel-level texts —
  because 0005–0007 own them and they work (PD-036).
- Custom palette, web fonts, a Markdown or UI library, any new dependency — because the brief
  demands a native look from VS Code variables only.
- Block-level Markdown (headings, tables, nested lists, images, HTML) — because the brief names a
  small inline subset; block quotes and list markers are only tidied (§3.4).
- Agent Center content (0012) and parser diagnostics (D-5, PD-020) — because others own them.

## 3. Design rules

### 3.1 Native theme

- Colour only from `--vscode-*` variables (or `currentColor`, `transparent`, `inherit`); fonts
  only `--vscode-font-family` and `--vscode-editor-font-family` (IDs, code).
- **State colours**, one mapping for chips, tiles, bar segments and column headers: Backlog
  `--vscode-descriptionForeground`, Ready `--vscode-charts-blue`, Active `--vscode-charts-purple`,
  Review `--vscode-charts-yellow`, Done `--vscode-charts-green`, Blocked `--vscode-charts-red`. A
  state colour tints only an icon, a chip border or edge and a bar segment; text stays
  `--vscode-foreground` or `--vscode-descriptionForeground` (fixes D-6). Every state also shows
  its icon and name (0007 §6.7).
- High Contrast: borders of chips, tiles, cards, panels and sections fall back to
  `--vscode-contrastBorder`; focus and selection use `--vscode-contrastActiveBorder` first, as
  0005 AC-031 does. Motion and focus per AC-002, AC-003.

### 3.2 Mission Control

- **Header**, one quiet line: name · `FeatherSpec <version>` · `Updated <time>` · diagnostics (AC-006).
- **Stat tiles** (AC-004), the Done tile with the Deprecated sub-count as secondary text;
  **distribution bar** in §3.1 colours with "Total <n>" (0006's Total element) and progress
  (AC-005); **Needs attention** as compact rows (AC-007).
- **Agent runs** and **Recent activity** side by side below it, stacked under 720 px area width.
  This order replaces 0006 §9's layout guidance.

### 3.3 Spec Board

- Board fills the area height (D-8); columns per AC-008, header with icon, name, count badge.
- **Card** per AC-009: the state chip is followed by the §3.5 sentence or Deprecated marker as
  secondary text; Blocked conditions and readiness sit below the summary; diagnostics badge, run
  status and last change at the bottom; "Move to…" small, top-right corner.
- **Drag feedback**: the dragged card is visibly lifted; the column under the pointer is marked
  as target. No valid/invalid marking before the drop; a refusal shows after the drop as today (OP-1 (a)).

### 3.4 Spec Explorer

- Two panes (list with own scroll; detail with header: number chip, title, state chip, "Open
  file"), stacked under 640 px; selected row by background and border (D-12), no wrap (D-11).
- **Sections** (0007 §6.4 names): the heading is a button that collapses or expands the body;
  all start expanded; the choice is kept per section name across selections while the panel is
  open. **Open file**: one per section in its heading row, opening 0007's file at the top;
  Related artifacts: each file name is itself the link.
- **Inline Markdown** in all file text: `**b**`, `__b__`, `*i*`, `_i_`, `` `code` ``,
  `[text](target)` as text plus target in secondary text (not a link). Escaped first: only these
  become elements; everything else, HTML included, is literal text.
- **Tidying**: a block quote loses `> ` and shows as a quote (Given/When/Then); a list marker
  (`- `, `* `, `1. `) is dropped where the item is already a list item (D-2). A text that starts
  with its own item's ID (bare or bold, then `|`, `-`, `—` or `:`) loses that repeat; a
  requirement's other table cells show as secondary text joined by ` · `. Overview header lines
  form an aligned label/value grid (D-4).

### 3.5 Sentences for rules (texts owned by this spec)

- S-READY "Derived: draft with a plan that has not started"; S-REVIEW "Derived: plan is Done,
  waiting for review"; S-BLOCKED "Derived: plan or return note says Blocked" — rule ID as
  secondary text. The rules stay 0003's (PD-004, featherspec-format §5.2); only wording is here.
- Readiness: 0003's reason as primary text, check ID (`R-3`) secondary — on Backlog cards and in
  the Overview.

### 3.6 Empty, placeholder and panel-level states

Centred: icon, one sentence, the action where one exists; texts stay with 0005/0006/0007.

## 4. Acceptance criteria

Decided by component tests (jsdom) or stylesheet tests in plain Node unless marked *manual*.

**AC-001** The Studio stylesheet and every inline style shall express colour only through
`--vscode-*` variables, `currentColor`, `transparent` or `inherit`, and font families only
through `--vscode-font-family` and `--vscode-editor-font-family`, with no `@font-face` and no
`@import`.

**AC-002** Every `transition` in the stylesheet shall last at most 150 ms, and a
`prefers-reduced-motion: reduce` block shall set all transitions to none.

**AC-003** Every control this spec adds or restyles (stat tile, Total, attention row, section
toggle, section "Open file", "Move to…", related-artifact link) shall be reachable with Tab and
show a focus outline from `--vscode-contrastActiveBorder` or `--vscode-focusBorder`; no rule
shall remove an outline.

**AC-004** Mission Control shall show six stat tiles in board order, each one control with count,
state name, state icon and, for Ready, Review and Blocked, the §3.5 sentence with rule ID. When
the developer activates a tile, the system shall send 0006 BR-08's request for that count.

**AC-005** With at least one spec, Mission Control shall show one bar segment per state with a
count above 0, with width share = count ÷ total within 1 percentage point and accessible name
`<state>: <count> of <total>`, and the progress figure with 0006 BR-04's rule as visible
secondary text and tooltip.
> **Given** 5 Backlog and 7 Review specs **When** Mission Control renders **Then** two segments,
> 41.7 % and 58.3 % wide, are named "Backlog: 5 of 12" and "Review: 7 of 12".

**AC-006** The header shall read `<n> project-level diagnostics · <m> specs with diagnostics`
(m = number of `diagnosticStems`, singular for 1); activating it shall send 0006 AC-017's request.
> **Given** 0 project-level diagnostics, stems 0001, 0002, 0010 **Then** "… · 3 specs with diagnostics".

**AC-007** Each attention row shall show number chip, title and reason as text with an icon; the
Agent runs and Recent activity panels shall each show, when empty, an icon and 0006's sentence.

**AC-008** The stylesheet shall set no height or max-height on a board column, make each column
header `position: sticky`, let each column's card list scroll vertically, and give columns a
minimum width of 240 px with horizontal scrolling of the board.

**AC-009** Every card shall render in DOM order: number and title; exactly one state chip with
icon and text; summary; a tasks and a criteria `progressbar` with value and figure text, or only
"not available" where 0007 delivers no figure; and a "Move to…" button reachable by Tab from the
card. The content of 0007 AC-003…AC-007, AC-020, AC-024 and AC-025 stays.

**AC-010** Wherever a card, a list row, Mission Control or the Overview shows a derived state, a
readiness check or a Blocked condition, the system shall show the §3.5 sentence or 0003's reason
as primary text and the rule or check ID as secondary text only.

**AC-011** While a card is dragged, the system shall mark the card and the column under the
pointer, and remove both marks when the drag ends, with or without a drop.

**AC-012** When the developer activates a section heading in the detail view, the system shall
hide or show that section's body and set `aria-expanded`; the state shall survive selecting
another spec while the panel stays open.

**AC-013** The detail view shall offer exactly one "Open file" per section that 0007 §6.4 gives a
source file (Related artifacts: one link per listed file), none per requirement, criterion or
diagnostic, and none where 0007 AC-010 forbids one; activating it shall send 0007's open request
for that file without a line.

**AC-014** When file text contains the §3.4 subset, the detail view shall render `strong`, `em`,
`code` and text-plus-target elements for it. If file text contains HTML such as
`<img src=x onerror=alert(1)>` or `<b>`, then the system shall show it literally and create no
element from it; no code under `src/webview` shall use `dangerouslySetInnerHTML` or `innerHTML`.

**AC-015** The detail view shall show each requirement, criterion and plan-step ID once per item,
drop a block quote's `> ` and a duplicated list marker, and show the Plan line's link as text plus
target; each plan step shows a ticked, unticked or undetermined icon with its text label and
its `Verified` text. *(fixture: a copy of this repo's spec 0002 and its plan; D-1, D-2)*

**AC-016** Every existing test of 0005–0007 shall stay green; only assertions on wording or
structure that §2's five deltas change are updated, in the same change set, each named in the plan.

**AC-017** *(manual, Gregor)* Screenshots from the preview harness of Mission Control, Spec Board,
Spec Explorer list, detail of 0002 (expanded, and with Acceptance criteria collapsed), Agent
Center and panel states S1 and S2, each in Dark, Light and High Contrast at 1400×900, plus board
and detail at 900 px width. Gregor checks: no cut-off card, no raw Markdown, readable contrast in
Light, project state readable at a glance; his verdict is recorded in the plan.

**AC-018** *(manual, Gregor)* One pass in real VS Code with a Dark, a Light and a High Contrast
theme plus one live theme switch: colours, borders and focus match the screenshots.

## 5. Technical notes

- `src/webview/main.css` (70vh rule ~l.221); extend the guard `src/adapters/node/webviewCss.test.ts`
  for AC-001…003, AC-008; add icons to `src/webview/board/icons.tsx` as inline SVG.
- Detail text arrives raw (PD-034, `src/shared/protocol/detail.ts`), except that the core already drops a
  repeated leading ID and list marker of requirements, criteria and stages (`src/core/board/idText.ts`, 0007
  T-013) — that stays; the inline subset and the remaining tidying go into one pure, tested formatter in
  `src/webview`.
  Section-level `open` targets already exist in the detail protocol.
- `CardView.readiness` (`"R-3: <reason>"`) and `derivedLabel` may split into ID + text — a reshape,
  not new data; sentences live in `src/shared/protocol/texts.ts` and Mission Control's `texts.ts`.
- Screenshots: preview harness outside the repo (`/home/claude/orch/preview/run.sh`), no repo
  dependency; its theme values approximate VS Code, hence AC-018. Plan after the 0006/0007 fixes.

## 6. Assumptions

| ID | Assumption | Why | If wrong |
| --- | --- | --- | --- |
| A-001 | The brief's taste proposals are Gregor's decisions | He said so in the command | Revise the changed points |
| A-002 | Related artifacts keep one link per listed file | Each item is another file; one section button cannot choose | AC-013 changes |
| A-003 | Sections start expanded; collapse state per section name, panel lifetime only | Brief names collapsing, not defaults; no new persistence | Detail long by default |
| A-004 | Breakpoints 720 px, 640 px, 240 px column | Fit 1400 px and a half-width editor group | Layout tweak only |
| A-005 | Brief's "History" is 0007's "Agent history"; the name stays | Renaming is not a named delta | Label change only |
| A-006 | Section "Open file" opens at the top, not an item's line | Per-item jumps leave with per-item buttons | Small navigation loss |

## 7. Open points

- ~~**OP-1** Valid/invalid drop marking~~ — resolved 2026-11-16 by Gregor (`/sdd-plan`): (a) mark only the
  dragged card and the column under the pointer; a refusal shows after the drop as today (AC-011). (b) and (c)
  are not done.

## 8. Definition of Ready / Done

Ready: OP-1 decided, 0006/0007 fixes landed, `/sdd-clarify` passed — waived by Gregor on 2026-11-16
(presentation only, judged by screenshots). Done: AC-001…AC-016 green,
dependencies unchanged, AC-017/AC-018 accepted by Gregor, `techContext.md` manual checks updated.
