# Workspace Discovery & Project Recognition

**Status:** Draft
**Plan:** [0001-workspace-discovery-project-recognition.plan.md](0001-workspace-discovery-project-recognition.plan.md)

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
- Recognition by the two markers M1 and M2 (BR-01, [PD-031](../../docs/product/product-decisions.md)), including unstamped pre-1.2 projects (BR-02) (FR-001.2).
- Diagnostics for incomplete structures, written to an Output channel (FR-001.5).
- Choosing the active project when there are several, remembered per workspace (FR-001.4).
- Automatic re-detection while VS Code is open, plus a manual Refresh command.
- A status bar entry, a "Select FeatherSpec project" command and a no-project notification (FR-001.6).
- Read-only behaviour (FR-001.7).

### Out of scope

- Creating or migrating a FeatherSpec project — because the handoff excludes it (FS-001 Out of Scope) and PD-013 keeps Studio read-only.
- Projects nested in subfolders of a workspace folder (monorepos) — because Gregor decided this slice checks folder roots only; not now.
- Entries in VS Code's Problems panel — because Gregor wants diagnostics in the Output channel only in this slice; not now.
- Reading or parsing specs and plans — because that is spec 0002.
- Empty, loading and error states inside the Studio views — because spec 0005 owns them (its states S1–S3) and renders this spec's result there.
- Enforcing a minimum FeatherSpec version or checking compatibility — because PD-031 recognises older projects as they are (unstamped ones with a diagnostic) and 0002 reports unverified versions (PD-020); a minimum-version rule needs a product decision first.
- `.github/copilot-instructions.md` as the constitution location — because no real sample exists (featherspec-format.md §1.1: UNVERIFIED); out of scope until one does (PD-031).
- Virtual workspaces (for example vscode.dev) — because the target is VS Code Desktop (handoff §13 Compatibility).

## 5. Functional flow

1. The developer opens a workspace in VS Code.
2. Studio checks the root of every workspace folder for the markers M1 and M2.
3. Each folder gets one verdict: *project*, *incomplete* or *not a project*. A project may carry the attribute *legacy*.
4. Exactly one project → it becomes active and is remembered. Several → the user picks one (remembered). None → no active project.
5. The status bar entry shows the active project. The Output channel lists what was checked for each folder.
6. When a folder is added or removed, or a root `AGENTS.md` or root `.specs/` appears, changes or disappears, steps 2–5 run again without a reload.

## 6. Business rules

- **BR-01 Project (PD-031):** marker **M1** is an `AGENTS.md` at the folder root that contains a
  `FeatherSpecVersion:` line (BR-07). Marker **M2** is a `.specs/` directory at the folder root.
  A folder with both is a *project*.
- **BR-02 Legacy attribute (PD-031):** a root `AGENTS.md` without a `FeatherSpecVersion:` line, plus
  M2, plus at least one `.claude/commands/sdd-*.md`, is a *project* with the attribute *legacy* and
  the version "unknown". A legacy project counts as a project everywhere in this spec.
- **BR-03 Incomplete (PD-031):** exactly one of M1 and M2 is present and BR-02 does not apply. An
  incomplete folder cannot become the active project.
- **BR-04 Not a project:** neither M1 nor M2 is present. The folder gets no missing-prerequisite
  diagnostic. This covers `AGENTS.md` without a version line, `CLAUDE.md`, `.memory-bank/` alone,
  and `specs/` or `.specify/` (other SDD tools). `.memory-bank/`, `.claude/` and `.github/prompts/`
  are never required; `.claude/commands/sdd-*.md` counts only inside BR-02.
- **BR-05 Identity (PD-026):** a project is identified by the root-folder URI of its workspace
  folder. Paths are compared case-insensitively on Windows and case-sensitively elsewhere (OP-012).
  Its display name is the folder name.
- **BR-06 Active project (PD-033):** there is at most one active project per workspace. The active
  project is always remembered, also when it became active without asking. A switch to a different
  project happens only by the user's selection. The two cases without a selection are AC-007
  (single project) and the return of the remembered project in AC-010.
- **BR-07 Version value (PD-032):** the version line is the first line of `AGENTS.md` matching
  `FeatherSpecVersion:` followed by a value, wherever it stands in the file. The value is the first
  token; a trailing `# comment` is ignored; the value is shown as written. An empty value gives the
  version "unknown" plus a diagnostic. A second such line: the first wins, plus a diagnostic.

## 7. Functional requirements

