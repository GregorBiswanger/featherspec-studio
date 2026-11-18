# Layout and Signal Polish

**Status:** Draft
**Plan:** _none yet_

Basis: implementation review of 2026-11-18 ([07](../../docs/ux-audit/07-implementation-review.md) findings
N-2…N-9, screenshots `screenshots-045b354/` n02, n04–n08, n16, n19, n21) as cut in
[08 §3](../../docs/ux-audit/08-spec-handoff.md). Decisions: PD-069 (round adopted; guidelines 8 and 12),
PD-016, PD-059 and PD-063 (tiers), PD-065 (5), PD-066. Guidelines: `.claude/rules/ux-guidelines.md`
(binding; 3, 6, 7, 8, 9, 10 and 12 apply to every criterion here). Written in parallel with **0021**,
which owns the step texts, the short form (08 R-3), the button label "Copy prompt" and its accessible
name (08 R-4), the coach line and the `(?)` toggletip; this spec refers to them and restates none.
Amends 0005, 0016, 0017, 0018, 0019, 0020 (§5). No interview: Gregor delegated the round (PD-069); every
open decision is a proxy in §10. §4.7 adds Gregor's own feedback of 2026-11-18 (PD-070; his screenshot
`screenshots-045b354/g02-gregor-two-scrollbars-fixed-split.png`): one scrollbar, and a side panel he can
widen by dragging, remembered, with a reset.

## 1. Summary

No new function. The Overview lays out its rows by its own width, so titles stop breaking mid-word
under the drawer and Copy stays visible. The Specs tree shows the step, not the state, and names its
Ready group `Ready`, so "Up next" means one set. A collapsed tree group or board strip says when it
hides a Problem. At most two primary buttons per view; list Copies become icon buttons. Problems
read as user sentences and wrap instead of being cut. Paths break only after a separator. Beside the
area, the side panel has one scrollbar at the panel's edge and a divider the developer drags to give
the detail more or less room; the Studio remembers the width and a double-click resets it (PD-070).

## 2. Goal, problem and users

Evidence (07 §4): under the drawer at a 1000 px window the Overview keeps about 250 px and breaks
titles by syllable ("configura/ble", n16, P1); at the default 300 px sidebar the tree cuts exactly the
step ("Rev…", n02); a Problem in the collapsed Done group or strip is invisible (n08, against
guideline 3); "Up next" holds Ready in the tree but Ready + Backlog in the Overview (n05, n07); ten
filled Copy buttons on one screen are louder than the titles (n04, n06); "done/ Implemented spec without
an archive link in it…" is technical and cut (n19); a path breaks inside a segment (n04).
**Users:** the developer beside an AI chat on a laptop-width window (primary) and the workshop
presenter. **Success:** at 1000 px with the side panel open no title word is split and every Copy is
visible; one primary button per region; a hidden Problem is announced where it hides; no test that
decides a staying criterion is lost (AC-017).

## 3. Scope

### In scope

- Overview row layout by the list's own width (N-2, §4.1); tree row description, label length, group
  name and group Problem hint (N-3, N-4, N-5, §4.2); board strip Problem hint (N-4, §4.3).
- Which next-step Copy is primary, secondary or an icon button (N-6, §4.4).
- Problem sentences on every surface and their wrapping (N-7, §4.5); line breaks in paths (N-8, §4.6).
- One scrollbar per column, the resizable and remembered side-panel width with a reset (Gregor, PD-070, §4.7).
- Amendments of older specs (§5); every changed text (§6).

### Out of scope

- Step texts, short form, button label "Copy prompt", accessible-name wording, coach line, `(?)`, settings — because 0021 owns them.
- N-9, one summary row for many equal steps in Now — because it is new function, not polish; E-5 decided "not in 0022", Gregor decides after the click test (A-004, OP-004).
- The drawer itself (overlay below 900 px, 0019 §6.1) and a dimmed overlay instead (E-7 alternative) — because the container rule fixes N-2 without changing it (A-003).
- The Board's layout at narrow width — because no finding: it keeps its width and scrolls (PD-066).
- What the parser and lifecycle findings say internally — because 0002/0003 tests assert them; only the shown sentence changes (A-009).
- A separate "Needs fixing" tree group (07 N-4 alternative) — because each spec stays in exactly one group (0020 §4.1).
- A board switch "Show empty columns" (07 §5.3) — because no finding asks for it; not now.
- Plan map (0023), Send to the assistant (0024) — because they are their own specs.

