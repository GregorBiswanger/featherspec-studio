# Overview and a Compact Board

**Status:** In Progress
**Plan:** [0018-overview-and-compact-board.plan.md](0018-overview-and-compact-board.plan.md)

*Amended by 0021 (PD-069): wherever this spec names the control "Copy" of a prompt (a next step or `/sdd-specify`), read `Copy prompt`, named as 0021 §6.4; the feedback stays; wherever it shows a next step line, 0021 §6.1 gives each line its intent.*

Basis: UX audit 2026-11-17 (`docs/ux-audit/`) R-06, R-10, R-14, R-15 (05); K-C, K-D, K-J (04); 03 §5–§7;
findings 02 §3.3–§3.5, §3.11 (screenshots 03, 04, 20, 22, 28, 29). Decisions PD-058, PD-062, PD-016,
PD-036, PD-040, PD-047; guidelines 1–3, 6–10 (`.claude/rules/ux-guidelines.md`). Builds on
0016 (diagnostic tiers, user texts, Copy feedback) and 0017 (next step with Copy on cards and rows, no
moves, status bar), both implemented first. Gregor delegated every product decision (PD-058); proxies
are marked in §11.

## 1. Summary

Mission Control becomes **Overview**: what is in progress comes first (Now), then Up next, then real
problems, one line of figures and a collapsed Activity list. The Spec Board becomes **Board**, a
compact read-only pipeline: a column without a card is a 32 px strip, Done is collapsed and the choice
is remembered, the state checkboxes and the state chip go, and every card has three rows: title,
progress or need, next step. The card's date can be trusted: the plan's own `Last updated:` first,
the file time otherwise, and no date at all while every card would show the same one. The panel
names the project once, loses the ▸ marker, and two refresh commands become one "Refresh".

## 2. Goal and problem

Mission Control weighted counts over action: six tiles, a bar and a percentage showed one
distribution; *Needs attention* named no step (02 §3.4). The board spent its width on empty columns
(3 of 6 empty, Blocked cut off at 1240 px, 2.4 columns visible at 640 px), cards had up to nine rows,
the state filter produced five empty columns, and after a copy every card showed the same "Last
change" (02 §3.5; B 04, 20, 28). The project name appeared four times, the current tab carried a
marker and a highlight, and two refresh commands were hard to tell apart (02 §3.3, §3.11).
Goal: "what now?" answered at a glance; on this repository every column that shows a card visible
without horizontal scrolling at 1240 px, and at 640 px while at most two do (B-2); no date that
misleads (AC-031).
*Amended by 0019 (PD-058): §2 goal — "visible without horizontal scrolling" holds with no spec selected; with the side panel the board scrolls (0019 §9).*

## 3. Users and roles

Developer, one role without permissions (0006 §3, 0007 §3); workshop participants and presenters
read the same views (audit P2, P3).

## 4. Scope

### In scope

- Overview (R-06, PD-062): sections, order, limits, rows, figures line, empty states, drill-downs; the
  rename of the areas and their commands (§6.4).
- Board (R-10): narrow columns, widths, Done collapsed and remembered, filter chip without state
  checkboxes, three-row card, column header tooltip, keyboard on the new layout.
- Times (R-14, K-J): the card's date, when it shows, and the sort option.
- Panel frame (R-15): project name once, no ▸ marker, one "Refresh" command.
- The amendments of §5; README, CHANGELOG, `docs/release-checklist.md`, design brief, architecture docs.

### Out of scope

- Tier, wording and look of problems, need texts ("needs a plan"), derived-state sentences, the
  "Updated" time text, Copy feedback — because 0016 owns them; this spec only places them.
- Short form, Copy, tab stop and second line of the next step; the status bar — because 0017 owns them.
- Where activating a row or card shows the detail, and the detail itself — because 0019 owns them.
- The Activity Bar tree, its toolbar and the Spec Explorer list grouping of R-15 — because 0020 owns them.
- Git-based times (K-J option 2, K-K) — because PD-061 (2) defers them until users ask.
- A search or state filter of the board's own — because the columns are the states (03 §7).
- Progress as a visible figure — because PD-062 moves it into a tooltip.

## 5. Amendments of other specs

Applied in the implementing change set as inline notes "*Amended by 0018 (PD-062): …*". Statements
already amended by 0015–0017 are read as amended; the PD register is history and is not edited.
Wherever 0003, 0005–0007, 0013 or 0015–0017 name Mission Control or the Spec Board as a place,
read Overview or Board; the rows below change behaviour.

