# Layout and Signal Polish

**Status:** Draft
**Plan:** _none yet_

Basis: implementation review of 2026-11-18 ([07](../../docs/ux-audit/07-implementation-review.md) findings
N-2…N-9, screenshots `screenshots-045b354/` n02, n04–n08, n16, n19, n21) as cut in
[08 §3](../../docs/ux-audit/08-spec-handoff.md). Decisions: PD-069 (round adopted; guidelines 8 and 12),
PD-016, PD-059 and PD-063 (tiers), PD-065 (5), PD-070, PD-071, PD-073, PD-075. Guidelines: `.claude/rules/ux-guidelines.md`
(binding; 3, 6, 7, 8, 9, 10 and 12 apply to every criterion here). Written in parallel with **0021**,
which owns the step texts, the short form (08 R-3), the button label "Copy prompt" and its accessible
name (08 R-4), the coach line and the `(?)` toggletip; this spec refers to them and restates none.
Amends 0005, 0007, 0013, 0016–0020 (§5). No interview: Gregor delegated the round (PD-069); every
open decision is a proxy in §10. §4.7 holds Gregor's feedback (PD-070, g02, g03) and his list-or-detail idea
(PD-075), §4.8 his state icons (PD-073). Terms as 0019 §6.1: *Studio panel* (the webview), *area frame*
(area content and side panel), *side panel* (the detail); px are CSS px.

## 1. Summary

No new function. The Overview lays out its rows by its own width, so titles stop breaking mid-word
and Copy stays visible. The Specs tree shows the step, not the state, and names its
Ready group `Ready`, so "Up next" means one set. A collapsed tree group or board strip says when it
hides a Problem. At most two primary buttons per view; list Copies become icon buttons. Problems
read as user sentences and wrap instead of being cut. Paths break only after a separator. From 900 px
area and side panel stand side by side, each with one scrollbar, split by a divider the developer drags;
the Studio remembers the width and a double-click resets it (PD-070). Below 900 px the area or the
detail shows alone, with a back button (PD-075). Each state has one icon and colour everywhere (PD-073).

## 2. Goal, problem and users

Evidence (07 §4): under the drawer at a 1000 px window the Overview keeps about 250 px and breaks
titles by syllable ("configura/ble", n16, P1); Gregor met it in his own window (g03, VS Code 1.147 with
Explorer and chat open, about 640 px at his zoom): the first Now row's title fell to one letter per line. At
the default 300 px sidebar the tree cuts exactly the step ("Rev…", n02); a Problem in the collapsed Done group or strip is invisible (n08, against
guideline 3); "Up next" holds Ready in the tree but Ready + Backlog in the Overview (n05, n07); ten
filled Copy buttons on one screen are louder than the titles (n04, n06); "done/ Implemented spec without
an archive link in it…" is technical and cut (n19); a path breaks inside a segment (n04).
**Users:** the developer beside an AI chat on a laptop-width window (primary) and the workshop
presenter. **Success:** at 1000 px with a spec selected no title word is split and every Copy is
visible; one primary button per region; a hidden Problem is announced where it hides; no test that
decides a staying criterion is lost (AC-017).

## 3. Scope

### In scope

- Overview row layout by the list's own width (N-2, §4.1); tree row description, label length, group
  name and group Problem hint (N-3, N-4, N-5, §4.2); board strip Problem hint (N-4, §4.3).
- Which next-step Copy is primary, secondary or an icon button (N-6, §4.4).
- Problem sentences on every surface and their wrapping (N-7, §4.5); line breaks in paths (N-8, §4.6).
- One scrollbar each; a resizable, remembered side panel; below 900 px the area or the detail alone (PD-070, PD-075, §4.7).
- One icon and colour per state on every surface; the state as icon in narrow Overview rows (PD-073, §4.8).
- Amendments of older specs (§5); every changed text (§6).

### Out of scope

- Step texts, short form, button label "Copy prompt", accessible-name wording, coach line, `(?)`, settings — because 0021 owns them.
- N-9, one summary row for many equal steps in Now — because it is new function, not polish; E-5 decided "not in 0022", Gregor decides after the click test (A-004, OP-004).
- A dimmed overlay below 900 px (07 N-2 alternative) — because PD-075's list or detail replaces the drawer (A-016).
- The Board's layout at narrow width — because no finding: it keeps its width and scrolls (0018 B-2).
- What the parser and lifecycle findings say internally — because 0002/0003 tests assert them; only the shown sentence changes (A-009).
- A separate "Needs fixing" tree group (07 N-4 alternative) — because each spec stays in exactly one group (0020 §4.1).
- A board switch "Show empty columns" (07 §5.3) — because no finding asks for it; not now.
- Plan map (0023), Send to the assistant (0024) — because they are their own specs.

## 4. Business rules

### 4.1 Overview rows follow the list's own width (N-2, guideline 12, E-7)