| Handoff | Requirement | Criteria |
| --- | --- | --- |
| FR-001.1 | Inspect every folder of the open VS Code workspace | AC-001, AC-019 |
| FR-001.2 | Recognise projects by the verified markers (BR-01, BR-02, BR-07) | AC-001, AC-002, AC-004, AC-006, AC-021 |
| FR-001.3 | Support multi-root workspaces | AC-001, AC-008, AC-012 |
| FR-001.4 | Let the user choose among several projects | AC-007, AC-008, AC-009, AC-010 |
| FR-001.5 | Diagnose incomplete or invalid structures | AC-003, AC-016, AC-017, AC-021 |
| FR-001.6 | Show a helpful empty state | AC-015, AC-020 |
| FR-001.7 | Never change project files | AC-011 |
| — | Re-detect without a reload | AC-013 |
| — | Show the active project | AC-014 |
| — | Detect within the time budget | AC-018 |
| — | Work in Restricted Mode (ADR-001 §14) | AC-022 |

## 8. Data requirements

- Read only: the existence of the marker paths, plus the text of the root `AGENTS.md` to find the
  `FeatherSpecVersion:` line.
- Discovery result per folder: root-folder URI, display name, verdict, legacy attribute, version
  (value as written, or "unknown"), diagnostics. Consumers: spec 0002 (project root for its
  project-relative paths, PD-018; version), spec 0004 (store key, PD-026), spec 0005.
- Persisted: only the remembered project per workspace, stored outside every workspace folder
  (PD-013). Nothing sensitive is read or stored.

## 9. UI/UX requirements

- **Status bar entry** (UI text in English, PD-016): shown only under the conditions of AC-020.
  Active project → its name and version. Several projects and none remembered → "Select FeatherSpec
  project". No project reported, or the remembered project is missing → "FeatherSpec project not
  found". Clicking it runs the select command. Its text never depends on colour alone (handoff §13).
- **Commands:** "FeatherSpec Studio: Select Project" and "FeatherSpec Studio: Refresh Project Discovery".
- **Output channel "FeatherSpec Studio":** one block per discovery run. It lists every folder
  with path, verdict, version and diagnostics. A *diagnostic* is one line in the entry of the folder
  it concerns; a *missing prerequisite* is the diagnostic that names an absent marker. A folder
  reported as *not a project* gets only the hint "open the project folder itself".
- **No-project notification:** a VS Code notification "No FeatherSpec project found in this
  workspace" with the actions "Open setup guide" (link: A-005) and "Refresh". It appears when the
  user asks (AC-015). Spec 0005 shows the same texts inside the Studio views.

## 10. Interfaces and integrations

- VS Code workspace (folders, folder-change events, file-change events, workspace state, status
  bar, commands, Output channel, notifications). Studio never contacts a network service. "Open
  setup guide" hands a link to the user's browser.

## 11. Security, permissions and privacy

- Discovery reads only the marker paths and the root `AGENTS.md` of each workspace folder
  (handoff §13 Security: workspace access stays within the intended context).
- No telemetry. The Output channel shows paths, verdicts, the version value and diagnostics; no
  other file content is written to logs.

## 12. Non-functional requirements

- Time budget: AC-018.
- Discovery does not block the editor while it runs (handoff §13 Performance). No criterion decides
  this yet: OP-008.

## 13. Error cases and edge cases

- No folder is open → "Open a folder to use FeatherSpec Studio" (AC-015).
- `AGENTS.md` cannot be read (permissions, locked) → AC-017.
- `FeatherSpecVersion:` with a value that is not a semantic version, an empty value, or a second
  version line → AC-021.
- The remembered project loses a marker (for example `AGENTS.md` deleted during an edit) and comes
  back → AC-010.
- Several file changes in quick succession, or a change during a running discovery → the shown
  result matches the final state on disk (AC-013), one entry per folder (AC-012).
- A change to `.claude/commands/sdd-*.md` alone triggers no rerun (PD-033); the legacy attribute
  follows at the next run.

## 14. Acceptance criteria

Handoff IDs in brackets (PD-017). Fixtures: featherspec-format.md §11 where named there; the
hand-made ones are listed in §15.

- **AC-001** When discovery runs, the system shall report every workspace folder whose root meets BR-01 as a *project*, with its `FeatherSpecVersion` value (BR-07). [AC-001.1]
  > **Given** the `fs110-de-active-review` fixture opened as a workspace **When** discovery runs **Then** it is reported as *project*, version `1.10.0`.
