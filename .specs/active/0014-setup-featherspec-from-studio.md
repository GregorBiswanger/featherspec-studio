# Set Up FeatherSpec from the Studio

**Status:** In Progress
**Plan:** [0014-setup-featherspec-from-studio.plan.md](0014-setup-featherspec-from-studio.plan.md)

Basis: Gregor's request of 2026-11-17 after his first local test of the VSIX. Decisions
([product-decisions.md](../../docs/product/product-decisions.md)): PD-049, PD-050, PD-051, PD-052,
PD-053 (open points after `/sdd-clarify`; applied 2026-11-17 by `/sdd-plan`: OP-001, OP-006…OP-010,
archive reader), PD-016 (English UI), PD-013 (read-only; PD-049 is its one exception). Depends on: 0001 (verdicts,
Output channel, re-detection), 0005 (Activity Bar view, panel states S2 and S9). Amends statements
of 0001 and 0005 (§5); it restates none of them.

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
  and the command "FeatherSpec Studio: Set Up FeatherSpec"; target choice, one confirmation.
- Download of the latest published release of `GregorBiswanger/featherspec` (PD-050).
- Creating missing files; completing `.gitignore` and `.vscode/settings.json`; parking the
  release copy of every other existing file in `.featherspec-setup/` with a merge prompt (PD-051).
- The final message, a rerun of discovery, failure handling, an Output channel block per setup.

### Out of scope

- Starting a chat or running `/sdd-setup` — because PD-049 keeps that a manual step and the user picks the assistant.
- Merging the user's own files (for example `AGENTS.md`, `CLAUDE.md`) by Studio itself — because a mechanical merge of prose loses hand-written content; the user's assistant does it (PD-051).
- Choosing a release other than the latest, prereleases, offline install from a bundled copy — because PD-050 names the latest release; not now.
- Updating an existing FeatherSpec project to a newer release — because `/sdd-featherspec-update` owns that; never in Studio.
- `git init`, commits or any Git operation — because PD-052 excludes them.
- The setup action in the no-project notification of 0001 AC-015, in S8 and while a project is active — because PD-052 places it in the Studio view for "no project" and "incomplete"; the command still reaches every eligible folder (AC-003).
- Folders on a virtual file system — because ADR-001 §14 and 0001 exclude virtual workspaces, and never-overwrite cannot be kept there (BR-01, §15).
- A GitHub token or sign-in — because the public release needs none and Studio asks for no secrets (AGENTS.md).
- Telemetry — because nothing needs it and the handoff §13 allows none without a product decision.

## 5. Amendments to specs 0001 and 0005

This spec's plan applies the amendments to both files (revise mode) before `/sdd-compile`;
everything else in 0001 and 0005 stays as it is. The restatements of PD-013 in 0002–0004,
0006–0008 and 0012 are read with PD-049's exception and not edited.

