# FeatherSpec Studio

Visual command center for spec-driven development with [FeatherSpec](https://github.com/GregorBiswanger/featherspec), as a VS Code extension. This is an early build: the first slice, project discovery, exists; the Studio views follow.

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

## Commands

- `FeatherSpec Studio: Select Project`: choose the active project (also opens from the status bar entry). With no project it offers the setup guide and a refresh.
- `FeatherSpec Studio: Refresh Project Discovery`: run discovery again.

## Activation

Studio activates when the workspace root contains `AGENTS.md` or `.specs`, or when you run one of its commands. In a workspace without either, run a Studio command once to start it.

## Restricted Mode, Remote and virtual workspaces

Discovery works in Restricted Mode (it only reads files). Virtual workspaces such as vscode.dev are not supported. Remote, WSL and Dev Container workspaces should work because the extension runs where the files live; this has not been tried yet.

## Development

- `npm run test:unit`: fast unit tests (Vitest).
- `npm run compile`: type check, lint and bundle.
- `npm test`: extension-host tests; they download VS Code and need a display (CI runs them).
- Specs, plans and project context live in `.specs/` and `.memory-bank/`; `AGENTS.md` is the constitution.