- **AC-002** The system shall report a folder that meets BR-04 as *not a project* and shall write no missing-prerequisite diagnostic for it. [AC-001.2]
  > **Given** three fixtures (`AGENTS.md` only without a version line; `specs/` + `.specify/`; `.memory-bank/` only) **When** discovery runs **Then** none is reported as a project or as incomplete.
- **AC-003** If a folder meets BR-03, then the system shall report it as *incomplete*, name each missing marker in the Output channel, and exclude it from the project list of the select command. [AC-001.4]
- **AC-004** If a folder meets BR-02, then the system shall report it as a *project* with the attribute *legacy*, the version "unknown" and a diagnostic recommending `/sdd-featherspec-update`.
- **AC-005** _Withdrawn 2026-11-16 (PD-031): the `.github/copilot-instructions.md` location is out of scope. The ID is not reused._
- **AC-006** The system shall evaluate the markers only at their paths below the root of each workspace folder (BR-01, BR-02). The system shall not report a FeatherSpec project located in a subfolder.
- **AC-007** When discovery reports exactly one project and the workspace has no remembered project, the system shall make that project active without asking and remember it.
- **AC-008** While two or more projects are reported and the workspace has no remembered project, the system shall have no active project and the status bar entry shall read "Select FeatherSpec project". The select command shall list every reported project. [AC-001.3]
- **AC-009** When the user selects a project, the system shall make it active and remember it for this workspace. After a VS Code reload it shall be active again without asking. The system shall store the remembered value outside every workspace folder.
- **AC-010** If the remembered project is no longer reported as a project, then the system shall have no active project, the status bar entry shall read "FeatherSpec project not found", and the system shall make no other project active until the user selects one. When the remembered project is reported as a project again and the user has selected no other project meanwhile, the system shall make it active again without asking.
- **AC-011** The system shall create, modify, rename or delete no file or folder inside any workspace folder during discovery, selection or refresh. [AC-001.5]
  > **Given** a fixture tree with recorded paths, sizes and modification times **When** discovery, refresh and selection run **Then** the recorded tree is unchanged.
- **AC-012** When discovery runs again (refresh, re-detection or reload), the system shall report exactly one entry per workspace folder (BR-05) in the discovery result, in the list of the select command and within each Output channel block. [AC-001.6]
- **AC-013** While Studio is active (activated at open by AC-019, or later by one of its commands), when a workspace folder is added or removed, or the root `AGENTS.md` of a workspace folder appears, changes or disappears, or its root `.specs/` directory appears or disappears, the system shall rerun discovery and update the status bar entry and the Output channel without a reload. A change inside `.specs/` shall not trigger a rerun. After the last change, the status bar entry and the newest Output channel block shall match the state on disk.
- **AC-014** While a project is active, the status bar entry shall show its folder name and version ("unknown" for a legacy project or an empty value), and clicking the entry shall open the select command.
- **AC-015** When the user runs the select command or clicks the status bar entry and no project is reported, the system shall show the notification "No FeatherSpec project found in this workspace" with the actions "Open setup guide" and "Refresh". "Open setup guide" shall open the link of A-005. With no folder open, the system shall show "Open a folder to use FeatherSpec Studio" instead.
- **AC-016** When a discovery run finishes, the system shall write to the Output channel "FeatherSpec Studio", for each workspace folder: path, verdict, version and its diagnostics. For a folder reported as *not a project* the entry shall contain the hint "open the project folder itself". The system shall create no entry in the Problems panel.
- **AC-017** If `AGENTS.md` cannot be read, then the system shall write the folder path and the reason to the Output channel, report that folder as *not a project*, and finish discovery for the remaining folders. (Verdict under review: OP-004.)
- **AC-018** The system shall finish one discovery run within 2 seconds for a workspace of up to 5 folders on a local file system, measured from the start of the run until the discovery result (§8) for all folders exists. This criterion sets no budget beyond 5 folders. An automated timing test on the fixture set checks it.
- **AC-019** When VS Code opens a workspace in which at least one folder is a *project* or *incomplete*, the system shall run discovery and show its result without any user action. [AC-001.1]
- **AC-020** While no workspace folder is reported as *project* or *incomplete* and the workspace has no remembered project, the system shall show no status bar entry and, during automatic discovery, no notification (PD-033).
- **AC-021** The system shall take the version from the first `FeatherSpecVersion:` line of `AGENTS.md`: the first token of the value, without a trailing `# comment` (BR-07). If the value is empty, then the system shall report the version "unknown" and write a diagnostic. If a second such line exists, then the system shall use the first and write a diagnostic. If the value is not a semantic version, then the system shall report the folder with the value as written and write a diagnostic naming the value.
  > **Given** an `AGENTS.md` with the line `FeatherSpecVersion: 1.10.0 # managed by /sdd-featherspec-update` **When** discovery runs **Then** the version is `1.10.0` and no diagnostic is written.
