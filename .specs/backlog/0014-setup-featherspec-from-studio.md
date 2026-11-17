# Set Up FeatherSpec from the Studio

**Status:** Draft
**Plan:** _none yet_

Basis: Gregor's request of 2026-11-17 after his first local test of the VSIX. Decisions
([product-decisions.md](../../docs/product/product-decisions.md)): PD-049, PD-050, PD-051, PD-052,
PD-016 (English UI), PD-013 (read-only, amended here). Depends on: 0001 (verdicts, Output
channel, re-detection), 0005 (Activity Bar view, panel states S2 and S9). Amends statements of
0001 and 0005 (§5); it restates none of them.

## 1. Summary

In a folder that is no FeatherSpec project yet, the Studio view offers **Set up FeatherSpec**,
the way Source Control offers "Initialize Repository". One click, one confirmation, and the
template files of the latest FeatherSpec release are in the folder — files only, no clone, no
Git history, no `git init`. Existing files are never overwritten: `.gitignore` and
`.vscode/settings.json` get their missing entries, every other existing file stays as it is and
the user gets a ready-made merge prompt for their AI assistant. Afterwards the Studio tells the
user to run `/sdd-setup` in the AI assistant of their choice; it does not start that chat.

## 2. Goal and problem

Today a developer who opens the Studio in a plain folder sees "No FeatherSpec project found"
and must copy the template by hand (`degit` command of the FeatherSpec README, or the copy list
of "Already have a codebase?"). That is the first contact with the product and it sends the
user away to a terminal. Goal: from "no project" to "ready for `/sdd-setup`" without leaving
VS Code, without losing a single line of the user's own files. Accepted when Gregor runs the
Hands-On walkthrough in a fresh `tip-splitter` folder starting from this button (M-2).

## 3. Users and roles

- **Developer** who wants to start working spec-driven in an existing or empty folder. One
  role ("the user"); permissions come from VS Code Workspace Trust only (§11).

## 4. Scope

### In scope

- The action "Set up FeatherSpec" in the panel states S2 and S9 (Activity Bar view and panel)
  and the command "FeatherSpec Studio: Set Up FeatherSpec".
- Choosing the target folder; one confirmation before the first write.
- Download of the latest published release of `GregorBiswanger/featherspec` (PD-050).
- Creating missing files; completing `.gitignore` and `.vscode/settings.json`; parking the
  release version of every other existing file in `.sdd-setup/` with a merge prompt (PD-051).
- The completion message with "Copy /sdd-setup" or "Copy merge prompt"; a rerun of discovery.
- Failure handling for network, archive and write errors; an Output channel block per setup.

### Out of scope

- Starting a chat or running `/sdd-setup` — because PD-049 keeps that a manual step and the user picks the assistant.
- Merging the user's own files (for example `AGENTS.md`, `CLAUDE.md`) by Studio itself — because a mechanical merge of prose loses hand-written content; the user's assistant does it (PD-051).
- Choosing a release other than the latest, prereleases, offline install from a bundled copy — because PD-050 names the latest release; not now.
- Updating an existing FeatherSpec project to a newer release — because `/sdd-featherspec-update` owns that; never in Studio.
- `git init`, commits or any Git operation — because PD-052 excludes them.
- The setup action in the no-project notification of 0001 AC-015, in S8 and while a project is active — because PD-052 places it in the Studio view for "no project" and "incomplete"; the command still reaches every eligible folder (AC-003).
- A GitHub token or sign-in — because the public release needs none and Studio asks for no secrets (AGENTS.md).
- Telemetry — because nothing needs it and the handoff §13 allows none without a product decision.

## 5. Amendments to specs 0001 and 0005

Once this spec is `Implemented`, these statements read as amended (revise mode applies them to
the files); everything else in 0001 and 0005 stays as it is.