Each Overview list (Now, Up next, Problems) lays out its rows by its own content width, never by
the viewport:

| List width | Row |
| --- | --- |
| above 686 px | one line, as 0018 O-5 (title and state text cut by an ellipsis, full text as tooltip; step and Copy never cut) |
| 420–686 px | two lines (PD-065 (5)): number and title; then state icon and text, warning icon, "Next" with the short form, Copy |
| below 420 px | three lines (08 N-2): number and title; state icon and text and warning icon; "Next" with the short form and Copy |

- 686 px is the list width at PD-065 (5)'s 720 px Studio panel (panel − 34 px), so nothing moves while no side panel is shown (A-005).
- A list takes the area's width: beside the side panel the area keeps at least 360 px (G-2), below 900 px the whole Studio panel (G-4); the rule covers both and VS Code's zoom. In the two- and three-line layouts number and title share their line with nothing else (g03, AC-028).
- A Problems row cuts nothing at any width: two lines from 420 px, three below (§4.5).
- Titles wrap only between words; a single word wider than its whole line is the one case that breaks inside. Paths and commands follow §4.6.
- Every Copy stays fully on screen at every list width (WCAG 2.2 SC 2.4.11).
- First Now row (0021 §6.5, §6.6): the coach line and `?` follow its Copy prompt as the row's last line, aligned with the step, in every layout; the toggletip text shows under that line inside the row and covers no other row.

### 4.2 Specs tree (N-3, N-4, N-5, E-4)

- **Groups:** `In progress`, `Ready` (was `Up next`), `Backlog`, `Done`; states, order and start state as 0020 §4.1; a group's ID holds neither count.
- **"Up next"** names one set only: the Overview section (Ready, then Backlog; 0018 O-3) and its "+ n more" set. While it lists a row, its heading is followed by X-07.
- **Group with a Problem** (any spec in it has a 0016 *Problem*; n = their Problems, counted as 0016 T-05 counts): description X-02, icon `warning` in `problemsWarningIcon.foreground`, accessible label and tooltip X-03 — expanded or collapsed alike (A-010). Without one: 0020 §4.1 unchanged.
- **Row description = the step only:** 0021's step short form (0021 §6.3) for a spec with a step; `<State>` for one without (NS-1, NS-3, NS-11); `Deprecated` as before. The state shows in icon, group, tooltip and accessible label (X-05).
- **Label budget** (replaces 0020's 24-character cut, A-006): label and description together hold at most 32 characters.
  1. Title room = 32 − (number length + 1) − description length.
  2. If the room is below 12 and the step short form has an intent, the description becomes 0021's command short form alone; the room is recomputed. With a four-digit number no intent fits: a named deviation from guideline 1 (intent, then command), which 0021 §6.3 and AC-006 allow; tooltip and accessible label keep the intent (A-014).
  3. The title is cut by 0020 §4.2's cut rule to the room, never to a room below 12 characters; a title that fits is not cut. The command is never cut.
- Row tooltip: per Problem `Problem: <sentence>` (§4.5).

### 4.3 Board strips (N-4)

A narrow strip (0018 B-1) that stands for a spec with a Problem it does not show as a card — Done
while collapsed, or a card a filter hides — shows the warning icon under its count; its tooltip and
accessible name are its 0018 §7 text followed by ` · ` and 0016 T-05 (X-06); the tooltip then adds
B-6's rule tooltip where one applies. Every other strip is unchanged.

### 4.4 Button hierarchy (N-6, guideline 8)

- **Primary** (0016 AC-017's colours), and only these: (1) the side panel's Copy of the next step's first line; (2) the Copy
  of the Overview's first Now row; (3) the one Copy of the zero-spec state (0018 O-8, Overview and
  Board), alone on its screen (A-007). Hence at most two per view.
- **Secondary text button:** the side panel's Copy of every further line (NS-5, NS-6 with an open plan step
  (PD-072), NS-9); the buttons of the Restricted Mode note and the notice (0005 S7, BR-03; A-013).
- **Icon button** (copy icon, no text): every other next-step Copy — Now rows after the first, Up next
  rows and its empty line, Problems rows, board cards (07 §5.2, A-008).
- The icon button keeps 0016 §6.5's action and feedback, its name and tooltip as 0021 §6.4 states them:
  it copies the full first line; until 2000 ms after the last activation the icon is a check (copied) or a
  warning (could not copy), the tooltip is 0016 T-19's sentence and the live region announces it; its box
  does not change; the target is at least 24 × 24 px (WCAG 2.2 SC 2.5.8); Tab order and keys as 0017
  AC-005, AC-006; no icon font (0021 A-008).
- Native surfaces (tree inline action, status bar) and panel-state buttons are unchanged.

### 4.5 Problems as sentences (N-7, guidelines 3 and 6)

