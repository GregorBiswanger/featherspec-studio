# Studio Shell & Navigation

**Status:** Draft
**Plan:** _none yet_

Handoff reference: FS-005 ([po-handoff.md](../../docs/product/po-handoff.md) §4, §10 FS-005, §13
Usability). Architecture basis: [ADR-001](../../docs/decisions/ADR-001-extension-architecture.md)
§2, §4, §6, §7, §14; PD-008, PD-013, PD-016 ([product-decisions.md](../../docs/product/product-decisions.md)).
Depends on: 0001 (active project), 0002 (spec model), 0003 (board state).

## 1. Summary

FeatherSpec Studio gets its frame: one entry point in VS Code, one Studio panel inside the editor
area, and navigation between the four MVP areas: Mission Control, Spec Board, Spec Explorer and
Agent Center. This slice delivers the frame, an honest placeholder for every area that a later
spec fills, and a minimal spec list in Spec Explorer, so that a selected spec can be carried
across areas. It also delivers every empty, loading and error state of the Studio UI, follows the
VS Code theme, and keeps the UI away from local files.

## 2. Goal and problem

Developers need one consistent place to reach the Studio areas, with no hunting for commands and
no lost context when they switch areas. Later specs (0006, 0007, 0012) fill the areas. This slice
makes sure they share one navigation, one selection context and one set of states. It is
accepted when Gregor can open the Studio, reach every area, keep a selected spec across areas
and reloads, and understand every empty and error situation, in every VS Code theme.

## 3. Users and roles

- **Developer** (primary): opens the Studio, navigates, selects specs. One role. All permission
  questions in this slice come from VS Code Workspace Trust (§11).

## 4. Scope

### In scope

- Entry points: an Activity Bar view with the Studio tree, the command "FeatherSpec Studio: Open",
  and one command per area (FR-005.1).
- One Studio panel in the editor area with navigation to the four areas (FR-005.2, FR-005.3).
- An honest placeholder in Mission Control, Spec Board and Agent Center that names the spec that
  delivers the area.
- A minimal spec list in Spec Explorer (number, title, board state) to make selection possible.
- A selection context that is kept across areas, panel close and reopen, and reload (FR-005.4).
- The start view: Mission Control the first time, then the area used last.
- Seven empty, loading and error states (FR-005.5, §13 Usability).
- Light, Dark and High Contrast themes, including a live theme switch (FR-005.6).
- All UI-to-extension communication goes through the extension; the UI has no direct file access (FR-005.7).
- Keyboard operation and text labels that do not rely on colour.

### Out of scope

- Mission Control content (counts, activity, attention list) — because spec 0006 owns it.
- Board columns, cards, drag and drop, filters, and the spec detail sections — because spec 0007
  owns them. The detail will later appear inside Spec Explorer (§9).
- Agent Center content (runs, events, approvals) — because spec 0012 owns it.
- Per-state counts in the Activity Bar tree — because they come with Mission Control (0006); not now.
- A sidebar webview, or a separate panel per area — because ADR-001 §2 chose one panel plus a native tree; not in the MVP.
- Any write to FeatherSpec artifacts — because PD-013 keeps Studio read-only; not in the MVP.
- Telemetry — because the handoff §13 Privacy forbids it without a product decision.
- Selecting several specs at once — because nothing in the MVP needs it; not now.

## 5. Functional flow

1. The developer clicks the Studio entry in the Activity Bar, or runs "FeatherSpec Studio: Open".
2. The Studio panel opens in the editor area. If it is already open, it comes to the front. It
   shows Mission Control the first time, afterwards the area used last.
3. While the project data loads, the panel shows a loading state. If no project is usable, it
   shows the matching empty or error state with one action.
4. The developer switches areas through the navigation, the tree entries or the per-area commands.
5. In Spec Explorer, the developer selects a spec. It stays selected in every other area, after
   closing and reopening the panel, and after a VS Code reload.
6. The selection is cleared when the active project changes, or when the spec no longer exists.
   A spec that disappears gets a short notice.

## 6. Business rules

- **BR-01 One Studio:** there is at most one Studio panel per VS Code window.
- **BR-02 Start view:** the first open shows Mission Control. Later opens show the area last
  shown, remembered per workspace.
- **BR-03 Selection:** at most one selected spec, scoped to the active project. Switching areas
  never changes it. A change of active project clears it. If the selected spec is no longer in the
  project's spec model, the selection is cleared with the notice "Spec <number> is no longer in
  the project".