| Spec · statement | Amendment |
| --- | --- |
| 0001 FR-001.7 "Never change project files"; 0005 BR-06, FR-11 and its out-of-scope bullet "Any write to FeatherSpec artifacts" | Exception: the setup of this spec, started by the user and confirmed (PD-049). 0001 AC-011 and 0005 AC-025 stay unchanged: discovery, selection, refresh, and opening, showing, navigating or restoring the panel or view still write nothing |
| 0001 §10 "Studio never contacts a network service"; 0005 §10 "No network service" | Exception: the setup's download (AC-025). Nothing else contacts the network |
| 0001 BR-03 | New BR-08 *Setup pending*: a folder with a `.sdd-setup/` directory at its root is *incomplete*, whatever BR-01 and BR-02 say (AC-015) |
| 0001 AC-013 | The rerun triggers also include a root `.sdd-setup/` directory that appears or disappears |
| 0005 §13 S2 and S9 | Actions become "Set up FeatherSpec · Open setup guide · Refresh". S9 gains the line form "FeatherSpec setup not finished: <folder> has files to merge." with the extra action "Copy merge prompt" for setup-pending folders. 0005 AC-012 and AC-027 then cover the new actions |

## 6. Functional flow

1. The user activates "Set up FeatherSpec" in the Activity Bar view or the panel, or runs the command.
2. Studio determines the target folder (AC-003) and checks Workspace Trust (AC-004).
3. Studio fetches the latest release and its archive with a cancellable progress notification
   and checks the archive (AC-005, AC-006). Nothing is written to the workspace yet.
4. Studio compares the release files with the folder and asks once (AC-008).
5. On "Set up", it creates missing files, completes `.gitignore` and `.vscode/settings.json`,
   and parks the release version of every other differing file in `.sdd-setup/` (AC-009…AC-014).
6. Studio reruns discovery and shows the completion message (AC-017, AC-018). Without parked
   files the folder becomes a project; with parked files it shows as incomplete until the
   user's assistant has merged them and removed `.sdd-setup/`.
7. The user opens the AI assistant of their choice and runs `/sdd-setup`.

## 7. Business rules

- **BR-01 Eligible folder:** a workspace folder that 0001 reports as *incomplete*, or as *not a
  project* without a read failure (0001 AC-017). A project, legacy included, is never a target.
- **BR-02 Release files:** every regular file of the release archive except the root
  `CHANGELOG.md`, `LICENSE`, `README.md` and `featherspec-logo.png` (PD-050). Paths are relative
  to the archive's top folder. `CLAUDE.md` is included (PD-050, proxy part).
- **BR-03 Same file:** an existing file is *the same* when its bytes equal the release file's
  after converting CRLF to LF in both.
- **BR-04 File classes:** per release file at its path in the target — *missing* → created;
  *the same* → left alone; `.gitignore` or `.vscode/settings.json` that differs → *completed*;
  any other that differs → *kept*, release version parked in `.sdd-setup/`.
- **BR-05 Never overwrite:** outside `.sdd-setup/`, Studio changes no existing byte except the
  lines and keys a completion adds, and deletes, renames or moves no file or folder.
- **BR-06 Version:** the installed version is the value of the archive's `AGENTS.md`
  `FeatherSpecVersion:` line, read by 0001 BR-07.

## 8. Data requirements

- In: release metadata (tag, archive link) and the archive, from GitHub. Not stored in any workspace folder.
- Out: the files of BR-04 in the target folder; `.sdd-setup/` with the parked files and a
  `.gitignore` containing `*`; one Output channel block per setup. No file content in logs.

## 9. UI/UX requirements

UI text in English (PD-016). Texts are binding as written in §14.

- In S2 the action reads like Source Control's "Initialize Repository": one primary button
  "Set up FeatherSpec", "Open setup guide" as the secondary way (VS Code UX guidelines: buttons
  for primary actions only). Its look is checked by Gregor (M-1).
- Confirmation is modal, names everything that will happen, and has "Set up" and "Cancel".
- The completion message names the next step in one sentence; its only action copies the
  next thing the user pastes into chat.

## 10. Interfaces and integrations

- GitHub REST API "Get the latest release" (the newest published release, no draft, no
  prerelease) and the archive of its tag; unauthenticated (60 requests per hour per address is
  enough for 2 per setup).
- VS Code: Workspace Trust, quick pick, modal dialog, progress notification, clipboard, Output
  channel "FeatherSpec Studio" (0001), the commands of 0001 and 0005.

