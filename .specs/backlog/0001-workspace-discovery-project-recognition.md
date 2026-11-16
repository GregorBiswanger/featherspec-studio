# Workspace Discovery & Project Recognition

**Status:** Draft
**Plan:** _none yet_

## 1. Summary

When VS Code opens a workspace, FeatherSpec Studio finds out which workspace folders are FeatherSpec
projects. It uses the verified project markers for this, never guesses, and changes no file. One
project becomes active, either automatically or by the user's choice. The result shows up in a status
bar entry and in an Output channel. All later Studio features build on it. Handoff reference:
FS-001 ([po-handoff.md](../../docs/product/po-handoff.md) §10, §5.1 steps 1–2, §13).

## 2. Goal and problem

Studio must recognise real FeatherSpec projects without asking for configuration. It must never treat
an ordinary repository as one, for example a repository with a generic `AGENTS.md` or another SDD
tool's `specs/` folder. If a project is half set up, the user must see what is missing instead of
getting a silent failure. Success: the user opens a FeatherSpec project and Studio names it as the
active project without any setup step.

## 3. Users and roles

One role: the developer working in VS Code Desktop (see `projectbrief.md`). There are no permission
differences.

## 4. Scope

### In scope

- Detection at the root of every workspace folder, single-root and multi-root (FR-001.1, FR-001.3).
- Recognition by the verified markers in [featherspec-format.md](../../docs/discovery/featherspec-format.md) §1.1, including legacy forms (FR-001.2).
- Diagnostics for incomplete structures, written to an Output channel (FR-001.5).
- Choosing the active project when there are several, remembered per workspace (FR-001.4).
- Automatic re-detection while VS Code is open, plus a manual Refresh command.
- A status bar entry, a "Select FeatherSpec project" command and an empty state (FR-001.6).
- Read-only behaviour (FR-001.7).

### Out of scope

- Creating or migrating a FeatherSpec project — because the handoff excludes it (FS-001 Out of Scope) and PD-013 keeps Studio read-only.
- Projects nested in subfolders of a workspace folder (monorepos) — because Gregor decided this slice checks folder roots only; not now.
- Entries in VS Code's Problems panel — because Gregor wants diagnostics in the Output channel only in this slice; not now.
- Reading or parsing specs and plans — because that is spec 0002.
- The Studio UI's own empty, loading and error states — because spec 0005 owns them and will render this spec's result.
- Enforcing a minimum FeatherSpec version or checking compatibility — because Gregor decided older projects are recognised with a diagnostic; this needs a decision first.
- Virtual workspaces (for example vscode.dev) — because the target is VS Code Desktop (handoff §13 Compatibility).

## 5. Functional flow

1. The developer opens a workspace in VS Code.
2. Studio checks the root of every workspace folder for FeatherSpec markers.
3. Each folder gets one verdict: *project*, *project (legacy)*, *incomplete* or *not a project*.
4. Exactly one project → it becomes active. Several → the user picks one (remembered). None → empty state.
5. The status bar entry shows the active project. The Output channel lists what was checked for each folder.
6. When folders or marker files change, steps 2–5 run again without a reload.

## 6. Business rules

- **BR-01 Project:** the folder root holds a constitution with a `FeatherSpecVersion: <value>` line
  inside its *Repository Settings* block, **and** a `.specs/` folder with at least one of `backlog/`,
  `active/`, `done/`. The constitution is `AGENTS.md`. The legacy location
  `.github/copilot-instructions.md` is used only when `AGENTS.md` carries no such line.
- **BR-02 Legacy (pre-1.2):** the constitution has no `FeatherSpecVersion:` line, but
  `.claude/commands/sdd-*.md` exists and the `.specs/` marker from BR-01 is present. Studio
  recognises the project with the version "unknown".
- **BR-03 Incomplete:** exactly one of the two BR-01 markers is present (and BR-02 does not apply).
  The folder is not offered as an active project.