| Spec · statement | Amendment |
| --- | --- |
| 0001 §9 command "Refresh Project Discovery" | Replaced by "FeatherSpec Studio: Refresh" (§6.4); AC-011, AC-012 and AC-015 (the notification's "Refresh", shown only without a project) stay |
| 0005 §1, §5, BR-02, §9, §13 edge "remembered area … cannot be used", AC-003 (entry labels), AC-004, AC-005, AC-009, AC-028; 0015 §8 purpose, AC-001, AC-002 | Areas "Overview" (`overview`, default) and "Board" (`board`), commands and purposes of §6.4 and §7; a remembered area this version does not know (`missionControl`, `specBoard`, `agentCenter`) shows Overview with no selection (BR-02, §13) |
| 0005 §9 "marks the current area in text"; PD-054 "the marker of the current area stays" | The current item is marked by its highlight with the 2 px bottom border and `aria-current="page"`; no ▸ (AC-026) |
| 0005 §9 "shows the active project's name" | Once, in the panel header, with the tooltip of §6.4; no area repeats it (AC-025) |
| 0005 §4, §9, §13 *Refresh* action and OP-009 "Rescan Project"; AC-029 | "FeatherSpec Studio: Refresh" (F-3, AC-027); AC-029's "keeps its content until the new model arrives" holds for the command |
| 0006 §1, §4, §5 step 3, §9 layout, BR-01, BR-02 (Deprecated beside Done, derived label), BR-08 rows *Needs attention*, attention row, header diagnostics count; 0013 §3.2; 0015 AC-010 (*Needs attention* part) | Overview §6.1: Blocked and Review are Now (O-2), a Problem is a Problems row (O-4). BR-04's rule stays, shown in the tooltip (AC-009); BR-07, BR-09 stay |
| 0006 AC-008, AC-009, AC-012 (*Needs attention* part), AC-014 (attention row), AC-017, AC-020, AC-022, AC-025, AC-028 | AC-008, AC-009 → AC-004, AC-007 (the tier is 0016's); AC-012: Total and state counts unchanged, the *Needs attention* part → AC-005, AC-007; AC-014: Now, Up next and Problems rows (AC-006); AC-017: name, version and time (as 0015 left it) → F-1's tooltip, the number → AC-007; AC-025 void; AC-020, AC-028 → AC-011; AC-022 → AC-013 |
| 0006 AC-001–AC-004, AC-010, AC-015, AC-016, AC-018, AC-019, AC-021, AC-023, AC-024, AC-029; PD-046 | Hold for the Overview; *Recent activity* is its Activity section |
| 0007 §1, §6.1, FR-02, AC-003, AC-004 (card), AC-024 (card part); 0013 §3.3, AC-009 (as left by 0017) | Three-row card §6.2 B-5: no state chip, derived marker or description on the card |
| 0007 AC-006 (card part) | The card leaves out a figure that is not available; the detail keeps "not available" |
| 0007 §6.2 last change, FR-03, FR-07, AC-013, AC-025; PD-043 last sentence | §6.3 |
| 0007 §4 filter bullet, §6.5, FR-06, AC-012, AC-022; PD-041 | No filter control; a navigation request's filter shows as one chip (§6.2 B-4); "N hidden by filter" stays on columns that show cards |
| 0007 §6.7, AC-017 | Left and Right skip narrow columns; the Done toggle joins the keyboard path; the checkboxes leave it (AC-024) |
| 0007 §6.8, AC-021 | No column hint; narrow strip (AC-014); zero specs per AC-011 |
| 0013 AC-004–AC-007 | Void (no tiles, bar, header, attention panel) |
| 0013 AC-008 | Widths of §6.2 B-2 (AC-015) |
| 0016 §6.2 rows *Needs attention* and "Mission Control header", AC-006, AC-007 (attention row, header), AC-008, AC-012 (card, tile), AC-015 (header time), T-01, T-02, T-04 | No header: T-01 gives way to the Problems heading, whose n counts its rows (O-4), its request the heading's (AC-007); T-02 goes into the project name's tooltip (AC-025); a Problems row shows each Problem's own reason, so T-04 ends with the attention list; T-09 leaves cards and tiles for the column tooltip (B-6) |
| 0017 §4, AC-012 (*Needs attention* rows) | The rows of Now, Up next and Problems carry that next step and Copy (O-5) |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024 (test audits) | Also except the tests 0018 AC-030 lists against a criterion this table voids |
| 0013 AC-003 control list; AC-017 screenshot list | Figures, rows, "+ n more", Problems and Activity headings, Done toggle, filter chip; "Overview" and "Board" for the old names, plus both at 640 px (AC-031) |

## 6. Business rules

### 6.1 Overview (R-06, K-C, PD-062)

- **O-1 Order.** Now · Up next · Problems · figures line · Activity. No header line, tile, distribution bar, rule text or visible progress. 0016's header facts move: version and "Updated" time (T-02) into the tooltip of the panel's project name (F-1); the problem count (T-01) gives way to the Problems heading (O-4).
- **O-2 Now.** Every entry in Active, Review or Blocked; order Blocked, Review, Active, then number ascending, then path. No cap.
- **O-3 Up next.** Ready entries, then Backlog entries, each by number then path; at most three rows. While more exist, "+ n more" (n = the rest) asks for Board with the named set "Up next" holding the stems of every Up next entry. Up next is what to pick up next; it holds Backlog too because the Overview has no Backlog section, while the Up next group of 0020's tree holds Ready only beside its own Backlog group (0020 §4.1).
  *Amended by 0022 (PD-069): O-3 — the tree group of Ready entries is named `Ready` (0022 §4.2); the section shows "Ready first, then backlog" after its heading while it lists a row (0022 X-07).*
- **O-4 Problems.** One spec row per entry with a finding of 0016's tier *Problem*, by number then path, then one line per *Problem* finding tied to no entry: its place and text, plain text, no control, no Copy (guideline 2). Review alone is no problem. The heading "Problems (n)", n = spec rows + those lines (its rows, not T-01's findings), asks for Board with the named set "Problems" (stems of the spec rows). Nothing to list → no section.
  *Amended by 0022 (PD-069): O-4 — place and text: each Problem shows as its sentence (0022 §6), the reason is the tooltip; the row cuts nothing (0022 §4.1, §4.5).*
- **O-5 Spec row.** One line: number, title, state text (the state name; Backlog: 0016's first need (T-11), else `Backlog`; Problems row: each Problem's own reason as the detail shows it, joined by ` · `), 0016's warning icon with T-05 where a Problem applies, then 0017's "Next", short form and Copy (0017 AC-012). Above a panel width of 720 px title and state text are cut by an ellipsis, each with its full text as tooltip; the step and Copy are never cut. At 720 px or less the row takes two lines instead and cuts nothing: line 1 number and title (the title may wrap), line 2 state text, the warning icon, 0017's "Next" with the short form and Copy (PD-065). The step's second line is not shown on the row; 0017's step tooltip carries the full line(s). Activating the row outside Copy sends 0006 AC-014's request — a switch to Spec Explorer until 0019 retargets it (named deviation from guideline 8).
  *Amended by 0019 (PD-058): O-5 — activating the row outside Copy selects its spec in place and shows the side panel (0019 AC-001); Copy selects nothing.*
  *Amended by 0021 (PD-069): O-5 — the row shows the step short form of 0021 §6.3 and "Copy prompt"; the first Now row also carries the coach line and `?` of 0021 §6.5, §6.6, which are no second step line; their place in the row is 0022's.*
  *Amended by 0022 (PD-069): O-5 — the state shows as its icon (0022 §4.8) with its name visible only on one line; a Problems row lists sentences, not reasons; rows follow the list's own width, one line above 686 px, two from 420 px, three below (0022 §4.1), not a panel width of 720 px.*
- **O-6 Figures line.** "Total n", then "State n" for Backlog, Ready, Active, Review, Done, Blocked, zeros included, each a control sending 0006 BR-08's request. Tooltip and accessible description: Done "of which Deprecated: n" while n > 0; the progress text of §7 (BR-04's rule) on the line and on "Total n", so Tab reaches it.
- **O-7 Activity.** 0006 BR-07's entries, collapsed whenever the panel is opened (created), open or closed kept while it stays open, also when hidden and shown again (as 0007 AC-023); no section without entries; while the status history is not available, a heading "Activity" with the reason and no toggle.
- **O-8 Empty.** Zero specs: "No specs yet. Start with /sdd-specify" with Copy in place of Now, Up next and the figures line; Problems (O-4) and Activity (O-7) as usual. Now empty: "Nothing in progress." Up next empty: "Nothing up next. Start the next spec with /sdd-specify" with Copy. Both Copy put `/sdd-specify` on the clipboard with 0016's feedback.
  *Amended by 0021 (PD-069): O-8 — the Copy reads "Copy prompt".*
  *Amended by 0022 (PD-069): O-8 — the Copy of "Nothing up next …" is an icon button (0022 §4.4); the zero-spec Copy stays primary (0022 AC-011).*