## 11. Security, permissions and privacy

- Only in a trusted workspace (PD-052): the setup writes into the user's folder.
- No token, no credentials, no user data sent; the request carries no workspace path or name.
- The archive is untrusted input: path, type and size checks before any write (AC-006).

## 12. Non-functional requirements

- Timeouts: AC-019 (30 seconds, working threshold like PD-035).
- Restartable: a failed or cancelled setup can be run again; it creates only what is missing.

## 13. Error cases and edge cases

- Offline, GitHub error, rate limit, timeout → AC-019. Archive not a FeatherSpec release → AC-006.
- A file appears between confirmation and its write → it is treated as existing, never overwritten (AC-010).
- `.vscode/settings.json` with comments → completed with comments kept; not parseable → kept (AC-013).
- A second setup into the same folder (pending merge or newer release) → only missing files are
  created; the parked versions in `.sdd-setup/` are replaced by the new release's.
- Setup-pending folder while another folder is the active project → no panel state shows it;
  the completion message and the Output channel carry the merge prompt and the hint.

## 14. Acceptance criteria

Decided by automated tests on fakes of the network, the file system, the clock and the UI unless
marked *Manual*.

- **AC-001** While the condition of 0005 S2 or S9 holds, the system shall offer "Set up FeatherSpec" as the first action of that state in the Activity Bar view and in the panel.
- **AC-002** The system shall contribute the command "FeatherSpec Studio: Set Up FeatherSpec"; the action of AC-001 shall run it.
- **AC-003** When the setup starts, the system shall offer exactly the eligible folders (BR-01) as targets: one → used without asking; several → a quick pick that shows each folder's name and verdict; none → the message "Every folder of this workspace is already a FeatherSpec project." with no network request.
  > **Given** a multi-root workspace with a project, a plain folder and an incomplete folder **When** the user runs the command **Then** the quick pick lists the plain and the incomplete folder only.
- **AC-004** If the workspace is not trusted, then the system shall send no network request, write nothing, and show "Setting up FeatherSpec needs a trusted workspace." with the action "Manage Workspace Trust".
- **AC-005** When a target is determined in a trusted workspace, the system shall request the latest published release of `GregorBiswanger/featherspec` and the archive of its tag, under a progress notification "Downloading FeatherSpec…" with "Cancel", and shall write nothing into any workspace folder before the confirmation of AC-008.
- **AC-006** If the archive has no root `AGENTS.md` with a `FeatherSpecVersion:` line, or no `.specs/` folder, or an entry with an absolute path, a `..` segment or a type other than file or folder, or more than 20 MB unpacked, then the system shall write nothing and show "The downloaded archive is not a FeatherSpec release: <reason>." with "Retry".
- **AC-007** The system shall take exactly the release files of BR-02; a file a later release adds shall be taken without a change to Studio.
  > **Given** the 1.10.0 archive (67 files) **Then** 63 files are taken, `.specs/README.md` and `CLAUDE.md` among them, the root `README.md` not.
- **AC-008** Before the first write, the system shall ask once in a modal dialog "Set up FeatherSpec <version> in <folder>?" with the counts "<n> files will be created, <n> completed, <n> existing files kept unchanged" (zero counts omitted) and the actions "Set up" and "Cancel". If the user cancels or closes it, then the system shall write nothing.
- **AC-009** When the user confirms, the system shall create every *missing* release file with the archive's bytes. A file shall be either complete or absent, also after a failure.
- **AC-010** If a release file exists at its path when it is about to be written, then the system shall treat it as existing (BR-04) and shall not overwrite it, also when it did not exist at the confirmation. The system shall delete, rename or move no file or folder of the target (BR-05).
  > **Given** the folder has its own `AGENTS.md` and `CLAUDE.md` **When** the setup ends **Then** both files are byte-identical to before.
