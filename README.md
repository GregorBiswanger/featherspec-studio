# FeatherSpec Studio

Visual command center for spec-driven development with [FeatherSpec](https://github.com/GregorBiswanger/featherspec), as a VS Code extension. This is an early build: project discovery, the spec model, the Studio shell, Mission Control, the Spec Board and the spec detail exist; Agent Center follows.

## Project discovery

When a workspace opens, Studio checks the root of every workspace folder and names the active FeatherSpec project in the status bar. It reads files and never changes them.

A folder is a **project** when its root has both:

- an `AGENTS.md` with a `FeatherSpecVersion:` line, and
- a `.specs/` directory.

Older projects without the version line still count (shown as version "unknown", with a hint to run `/sdd-featherspec-update`) when they also have a `.claude/commands/sdd-*.md` file. A folder with only one of the two markers is **incomplete**: the Output channel names what is missing, and the folder cannot become the active project. Anything else is not a project. Projects in subfolders are not detected: open the project folder itself.

- One project becomes active on its own. With several, the status bar reads "Select FeatherSpec project"; your choice is remembered per workspace.
- The status bar shows nothing in workspaces without a FeatherSpec project.
- Discovery details (path, verdict, version, diagnostics per folder) go to the Output channel "FeatherSpec Studio".
- Discovery runs again by itself when a folder is added or removed, or a root `AGENTS.md` or `.specs/` appears, changes or disappears.

## Spec model

For the active project Studio reads every spec, plan, archived plan and parallel-worker return note into one model, keeps it current while the files change, and reports what it cannot read or recognise (unreadable file, unknown content, duplicate, orphan, dangling link, unverified version). It reads files only and follows no symbolic links. Spec Explorer, the Spec Board and Mission Control in the Studio use it.

## Studio

Open it from the **FeatherSpec Studio** icon in the Activity Bar (a tree with the project name, "Open Studio" and the four areas) or with `FeatherSpec Studio: Open`. The Studio is one panel in the editor area with four areas: Mission Control, Spec Board, Spec Explorer and Agent Center. Spec Explorer lists the specs of the active project (number, title, board state); select one and it stays selected while you switch areas, close and reopen the panel, or reload the window. Agent Center says that it is not available in this version. The panel follows the VS Code theme, works with the keyboard and changes no file.

When there is nothing to show yet, the panel and the tree say why and offer the next action: no folder open, no project found, several projects, a remembered project that was not found, an incomplete project, loading, a load error ("Show output", "Retry") and Restricted Mode (a note; agent actions are unavailable).

## Mission Control

Mission Control is the first area. One quiet header line shows the folder name, the FeatherSpec version, the time of the last project update and the diagnostics (project-level and specs with diagnostics). Six stat tiles in board order show the specs per state (a derived state with its rule in words), a coloured bar shows the distribution, and one progress figure explains its rule (done specs with status Implemented or Baseline ÷ all specs without Deprecated); the open agent runs and the failed or interrupted ones; the specs that need attention as compact rows with their reasons (blocked, failed or interrupted run, waiting for you, diagnostic, review pending); and, side by side below, the agent runs and the ten latest activities. A figure the sources cannot deliver reads "not available". Every count, row and entry is a button: it opens the Spec Board (filtered), Spec Explorer or the Agent Center. The dashboard follows file and run changes while the panel is open and changes no file.

## Spec Board and spec detail

The Spec Board shows every spec as a card in six columns: Backlog, Ready, Active, Review, Done and Blocked. Columns fill the panel height, scroll on their own and keep their header (state icon, name, count) in view. A card shows number, title, one state chip (a derived state or a failing readiness check in words, its rule ID beside it), description, task and criteria progress bars, diagnostics, the latest agent run and the last change; "Move to…" sits small in its top-right corner. While you drag a card, the card and the column under the pointer are marked. Filter by state, provider or a named set of specs, and sort by number, title or last change; filters stay while Studio is open. Project problems appear in a banner above the columns. Select a card to open it in Spec Explorer. There the list and the detail scroll side by side; every detail section folds from its heading (the choice holds while the panel is open), offers one "Open file" in its heading row, and shows inline Markdown of the spec files (bold, italic, code, links as text with their target) safely as text.

Spec Explorer shows the detail of the selected spec beside the list: overview, requirements, acceptance criteria, plan and tasks, verification, related artifacts and agent history. "Open file" opens the spec, the plan or a return note in the editor at the right line. Studio only reads: it changes no file.

Move a card by dragging it to another column, with the "Move to…" button on the card (Shift+F10 or the context-menu key opens it from the keyboard), or with the command `FeatherSpec: Move Spec to…`. A move never writes a file: Studio checks the transition and, where an agent has to start, says so. Agent start is not available yet. Arrow keys move between cards; the board is one tab stop.

## Commands

- `FeatherSpec Studio: Open`: open the Studio panel (or bring it to the front) on the area last shown; `FeatherSpec Studio: Open Mission Control`, `… Open Spec Board`, `… Open Spec Explorer` and `… Open Agent Center` open it on that area.
- `FeatherSpec: Move Spec to…`: pick a spec and a target column; a refusal or hand-off is announced on the board or as a message.
- `FeatherSpec Studio: Rescan Project`: read the specs of the active project again.

- `FeatherSpec Studio: Select Project`: choose the active project (also opens from the status bar entry). With no project it offers the setup guide and a refresh.
- `FeatherSpec Studio: Refresh Project Discovery`: run discovery again.
- `FeatherSpec Studio: Clear Run History`: after a confirmation, remove the ended runs, their events and the spec status history of the active project. Runs still open are kept.

## Run history

Studio keeps a local record of agent runs, their events and the spec status history outside your workspace, per project, and never writes into your repository. Runs left open when VS Code closes show as `Interrupted` at the next start. Ended runs older than 90 days are removed at start; change this with the setting `featherspec-studio.runHistory.maxAgeDays` (whole days, at least 1). What is stored, where, how to delete it by hand and how storage errors behave: [docs/runtime-data.md](docs/runtime-data.md).

## Providers

Studio reaches coding agents only through one provider port (`src/core/ports/agentProvider.ts`) with a registry in front of the adapters. No real provider ships yet. To try Studio without an agent, an account or a network, switch on the **fake provider**: the setting `featherspec-studio.fakeProvider.enabled` (off by default) registers it without a reload and switching it off removes it again; a fake run already started continues. The setting `featherspec-studio.fakeProvider.scenario` picks what the fake does at each start (`happy-path` by default, also approvals, an input question, failures per category, a long run, unknown and duplicate events, a stream with no end). The fake never changes a file. The port, every capability, event kind and error category, and how to test against the fake: [docs/agent-provider-port.md](docs/agent-provider-port.md).

## Activation

Studio activates when the workspace root contains `AGENTS.md` or `.specs`, when VS Code restores the Studio panel, or when you run one of its commands. In a workspace without either, run a Studio command once to start it.

## Restricted Mode, Remote and virtual workspaces

Discovery works in Restricted Mode (it only reads files). Virtual workspaces such as vscode.dev are not supported. Remote, WSL and Dev Container workspaces should work because the extension runs where the files live; this has not been tried yet.

## Development

- `npm run test:unit`: fast unit tests (Vitest).
- `npm run compile`: type check, lint and bundle.
- `npm test`: extension-host tests; they download VS Code and need a display (CI runs them).
- Specs, plans and project context live in `.specs/` and `.memory-bank/`; `AGENTS.md` is the constitution.