- **BR-04 Not a project, no diagnostic:** neither marker is present. This covers `AGENTS.md`
  without a version line, `CLAUDE.md`, `.memory-bank/` alone, `specs/` or `.specify/` (other SDD
  tools), and `.specs/` without any lifecycle folder. `.memory-bank/`, `.claude/` and `.github/prompts/`
  only ever support a verdict; they are never required.
- **BR-05 Identity:** a project is identified by the path of its workspace folder. Paths are compared
  case-insensitively on Windows and case-sensitively elsewhere. Its display name is the folder name.
- **BR-06 Active project:** there is at most one active project per workspace. A switch to a
  different project happens only by the user's selection. The one exception is the
  single-project case in AC-007.

## 7. Functional requirements

| Handoff | Requirement | Criteria |
| --- | --- | --- |
| FR-001.1 | Inspect every folder of the open VS Code workspace | AC-001, AC-019 |
| FR-001.2 | Recognise projects by the verified markers (BR-01, BR-02) | AC-001, AC-002, AC-004, AC-005, AC-006 |
| FR-001.3 | Support multi-root workspaces | AC-001, AC-008, AC-012 |
| FR-001.4 | Let the user choose among several projects | AC-007, AC-008, AC-009, AC-010 |
| FR-001.5 | Diagnose incomplete or invalid structures | AC-003, AC-016, AC-017 |
| FR-001.6 | Show a helpful empty state | AC-015, AC-020 |
| FR-001.7 | Never change project files | AC-011 |
| — | Re-detect without a reload | AC-013 |
| — | Show the active project | AC-014 |
| — | Detect within the time budget | AC-018 |

## 8. Data requirements

- Read only: the existence of the marker paths, plus the text of the constitution file(s) to find
  the `FeatherSpecVersion:` line.
- Discovery result per folder: path, display name, verdict, version (value as written, or
  "unknown"), constitution location, missing prerequisites. Spec 0002 and spec 0005 consume this.
- Persisted: only the remembered active project per workspace, stored outside every workspace
  folder (PD-003, PD-013). Nothing sensitive is read or stored.

## 9. UI/UX requirements

- **Status bar entry** (UI text in English, PD-016): the active project's name and version, or
  "Select FeatherSpec project", or "FeatherSpec project not found". Clicking it runs the select
  command. Its text never depends on colour alone (handoff §13).
- **Commands:** "FeatherSpec Studio: Select Project" and "FeatherSpec Studio: Refresh Project Discovery".
- **Output channel "FeatherSpec Studio":** one block per discovery run. It lists every folder
  with its verdict and missing prerequisites, and points to "open the project folder itself" when a
  folder holds no markers at its root.
- **Empty state:** the message "No FeatherSpec project found in this workspace" with the actions
  "Open setup guide" and "Refresh".

## 10. Interfaces and integrations

- VS Code workspace (folders, folder-change events, file-change events, workspace storage, status
  bar, commands, Output channel, messages). Studio never contacts a network service. "Open setup
  guide" hands a link to the user's browser.

## 11. Security, permissions and privacy

- Discovery reads only the marker paths and the constitution file(s) of each workspace folder
  (handoff §13 Security: workspace access stays within the intended context).
- No telemetry, and no file content written to logs. The Output channel shows paths and verdicts only.

## 12. Non-functional requirements

- Time budget: AC-018.
- Discovery does not block the editor while it runs (handoff §13 Performance).

## 13. Error cases and edge cases

- No folder is open → empty state with "Open a folder to use FeatherSpec Studio" (AC-015).
- A marker file cannot be read (permissions, locked) → AC-017.
- `FeatherSpecVersion:` with an unusual value (not semver) → the folder is recognised, the value is
  shown as written, and a diagnostic notes the unrecognised value (AC-016).