- **AC-011** The system shall leave a file that is *the same* (BR-03) untouched, and shall neither park nor count it as kept.
- **AC-012** When `.gitignore` is *completed*, the system shall append every non-empty, non-comment line of the release `.gitignore` that the file does not contain (trailing spaces ignored), in release order, each with the comment lines directly above it in the release file, using the file's own line ending. It shall change, remove or reorder no existing line.
- **AC-013** When `.vscode/settings.json` is *completed*, the system shall add every key missing at any depth with the release value, change no existing value, and keep the existing text, comments included, outside the added keys. If the file cannot be parsed as JSON with comments, then the system shall treat it as *kept*.
- **AC-014** For every *kept* file, the system shall write the release version to `.sdd-setup/<same relative path>` and shall write `.sdd-setup/.gitignore` with the single line `*`. Files inside `.sdd-setup/` are the only existing files the system may replace.
- **AC-015** While a folder has a `.sdd-setup/` directory at its root, the system shall report it as *incomplete* (§5, 0001 BR-08) with the diagnostic "FeatherSpec setup not finished: merge the files in .sdd-setup/", and S9 shall show "FeatherSpec setup not finished: <folder> has files to merge." with "Copy merge prompt". When the directory disappears, discovery shall rerun (0001 AC-013 as amended).
- **AC-016** When the user activates "Copy merge prompt", the system shall copy to the clipboard a prompt that names the target folder and, per kept file, its path and its `.sdd-setup/` counterpart, and tells the assistant to keep all of the user's content and add FeatherSpec's missing sections, to keep a `FeatherSpecVersion:` line in `AGENTS.md`, to delete `.sdd-setup/` afterwards, and then to run `/sdd-setup`. With several setup-pending folders the system shall ask for the folder first. Decided against a golden file.
- **AC-017** When a setup ends without kept files, the system shall show "FeatherSpec <version> is set up in <folder>. Open the AI assistant of your choice and run /sdd-setup." with "Copy /sdd-setup", which copies `/sdd-setup`. With kept files it shall show "FeatherSpec <version> is set up in <folder>. <n> existing files were kept: merge them with your AI assistant, then run /sdd-setup." with "Copy merge prompt". The system shall open no chat.
- **AC-018** When a setup has written at least one file, the system shall rerun discovery once after the last write, so the view and the panel show the folder's new verdict without a user action.
- **AC-019** If the release metadata or the archive cannot be fetched (no connection, an answer other than success, a rate limit, no answer within 30 seconds, or no data for 30 seconds during the download), then the system shall write nothing and show "FeatherSpec could not be downloaded: <reason>." with "Retry" and "Open setup guide", the reason naming which of these happened.
- **AC-020** If writing a file fails, then the system shall stop, keep what is already written, and show "FeatherSpec setup stopped: <path> could not be written (<reason>)." with "Retry" and "Show output". A retry shall create only what is still missing.
- **AC-021** When the user cancels the progress notification, the system shall stop the download and write nothing.
- **AC-022** While a setup runs, starting the setup again shall start no second setup and show "A FeatherSpec setup is already running."
- **AC-023** When a setup ends, by any outcome, the system shall write one block to the Output channel "FeatherSpec Studio": version and tag, target folder, outcome, and the paths created, completed, kept and not written; no file content.
- **AC-024** The system shall run no Git command and shall create no file outside the release files, `.sdd-setup/` and the two completions.
- **AC-025** The system shall send network requests only after the user started a setup in a trusted workspace, only to GitHub's API and archive hosts, without credentials, workspace paths or names. Discovery, the view and the panel shall send none.
- **AC-026** *Manual (Gregor):* M-1 the S2 button looks and reads like Source Control's "Initialize Repository" in a Dark, a Light and a High Contrast theme; M-2 on Windows 11 against the real GitHub release, a fresh `tip-splitter` folder becomes a project and the Hands-On walkthrough runs from `/sdd-setup` on; M-3 in a real Restricted Mode window AC-004 holds. Pre-release checklist items.

## 15. Technical notes for developers or AI agents

- Constraints, not design: the core decides target, file classes, completions, prompt and texts;
  the release source (network), the target writes and the clock sit behind ports, so every
  criterion but AC-026 runs on fakes. The existing `ReadOnlyFileSystem` port stays read-only; the
  writer is a separate port. A no-network test proves AC-025 for discovery, view and panel.