- **BR-04 Honest placeholder:** an area whose content a later spec delivers shows its name, one
  sentence on its purpose, and "Arrives with spec <NNNN>". It never shows sample or invented data
  (handoff P8).
- **BR-05 State precedence:** when several states would apply, the panel shows exactly one of
  them, in this order: no folder open > no FeatherSpec project > several projects and none chosen
  > reload needed > load error > loading. Restricted Mode is shown as a note on top of any of these
  states or of the normal view, never in their place.
- **BR-06 Read-only:** the Studio changes no file in the workspace (PD-013).

## 7. Functional requirements

| ID | Requirement | Handoff | Criteria |
| --- | --- | --- | --- |
| FR-01 | Provide one clear VS Code entry point | FR-005.1 | AC-001, AC-002, AC-003 |
| FR-02 | Make all four MVP areas reachable | FR-005.2 | AC-004, AC-005, AC-006 |
| FR-03 | Show the Studio inside VS Code | FR-005.3 | AC-001 |
| FR-04 | Keep the selection context between areas | FR-005.4 | AC-007, AC-008, AC-009, AC-010 |
| FR-05 | Provide empty, loading and error states | FR-005.5 | AC-011 … AC-018 |
| FR-06 | Follow the VS Code light, dark and high-contrast themes | FR-005.6 | AC-019 |
| FR-07 | Route all UI communication through the extension | FR-005.7 | AC-020, AC-021 |
| FR-08 | Keyboard operation and no colour-only meaning | §13 Usability | AC-022, AC-023 |

## 8. Data requirements

- **Read (from other specs):** the active project and the discovery result (0001); the spec list
  with number and title (0002); the board state per spec (0003).
- **Remembered per workspace (UI state only):** the last area, the selected spec number. Kept by
  VS Code outside every workspace folder. Never domain data (ADR-001 §7).
- Nothing sensitive is read, shown or stored.

## 9. UI/UX requirements

UI text is in English (PD-016).

- **Activity Bar view "FeatherSpec Studio":** a tree showing the active project's name, an
  "Open Studio" entry, and one entry each for Mission Control, Spec Board, Spec Explorer and Agent
  Center. Each entry opens the panel on that area. When no project is usable, the tree shows a
  welcome message with the same text and action as the panel's state (§13).
- **Commands:** "FeatherSpec Studio: Open", "FeatherSpec Studio: Open Mission Control",
  "… Open Spec Board", "… Open Spec Explorer", "… Open Agent Center".
- **Panel:** titled "FeatherSpec Studio". It has a navigation with the four areas, marks the
  current area in text and for screen readers (not by colour alone), and shows the active project's
  name.
- **Spec Explorer (this slice):** a list of the project's specs. Each row shows the number, the
  title and the board state as a word. Selecting a row makes it the selected spec, which is visible
  as selected in the list. The name stays "Spec Explorer". Spec 0007's detail appears inside this
  area later, not as a fifth area.
- **Placeholders:** BR-04. Mission Control → 0006, Spec Board → 0007, Agent Center → 0012.
- **Theme:** colours, fonts and focus outlines come from the current VS Code theme. A theme
  switch takes effect without reopening the panel.
- **States:** §13. Each state has one plain sentence and at most two actions.

## 10. Interfaces and integrations

- VS Code: Activity Bar view, commands, editor panel, workspace storage for UI state, Workspace
  Trust, theme. The Output channel "FeatherSpec Studio" comes from 0001.
- Studio-internal: reads the results of 0001, 0002 and 0003. The UI gets them only as messages
  from the extension.
- No network service.

## 11. Security, permissions and privacy

- The UI gets no direct access to local files or to Node.js. Everything it shows arrives as
  messages from the extension, and everything it asks for goes out as a message (handoff §8.2,
  ADR-001 §4, §6).
- The UI loads no content from the internet and runs no code that the extension did not ship.
- In Restricted Mode the views stay readable. Actions that later start agents are not offered
  (ADR-001 §14). In this slice, that means only the note in state S7.
- No telemetry. No spec content in logs.

## 12. Non-functional requirements

- Time budget for the frame: AC-024.
- The navigation stays usable while the project data is still loading (handoff §13 Performance).

## 13. Error cases and edge cases

The seven states (precedence: BR-05):