- Both `AGENTS.md` and `.github/copilot-instructions.md` carry a version line → `AGENTS.md` wins (BR-01).
- The active project loses a marker (for example `AGENTS.md` deleted during an edit) → AC-010.
- Several file changes in quick succession → one discovery result. No duplicates (AC-012).

## 14. Acceptance criteria

Handoff IDs in brackets (PD-017). The fixtures are the ones named in featherspec-format.md §11.

- **AC-001** When discovery runs, the system shall report every workspace folder whose root meets BR-01 as a *project*, with its `FeatherSpecVersion` value. [AC-001.1]
  > **Given** the `fs110-de-active-review` fixture opened as a workspace **When** discovery runs **Then** it is reported as *project*, version `1.10.0`.
- **AC-002** The system shall report a folder that meets BR-04 as *not a project* and shall write no missing-prerequisite diagnostic for it. [AC-001.2]
  > **Given** the three `not-featherspec` fixtures (`AGENTS.md` only without a version line; `specs/` + `.specify/`; generic `.memory-bank/`) **When** discovery runs **Then** none is reported as a project or as incomplete.
- **AC-003** If a folder meets BR-03, then the system shall report it as *incomplete*, name each missing marker in the Output channel, and exclude it from the project list of the select command. [AC-001.4]
- **AC-004** If a folder meets BR-02, then the system shall report it as *project (legacy)* with the version "unknown" and a diagnostic recommending `/sdd-featherspec-update`.
- **AC-005** If the version line is found only in `.github/copilot-instructions.md`, then the system shall report the folder as *project (legacy)* with that version and a diagnostic naming the legacy constitution location.
- **AC-006** The system shall inspect only the root of each workspace folder. The system shall not report a FeatherSpec project located in a subfolder.
- **AC-007** When discovery reports exactly one project and the workspace has no remembered active project, the system shall make that project active without asking.
- **AC-008** While two or more projects are reported and no remembered active project is among them, the system shall have no active project and the status bar entry shall read "Select FeatherSpec project". The select command shall list every reported project. [AC-001.3]
- **AC-009** When the user selects a project, the system shall make it active and remember it for this workspace. After a VS Code reload it shall be active again without asking. The remembered value shall be stored outside every workspace folder.
- **AC-010** If the remembered or active project is no longer reported as a project, then the system shall have no active project. The status bar entry shall say that the project was not found, and the system shall make no other project active until the user selects one.
- **AC-011** The system shall create, modify, rename or delete no file or folder inside any workspace folder during discovery, selection or refresh. [AC-001.5]
  > **Given** a fixture tree with recorded paths, sizes and modification times **When** discovery, refresh and selection run **Then** the recorded tree is unchanged.
- **AC-012** When discovery runs again (refresh, re-detection or reload), the system shall report exactly one entry per workspace folder path (BR-05). [AC-001.6]
- **AC-013** When a workspace folder is added or removed, or a marker file (`AGENTS.md`, `.github/copilot-instructions.md`, `.specs/backlog|active|done`, `.claude/commands/sdd-*.md`) is created, changed or deleted, the system shall rerun discovery and update the status bar entry and the Output channel without a reload.
- **AC-014** While a project is active, the status bar entry shall show its folder name and version ("unknown" for BR-02), and clicking the entry shall open the select command.
- **AC-015** When the user runs the select command or clicks the status bar entry and no project is reported, the system shall show "No FeatherSpec project found in this workspace" with the actions "Open setup guide" and "Refresh". With no folder open, it shall show "Open a folder to use FeatherSpec Studio" instead.
- **AC-016** When a discovery run finishes, the system shall write to the Output channel "FeatherSpec Studio", for each workspace folder: path, verdict, version, and missing prerequisites or diagnostics. The system shall create no entry in the Problems panel.
- **AC-017** If a marker file cannot be read, then the system shall write the folder path and the reason to the Output channel, report that folder as *not a project*, and finish discovery for the remaining folders.
- **AC-018** The system shall finish one discovery run within 2 seconds for a workspace of up to 5 folders, measured from the start of the run until the result is available. Checked by an automated timing test on the fixture set and by Gregor by hand on his sample projects.
- **AC-019** When the extension is activated in a workspace with at least one folder, the system shall run discovery without any user action. [AC-001.1]
- **AC-020** While no workspace folder holds any FeatherSpec marker, the system shall show no status bar entry and no pop-up message during automatic discovery (assumption A-004).