- 0001 AC-011 and 0005 AC-025 no-write tests stay green unchanged; add a no-write test for
  cancel, distrust and every pre-confirmation failure (temp copy, negative control).
- As-is: `studioTree.ts` shows S-states as `TreeView.message` plus action items. VS Code renders
  welcome content (`viewsWelcome`, a command link on its own line becomes a button, `when`
  decides visibility) only for a tree with no children and no message. S2's text is static and
  fits `viewsWelcome`; S9's folder lines are dynamic. `/sdd-plan` decides; AC-001 holds either way.
- Activation: the view's implicit `onView` activation reaches plain folders; the
  `workspaceContains` events stay. The manifest's `untrustedWorkspaces` description ("never …
  changes a file") stays true because the setup needs trust.
- Download through VS Code's proxy settings; the archive is held outside every workspace folder.
- References: [VS Code contribution points, `viewsWelcome`](https://code.visualstudio.com/api/references/contribution-points);
  [VS Code UX guidelines, views](https://code.visualstudio.com/api/ux-guidelines/views);
  [Workspace Trust guide](https://code.visualstudio.com/api/extension-guides/workspace-trust);
  [GitHub REST, releases](https://docs.github.com/en/rest/releases/releases); FeatherSpec README
  "Already have a codebase?", wiki *Adopting an Existing Codebase* and *Releasing*; Spec Kit
  `specify init --here` (replaced `CLAUDE.md` complaint, later deep merge of `.vscode/settings.json`).

## 16. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | The latest release's tag archive holds exactly the template files | Wiki *Releasing*: tags never move, `main` between releases gets only README/wiki prose | Unwanted files land in the project; AC-007's exclusion list must grow |
| A-002 | `CLAUDE.md` belongs to the setup (PD-050, proxy part) — to be confirmed by Gregor | FeatherSpec README: `CLAUDE.md` imports `AGENTS.md` for Claude Code | Claude Code users get no constitution until they copy it |
| A-003 | Parking, merge prompt and "incomplete until merged" (PD-051, proxy) — to be confirmed by Gregor | Researched on his request; wiki "merge … rather than replacing" | A different conflict policy rewrites AC-010…AC-016 |
| A-004 | Trust gate, single confirmation, target pick, no `git init` (PD-052, proxy) — to be confirmed by Gregor | Writes into the user's folder; Spec Kit asks before writing into a non-empty folder | AC-003, AC-004, AC-008 change |
| A-005 | 30 s timeout and 20 MB limit are working thresholds | 1.10.0's archive is far below 1 MB; like PD-035 | Slow links fail early, or a bigger release is refused |

## 17. Open points

None blocks the work.

- OP-001: the folder name `.sdd-setup/` is chosen here (FeatherSpec's volatile folders are `.sdd-scan/`, `.sdd-update/`; its self-ignoring `.gitignore` copies `.sdd-update/`). Recommendation: keep it; Gregor may rename it before planning.
- OP-002: reading of PD-051 "shows as incomplete": without BR-08 a user `AGENTS.md` without a version line plus the new `.specs/` and `.claude/commands/` would be a *legacy project* (0001 BR-02). BR-08 makes PD-051 hold. Recommendation: keep.
- OP-003: S2/S9 actions also appear in the panel, not only the view (0005 shows the same state in both). Recommendation: keep.
- OP-004: confirming the proxy parts of PD-050…PD-052 (A-002…A-004).

## 18. Definition of Ready

Goal, user, scope and out-of-scope are documented; the flow, rules, failure cases and 26
criteria are decidable by tests or by Gregor's named manual checks; amendments to 0001 and 0005
are listed by ID; the proxy decisions are visible as assumptions.

## 19. Definition of Done

AC-001…AC-026 pass; the amendments of §5 are applied to 0001 and 0005 in revise mode; README,
architecture snapshot and Memory Bank updated where needed; release checklist carries M-1…M-3;
Gregor accepts after the Hands-On run (M-2).

## 20. Recommended next steps

1. `/sdd-clarify` on this spec in a fresh session.
2. Gregor confirms A-002…A-004 and OP-001 when convenient.
3. `/sdd-plan`.