| ID | Situation | Text (sentence) | Actions |
| --- | --- | --- | --- |
| S1 | No folder open | "Open a folder to use FeatherSpec Studio." | Open Folder |
| S2 | No FeatherSpec project (0001) | "No FeatherSpec project found in this workspace." | Open setup guide · Refresh |
| S3 | Several projects, none chosen (0001) | "Several FeatherSpec projects found. Select one to continue." | Select project |
| S4 | Loading | "Loading project…", with a visible progress indicator | — |
| S5 | Load or parse error | "The project could not be loaded: <reason>." | Show output · Retry |
| S6 | Studio updated, panel out of date | "FeatherSpec Studio was updated. Reload to continue." | Reload |
| S7 | Restricted Mode | Note: "This workspace is in Restricted Mode. Views are read-only; agent actions are unavailable." | Manage Workspace Trust |

Edge cases:

- The panel is open when the active project changes → selection cleared (BR-03), the start view is unchanged.
- The selected spec is deleted or renumbered outside VS Code → selection cleared with the notice (BR-03).
- A per-area command runs while the panel is closed → the panel opens on that area.
- Project has zero specs → Spec Explorer shows "This project has no specs yet." (an empty list, not an error).

## 14. Acceptance criteria

Handoff IDs in brackets (PD-017).

- **AC-001** When the user runs "FeatherSpec Studio: Open", the system shall show the Studio panel
  in the editor area. [AC-005.1]
- **AC-002** When the user runs "FeatherSpec Studio: Open" while the Studio panel is already open,
  the system shall bring that panel to the front and shall not open a second one (BR-01).
- **AC-003** The system shall show a "FeatherSpec Studio" view in the Activity Bar containing the
  active project's name, an "Open Studio" entry and one entry per area. Activating an entry shall
  open the panel on that area.
- **AC-004** The system shall show a navigation in the panel that lists Mission Control, Spec
  Board, Spec Explorer and Agent Center. Activating an item shall show that area. [AC-005.2]
- **AC-005** When the user runs one of the four per-area commands, the system shall show the panel
  on that area, opening the panel first if it is closed.
- **AC-006** While an area's content is not yet delivered, the system shall show its name, one
  sentence on its purpose, and "Arrives with spec <NNNN>" (Mission Control 0006, Spec Board 0007,
  Agent Center 0012), and shall show no sample data (BR-04).
  > **Given** a project with three specs **When** the user opens Spec Board **Then** the area reads "Arrives with spec 0007" and shows no cards.
- **AC-007** The system shall list every spec of the active project in Spec Explorer, with
  number, title and board state as text. With zero specs, it shall show "This project has no specs yet."
- **AC-008** When the user selects a spec and then switches to any other area and back, the
  system shall still show that spec as selected. [AC-005.3]
- **AC-009** When the user closes and reopens the panel, or reloads VS Code, the system shall show
  the area last shown and the same selected spec. On the first open in a workspace, it shall show
  Mission Control (BR-02).
- **AC-010** If the active project changes or the selected spec is no longer in the project, then
  the system shall clear the selection. For a spec that is gone, it shall show "Spec <number> is no
  longer in the project".
  > **Given** spec 0003 is selected **When** its file is deleted outside VS Code **Then** no spec is selected and the notice names 0003.
- **AC-011** While no folder is open, the system shall show state S1 in the panel and in the Activity Bar view. [AC-005.5]
- **AC-012** While a folder is open but no FeatherSpec project is found, the system shall show state S2. [AC-005.5]
- **AC-013** While several projects are found and none is chosen, the system shall show state S3, and its action shall open the project selection of 0001.
- **AC-014** While project data is loading, the system shall show state S4 and shall never show an empty area without text.
- **AC-015** If loading or parsing the project fails, then the system shall show state S5 with the reason. "Retry" shall load again, and "Show output" shall open the "FeatherSpec Studio" Output channel. [AC-005.5]
- **AC-016** If the panel's UI version differs from the extension's version, then the system shall show state S6. "Reload" shall bring the panel up to date.
- **AC-017** While the workspace is in Restricted Mode, the system shall show the S7 note in addition to whatever the panel shows otherwise.
- **AC-018** When several states apply at once, the system shall show only the one with the highest precedence (BR-05).
- **AC-019** The system shall draw the panel and the tree in the colours of the current VS Code
  theme (Light, Dark, High Contrast). When the user switches the theme, the panel shall follow
  without being reopened. [AC-005.4] Checked by Gregor by hand in all three themes, plus a live switch.