- **AC-022** While the workspace is not trusted (VS Code Restricted Mode), the system shall run discovery and show the status bar entry, the select command and the Output channel as in a trusted workspace.

## 15. Technical notes for developers or AI agents

- As-is: `src/extension.ts` is the generator scaffold (a `helloWorld` command); `package.json` has
  `activationEvents: []`. Nothing for discovery exists yet. The first plan introduces
  `npm run test:unit` (`techContext.md`).
- Architecture (`AGENTS.md` snapshot): the marker evaluation is a pure core function over a
  read-only file-system port, with no `vscode` import. The VS Code adapter supplies folders, file
  reads, change events, workspace state, status bar, commands and the Output channel.
- Marker facts: PD-031 and PD-032 (they narrow [featherspec-format.md](../../docs/discovery/featherspec-format.md)
  §1.1). Fixtures from §11: valid projects, `fs-legacy-unstamped`, `AGENTS.md` only, `specs/` +
  `.specify/`, and `.specs/` only (under PD-031 this one is *incomplete*). Hand-made: `.memory-bank/`
  only, M1 only, version-line variants (comment, empty, second line, not semver), unreadable
  `AGENTS.md`, nested project.
- Already decided elsewhere, not for `/sdd-plan` to reopen: the remembered project lives in VS Code
  workspace state (ADR-002: "Memento only for UI hints such as last selected project"); change
  events are debounced and coalesced (ADR-001 §9); `capabilities.untrustedWorkspaces: limited` and
  `extensionKind: workspace` (ADR-001 §14). Where the PD register and an ADR disagree, the PD
  register wins (Gregor, 2026-11-16).
- Activation events (decided 2026-11-16 by Gregor, OP-005): `workspaceContains:AGENTS.md` and
  `workspaceContains:.specs`, plus the implicit activation by Studio's own commands; no
  `onStartupFinished`, ADR-001 §8 stays. A workspace without a marker at open activates Studio only
  when the user runs a Studio command (later also the Studio view, 0005); live re-detection
  (AC-013) holds from then on.
- AC-022 cannot run in an extension-host test: `@vscode/test-electron` always launches with
  `--disable-workspace-trust`. It is decided by a manifest unit test plus Gregor's manual check in
  Restricted Mode (Gregor, 2026-11-16).
- Restatement of the read-only rule (source: PD-013): Studio never writes FeatherSpec artifacts.

## 16. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | Incomplete folders (BR-03) cannot become the active project | Confirmed by Gregor 2026-11-16 (PD-031). Spec 0002 needs both markers to read specs | 0002 would have to handle a project without `.specs/` or without a constitution |
| A-002 | Discovery runs in VS Code Restricted Mode (untrusted workspaces) | ADR-001 §14 declares `untrustedWorkspaces: limited` with read-only views working; discovery only reads files. Now AC-022 | In untrusted workspaces Studio would show nothing |
| A-003 | Remote and container workspaces work through VS Code's file API without extra behaviour | ADR-001 §14: `extensionKind: workspace`, the extension runs where the files live. Not yet tried on a remote setup | Detection fails in remote setups and the limitation must be documented (§19) |
| A-004 | Studio stays silent (no status bar entry, no notification) in workspaces where no folder is a project or incomplete | Confirmed by Gregor 2026-11-16 (PD-033). Noise in unrelated repositories hurts DevEx | Users of non-FeatherSpec workspaces get no hint that Studio exists |
| A-005 | The setup guide link targets the FeatherSpec wiki home (`https://github.com/GregorBiswanger/featherspec/wiki`) | Gregor confirmed the "GitHub wiki"; no specific page was named (OP-011) | The link lands on a less helpful page |

## 17. Open points

Resolved:

