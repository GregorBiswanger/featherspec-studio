# Studio Shell & Navigation

**Status:** Implemented
**Plan:** [0005-studio-shell-navigation.2026-11-17.plan.md](../plan-archive/0005-studio-shell-navigation.2026-11-17.plan.md)

*Amended by 0018 (PD-062): §1, §5, BR-02, §9 and the §13 edge "remembered area … cannot be used": the areas are Overview (`overview`, default) and Board (`board`) with the commands and purposes of 0018 §6.4 and §7; a remembered area this version does not know shows the Overview with no selection (0018 AC-001, AC-002). §9 "marks the current area in text" (and PD-054): the current item is marked by its highlight with a 2 px bottom border and `aria-current="page"`, no ▸ (0018 AC-026). §9 "shows the active project's name": once, in the panel header, with the tooltip of 0018 §6.4 (AC-025). §4, §9, §13 *Refresh* action and OP-009 "Rescan Project": "FeatherSpec Studio: Refresh" (0018 F-3, AC-027).*

*Amended by 0018 (PD-062): wherever this spec names Mission Control or the Spec Board as a place, read Overview or Board; the rows of 0018 §5 change behaviour.*

*Amended by 0015 (PD-055/PD-056): every other statement, requirement, criterion, term, assumption or open point of this spec about agent runs, run events, providers, approvals, the Agent Center, the start workflow, the Clear command or specs 0008–0012 is void; a sentence that also says something else keeps that part. The notes below name what changes in meaning or needs a replacement; see [0015](0015-focus-on-visibility.md) §5.*

Handoff reference: FS-005 ([po-handoff.md](../../docs/product/po-handoff.md) §4, §10 FS-005,
§11.1, §13 Usability). Architecture basis: [ADR-001](../../docs/decisions/ADR-001-extension-architecture.md)
§2, §4, §6, §7, §14. Decisions ([product-decisions.md](../../docs/product/product-decisions.md)):
PD-004, PD-008, PD-013, PD-016, PD-018, PD-019, PD-033, PD-036…PD-040, PD-042, PD-047.
Depends on: 0001 (discovery result, active project), 0002 (spec model), 0003 (board state).
Used by: 0006, 0007, 0012 (they fill the areas and ask this shell to navigate, PD-040).

## 1. Summary

*Amended by 0015 (PD-055/PD-056): four areas become three: Mission Control, Spec Board and Spec Explorer, with three per-area commands; Agent Center is gone.*

FeatherSpec Studio gets its frame: an Activity Bar view and commands as the way in, one Studio
panel inside the editor area, and navigation between the four MVP areas: Mission Control, Spec
Board, Spec Explorer and Agent Center. This slice delivers the frame, a placeholder for every
area that a later spec fills, a minimal spec list in Spec Explorer so that a selected spec can be
carried across areas, and the one navigation request through which areas open each other
(PD-040). It owns every panel-level state and its text (PD-036), follows the VS Code theme, and
keeps the panel UI away from local files.
*Amended by 0020 (PD-058): §1 — the view "Specs" is 0020's tree with group counts that follows changes (0020 AC-013); the minimal spec list in Spec Explorer is gone; the panel has two tabs (0018).*

## 2. Goal and problem

Developers need one consistent place to reach the Studio areas, with no hunting for commands and
no lost context when they switch areas. Later specs (0006, 0007, 0012) fill the areas. This slice
makes sure they share one navigation, one selection context and one set of panel states. It is
accepted when Gregor can open the Studio, reach every area, keep a selected spec across areas
and reloads, and understand every panel state, in a Light, a Dark and a High Contrast theme.

## 3. Users and roles

- **Developer** (primary): opens the Studio, navigates, selects specs. One role; the criteria
  call it "the user". All permission questions in this slice come from VS Code Workspace Trust (§11).

## 4. Scope

### In scope

- Ways in: an Activity Bar view with a tree, the command "FeatherSpec Studio: Open", and one
  command per area (FR-005.1).
  *Amended by 0020 (PD-058): §4 "Ways in" — the tree has no project, Open Studio or area entries; Open Studio is the toolbar's Open (0020 §4.1).*
- The command "FeatherSpec Studio: Rescan Project", which re-reads the active project's specs (OP-009).
- One Studio panel in the editor area with navigation to the four areas (FR-005.2, FR-005.3).
- A placeholder in Mission Control, Spec Board and Agent Center that says the area is not available in this version.
- A minimal spec list in Spec Explorer (number, title, board state) to make selection possible.
  *Amended by 0020 (PD-058): §4 "minimal spec list" — void: there is no Spec Explorer list; the tree of 0020 selects the spec.*
- A selection context that is kept across areas, panel close and reopen, and a window reload
  (FR-005.4, PD-039).
- One navigation request for the areas: an area plus an optional target (PD-040).
- The start area: Mission Control the first time, then the area last shown.
- The nine panel-level states (PD-036, PD-037; FR-005.5, §13 Usability).
- Light, Dark and High Contrast themes, including a live theme switch (FR-005.6).
- The panel UI talks to the extension through messages only and has no direct file access (FR-005.7).
- Keyboard operation and text labels that do not rely on colour.

### Out of scope

*Amended by 0015 (PD-055/PD-056): "Agent Center content" is void.*

- Mission Control content (counts, activity, attention list) — because spec 0006 owns it.
- Board columns, cards, drag and drop, filters, and the spec detail — because spec 0007 owns
  them. The detail lives in the Spec Explorer area beside the list (PD-042).
  *Amended by 0020 (PD-058): §4 out of scope "The detail lives in the Spec Explorer area" — void: the detail is the side panel of 0019.*
