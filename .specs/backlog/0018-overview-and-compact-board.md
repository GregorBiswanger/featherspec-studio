# Overview and a Compact Board

**Status:** Draft
**Plan:** _none yet_

Basis: UX audit 2026-11-17 (`docs/ux-audit/`) R-06, R-10, R-14, R-15 (05); K-C, K-D, K-J (04); 03 §5–§7;
findings 02 §3.3–§3.5, §3.11 (screenshots 03, 04, 20, 22, 28, 29). Decisions PD-058, PD-062, PD-016,
PD-036, PD-040, PD-047; guidelines 1, 6, 7, 8, 9, 10 (`.claude/rules/ux-guidelines.md`). Builds on
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
Goal: "what now?" answered at a glance; on this repository every column that holds a card visible
without horizontal scrolling at 1240 px and 640 px; no date that misleads (AC-031).

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
- The amendments of §5; README, `docs/release-checklist.md`, design brief, architecture docs.

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

| Spec · statement | Amendment |
| --- | --- |
| 0001 §9 command "Refresh Project Discovery" | Replaced by "FeatherSpec Studio: Refresh" (§6.4); AC-011, AC-012 and AC-015 (the notification's "Refresh") stay |
| 0005 §1, §5, BR-02, §9, AC-003 (entry labels), AC-004, AC-005, AC-009, AC-028; 0015 §8 purpose | Areas "Overview" (`overview`, default) and "Board" (`board`), commands and purposes of §6.4 and §7; a remembered area this version does not know shows Overview (BR-02) |
| 0005 §9 "marks the current area in text"; PD-054 "the marker of the current area stays" | The current item is marked by its highlight with the 2 px bottom border and `aria-current="page"`; no ▸ (AC-026) |
| 0005 §9 "shows the active project's name" | Once, in the panel header, with the tooltip of §6.4; no area repeats it (AC-025) |
| 0005 §4, §9 and OP-009 "Rescan Project"; AC-029 | "FeatherSpec Studio: Refresh" (AC-027); AC-029's "keeps its content until the new model arrives" holds |
| 0006 §1, §4, §5 step 3, §9 layout, BR-01, BR-02 (Deprecated beside Done, derived label), BR-08 rows *Needs attention*, attention row, header diagnostics count; 0013 §3.2 | Overview §6.1. BR-04's rule stays, shown in the tooltip (AC-009); BR-07, BR-09 stay |
| 0006 AC-008, AC-009, AC-012 (*Needs attention* part), AC-014 (attention row), AC-017, AC-020, AC-022, AC-025, AC-028 | AC-008, AC-009 → AC-004, AC-007 (the tier is 0016's); AC-012: Total and state counts unchanged, the *Needs attention* part → AC-005, AC-007; AC-014: Now, Up next and Problems rows (AC-006); AC-017, AC-025 void; AC-020, AC-028 → AC-011; AC-022 → AC-013 |
| 0006 AC-001–AC-004, AC-010, AC-015, AC-016, AC-018, AC-019, AC-021, AC-023, AC-024, AC-029; PD-046 | Hold for the Overview; *Recent activity* is its Activity section |
| 0007 §1, §6.1, AC-003, AC-004 (card), AC-024 (card part); 0013 §3.3, AC-009 (as left by 0017) | Three-row card §6.2 B-5: no state chip, derived marker or description on the card |
| 0007 AC-006 (card part) | The card leaves out a figure that is not available; the detail keeps "not available" |
| 0007 §6.2 last change, AC-013, AC-025; PD-043 last sentence | §6.3 |
| 0007 §6.5, FR-06, AC-012, AC-022; PD-041 | No filter control; a navigation request's filter shows as one chip (§6.2 B-4); "N hidden by filter" stays on columns that show cards |
| 0007 §6.7, AC-017 | Left and Right skip narrow columns; the Done toggle joins the keyboard path; the checkboxes leave it (AC-024) |
| 0007 §6.8, AC-021 | No column hint; narrow strip (AC-014); zero specs per AC-011 |
| 0013 AC-004–AC-007 | Void (no tiles, bar, header, attention panel) |
| 0013 AC-008 | Widths of §6.2 B-2 (AC-015) |
| 0016 §6.2 row "Mission Control header", AC-006 (attention row), AC-008, T-01, T-02 | No header: T-01's count is the Problems heading, its request the heading's (AC-007); T-02 goes into the project name's tooltip (AC-025); the reason T-04 shows on the Problems row |
| 0017 §4, AC-012 (*Needs attention* rows) | The rows of Now, Up next and Problems carry that next step and Copy (O-5) |
| 0013 AC-003 control list; AC-017 screenshot list | Figures, rows, "+ n more", Problems and Activity headings, Done toggle, filter chip; "Overview" and "Board" for the old names, plus both at 640 px (AC-031) |

## 6. Business rules

### 6.1 Overview (R-06, K-C, PD-062)

- **O-1 Order.** Now · Up next · Problems · figures line · Activity. No header line, tile, distribution bar, rule text or visible progress. 0016's header facts move: version and "Updated" time (T-02) into the tooltip of the panel's project name (F-1), the problem count (T-01) into the Problems heading.
- **O-2 Now.** Every entry in Active, Review or Blocked; order Blocked, Review, Active, then number ascending, then path. No cap.
- **O-3 Up next.** Ready entries, then Backlog entries, each by number then path; at most three rows. While more exist, "+ n more" (n = the rest) asks for Board with the named set "Up next" holding the stems of every Up next entry.
- **O-4 Problems.** One row per entry with a finding of 0016's tier *Problem*, by number then path, and one row per *Problem* finding tied to no entry (its place and text, no Copy). Review alone is no problem. The heading "Problems (n)" asks for Board with the named set "Problems" (stems of the entry rows). No row → no section.
- **O-5 Row.** One line: number, title (ellipsis, full title as tooltip), state text (the state name; Backlog: 0016's first need, T-11; Problems row: the reason of each Problem), 0016's warning icon with T-05 where a Problem applies, then 0017's "Next", short form and Copy (0017 AC-012). The step's second line shows in the detail only. Activating the row outside Copy sends 0006 AC-014's request (0019 retargets it).
- **O-6 Figures line.** "Total n", then "State n" for Backlog, Ready, Active, Review, Done, Blocked, zeros included, each a control sending 0006 BR-08's request. Tooltips: Done "of which Deprecated: n" while n > 0; the line itself the progress text of §7 (BR-04's rule).
- **O-7 Activity.** 0006 BR-07's entries, collapsed each time the panel opens, open or closed kept while the panel stays open; no section without entries; while the status history is not available, a section "Activity" holding the reason.
- **O-8 Empty.** Zero specs: "No specs yet. Start with /sdd-specify" with Copy in place of every section but Activity. Now empty: "Nothing in progress." Up next empty: "Nothing up next. Start the next spec with /sdd-specify" with Copy. Both Copy put `/sdd-specify` on the clipboard with 0016's feedback.

### 6.2 Board (R-10, K-D)

- **B-1 Narrow column.** The six columns stay in board order. A column **shows no card** when no entry has its state, a filter hides all its cards, or it is Done and collapsed; it is then a 32 px strip with icon, vertical name and count (0, or Done's cards while collapsed), without card list or hint.
- **B-2 Widths.** A column that shows cards is 200–360 px wide, sharing the free width equally; gap 8 px; horizontal scrolling when columns at 200 px do not fit; sticky headers; no other layout at 640 px. 2 wide + 4 narrow need 568 px + 32 px padding ≤ 640; 5 wide + 1 narrow need 1,072 + 32 ≤ 1,240.
- **B-3 Done.** Collapsed until the developer expands it; the toggle sits in Done's header, offered only while Done holds a card; the choice is remembered per workspace. While a filter is set, Done behaves like every column (B-1) without toggle; after "Clear filters" the remembered choice applies again.
- **B-4 Filter.** No checkbox and no filter control. A filter arrives only with a navigation request (state or named set, 0007 AC-022) and shows as one chip "Filter: label" with "Clear filters"; label = the set's label or the state names joined by ", ". 0007 AC-023 holds.
- **B-5 Card.** Rows in order: (1) number and title, clamped to two lines; (1a) the project-relative path, only for a duplicated stem; (2) 0016's warning icon with T-05; the state part — Backlog: 0016's first need (T-11); Blocked: each S-BLOCKED condition (0007 §6.1); Done and Deprecated: "Deprecated"; else a steps progress bar with "Steps d/t" and "Criteria d/t", each left out while not available; the date of §6.3, right-aligned, secondary colour; row 2 is absent without parts; (3) 0017's next-step line. Card tooltip: number, full title, then the description (PD-043) or "No summary".
- **B-6 Column header.** Icon, name, count. Ready, Review and Blocked carry as tooltip 0016's sentence (T-09) and its rule text (T-08), joined by ` · `; no card shows either.
- **B-7 Keyboard.** 0007 §6.7 as amended by 0017. Left and Right go to the nearest column in that direction that shows a card, skipping narrow ones (collapsed Done included). The Done toggle is a button in DOM order; Enter or Space toggles; focus stays on it.

### 6.3 Times (R-14, K-J options 3 and 1)

- **L-1 Value.** FeatherSpec's plan header line `**Last updated:** <date>` (skeleton in `.claude/commands/sdd-plan.md`, refreshed when a stage ends per `.claude/rules/plans.md`; every sample writes `YYYY-MM-DD`) of the plan 0007 §6.2 names, when its value starts with a valid calendar date `YYYY-MM-DD` followed by the end or a space. Otherwise (no plan, no line, placeholder, other text) the newer modification time of spec and plan as a local calendar date.
- **L-2 Shown** as `YYYY-MM-DD` on row 2, with a tooltip naming the source (§7).
- **L-3 Equal values.** While fewer than two different dates exist among all cards before filtering (cards without a date ignored), no card shows a date, the sort offers only Number and Title, and a sort by last change becomes Number.
- **L-4 Sort** by last change: newest date first, ties by stem then path, no date last. Display and sort only, never a state.

### 6.4 Frame and commands (R-15)

- **F-1** The panel header shows the project name once, beside the navigation, with the tooltip "FeatherSpec <version> · <T-02>". Status bar: 0017; tree: 0020.
- **F-2** Navigation: icon and title per area; the current item keeps highlight, 2 px bottom border and `aria-current="page"`; no ▸.
- **F-3** "Refresh" runs project discovery (0001) once, then, while a project is active, the spec repository's re-read once — the panel action "Retry" does this today. As-is: "Rescan Project" re-read specs only and did nothing without a project; "Refresh Project Discovery" ran discovery only, which re-reads no spec when nothing changed. The panel action "Refresh" (S2, S8, S9) runs the same.

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
| Narrow column, accessible name and tooltip | hints `No spec in the backlog.` … `No spec is blocked.` | `<State>: no spec`; `<State>: <n> hidden by filter`; `Done: <n> specs, collapsed` |
| Done toggle | — | accessible name `Show Done` / `Hide Done`, visible `Done` and count |
| Card, row 2 | `Tasks: <d> of <t>`, `Tasks: not available`, `Criteria: <d> of <t> verified`, `Criteria: not available`; progress bar names `Tasks`, `Criteria verified` | `Steps <d>/<t>` · `Criteria <d>/<t>`; bar name `Steps` |
| Card date | `Last change: <YYYY-MM-DD HH:mm>`, `Last change: not available` | `<YYYY-MM-DD>`; tooltip `Last change <date>, from the plan's Last updated line` or `Last change <date>, file modification time` |
| Card | state chip; derived sentence with rule ID; visible description, `No summary` | — (column tooltip; card tooltip `<number> <title>` + description or `No summary`) |
| Commands | `FeatherSpec Studio: Open Mission Control`, `… Open Spec Board`, `… Rescan Project`, `… Refresh Project Discovery` | `FeatherSpec Studio: Open Overview`, `… Open Board`, `… Refresh` |
| Navigation | marker `▸` | — |

## 8. Error cases and edge cases

- Unreadable spec or contradiction in `active/` → a Now row with 0016's marker, and a Problems row.
- Duplicated stem → each entry in its own section or column; the card shows its path (B-5 (1a)).
- A drill-down whose filter matches Done cards → Done wide while the filter is set (B-3).
- Plan line `**Last updated:** <date>`, empty, `2026-13-40` or prose → file date. One spec → no date.
- Discovery fails during Refresh → 0005's panel state, no re-read; no folder open → discovery only.
- Restricted Mode, reader window → same Overview and Board; the Done choice is still remembered.

## 9. Acceptance criteria

Decided by automated tests (core, component tests in jsdom, stylesheet, manifest and scan tests) unless
marked manual. Fixtures: 0006's and 0007's, `fs170-brownfield-mixed`, one with equal file times.

- **AC-001** The manifest shall contribute the commands of §6.4's right column with those titles and none of the left column; the navigation, area heading, tree entry labels and purpose texts shall read as §7; a scan of `src` without tests and of `package.json` shall find neither `Mission Control` nor `Spec Board` in any letter case.
- **AC-002** When the panel opens for the first time in a workspace, or the remembered area is one this version does not know (`missionControl` included), the system shall show the Overview.
- **AC-003** While the project has a spec, the Overview shall render in DOM order Now, Up next, Problems, the figures line and Activity, Problems only while it has a row and Activity per AC-010, and no header line, tile, distribution bar or visible progress text.
- **AC-004** The Now section shall list exactly the entries in Active, Review or Blocked, in the order of O-2, without a cap.
  > **Given** 0003 Active, 0001 Review, 0004 Blocked, 0002 Review **Then** the rows read 0004, 0001, 0002, 0003.
- **AC-005** The Up next section shall list Ready entries, then Backlog entries, each by number then path, at most three; while more exist it shall show "+ n more", and its activation shall send one request for Board with the named set "Up next" holding the stems of every Up next entry.
  > **Given** two Ready and four Backlog specs **Then** three rows, "+ 3 more", and a set of six stems.
- **AC-006** Each Now, Up next and Problems row shall show on one line the parts of O-5 and not the step's second line; the stylesheet shall keep the row on one line with the title cut by an ellipsis, and the row shall carry the full title as tooltip. Activating the row outside Copy shall send 0006 AC-014's request; Copy shall send none.
- **AC-007** The Problems section shall show exactly the rows of O-4 under "Problems (n)"; activating the heading shall send one request for Board with the named set "Problems"; a Review entry without a *Problem* finding shall have no row.
- **AC-008** The figures line shall show "Total n" and the six "State n" in board order, zeros included, each one control sending 0006 BR-08's request (a 0 included), and the Done figure the tooltip "of which Deprecated: n" while n > 0.
- **AC-009** The figures line shall carry the progress text of §7 as tooltip and as accessible description, and no other element shall show it.
  > **Given** 0006 AC-001's fixture **Then** "Progress 25 % (2 of 8): Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down".
- **AC-010** While Activity has entries, the Overview shall show it collapsed (`aria-expanded="false"`) with the heading "Activity (n)" each time the panel opens; activating the heading shall show or hide the entries, and the choice shall hold while the panel stays open. While it has no entry it shall show no section; while the status history is not available, "Activity" with "Activity not available: <reason>".
- **AC-011** While the project has no spec, the Overview and the Board shall show "No specs yet. Start with /sdd-specify" and a Copy that copies `/sdd-specify`, and the Overview no other section but Activity.
- **AC-012** While Now has no entry it shall show "Nothing in progress."; while Up next has none it shall show "Nothing up next. Start the next spec with /sdd-specify" with a Copy of `/sdd-specify`.
- **AC-013** Every row, Copy, figure, "+ n more" and the Problems and Activity headings shall be reachable with Tab, activated with Enter or Space, and show the focus outline of 0013 AC-003.
- **AC-014** Each column that shows no card (B-1) shall render with `data-narrow`, its icon, name and count, no card list and no hint, and the accessible name of §7; every other column shall render without `data-narrow`.
  > **Given** Review 2, Done 13, the rest empty, no filter, Done collapsed **Then** five narrow columns and one wide.
- **AC-015** The stylesheet shall give a narrow column a width of 32 px, every other column a minimum of 200 px and a maximum of 360 px, a gap of 8 px, sticky headers and horizontal scrolling; a stylesheet test shall compute from these values and `main`'s padding at most 640 px for 2 wide and 4 narrow columns and at most 1,240 px for 5 wide and 1 narrow.
- **AC-016** While no filter is set, Done shall be collapsed until the developer expands it; its toggle (`aria-expanded`, accessible name "Show Done" or "Hide Done") shall exist only while Done holds a card; the choice shall be the same after the panel was closed and reopened and after a restart of VS Code. While a filter is set, Done shall follow B-1 with no toggle; after "Clear filters" the remembered choice shall apply.
- **AC-017** The board shall offer no checkbox and no filter control of its own; while a navigation request's filter is set, it shall show one chip "Filter: label" per B-4 and "Clear filters".
  > **Given** the Review figure is activated **Then** the chip reads "Filter: Review", Review is wide and the other five columns are narrow.
- **AC-018** Every card shall render the rows of B-5 in that order and no state chip, derived sentence, rule ID, description, "Tasks:", "Criteria:" or "Last change:" text, and carry the card tooltip of B-5.
- **AC-019** Row 2 shall hold the parts of B-5 for the card's state.
  > **Given** an Active spec with 3 of 7 steps and no traceability table **Then** row 2 reads "Steps 3/7" with a progress bar named "Steps" and no criteria part. **Given** a Deprecated Done spec **Then** "Deprecated".
- **AC-020** The Ready, Review and Blocked column headers, and no other, shall carry the tooltip of B-6.
  > **Given** the Review column **Then** its tooltip reads "Plan done, waiting for review · Derived from the files · rule S-REVIEW".
- **AC-021** The card date shall follow L-1 and L-2.
  > **Given** a plan with `**Last updated:** 2026-11-10` and both files changed 2026-11-17 **Then** "2026-11-10" with the tooltip "Last change 2026-11-10, from the plan's Last updated line". **Given** the plan says `<date>` **Then** "2026-11-17", "file modification time".
- **AC-022** While L-3's condition holds, no card shall show a date, the sort control shall offer only "Number" and "Title A–Z", and a sort by last change shall become Number.
  > **Given** the fixture with equal file times and no valid plan date **Then** no date and two sort options.
- **AC-023** Sorting by last change shall order by L-4; Number (default) and Title A–Z shall stay as 0007 AC-013.
- **AC-024** Left and Right shall move focus to the nearest column in that direction that shows a card, skipping narrow columns; Up, Down and Enter shall stay as 0007 AC-017 amended by 0017; the Done toggle, the chip's "Clear filters" and the sort control shall be reachable with Tab and operable with Enter or Space; after a toggle the focus shall stay on it.
- **AC-025** The panel shall show the active project's name exactly once, beside the navigation, with the tooltip of F-1.
  > **Given** a project folder `alpha-project` whose specs do not name it **Then** the panel's text contains `alpha-project` once.
- **AC-026** The navigation shall render no `▸` and no `[data-marker]`; the current item shall have `aria-current="page"`, and the stylesheet shall give it a 2 px bottom border and, in High Contrast, the active contrast border (0005 AC-031).
- **AC-027** When "FeatherSpec Studio: Refresh" runs while a project is active, the system shall run discovery once and then the spec repository's re-read once; while none is active, discovery only. The panel action "Refresh" shall do the same.
- **AC-028** The Overview, the Board, the Done toggle and Refresh shall create, modify or delete no file in any workspace folder (0005 AC-025, 0007 AC-016); the Done choice shall live in VS Code's workspace storage only.
- **AC-029** Every text in §7's New column shall live in a text module and be asserted literally by a test; a scan of `src` without tests shall find none of the texts of §7's Old column that have no New counterpart, nor `▸` in the navigation.
- **AC-030** Every test title at the commit before 0018's first change that is missing at the head, a renamed one included, shall be listed in the plan with the criterion this spec voids or the head title that replaces it; `npm run test:unit` and `npm test` shall pass on Windows and in CI.
- **AC-031** *(manual, Gregor or his delegate)* Preview-harness screenshots of Overview and Board for this repository and `fs170-brownfield-mixed`, Dark, Light and High Contrast, panel width 1240 px and 640 px: Now is the first section; rows keep one line; every column that shows a card is visible without horizontal scrolling; strips, toggle and focus are legible. Verdict in the plan; the real VS Code window is a release-checklist item.

## 10. Technical notes for developers or AI agents

As-is (read 2026-11-17, before 0016/0017; re-check in `/sdd-plan`):
- Mission Control: projection `src/core/missionControl/missionControlView.ts` (`specFigures.ts`, `attention.ts`, `activity.ts`), contract `src/shared/protocol/missionControl.ts` (exact-key guards), webview `src/webview/areas/missionControl/*` (`Header`, `SpecFigures` tiles and bar, `Attention`, `Activity`, `requests.ts` with the sets "Needs attention" and "Diagnostics", `texts.ts`). Areas and default: `src/shared/protocol/areas.ts`; tree icons `AREA_ICONS` (`treeModel.ts`); commands `src/adapters/vscode/commands.ts`, `package.json`.
- Board: `Column.tsx` (hint, hidden count), `Card.tsx`, `FilterBar.tsx`; `focusModel.ts` `moveFocus` already skips columns whose shown-card list is empty (give collapsed Done an empty list); `.columns` uses `minmax(240px, 1fr)`, gap 8 px; `main` padding 16 px.
- Times: `cards.ts` `lastChange(spec.modifiedMs, plan.modifiedMs)`, sort in `filters.ts`; `parsePlan.ts` already returns `lastUpdated` (`HeaderField`). Compute day and source in the host (same zone as the webview); decide L-3 in the board service, which sees all cards.
- Done memory: workspace storage like `src/adapters/vscode/uiMemory.ts`, not `boardUiState.ts` (reset on panel close).
- Refresh: `extension.ts` registers `rescan` (`ShellService.rescan`) and `refreshDiscovery` (`controller.refresh`); `runAction('retry')` in `shellService.ts` does both in order. Frame: ▸ in `Navigation.tsx` (`data-marker`); name in `App.tsx` and `Header.tsx`.
- Suggested (plan decides): rename the `missionControl` folders, contract and host test API to `overview`, then `/sdd-architecture-update`; `OverviewView { now, upNext: { rows, more, stems }, problems, figures, activity }` with 0017's next-step view per row. Tests carry AC IDs; gates per `techContext.md`.

## 11. Assumptions

| ID | What we assume | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | 0016 and 0017 are implemented first; their tier, texts, marker and next-step row exist | Split order 0016 → 0020; each plan is written against the code of its time | The plan re-aligns references (OP-001) |
| A-002 | (proxy) Now has no cap, order Blocked → Review → Active | K-C; FeatherSpec works on few specs at once | A long Now pushes Up next down |
| A-003 | (proxy) No header line; version and time in the project name's tooltip | PD-062 lists no header; 03 §5.1 (6) | Version visible only on hover (and in 0017's status bar tooltip) |
| A-004 | (proxy) All six state figures, zeros included | They mirror the board's six columns | One zero more in the line |
| A-005 | (proxy) Activity's open state lasts while the panel is open; Done is remembered per workspace | Done was asked to persist; Activity is rarely opened | Activity reopens collapsed each session |
| A-006 | (proxy) Strip 32 px; wide columns 200–360 px | R-10; B-2's arithmetic | Card text wraps more at 200 px |
| A-007 | (proxy) The state filter stays as a request-only filter shown as a chip | Keeps 0006 AC-012's drill-down; with B-1 it shows only the drilled column wide | None known |
| A-008 | (proxy) Day precision for both sources; the plan date wins over a newer file time | K-J recommends option 3 with fallback 1 | A spec edit without a plan update is not reflected |
| A-009 | (proxy) L-3 counts all cards before filtering | The sort control should not change with a filter | A filtered view may show equal dates |
| A-010 | (proxy) The card leaves out a figure that is not available; the detail keeps "not available" | Guideline 6 and the three-row card; P8 holds in the detail | A reader of the card misses that criteria are unknown |
| A-011 | (proxy) One Refresh does both discovery and re-read | Users cannot tell the two apart (02 §3.11); "Retry" already does both | A re-read costs a second on a 200-spec project |
| A-012 | (proxy) "Spec Board" becomes "Board" with ID `board` | 0020 expects two tabs "Overview, Board"; nothing is published (PD-058) | Only names change |
| A-013 | (proxy) Problems also lists *Problem* findings tied to no spec | Guideline 3: a problem shows wherever it applies | Such findings show only in the board banner |

## 12. Open points

- OP-001: References to 0016 (T-01, T-02, T-04, T-05, T-08, T-09, T-11, Copy feedback) and 0017 (AC-012,
  short form) were read from their drafts of 2026-11-17; `/sdd-clarify` re-checks them once those settle.
- OP-002: Gregor confirms the proxies A-002…A-013 (one PD entry suggested).
- OP-003: R-06's 5-second test and the hands-on on `tip-splitter` validate, they are not criteria.

## 13. Definition of Ready / Done

Ready: proxies recorded, 0016 and 0017 implemented, `/sdd-clarify` passed. Done: AC-001…AC-030 pass with evidence, AC-031 recorded, §5 applied, README, release checklist, design brief and architecture docs updated, nothing out of scope built.

## 14. Recommended next steps

`/sdd-clarify` in a fresh session (proxies, references to 0016 and 0017), then `/sdd-plan` after 0017 is implemented.