### 6.2 Board (R-10, K-D)

- **B-1 Narrow column.** The six columns stay in board order. A column **shows no card** when no entry has its state, a filter hides all its cards, or it is Done and collapsed; it is then a 32 px strip with icon, vertical name and count (the cards it holds: 0, or Done's cards while collapsed), without card list or hint. The number a filter hides goes into the strip's tooltip and accessible name (§7), never into the count (PD-065).
  *Amended by 0022 (PD-069): B-1 — a narrow strip that stands for a spec with a Problem also shows the warning icon under its count (0022 §4.3, X-06).*
- **B-2 Widths.** A column that shows cards is 200–360 px wide, sharing the free width equally; gap 8 px; horizontal scrolling when columns at 200 px do not fit; sticky headers; no other layout at 640 px. 2 wide + 4 narrow need 568 px + 32 px padding ≤ 640; 5 wide + 1 narrow need 1,072 + 32 ≤ 1,240.
- **B-3 Done.** Collapsed until the developer expands it; the toggle sits in Done's header, offered only while Done holds a card; the choice is remembered per workspace. While a filter is set, Done behaves like every column (B-1) without toggle; after "Clear filters" the remembered choice applies again.
- **B-4 Filter.** No checkbox and no filter control. A filter arrives only with a navigation request (state or named set, 0007 AC-022) and shows as one chip "Filter: label" with "Clear filters"; label = the set's label or the state names joined by ", ". 0007 AC-023 holds.
- **B-5 Card.** Rows in order: (1) number and title, clamped to two lines; (1a) the project-relative path, only for a duplicated stem; (2) 0016's warning icon with T-05; the state part — Backlog: 0016's first need (T-11); Blocked: each S-BLOCKED condition (0007 §6.1); a Deprecated spec: "Deprecated"; else a steps progress bar with "Steps d/t" and "Criteria d/t", each left out while not available; the date of §6.3, right-aligned, secondary colour; row 2 is absent without parts; (3) 0017's next-step line. Card tooltip: number, full title, then the description (PD-043) or "No summary". The card's accessible name ends with its state name, so the state stays readable without the chip (0005 AC-023).
- **B-6 Column header.** Icon, name, count. Ready, Review and Blocked carry as tooltip 0016's sentence (T-09) and its rule text (T-08), joined by ` · `; no card shows either. A narrow strip's tooltip is its §7 text, for these three followed by ` · ` and that tooltip; its accessible name is the §7 text alone.
  *Amended by 0022 (PD-069): B-6 — a narrow strip's accessible name is its §7 text followed by ` · ` and the problem count where it hides a Problem (0022 X-06); the rule tooltip follows it.*
- **B-7 Keyboard.** 0007 §6.7 as amended by 0017. Left and Right go to the nearest column in that direction that shows a card, skipping narrow ones (collapsed Done included). The Done toggle is a button in DOM order; Enter or Space toggles; focus stays on it. When the focused card stops showing after a live update (its spec moved into collapsed Done), focus moves to the nearest shown card in its column, else in the nearest column; with none, to the Done toggle (guideline 8).

### 6.3 Times (R-14, K-J options 3 and 1)

- **L-1 Value.** FeatherSpec's plan header line `**Last updated:** <date>` (skeleton in `.claude/commands/sdd-plan.md`, refreshed when a stage ends per `.claude/rules/plans.md`; every sample writes `YYYY-MM-DD`) of the plan 0007 §6.2 names, when its value starts with a valid calendar date `YYYY-MM-DD` followed by the end or a space. Otherwise (no plan, no line, placeholder, other text) the newer modification time of spec and plan as a local calendar date.
- **L-2 Shown** as `YYYY-MM-DD` on row 2, with a tooltip naming the source (§7).
- **L-3 Equal values.** While fewer than two different dates exist among all cards before filtering (cards without a date ignored), no card shows a date, the sort offers only Number and Title, and a sort by last change becomes Number.
- **L-4 Sort** by last change: newest date first, ties by stem then path, no date last. Display and sort only, never a state.

### 6.4 Frame and commands (R-15)

- **F-1** The panel header shows the project name once, beside the navigation, with the tooltip "FeatherSpec <version> · <T-02>". Status bar: 0017; tree: 0020.
- **F-2** Navigation: icon and title per area; the current item keeps highlight, 2 px bottom border and `aria-current="page"`; no ▸.
- **F-3** "Refresh" runs project discovery (0001) once, then, while a project is active, the spec repository's re-read once — as the panel action "Retry" does today; the panel keeps its content until the new model arrives (0005 AC-029). As-is: "Rescan Project" re-read specs only and did nothing without a project; "Refresh Project Discovery" ran discovery only, which re-reads no spec when nothing changed. The panel actions "Refresh" (S2, S8, S9) and "Retry" run the same steps and keep showing S4 while they run (0005 §13); the no-project notification's "Refresh" stays 0001's.

| Old ID · title | New ID · title |
| --- | --- |
| `featherspec-studio.openMissionControl` · FeatherSpec Studio: Open Mission Control | `featherspec-studio.openOverview` · FeatherSpec Studio: Open Overview |
| `featherspec-studio.openSpecBoard` · FeatherSpec Studio: Open Spec Board | `featherspec-studio.openBoard` · FeatherSpec Studio: Open Board |
| `featherspec-studio.rescan` · FeatherSpec Studio: Rescan Project; `featherspec-studio.refreshDiscovery` · FeatherSpec Studio: Refresh Project Discovery | `featherspec-studio.refresh` · FeatherSpec Studio: Refresh |
| Area IDs `missionControl`, `specBoard` | `overview`, `board` |

## 7. Visible texts (English, PD-016)

| Where | Old | New |
| --- | --- | --- |
| Navigation, area heading, tree entry; board region label | `Mission Control`; `Spec Board`; `Spec board` | `Overview`; `Board`; `Board` |
| Purpose (areas module) | `See the project at a glance: spec counts, progress, what needs attention and recent activity.` | `See what is in progress, what comes next and what needs fixing.` (Board's unchanged) |
| Overview headings | `Specs`, `Needs attention (<n>)`, `Recent activity` | `Now`, `Up next`, `Problems (<n>)`, `Activity (<n>)`; `Activity` while not available |
| Overview | — | `Nothing in progress.` · `Nothing up next. Start the next spec with /sdd-specify` + `Copy` · `+ <n> more` |
| Zero specs, Overview and Board | `No specs yet. Run /sdd-specify to write the first one.` | `No specs yet. Start with /sdd-specify` + `Copy` |
| Figures | tiles `<STATE>` with count and derived sentence; `Total <n>` | `Total <n>` · `<State> <n>` |
| Done figure tooltip | `of which Deprecated: <n>` (visible on the tile) | `of which Deprecated: <n>` |
| Figures line tooltip | visible `Progress <p> % (<d> of <t>)` + formula; `Progress: not available` | `Progress <p> % (<d> of <t>): Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down`; `Progress: not available` |
| Activity | `Recent activity not available: <reason>` | `Activity not available: <reason>` |
| Removed | `Nothing needs attention.`, `No recent activity.`, `Specs by state`, `<state>: <n> of <total>`, header `<folder> · FeatherSpec <version> · Model updated <time> · <n> project-level diagnostics · <m> specs with diagnostics` | — (header facts per O-1) |
| Panel header tooltip | — | `FeatherSpec <version> · <0016 T-02>`, e.g. `FeatherSpec 1.10.0 · Updated 21:56` |
| Set labels | `Needs attention`; `Diagnostics` (0016: `Problems`) | `Up next`; `Problems` |
| Board filter | legend `State` + six checkboxes; `Named set: <label>` | `Filter: <label>`; `Clear filters` unchanged |
| Narrow column, accessible name and tooltip | hints `No spec in the backlog.` … `No spec is blocked.` | `<State>: no spec`; `<State>: <n> hidden by filter`; `Done: 1 spec, collapsed` · `Done: <n> specs, collapsed` |
| Done toggle | — | accessible name `Show Done` / `Hide Done`, visible `Done` and count |
| Card, row 2 | `Tasks: <d> of <t>`, `Tasks: not available`, `Criteria: <d> of <t> verified`, `Criteria: not available`; progress bar names `Tasks`, `Criteria verified` | `Steps <d>/<t>` · `Criteria <d>/<t>`; bar name `Steps` |
| Card date | `Last change: <YYYY-MM-DD HH:mm>`, `Last change: not available` | `<YYYY-MM-DD>`; tooltip `Last change <date>, from the plan's Last updated line` or `Last change <date>, file modification time` |
| Card | state chip; derived sentence with rule ID; visible description, `No summary` | — (column tooltip; card tooltip `<number> <title>` + description or `No summary`) |
| Commands | `FeatherSpec Studio: Open Mission Control`, `… Open Spec Board`, `… Rescan Project`, `… Refresh Project Discovery` | `FeatherSpec Studio: Open Overview`, `… Open Board`, `… Refresh` |
| Navigation | marker `▸` | — |

*Amended by 0020 (PD-058): §7 "tree entry" — void: the tree has no area entries (0020 AC-016).*

*Amended by 0021 (PD-069): §7 rows with `Copy` ("Nothing up next …", "No specs yet …") — the Copy reads `Copy prompt`.*

*Amended by 0022 (PD-069): §7 row "Narrow column, accessible name and tooltip" — plus ` · <n> problems` (0022 X-06) where the strip hides a Problem.*

## 8. Error cases and edge cases

- Unreadable spec or contradiction in `active/` → a Now row with 0016's marker, and a Problems row.
- Duplicated stem → each entry in its own section or column; the card shows its path (B-5 (1a)).
- A drill-down whose filter matches Done cards → Done wide while the filter is set (B-3).
- Plan line `**Last updated:** <date>`, empty, `2026-13-40` or prose → file date. One spec → no date.
- Discovery fails during Refresh → 0005's panel state, no re-read; no folder open → discovery only.
- Restricted Mode, reader window → same Overview and Board; the Done choice is still remembered.
- Every spec Done, Done collapsed → six strips and no card; the Done toggle is the only Tab stop among the columns.
- The focused card's spec moves into collapsed Done → focus per B-7. A damaged remembered Done value → collapsed.
- Zero specs and a project-level *Problem* (orphan return note) → the zero text and the Problems section (O-8).

## 9. Acceptance criteria

Decided by automated tests (core, component tests in jsdom, stylesheet, manifest and scan tests) unless
marked manual. Fixtures: 0006's and 0007's, `fs170-brownfield-mixed`, one with equal file times.

- **AC-001** The manifest shall contribute the commands of §6.4's right column with those titles and none of the left column; the protocol's area IDs shall be `overview`, `board` and (until 0020) `specExplorer`, and no navigation request shall name `missionControl` or `specBoard`; the navigation, area heading, tree entry labels and purpose texts shall read as §7; a scan of `src` without tests, `package.json`, `README.md`, `docs/release-checklist.md`, `docs/product/design-brief.md` and `.architecture/*.md` shall find neither `Mission Control` nor `Spec Board` in any letter case; `CHANGELOG.md` shall name the renamed areas and commands under the version in preparation.
  *Amended by 0020 (PD-058): AC-001 "(until 0020) `specExplorer`" and "tree entry labels" — void: no such area ID (0020 AC-016) and no area entries in the tree.*
- **AC-002** When the panel opens for the first time in a workspace, or the remembered area is one this version does not know (`missionControl` and `specBoard` included), the system shall show the Overview with no remembered selection (0005 §13).
  *Amended by 0020 (PD-058): AC-002 — for a remembered `specExplorer` the remembered selection stays (0020 AC-017).*
- **AC-003** While the project has a spec, the Overview shall render in DOM order Now, Up next, Problems, the figures line and Activity, Problems only while O-4 lists something and Activity per AC-010, and no header line, tile, distribution bar or visible progress text.
- **AC-004** The Now section shall list exactly the entries in Active, Review or Blocked, in the order of O-2, without a cap.
  > **Given** 0003 Active, 0001 Review, 0004 Blocked, 0002 Review **Then** the rows read 0004, 0001, 0002, 0003.
- **AC-005** The Up next section shall list Ready entries, then Backlog entries, each by number then path, at most three; while more exist it shall show "+ n more", and its activation shall send one request for Board with the named set "Up next" holding the stems of every Up next entry.
  > **Given** two Ready and four Backlog specs **Then** three rows, "+ 3 more", and a set of six stems.
- **AC-006** Each Now, Up next and Problems spec row shall show the parts of O-5, on one line above 720 px, and no visible second line of the step (0017's step tooltip shows the full line(s)); the stylesheet shall keep the row on one line above 720 px with title and state text cut by an ellipsis and the step and Copy uncut, and at 720 px or less (media query `max-width: 720px`) wrap it to two lines, number and title first, then the state text, the step and Copy, with no text cut by an ellipsis; the row shall carry the full title and state text as tooltips. Activating the row outside Copy shall send 0006 AC-014's request; Copy shall send none.
  *Amended by 0019 (PD-058): AC-006 "send 0006 AC-014's request" — the row selects its spec in place (0019 AC-001) and sends no navigation request.*
  *Amended by 0021 (PD-069): AC-006 — the step short form and "Copy prompt" (0021 AC-006, AC-008).*
  *Amended by 0022 (PD-069): AC-006 "on one line above 720 px", "at 720 px or less (media query `max-width: 720px`)" — container rules on the list's width at 686 px and 420 px (0022 AC-001); Problems rows per 0022 AC-003; state per 0022 AC-027.*
- **AC-007** The Problems section shall show exactly the spec rows and lines of O-4 under "Problems (n)" with n their sum, each spec row's state text the reasons of its Problems; a line tied to no entry shall be no control; activating the heading shall send one request for Board with the named set "Problems"; a Review entry without a *Problem* finding shall have no row.
  > **Given** `fs-broken` (0016 §6.1) **Then** "Problems (2)", rows 0002 and 0003, and 0003's row shows the contradiction's reason.
  *Amended by 0022 (PD-069): AC-007 — each Problem shows as its sentence, the reasons are the tooltip (0022 §4.5).*
- **AC-008** The figures line shall show "Total n" and the six "State n" in board order, zeros included, each one control sending 0006 BR-08's request (a 0 included), and the Done figure the tooltip and accessible description "of which Deprecated: n" while n > 0.
- **AC-009** The figures line and its "Total n" control shall carry the progress text of §7 as tooltip, and "Total n" as accessible description; no other element shall show it.
  > **Given** 0006 AC-001's fixture **Then** "Progress 25 % (2 of 8): Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down".
- **AC-010** While Activity has entries, the Overview shall show it collapsed (`aria-expanded="false"`) with the heading "Activity (n)" each time the panel is opened; activating the heading shall show or hide the entries, and the choice shall hold while the panel stays open, also after it was hidden and shown again. While it has no entry it shall show no section; while the status history is not available, the heading "Activity" with "Activity not available: <reason>" and no toggle.
- **AC-011** While the project has no spec, the Overview and the Board shall show "No specs yet. Start with /sdd-specify" and a Copy that copies `/sdd-specify`, and the Overview no Now, Up next or figures line; Problems and Activity per AC-007 and AC-010.
  *Amended by 0021 (PD-069): AC-011 — the Copy reads `Copy prompt` and still copies `/sdd-specify` (0021 AC-008).*
- **AC-012** While Now has no entry it shall show "Nothing in progress."; while Up next has none it shall show "Nothing up next. Start the next spec with /sdd-specify" with a Copy of `/sdd-specify`.
  *Amended by 0021 (PD-069): AC-012 — the Copy reads `Copy prompt` (0021 AC-008).*
  *Amended by 0022 (PD-069): AC-012 — the Copy of "Nothing up next …" is an icon button (0022 §4.4).*
- **AC-013** Every spec row, Copy, figure, "+ n more" and the Problems and Activity headings shall be reachable with Tab, activated with Enter or Space, and show the focus outline of 0013 AC-003.
- **AC-014** Each column that shows no card (B-1) shall render with `data-narrow`, its icon, name and count (0 on a strip a filter emptied; the number hidden is in its tooltip and accessible name), no card list and no hint, and the accessible name of §7; every other column shall render without `data-narrow`.
  > **Given** Review 2, Done 13, the rest empty, no filter, Done collapsed **Then** five narrow columns and one wide.
  *Amended by 0022 (PD-069): AC-014 — a strip that stands for a spec with a Problem also carries the warning icon and the problem count in its name (0022 AC-009).*
- **AC-015** The stylesheet shall give a narrow column a width of 32 px, every other column a minimum of 200 px and a maximum of 360 px, a gap of 8 px, sticky headers and horizontal scrolling; a stylesheet test shall compute from these values and `main`'s padding at most 640 px for 2 wide and 4 narrow columns and at most 1,240 px for 5 wide and 1 narrow.
- **AC-016** While no filter is set, Done shall be collapsed until the developer expands it; its toggle (`aria-expanded`, accessible name "Show Done" or "Hide Done") shall exist only while Done holds a card; the choice shall be the same after the panel was closed and reopened and after a restart of VS Code, and a damaged remembered value shall count as collapsed. While a filter is set, Done shall follow B-1 with no toggle; after "Clear filters" the remembered choice shall apply.
- **AC-017** The board shall offer no checkbox and no filter control of its own; while a navigation request's filter is set, it shall show one chip "Filter: label" per B-4 and "Clear filters".
  > **Given** the Review figure is activated **Then** the chip reads "Filter: Review", Review is wide and the other five columns are narrow.
- **AC-018** Every card shall render the rows of B-5 in that order and no state chip, derived sentence, rule ID, description, "Tasks:", "Criteria:" or "Last change:" text, carry the card tooltip of B-5, and have an accessible name that ends with its state name.
- **AC-019** Row 2 shall hold the parts of B-5 for the card's state.
  > **Given** an Active spec with 3 of 7 steps and no traceability table **Then** row 2 reads "Steps 3/7" with a progress bar named "Steps" and no criteria part. **Given** a Deprecated Done spec **Then** "Deprecated".
- **AC-020** The Ready, Review and Blocked column headers, and no other, shall carry the tooltip of B-6, a narrow strip after its §7 text.
  > **Given** the Review column **Then** its tooltip reads "Plan done, waiting for review · Derived from the files · rule S-REVIEW"; narrow and empty, "Review: no spec · Plan done, waiting for review · Derived from the files · rule S-REVIEW".
  *Amended by 0022 (PD-069): AC-020 — a narrow strip's tooltip is its §7 text, the problem count where it applies (0022 X-06), then the rule tooltip.*
- **AC-021** The card date shall follow L-1 and L-2.
  > **Given** a plan with `**Last updated:** 2026-11-10` and both files changed 2026-11-17 **Then** "2026-11-10" with the tooltip "Last change 2026-11-10, from the plan's Last updated line". **Given** the plan says `<date>` **Then** "2026-11-17", "file modification time".
- **AC-022** While L-3's condition holds, no card shall show a date, the sort control shall offer only "Number" and "Title A–Z", and a sort by last change shall become Number.
  > **Given** the fixture with equal file times and no valid plan date **Then** no date and two sort options.
- **AC-023** Sorting by last change shall order by L-4; Number (default) and Title A–Z shall stay as 0007 AC-013.
- **AC-024** Left and Right shall move focus to the nearest column in that direction that shows a card, skipping narrow columns; Up, Down and Enter shall stay as 0007 AC-017 amended by 0017; the Done toggle, the chip's "Clear filters" and the sort control shall be reachable with Tab and operable with Enter or Space; after a toggle the focus shall stay on it. When the focused card stops showing, focus shall move as B-7 says.
  > **Given** focus on the only Review card, Done collapsed, no other card shown **When** its spec moves to `done/` **Then** the Done toggle has the focus.
- **AC-025** The panel shall show the active project's name exactly once, beside the navigation, with the tooltip of F-1.
  > **Given** a project folder `alpha-project` whose specs do not name it **Then** the panel's text contains `alpha-project` once.
- **AC-026** The navigation shall render no `▸` and no `[data-marker]`; the current item shall have `aria-current="page"`, and the stylesheet shall give it a 2 px bottom border and, in High Contrast, the active contrast border (0005 AC-031).
- **AC-027** When "FeatherSpec Studio: Refresh" runs while a project is active, the system shall run discovery once and then the spec repository's re-read once; while none is active, discovery only; the panel shall keep its content until the new model arrives. The panel actions "Refresh" and "Retry" shall run the same steps and show S4 while they run.
- **AC-028** The Overview, the Board, the Done toggle and Refresh shall create, modify or delete no file in any workspace folder (0005 AC-025, 0007 AC-016); the Done choice shall be kept per workspace outside every workspace folder.
- **AC-029** Every text in §7's New column shall live in a text module and be asserted literally by a test; a scan of `src` without tests shall find none of the texts of §7's Old column that have no New counterpart, and no `▸` except the selected-row marker of the Spec Explorer list in `src/webview/areas/SpecExplorer.tsx` (0005 AC-023), which stays until 0020 removes that area (PD-065).
  *Amended by 0020 (PD-058): AC-029 "no `▸` except the selected-row marker … until 0020 removes that area" (PD-065 (3)) — void with the list: no `▸` is left in `src` (0020 AC-018).*
- **AC-030** Every test at the commit before 0018's first change that decides a criterion §5 does not void — 0006's drill-downs (AC-012, AC-014, AC-029) and the host smoke tests of 0001 and 0005 included, with the new IDs — shall exist at the head and pass; the plan shall list every title missing at the head, a renamed one included, with the criterion this spec voids or the head title that replaces it, from a script comparing both commits; `npm run test:unit` and `npm test` shall pass on Windows and in CI.
  *Amended by 0019 (PD-058): AC-030 — also excepts the tests 0019 AC-023 lists against a criterion 0019 §5 voids or replaces.*
  *Amended by 0020 (PD-058): AC-030 — also except the tests 0020 AC-021 lists against a criterion 0020 §5 voids.*
  *Amended by 0021 (PD-069): AC-030 (test audit) — also except the tests 0021 AC-020 lists against a statement 0021 §5 replaces.*
  *Amended by 0022 (PD-069): AC-030 — also excepts the tests 0022 AC-017 lists against a statement 0022 §5 changes.*
- **AC-031** *(manual, Gregor or his delegate)* Preview-harness screenshots of Overview and Board for this repository and `fs170-brownfield-mixed`, Dark, Light and High Contrast, panel width 1240 px and 640 px, height 900 px: Now is the first section; rows keep one line at 1240 px and take two lines at 640 px with the state text readable (AC-006); with no spec selected, every column that shows a card is visible without horizontal scrolling at 1240 px, and at 640 px where at most two do; a wide column shows at least six cards when it holds them (R-10); strips, toggle and focus are legible. Verdict in the plan; the real VS Code window is a release-checklist item.
  *Amended by 0019 (PD-058): AC-031 — "visible without horizontal scrolling" holds "with no spec selected"; with the side panel the board scrolls (0019 §9).*

## 10. Technical notes for developers or AI agents

As-is (read 2026-11-17, before 0016/0017; re-check in `/sdd-plan`):
- Mission Control: projection `src/core/missionControl/missionControlView.ts` (`specFigures.ts`, `attention.ts`, `activity.ts`), contract `src/shared/protocol/missionControl.ts` (exact-key guards), webview `src/webview/areas/missionControl/*` (`Header`, `SpecFigures` tiles and bar, `Attention`, `Activity`, `requests.ts` with the sets "Needs attention" and "Diagnostics", `texts.ts`). Areas and default: `src/shared/protocol/areas.ts`; tree icons `AREA_ICONS` (`treeModel.ts`); commands `src/adapters/vscode/commands.ts`, `package.json`.
- Board: `Column.tsx` (hint, hidden count), `Card.tsx`, `FilterBar.tsx`; `focusModel.ts` `moveFocus` already skips columns whose shown-card list is empty (give collapsed Done an empty list); `.columns` uses `minmax(240px, 1fr)`, gap 8 px; `main` padding 16 px.
- Times: `cards.ts` `lastChange(spec.modifiedMs, plan.modifiedMs)`, sort in `filters.ts`; `parsePlan.ts` already returns `lastUpdated` (`HeaderField`). Compute day and source in the host (same zone as the webview); decide L-3 in the board service, which sees all cards.
- Done memory: workspace storage like `src/adapters/vscode/uiMemory.ts`, not `boardUiState.ts` (reset on panel close); Activity's open state host-side like `boardUiState.ts` (no `retainContextWhenHidden`). `fallbackFocus` in `focusModel.ts` already moves a lost focus to the nearest shown card.
- Refresh: `extension.ts` registers `rescan` (`ShellService.rescan`) and `refreshDiscovery` (`controller.refresh`); `runAction('retry')` in `shellService.ts` does both in order, `guarded` (S4); the test "Refresh runs discovery only, with S4 while it runs" changes (AC-030). Frame: ▸ in `Navigation.tsx` (`data-marker`); name in `App.tsx` and `Header.tsx`; F-1's version and time come from the Mission Control view today (0015 AC-017's rule).
- Remembered state: `parseUiMemory` drops the whole memory for an unknown area (AC-002); 0020 maps `specExplorer` before that check. Area IDs, the `missionControl` message and its view change the protocol: the version moves (0005 S6), as in 0019. Host tests naming old IDs: `shell.smoke` (`openMissionControl`, `openSpecBoard`, `rescan`, `refreshDiscovery`, area `specBoard`), `discovery.smoke` (`refreshDiscovery`), `missionControl.smoke` (`api.missionControl()`).
- Suggested (plan decides): rename the `missionControl` folders, contract and host test API to `overview`, then `/sdd-architecture-update`; `OverviewView { now, upNext: { rows, more, stems }, problems, figures, activity }` with 0017's next-step view per row. Tests carry AC IDs; gates per `techContext.md`.

## 11. Assumptions

| ID | What we assume | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | 0016 and 0017 are implemented first; their tier, texts, marker and next-step row exist | Split order 0016 → 0020; each plan is written against the code of its time | The plan re-aligns references (OP-001) |
| A-002 | (proxy) Now has no cap, order Blocked → Review → Active | K-C; FeatherSpec works on few specs at once | A long Now pushes Up next down |
| A-003 | (proxy) No header line; version and time in the project name's tooltip | PD-062 lists no header; 03 §5.1 (6) | Version visible only on hover (and in 0017's status bar tooltip) |
| A-004 | (proxy) All six state figures, zeros included, each a control (0006 OP-9) | They mirror the board's six columns; K-C keeps the drill-down logic; a 0 opens the board with the chip and "Clear filters", no dead end (guideline 2) | One zero more in the line |
| A-005 | (proxy) Activity's open state lasts while the panel is open; Done is remembered per workspace | PD-062 "Activity collapsed"; K-D asks to remember Done's choice, nothing for Activity | Activity reopens collapsed each session |
| A-006 | (proxy) Strip 32 px; wide columns 200–360 px | R-10; B-2's arithmetic | Card text wraps more at 200 px |
| A-007 | (proxy) The state filter stays as a request-only filter shown as a chip | Keeps 0006 AC-012's drill-down; with B-1 it shows only the drilled column wide | None known |
| A-008 | (proxy) Day precision for both sources; the plan date wins over a newer file time | K-J recommends option 3 with fallback 1 | A spec edit without a plan update is not reflected |
| A-009 | (proxy) L-3 counts all cards before filtering | The sort control should not change with a filter | A filtered view may show equal dates |
| A-010 | (proxy) The card leaves out a figure that is not available; the detail keeps "not available" | Guideline 6 and the three-row card; P8 holds in the detail | A reader of the card misses that criteria are unknown |
| A-011 | (proxy) One Refresh does both discovery and re-read | Users cannot tell the two apart (02 §3.11); "Retry" already does both | A re-read costs a second on a 200-spec project |
| A-012 | "Spec Board" becomes "Board" with ID `board` | PD-058 names the two tabs "Overview, Board" and publishes nothing, so IDs change without migration | Only names change |
| A-013 | (proxy) Problems also lists *Problem* findings tied to no spec | Guideline 3: a problem shows wherever it applies | Such findings show only in the board banner |

## 12. Open points

- OP-001: References to 0016 (T-01, T-02, T-05, T-08, T-09, T-11, Copy feedback) and 0017 (AC-012,
  short form) match their drafts of 2026-11-17 22:39–22:49; T-04 ends with the attention list (§5).
  **Resolved by `/sdd-clarify` 2026-11-17**; the plan re-aligns them to the implemented code (A-001).
- OP-002: Gregor confirms the proxies A-002…A-011, A-013 (one PD entry suggested).
- OP-003: R-06's 5-second test and the hands-on on `tip-splitter` validate, they are not criteria.
- OP-004: `/sdd-clarify` 2026-11-17: 39 findings, 38 resolved in one pass at Gregor's standing request,
  none asked, one handed to the orchestrator (the label "Up next" also names 0020's Ready-only tree
  group); the list is kept by the orchestrator (`0018-findings.md`). Readings made; say so if one is
  wrong: (a) a Problems row shows each finding's own reason, not T-04's word; (b) 640 px holds without
  scrolling only up to two wide columns (B-2); (c) an unknown remembered area drops the selection
  (0005 §13); (d) project-level Problem lines are plain text; (e) the narrow strip's tooltip joins
  §7's text and B-6's; (f) the command Refresh keeps the content, the panel actions show S4; (g) a
  lost card focus goes to the nearest shown card, else the Done toggle; (h) the card's accessible
  name carries its state; (i) a row's step second line sits in 0017's tooltip (0017 owns it).

## 13. Definition of Ready / Done

Ready: proxies recorded, 0016 and 0017 implemented, `/sdd-clarify` passed (OP-004). Done: AC-001…AC-030 pass with evidence, AC-031 recorded, §5 applied, README, CHANGELOG, release checklist, design brief and architecture docs updated, nothing out of scope built.

## 14. Recommended next steps

`/sdd-plan` after 0017 is implemented, against the code of that time.
