# FeatherSpec Studio for JetBrains IDEs

**Status:** Draft
**Plan:** _none yet_

Basis: the agreed analysis *FeatherSpec Studio für JetBrains IDEs – Analyse und Schritt-für-Schritt-Plan* (2026-11-20,
owner's project notes, not in the repository) at `3bc615c` (release 0.1.0); Gregor's decisions E1 (monorepo in this
repository, folder `jetbrains/`; specs are referenced, not copied) and the brief of 2026-11-20. Written without an
interview: every unanswered question is an assumption (§13) or an open point (§14). The current behaviour of the product
is defined by 0001–0007, 0013–0033 as amended; 0008–0012 are Deprecated (successor 0015) and count only as n-a.

## 1. Summary

The same product as the VS Code extension — same panel UI, same next steps, same texts, same rules — delivered as an
IntelliJ Platform plugin named **FeatherSpec Studio** (ID `com.gregorbiswanger.featherspec.studio`). The unchanged webview
bundle runs in an embedded browser (JCEF) inside an editor tab; the shared TypeScript core runs in an embedded runtime in the
IDE; the Specs tree, status bar entry, actions, settings and notifications are native. **JetBrains Rider and WebStorm must
fully work**; every other IntelliJ-based IDE is covered by depending only on the platform and JCEF modules. This spec
references the original criteria instead of restating them, and adds only the host mapping, the runtime, the theme bridge,
packaging, a machine-checked parity matrix, a conformance proof against the existing baselines, and guards that keep the
VS Code extension unchanged.

## 2. Goal and problem

Developers who work spec-driven in Rider or WebStorm cannot use the Studio today: it exists only for VS Code. A second
implementation would drift from the first, and copying the 33 specs (about 750 criteria, 0008–0012 included) would double the
context every agent loads and drift as well. Goal: one product on two hosts, whose parity is **verifiable** — every original
criterion is categorised, every shared output is proven identical, and the VS Code extension cannot get worse through
JetBrains work (project rule: quality must never degrade).

## 3. Users and roles

As 0001–0007: the developer, one role, now in a JetBrains IDE. Gregor is the acceptor of the manual checks (AC-040–AC-042).

## 4. Scope

### In scope

- The host mapping of §6.3: tool window with the native Specs tree, Studio panel as a JCEF editor tab running the
  unchanged webview bundle, status bar entry, actions, settings page, trusted-project behaviour, file watching and
  freshness, Set up FeatherSpec, notifications and the log view.
- The embedded runtime for the shared core (§6.5), decided by a spike as the first plan stage.
- The theme bridge (§6.6): the 59 `--vscode-*` variables and the 3 body classes from the IDE look and feel, Light, Darcula,
  High Contrast and Islands, live switch.
- The fallback when the IDE cannot show an embedded browser (§10, AC-030).
- Send to assistant with Copy prompt as the default and a handover only where proven (§6.7).
- The parity matrix `docs/jetbrains/parity.md` (§6.2) and the conformance proof (§6.4).
- The host vocabulary (§6.8), and the shared TypeScript changes the host needs: a host-neutral composition, an embedded
  entry bundle, the vocabulary — each under the VS Code protection of §6.9.
- Packaging, signing, Plugin Verifier, a separate release line (§6.10), README and release checklist sections.

### Out of scope

- Split mode and remote development (JetBrains Gateway, thin client) — because v0.1 is local only; the plugin would need
  a frontend/backend split with RPC; a later spec.
- IDE versions before 2025.3.1 — because the JCEF module alias exists only from 2025.3.1 (A-004); no second plugin line.
- A second product behaviour (a JetBrains-only feature or a rule that differs without a PD entry) — because parity is the
  goal; any deviation is a *deliberately different* row with a PD reference (§6.2).
- Copying or restating the original specs' criteria — because they stay the single truth (E1).
- A ReSharper/.NET backend part for Rider — because the Studio needs no code-model access; frontend actions and tool
  windows suffice in Rider.
- A native Swing re-implementation of the panel — because the same UI is the goal (E3); only what is native in VS Code is
  native here.
- Assistant handovers that send, submit or need undocumented internals — because the Studio never submits (PD-068) and
  shows only honest signals (0016).
- Changing the VS Code extension's behaviour, texts, manifest or release — because §6.9 forbids it.
- Editing the FeatherSpec wiki — because the wiki follows the release, not this spec (OP-015).

## 5. Functional flow

1. The developer installs *FeatherSpec Studio* from the JetBrains Marketplace in Rider or WebStorm and opens a FeatherSpec
   project (for example `C:\projects\test\tip-splitter`).
2. The plugin runs discovery (0001); the status bar shows the entry of 0017; the tool window *FeatherSpec Studio* shows the
   Specs tree of 0020, or the welcome and Set up FeatherSpec of 0014/0029 in a folder without FeatherSpec.
3. The developer runs *FeatherSpec Studio: Open* (toolbar, Find Action, tree row): an editor tab shows the Studio panel
   with Overview, Board and Plan map, in the IDE's theme.
4. They select a spec, read its next step, use Copy prompt (or Send where §6.7 allows), paste it into their assistant.
5. The assistant or the developer changes files under `.specs/`, inside or outside the IDE; tree, status entry and panel
   follow within the budgets of §6.5.
6. They switch the IDE theme; the panel follows without reopening.

## 6. Business rules

### 6.1 Parity by reference

Every criterion of the current specs holds in the JetBrains host, read through §6.3 (host elements) and §6.8 (vocabulary),
unless its parity-matrix row says *n-a* or *deliberately different*. This spec restates no original criterion; it cites
`<spec> AC-<n>`. Where an original criterion names a VS Code element (Activity Bar, view, `viewsWelcome`, Command Palette,
`contributes.*`, Output channel, Workspace Trust, `workspaceState`, `globalStorageUri`), the §6.3 row is its JetBrains reading.
The original specs are not amended by this spec.

### 6.2 The parity matrix

`docs/jetbrains/parity.md` holds one row per acceptance criterion of every spec in `.specs/done/` and `.specs/active/` —
the criteria the Studio's own spec repository finds (0002 AC-004), this spec's own excepted — with: spec, AC ID, category, reference, note.

| Category | Meaning | Reference the row must carry |
| --- | --- | --- |
| shared | Decided by shared TypeScript (core, protocol, webview) that runs unchanged in both hosts | the conformance set of §6.4 that covers it, or `shared-test` (an existing Vitest test runs on the same bundle) |
| host | Needs a JetBrains host element | the §6.3 row and the AC of this spec that decides it |
| n-a | Cannot apply: Deprecated spec, withdrawn or void criterion, a VS Code-only mechanism without a counterpart (a host test API, a manifest key) | the reason (successor, withdrawal, mechanism) |
| deliberately different | Applies with a stated difference | the PD entry that records the difference |

The rows are generated from the specs; the categories and references live in one source the generator reads, so a new or
renumbered criterion in any spec appears as an uncategorised row and fails the check (AC-002).

### 6.3 Host mapping

| # | VS Code (original) | JetBrains | Original criteria (examples) |
| --- | --- | --- | --- |
| H-1 | Activity Bar container and view `Specs`, badge | Tool window *FeatherSpec Studio* with a native tree; the badge as the count of Review and Blocked in the tool window's title and stripe (OP-007) | 0020 AC-001–AC-006, AC-010, AC-013 |
| H-2 | `viewsWelcome`, tree message | The tree's empty text with the same lines and links | 0014 AC-001, 0020 AC-012, 0029 AC-004 |
| H-3 | View title actions, inline and context menu | Tool window toolbar (Open, Refresh, Open Settings) and the row's context menu; no inline action exists (OP-008) | 0020 AC-007, AC-008, AC-011, 0024 AC-013, 0025 *Show in Plan Map* |
| H-4 | Webview panel in the editor area | An editor tab *FeatherSpec Studio* showing the webview bundle in JCEF; one tab per project | 0005 AC-001, AC-002, AC-005, AC-009, AC-024 |
| H-5 | `acquireVsCodeApi`, `postMessage`, CSP, `asWebviewUri` | A shim installed before the bundle; same messages, same CSP; resources only from the plugin's webview folder | 0005 AC-016, AC-020, AC-021 |
| H-6 | Status bar item | Status bar widget with the same text, tooltip and accessible text; codicons mapped to IDE icons | 0017 AC-014–AC-019 |
| H-7 | Commands, Command Palette | Actions found by Find Action under the same titles (`FeatherSpec Studio: …`), action IDs `featherspec.studio.*` | 0005 AC-001, AC-005, 0017 AC-009, 0014 AC-002 |
| H-8 | `contributes.configuration`, Settings UI | Settings › Tools › FeatherSpec Studio, application level, same keys, defaults and labels | 0021 AC-016, AC-011, 0024 AC-001 |
| H-9 | Workspace Trust, Restricted Mode | The IDE's trusted-project state (untrusted = safe mode) | 0001 AC-022, 0005 AC-017, 0014 AC-004, 0017 AC-022 |
| H-10 | Workspace folders (multi-root) | The project's base directory plus every content root outside it (OP-004) | 0001 AC-001–AC-013 |
| H-11 | File system watcher | IDE virtual-file-system events plus a refresh of the watched paths on frame activation | 0002 AC-012, PD-047, 0029 AC-009 |
| H-12 | `workspaceState`, `globalStorageUri` | Plugin state outside the project directory; the store per project root under the IDE's system path (ADR-002 shape) | 0004 AC-011, AC-023, AC-026, 0005 AC-009, 0018 Done memory |
| H-13 | Quick pick, notification, modal, progress, `openExternal` | IDE popup, balloon notification of group *FeatherSpec Studio*, modal dialog, background progress with Cancel, the system browser | 0001 AC-008, AC-015, 0014 AC-003, AC-005, AC-008, AC-021, 0017 AC-020 |
| H-14 | Output channel "FeatherSpec Studio" | A log view *FeatherSpec Studio* that "Show output" opens, same lines | 0001 AC-016, 0005 AC-015, 0014 AC-023, 0024 AC-006 |
| H-15 | Open file at line, `ViewColumn.Beside` | Open in the editor at the line; beside the Studio tab in a split where VS Code opens beside | 0019 open beside, 0020 AC-008 |
| H-16 | Clipboard | System clipboard through the IDE | 0017 AC-005, 0014 AC-016 |
| H-17 | Extensions present, activate, change event; chat commands | Plugins present, enabled, change event; handover only per §6.7 | 0024 AC-002, AC-005, AC-010 |
| H-18 | Node `fs`, `fetch`, `zlib` adapters | Host implementations of the same ports; setup HTTP through the IDE's proxy settings | 0014 AC-005, AC-010, AC-019, AC-025 |

S1 (*no folder open*) is n-a: a JetBrains project always has a base directory, and the welcome screen shows no tool window.

### 6.4 Conformance

The existing oracles are the shared truth: `test/fixtures/**` (the fixture projects), `test/fixtures/next-step-baseline/`,
`test/fixtures/read-baseline/`, `src/core/setup/mergePrompt.golden.txt` with `test/fixtures/setup/featherspec-1.10.0.tar.gz`.
For every fixture project the embedded runtime shall produce the same outputs as Node at the same commit: the read
snapshot, the next-step baseline record, and the views the panel, tree and status entry receive (Board, Overview, Plan map,
every spec's detail, the spec tree, the status entry). A baseline changes only with a named `EXCEPTIONS` entry, as today,
and then for both hosts.

### 6.5 Embedded core runtime

The runtime choice is not final. Requirements (R) the choice must meet:

- R-1 Same outputs: §6.4 holds with the core bundle built from unchanged `src/core` and `src/shared` sources.
- R-2 Budgets: 0002 AC-018 (200 specs read under 2 s, update under 1 s), 0001 AC-018 (discovery under 2 s), 0005 AC-024
  (frame under 1 s), UI freshness 500 ms after the change event reaches the plugin (PD-047).
- R-3 The core's synchronous port calls (`SettingPort.read`, `TrustPort.isTrusted`, `WorkspaceFoldersPort.list` and the
  other non-`Promise` methods of `src/core/ports`) are served without a signature change.
- R-4 The core runs while the Studio tab is closed and while JCEF is unavailable, so tree and status entry stay live.
- R-5 Engine cold start under 1 s; the plugin ZIP at most 60 MB (A-008).
- R-6 Testable headless in CI.

Preferred hypothesis: GraalJS inside the IDE process. Fallback: a hidden JCEF browser (fails R-4 without JCEF; needs
mirrored caches for R-3). A Node sidecar or a Kotlin port are plan C only. The spike S-1 is the plan's first stage; it
measures R-1–R-6 on Windows, macOS and Linux, and Gregor decides from `docs/decisions/ADR-004-jetbrains-host.md` before any
later stage starts (gate G1).

### 6.6 Theme bridge

Before the bundle's first paint and after every IDE look-and-feel change, the host sets on the document every `--vscode-*`
variable `src/webview/main.css` uses (59 at `3bc615c`) from the current IDE theme, and exactly one body class:
`vscode-light` for a light theme (Light, Islands Light), `vscode-dark` for a dark theme (Darcula, Islands Dark),
`vscode-high-contrast` for High Contrast. Fonts come from the IDE's UI and editor fonts; scrollbars follow the IDE. The
mapping table (variable → IDE colour key, with a fallback per variable) is one file in the host, reviewed in the plan.

### 6.7 Send to assistant

Default in JetBrains: the offer is *none* (0024 AC-002), so every step action is Copy prompt with 0021 §6.4's texts. Spike
S-3 tests three handovers — Claude Code (its JetBrains plugin and CLI in the terminal), GitHub Copilot's plugin, JetBrains
AI Assistant — and records per handover: *prefills without sending*, *only with sending*, *not possible*. Only a handover
that puts the prompt into the assistant's input without sending, through a documented or stable entry point, is offered;
then 0024, 0026, 0027 and 0033 apply to it, with the attachment only where the handover attaches files. Every other value
stays Copy prompt, and the Assistant setting lists only offered assistants.

### 6.8 Host vocabulary

No JetBrains surface shall show a VS Code-only term. Known at `3bc615c`: `Restricted Mode`, `Manage Workspace Trust`,
`trusted workspace`, `This workspace …` (`src/shared/protocol/texts.ts`, `src/core/setup/setupTexts.ts`), `Another VS Code
window holds the write lock …` (`src/core/runtime/notices.ts`), the extension IDs in the assistant causes
(`src/shared/protocol/assistantTexts.ts`). Each gets a JetBrains term (proxies in OP-006) through one host vocabulary that
the host passes in; the VS Code values stay byte-identical. Each such term is a *deliberately different* row.

### 6.9 Protection of the VS Code extension

- `.vscodeignore` is a denylist: `jetbrains/**`, `dist/embedded/**` and every new top-level output stay out of the `.vsix`.
- A **JetBrains-only change** (only `jetbrains/**`, `docs/jetbrains/**`, JetBrains CI files) leaves `dist/extension.js`,
  `dist/webview/main.js`, `dist/webview/main.css` byte-identical and the `.vsix` file list identical.
- A **shared change** (host-neutral composition, embedded entry, host vocabulary) leaves VS Code's observable behaviour
  identical: every test at the start commit passes, baselines and golden file unchanged, every VS Code text unchanged.
- `ci.yml` and `publish.yml` keep their jobs; JetBrains gets its own jobs and its own release workflow.

### 6.10 Target, packaging and release

- since-build: the build of IntelliJ Platform 2025.3.1; no until-build; depends only on `com.intellij.modules.platform` and
  `com.intellij.modules.jcef`. Local IDE only.
- Marketplace name *FeatherSpec Studio*, plugin ID `com.gregorbiswanger.featherspec.studio`, vendor Gregor Biswanger.
- Signed ZIP; Plugin Verifier over Rider, WebStorm, IntelliJ IDEA and PyCharm from since-build to the latest release, plus
  the verifier's recommended set; plugin structure verified.
- Own release line: tag `jetbrains-v<version>`, own workflow started by hand with `confirm=publish`; the first upload is
  manual by Gregor; the VS Code line is never triggered by it.

## 7. UI/UX requirements (native feel)

- Tab enters the Studio tab's content and leaves it to the IDE; the IDE's shortcuts (Find Action, Search Everywhere,
  switching tabs) work while focus is in the panel.
- Escape inside the panel keeps 0019's and 0024's rules (close popup, side panel); with nothing to close, focus returns to
  the last editor (OP-011).
- No flash of another theme's colours on open or theme switch; no repaint stall (known JCEF issue 2025.1/2025.2).
- The tree, status entry and settings page use IDE components only, so the IDE's keys, search and screen reader apply.

## 8. Security, permissions and privacy

As the originals: no write except Set up FeatherSpec (0005 AC-025, 0014 AC-024), no network except the setup after a start
in a trusted project (0014 AC-025), no prompt text in the log (0024 AC-006). In addition: the embedded browser loads only
the plugin's webview files and nothing from the internet (0005 AC-020); the plugin stores its state outside the project
directory (H-12), so `.idea/` receives nothing from it; signing keys come from CI secrets only.

## 9. Non-functional requirements

Budgets of R-2 on the owner's Windows 11 machine and in CI; external change visibility of AC-021; the plugin ZIP limit of R-5.

## 10. Error cases and edge cases

- The IDE cannot show an embedded browser: AC-030.
- The embedded runtime fails to start or throws: the tab shows S5 with its reason and *Show output* (0005 AC-015); tree and
  status entry show the failure state; no IDE-internal error balloon.
- A file changed by a CLI agent while the IDE is not focused: AC-021 (refresh on frame activation).
- Two IDE projects open on the same root, or VS Code and a JetBrains IDE on the same root: writer and reader as 0004
  AC-011/AC-023 within JetBrains; the stores of the two products are separate (OP-005).
- The project becomes trusted while the tab is open: AC-019.
- A theme without a key the mapping needs: the variable takes its fallback; nothing stays unset (AC-026).
- Rider opened on a solution file: the base directory of H-10 is the solution's folder (OP-004).

## 11. Acceptance criteria

Unless marked *manual*, a test decides each criterion: Vitest for TypeScript, JUnit 5 and the IDE integration test framework
(Starter/Driver) for the plugin, a CI job for builds and guards.

**Parity and conformance**

- **AC-001** The repository shall contain `docs/jetbrains/parity.md` with exactly one row per acceptance criterion that the
  Studio's spec repository (0002 AC-004) finds in `.specs/done/` and `.specs/active/`, 0034 excepted, each with spec, AC ID, one of the four
  categories of §6.2 and the reference §6.2 requires for that category.
- **AC-002** If a criterion is missing from the matrix, appears twice, has no category or an unknown one, lacks its required
  reference, or a row names a criterion no spec defines, then the parity check shall fail and name the row; a negative
  control per failure kind shall prove it. Generating the matrix twice from unchanged specs shall give byte-identical files.
- **AC-003** Every criterion of 0008–0012 and every withdrawn or void criterion shall be *n-a* with its successor or
  withdrawal named; every *deliberately different* row shall name a PD entry that exists in
  `docs/product/product-decisions.md`.
- **AC-004** For every fixture folder under `test/fixtures/` (the baseline and setup folders aside) the embedded runtime shall produce, from the same files, the
  read snapshot, the next-step baseline record and the Board, Overview, Plan map, detail, spec tree and status entry views
  deep-equal to the Node run of the same commit; the read and next-step baselines shall match as they do in Node, with the
  same `EXCEPTIONS` and no other.
- **AC-005** For `test/fixtures/setup/featherspec-1.10.0.tar.gz` the JetBrains host shall produce the merge prompt
  byte-identical to `src/core/setup/mergePrompt.golden.txt`, and the same file classes and writes as 0014 AC-009–AC-014 on a
  temporary target.
- **AC-006** The core bundle the plugin runs shall be built from `src/core` and `src/shared` with no JetBrains-specific
  branch and no changed port signature; a scan shall find no host check in `src/core` and the port signatures equal to the
  start commit's.
- **AC-007** In the embedded runtime the budgets of R-2 shall hold: the 0002 AC-018 fixture read under 2 s and updated under
  1 s, discovery of up to 5 roots under 2 s, the Studio frame shown within 1 s of *Open*, and tree, status entry and panel
  showing a model change within 500 ms after the change event reaches the plugin; measured on Windows 11 and in CI.
- **AC-008** While the Studio tab is closed, tree and status entry shall follow a model change as 0020 AC-013 and 0017
  AC-018 state.
- **AC-009** `docs/decisions/ADR-004-jetbrains-host.md` shall record the measured R-1–R-6 values of spike S-1 per candidate
  run, the result table of spike S-3 and the delays of spike S-4, and Gregor's decision; the plan shall start no stage after
  the spikes before that decision stands in the ADR.

**Host mapping**

- **AC-010** While a project is active, the tool window shall show the Specs tree whose groups, rows, order, labels,
  descriptions, icons, colours, tooltips and count equal the spec tree view of AC-004 for that fixture (0020 AC-001–AC-006,
  AC-010 through H-1).
- **AC-011** The tree's toolbar shall offer Open, Refresh and Open Settings in this order, and a spec row's context menu
  `Open Spec`, `Open Plan` (only with a plan), `Show in Plan Map` (only where 0025 offers it) and `Copy Next Step` (only with a
  step), each behaving as 0020 AC-007–AC-009 and 0025 state; activating a row shall select the spec without moving focus.
- **AC-012** Per condition of 0020 §4.4 the tree's empty text shall show the lines and actions that 0020 AC-012, 0014 AC-001
  and 0029 AC-004 name, with the same texts.
- **AC-013** When the developer runs *FeatherSpec Studio: Open*, the IDE shall show one editor tab per project with the
  Studio panel; a second *Open* shall focus that tab; closing and reopening shall restore area and selection (0005 AC-001,
  AC-002, AC-009); *Open Overview*, *Open Board*, *Open Plan Map* shall behave as 0005 AC-005 and 0023.
- **AC-014** The tab shall run `dist/webview/main.js` and `main.css` byte-identical to the files in the `.vsix` of the same
  commit; the message sequence of a session (hello, snapshots, requests) recorded on a fixture shall equal the VS Code host's
  for the same steps; unknown and other-version messages shall behave as 0005 AC-016 and AC-021, *Reload* reloading only the
  tab.
- **AC-015** If the panel requests a file outside the plugin's webview files or any internet address, then the embedded
  browser shall deliver nothing (0005 AC-020); the document shall carry the same Content-Security-Policy as the VS Code
  panel.
- **AC-016** While a project is active, the status bar widget shall show the text, tooltip lines and accessible text of 0017
  AC-014–AC-018 for the same model, with the codicons replaced by IDE icons, and a click shall run Copy Next Step with
  0017 AC-016's 2000 ms feedback; while no project is reported it shall be hidden (0001 AC-020).
- **AC-017** Find Action shall list one action per command of the VS Code manifest (except the internal `shellAction` and
  `selectSpec`) under the same title; each shall behave as the original criterion of that command.
- **AC-018** Settings › Tools › FeatherSpec Studio shall show Show Step Tips, Model Hints and Assistant with the defaults,
  labels and descriptions of 0021 AC-016 and 0024 AC-001 (Assistant reduced per §6.7); a change shall reach the panel within
  500 ms (0021 AC-011); Open Settings shall open this page; the values shall apply to every project.
- **AC-019** While the project is not trusted, discovery, tree, status entry, Copy and the settings shall work as in a trusted
  project (0001 AC-022, 0017 AC-022, 0020 AC-014, 0021 AC-018); Set up FeatherSpec shall send nothing and write nothing
  (0014 AC-004); the panel shall show the S7 note in the vocabulary of §6.8, and when the project becomes trusted the note
  shall disappear without reopening the tab (0005 AC-017).
- **AC-020** When the developer or the IDE creates, changes, renames or deletes a spec, plan, return note, `AGENTS.md` or
  `.memory-bank/projectbrief.md` inside the IDE, tree, status entry and panel shall show the change within the budget of AC-007.
- **AC-021** When an external process writes such a file, the change shall show on screen within 2 s of the write (OP-003),
  with the IDE focused and with another application focused, on Windows, macOS and Linux.
- **AC-022** Set up FeatherSpec shall behave as 0014 AC-001–AC-025 with H-13 and H-18: the same targets, dialog, files, merge
  prompt, messages and log block; a write shall fail rather than replace an existing path (0014 AC-010); requests shall use
  the IDE's proxy settings and carry no credentials, cookies or workspace path (0014 AC-025).
- **AC-023** Every notification, popup and progress of the core shall appear as the H-13 element with the original's texts,
  actions and order; *Show output* shall open the log view with the lines the VS Code Output channel receives for the same
  run, and no prompt text.
- **AC-024** Opening a file from the panel shall open it at its line in an editor split beside the Studio tab, and from the
  tree in the active editor (0019, 0020 AC-008); Copy shall put exactly the original's text on the system clipboard.
- **AC-025** After opening, navigating and closing the Studio tab, Copy, settings changes and a status history write, no file
  below the project root shall have been created or changed by the plugin (0005 AC-025, 0017 AC-023); the status history
  store shall lie under the IDE's system path per project root, with 0004's writer and reader rules among the IDE's open
  projects.

**Theme**

- **AC-026** Before the first paint, the document shall define every `--vscode-*` variable used in `src/webview/main.css`,
  each with a non-empty value; a test shall derive the list from the stylesheet and fail when the mapping lacks one.
- **AC-027** The document shall carry exactly one of `vscode-light`, `vscode-dark`, `vscode-high-contrast`, by the theme
  kinds of §6.6, for Light, Darcula, High Contrast, Islands Light and Islands Dark.
- **AC-028** When the developer switches the IDE theme, the open panel shall show the new theme's values and body class
  within 500 ms, without reopening and without a frame in which old and new colours mix (0005 AC-019).
- **AC-029** For each of the five themes of AC-027, every pair of the mapping's contrast table — at least panel text,
  secondary text, link and button text on their backgrounds, and the focus outline — shall have a contrast ratio of at least
  4.5:1 for text and 3:1 for the focus outline, computed from the mapped values.

**Fallback, send, packaging**

- **AC-030** If the IDE cannot show an embedded browser, then *Open* shall show a notification that names the reason and offers
  *Open help*; tree, status entry, Copy Next Step, the settings page and Set up FeatherSpec shall keep working, and the IDE
  shall report no plugin error.
- **AC-031** While no handover of §6.7 is proven, every step action in the panel shall be Copy prompt, the Assistant setting
  shall offer no assistant, and no text shall name Send.
- **AC-032** Where a handover is offered, its Send shall put the prompt into that assistant's input and never submit it;
  every failed check, call or 5 s timeout shall fall back to Copy prompt with one warning and one log line without the
  prompt (0024 AC-005, AC-006, PD-068), and attach only as §6.7 allows.
- **AC-033** `plugin.xml` shall carry the ID, name and vendor of §6.10, since-build of 2025.3.1, no until-build, and depend on
  exactly `com.intellij.modules.platform` and `com.intellij.modules.jcef`.
- **AC-034** The Plugin Verifier shall report no compatibility problem for Rider, WebStorm, IntelliJ IDEA and PyCharm at
  since-build and at the latest release, nor for its recommended set; the structure check shall report no error.
- **AC-035** The release ZIP shall be signed and pass signature verification; it shall be at most 60 MB; no key or token shall
  be in the repository.
- **AC-036** The JetBrains release workflow shall run only when started by hand with `confirm=publish`, tag
  `jetbrains-v<version>`, and neither run nor change `publish.yml`.

**Protection of the VS Code extension**

- **AC-037** `.vscodeignore` shall exclude `jetbrains/**` and `dist/embedded/**`; a test shall compare the `.vsix` file list
  with a committed snapshot (11 files at `3bc615c`) and fail on any added or missing file, with a negative control.
- **AC-038** For a change that touches only JetBrains paths (§6.9), CI shall prove `dist/extension.js`, `dist/webview/main.js`,
  `dist/webview/main.css` byte-identical and the `.vsix` file list identical to the base commit's.
- **AC-039** For a shared change, every test at the commit on which this spec's implementation starts shall exist at the head
  and pass, the read and next-step baselines and the golden file shall be unchanged with no new `EXCEPTIONS`, every rendered
  VS Code text of every fixture shall be deep-equal, and `npm run test:unit` and `npm test` shall pass on Windows and in CI;
  `ci.yml`'s existing jobs shall be unchanged.

**Manual (Gregor)**

- **AC-040** *(manual, Gregor, JetBrains Rider)* On a fresh `C:\projects\test\tip-splitter`, the Hands-On walkthrough from Set
  up FeatherSpec through the first implemented step in Rider, compared view by view with VS Code at the same commit, in Light,
  a dark theme (Darcula or Islands Dark) and High Contrast, including a live theme switch; he records Rider's version and
  every difference not in the matrix.
- **AC-041** *(manual, Gregor, WebStorm)* The same walkthrough and comparison as AC-040 in WebStorm, version recorded.
- **AC-042** *(manual, Gregor or his delegate)* In Rider and WebStorm: keyboard only (§7: into and out of the tab, Find
  Action, Escape), a screen reader reading tree rows, status entry and panel labels as 0005 AC-023, and the JCEF fallback of
  AC-030 on an IDE started without JCEF. `docs/release-checklist.md` shall carry a *JetBrains (manual)* section listing
  AC-040–AC-042.
- **AC-043** `README.md` shall carry a JetBrains section (install, supported IDEs, Copy prompt default, local only);
  `.architecture/jetbrains.md` (at most 40 lines) and the `AGENTS.md` snapshot shall name `jetbrains/` and the embedded entry.

## 12. Technical notes for developers or AI agents

As-is at `3bc615c` (digest, from the code):

- `src/core` imports no `vscode` and no Node module but `path.posix` (`board/openFile.ts`, `specs/readProject.ts`,
  `lifecycle/verification.ts`); timers only through `ClockPort`. Web APIs used: strict `TextDecoder` (`fatal: true`),
  `TextEncoder`, `URL`, `queueMicrotask`, `performance.now` — GraalJS needs polyfills for some (S-1).
- 14 port files in `src/core/ports`; non-`Promise` methods include `SettingPort.read`, `TrustPort.isTrusted`,
  `WorkspaceFoldersPort.list`, `ClockPort.now`, `AssistantHostPort.extension` and `fileUri` (returns a VS Code `Uri` for
  Copilot's attach; n-a until a handover attaches).
- Composition lives in `src/extension.ts` (404 lines); a host-neutral composition (`src/hosts/…`, ports passed in) is the
  shared change of §6.9; esbuild gets a third target `dist/embedded/…` (`esbuild.js` has two today).
- Webview: the only host handle is `src/webview/vscodeApi.ts`; CSP built in `src/adapters/vscode/webviewHtml.ts`; 59
  `--vscode-*` variables and 3 body classes in `main.css`; no `getState`/`setState`.
- VS Code terms compiled into the bundle: `RestrictedNote.tsx` renders `RESTRICTED_TEXT`, `ACTION_LABELS.manageTrust`,
  `STATE_LABELS.S7` — §6.8 needs them from the host, which changes the webview bundle once (a shared change, AC-039).
- UI memory today is `workspaceState` (outside the folder); a project-level IDE state would write `.idea/workspace.xml` and
  break AC-025 — use application-level or system-path storage keyed by project root.
- Setup writes with Node `wx` (create fails if the path exists) and temp-file rename; the host needs the same semantics
  (`CREATE_NEW`), not a VFS write that replaces.
- `.vscodeignore` excludes `src/**`, `docs/**`, `test/**` but not `jetbrains/` or `dist/embedded/`.
- Oracles: 26 fixture folders besides `next-step-baseline/` (47 files), `read-baseline/` (9) and `setup/`; `mergePrompt.golden.txt`; the 1.10.0 archive.
- Build: Gradle with IntelliJ Platform Gradle Plugin 2.x, Kotlin, JUnit 5; JCEF: `JBCefApp.isSupported()`, `JBCefJSQuery`,
  a `CefRequestHandler` for plugin resources, `JBCefScrollbarsHelper`; theme change via `LafManagerListener`.
- Context hygiene: `jetbrains/AGENTS.md` and `jetbrains/CLAUDE.md` load only below `jetbrains/`; a
  `.github/instructions/jetbrains.instructions.md` with `applyTo: jetbrains/**`; one inventory line in the snapshot.
- Proposed stages: S-1…S-4 spikes and ADR-004 (G1) → guards AC-037/AC-038 and the parity matrix → shared changes under
  AC-039 (G3) → host (runtime, tab and theme, tree and status, settings and trust, setup, watching) → packaging and release.

## 13. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | The agent sandbox cannot reach Maven Central, the Gradle plugin portal or JetBrains repositories; Gradle builds, plugin tests, the verifier and IDE runs happen on Gregor's Windows machine or in CI | `npm test` already cannot download VS Code there (techContext); the same proxy policy applies | Steps that need Gradle cannot be verified by the agent; the plan marks them *CI / Windows* |
| A-002 | Frontend-only plugins work in Rider; the Studio needs no ReSharper part | JetBrains docs: tool windows and actions run in Rider's frontend | Rider needs a backend module (AC-040) |
| A-003 | The webview bundle needs no change for JCEF beyond §6.8 | it reaches the host only through `vscodeApi.ts` and uses only CSS variables and body classes | AC-014's byte-identity fails; the shim grows |
| A-004 | `com.intellij.modules.jcef` exists from 2025.3.1 | the IntelliJ Platform JCEF page, November 2026 | since-build moves; AC-033 |
| A-005 | GraalJS meets R-1–R-6 | same bundle, Java interop for sync ports; IntelliJ's HTTP Client embeds GraalJS | fallback to a hidden JCEF browser (§6.5), R-3/R-4 get harder |
| A-006 | No documented API opens a JetBrains assistant chat with a prefilled prompt | research for the analysis found none for Copilot, Claude Code or AI Assistant | §6.7 may offer Send sooner; AC-031 changes |
| A-007 | Settings are application-level, like VS Code user settings | the three settings are personal preferences (0021, 0024) | a project override is needed (OP-009) |
| A-008 | 60 MB is an acceptable ZIP limit | the analysis' target; GraalJS JARs are the main weight | AC-035 |
| A-009 | The 0.1.0 VS Code release stays the reference behaviour while this spec is built | released 2026-11-20 at `3bc615c` | parity rows shift; the matrix check catches it |

## 14. Open points

Questions for Gregor (recommendation in brackets):

- OP-001 Size: by `/sdd-specify`'s budget this is two or three specs; it is one at Gregor's request. *(Keep one spec as the
  parity contract, plan it in gated stages; split off Send handover and Marketplace release only if the plan passes about
  30 steps.)*
- OP-002 Runtime gates: confirm R-5 (cold start under 1 s, ZIP at most 60 MB) as the S-1 pass criteria. *(Yes.)*
- OP-003 External-change budget of AC-021 (2 s from disk write to screen, IDE focused or not) is a proxy. *(2 s, with a
  refresh of `.specs/` on frame activation.)*
- OP-004 "Workspace folders" in JetBrains (H-10): base directory plus content roots outside it; Rider's solution folder as
  base. *(Yes.)*
- OP-005 Status history store: separate from VS Code's or shared with it. *(Separate; sharing couples two products' locks.)*
- OP-006 JetBrains terms for §6.8. *(`This project is not trusted.` / `Trust Project` / `trusted project` / `Another IDE
  window holds the write lock …` / plugin IDs in the causes; and accept the one-time shared change to the bundle.)*
- OP-007 The tree badge (H-1): JetBrains has no numeric view badge. *(Count in the tool window title, a dot on the stripe
  icon while n > 0; deliberately different.)*
- OP-008 No inline row action (H-3): Copy Next Step only in the context menu and as a toolbar action on the selected row.
  *(Yes; deliberately different.)*
- OP-009 Settings scope: application level only, no per-project override in v0.1. *(Yes.)*
- OP-010 Send: which handovers S-3 tests and what happens if one is proven late. *(All three; a handover proven by G1 joins
  this spec, a later one gets its own spec; until then the Assistant setting is hidden.)*
- OP-011 Escape with nothing to close returns focus to the last editor (JetBrains convention). *(Yes.)*
- OP-012 Tool window name: *FeatherSpec Studio* (as VS Code's container) or *FeatherSpec* (shorter stripe label). *(FeatherSpec
  Studio, tree titled Specs.)*
- OP-013 IDE test matrix: Rider and WebStorm manual (AC-040, AC-041) plus automated smoke where CI can run them; IDEA and
  PyCharm by the verifier and one automated smoke in IDEA. *(Yes.)*
- OP-014 Release line: own versions from 0.1.0, tag `jetbrains-v0.1.0`, Marketplace vendor, certificate and secrets by Gregor,
  first upload manual. *(Yes.)*
- OP-015 Release docs: the FeatherSpec wiki's *Releasing* page covers the template, Studio's lives in
  `docs/release-checklist.md`; a JetBrains variant of the Hands-On walkthrough in the wiki after release. *(Checklist section
  in this spec, wiki note at release.)*
- OP-016 Older IDEs (2025.2 and before) through a second plugin line. *(No.)*

## 15. Definition of Ready, Done and next steps

Ready: goal, scope, host mapping, rules and criteria stated; open points visible; `/sdd-clarify` pending. Done per the DoD
of `AGENTS.md`: AC-001–AC-039 and AC-043 proven, AC-040–AC-042 checked by Gregor, the parity matrix fully categorised, VS Code
CI and `.vsix` unchanged. Next: `/sdd-clarify` in a fresh session, then `/sdd-plan` with S-1…S-4 as the first stage.