- Agent Center content (runs, events, approvals) — because spec 0012 owns it.
- In-area states of those areas (empty after filtering, runtime data not available, per-column
  hints) — because PD-036 gives them to 0006, 0007 and 0012.
- Applying a run target or a board filter — because 0012 and 0007 own those areas; this slice
  only carries the target to the placeholder (PD-040).
- Showing the diagnostics of 0002 and 0003 (badge, banner) — because 0007 owns them (its AC-020); not in this slice.
- Per-state counts in the Activity Bar tree — because no spec owns them yet (OP-010); not in this slice.
  *Amended by 0020 (PD-058): §4 out of scope "Per-state counts in the Activity Bar tree" — resolved: the tree shows group counts and a badge (0020 AC-001, AC-009).*
- A sidebar webview, or a separate panel per area — because ADR-001 §2 chose one panel plus a native tree; not in the MVP.
- Any write to FeatherSpec artifacts — because PD-013 keeps Studio read-only; not in the MVP. *Amended by 0014 (PD-049, PD-053): the setup of spec 0014 is the one exception.*
- Telemetry — because nothing in this slice needs it, and the handoff §13 Privacy allows none with spec content without a product decision.
- Selecting several specs at once — because nothing in the MVP needs it; not now.

## 5. Functional flow

*Amended by 0015 (PD-055/PD-056): step 7: navigation targets are a spec or a board filter, no run.*

1. The developer opens the "FeatherSpec Studio" view in the Activity Bar and activates "Open
   Studio", or runs "FeatherSpec Studio: Open".
   *Amended by 0020 (PD-058): §5 step 1 — the developer opens the panel with the toolbar's Open or "FeatherSpec Studio: Open"; no "Open Studio" entry exists (0020 §4.1).*
2. The Studio panel opens in the editor area. If it is already open, it comes to the front. It
   shows Mission Control the first time, afterwards the area last shown.
3. While loading, the panel shows the loading state. If no project is active, it shows the
   panel state that applies, with its actions.
4. The developer switches areas through the navigation, the tree entries or the per-area commands.
   *Amended by 0020 (PD-058): §5 step 4 — through the two tabs or the two per-area commands; the tree has no area entries (0020 AC-016).*
5. In Spec Explorer, the developer selects a spec. It stays selected while other areas are
   shown, after closing and reopening the panel, and after a window reload.
   *Amended by 0020 (PD-058): §5 step 5 — the developer selects a spec in the Specs tree (0020 AC-005); there is no Spec Explorer.*
6. The selection is cleared when another project becomes active, or when the spec's stem is no
   longer in the project. A spec that is gone gets a notice.
7. Later areas open each other only by asking the shell: "show this area", optionally with a
   spec, a run or a board filter.

## 6. Business rules

Terms: an **area** is one of the four; the **current area** is the one the panel shows. The
**panel UI** is the content of the Studio panel; the Activity Bar tree is drawn by VS Code and
is not part of it. A **panel state** is one of S1–S9 (§13); a **board state** is a spec's state
from 0003. **Loading** means: Studio has no discovery result yet, or a project is active and
its first complete model (0002, 0003) has not reached the panel. A later re-read of the same
project is not loading; the panel keeps its content until the new model arrives (0002 AC-022).
A **window reload** is VS Code's reload or restart of the window. **First open**: nothing is
remembered for this workspace.

- **BR-01 One Studio:** there is at most one Studio panel per VS Code window.
- **BR-02 Start area:** "FeatherSpec Studio: Open", the "Open Studio" entry and a restore after
  a window reload show the area last shown, remembered per workspace. With nothing remembered,
  or a remembered value this version cannot use, they show Mission Control. A per-area command
  or an area's tree entry shows the area it names.
  *Amended by 0020 (PD-058): BR-02 — no "Open Studio" entry and no area tree entry; Open Studio is the toolbar's Open (0020 §4.1).*
- **BR-03 Selection (PD-039):** at most one selected spec, in the active project. It is
  identified and remembered by its stem (PD-018), plus its project-relative path while that
  stem is duplicated (PD-019). The number is shown, never used as identity. A move to another
  lifecycle folder keeps the selection. Changing areas by hand never changes it; a navigation
  request with a spec target does (BR-07). It is cleared, without a notice, when another
  project becomes active. It is cleared with the notice "Spec <number> is no longer in the
  project" when a loaded model of the active project no longer contains the stem (file deleted,
  or stem changed: PD-018 "removed + new"). While no model is loaded, the remembered selection
  is kept and not checked, so a project that is lost and returns (0001 AC-010) keeps it.
  *Amended by 0019 (PD-058): BR-03 — the side panel of 0019 §6.1 shows exactly while a spec is selected; closing it clears the selection (0019 AC-003); the rest of BR-03, the notice included, holds.*
- **BR-04 Placeholder:** an area whose content a later spec delivers shows its name, one
  sentence on its purpose, and "Not available in this version of FeatherSpec Studio". It never
  shows sample or invented data (handoff P8). The three purpose sentences are in AC-006.
- **BR-05 State precedence:** the conditions are in §13. When several apply, the panel shows
  exactly one, in this order: S6 reload needed > S1 no folder > S8 remembered project not found > S2 no project >
  S9 incomplete project > S3 several projects > S5 load error > S4 loading.
  S8 comes before S2, S9 and S3 because PD-033 keeps "not found" until the user selects another
  project or the project returns. S7 (Restricted Mode) is a note shown in addition, never in
  place of a state or of the area. S6 ranks first because a panel UI that cannot read the
  extension's messages cannot know any other state (OP-008).