- OP-001: resolved 2026-11-16. Gregor confirmed A-001 and A-004 as written (PD-031, PD-033).
- OP-002: interview note. Questions 2–7 were asked in one message at Gregor's explicit request, a one-off exception to the one-question rule of `/sdd-specify`.
- OP-003: `/sdd-clarify` 2026-11-16, 39 findings. Gregor decided the six blocking ones in the PD register and delegated the rest (one-off exception to the one-finding-per-message walkthrough, at his request). Resolved, 29:
  - By PD-031: verdict model and markers (1.1, 2.1, 2.2, 2.3, 2.5), fixture list (1.6), legacy location out of scope (6.7), A-001 (6.1), minimum-version reason (6.6).
  - By PD-032: version line and value (2.6, 3.7, 5.5) → BR-07, AC-021.
  - By PD-033: remembered project, status text precedence, return of a lost project (1.2, 2.4, 5.1), rerun triggers and final state (5.2), A-004 (6.2).
  - By ADR-001/ADR-002: storage and "for `/sdd-plan` to decide" (4.1, 6.10), Restricted Mode → AC-022 (6.4), remote basis and DoD line (6.5).
  - Wording and testability: log content (1.4), hint for *not a project* (1.5), empty state vs notification (2.7), diagnostic vs missing prerequisite (2.8), AC-010 text (3.4), AC-006 (3.5), AC-012 (3.6), AC-009 actor (3.9). Partly: AC-019 trigger (3.1), AC-013 final state (3.2), AC-018 measuring point (3.3); their rest is OP-005…OP-007.
  - Three readings made while applying the decisions; say so if one is wrong: (a) an empty-value version line still counts as M1 (PD-031 wording); (b) the status bar reads "FeatherSpec project not found" when only *incomplete* folders exist (the only fitting text in §9); (c) the "not found" entry of a missing remembered project also stays when no folder is a project or incomplete, because PD-033 ends it only by a selection or the return.

- OP-005: resolved 2026-11-16 by Gregor during `/sdd-plan`. AC-013 holds once Studio is active; no `onStartupFinished`, ADR-001 §8 stays (§15).

Open, none blocks planning (clarify finding in brackets):

- OP-004 [1.3]: an unreadable `AGENTS.md` beside `.specs/` is *not a project* by AC-017, while the markers alone would say *incomplete*. Recommendation: *incomplete* plus the read-error diagnostic, so the status bar shows it (§2: no silent failure). Until decided, AC-017 stands.
- OP-006 [3.2]: AC-013 has no deadline. Recommendation: status bar and Output channel updated within 2 seconds after the change event reaches Studio (the AC-018 budget).
- OP-007 [3.3, 6.8]: the 2 seconds and 5 folders of AC-018 have no source, and no reference machine is named. Recommendation: treat them as working thresholds like PD-035 and re-measure on Gregor's sample projects.
- OP-008 [3.8]: "does not block the editor" (§12) has no observation that could prove it false. Recommendation: drop it as a requirement and keep a design note in §15 (file access is asynchronous).
- OP-009 [5.3]: a discovery run that never finishes (hung network share). Recommendation: accept as a documented limitation in this slice, no timeout.
- OP-010 [5.4]: two workspace folders with the same folder name look alike. Recommendation: the select list shows the folder path beside the name; the status bar keeps the name.
- OP-011 [6.3]: A-005, the exact setup guide page. Recommendation: keep the wiki home until a page is named.
- OP-012 [6.9]: BR-05's case rule has no source, and the default macOS file system is case-insensitive. Recommendation: compare root-folder URIs as VS Code reports them, with no OS table of our own.

## 18. Definition of Ready

Goal, user, scope and out-of-scope are documented. The business rules (BR-01…BR-07) are testable.
The happy path and edge cases are described. Every criterion is decidable by a test or by
Gregor's manual check. Assumptions and open points are visible. Clarified on 2026-11-16; the open
points OP-004 and OP-006…OP-012 do not block planning.

## 19. Definition of Done

All criteria pass. The unit tests on the fixtures and the extension-host tests run green. Nothing
out of scope was built. No file in a workspace folder was changed. Diagnostics and error handling
exist in the Output channel. Assumptions are verified or documented. Any limitation found in
Remote, WSL or Dev Container workspaces is documented in the README (handoff §13 Compatibility).
The `architecture:` snapshot is updated for the new modules. Gregor accepted the result after his
manual check on his sample projects.

## 20. Recommended next steps

1. Gregor reads the plan [0001-workspace-discovery-project-recognition.plan.md](0001-workspace-discovery-project-recognition.plan.md).
2. Gregor answers OP-004 and OP-006…OP-012 when convenient; `/sdd-specify` (revise mode) applies the answers.