## 4. Business rules

### 4.1 Overview rows follow the list's own width (N-2, guideline 12, E-7)

Each Overview list (Now, Up next, Problems) lays out its rows by its own content width, never by
the viewport or the drawer state:

| List width | Row |
| --- | --- |
| above 686 px | one line, as 0018 O-5 (title and state text cut by an ellipsis, full text as tooltip; step and Copy never cut) |
| 420–686 px | two lines (PD-065 (5)): number and title; then state text, warning icon, "Next" with the short form, Copy |
| below 420 px | three lines (08 N-2): number and title; state text and warning icon; "Next" with the short form and Copy |

- 686 px is the list width at PD-065 (5)'s 720 px panel (panel − 34 px), so nothing moves while no drawer is shown (A-005).
- A Problems row cuts nothing at any width: two lines from 420 px, three below (§4.5).
- Titles wrap only between words; a single word wider than its whole line is the one case that breaks inside. Paths and commands follow §4.6.
- Every Copy stays fully on screen at every list width (WCAG 2.2 SC 2.4.11; PD-066's reason).
- First Now row (0021 §6.5, §6.6): the coach line and `?` follow its Copy prompt as the row's last line, aligned with the step, in every layout; the toggletip text shows under that line inside the row and covers no other row.
- The drawer keeps PD-066's end padding; it no longer forces a row layout — the narrower list does.

### 4.2 Specs tree (N-3, N-4, N-5, E-4)

- **Groups:** `In progress`, `Ready` (was `Up next`), `Backlog`, `Done`; states, order and start state as 0020 §4.1.
- **"Up next"** names one set only: the Overview section (Ready, then Backlog; 0018 O-3) and its "+ n more" set. While it lists a row, its heading is followed by X-07.
- **Group with a Problem** (any spec in it has a 0016 *Problem*; n = their Problems, counted as 0016 T-05 counts): description X-02, icon `warning` in `problemsWarningIcon.foreground`, accessible label and tooltip X-03 — expanded or collapsed alike (A-010). Without one: 0020 §4.1 unchanged.
- **Row description = the step only:** 0021's step short form (0021 §6.3) for a spec with a step; `<State>` for one without (NS-1, NS-3, NS-11); `Deprecated` as before. The state shows in icon, group, tooltip and accessible label (X-05).
- **Label budget** (replaces 0020's 24-character cut, A-006): label and description together hold at most 32 characters.
  1. Title room = 32 − (number length + 1) − description length.
  2. If the room is below 12 and the step short form has an intent, the description becomes 0021's command short form alone; the room is recomputed. The tooltip keeps the full form (0021 §6.3).
  3. The title is cut by 0020 §4.2's cut rule to the room, never below 12 characters; a title that fits is not cut. The command is never cut.
- Row tooltip: per Problem `Problem: <sentence>` (§4.5).

### 4.3 Board strips (N-4)

A narrow strip (0018 B-1) that stands for a spec with a Problem it does not show as a card — Done
while collapsed, or a card a filter hides — shows the warning icon under its count; its tooltip and
accessible name are its 0018 §7 text followed by ` · ` and 0016 T-05 (X-06), then B-6's rule
tooltip where one applies. Every other strip is unchanged.

### 4.4 Button hierarchy (N-6, guideline 8)

- **Primary**, and only these: (1) the side panel's Copy of the next step's first line; (2) the Copy
  of the Overview's first Now row; (3) the one Copy of the zero-spec state (0018 O-8, Overview and
  Board), alone on its screen (A-007). Hence at most two per view.
- **Secondary text button:** the side panel's Copy of a further line (the "Then" line of NS-5, NS-9).
- **Icon button** (copy icon, no text): every other next-step Copy — Now rows after the first, Up next
  rows and its empty line, Problems rows, board cards (07 §5.2, A-008).
- The icon button keeps 0016 §6.5's action and feedback: it copies the full first line; tooltip and
  accessible name are 0021 §6.4's `Copy prompt: <line>`; for 2000 ms after a click
  the icon is a check (copied) or a warning (could not copy), the accessible name reads X-08, the
  tooltip is 0016 T-19's sentence and the live region announces it; its box does not change; the
  target is at least 24 × 24 CSS px (WCAG 2.2 SC 2.5.8); Tab order and keys as 0017 AC-005, AC-006.
- Native surfaces (tree inline action, status bar) and panel-state buttons are unchanged.

### 4.5 Problems as sentences (N-7, guidelines 3 and 6)

- Every *Problem* (0016 §6.1) shows as its X-10…X-24 sentence on every surface: the detail's problem
  list, the Overview Problems row (sentences joined by ` · `, PD-064 P-6) and project lines
  (`<place>: <sentence>`), the board banner, the tree tooltip. In the webview the finding as the
  files state it (today's reason) is that element's tooltip. Format notes keep their reason.
- One function gives a finding's sentence; no surface words its own.
- Problem rows, lines and the detail's list wrap; nothing in them is cut by an ellipsis or clamp.

### 4.6 Paths and commands (N-8)

Every project path and every command line the webview shows — side-panel next-step lines, the
detail path, a card path, Files links, the place of a problem line — offers a line break directly
after each `/`, `-` and `.` and nowhere else inside the path; a segment wider than its whole line is
the one case that breaks inside. Copy and text selection yield the path unchanged.

### 4.7 One scrollbar, a divider, a remembered width (Gregor 2026-11-18, PD-070)

Evidence: Gregor's window (1428 px panel, Overview, 0001 selected) shows two vertical scrollbars side
by side at the right edge — the side panel's and the page's — and a fixed 400 px detail that looks
squeezed next to a mostly empty Overview.

- **G-1 One scrollbar per column.** The page, `main` and the area frame never scroll. Only the area
  content (its scrollbar at the divider) and the side panel (its scrollbar at the panel's right edge)
  scroll, each only while its content is taller than the space it has. No scrollbar stands beside
  another; in drawer mode the same holds.
- **G-2 Divider.** While the side panel stands beside the area (panel ≥ 900 px, 0019 §6.1), a vertical
  divider sits between them. Dragging it sets the side panel's width, within: side panel ≥ 320 px, area
  ≥ 360 px. Default width: 40 % of the frame width, at least 400 px (replaces 0019's fixed 400 px).
  Keyboard: the divider is a focusable `separator` (vertical) whose value is the side panel's width in
  px; Left and Right change it by 16 px (with Shift by 64 px), Home and End go to the limits, Enter
  resets. Pointer: a column-resize cursor while over it; a double-click resets. The divider shows the
  theme's focus outline (guideline 9) and the sash colour while hovered or dragged.
- **G-3 Remembered.** The chosen width is stored as a fraction of the frame width in the workspace's
  UI memory (0005's per-workspace memory, beside area and selection) when a drag ends or a key changes
  it, and is used the next time the panel opens; a reset deletes it. A stored value is clamped to the
  limits of G-2 for the current frame; a value that is not a number between 0 and 1 is ignored.
- **G-4 Drawer.** Below 900 px there is no divider; 0019 §6.1 and PD-066 stay as they are.

## 5. Amendments of other specs

The implementation places "*Amended by 0022 (PD-069): …*" directly under each statement. Where
0021 also amends a statement, 0021's note comes first (OP-003).

| Spec · statement | Amendment |
| --- | --- |
| 0016 §6.5 "Every Copy the Studio offers for a next step uses the primary button style" | Only the Copies of 0022 §4.4 (1)–(3) are primary; further side-panel lines secondary; list Copies icon buttons with this feedback |
| 0016 §6.2 Detail row "each with the warning icon and its reason" | Its sentence (0022 §6), the finding as tooltip |
| 0017 §6.1 "Card and row Copy take 0016 §6.5's style and feedback" | The icon button of 0022 §4.4 with that feedback |
| 0018 O-3 "while the Up next group of 0020's tree holds Ready only beside its own Backlog group (0020 §4.1)" | That group is named `Ready` (0022 §4.2); the section shows X-07 |
| 0018 O-5 "Problems row: each Problem's own reason"; "Above a panel width of 720 px … At 720 px or less the row takes two lines" | Sentences of 0022 §6; layout by the list's own width (0022 §4.1); a Problems row cuts nothing |
| 0018 AC-006 "on one line above 720 px", "at 720 px or less (media query `max-width: 720px`)" | Container rules of 0022 AC-001 at 686 px and 420 px of the list; Problems rows per AC-003 |
| 0018 O-8, AC-012 Copy of "Nothing up next…" | Icon button (0022 §4.4); the zero-spec Copy (AC-011) stays primary |
| 0018 B-1 "without card list or hint"; AC-014; §7 row "Narrow column" | Plus the Problem hint of 0022 §4.3 (X-06) |
| 0019 §6.1 "and its rows take the two-line layout of 0018 T-013" | The rows follow the list's own width (0022 §4.1); the end padding stays |
| 0019 §6.1 Place "Panel ≥ 900 px wide: 400 px at the right edge beside the area content, own scroll"; AC-005 "the side panel shall be 400 px wide beside the area content with its own scroll"; §9 row "The board's free width shrinks by 400 px"; A-003 "400 px" | Width per 0022 §4.7 G-2 (default 40 % of the frame, at least 400 px; resizable; remembered, G-3); one scrollbar per column (G-1) |
| 0005 A-003 and the per-workspace UI memory "Remembering the area and selection per workspace" | Also the side panel's width fraction (0022 §4.7 G-3) |
| 0020 §4.1 group `Up next`; bullet "*Up next* is what to pick up next; …"; "description = the number of its specs, no icon of its own" | `Ready`; "Up next" is the Overview's set only; plus the Problem hint (0022 §4.2) |
| 0020 §4.2 Label "longer than 24 characters is cut"; Description "`<State> · `"; Accessible label; Tooltip "`Problem: <its reason>`"; A-005 | Budget rule, step only, state in the accessible label (X-05), `Problem: <sentence>` (0022 §4.2) |
| 0020 AC-001 "Up next", "each group row's description shall be its count"; AC-005 "keep its state word in the description"; AC-019 "described `Review · /sdd-compile`", "`0001 Restaurant-Rechnung mit…`"; §6 rows on groups and `Review · /sdd-compile` | 0022 AC-004–AC-006; the smoke expects the step-only description and the budget label |
| PD-063 (7) "Copy is the primary button"; PD-065 (5); PD-066 rows layout (register not edited) | Refined by 0022 §4.1, §4.4; PD-066 supplemented by the container rule (E-7, OP-002) |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021 (test audits) | Also except the tests 0022 AC-017 lists against a statement this table changes |

## 6. Texts (English, PD-016, in the text modules, asserted literally; all proxy, A-009)

| ID | Place | Replaces | New |
| --- | --- | --- | --- |
| X-01 | Tree group of Ready entries | `Up next` | `Ready` |
| X-02 | Tree group with Problems, description | `<count>` | `<count> · 1 problem` · `<count> · <n> problems` |
| X-03 | Same, accessible label and tooltip | — | `<group>: 1 spec · 1 problem` · `<group>: <count> specs · <n> problems` |
| X-04 | Tree row description | `<State> · <short form>` | 0021's step or command short form; `<State>`; `Deprecated` |
| X-05 | Tree row accessible label | `<number> <full title>, <description>[, <T-05>]` | `<number> <full title>, <State>[, <description>][, <T-05>]` |
| X-06 | Strip tooltip and name | `Done: 2 specs, collapsed` · `Review: 1 hidden by filter` | `… · 1 problem` · `… · <n> problems` appended |
| X-07 | Overview Up next, after the heading | — | `Ready first, then backlog` |
| X-08 | Icon Copy during feedback, accessible name | button text `Copied` / `Could not copy` | `Copied: <line>` · `Could not copy: <line>` |
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

## 7. Error cases and edge cases

- A title word wider than the list (three-line layout) breaks inside; nothing overflows or hides Copy.
- Now is empty → the Overview list has no primary button; with the side panel open, one (A-007).
- A spec with two Problems in collapsed Done → `Done` group `2 · 2 problems`; the strip `… · 2 problems`.
- A step short form without an intent (before 0021 lands) → budget step 2 does nothing.
- An unreadable file whose system message matters → the sentence shows, the message is its tooltip.
- The clipboard fails on an icon Copy → warning icon, 0016 T-19's failure sentence announced.
- A path with no separator wider than its line → breaks inside the segment; the copied line is unchanged.
- High Contrast → the icon button has the theme's contrast border and a visible focus (guideline 9).
- The window shrinks below the stored width's limits → the width is clamped for this render; the
  stored fraction stays until the developer drags or resets.
- The panel falls below 900 px while a width is stored → drawer mode (G-4); back at ≥ 900 px the
  stored width applies again.
- The UI memory holds a width that is not a number between 0 and 1 → ignored, the default applies.

## 8. Acceptance criteria

Decided by unit tests (core, no `vscode`), component tests (jsdom) and stylesheet tests unless marked.

- **AC-001** The stylesheet shall declare each Overview list an inline-size container and set the row layouts of §4.1 only inside `@container` rules on that list's width at 686 px and 420 px; no `@media` rule and no rule whose selector holds `data-drawer` shall change an Overview row, its title or state text; in the first Now row 0021's coach line and `?` shall follow the Copy as the row's last elements, on a line of their own in every layout.
- **AC-002** No rule shall set `overflow-wrap: anywhere` or `word-break: break-all` on an Overview row title, a card title or head, or the side panel's heading.
- **AC-003** A Problems row shall hold its full title and every Problem sentence in the DOM; no rule matching a Problems row, a problem line, a banner line or the side panel's problem list shall set `text-overflow: ellipsis`, a line clamp or `white-space: nowrap`; a Problems row shall take the two-line layout at every list width from 420 px.
- **AC-004** Each tree row with a step shall be described by 0021's step or command short form (§4.2), each without a step by `<State>` or `Deprecated`; no description shall start with a state name followed by ` · `; the accessible label shall be X-05.
- **AC-005** On 0020's tree fixtures and generated titles of 1 to 80 characters combined with every NS rule's short form, label and description together shall hold at most 32 characters unless the title sits at 12; the description shall end with the whole command short form; a title that fits shall not be cut.
- **AC-006** The tree groups shall be `In progress`, `Ready`, `Backlog`, `Done` in this order; a group holding a spec with a Problem shall carry X-02, the icon `warning` in `problemsWarningIcon.foreground`, and X-03 as accessible label and tooltip; a group without one shall carry the count alone, no icon and no tooltip.
- **AC-007** For one model the `Ready` group's count, the Overview's `Ready` figure and the Board's Ready count shall be equal; no tree group shall read `Up next`, and every text holding `up next` (case-insensitive) shall name the Overview's set: its heading, empty line, named set and the Board's filter chip for that set.
- **AC-008** While the Up next section lists a row it shall show X-07 after its heading; while it lists none it shall not.
- **AC-009** A narrow strip standing for a spec with a Problem it does not show shall render the warning icon with X-06 as tooltip and accessible name (collapsed Done and a filter-emptied column tested); every other strip shall render as 0018 AC-014.
- **AC-010** The webview shall style as primary only the Copies of §4.4 (1)–(3); every other next-step Copy shall be the icon button in a list and the secondary button in the side panel.
- **AC-011** With seven Now rows, three Up next rows, a Problems row and a selected NS-5 spec, the Overview shall render exactly two primary buttons and the Board exactly one; with no spec selected, one and zero.
- **AC-012** When the developer activates an icon Copy by pointer, Enter or Space, the system shall copy the full first line, show the check or warning with X-08 and 0016 T-19's sentence (tooltip and live region) for 2000 ms on the same element, then restore it, and select nothing; the stylesheet shall give the icon button a fixed width and height of at least 24 px.
- **AC-013** Each Problem kind of §6 shall show its sentence literally on each surface of §4.5, and in the webview with the finding as found as tooltip.
- **AC-014** No sentence X-10…X-24, with every inserted path, value and number replaced by `x`, shall contain `backlog/`, `active/`, `done/`, `**`, `Plan line`, `sibling`, `stem`, `parsing` or `diagnostic`.
- **AC-015** Every element of §4.6 shall render a `<wbr>` directly after each `/`, `-` and `.` of its path and no other `<wbr>`; its text content and its Copy's clipboard text shall equal the path or line unchanged.
- **AC-016** The statements of §5 shall carry their notes directly beneath them; no existing row of the PD register shall be edited.
- **AC-017** Every test at the commit on which this spec's implementation starts that decides a criterion not changed in §5 shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI; a script shall compare the test titles of both commits, and the plan shall list every missing title with the changed statement or the head title that replaces it.
- **AC-018** `README.md`, `docs/product/ux-guidelines.md` and `docs/release-checklist.md` shall name the tree groups In progress, Ready, Backlog, Done and no tree group "Up next" (CHANGELOG history exempt).
- **AC-019** *(manual, preview; guideline 12)* In Dark, Light and High Contrast at window widths 1600 px and 1000 px, height 800 px, VS Code's sidebar open at its default width and the Studio side panel showing a spec, on this repository and `fs170-brownfield-mixed`, Overview and Board: no title word is split (one wider than its line excepted); every Copy is fully visible and reachable by Tab; at most two filled buttons; paths break only after a separator; Problems rows show whole sentences; the collapsed Done strip shows the warning. Screenshots and verdict in the plan.
- **AC-020** *(manual, real VS Code)* At a sidebar width of 300 px in the three themes, on this repository, `fs170-brownfield-mixed` and `tip-splitter`: every tree row shows its command uncut and the `Done` group shows its Problem hint; the budget of 32 is retuned here if needed (A-006).
- **AC-021** *(manual, Gregor; PD-069 click test)* On the HTML draft before `/sdd-plan` and on `tip-splitter` after implementation, Gregor says without asking which Copy he presses first, where a Done spec's Problem shows, and what `Ready` and `Up next` hold; answers recorded in the plan.
- **AC-022** While the side panel is shown beside the area or as a drawer, the stylesheet shall give the page root, `main` and the area frame no scrolling (`overflow: hidden`) and only the area content and the side panel `overflow-y: auto`; the side panel's right edge shall be the frame's right edge (no padding or gap after it). (stylesheet test)
- **AC-023** While the panel is at least 900 px wide and a spec is selected, the webview shall render one divider between area and side panel with role `separator`, `aria-orientation="vertical"`, `aria-valuemin`, `aria-valuemax` and `aria-valuenow` in px, accessible name X-25 and tooltip X-26; below 900 px it shall render none. Left/Right shall change the width by 16 px, with Shift by 64 px, Home/End shall go to the limits of G-2, Enter and a double-click shall restore the default; a pointer drag shall set the width to the pointer's position within the limits. (component tests with stubbed sizes)
- **AC-024** For a frame of 1428 px the default side-panel width shall be 571 px, for 1000 px 400 px; no width shall leave the side panel below 320 px or the area below 360 px. When a drag ends or a key changes the width, the system shall store width ÷ frame width in the workspace's UI memory; when the panel opens again it shall use the stored fraction, clamped; a reset shall delete it; a stored value that is not a number in (0, 1) shall be ignored. (unit tests on the width rule and the UI memory)
- **AC-025** *(manual, preview; guideline 12)* In Dark, Light and High Contrast at 1600 px with 0015 selected in the Overview and the Board: exactly one vertical scrollbar at the panel's right edge; dragging the divider to about 60 % and reopening the panel shows the same width; a double-click restores the default; at 1000 px with VS Code's sidebar open the drawer shows no divider.