- **BR-06 Read-only:** the Studio changes no file in the workspace (PD-013). *Amended by 0014 (PD-049, PD-053): the setup of spec 0014, started and confirmed by the user, is the one exception; AC-025 is unchanged.*
- **BR-07 Navigation request (PD-040):** the shell offers one request: an area, plus at most
  one target — a spec (stem), a run (ID) or a board filter (its kinds are 0007's, PD-041). Areas ask the shell; they never open
  each other directly. The shell shows the area and hands it the target. A spec target makes
  that spec the selected spec; this is how the board and Mission Control open a spec's detail
  in Spec Explorer (PD-042). A spec target whose stem is not in the project changes neither
  area nor selection and gets the notice of BR-03. A target for an area that is still a
  placeholder ends on the placeholder.
  *Amended by 0019 (PD-058): BR-07 — the sentence "this is how the board and Mission Control open a spec's detail in Spec Explorer (PD-042)" is void: the board and the Overview select a spec in place (0019 AC-001); a spec target keeps its meaning.*

*Amended by 0015 (PD-055/PD-056): a target is a spec or a board filter, no run.*
- **BR-08 Ownership of states (PD-036):** the shell owns every panel state and its text. An
  area owns only its in-area states and repeats no panel state or text.

## 7. Functional requirements

| ID | Requirement | Source | Criteria |
| --- | --- | --- | --- |
| FR-01 | Provide one clear VS Code entry point | FR-005.1 | AC-001, AC-002, AC-003 |
| FR-02 | Make all four MVP areas reachable | FR-005.2 | AC-004, AC-005, AC-006 |
| FR-03 | Show the Studio inside VS Code | FR-005.3 | AC-001 |
| FR-04 | Keep the selection context between areas | FR-005.4 | AC-007, AC-008, AC-009, AC-010 |
| FR-05 | Provide empty, loading and error states | FR-005.5 | AC-011 … AC-018, AC-026, AC-027 |
| FR-06 | Follow the VS Code light, dark and high-contrast themes | FR-005.6 | AC-019, AC-030, AC-031 |
| FR-07 | Route all panel UI communication through the extension | FR-005.7 | AC-020, AC-021 |
| FR-08 | Keyboard operation and no colour-only meaning | §13 Usability | AC-022, AC-023 |
| FR-09 | Offer one navigation request to the areas | PD-040 | AC-028 |
| FR-10 | Show the frame within the time budget | §13 Performance | AC-024 |
| FR-11 | Change no file in the workspace (Amended by 0014 (PD-049, PD-053): exception, the setup of spec 0014) | PD-013 | AC-025 |
| FR-12 | Offer a manual rescan of the project | ADR-001 §9, 0002 OP-008 | AC-029 |

## 8. Data requirements

- **Read (from other specs):** the discovery result per folder with verdict and diagnostics, the
  active project and the remembered project (0001); the spec entries with stem, path, number
  and title (0002); per entry the board state, the *derived* marker and its rule text (0003).
- **Remembered per workspace (UI state only):** the area last shown; the selected spec's stem,
  plus its path while the stem is duplicated. Kept outside every workspace folder. Never domain
  data (ADR-001 §7).
- Nothing sensitive is read, shown or stored.

*Amended by 0016 (PD-059, proxy): the visible text is the sentence of 0016 T-09; the rule ID is in the tooltip (T-08).*

## 9. UI/UX requirements

*Amended by 0015 (PD-055/PD-056): three areas; the tree shows three entries with the icons gauge, board layout and list tree, no robot; Mission Control purpose: "See the project at a glance: spec counts, progress, what needs attention and recent activity."*

UI text is in English (PD-016).

- **Activity Bar view "FeatherSpec Studio":** present in every window (PD-008, ADR-001 §2). Its
  icon is the FeatherSpec logo mark in one colour; every tree entry has its own icon (PD-048).
  The panel's navigation shows the matching icon before each area title, and the panel's editor
  tab shows the logo mark (PD-054).
  While a project is active, a tree shows the project's name, an "Open Studio" entry, and one
  entry each for Mission Control, Spec Board, Spec Explorer and Agent Center. While no project
  is active, the view shows, in place of the entries, the text and actions of the panel state
  that applies among S1–S5, S8 and S9. S6 and S7 appear in the panel only.
  *Amended by 0020 (PD-058): §9 "Activity Bar view" — the view is "Specs": four groups of spec rows, group counts, a badge and a toolbar; no project, Open Studio or area entries (0020 §4).*
- **Commands:** "FeatherSpec Studio: Open", "FeatherSpec Studio: Open Mission Control",
  "… Open Spec Board", "… Open Spec Explorer", "… Open Agent Center", and "FeatherSpec Studio: Rescan Project" (OP-009).
  *Amended by 0020 (PD-058): §9 "Commands" — no "Open Spec Explorer" command; the per-area commands are 0018's "Open Overview" and "Open Board" (0020 AC-016).*
- **Panel:** titled "FeatherSpec Studio". It has a navigation with the four areas, marks the
  current area in text and for screen readers (not by colour alone), and shows the active
  project's name. A panel state takes the place of the area's content; the navigation stays.
- **Spec Explorer (this slice):** a list of the project's spec entries, ordered by number, then
  by path. Each row shows the number, the title ("not available" when the spec has none,
  handoff P8) and the board state as a word; a derived state also carries the *derived* label
  and its rule as 0003 supplies them (PD-004). Rows of a duplicated stem also show their
  project-relative path. Selecting a row makes it the selected spec, which is marked as
  selected in the list. The list follows changes of the model without reopening (PD-047). The
  name stays "Spec Explorer"; 0007 adds the detail beside the list (PD-042).
  *Amended by 0020 (PD-058): §9 "Spec Explorer" — void: the list, the area and the command end; the tree's order and labels are 0020 AC-003 and AC-004.*
- **Placeholders:** BR-04, AC-006.
- **Theme:** colours, fonts and focus outlines come from the current VS Code theme. A theme
  switch takes effect without reopening the panel.
- **States:** §13.

## 10. Interfaces and integrations

- VS Code: Activity Bar view, commands, editor panel, a per-workspace memory for UI state
  (mechanism: §15), Workspace Trust, theme. The Output channel "FeatherSpec Studio" comes from 0001.
- Studio-internal: reads the results of 0001 (including its update notification, the remembered project and a run failure: 0001 AC-024), 0002 and 0003. The panel UI gets them only as
  messages from the extension. Areas of later specs read the selected spec from the shell and
  send it the navigation request (BR-07).
- No network service. *Amended by 0014 (PD-049, PD-053): the one exception is the download of the setup of spec 0014 (its AC-025).*

## 11. Security, permissions and privacy

*Amended by 0015 (PD-055/PD-056): the S7 note reads "This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted workspace." (0014 AC-004's wording).*

- The panel UI gets no direct access to local files or to Node.js. Everything it shows arrives
  as messages from the extension, and everything it asks for goes out as a message (handoff
  §8.2, ADR-001 §4, §6).
- The panel UI loads no content from the internet and runs no code that the extension did not ship.
- In Restricted Mode the panel and the tree work as in a trusted workspace. Actions that later
  start agents are not offered (ADR-001 §14). In this slice, that means only the S7 note. *Amended by 0014 (PD-049, PD-053): also "Set up FeatherSpec" is offered and refuses (spec 0014 AC-004).*
- No telemetry. No spec content in logs.

## 12. Non-functional requirements

- Time budget for the frame: AC-024.
- The navigation stays operable while loading (handoff §13 Performance): AC-014.
- The spec list follows a model change within the PD-047 budget: AC-007.
  *Amended by 0020 (PD-058): §12 spec-list bullet — the tree follows a model change within 500 ms (0020 AC-013).*

## 13. Error cases and edge cases

The panel states (precedence: BR-05). "Remembered", "project" and "incomplete" as in 0001.

| ID | Condition | Text | Actions |
| --- | --- | --- | --- |
| S1 | No folder is open | "Open a folder to use FeatherSpec Studio." | Open Folder |
| S2 | No remembered project; no folder is a project or incomplete | "No FeatherSpec project found in this workspace." | Set up FeatherSpec · Open setup guide · Refresh (Amended by 0014 (PD-049, PD-053)) |
| S3 | Two or more projects; no remembered project | "Several FeatherSpec projects found. Select one to continue." | Select project |
| S4 | Loading (§6) | "Loading project…", with a visible progress indicator | — |
| S5 | A project-level failure (PD-038): discovery fails unexpectedly; the lifecycle folders of `.specs/` cannot be listed; or the panel UI and the extension cannot agree on the message protocol (no valid project snapshot reaches the panel UI) | "The project could not be loaded: <reason>." The reason says which of the three happened | Show output · Retry |
| S6 | The panel UI and the extension speak different versions of the message protocol | "FeatherSpec Studio was updated. Reload to continue." | Reload |
| S7 | Restricted Mode | Note: "This workspace is in Restricted Mode. Agent actions are unavailable." (OP-006) | Manage Workspace Trust |
| S8 | The remembered project is not reported as a project (0001 AC-010) | Names the missing project (PD-037): "FeatherSpec project <name> was not found." | Select project (only while another project is reported) · Refresh |
| S9 | No remembered project; no folder is a project; at least one is incomplete | Names, per incomplete folder, the missing marker from 0001's diagnostics (PD-037): one line "FeatherSpec project incomplete: <folder> has no <marker>." per folder (Amended by 0014 (PD-049, PD-053): for a setup-pending folder the line "FeatherSpec setup not finished: <folder> has files to merge." takes its place) | Set up FeatherSpec · Copy merge prompt (only with a setup-pending folder; first when every folder is setup-pending) · Open setup guide · Refresh (Amended by 0014 (PD-049, PD-053)) |

*Amended by 0016 (PD-059, proxy): S2 adds the sentence of 0016 T-20 after its first line.*

Actions: *Open Folder* opens VS Code's own folder dialog. *Open setup guide* opens the link of
0001 A-005. *Refresh* runs 0001's "Refresh Project Discovery". *Select project* runs 0001's
"Select Project". *Show output* opens the Output channel "FeatherSpec Studio". *Retry* reruns
discovery and a full re-read (PD-038). *Manage Workspace Trust* opens VS Code's own trust
dialog. *Reload* reloads the panel UI, not the VS Code window (OP-008). A second version
mismatch right after that reload shows S5 with the protocol reason.
*Amended by 0014 (PD-049, PD-053): *Set up FeatherSpec* runs the command of spec 0014 AC-002; *Copy merge prompt* is its AC-016.*

Edge cases:

- A single file that is broken or cannot be read is never S5; it stays a diagnostic of that entry (PD-038).
- Another project becomes active while the panel is open → selection cleared (BR-03), the current area stays.
- The active project is lost and returns, or is reported again after an `AGENTS.md` save → the selection stays if its stem is still there (BR-03).
- The selected spec's file is deleted, or its stem changes (renamed or renumbered) → selection cleared with the notice. If this happens while the panel is closed or VS Code is not running, it is found at the next load.
- The selected spec moves to another lifecycle folder → it stays selected (PD-039).
- A per-area command runs while the panel is closed → the panel opens on that area.
- A window reload while the panel is open → the panel comes back by itself (ADR-001 §7) and shows whatever state applies then.
- The remembered area or selection cannot be used (unknown area, damaged value) → Mission Control, no selection.
  *Amended by 0020 (PD-058): §13 edge "remembered area … cannot be used" — a remembered `specExplorer` opens the Overview with the selection kept (0020 AC-017).*
- Workspace Trust is granted while the panel is open → the S7 note disappears without reopening.
- "Retry" and "Refresh" cannot run twice at once: they lead to S4, which has no action.
- Project has zero specs → Spec Explorer shows "This project has no specs yet." (an in-area state, not an error).
  *Amended by 0020 (PD-058): §13 edge "zero specs" — the view shows the text of 0020 §4.4; the tabs' own zero states are 0018's.*

## 14. Acceptance criteria

Handoff IDs in brackets (PD-017). Revised 2026-11-17 at the closing `/sdd-compile` under Gregor's
delegation of 2026-11-17 ("everything must work, be tested with quality gates and TDD"): the
former hand checks are decided by automated tests where a test can decide them; the readability
checks are decided by his delegate on the dated screenshot set; what only a person in a real
VS Code can judge (a live theme switch, a real window reload, the light High Contrast theme) is
"checked by Gregor or his delegate; pre-release checklist item". Everything else is decided by
automated tests.

- **AC-001** When the user runs "FeatherSpec Studio: Open", the system shall show the Studio panel
  in the editor area. [AC-005.1]
- **AC-002** When the user runs "FeatherSpec Studio: Open" while the Studio panel is already open,
  the system shall bring that panel to the front and shall not open a second one (BR-01).
- **AC-003** While a project is active, the system shall show in the Activity Bar view
  "FeatherSpec Studio" the active project's name, an "Open Studio" entry and one entry per
  area, each with an icon of its own (PD-048, added 2026-11-17). Activating "Open Studio" shall
  open the panel on the start area (BR-02); activating an
  area's entry shall open the panel on that area. While no project is active, the view shall
  show, in place of the entries, the text and actions of the panel state that applies among
  S1–S5, S8 and S9.
  *Amended by 0018 (PD-062): the areas are Overview (`overview`, default) and Board (`board`) with the commands and purposes of 0018 §6.4 and §7; a remembered area this version does not know shows the Overview with no selection (0018 AC-001, AC-002).*
  *Amended by 0020 (PD-058): AC-003 — replaced by 0020 AC-001–AC-012; its no-project part stays as 0020 §4.4 says.*
- **AC-004** The system shall show a navigation in the panel that lists Mission Control, Spec
  Board, Spec Explorer and Agent Center. Activating an item shall show that area. [AC-005.2]
  *Amended by 0018 (PD-062): the areas are Overview (`overview`, default) and Board (`board`) with the commands and purposes of 0018 §6.4 and §7; a remembered area this version does not know shows the Overview with no selection (0018 AC-001, AC-002).*
  *Amended by 0020 (PD-058): AC-004 — the navigation has two tabs, Overview and Board (0018, 0020 AC-016).*

*Amended by 0015 (PD-055/PD-056): the navigation lists Mission Control, Spec Board and Spec Explorer.*
- **AC-005** When the user runs one of the four per-area commands, the system shall show the panel
  on that area, opening the panel first if it is closed.
  *Amended by 0018 (PD-062): the areas are Overview (`overview`, default) and Board (`board`) with the commands and purposes of 0018 §6.4 and §7; a remembered area this version does not know shows the Overview with no selection (0018 AC-001, AC-002).*
  *Amended by 0020 (PD-058): AC-005 — two per-area commands, 0018's `openOverview` and `openBoard` (0020 AC-016).*

*Amended by 0015 (PD-055/PD-056): three per-area commands.*
- **AC-006** In this slice the system shall show, for Mission Control, Spec Board and Agent
  Center, the area's name, one sentence on its purpose, and "Not available in this version of
  FeatherSpec Studio", and shall show no sample data (BR-04). The purpose sentences are: Mission
  Control "See the project at a glance: spec counts, agent activity and what needs attention.";
  Spec Board "See every spec as a card in the column of its board state."; Agent Center "Follow
  agent runs, their live events and the approvals they wait for." The criterion ends for an area
  when a later spec delivers it.
  > **Given** a project with three specs **When** the user opens Spec Board **Then** the area shows its name, its purpose sentence and "Not available in this version of FeatherSpec Studio", and shows no cards.
  *Amended by 0020 (PD-058): AC-006 "Spec Explorer" purpose — void: no list (0020 §5).*

*Amended by 0015 (PD-055/PD-056): no Agent Center placeholder or content; the purpose of Mission Control per 0015 §8.*
- **AC-007** The system shall list every spec entry of the active project in Spec Explorer,
  ordered by number and then by path. Each row shall show the number, the title or "not
  available", and the board state as text; for a derived state it shall also show the *derived*
  label and its rule (PD-004). Rows of a duplicated stem shall also show their project-relative
  path. With zero specs, it shall show "This project has no specs yet." When 0002 reports a
  change, the list shall show it within 500 ms after the panel UI receives the notification,
  without being reopened by the user (PD-047).
  *Amended by 0019 (PD-058): AC-007 — stays until 0020; the pane beside the list shows 0019 AC-008's detail.*
  *Amended by 0020 (PD-058): AC-007 — void: there is no list; the tree's order and labels are 0020 AC-003 and AC-004.*
- **AC-008** When the user selects a spec, switches to any other area and returns to Spec
  Explorer, the system shall still show that spec as selected. [AC-005.3]
  *Amended by 0019 (PD-058): AC-008 — stays; the selection also shows the side panel in Overview and Board (0019 AC-002).*
  *Amended by 0020 (PD-058): AC-008 — void: there is no Spec Explorer; selection is made in the tree (0020 AC-005).*
- **AC-009** When the user closes the panel and opens it again with "FeatherSpec Studio: Open" or
  "Open Studio", the system shall show the area last shown and the same selected spec. After a
  window reload, the system shall restore a panel that was open, without user action, on the
  area last shown and with the same selected spec. On the first open in a workspace, it shall
  show Mission Control (BR-02). The restore is decided by the host test of the serializer; a real
  window reload is checked by Gregor or his delegate; pre-release checklist item (revised
  2026-11-17).
  *Amended by 0018 (PD-062): the areas are Overview (`overview`, default) and Board (`board`) with the commands and purposes of 0018 §6.4 and §7; a remembered area this version does not know shows the Overview with no selection (0018 AC-001, AC-002).*
  *Amended by 0020 (PD-058): AC-009 — "or 'Open Studio'" is void (the toolbar's Open is the way in); a remembered `specExplorer` maps to the Overview per 0020 AC-017.*
- **AC-010** When another project becomes active, the system shall clear the selection without
  a notice. If a loaded model of the active project does not contain the selected spec's stem,
  then the system shall clear the selection and show "Spec <number> is no longer in the
  project" (PD-039) as a line in the panel above the area, with a "Dismiss" action; the line stays
  until it is dismissed or the next spec is selected, and if the panel is not shown it appears at
  the panel's next showing; no VS Code notification (OP-007). When the selected spec moves to another
  lifecycle folder, the system shall keep it selected.
  > **Given** spec 0003 is selected **When** its file is deleted outside VS Code **Then** no spec is selected and the notice names 0003.
  > **Given** spec 0003 in `backlog/` is selected **When** its file moves to `active/` **Then** 0003 is still selected.
- **AC-011** While no folder is open, the system shall show state S1 in the panel and in the
  Activity Bar view, with its action as §13 defines it. [AC-005.5]
- **AC-012** While the condition of S2 holds (§13), the system shall show state S2 with its
  actions as §13 defines them. [AC-005.5]
- **AC-013** While the condition of S3 holds (§13), the system shall show state S3, and its
  action shall open the project selection of 0001.
- **AC-014** While loading (§6), the system shall show state S4 in place of the area's content,
  and the navigation shall stay operable: activating an item changes the current area.
- **AC-015** If discovery fails unexpectedly, or the lifecycle folders of `.specs/` cannot be
  listed, or the panel UI and the extension cannot agree on the message protocol, then the
  system shall show state S5 with a reason that says which of the three happened. A single file
  that is broken or cannot be read shall not cause S5 (PD-038). "Retry" shall rerun discovery
  and a full re-read, and "Show output" shall open the "FeatherSpec Studio" Output channel. [AC-005.5]
- **AC-016** If the panel UI and the extension speak different versions of the message
  protocol, then the system shall show state S6. "Reload" shall reload the panel UI, not the VS Code window. If
  the versions still differ right after that reload, then the system shall show S5 with the protocol reason (OP-008).
- **AC-017** While the workspace is in Restricted Mode, the system shall show the S7 note in
  the panel in addition to whatever the panel shows otherwise. When trust is granted, the note
  shall disappear without the panel being reopened by the user.

*Amended by 0016 (PD-059, proxy): S2 adds the sentence of 0016 T-20 after its first line.*

*Amended by 0016 (PD-059, proxy): the *derived* label and its rule read as the sentence of 0016 T-09 with the rule ID in the tooltip (T-08).*

*Amended by 0015 (PD-055/PD-056): the S7 note text per 0015 §8.*
- **AC-018** When several panel states apply at once, the system shall show only the one with
  the highest precedence (BR-05). The S7 note is outside the precedence (AC-017).
- **AC-019** The system shall draw the panel in the colours of the current VS Code theme. When
  the user switches the theme, the panel shall follow without the user reopening it. [AC-005.4]
  It fails when any part of the panel keeps the colours of the previous theme, or shows text
  that cannot be read against its background. Decided by the stylesheet tests (every colour is a
  `--vscode-*` variable, no inline colour, no panel module reads or caches the theme); the
  readability in a Light, a Dark and a High Contrast theme by Gregor's delegate on the screenshot
  set of 2026-11-17; the live switch in a real VS Code, and the light High Contrast theme
  (OP-012), are checked by Gregor or his delegate; pre-release checklist item.
- **AC-020** If the panel UI asks for a file outside the files Studio ships for it (not through
  a message to the extension), then the system shall not deliver it. The panel UI shall load
  nothing from the internet. [AC-005.6]
  > **Given** the panel is open **When** a test inside the panel tries to load a file of the workspace by path **Then** the load fails and the panel shows none of the file's content.
- **AC-021** If a message from the panel UI carries the current protocol version but is no
  known message type or fails validation, then the system shall ignore it and write one line to
  the Output channel that names the message type and the reason, without the message's content.
  The system shall answer the next valid message as before. (A message of another version:
  AC-016. Many such messages: OP-011.)
- **AC-022** The system shall make every navigation item, list row and state action in the
  panel reachable by keyboard focus and activatable with Enter or Space, and shall show a focus
  indicator on the focused element. The tree entries follow VS Code's own tree keys. The focus
  indicator is decided by a component test: every focusable element of the panel is reached by a
  `:focus-visible` rule with a visible outline in a theme colour (revised 2026-11-17).
  *Amended by 0020 (PD-058): AC-022 — tree rows follow VS Code's tree keys; labels per 0020 AC-004; the list rows end.*
- **AC-023** The system shall give the current area, the selected spec, every board state and
  every panel state S1–S9 a text label that assistive technology can read. The system shall
  convey no meaning by colour alone. Checked by a component test on the labels, and by Gregor's
  delegate in a High Contrast theme on the screenshot set of 2026-11-17 (revised 2026-11-17).
  *Amended by 0020 (PD-058): AC-023 — for tree rows the accessible label is 0020 AC-022's; list rows end.*
- **AC-024** When the user runs "FeatherSpec Studio: Open", the system shall show the panel's frame
  (navigation plus the current area or state) within 1 second, without waiting for project data.
  Checked by an automated host test that measures from the command to the panel UI's first
  message to the extension, with the extension already active, run on Gregor's machine (Windows
  11) and on CI (OP-002; the 1 second is a working threshold like PD-035; revised 2026-11-17).
- **AC-025** The system shall create, modify, rename or delete no file inside any workspace
  folder while the panel or the Activity Bar view is opened, shown, navigated or restored (BR-06).
- **AC-026** While the workspace has a remembered project that 0001 does not report as a
  project, the system shall show state S8. S8 shall name the missing project and offer
  "Refresh"; it shall offer "Select project" only while 0001 reports another project (PD-037).
- **AC-027** While the condition of S9 holds (§13), the system shall show state S9. S9 shall
  name, for each incomplete folder, the missing marker from 0001's diagnostics, and offer "Open
  setup guide" and "Refresh" (PD-037).
  *Amended by 0014 (PD-049, PD-053): S9 also names "FeatherSpec setup not finished: <folder> has files to merge." for a setup-pending folder and offers "Set up FeatherSpec" and "Copy merge prompt" as §13 says; "Open setup guide" and "Refresh" stay.*
- **AC-028** When an area sends the navigation request (BR-07), the system shall show the
  requested area. When the request carries a spec target whose stem is in the project, the
  system shall also make that spec the selected spec. If the stem is not in the project, then
  the system shall keep the current area and the selection and show the notice of AC-010. When
  the request carries a run or board-filter target for an area that is still a placeholder,
  the system shall show the placeholder (PD-040).
  > **Given** Mission Control is shown and spec `0003-x` exists **When** the request "Spec Explorer, spec `0003-x`" arrives **Then** Spec Explorer is shown and 0003 is selected.
  *Amended by 0018 (PD-062): the areas are Overview (`overview`, default) and Board (`board`) with the commands and purposes of 0018 §6.4 and §7; a remembered area this version does not know shows the Overview with no selection (0018 AC-001, AC-002).*
  *Amended by 0020 (PD-058): AC-028 example — reads "Board, spec `0003-x`" (0020 §5).*

*Amended by 0015 (PD-055/PD-056): the navigation request targets a spec or a board filter, no run.*
- **AC-029** When the user runs "FeatherSpec Studio: Rescan Project" while a project is active,
  the system shall re-read that project's specs through the `rescan()` of the spec repository
  (0002). The panel shall keep its content until the new model arrives (0002 AC-022). While no
  project is active, the system shall change nothing and write no file (OP-009).
  > **Given** a project is active **When** the user runs the command **Then** the spec repository's `rescan()` runs once.
  *Amended by 0018 (PD-062): the Refresh action is "FeatherSpec Studio: Refresh" (0018 F-3, AC-027); "keeps its content until the new model arrives" holds for the command.*
- **AC-030** (added after `/sdd-compile`, 2026-11-16) The system shall draw every secondary text
  inside the selected spec row (derived label, path) in the theme's list selection foreground
  colour, not in the description colour, so that it stays readable on the selection background
  in a Light theme. Decided by a component test and a style test on the variables used; the
  readability itself stays in Gregor's AC-019 check.
  *Amended by 0020 (PD-058): AC-030 — void for the list (0020 §5); the tree's text colours are VS Code's.*
- **AC-031** (added after `/sdd-compile`, 2026-11-16) Where a theme defines the High Contrast
  border colours, the system shall draw the selected spec row and the current navigation item with
  the theme's active contrast border, shall draw the focus indicator of every focusable element
  in that colour, and shall draw the borders of navigation items, rows and state boxes in the
  theme's contrast border. Where the theme defines none, the system shall keep the previous
  look (focus border, panel border). Decided by a component test and a style test on the
  variables used; Gregor's High Contrast check (AC-023) stays.
  *Amended by 0020 (PD-058): AC-031 — for the spec row void with the list (0020 §5).*

## 15. Technical notes for developers or AI agents

- As-is (2026-11-16): 0001 to 0004 are built; `src/extension.ts` composes them. No view, webview or
  `src/shared` exists before this spec.
- Where the PD register and an ADR disagree, the PD register wins (Gregor, 2026-11-16).
- ADR-001 sets the shape (constraints, not criteria): one singleton editor panel with in-app
  routing and a serializer for restore (§2, §7); one native TreeView plus `viewsWelcome` (§2);
  React 19 with `--vscode-*` CSS variables and theme body classes (§3); CSP with a nonce, and
  `localResourceRoots` limited to `dist/webview` (§4); a second esbuild target (§5); a versioned,
  validated message protocol with `hello`/`snapshot`/`seq` (§6) — S5's third cause, AC-016 and
  AC-021 rest on it; no `retainContextWhenHidden` (§7).
- The navigation request (BR-07) is one message of that protocol. No area of this slice sends
  it; AC-028 is tested by sending it. Its target encoding is shared with 0006, 0007 and 0012.
- Layers: `src/adapters/vscode/` (panel host, tree, commands), `src/shared/protocol/`,
  `src/webview/`. These are new top-level source folders, so `/sdd-architecture-update` runs in
  the same change set.
- For `/sdd-plan` to decide: where the remembered UI state lives. ADR-001 §7 names the
  webview's `getState`/`setState`; that alone does not outlive a closed panel, which AC-009
  requires. Also: how AC-020 is tested in the extension-host tests.
- New dependencies (React, the webview test setup) are Ask-first (AGENTS.md); Gregor approved five devDependencies on 2026-11-16 (named in the plan).

## 16. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | 0001, 0002 and 0003 are built before this spec | Handoff §11.1 places FS-005 after FS-003, §11.2 gives the same order (the FS-005 header names FS-001 only) | The spec list (AC-007) and the states S2, S3, S5, S8, S9 have no data; the plan would need stand-ins |
| A-002 | *Withdrawn 2026-11-16.* Replaced by PD-036: the shell owns the panel-state texts (§13) | — | — |
| A-003 | Remembering the area and selection per workspace is enough; no memory across workspaces | The selection belongs to a project, and 0001 remembers its project per workspace too (0001 AC-009) | A user expecting the same area across workspaces sees Mission Control |
| A-004 | Restricted Mode changes nothing in this slice but the S7 note | This slice has no agent actions; ADR-001 §14 hides agent start and provider setup only | The specs that add agent actions (0008 onwards) must hide their own |

*Amended by 0015 (PD-055/PD-056): A-004 is void.*

## 17. Open points

Resolved:

- OP-001: interview note. At Gregor's explicit request, questions 2–8 were asked in one message, a one-off exception to the one-question rule of `/sdd-specify`. All suggestions were accepted as proposed ("all as suggested", 2026-11-16).
- OP-003: `/sdd-clarify` 2026-11-16, 71 findings, 3 blocking. Gregor decided the blocking ones in the PD register and delegated the rest (one-off exception to the one-finding-per-message walkthrough, at his request). The full list is kept by the orchestrator (`0005-findings.md`), not here. 63 resolved, 10 of them with a rest below; 8 parked below.
  - Blocking: selection identity → PD-039 (BR-03, AC-010); load error → PD-038 (S5, AC-015); missing states → PD-037 (S8, S9, AC-026, AC-027).
  - Also by decision: PD-036 (state ownership, BR-08), PD-040 (BR-07, AC-028), PD-042 (detail in Spec Explorer), PD-004 (*derived* label), PD-047 (list follows changes). Kept as product surface (PD-008, handoff FR-005.7): the tree, its welcome text and the protocol criteria AC-016, AC-020, AC-021.
  - Readings made while applying; say so if one is wrong: (a) S8 comes before S2, S9, S3 (PD-033), and those three exclude each other by their conditions; (b) different protocol versions give S6, while "cannot agree on the protocol" (PD-038) with equal versions gives S5; (c) the remembered selection is checked only against a loaded model, so a project that is lost and returns keeps it; (d) a re-read of the same project is not "loading"; (e) the Activity Bar view is in every window (PD-008), PD-033's silence covers the status bar and notifications; (f) S6 and S7 appear in the panel only; (g) list order by number then path, a missing title reads "not available", duplicated stems show their path; (h) a spec target that is not in the project keeps area and selection and gets the notice (0006 AC-014 sends no request in that case).
- OP-002, OP-004…OP-009: resolved 2026-11-16 by Gregor at the plan approval, as the spec recommended: OP-002 working threshold 1 s, measured from the command to the panel UI's first message (AC-024); OP-004 S8 and S9 sentences (§13); OP-005 placeholder wording and purpose sentences (BR-04, AC-006), no Studio spec number shown to users; OP-006 S7 text (§13); OP-007 notice as a line above the area (AC-010); OP-008 "Reload" reloads the panel UI, S6 ranks first, a second mismatch gives S5 (BR-05, AC-016); OP-009 the command "FeatherSpec Studio: Rescan Project" belongs to this spec and calls the `rescan()` of 0002 (AC-029).
- OP-014: 0001 revised 2026-11-16 at Gregor's request (0001 AC-024: `onDidUpdate`, `remembered`, `failure`) so that the shell sees S2, S3, S5, S8 and S9.

Open, none blocks the work (clarify finding in brackets):

- OP-010 [6.7]: per-state counts in the tree (ADR-001 §2 "compact status of specs and runs") have no owner; 0006 does not contain them. Recommendation: out of the MVP until a spec claims them.
  *Amended by 0020 (PD-058): OP-010 — resolved: group counts and the badge (0020 AC-001, AC-009).*
- OP-011 [5.9]: AC-021 writes one line per malformed message, without a limit. Recommendation: repeat lines of one message type are collapsed into a count.
- OP-012 [2.16]: AC-019 names one High Contrast theme; VS Code has a dark and a light one. Resolved 2026-11-17: the dark one is in the delegate's screenshot set, the light one is a pre-release checklist item (AC-019).
- OP-013 [6.6, 6.9]: basis. PD-013 and PD-016 are marked "(proxy)", ADR-001 is "Proposed"; OP-001's bulk acceptance does not show which state texts and rules Gregor chose himself. Recommendation: Gregor reads §13 and BR-05 once at the plan review and confirms the two PDs in the register.

## 18. Definition of Ready

Goal, user, scope and out-of-scope are documented. The happy path, nine panel states and edge
cases are described. Every criterion is decidable by a test or by Gregor's manual check.
Constraints come from ADR-001 and are marked as such. Clarified on 2026-11-16; the open points
OP-010…OP-013 do not block the work (OP-002, OP-004…OP-009 resolved).

## 19. Definition of Done

All FR-01…FR-12 are built. AC-001…AC-031 pass: automated tests for navigation, selection, states,
protocol and file isolation, plus Gregor's manual checks (§14). No out-of-scope content was
added. The architecture snapshot and the Memory Bank are updated. Gregor accepts the result.

## 20. Recommended next steps

1. Planned and started 2026-11-16; implemented 2026-11-17 (plan archived, see *Plan history*).
2. Gregor answers OP-010…OP-013 when convenient; `/sdd-specify` (revise mode) applies the answers.

## Plan history

- 2026-11-17 — [0005-studio-shell-navigation.2026-11-17.plan.md](../plan-archive/0005-studio-shell-navigation.2026-11-17.plan.md) — shell, navigation, panel states, Spec Explorer list and navigation request built in 11 steps; closing `/sdd-compile` READY (manual items: 2).