- **AC-020** If the UI asks for a local file directly (not through a message to the extension),
  then the system shall refuse it. [AC-005.6]
  > **Given** the panel is open **When** a test inside the panel tries to load a file of the workspace by path **Then** the load fails and nothing is shown.
- **AC-021** If a message from the UI does not match the agreed message format, then the system
  shall ignore it, write one line to the Output channel, and leave the panel working.
- **AC-022** The system shall make every navigation item, tree entry, list row and state action
  reachable and usable with the keyboard alone, with a visible focus.
- **AC-023** The system shall name the current area, the selected spec, every board state and every
  state S1–S7 in text that a screen reader announces. No meaning shall be carried by colour alone.
- **AC-024** When the user runs "FeatherSpec Studio: Open", the system shall show the panel's frame
  (navigation plus the current area or state) within 1 second, without waiting for project data.
  Checked by Gregor on his machine.
- **AC-025** The system shall create, modify, rename or delete no file inside any workspace folder
  while the Studio is open or navigated (BR-06).

## 15. Technical notes for developers or AI agents

- As-is: `src/extension.ts` is the generator scaffold (`helloWorld`), `package.json` contributes
  no views and has `activationEvents: []`. Nothing of the shell exists. 0001–0004 are Drafts too.
- ADR-001 sets the shape (constraints, not criteria): one singleton editor panel with in-app
  routing and a serializer for restore (§2, §7); one native TreeView plus `viewsWelcome` (§2);
  React 19 with `--vscode-*` CSS variables and theme body classes (§3); CSP with a nonce, and
  `localResourceRoots` limited to `dist/webview` (§4); a second esbuild target (§5); a versioned,
  validated message protocol with `hello`/`snapshot`/`seq` (§6) — AC-016 and AC-021 rest on it;
  UI state via `getState`/`setState`, no `retainContextWhenHidden` (§7).
- Layers: `src/adapters/vscode/` (panel host, tree, commands), `src/shared/protocol/`,
  `src/webview/`. These are new top-level source folders, so `/sdd-architecture-update` runs in
  the same change set.
- For `/sdd-plan` to decide: where the UI state lives (webview state or workspace storage, so that
  AC-009 holds even when the panel was closed), how AC-020 is tested in the extension-host tests,
  and how AC-024 is measured.
- New dependencies (React, the webview test setup) are Ask-first (AGENTS.md).

## 16. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | 0001, 0002 and 0003 are implemented before this spec | Handoff §11.2 order puts FS-005 after FS-001…FS-004 | The spec list (AC-007) and states S2/S3/S5 have no data; a stub is needed |
| A-002 | The "Open setup guide" link and the texts of S1–S3 are the ones from 0001 | 0001 §9 and AC-015 define them; one wording avoids two messages for one situation | Tree, status bar and panel show different texts |
| A-003 | Remembering the area and selection per workspace is enough; no per-user memory across workspaces | Selection is scoped to a project (BR-03) | A user expecting the same area across workspaces sees Mission Control |
| A-004 | Restricted Mode affects nothing in this slice but the S7 note | This slice has no agent actions | Later specs must hide their own actions; 0008 owns that |

## 17. Open points

- OP-001: Interview note: at Gregor's explicit request, questions 2–8 were asked in one message, a one-off exception to the one-question rule of `/sdd-specify`. All suggestions were accepted as proposed ("all as suggested", 2026-11-16).
- OP-002: Confirm the 1-second budget in AC-024 against a measurement, in `/sdd-clarify` or the plan.

## 18. Definition of Ready

Goal, user, scope and out-of-scope are documented. The happy path, seven states and edge cases are
described. Every criterion is observable. Constraints come from ADR-001 and are marked as such.
Open points are visible.

## 19. Definition of Done

All FR-01…FR-08 are built. AC-001…AC-025 pass: automated tests for navigation, selection, states,
protocol and file isolation, plus Gregor's manual checks (AC-019, AC-024). No out-of-scope content
was added. The architecture snapshot and the Memory Bank are updated. Gregor accepts the result.

## 20. Recommended next steps

1. `/sdd-clarify` on this spec in a fresh session.
2. `/sdd-plan` after 0001–0003 have plans, because they deliver the data shown here.