- Every *Problem* (0016 §6.1) shows as its X-10…X-24 sentence on every surface: the detail's problem
  list (the sentence is the link where the finding has a file, 0019 §6.2), the Overview Problems row
  (sentences joined by ` · `, PD-064 P-6), project lines of Overview and board banner
  (`<place>: <sentence>`), the tree tooltip. In the webview the Studio's technical reason (today's text) is the
  element's tooltip; on a problem link it comes first, then 0019 AC-017's text on its own line, both also
  its accessible description. Format notes keep their reason.
- One function gives a finding's sentence; no surface words its own.
- Problem rows, lines and the detail's list wrap; nothing in them is cut by an ellipsis or clamp.

### 4.6 Paths and commands (N-8)

Every project path and every command line the webview shows — side-panel next-step lines, the
detail path, a card path, Files links, the place of a project-level problem line (this list is complete) —
offers a line break directly after each `/`, `-` and `.` of a path and nowhere else inside it; a command
line also breaks at its spaces; a segment wider than its whole line is the one case that breaks inside.
Copy and text selection yield the path unchanged.

### 4.7 Scrollbar, divider, list or detail (Gregor 2026-11-18, PD-070, PD-075)

Evidence: g02 (1428 device px at VS Code's zoom, about 990 px) shows two vertical scrollbars side by
side at the right edge — the side panel's and `main`'s — and a fixed 400 px detail that looks squeezed.

- **G-1 One scrollbar each.** The page, `main` and the area frame never scroll. The area content (its
  scrollbar at the divider), the side panel (its scrollbar at the Studio panel's right edge, nothing after
  it: PD-070's "outer one") and a 0005 panel state (S1–S9, its own box) scroll, each only while its content
  is taller than its space; the Board's card lists keep their own scrolling (0013 AC-008). No two vertical
  scrollbars stand side by side.
- **G-2 Divider.** From a Studio panel of 900 px (0019 §6.1) a selected spec's side panel stands beside the
  area with a vertical divider between them. Dragging it sets the side panel's width, within: side panel
  ≥ 320 px, area ≥ 360 px. Default: 40 % of the area frame's width, rounded to whole px, at least 400 px
  (replaces 0019's fixed 400 px; A-011). Keyboard (APG window splitter, A-012): a focusable vertical
  `separator` controlling the side panel, value its width in px; Left moves it left (the side panel grows),
  Right right, by 16 px, with Shift 64 px; Home and End give the side panel its smallest and largest width;
  Enter resets. Pointer: a column-resize cursor; a double-click resets; a drag ends at release, also outside
  the Studio panel. Focus outline of the theme (guideline 9); `sash.hoverBorder` while hovered or dragged.
- **G-3 Remembered.** When a drag ends or a key changes it, the width is remembered per workspace as a
  fraction of the area frame's width, outside every workspace folder like 0005's area and selection; it
  applies whenever the side panel stands beside the area, clamped to G-2's limits; a reset deletes it. A
  stored value that is not a number above 0 and below 1 is ignored; remembered area and selection still apply.
- **G-4 List or detail** (PD-075; replaces 0019's drawer and PD-066's end padding). Below 900 px — VS Code's
  zoom lowers the width too — the area shows alone while no spec is selected; a selected spec's detail shows
  alone in its place at full width (a deviation from guideline 8, named by PD-075), with a back button at its top left (X-27, accessible name its text) in
  place of the close button, and no divider. The back button, and Escape inside the detail (0021's
  toggletip excepted), clear the selection and show the area as it was (scroll position kept, guideline 8),
  focus as 0019 §6.1 *Close* says. Switching area keeps the detail; the back button names the current
  area. Crossing 900 px keeps the selection — side by side from 900 px, the detail alone below — and the
  focus where it is while that stays shown, else on the detail's heading (A-016).

### 4.8 State at a glance (Gregor's click test, PD-073)

One table gives each state its motif and colour; no surface maps a state itself. Colour is never the
only cue: each state has its own shape (A-015).

| State | Motif | Colour |
| --- | --- | --- |
| Backlog | `list-flat` | `descriptionForeground` |
| Ready | `pass` | `charts.blue` |
| Active | `play` | `charts.green` (was `charts.purple`) |
| Review | `eye` | `charts.orange` (was `charts.yellow`) |
| Blocked | `circle-slash` | `charts.red` |
| Done, Deprecated included | `check` | `descriptionForeground` (was `charts.green`; past work recedes, guideline 7) |

- It serves the tree's state icons (0020 §4.2), the board's column headers and strips, the side panel's
  state chip (0013 §3.1's tints) and the Overview rows; the tree shows the codicon, the webview its own
  glyph of that motif. The Problem warning (0020's `warning`, 0016's icon) is unchanged; it differs from
  Review by shape.
- **Overview rows** show the state icon, its tooltip the state's name, before the state text in every
  layout. Where the state text is that name (0018 O-5), it shows only in the one-line layout (§4.1) and is
  hidden visually, not from screen readers, in the others; the row's accessible name holds the name exactly
  once. A Backlog need (0016 T-11) and a Problems row's sentences stay visible.

## 5. Amendments of other specs

The implementation places "*Amended by 0022 (PD-069): …*" directly under each statement. Where
0021 also amends a statement, 0021's note comes first (OP-003). Wherever 0019, 0020 or 0021 show "the
side panel", below 900 px the detail shows alone (G-4).

| Spec · statement | Amendment |
| --- | --- |
| 0016 §6.5 "Every Copy … uses the primary button style"; AC-017 "primary button colours"; AC-018 "shall read `Copied`"; AC-019 "`14ch`" | Only the Copies of 0022 §4.4 (1)–(3) are primary; further side-panel lines secondary; list Copies icon buttons, feedback by the icon, a fixed box of at least 24 px |
| 0016 §6.2 Detail row "each with the warning icon and its reason"; AC-006 "its reason" | Its sentence (0022 §6), the reason as tooltip |
| 0017 §6.1 "Card and row Copy take 0016 §6.5's style and feedback" | The icon button of 0022 §4.4 with that feedback |
| 0018 O-3 "while the Up next group of 0020's tree holds Ready only beside its own Backlog group (0020 §4.1)" | That group is named `Ready` (0022 §4.2); the section shows X-07 |
| 0018 O-4 "its place and text"; O-5 "state text (the state name; …)", "Problems row: each Problem's own reason", "Above a panel width of 720 px … At 720 px or less the row takes two lines"; AC-007 "the reasons of its Problems" | Sentences of 0022 §6; the state as icon, its name visible only on one line (0022 §4.8); layout by the list's own width (0022 §4.1); a Problems row cuts nothing |
| 0018 AC-006 "on one line above 720 px", "at 720 px or less (media query `max-width: 720px`)" | Container rules of 0022 AC-001; Problems rows per AC-003; state per AC-027 |
| 0018 O-8, AC-012 Copy of "Nothing up next…" | Icon button (0022 §4.4); the zero-spec Copy (AC-011) stays primary |
| 0018 B-1 "without card list or hint"; B-6 "its accessible name is the §7 text alone"; AC-014; AC-020 "a narrow strip after its §7 text"; §7 row "Narrow column" | Plus the Problem hint of 0022 §4.3 (X-06), in the name too; B-6's rule tooltip after it |
| 0019 §4 out of scope "A resizable or configurable side panel width"; §6.1 Place "400 px at the right edge beside the area content, own scroll"; AC-005 "400 px wide … with its own scroll"; §9 row "shrinks by 400 px"; A-003 "400 px" | Width per 0022 §4.7 G-2 (resizable, remembered, G-3); one scrollbar each (G-1) |
| 0019 §6.1 Place "Narrower: a drawer …" to "scrolled clear of it (A-003)"; *Close*; AC-002 "and Overview or Board is shown"; AC-003; AC-005 drawer part; §9 rows "Drawer shown …", "Panel crosses 900 px while open"; AC-022 "the drawer"; A-003 drawer part | Below 900 px the area or the detail alone, the back button in place of close (0022 G-4); rows by the list's own width (0022 §4.1) |
| 0019 §6.2 row 3 "each *Problem* with its reason … a reason with a file is its link"; AC-017 tooltip "Open <file name> at line <n>" of a problem link | The sentence is the link; tooltip and description: the reason, then that text (0022 §4.5) |
| 0005 §8 "Remembered per workspace (UI state only): the area last shown; the selected spec's stem"; A-003 | Also the side panel's width fraction (0022 §4.7 G-3) |
| 0007 §6.7 "Board state … is conveyed as text"; 0013 §3.1 State colours "Active `--vscode-charts-purple`, Review `--vscode-charts-yellow`, Done `--vscode-charts-green`", "Every state also shows its icon and name" | 0022 §4.8's one table; in two- and three-line Overview rows the name is the icon's tooltip and in the row's accessible name |
| 0020 §4.1 group `Up next`; bullet "*Up next* is what to pick up next; …"; "description = the number of its specs, no icon of its own" | `Ready`; "Up next" is the Overview's set only; plus the Problem hint (0022 §4.2) |
| 0020 §4.2 Label "longer than 24 characters is cut"; Description "`<State> · `"; icon colours of Active, Review, Done; Accessible label; Tooltip "`Problem: <its reason>`"; A-005 | Budget rule, step only, colours of 0022 §4.8, X-05, `Problem: <sentence>` (0022 §4.2) |
| 0020 AC-001 "Up next", "each group row's description shall be its count"; AC-002 "Up next"; AC-004 example; AC-005 "keep its state word in the description"; AC-019 "described `Review · /sdd-compile`", "`0001 Restaurant-Rechnung mit…`"; AC-022 "Up next row"; §6 rows on groups and `Review · /sdd-compile` | 0022 AC-004–AC-006, `Ready`; the smoke expects the step-only description and the budget label |
| PD-063 (7) "Copy is the primary button"; PD-065 (5); PD-066 (register not edited) | Refined by 0022 §4.1, §4.4; PD-066 superseded by PD-075 (G-4) |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021 (test audits) | Also except the tests 0022 AC-017 lists against a statement this table changes |

## 6. Texts (English, PD-016, in the text modules, asserted literally; all proxy, A-009)

| ID | Place | Replaces | New |
| --- | --- | --- | --- |
| X-01 | Tree group of Ready entries | `Up next` | `Ready` |
| X-02 | Tree group with Problems, description | `<count>` | `<count> · 1 problem` · `<count> · <n> problems` |
| X-03 | Same, accessible label and tooltip | — | `<group>: <count> specs · <n> problems`, with `1 spec` and `1 problem` at 1 |
| X-04 | Tree row description | `<State> · <short form>` | 0021's step or command short form; `<State>`; `Deprecated` |
| X-05 | Tree row accessible label | `<number> <full title>, <description>[, <T-05>]` | `<number> <full title>, <State>[, Deprecated][, <step short form>][, <T-05>]` |
| X-06 | Strip tooltip and name | `Done: 2 specs, collapsed` · `Review: 1 hidden by filter` | `… · 1 problem` · `… · <n> problems` appended |
| X-07 | Overview Up next, after the heading | — | `Ready first, then backlog` |
| X-10 | Folder and status disagree | `Folder <f>/ does not match status "<s>".` | `In the <f> folder, but its status is "<s>"`; no status: `In the <f> folder, but it has no status` |
| X-11 | Active without plan | `active/ spec without a sibling plan.` | `Active, but it has no plan` |
| X-12 | Done without archive | `done/ Implemented spec without an archive link in its Plan line.` | `Done, but its plan was never archived` |
| X-13 | Spec unreadable | `could not be read: …`, encoding text, `symbolic link not followed`, `parsing failed: …` | `Studio cannot read this spec` |
| X-14 | Plan unreadable | the same reasons | `Studio cannot read its plan` |
| X-15 | Return note unreadable | the same reasons | `Studio cannot read its return note <file name>` |
| X-16 | Folder not listable | `could not be listed: …`, `symbolic link not followed` | `Studio cannot list this folder` |
| X-17 | Same spec twice | `reference <r> also exists in <paths>` | `The same spec also exists in <paths>` |
| X-18 | Number twice | `number <n> also used by <paths>` | `Number <n> is also used by <paths>` |
| X-19 | Plan link dangles | `plan link <t> points to a missing file` | `Its plan <t> does not exist` |
| X-20 | Plan's spec link dangles | `spec link <t> points to a missing file` | `Its plan links a spec that does not exist: <t>` |
| X-21 | Unknown spec status | `unknown **Status:** value "<v>"` | `Its status "<v>" is not a FeatherSpec status` |
| X-22 | Unknown plan status | `Unknown plan status "<v>"; documented values are …` | `Its plan's status "<v>" is not a FeatherSpec status` |
| X-23 | Unknown return-note status | `unknown status value "<v>"` | `Its return note's status "<v>" is not DONE or BLOCKED` |
| X-24 | Return note without spec | `return note matches no spec (number <n>)` | `This return note belongs to no spec (number <n>)` |
| X-25 | Divider, accessible name | — | `Resize the side panel` |
| X-26 | Divider, tooltip | — | `Drag to resize. Double-click to reset.` |
| X-27 | Back button below 900 px, text and accessible name | — (close button of the drawer) | `Back to Overview` · `Back to Board` |

## 7. Error cases and edge cases

- A title word wider than the list (three-line layout) breaks inside; nothing overflows or hides Copy.
- Now is empty, or its first row has no step (NS-1, NS-3, NS-11) → the Overview list has no primary button; with the side panel open, one (A-007).
- A spec with two Problems in collapsed Done → `Done` group `<count> · 2 problems`; the strip `… · 2 problems`.
- A step short form without an intent (before 0021 lands) → budget step 2 does nothing.
- An unreadable file whose system message matters → the sentence shows, the message is its tooltip and description (OP-005).
- The clipboard fails on an icon Copy → warning icon, 0016 T-19's failure sentence announced.
- A path with no separator wider than its line → breaks inside the segment; the copied line is unchanged.
- High Contrast → the icon button has the theme's contrast border and a visible focus (guideline 9).
- The window shrinks below the stored width's limits → the width is clamped for this render; the
  stored fraction stays until the developer drags or resets.
- The Studio panel falls below 900 px while a width is stored → the detail alone (G-4); back at ≥ 900 px
  the stored width applies again.

## 8. Acceptance criteria

Decided by unit tests (core, no `vscode`), component tests (jsdom) and stylesheet tests unless marked.

- **AC-001** The stylesheet shall declare each Overview list an inline-size container and set the row layouts of §4.1 only inside `@container` rules on that list's width at 686 px and 420 px; no `@media` rule shall change an Overview row, its title or state text; no rule shall hold `data-drawer` or lay the side panel over the area; in the first Now row 0021's coach line and `?` shall follow the Copy as the row's last elements, on a line of their own in every layout.
- **AC-002** No rule shall set `overflow-wrap: anywhere` or `word-break: break-all` on an Overview row title, a card title or head, the side panel's heading or an element of §4.6.
- **AC-003** A Problems row shall hold its full title and every Problem sentence in the DOM; no rule matching a Problems row, a problem line, a banner line or the side panel's problem list shall set `text-overflow: ellipsis`, a line clamp or `white-space: nowrap`; a Problems row shall take the two-line layout at every list width from 420 px.
- **AC-004** Each tree row with a step shall carry as description 0021's step or command short form (§4.2), each without a step `<State>` or `Deprecated`; no description shall start with a state name followed by ` · `; the accessible label shall be X-05.
- **AC-005** On 0020's tree fixtures and generated titles of 1 to 80 characters combined with every NS rule's short form, label and description together shall hold at most 32 characters unless the room was raised to 12; the description shall end with the whole command short form; a title that fits shall not be cut.
- **AC-006** The tree groups shall be `In progress`, `Ready`, `Backlog`, `Done` in this order; a group holding a spec with a Problem shall carry X-02, the icon `warning` in `problemsWarningIcon.foreground`, and X-03 as accessible label and tooltip; a group without one shall carry the count alone, no icon and no tooltip; a group row's ID shall not change with either count.
- **AC-007** For one model with no filter the `Ready` group's count, the Overview's `Ready` figure and the Board's Ready count shall be equal; no tree group shall read `Up next`, and every text in `src` without tests and in `package.json` holding `up next` (case-insensitive) shall name the Overview's set: its heading, empty line, named set or the Board's filter chip for that set.
- **AC-008** While the Up next section lists a row it shall show X-07 after its heading; while it lists none it shall not.
- **AC-009** A narrow strip standing for a spec with a Problem it does not show shall render the warning icon with X-06 as tooltip and accessible name (collapsed Done and a filter-emptied column tested); every other strip shall render as 0018 AC-014.
- **AC-010** The webview shall style as primary (0016 AC-017's colours) only the Copies of §4.4 (1)–(3); every other next-step Copy shall be the icon button in a list and the secondary button (`--vscode-button-secondaryBackground`, `--vscode-button-secondaryForeground`) in the side panel, as shall the buttons of the Restricted Mode note and the notice.
- **AC-011** With seven Now rows, three Up next rows, a Problems row and a selected NS-5 spec, the Overview shall render exactly two primary buttons and the Board exactly one; with no spec selected, one and zero.
- **AC-012** When the developer activates an icon Copy by pointer, Enter or Space, the system shall copy the full first line, show the check or warning, 0021 §6.4's name and 0016 T-19's sentence (tooltip and live region) on the same element until 2000 ms after the last activation, then restore it, and select nothing; the stylesheet shall give the icon button a fixed width and height of at least 24 px.
- **AC-013** Each Problem kind of §6 shall show its sentence literally on each surface of §4.5, and in the webview with the technical reason as tooltip; a problem link's tooltip and accessible description shall be the reason, then 0019 AC-017's text.
- **AC-014** No sentence X-10…X-24, with every inserted path, value and number replaced by `x`, shall contain `backlog/`, `active/`, `done/`, `**`, `Plan line`, `sibling`, `stem`, `parsing` or `diagnostic`.
- **AC-015** Every element of §4.6 shall render a `<wbr>` directly after each `/`, `-` and `.` of its path and no other `<wbr>`; its text content and its Copy's clipboard text shall equal the path or line unchanged.
- **AC-016** The statements of §5 shall carry their notes directly beneath them; the implementation shall edit no existing row of the PD register.
- **AC-017** Every test at the commit on which this spec's implementation starts that decides a criterion not changed in §5 shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI; a script shall compare the test titles of both commits, and the plan shall list every missing title with the changed statement or the head title that replaces it.
- **AC-018** `README.md`, `docs/product/ux-guidelines.md` and `docs/release-checklist.md` shall name the tree groups In progress, Ready, Backlog, Done, and the plan shall list each "Up next" left there as the Overview's set; the README shall name the divider, its reset and the back button below 900 px; `CHANGELOG.md` shall name the changes under the version in preparation; the checklist shall carry AC-019, AC-020, AC-025.
- **AC-019** *(manual, preview; guideline 12)* In Dark, Light and High Contrast, height 800 px, at window widths 1600 px and 1000 px with VS Code's sidebar open at its default width, at a Studio panel of 920 px, at 800 px and at VS Code zoom level 2, each with a spec selected, on this repository and `fs170-brownfield-mixed`, Overview and Board, Gregor or his delegate shall confirm: no title word split (one wider than its line excepted); every Copy fully visible and reachable by Tab; at most two filled buttons; paths broken only after a separator; whole Problem sentences; the warning on `fs170-brownfield-mixed`'s collapsed Done strip; each state told at a glance, every icon shape distinct, the Problem warning included. Screenshots and verdict in the plan.
- **AC-020** *(manual, real VS Code)* At a sidebar width of 300 px in the three themes, on this repository, `fs170-brownfield-mixed` and `tip-splitter`, Gregor or his delegate shall confirm that every tree row shows its command uncut, that `fs170-brownfield-mixed`'s `Done` group shows its Problem hint and that the state icons differ by shape; a cut command retunes the budget of 32 (A-006) by a revise of §4.2 and AC-005.
- **AC-021** *(manual, Gregor; PD-069 click test)* On the HTML draft before `/sdd-plan` (held 2026-11-18, accepted: PD-073) and on `tip-splitter` after implementation, Gregor shall say without asking which Copy he presses first, where a Done spec's Problem shows and what `Ready` and `Up next` hold, matching §4.4, §4.3 and §4.2; the plan records his answers; a mismatch is a revise of this spec.
- **AC-022** The stylesheet shall give the page root, `main` and the area frame no scrolling (`overflow: hidden`) and a panel state its own `overflow-y: auto` box; within the area frame only the area content, the side panel and the Board's card lists shall set `overflow-y: auto`; no padding, margin or gap shall stand between the side panel's right edge and the Studio panel's. (stylesheet test)
- **AC-023** While the Studio panel is at least 900 px wide and a spec is selected, the webview shall render one divider between area and side panel with role `separator`, `aria-orientation="vertical"`, `aria-controls` naming the side panel, `aria-valuemin`, `aria-valuemax` and `aria-valuenow` in px, accessible name X-25 and tooltip X-26; below 900 px none. Left shall widen the side panel by 16 px and Right narrow it, with Shift by 64 px; Home shall set G-2's smallest width and End its largest; Enter and a double-click shall restore the default; a pointer drag shall move the divider with the pointer within the limits and end at release or loss of pointer capture. (component tests with stubbed sizes)
- **AC-024** For an area frame of 1428 px the default side-panel width shall be 571 px, for 900 px 400 px; no width shall leave the side panel below 320 px or the area below 360 px. When a drag ends or a key changes the width, the system shall remember width ÷ frame width per workspace, outside every workspace folder; whenever the side panel stands beside the area it shall use that fraction, clamped; a reset shall delete it; the system shall ignore a stored value that is not a number above 0 and below 1 and keep the remembered area and selection. (unit tests)
- **AC-025** *(manual, preview; guideline 12)* In Dark, Light and High Contrast at 1600 px with 0015 selected in the Overview and the Board, Gregor or his delegate shall confirm: no two vertical scrollbars side by side, the side panel's at the Studio panel's right edge; a width dragged to about 60 % of the frame returns after closing the side panel and selecting 0015 again, and after a window reload; a double-click restores the default; at 800 px and at VS Code zoom level 2 the area shows alone, a selected spec's detail alone with its back button and no divider, and back returns to the row or card that opened it.
- **AC-026** One module in `src/shared` shall map each state to the motif and colour of §4.8; the tree model, the board's column headers and strips, the side panel's state chip and the Overview rows shall take them from it, and the stylesheet shall hold no colour per state. (unit, component and stylesheet tests)
- **AC-027** Every Overview row shall render its spec's state icon (§4.8) before its state text with the state's name as tooltip, and the row's accessible name shall hold that name exactly once; where the state text is that name, the stylesheet shall hide it, visually only, inside the container rules below 686 px and nowhere else; no rule shall hide a need or a Problem sentence. (component and stylesheet tests)
- **AC-028** With the Studio panel at 920 px, the side panel beside it at its default width and 0001 selected, the list width computed from G-2's default and the stylesheet's paddings shall select the two-line layout; at the narrowest list beside the side panel (area 360 px) the computed width shall hold a title line of 12 characters (`12ch`) and the widest Copy; in the two- and three-line layouts the stylesheet shall put number and title on a line of their own and set no `white-space: nowrap` on the title. (unit and stylesheet tests; AC-019 previews it)
- **AC-029** While the Studio panel is narrower than 900 px (query stubbed), the webview shall show the area alone with no spec selected and, with one selected, the detail alone with X-27 for the current area at its top left and no close button or divider; when the developer activates the back button or presses Escape inside the detail, the system shall clear the selection, show the area with its earlier scroll position and move focus as 0019 AC-003; when the width crosses 900 px, the selection shall stay, side by side from 900 px and the detail alone below, focus where it was while that stays shown, else on the detail's heading. (component tests)

## 9. Technical notes for developers or AI agents

- As-is (eb7f870): `main` (`overflow: auto`) also holds `RestrictedNote`, `NoticeBar`, `PanelStateView`; `src/webview/testing/css.ts`
  reads no `@container` yet; the 900 px query is `DRAWER_QUERY` (`src/shared/protocol/layout.ts`, `useDrawer`).
- `parseUiMemory` (`src/core/shell/uiMemory.ts`) drops area and selection for one invalid part: keep the width apart.
- State maps today: `STATE_ICONS` (`src/core/shell/specTree.ts`), `PATHS` (`src/webview/board/icons.tsx`), `[data-board-state]` in `main.css`.

## 10. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | Every choice here is a proxy until Gregor's click tests (PD-069) | He delegated the round | A revise |
| A-002 | E-4: tree group `Ready`; Overview keeps "Up next" with X-07 (proxy, PD-071) | 08 E-4's recommendation, smallest change | AC-006–AC-008 |
| A-003 | E-7: rows follow the list's width by container rules (proxy, PD-071) | 08 E-7; guideline 12; PD-075 removed the drawer, the rule stays for side by side and zoom | §4.1, AC-001 |
| A-004 | E-5: N-9 not built here (proxy, PD-071) | 08 E-5: after the click test, low priority | OP-004 |
| A-005 | Breakpoints 686 px and 420 px of the list (proxy) | PD-065 (5)'s 720 px − 34 px; 08 N-2's 420 px | AC-001, AC-019 |
| A-006 | Tree budget 32 characters, title room at least 12 (proxy) | Estimated 300 px room (n02 cut a 24-character label and `Review · /`); AC-020 retunes it | AC-005 |
| A-007 | The zero-spec Copy is primary (proxy) | Guideline 8: the action the user came for | AC-010, AC-011 |
| A-008 | List Copies are icon buttons (proxy) | 07 §5.2, N-6; ten text buttons outshouted titles | AC-010, AC-012 |
| A-009 | Sentences replace only the shown reason; every §6 text is a proxy | 0016 AC-003 asserts the reasons; PD-063 (1) | §4.5, §6 |
| A-010 | The group hint shows expanded or collapsed alike (proxy) | Guideline 3 "wherever the spec appears" | AC-006 |
| A-011 | §4.7's numbers (320/360 px, 40 % and at least 400 px, 16/64 px) (proxy) | 0019 A-003's 400 px stays the floor; at Gregor's ≈ 990 px panel it stays 400 px, so the drag answers PD-070 | AC-023, AC-024 |
| A-012 | APG splitter keys, but Enter resets (APG: collapses); dragging has no single-pointer alternative, WCAG 2.2 SC 2.5.7 named (proxy) | Close already closes; VS Code's sashes alike; keys and the default serve | AC-023 |
| A-013 | Restricted Mode note and notice buttons become secondary (proxy) | Guideline 8; 07 N-6 primary only in detail and first Now row | AC-010 |
| A-014 | Where the tree drops the intent, tooltip and accessible label keep it (proxy) | 0021 OP-004; guideline 1 | X-05, AC-004 |
| A-015 | PD-073's palette (proxy); Review's orange equals the webview's Problem icon colour and differs by shape | PD-073; guideline 7; 0007 §6.7 never colour alone | §4.8, AC-019, AC-026 |
| A-016 | PD-075's details: the 900 px threshold reused, X-27, back in place of close, 0019's focus rules, focus after a crossing (proxy) | PD-075 names them proxy details; 0019 already switches at 900 px | G-4, AC-029 |

## 11. Open points

- OP-001 `/sdd-clarify` 2026-11-18 (S63): 71 findings resolved under Gregor's standing answer (`0022-findings.md`); cross-spec
  with 0021: the tree's dropped intent and the icon Copy's name (settled on both sides), NS-1's "See the problem below" (OP-005).
- OP-002 Click test (PD-069): drafts accepted 2026-11-18 (PD-073); §4.8 and G-4 (PD-075) followed it; AC-021's build part stays.
- OP-003 Where 0021 also amends a statement of §5, 0021's note comes first, whichever spec is implemented first.
- OP-004 N-9 (one row for many equal steps in Now): Gregor decides after the click test on the build (E-5, A-004).
- OP-005 NS-1 (0016 T-18, owned by 0021) says "See the problem below", which now reads X-13, the reason as tooltip; AC-021 checks it on the build.

## 12. Definition of Ready / Done

Ready: §4–§6 literal, §5 complete, the draft click test held (PD-073). Done: AC-001–AC-018, AC-022–AC-024, AC-026–AC-029
green with evidence in the plan, AC-019–AC-021 and AC-025 checked, §5 applied, docs, architecture and Memory Bank synced,
`/sdd-compile` READY. Next: `/sdd-plan`.