## 15. Technical notes for developers or AI agents

- As-is: `src/extension.ts` is the generator scaffold (a `helloWorld` command); `package.json` has
  `activationEvents: []`. Nothing for discovery exists yet. The first plan introduces
  `npm run test:unit` (`techContext.md`).
- Architecture (`AGENTS.md` snapshot): the marker evaluation is a pure core function over a
  read-only file-system port, with no `vscode` import. The VS Code adapter supplies folders, file
  reads, change events, workspace storage, status bar, commands and the Output channel.
- Marker facts and fixtures: [featherspec-format.md](../../docs/discovery/featherspec-format.md)
  §1.1 and §11. Fixtures needed: valid projects, `not-featherspec` ×3, `fs-legacy-unstamped`, plus
  hand-made `incomplete` (each marker alone), legacy copilot-instructions, unreadable file, nested project.
- For `/sdd-plan` to decide: activation events (they must satisfy AC-019 and AC-020), the storage
  for the remembered project (VS Code workspace state is a candidate; spec 0004 later owns runtime
  storage), how change events are coalesced, and how the time in AC-018 is measured.
- Restatement of the read-only rule (source: PD-013): Studio never writes FeatherSpec artifacts.

## 16. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | Incomplete folders (BR-03) cannot become the active project | Spec 0002 needs both markers to read specs. Gregor confirmed that diagnostics are shown, but not how selection should treat these folders | 0002 would have to handle a project without `.specs/` or without a constitution |
| A-002 | Discovery runs in VS Code Restricted Mode (untrusted workspaces) | It only reads files and runs no code from the workspace | In untrusted workspaces Studio would show nothing |
| A-003 | Remote and container workspaces work through VS Code's file API without extra behaviour | VS Code exposes workspace files there the same way; handoff §13 only asks for limitations to be documented | Detection fails in remote setups and the limitation must be documented |
| A-004 | Studio stays silent (no status bar entry, no pop-up) in workspaces with no FeatherSpec marker | The extension may be active in every workspace, and noise in unrelated repositories hurts DevEx. Not asked in the interview | Users of non-FeatherSpec workspaces get no hint that Studio exists |
| A-005 | The setup guide link targets the FeatherSpec wiki home (`https://github.com/GregorBiswanger/featherspec/wiki`) | Gregor confirmed the "GitHub wiki"; no specific page was named | The link lands on a less helpful page |

## 17. Open points

- OP-001: Confirm A-001 and A-004 in `/sdd-clarify`. Neither was asked in the interview.
- OP-002: Interview note: questions 2–7 were asked in one message at Gregor's explicit request. This was a one-off exception to the one-question rule of `/sdd-specify`.

## 18. Definition of Ready

Goal, user, scope and out-of-scope are documented. The business rules (BR-01…BR-06) are testable.
The happy path and edge cases are described. Every criterion is decidable by a test or by
Gregor's manual check. Assumptions and open points are visible. Ready for `/sdd-clarify`.

## 19. Definition of Done

All criteria pass. The unit tests on the fixtures and the extension-host tests run green. Nothing
out of scope was built. No file in a workspace folder was changed. Diagnostics and error handling
exist in the Output channel. Assumptions are verified or documented. The `architecture:` snapshot is
updated for the new modules. Gregor accepted the result after his manual check on his sample projects.

## 20. Recommended next steps

1. `/sdd-clarify` on this spec, in a fresh session.
2. `/sdd-plan`: it introduces `npm run test:unit` and the fixture set.