| Spec · statement | Amendment |
| --- | --- |
| 0001 FR-001.7 "Never change project files" and §15 "Restatement of the read-only rule"; 0005 BR-06, FR-11 and its out-of-scope bullet "Any write to FeatherSpec artifacts" | Exception: the setup of this spec, started by the user and confirmed (PD-049). 0001 AC-011 and 0005 AC-025 stay unchanged |
| 0001 §4 out of scope "Creating or migrating a FeatherSpec project" | Creating is this spec's setup; migrating stays out of scope |
| 0001 §10 "Studio never contacts a network service"; 0005 §10 "No network service" | Exception: the setup's download (AC-025). Nothing else contacts the network |
| 0001 BR-01…BR-04, AC-001…AC-004 | New 0001 BR-08 *Setup pending* (BR-07 here) ranks before them: such a folder is *incomplete* whatever its markers say, with the diagnostic of AC-015. 0001 AC-017 (read failure) still wins |
| 0001 §8 "Read only: the existence of the marker paths …", §11 "Discovery reads only the marker paths …", AC-013 | Discovery also reads whether a root `.featherspec-setup/` directory exists; its appearing or disappearing is a rerun trigger (extends PD-033's list) |
| 0005 §13 S2 and S9 with the "Actions:" paragraph, AC-027 | Actions become "Set up FeatherSpec · Open setup guide · Refresh"; *Set up FeatherSpec* runs the command of AC-002. For a setup-pending folder S9 shows "FeatherSpec setup not finished: <folder> has files to merge." in place of that folder's missing-marker lines and also offers "Copy merge prompt" (AC-016), after "Set up FeatherSpec"; in an S9 whose folders are all setup-pending, "Copy merge prompt" comes first and "Set up FeatherSpec" second (PD-053). 0005 AC-012 follows §13 unchanged |
| 0005 §11 "In this slice, that means only the S7 note" | Also: "Set up FeatherSpec" is offered and refuses (AC-004) |

## 6. Functional flow

1. The user activates "Set up FeatherSpec" in the view or the panel, or runs the command.
2. Studio checks Workspace Trust (AC-004), then determines the target folder (AC-003).
3. Studio downloads the latest release under a cancellable progress notification and checks
   the archive (AC-005, AC-006). Nothing is written to the workspace yet.
4. Studio compares the release files with the folder and asks once (AC-008).
5. On "Set up", it parks the release copy of every *kept* file, creates the missing files and
   completes `.gitignore` and `.vscode/settings.json` (AC-009…AC-014).
6. Studio shows the final message; discovery has rerun (AC-017, AC-018). Without parked files
   the folder is a project; with them it shows as incomplete until the user's assistant has
   merged them and removed `.featherspec-setup/`.
7. The user opens the AI assistant of their choice and runs `/sdd-setup`.

## 7. Business rules

- **BR-01 Eligible folder:** a workspace folder on the file system of the machine the extension
  runs on (local, WSL, SSH, container) that 0001 reports as *incomplete*, or as *not a project*
  without a read failure (0001 AC-017). A project, legacy included, and a folder on a virtual
  file system are never targets.
- **BR-02 Release files:** every regular file of the release archive except the root
  `CHANGELOG.md`, `LICENSE`, `README.md` and `featherspec-logo.png` (PD-050). Paths are relative
  to the archive's one top folder. `CLAUDE.md` is included (PD-050, proxy part). The *release
  copy* of a file is its bytes in the archive.
- **BR-03 Same file:** an existing file is *the same* when its bytes equal the release copy's
  after converting CRLF to LF in both. Whether a path exists is the file system's answer
  (so letter case counts as on that system).
- **BR-04 File classes:** per release file at its path in the target — *missing* → created;
  *the same* → left alone; `.gitignore` or `.vscode/settings.json` that differs → *completed*
  when AC-012 or AC-013 has something to add, otherwise left alone; any other that differs →
  *kept*, release copy parked in `.featherspec-setup/`.
- **BR-05 Never overwrite:** the setup changes, deletes, renames or moves nothing that was in
  the target before it started, with two exceptions: the lines and keys a completion adds, and
  `.featherspec-setup/` with its content (Studio's own). What it created in this run it may move or
  remove (a staged or unfinished file).
- **BR-06 Version:** the installed version is the value of the archive's `AGENTS.md`
  `FeatherSpecVersion:` line, read by 0001 BR-07. A release tag that says otherwise is logged
  (AC-023), not an error.
- **BR-07 Setup pending:** a folder with a `.featherspec-setup/` directory at its root is
  *setup-pending*; 0001 reports it as *incomplete* (§5).

## 8. Data requirements

- In: the tag of the latest release (from the redirect of §10) and its source archive, from GitHub. Held
  outside every workspace folder and nowhere once the setup has ended.
- Out: the files of BR-04 in the target folder; `.featherspec-setup/` with the parked copies and a
  `.gitignore` containing `*`; one Output channel block per setup. No file content in logs.

## 9. UI/UX requirements

UI text in English (PD-016). Texts are binding as written in §14. `<folder>` is the folder's
name; the quick pick and the confirmation also show its path. With a count of 1 a text uses the
singular ("1 file", "was kept").

- In S2 the action reads like Source Control's "Initialize Repository": one primary button
  "Set up FeatherSpec", "Open setup guide" as the secondary way (VS Code UX guidelines: buttons
  for primary actions only). Its look is checked by Gregor (M-1).
- The final message is a notification; it names the next step in one sentence, and its only
  action copies the next thing the user pastes into chat.

## 10. Interfaces and integrations

- GitHub web routes, no REST API request and so no API quota (PD-053): `https://github.com/GregorBiswanger/featherspec/releases/latest`,
  whose redirect names the tag of the release GitHub marks as latest (no draft, no prerelease; not
  necessarily the highest version), then that tag's source archive
  `https://github.com/GregorBiswanger/featherspec/archive/refs/tags/<tag>.tar.gz`, redirects
  followed. Unauthenticated; the User-Agent names Studio and its version only. Hosts: `github.com`,
  `codeload.github.com`.
- VS Code: Workspace Trust, quick pick, modal dialog, progress notification, clipboard, Output
  channel "FeatherSpec Studio" (0001), the commands of 0001 and 0005.

## 11. Security, permissions and privacy

- Only in a trusted workspace (PD-052): the setup writes into the user's folder.
- No token, no credentials, no user data sent; the request carries no workspace path or name.
- The archive is untrusted input: path, type and size checks before any write (AC-006). Its
  content is trusted as far as TLS to GitHub and the repository itself; no signature check.

## 12. Non-functional requirements

- Timeouts: AC-019 (30 seconds, working threshold, A-005).
- Restartable: a failed or cancelled setup can be run again; it creates only what is missing (AC-020).

## 13. Error cases and edge cases

- A file appears between confirmation and its write, or a second window sets up the same
  folder → no file is replaced (AC-010).
- A second setup into the same folder → only missing files are created; `.featherspec-setup/` then holds
  this run's parked copies only (AC-014). Files of an earlier release that differ from a newer
  one are *kept* like the user's own: Studio has no update logic (§4).
- VS Code dies in mid-write → an unfinished file may stay; the next run keeps it as a file that
  differs (BR-04).
- Setup-pending folder while S9 does not apply (another project active, S8, S3) → no panel state
  shows it; the final message and the Output channel block carry the merge prompt (AC-023).

## 14. Acceptance criteria

Decided by automated tests on fakes of the network, the file system, the clock and the UI unless
marked *Manual*.

- **AC-001** While the condition of 0005 S2 or S9 holds, the system shall offer "Set up FeatherSpec" as the first action of that state in the Activity Bar view and in the panel; in an S9 whose folders are all setup-pending (BR-07) as the second, after "Copy merge prompt" (PD-053).
- **AC-002** The system shall contribute the command "FeatherSpec Studio: Set Up FeatherSpec"; the action of AC-001 shall run it.
- **AC-003** When the setup starts in a trusted workspace, the system shall offer exactly the eligible folders (BR-01) as targets: one → used without asking; several → a quick pick that shows each folder's name, path and verdict (dismissing it ends the setup without a request or a message); none → no network request and one message: with no folder open "Open a folder to use FeatherSpec Studio."; with every folder a project "Every folder of this workspace is already a FeatherSpec project."; otherwise "No folder of this workspace can be set up." with "Show output".
  > **Given** a multi-root workspace with a project, a plain folder and an incomplete folder **When** the user runs the command **Then** the quick pick lists the plain and the incomplete folder only.
- **AC-004** If the workspace is not trusted, then the system shall show no quick pick, send no network request, write nothing, and show "Setting up FeatherSpec needs a trusted workspace." with the action "Manage Workspace Trust".
- **AC-005** When a target is determined, the system shall request the latest release (§10) and its source archive, under a progress notification "Downloading FeatherSpec…" with "Cancel", and shall write nothing into any workspace folder before the confirmation of AC-008.
- **AC-006** If the archive cannot be read; or lacks a single top folder, a root `AGENTS.md` with a `FeatherSpecVersion:` line that has a value, or a file below `.specs/`; or holds an entry that is neither file nor folder (the archive format's own metadata records excepted), an entry whose path is absolute or contains a backslash, a colon, a control character or a `..` or `.git` segment, or two entries whose paths differ at most in letter case; or exceeds 20 MB, downloaded or unpacked (counted while reading, not taken from declared sizes), then the system shall write nothing and show "The downloaded archive is not a FeatherSpec release: <reason>." with "Retry", the reason naming the failed check.
- **AC-007** The system shall take exactly the release files of BR-02; a file a later release adds shall be taken without a change to Studio.
  > **Given** the 1.10.0 archive (67 files) **Then** 63 files are taken, `.specs/README.md` and `CLAUDE.md` among them, the root `README.md` not.
- **AC-008** Before the first write, the system shall ask once in a modal dialog "Set up FeatherSpec <version> in <folder>?" with the folder's path and the counts "<n> files will be created, <n> completed, <n> existing files kept unchanged" (zero counts omitted; all zero: no count sentence) and the actions "Set up" and "Cancel". If the user cancels or closes it, then the system shall write nothing.
- **AC-009** When the user confirms, the system shall create every *missing* release file with the archive's bytes, and the folders its path needs. If the file system reports a write error, then the system shall leave that file whole or absent.
- **AC-010** The system shall create a file only by a write that fails when the path exists; a file that appeared after the confirmation is then classed anew (BR-04) and never replaced. The system shall write a completion only if the file still has the content the completion was computed from, and otherwise compute it again (a change in the instant between that check and the write is not caught). The system shall delete, rename or move nothing that was in the target before the setup (BR-05).
  > **Given** the folder has its own `AGENTS.md` and `CLAUDE.md` **When** the setup ends **Then** both files are byte-identical to before.
- **AC-011** The system shall leave a file that is *the same* (BR-03) untouched, and shall neither park nor count it as kept.
- **AC-012** When `.gitignore` is *completed*, the system shall append every non-empty, non-comment line of the release `.gitignore` that the file does not contain (compared without trailing spaces), in release order, each with the comment lines directly above it in the release file, and nothing else. It shall use the line ending of the file's first line (LF if there is none) and first end a last line that has no line ending. It shall change, remove or reorder no existing line.
- **AC-013** When `.vscode/settings.json` is *completed*, the system shall add every key missing at any depth with the release value and change no existing value; taking the added keys and their commas out of the result shall give back the existing text, comments and line endings included. If the file's content is not one JSON-with-comments object, then the system shall treat it as *kept*.
- **AC-014** For every *kept* file, the system shall write the release copy to `.featherspec-setup/<same relative path>` before it creates any file outside `.featherspec-setup/`, and shall write `.featherspec-setup/.gitignore` with the single line `*`. When a setup ends as set up, `.featherspec-setup/` shall hold exactly these files; with no kept file it shall not exist.
- **AC-015** While a folder is setup-pending (BR-07), the system shall report it as *incomplete* with the diagnostic "FeatherSpec setup not finished: merge the files in .featherspec-setup/, then delete that folder", and S9 shall show "FeatherSpec setup not finished: <folder> has files to merge." with "Copy merge prompt" (§5). When the directory disappears, discovery shall rerun (0001 AC-013 as amended).
- **AC-016** When the user activates "Copy merge prompt", the system shall copy to the clipboard an English prompt that names the target folder by its path and, for every file below `.featherspec-setup/` except its `.gitignore`, the user's file at the same relative path and that parked copy, and tells the assistant: keep all of the user's content and add FeatherSpec's missing sections; give `AGENTS.md` the `FeatherSpecVersion:` line of the release copy; delete `.featherspec-setup/` afterwards; then tell the user to run `/sdd-setup` (an assistant cannot start it). From S9 with several setup-pending folders the system shall ask for the folder first. Decided by checks on these parts and against a golden file.
- **AC-017** When a setup ends without kept files, the system shall show the notification "FeatherSpec <version> is set up in <folder>. Open the AI assistant of your choice and run /sdd-setup." with "Copy /sdd-setup", which copies `/sdd-setup`. With kept files it shall show "FeatherSpec <version> files were added to <folder>. <n> existing files were kept: merge them with your AI assistant, then run /sdd-setup." with "Copy merge prompt" (PD-053). The system shall open no chat.
- **AC-018** When a setup has written anything into the target — a created file, a completion, or `.featherspec-setup/` content (a cleared earlier `.featherspec-setup/` included), also when it stopped after writing only such content (Gregor, 2026-11-17) — the system shall rerun discovery once after the last write, so the view and the panel show the verdict that matches the disk without a user action (earlier reruns by 0001 AC-013 are allowed).
- **AC-019** If the release metadata or the archive cannot be fetched — no connection; a final answer other than success (redirects within the hosts of §10 are followed); GitHub's rate-limit answer (status 429, or 403 with `x-ratelimit-remaining: 0`), the reason then naming GitHub's reset time when the answer carries `x-ratelimit-reset` or `retry-after` (PD-053); a latest-release answer that redirects to no release tag; no answer within 30 seconds; or no data for 30 seconds during the download — then the system shall write nothing and show "FeatherSpec could not be downloaded: <reason>." with "Retry" and "Open setup guide", the reason naming which of these happened.
- **AC-020** If writing a file fails, then the system shall stop, keep what is already written, and show "FeatherSpec setup stopped: <path> could not be written (<reason>)." with "Retry" and "Show output", the reason being the file system's. The system shall create the root `AGENTS.md` after every other file, so that a setup stopped before that write leaves no project and stays eligible (BR-01). "Retry", here and in AC-006 and AC-019, shall run the setup again for the same target from the download on, confirmation included; it creates only what is still missing. If that target is no longer eligible (BR-01), then "Retry" shall not switch to another folder on its own: it shall start over at the target choice of AC-003 and ask with the quick pick whenever at least one folder is eligible, also when exactly one is; with none, AC-003's "none" message applies (Gregor, 2026-11-17).
- **AC-021** When the user cancels the progress notification, the system shall stop the download, write nothing and show no message.
- **AC-022** While a setup runs in this window — from its start until its final or failure message is shown or it is cancelled — the system shall start no second setup and shall answer a new start with "A FeatherSpec setup is already running."
- **AC-023** When a setup that has a target ends, by any outcome (set up, cancelled, download failed, archive refused, stopped), the system shall write one block to the Output channel "FeatherSpec Studio": version and tag where known, target folder, outcome, the paths created, completed, kept and not written, the key path of every `.vscode/settings.json` setting kept with a value other than the release's (no values), and, with kept files, the merge prompt of AC-016; a set-up block ends with the next step (the sentence of AC-017 after "<folder>."); no file content (PD-053).
- **AC-024** The system shall start no process (so no Git command) and shall create nothing in the target but the release files, the folders they need, and `.featherspec-setup/` with its content.
- **AC-025** The system shall send network requests only after the user started a setup in a trusted workspace, only to the hosts of §10, without credentials, cookies, or a workspace path or name. Discovery, the view and the panel shall send none.
- **AC-026** *Manual (Gregor):* M-1 the S2 button looks and reads like Source Control's "Initialize Repository" in the view and in the panel, in a Dark, a Light and a High Contrast theme (this renews the S2 screenshots of 0013 AC-017); M-2 on Windows 11 against the real GitHub release, a fresh `tip-splitter` folder becomes a project and the Hands-On walkthrough runs from `/sdd-setup` on; M-3 in a real Restricted Mode window AC-004 holds. Pre-release checklist items.

## 15. Technical notes for developers or AI agents

- Constraints, not design: the core decides target, file classes, completions, prompt and texts;
  the release source (network), the target writes and the clock sit behind ports, so every
  criterion but AC-026 runs on fakes. The existing `ReadOnlyFileSystem` port stays read-only; the
  writer is a separate port. A no-network test proves AC-025 for discovery, view and panel.
- AC-010 needs a create that refuses an existing path; `vscode.workspace.fs.writeFile` always
  replaces. So the writer works on the machine's own file system (`extensionKind: workspace`;
  in a Remote window the download leaves from the remote machine). Verified by `/sdd-plan`
  (2026-11-17): a remote workspace extension sees its folders as `file:` URIs of the remote
  machine, and VS Code itself calls a folder virtual when its scheme is not `file`; so a folder
  whose URI scheme is not `file` is BR-01's virtual file system. `virtualWorkspaces: false`
  disables Studio only when every folder is virtual, so a mixed workspace needs that check.
- Archive: a tar archive from GitHub starts with a `pax_global_header` record (AC-006's
  metadata exception). No new runtime dependency (PD-053): Node's own `zlib` plus a small tar
  reader in the adapter, covered by tests.
- 0001 AC-011 and 0005 AC-025 no-write tests stay green unchanged; add a no-write test for
  cancel, distrust and every pre-confirmation failure (temp copy, negative control).
- As-is: `studioTree.ts` shows S-states as `TreeView.message` plus action items. VS Code renders
  `viewsWelcome` (a command link on its own line becomes a button) only for a tree with no
  children and no message. S2's text is static, S9's lines are dynamic. `/sdd-plan` decides;
  AC-001 holds either way: where VS Code draws the button, the proof is the contribution and
  its `when` context.
- Activation: the view's implicit `onView` activation reaches plain folders; the
  `workspaceContains` events stay. The manifest's `untrustedWorkspaces` description ("never …
  changes a file") stays true because the setup needs trust.
- Download through VS Code's proxy settings (the extension host's global `fetch` has VS Code's
  proxy support since 1.96, as the `https` module had before).
- References: VS Code [contribution points](https://code.visualstudio.com/api/references/contribution-points),
  [UX guidelines, views](https://code.visualstudio.com/api/ux-guidelines/views),
  [Workspace Trust](https://code.visualstudio.com/api/extension-guides/workspace-trust),
  [Virtual Workspaces](https://code.visualstudio.com/api/extension-guides/virtual-workspaces);
  GitHub [linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases),
  [source code archives](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives),
  REST [releases](https://docs.github.com/en/rest/releases/releases),
  [rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api);
  FeatherSpec README and wiki (*Adopting an Existing Codebase*, *Releasing*).

## 16. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | The latest release's tag archive holds only template files besides the four of BR-02 | Wiki *Releasing*: tags never move, `main` between releases gets only README/wiki prose; PD-050 takes everything on purpose | Unwanted files (CI workflows, tests) land in the project; AC-007's exclusion list must grow |
| A-002 | `CLAUDE.md` belongs to the setup (PD-050, proxy part) — to be confirmed by Gregor | FeatherSpec README: `CLAUDE.md` imports `AGENTS.md` for Claude Code | Claude Code users get no constitution until they copy it; BR-02 and AC-007's example (62 files) change |
| A-003 | Parking, merge prompt and "incomplete until merged" (PD-051, proxy) — to be confirmed by Gregor | Researched on his request; wiki "merge … rather than replacing" | A different conflict policy rewrites AC-010…AC-016 |
| A-004 | Trust gate, single confirmation, target pick, no `git init` (PD-052, proxy) — to be confirmed by Gregor | Writes into the user's folder; Spec Kit asks before writing into a non-empty folder | AC-003, AC-004, AC-008 change |
| A-005 | 30 s timeout and 20 MB limit are working thresholds | 1.10.0's archive is far below 1 MB; the 30 s are unmeasured, like PD-035 | Slow links fail early, or a bigger release is refused |
| A-006 | The web routes of §10 are not counted against the 60 unauthenticated REST API requests per hour per address (PD-053) | Studio sends no REST API request; GitHub's rate-limit page covers the REST API only and states no limit for web routes or archives | A training room or company network behind one address gets AC-019's rate-limit message with the reset time |
| A-007 | The redirect of `/releases/latest` names the same release that the REST API calls latest | GitHub *Linking to releases* documents `/releases/latest` as the link to the latest release; checked against the real repository in M-2 only (GitHub was not reachable from the planning sandbox) | Studio installs another release than GitHub's "latest"; AC-019's "redirects to no release tag" fires for a repository without a release |

## 17. Open points

None blocks the work.

- OP-001: resolved by PD-053 (1): the folder is `.featherspec-setup/` (it belongs to Studio, not to `/sdd-setup`).
- OP-002: resolved by PD-053 (7): BR-07 stays; PD-031 needs a pointer.
- OP-003: resolved by PD-053 (7): S2/S9 actions also appear in the panel.
- OP-004: confirming the proxy parts of PD-050…PD-052 (A-002…A-004).
- OP-005: `/sdd-clarify` 2026-11-17: 79 findings, 7 blocking, resolved in one pass at Gregor's standing request (one-off exception to the walkthrough); none left for him to decide. The list is kept by the orchestrator (`0014-findings.md`). Readings made; say so if one is wrong: (a) one eligible folder needs no pick, also in a multi-root workspace (AC-003); (b) no button in S8, S3 or beside an active project (§4); (c) a completion's last instant is not caught (AC-010); (d) PD-051's "existing file" is the user's: inside `.featherspec-setup/` Studio replaces and removes (BR-05, AC-014); (e) parked copies first, root `AGENTS.md` last (AC-014, AC-020) — a folder that already held the release's `AGENTS.md` can still stop as a project; (f) no virtual file system (BR-01); (g) "latest" is GitHub's answer, the tag is only logged (§10, BR-06); (h) the added archive checks and download cap (AC-006); (i) texts: AC-003's "none" messages, "then delete that folder" (AC-015), singular forms (§9), `/sdd-setup` handed to the user (AC-016); (j) "Retry" starts over (AC-020); (k) the merge prompt comes from `.featherspec-setup/` and is also in the Output block (AC-016, AC-023); (l) one S9 line per setup-pending folder (§5).
- OP-006: resolved by PD-053 (2): in an all-setup-pending S9 "Copy merge prompt" comes first (§5, AC-001).
- OP-007: resolved by PD-053 (3): the kept variant of AC-017 starts "FeatherSpec <version> files were added to <folder>."; the Output block ends with the next step (AC-023).
- OP-008: resolved by PD-053 (4): links the user placed in the target are written through, also out of the workspace folder, as `cp` and `degit` do; the README says so (§19).
- OP-009: resolved by PD-053 (5): `/sdd-plan` chose the quota-free web route (§10, A-006, A-007); a rate-limit reason names the reset time (AC-019).
- OP-010: resolved by PD-053 (6): the Output block names every setting kept with another value than the release's (AC-023).

## 18. Definition of Ready

Goal, user, scope and out-of-scope are documented; the flow, rules, failure cases and 26
criteria are decidable by tests or by Gregor's named manual checks; amendments to 0001 and 0005
are listed by ID; the proxy decisions are visible as assumptions. Clarified on 2026-11-17
(OP-005); revised 2026-11-17 with PD-053; the open points do not block planning.

## 19. Definition of Done

AC-001…AC-026 pass; the amendments of §5 are applied to 0001 and 0005 in revise mode; README,
architecture snapshot and Memory Bank updated where needed (the README names the written-through
links of PD-053 (4)); release checklist carries M-1…M-3;
Gregor accepts after the Hands-On run (M-2).

## 20. Recommended next steps

1. Gregor reads the plan ([0014-setup-featherspec-from-studio.plan.md](0014-setup-featherspec-from-studio.plan.md)).
2. Gregor confirms A-002…A-004 (OP-004) when convenient.
