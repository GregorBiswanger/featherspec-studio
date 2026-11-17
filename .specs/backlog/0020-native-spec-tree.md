# Native Spec Tree and a Two-Tab Panel

**Status:** Draft
**Plan:** _none yet_

Basis: UX audit 2026-11-17 ([docs/ux-audit/](../../docs/ux-audit/)) R-05 (05), concept K-B (04),
target picture B (03 §4), evidence 02 §3.1, §3.6 and screenshots 02, 05, 11. Decisions:
PD-058 (proxy, on Gregor's delegation), PD-016 (English UI), PD-013 (read-only), PD-060 (no moves).
Guidelines: `.claude/rules/ux-guidelines.md` (binding). Builds on 0016 (tiers, T-05, T-09), 0017 (short form,
current spec, Copy feedback), 0018 (Overview, compact board, one Refresh), 0019 (detail as side
panel); all four are implemented before this spec (A-001). Amends 0005, 0007, 0013, 0015,
0017, 0018, 0019, PD-042, PD-048, PD-054 and ADR-001 §2 (§5).

## 1. Summary

The Activity Bar view becomes the project's spec list: a native, grouped tree of the active
project's specs — In progress, Up next, Backlog, Done — where every row shows its state and next
step, copies the step inline and opens the spec's side panel on click. A badge on the Activity
Bar icon counts the specs waiting for the user. The Spec Explorer area ends: its list is the
tree, its detail is 0019's side panel. The panel keeps two tabs, Overview and Board.

## 2. Goal, problem and users

Today the sidebar holds five starter entries and no information (audit IA-1, IA-7, screenshot
02); the Spec Explorer list repeats the board as a flat list where 13 Done specs push the two
relevant ones to the bottom (02 §3.6, screenshot 05). The view that stays visible while coding
should answer "what is in progress, what waits for me, what is the next command" without opening
the panel (guideline 4, native first). **Users:** the developer working beside an AI chat
(primary) and the workshop presenter (audit P1, P2). Success: every spec's next step is one click
from the tree; the panel has two tabs; no test that decides a staying criterion is lost (AC-021).

## 3. Scope

### In scope

- The view's content, row texts, icons, tooltip, inline Copy, context menu, click, badge, toolbar (§4.1–§4.3).
- What the view shows without specs and in the panel states S1–S9 (§4.4).
- The end of the Spec Explorer area: panel tabs, commands, routes, remembered state, icons (§4.5).
- Amendments of older specs by ID (§5); texts with the old ones they replace (§6).

### Out of scope

- The next step, its short form, the command "FeatherSpec Studio: Copy Next Step" and the status bar — because 0017 owns them; the tree only shows and copies the step.
- Tiers of diagnostics — because 0016 owns them; the tree only marks the *Problem* tier.
- The side panel's content and the file-open rule — because 0019 owns them; Overview, board, Refresh — because 0018 owns them.
- Following the panel's selection in the tree (`TreeView.reveal`) — because it needs `getParent` and moves the user's scroll position; not now.
- A filter or search action in the toolbar — because VS Code's tree find already filters rows by typing; not now.
- A "problems" summary row (K-B sketch) — because each row shows its warning and the Overview has a Problems section (0018).
- Drag and drop in the tree — because PD-060 ended moves; never.
- Problems panel, CodeLens, file decorations, "Send to chat" — because PD-061 (2) defers them until validated.
- Welcome content in place of the action rows of S1, S3, S5, S8, S9 — because their texts name a reason, a project or folders that a fixed welcome text cannot hold (§4.4); needs a decision first (OP-003).
- A second view in the container — because VS Code's view guidelines ask to keep views to a minimum.
- Several projects in one tree — because the tree shows the active project, like the panel (0001); not now.

## 4. Business rules

### 4.1 Groups and order

| Group (label) | Board states | Order inside | Starts |
| --- | --- | --- | --- |
| In progress | Blocked, Review, Active | Blocked → Review → Active, then number, then path | expanded |
| Up next | Ready | number, then path | expanded |
| Backlog | Backlog | number, then path | expanded (proxy, A-003) |
| Done | Done (Deprecated included) | number, then path | collapsed |

- Every spec entry (PD-018, PD-019: each file its own row) is in exactly one group; a group with no spec is not shown (guideline 7).
- A group row: label = group name, description = the number of its specs, no icon of its own, an ID that does not contain the count, so VS Code keeps the user's expand or collapse while the view lives (A-009).

### 4.2 Spec row

- **Label:** `<number> <title>`. A title longer than 24 characters is cut at its last space within the first 24 characters, then `…` (no such space: after 23 characters) (proxy, A-005); a spec without a title shows its slug.
- **Description:** `<State> · <short form>` (0017 §6.1) for a spec that has a step; `<State>` alone for one that has none (NS-1, NS-3, NS-11); `Deprecated` for a deprecated spec.
- **Icon** (VS Code product icon with a theme colour, the board's motifs and tints):

| State | Icon | Colour |
| --- | --- | --- |
| Backlog | `list-flat` | `descriptionForeground` |
| Ready | `pass` | `charts.blue` |
| Active | `play` | `charts.purple` |
| Review | `eye` | `charts.yellow` |
| Done | `check` | `charts.green` |
| Blocked | `circle-slash` | `charts.red` |
| any state with a *Problem* (0016 §6.1) | `warning` | `problemsWarningIcon.foreground` |

- **Accessible label:** `<number> <full title>, <description>`, plus `, ` and 0016's T-05 text (`1 problem`, `<n> problems`).
- **Tooltip** (Markdown, one line each, a line without data is left out): `**<number> <full title>**` · `<State>`, for a derived state `<State> — <0016 T-09 sentence>` · `Next step: ` + the full first line in code, or the rule's text where it names no line · the second line in code under its label (0017 §6.1) · `Steps <d>/<t> · Criteria <d>/<t>` (the card's row 2 of 0018 B-5: a figure that is not available is left out) · per *Problem* finding `Problem: <0016's text>` · the project-relative spec path in code.
- **Click or Enter:** the spec becomes the selected spec (0005 BR-03), so 0019's side panel shows it without moving focus (0019 §6.1) and 0017's current spec follows (0017 §6.3 (1)). An open panel comes to the front without taking the keyboard focus from the tree and keeps its tab; a closed panel opens on the start tab (0005 BR-02).
- **Inline action and context menu:** inline `Copy Next Step` (icon `copy`) only on rows of a spec that has a step (0017 §6.1; guideline 2); it copies the full first line and shows 0017's status-bar feedback (`$(check) Copied` or `$(warning) Could not copy`, 2000 ms, 0017 AC-016); it does not select the spec. Context menu, in this order: `Open Spec`; `Open Plan` only where 0019's Steps row has a plan (sibling, else the archived plan 0003 uses); `Copy Next Step` as the inline rule says. Both files open as 0019 §6.4 opens file links (beside, line 1).

### 4.3 Badge, toolbar, title

- **Badge** (`TreeView.badge`): value = number of spec entries in Review or Blocked; tooltip `<n> spec waits for you: …` (n = 1) or `<n> specs wait for you: …`, then `<r> in Review` and `<b> Blocked` joined by `, `, a zero part left out. No badge at zero or while the tree shows no spec rows.
- **Toolbar** (`view/title`, group `navigation`, in this order): `featherspec-studio.open` (icon `window`, tooltip its title "FeatherSpec Studio: Open") and 0018's `featherspec-studio.refresh` (icon `refresh`, "FeatherSpec Studio: Refresh"); shown in every state.
- **View name:** `Specs` (the view keeps its ID `featherspec-studio.navigator`); the container keeps "FeatherSpec Studio" and its logo icon. The view's description shows the active project's name only while 0001 reports two or more projects.

### 4.4 States of the view

| Condition | The view shows |
| --- | --- |
| Project active, model loaded, ≥ 1 spec | groups (§4.1) |
| Project active, model loaded, 0 specs | message `No specs yet. Start with /sdd-specify` (0018's zero-spec text; a message has no button); no rows, no badge |
| Project active, first model not loaded | message `Loading project…` |
| Project active, `.specs/` cannot be listed (S5) | S5's line with rows Show output, Retry (the no-project form below) |
| No project active: S1, S3, S4, S5, S8, S9 | as today (0005 AC-003): the state's line with one row per action |
| S2 | the welcome view of 0014, unchanged |
| S6 protocol mismatch, S7 Restricted Mode, S5 protocol cause | panel only; the view shows what the rows above say |

The action rows of the no-project states deviate from guideline 4 by name: VS Code shows welcome
content only for an empty tree without a message, and its text is fixed in the manifest, so it
cannot name the reason, project or folders these states name today. They appear only while no
spec list exists (A-007).

### 4.5 End of the Spec Explorer area

- The panel offers two tabs, Overview (`overview`) and Board (`board`) as 0018 names them, each with its icon; the list-tree motif ends (PD-054 amended).
- Removed, not redirected (PD-058: nothing is published): the command `featherspec-studio.openSpecExplorer` ("FeatherSpec Studio: Open Spec Explorer"); the tree entries project, Open Studio, Overview, Board, Spec Explorer (0018 §7 labels); the panel's Spec Explorer tab and area; the area ID `specExplorer` in the protocol; the Explorer's purpose text and list label. Keyboard users reach the tree through VS Code's own view focus command and the context menu (Shift+F10).
- A remembered UI state or restored panel state naming `specExplorer` shows Overview (0018 AC-002) and keeps the remembered selection, so the side panel shows that spec; without one, or when it left the project, Overview alone — no error.
- Cards, Overview rows and activity entries already select in place (0019 AC-001); 0019's Spec Explorer pane, its hint and AC-008 end with the area.

## 5. Amendments of other specs

| Spec · ID | Amendment |
| --- | --- |
| 0005 §1; §4 in scope "Ways in" and "minimal spec list"; §5 steps 1, 4, 5; §9 "Activity Bar view", "Commands", "Spec Explorer"; BR-02 "an area's tree entry" | The view "Specs" is this spec's tree; no project, Open Studio or area entries (Open Studio is a toolbar action); no Spec Explorer list, area or command |
| 0005 AC-003 | Replaced by AC-001–AC-012; its no-project part stays as §4.4 says |
| 0005 AC-004, AC-005 | Two tabs and two per-area commands (0018's `openOverview`, `openBoard`) |
| 0005 AC-006 (Spec Explorer purpose), AC-007, AC-008, AC-030; AC-031 for the spec row | Void (no list); the tree's order and labels are AC-003, AC-004 |
| 0005 AC-009; §13 edge "remembered area … cannot be used" | A remembered `specExplorer` maps per AC-017 |
| 0005 AC-022, AC-023 for list rows | Tree rows follow VS Code's tree keys; labels per AC-004 |
| 0005 §13 edge "zero specs → Spec Explorer shows …" | The view per §4.4; the tabs' own zero states per 0018 |
| 0005 OP-010 | Resolved: group counts and the badge |
| 0007 §1, §4 "in the Spec Explorer area" and out of scope "the Spec Explorer list"; §6.4 "beside 0005's spec list … and the list" | No Spec Explorer list; the detail's place is 0019's side panel (0019 amends the detail) |
| 0013 §3.4 first bullet for the list pane and selected row | Void; the detail's layout per 0019 |
| 0013 AC-010 "a list row"; AC-017 "Spec Explorer list" | No list; the tree's look is AC-022 |
| 0015 AC-001 | Spec Explorer leaves panel, tree and commands; the tree has no area entries |
| 0017 §6.3 row "for 2 s after a click" | Also after a Copy from the tree (AC-007) |
| 0018 AC-002 | For a remembered `specExplorer` the remembered selection stays (AC-017) |
| 0019 §4 in scope "The Spec Explorer area keeps …"; §5 row "0005 AC-007, AC-008 … stay until 0020"; §6.1 "Spec Explorer until 0020"; FR-02; AC-008 | Void: no Spec Explorer area, list or pane; the side panel is the only detail |
| PD-042 (register not edited) | Superseded: no Spec Explorer area; the detail is 0019's side panel |
| PD-048 (register not edited) | Activity Bar icon unchanged; tree icons per §4.2; toolbar `window`, `refresh`; project and area entries end |
| PD-054 (register not edited) | Two navigation icons; the list-tree motif ends |
| ADR-001 §2 | The TreeView is the status surface (grouped specs with next step and badge); the panel hosts Overview and Board with the detail as a side panel; note "superseded in part by 0020 (PD-058)" |

## 6. Texts (English, in the text modules, asserted literally)

| Place | Old | New |
| --- | --- | --- |
| View name | `FeatherSpec Studio` | `Specs` |
| Tree entries | `<project name>`, `Open Studio`, `Overview`, `Board`, `Spec Explorer` (0018 §7) | groups `In progress`, `Up next`, `Backlog`, `Done` with their count; spec rows (§4.2) |
| Row description, tooltip, accessible label | — | §4.2, e.g. `Review · /sdd-compile`, `Done`, `Deprecated`, `Next step: `, `Steps 4/7 · Criteria 2/5`, `Problem: `, `, 1 problem` |
| Badge tooltip | — | `1 spec waits for you: 1 in Review`; `3 specs wait for you: 2 in Review, 1 Blocked` |
| Context menu and inline | — | `Open Spec`, `Open Plan`, `Copy Next Step` |
| View, zero specs | (list) `This project has no specs yet.` | `No specs yet. Start with /sdd-specify` (0018's text) |
| Command | `FeatherSpec Studio: Open Spec Explorer` | — (removed) |
| Panel navigation | `Spec Explorer` | — (two tabs per 0018) |
| Area purpose; list label; pane hint | `Browse the specs of the project and select one.`; `Specs`; `Select a spec in the list to see its details.` | — |

## 7. Error cases and edge cases

- A spec moves between lifecycle folders → it changes group; it stays the selected spec (PD-039).
- A duplicated stem → one row per file, each with its warning (0016 *Problem*); the tooltip names each path.
- A title made only of spaces or missing → the slug; a title of exactly 24 characters is not cut.
- The clipboard fails → 0017's failure feedback; the tree is unchanged.
- The panel shows a panel state when a row is clicked → the selection is kept and the side panel appears once the model is loaded (0005 BR-03).
- Restricted Mode or a reader window → the same tree; Copy works (0015 AC-008).

## 8. Acceptance criteria

Decided by unit tests on the tree model (core, no `vscode`) and the manifest unless marked;
"host smoke" = extension-host test on fixture `fs110-de-active-review`.

- **AC-001** While a project is active and its model holds at least one spec, the view shall show at its root the groups of §4.1 that hold a spec, in the order In progress, Up next, Backlog, Done, with every spec entry in exactly one group by its board state, and each group row's description shall be its count.
- **AC-002** The groups In progress, Up next and Backlog shall start expanded and Done collapsed; a group row's ID shall be the same for any count.
- **AC-003** The system shall order the rows of In progress Blocked, Review, Active, then by number, then by path, and the rows of every other group by number, then by path.
- **AC-004** Each spec row shall carry the label, description and accessible label of §4.2.
  > **Given** `.specs/active/0015-focus-on-visibility.md` in Review with the title "Focus the Studio on Visibility: No Agent Runs, a Named Next Step" **When** the tree is built **Then** the label is `0015 Focus the Studio on…`, the description `Review · /sdd-compile` and the accessible label starts with the full title.
- **AC-005** Each spec row shall carry the icon and colour of §4.2 for its state; if the spec has a *Problem* finding (0016), then the row shall carry `warning` in `problemsWarningIcon.foreground`, keep its state word in the description and add the problem count to the accessible label.
- **AC-006** Each spec row's tooltip shall be Markdown with the lines of §4.2, in that order, leaving out a line or part without data.
- **AC-007** A row of a spec that has a step (0017 §6.1) shall offer `Copy Next Step` inline and in its context menu; activating it shall put the full first line on the clipboard, show 0017's status-bar feedback and leave the selection unchanged. A row of a spec without a step (Done among them) shall offer neither.
- **AC-008** A spec row's context menu shall offer `Open Spec`, `Open Plan` only where the spec has a plan (§4.2), and `Copy Next Step` per AC-007, in this order; Open Spec and Open Plan shall open that file the way 0019 AC-018 opens a known file, at line 1. Group rows shall offer no action.
- **AC-009** When the user activates a spec row by click or Enter, the system shall make that spec the selected spec; with the panel open, it shall bring the panel to the front without taking the focus from the tree, keep the panel's tab and show the spec's side panel; with the panel closed, it shall open the panel on the start tab with that side panel. Host smoke for the open case, unit test on the request for both.
- **AC-010** While the view shows spec rows, the badge shall be the number of entries in Review or Blocked with the tooltip of §4.3; at zero, and while the view shows no spec rows, there shall be no badge.
- **AC-011** The manifest shall name the view `Specs`, contribute in its `view/title` group `navigation` `featherspec-studio.open` (icon `$(window)`) and then `featherspec-studio.refresh` (icon `$(refresh)`), and contribute the tree's commands (row activation, Copy Next Step of a row with icon `$(copy)`, Open Spec, Open Plan) hidden from the Command Palette; the inline entry shall use group `inline` with a `when` limited to this view and to rows with a line to copy. The view's description shall be the active project's name only while 0001 reports two or more projects.
- **AC-012** The view shall show, per condition of §4.4, exactly what §4.4 names; the S2 `viewsWelcome` entry shall be byte-identical to the commit before this spec.
- **AC-013** When the model changes (a spec added, its state changed, a step ticked), the view and the badge shall show the change within 500 ms after the shell reports the changed view (PD-047). Host smoke on a fixture copy.
- **AC-014** The view, its actions and its badge shall change no file in any workspace folder (0005 AC-025); in Restricted Mode and a reader window they shall work as in a trusted one.
- **AC-015** The manifest shall contribute no command `featherspec-studio.openSpecExplorer` and no title containing "Spec Explorer"; a spec row shall carry exactly one inline action (VS Code view guidelines: at most three).
- **AC-016** The panel navigation shall list exactly two tabs, Overview and Board, in this order, each with its icon; the protocol shall have no area `specExplorer`, and no panel element shall send a request for it.
- **AC-017** If the remembered UI state or a restored panel state names `specExplorer`, then the system shall show Overview, with the side panel of the remembered spec while that spec is in the project, and no error.
  > **Given** a stored memory `{ v: 1, area: 'specExplorer', selection: 0003 }` and 0003 in the project **When** the panel opens **Then** Overview shows with 0003's side panel.
- **AC-018** A search of `src` without test files shall find no `specExplorer`, `SpecExplorer`, `openSpecExplorer` and "Spec Explorer", except the mapping of AC-017; `README.md` and `docs/release-checklist.md` shall describe the tree and two tabs and name no Spec Explorer (CHANGELOG history exempt).
- **AC-019** Host smoke: after activation the view `featherspec-studio.navigator` is registered and shows the fixture's groups with their counts in §4.1 order, the badge equals its Review and Blocked entries, and the commands of AC-011 are registered.
- **AC-020** 0005, 0007, 0013, 0015, 0017, 0018, 0019 and ADR-001 §2 shall carry the notes of §5 as inline notes "*Amended by 0020 (PD-058): …*"; the PD register is history and is not edited (as in 0018 §5).
- **AC-021** Every test at the commit on which this spec's implementation starts that decides a criterion not voided in §5 shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares the test titles of both commits; every title missing at the head, a renamed one included, is listed in the plan with its voided criterion or the head title that replaces it.
- **AC-022** *(manual, Gregor or his delegate; pre-release checklist)* On `tip-splitter` and on this repository, in Dark, Light and High Contrast at a sidebar width of 400 px: every state icon is told apart without colour, the description of every In progress and Up next row is visible, the badge is readable; in the Hands-On he copies a next step from the tree and his assistant runs it.

## 9. Technical notes for developers or AI agents

- As-is (8052f9a): `src/core/shell/treeModel.ts` `buildTreeModel` (kinds project, open, area, action; `AREA_ICONS`); `src/adapters/vscode/studioTree.ts` (flat items, `TreeView.message`, context key `featherspec-studio.panelState` for the S2 welcome; no IDs, menus or badge); `src/core/shell/specRows.ts` and `src/webview/areas/SpecExplorer.tsx` (the list), `src/webview/areas/registry.tsx`, `AREA_IDS` in `src/shared/protocol/areas.ts`, `AREA_COMMANDS` in `src/adapters/vscode/commands.ts`, `AREA_PATHS` in `src/webview/board/icons.tsx`, registration in `src/extension.ts`. Tests: `treeModel.test.ts`, `specRows.test.ts`, `manifest.test.ts`, host `src/test/shell.smoke.test.ts` (`api.shell().tree()`).
- `parseUiMemory` (`src/core/shell/uiMemory.ts`) drops the whole memory, selection included, for an unknown area: AC-017's mapping must run before that check.
- Keep the tree model pure in `src/core/shell` (icon and colour IDs as strings); the adapter maps them to `TreeItem`. The next step comes only from `nextStep()` and 0017's short form (guideline 1). Spec row IDs: stem, plus path while duplicated (like PD-039).
- VS Code 1.146 facts (checked in `@types/vscode` 1.146.0 and the docs): `TreeItem.description` is "rendered less prominent", `tooltip` is `string | MarkdownString`, `id` "is used to preserve the selection and expansion state … when labels change, ids will change", `contextValue` feeds `viewItem` in `when`, `accessibilityInformation` sets the screen-reader label; `ThemeIcon(id, color?)` — "The color is currently only used in TreeItem"; `TreeView.badge: ViewBadge { value, tooltip }`, "To remove the badge, set to undefined" ([API: TreeItem, ThemeIcon, TreeView](https://code.visualstudio.com/api/references/vscode-api#TreeItem)); the badge shows on the view's container in the Activity Bar ([1.72 release notes](https://code.visualstudio.com/updates/v1_72)); inline actions use `"group": "inline"` in `view/item/context`, toolbar actions `"group": "navigation"` in `view/title`, and a welcome view shows for "a view that has no `TreeView.message` and an empty tree" ([Tree View guide](https://code.visualstudio.com/api/extension-guides/tree-view)); "Don't use Tree View Items as buttons to fire Commands", "Don't add more than three actions to an item", "Keep the number of Views to a minimum" ([UX guidelines: Views](https://code.visualstudio.com/api/ux-guidelines/views)); icon IDs from [icons-in-labels](https://code.visualstudio.com/api/references/icons-in-labels#icon-listing), colour IDs from [theme-color](https://code.visualstudio.com/api/references/theme-color). `resolveTreeItem` can fill the tooltip lazily if building it costs too much.
- Removing `SpecExplorer.tsx` and the area changes the module list: run `/sdd-architecture-update` in the same change set; update README (ways in, commands table), CHANGELOG, `docs/release-checklist.md` (steps that use Spec Explorer), `.architecture/webview.md`.

## 10. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | 0016–0019 are implemented first; their names (`overview`, `board`, `featherspec-studio.refresh`, short form, selection, 0016's tier and texts) are used as they are then | Split order 0016 → 0020; each plan is written against the code of its time | References in §4 and AC-007–AC-011 are re-aligned in `/sdd-plan` |
| A-002 | The view is named `Specs` (proxy) | PD-058 target picture, `docs/product/ux-guidelines.md` | Only the name text changes |
| A-003 | Backlog starts expanded (proxy); K-B's sketch collapses it | Backlog rows carry the step the user acts on (`/sdd-clarify`, `/sdd-plan`); it sits below the present groups | A long backlog pushes Done further down; one default changes |
| A-004 | Empty groups are not shown | Guideline 7 (minimal space for empty sections) | Users miss a fixed place per group; one rule changes |
| A-005 | Titles longer than 24 characters are cut (proxy) | VS Code draws the description after the label and cuts the row at the view's edge; this repo's titles reach 64 characters (screenshot 05 cuts them even at 740 px) | State and step stay hidden at 400 px; the number is retuned with AC-022 |
| A-006 | A click keeps the keyboard focus in the tree (proxy) | The user walks the specs with arrows and Enter while the side panel follows | Focus jumps into the panel; one option of the reveal changes |
| A-007 | The no-project states keep line + action rows (guideline 4 deviation, named) | Welcome text is fixed in the manifest and shows only without a message | Information of S5, S8, S9 would be lost in the view |
| A-008 | Spec Explorer commands are removed, not redirected (proxy) | PD-058: nothing is published, command IDs may change without migration | A user's keybinding to the old command stops working |
| A-009 | VS Code keeps a group's expand state by its ID while the view lives; across a window reload it is VS Code's choice and not asserted | The API documents the ID for expansion state; it documents nothing about reloads | Done may start collapsed again after a reload — the default anyway |

## 11. Open points

- OP-001: interview note. Gregor was not reachable; the orchestrator's split and the audit replaced the interview; decisions marked (proxy) in §10 wait for his confirmation at the plan review.
- OP-002: the audit's 5-second test (R-05 field 12: 4 of 5 participants name the work in progress and the next command from a screenshot of the view) needs workshop participants; Gregor decides whether it runs before a release.
- OP-003: S1 and S3 have fixed texts and could move to welcome content; S5, S8 and S9 cannot (§4.4). Recommendation: leave all as today until a user reports the rows as noise.
- OP-004: names of 0016–0019 (tab IDs, Refresh command, short form, selection message, status-bar feedback, T-05, T-09) are confirmed against their implemented code in `/sdd-plan` (A-001).

## 12. Definition of Ready / Done

Ready: goal, users, scope, rules, texts, states and criteria are written; open points do not
block; 0016–0019 are implemented. Done: AC-001…AC-021 pass by automated tests, AC-022 is checked,
the docs of §9 and the architecture snapshot are updated, nothing of §3 *Out of scope* was built,
Gregor accepts the result.

## 13. Recommended next steps

1. `/sdd-clarify` on this spec in a fresh session (proxy decisions and cross-spec names).
2. After 0019 is implemented: `/sdd-plan` against the code of that time, with the test-title audit of AC-021.
